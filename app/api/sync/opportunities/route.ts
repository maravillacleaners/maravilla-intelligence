/**
 * GET /api/sync/opportunities
 *
 * Populates the Airtable Opportunities table from USASpending recently-awarded
 * cleaning contracts. Only creates NEW records (dedup via bid_id).
 *
 * Query params:
 *   ?pages=N  (default 2, max 5)
 *   ?days=N   (default 90, max 365) — lookback window
 */

import { NextRequest, NextResponse } from 'next/server'

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92'
const AIRTABLE_BASE_ID = 'appZhXnyFiKbnOZLr'
const AIRTABLE_OPP_TABLE = 'tbldTDb1v79dVNCTQ'
const OPP_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_OPP_TABLE}`

// ── Types ──────────────────────────────────────────────────────────────────────

interface USASpendingAward {
  'Award ID': string
  'Recipient Name': string
  'Award Amount': number
  'Action Date': string
  'Awarding Agency': string
  'NAICS Code': string
  'NAICS Description': string
  'Place of Performance State Code': string
  'Place of Performance City Code': string
  'Recipient UEI': string
}

// ── NAICS scoring map ──────────────────────────────────────────────────────────

const NAICS_SCORES: Record<string, number> = {
  '561720': 25,
  '561722': 25,
  '561740': 20,
  '561790': 18,
  '561210': 12,
}

const NAICS_KEYWORDS: Record<string, string> = {
  '561720': 'janitorial, cleaning, custodial',
  '561722': 'carpet cleaning, floor care, upholstery',
  '561740': 'pest control, extermination',
  '561790': 'building services, facilities cleaning',
  '561210': 'facilities management, building support',
}

// ── Score calculator ───────────────────────────────────────────────────────────

function scoreOpportunity(award: USASpendingAward): { score: number; signal: 'High' | 'Medium' | 'Low' } {
  const value = award['Award Amount'] ?? 0
  const naics = String(award['NAICS Code'] || '')

  // Value score (0-40): log scale
  const valueScore = value >= 1_000_000 ? 40
    : value >= 500_000 ? 32
    : value >= 200_000 ? 24
    : value >= 100_000 ? 16
    : value >= 50_000 ? 10
    : 5

  // NAICS score (0-25)
  const naicsScore = NAICS_SCORES[naics] ?? 8

  // State relevance (0-15): FL/SE states
  const state = award['Place of Performance State Code'] || ''
  const stateScore = state === 'FL' ? 15
    : ['GA', 'SC', 'NC', 'AL', 'MS', 'TN', 'TX', 'VA'].includes(state) ? 10
    : ['CA', 'NY', 'IL', 'PA', 'OH', 'MI'].includes(state) ? 6
    : 3

  // Agency score (0-20)
  const agency = award['Awarding Agency'] || ''
  const agencyScore = agency.includes('GSA') || agency.includes('Veterans') || agency.includes('Air Force') ? 20
    : agency.includes('Defense') || agency.includes('Navy') || agency.includes('Army') ? 16
    : agency.includes('Health') || agency.includes('Justice') || agency.includes('Homeland') ? 12
    : 8

  const total = Math.min(100, valueScore + naicsScore + stateScore + agencyScore)
  const signal: 'High' | 'Medium' | 'Low' = total >= 70 ? 'High' : total >= 45 ? 'Medium' : 'Low'

  return { score: total, signal }
}

// ── Build bid_id ───────────────────────────────────────────────────────────────

function buildBidId(award: USASpendingAward): string {
  return `OPP_${(award['Award ID'] || '').replace(/[\s/\\]+/g, '_').toUpperCase()}`
}

// ── Fetch existing bid_ids to avoid duplicates ────────────────────────────────

async function fetchExistingBidIds(): Promise<Set<string>> {
  const existing = new Set<string>()
  let offset: string | undefined

  do {
    const params = new URLSearchParams()
    params.set('fields[]', 'bid_id')
    params.set('pageSize', '100')
    if (offset) params.set('offset', offset)

    const res = await fetch(`${OPP_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) break

    const data = await res.json()
    for (const r of data.records ?? []) {
      const id = r.fields?.bid_id
      if (id) existing.add(id)
    }
    offset = data.offset
  } while (offset)

  return existing
}

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)
  const pages = Math.min(parseInt(searchParams.get('pages') || '2', 10), 5)
  const days = Math.min(parseInt(searchParams.get('days') || '90', 10), 365)

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().split('T')[0]
  const todayStr = new Date().toISOString().split('T')[0]

  // Fetch from USASpending
  const allAwards: USASpendingAward[] = []
  for (let page = 1; page <= pages; page++) {
    try {
      const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            award_type_codes: ['A', 'B', 'C', 'D'],
            naics_codes: { require: ['561720', '561722', '561740', '561790', '561210'] },
            award_amounts: [{ lower_bound: 10_000 }],
            date_range_type: 'action_date',
            time_period: [{ start_date: cutoffStr, end_date: todayStr }],
          },
          fields: [
            'Award ID', 'Recipient Name', 'Award Amount', 'Action Date',
            'Awarding Agency', 'NAICS Code', 'NAICS Description',
            'Place of Performance State Code', 'Place of Performance City Code',
            'Recipient UEI',
          ],
          limit: 100,
          page,
          sort: 'Award Amount',
          order: 'desc',
        }),
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) break
      const data = await res.json()
      const results: USASpendingAward[] = data.results ?? []
      allAwards.push(...results)
      if (results.length < 100) break
    } catch {
      break
    }
  }

  if (allAwards.length === 0) {
    return NextResponse.json({ success: true, synced: 0, skipped: 0, message: 'No awards fetched' })
  }

  // Load existing bid_ids
  const existingIds = await fetchExistingBidIds()

  // Build new records
  const newRecords: { fields: Record<string, unknown> }[] = []
  for (const award of allAwards) {
    const bidId = buildBidId(award)
    if (existingIds.has(bidId)) continue

    const value = award['Award Amount'] ?? 0
    const naics = String(award['NAICS Code'] || '561720')
    const { score, signal } = scoreOpportunity(award)
    const formattedValue = value >= 1_000_000
      ? `$${(value / 1_000_000).toFixed(1)}M`
      : `$${Math.round(value / 1_000)}K`

    const naicsDesc = award['NAICS Description'] || 'Cleaning Services'
    const agency = award['Awarding Agency'] || 'Federal Agency'
    const state = award['Place of Performance State Code'] || ''

    newRecords.push({
      fields: {
        bid_id: bidId,
        title: `${naicsDesc} — ${agency}`,
        agency,
        state,
        estimated_value: value,
        source: 'USASpending',
        status: 'New',
        score,
        signal_strength: signal,
        scope_summary: `Recently awarded ${formattedValue} contract to ${award['Recipient Name'] || 'contractor'}. Awarded ${award['Action Date'] || todayStr}. Awarding agency is an active buyer of cleaning services — pursue for next contract cycle.`,
        naics_codes: naics,
        cleaning_keywords: NAICS_KEYWORDS[naics] || 'cleaning, janitorial',
      },
    })
    existingIds.add(bidId)
  }

  if (newRecords.length === 0) {
    return NextResponse.json({
      success: true,
      synced: 0,
      skipped: allAwards.length,
      message: 'All records already exist',
    })
  }

  // Batch create (10 per request)
  let synced = 0
  const errors: string[] = []

  for (let i = 0; i < newRecords.length; i += 10) {
    const batch = newRecords.slice(i, i + 10)
    try {
      const res = await fetch(OPP_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records: batch }),
        signal: AbortSignal.timeout(10000),
      })
      if (res.ok) {
        synced += batch.length
      } else {
        const err = await res.text()
        errors.push(err.slice(0, 100))
      }
    } catch (e) {
      errors.push(String(e).slice(0, 100))
    }
    // Small delay to respect Airtable rate limits
    await new Promise(r => setTimeout(r, 200))
  }

  return NextResponse.json({
    success: true,
    synced,
    skipped: allAwards.length - newRecords.length,
    total_fetched: allAwards.length,
    errors: errors.slice(0, 5),
    synced_at: new Date().toISOString(),
  })
}
