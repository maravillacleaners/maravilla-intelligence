/**
 * POST /api/sources/usaspending
 * Pulls federal award data → creates leads for prime contractors (subcontract targets)
 * GET  → returns { configured: true, description, last_sync }
 */

import { NextResponse } from 'next/server'
import { writeSyncLog, readLastSync } from '@/lib/sync-log'

const KEY  = process.env.AIRTABLE_API_KEY!
const BASE = process.env.AIRTABLE_BASE_ID!
const TBL_LEADS = 'tblja2oeA4oNEjioT'

const AT  = `https://api.airtable.com/v0/${BASE}`
const HDR = () => ({ Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' })
const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

function normalizeEntityKey(name: string): string {
  return 'company:' + name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 120)
}

async function atList(table: string, formula: string, maxRecords = 1): Promise<any[]> {
  const p = new URLSearchParams({ filterByFormula: formula, maxRecords: String(maxRecords) })
  const res = await fetch(`${AT}/${table}?${p}`, { headers: HDR() })
  if (!res.ok) return []
  const data = await res.json()
  return data.records || []
}

async function atCreate(table: string, fields: Record<string, any>): Promise<any> {
  const res = await fetch(`${AT}/${table}`, {
    method: 'POST', headers: HDR(),
    body: JSON.stringify({ fields, typecast: true }),
  })
  return res.json()
}

async function leadExists(entity_key: string): Promise<boolean> {
  const safe = entity_key.replace(/"/g, '\\"')
  const recs = await atList(TBL_LEADS, `{Entity_Key}="${safe}"`, 1)
  return recs.length > 0
}

const PRIMARY_STATES   = new Set(['FL'])
const SECONDARY_STATES = new Set(['TX', 'CA', 'GA', 'NC', 'VA'])

function calcScore(naics: string, state: string, amount: number): number {
  let score = 55
  if (PRIMARY_STATES.has(state))   score += 15
  if (SECONDARY_STATES.has(state)) score += 8
  if (naics === '561720') score += 5
  if (amount > 100000)  score += 10
  if (amount > 500000)  score += 10
  return Math.min(score, 100)
}

export async function GET() {
  const lastSync = readLastSync('usaspending')
  return NextResponse.json({
    configured: true,
    description: 'Pulls federal award data from USASpending (free, no key required) and creates leads for prime contractors as subcontract targets',
    last_sync: lastSync?.timestamp || null,
    last_sync_created: lastSync?.records_created || 0,
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const { dry_run = false } = body

  const startMs = Date.now()
  let awards_fetched = 0
  let leads_created = 0
  let leads_skipped = 0
  const errors: string[] = []

  const payload = {
    filters: {
      award_type_codes: ['A', 'B', 'C', 'D'],
      naics_codes: ['561720', '561710', '561730', '561790', '561110', '561210', '236220', '531110'],
      time_period: [{ start_date: '2024-01-01', end_date: '2026-12-31' }],
      place_of_performance_locations: [
        { country: 'USA', state: 'FL' },
        { country: 'USA', state: 'TX' },
        { country: 'USA', state: 'CA' },
        { country: 'USA', state: 'GA' },
        { country: 'USA', state: 'NC' },
        { country: 'USA', state: 'VA' },
        { country: 'USA', state: 'NJ' },
        { country: 'USA', state: 'NY' },
      ],
      award_amounts: [{ lower_bound: 25000, upper_bound: 10000000 }],
    },
    fields: [
      'Award ID',
      'Recipient Name',
      'Award Amount',
      'Start Date',
      'End Date',
      'Awarding Agency',
      'Place of Performance State Code',
      'NAICS Code',
      'NAICS Description',
    ],
    limit: 50,
    page: 1,
    sort: 'Award Amount',
    order: 'desc',
  }

  let results: any[] = []
  try {
    const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`USASpending HTTP ${res.status}: ${errText.slice(0, 200)}`)
    }
    const data = await res.json()
    results = data.results || []
    awards_fetched = results.length
  } catch (err: any) {
    errors.push(`USASpending fetch error: ${err.message}`)
    return NextResponse.json({
      ok: false,
      awards_fetched: 0,
      leads_created: 0,
      leads_skipped: 0,
      errors,
      source: 'usaspending',
    }, { status: 502 })
  }

  const today = new Date().toISOString().split('T')[0]

  for (const r of results) {
    const recipient_name = (r['Recipient Name'] || '').trim()
    if (!recipient_name || recipient_name.length < 3) {
      leads_skipped++
      continue
    }

    const award_id       = r['Award ID'] || ''
    const award_amount   = Number(r['Award Amount']) || 0
    const start_date     = r['Start Date'] || ''
    const end_date       = r['End Date'] || ''
    const awarding_agency = r['Awarding Agency'] || 'Federal'
    const state          = r['Place of Performance State Code'] || ''
    const naics_code     = String(r['NAICS Code'] || '561720')
    const naics_desc     = r['NAICS Description'] || 'Janitorial Services'

    const entity_name = recipient_name
    const entity_key  = normalizeEntityKey(entity_name)

    try {
      const exists = await leadExists(entity_key)
      if (exists) {
        leads_skipped++
        continue
      }
    } catch (err: any) {
      errors.push(`Airtable check error for ${entity_name}: ${err.message}`)
      leads_skipped++
      continue
    }

    const score = calcScore(naics_code, state, award_amount)

    const notes = [
      `Prime contractor with ${naics_desc}.`,
      `Award: $${award_amount.toLocaleString()}.`,
      `Agency: ${awarding_agency}.`,
      `Period: ${start_date} to ${end_date}.`,
      `USASpending Award ID: ${award_id}`,
    ].join(' ')

    if (!dry_run) {
      try {
        await atCreate(TBL_LEADS, {
          Entity_Name:    entity_name,
          Entity_Key:     entity_key,
          Source:         'usaspending',
          Stage:          'New Signal',
          Priority_Score: score,
          NAICS:          naics_code,
          Agency:         awarding_agency,
          Value:          award_amount,
          Location:       state,
          Signal_Date:    today,
          Notes:          notes.slice(0, 500),
          Lead_Type:      'GovCon Prospect',
          GovCon_Fit:     score,
          Commercial_Fit: 0,
          Enrichment_Needed: true,
          Contactable:    false,
        })
        leads_created++
        await delay(300)
      } catch (err: any) {
        errors.push(`Airtable create error for ${entity_name}: ${err.message}`)
      }
    } else {
      leads_created++ // dry_run preview
    }
  }

  writeSyncLog('usaspending', {
    records_created: leads_created,
    records_updated: 0,
    errors: errors.length,
    error_messages: errors.slice(0, 5),
    duration_ms: Date.now() - startMs,
    metadata: { awards_fetched, leads_skipped },
  })

  return NextResponse.json({
    ok: true,
    dry_run,
    awards_fetched,
    leads_created,
    leads_skipped,
    errors: errors.slice(0, 10),
    source: 'usaspending',
  })
}
