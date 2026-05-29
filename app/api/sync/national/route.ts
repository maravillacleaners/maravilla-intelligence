/**
 * National Sync API
 * GET – Trigger a national data refresh from USASpending (NAICS 561720/561722/561740/561790).
 *       New records are inserted into the Airtable Intelligence table (tbl3qWHqunA0eERE2).
 *       Duplicate detection via usaspending_id field (O(1) Set lookup).
 *
 * Query params:
 *   ?pages=N  (default 1, max 10) — number of USASpending pages to fetch
 */

import { NextRequest, NextResponse } from 'next/server'

const AIRTABLE_API_KEY = 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92'
const AIRTABLE_BASE_ID = 'appZhXnyFiKbnOZLr'
const AIRTABLE_INTEL_TABLE = 'tbl3qWHqunA0eERE2'
const AIRTABLE_INTEL_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_INTEL_TABLE}`

const USASPENDING_URL = 'https://api.usaspending.gov/api/v2/search/spending_by_award/'

// ── Types ─────────────────────────────────────────────────────────────────────

interface USASpendingResult {
  'Award ID': string
  'Recipient Name': string
  'Award Amount': number
  'Action Date': string
  'Awarding Agency': string
  'NAICS Code': string
  'Place of Performance State Code': string
  'Place of Performance City Code': string
  'Recipient UEI': string
}

interface AirtableIntelRecord {
  fields: {
    usaspending_id: string
    legal_name: string
    awarded_contractor: string
    award_amount: number
    naics_code: string
    place_of_performance: string
    source: string
    discovery_date: string
    last_enriched: string
  }
}

// ── Normalize Award ID to usaspending_id key ──────────────────────────────────

function normalizeAwardId(awardId: string): string {
  return `CONT_${awardId.replace(/[\s/\\]+/g, '_').toUpperCase()}`
}

// ── Fetch existing usaspending_id values from Airtable ────────────────────────

async function fetchExistingIds(): Promise<Set<string>> {
  const existing = new Set<string>()
  let offset: string | undefined

  // Paginate through all records (Airtable returns max 100 per page)
  do {
    const params = new URLSearchParams()
    params.set('fields[]', 'usaspending_id')
    params.set('pageSize', '100')
    if (offset) params.set('offset', offset)

    const res = await fetch(`${AIRTABLE_INTEL_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      console.warn('Failed to fetch existing Airtable IDs:', res.status)
      break
    }

    const data = await res.json()
    const records: { fields?: { usaspending_id?: string } }[] = data.records ?? []
    for (const r of records) {
      const id = r.fields?.usaspending_id
      if (id) existing.add(id)
    }

    offset = data.offset // undefined when no more pages
  } while (offset)

  return existing
}

// ── Fetch one page from USASpending ──────────────────────────────────────────

async function fetchUSASpendingPage(page: number): Promise<USASpendingResult[]> {
  const payload = {
    filters: {
      award_type_codes: ['A', 'B', 'C', 'D'],
      naics_codes: { require: ['561720', '561722', '561740', '561790'] },
      award_amounts: [{ lower_bound: 10000 }],
    },
    fields: [
      'Award ID',
      'Recipient Name',
      'Award Amount',
      'Action Date',
      'Awarding Agency',
      'NAICS Code',
      'Place of Performance State Code',
      'Place of Performance City Code',
      'Recipient UEI',
    ],
    page,
    limit: 100,
    sort: 'Award Amount',
    order: 'desc',
  }

  const res = await fetch(USASPENDING_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    throw new Error(`USASpending request failed: ${res.status}`)
  }

  const data = await res.json()
  return (data.results ?? []) as USASpendingResult[]
}

// ── Build Airtable record from USASpending result ────────────────────────────

function buildAirtableRecord(result: USASpendingResult, todayIso: string): AirtableIntelRecord {
  const city = result['Place of Performance City Code'] || ''
  const state = result['Place of Performance State Code'] || ''
  const place = [city, state].filter(Boolean).join(', ')

  return {
    fields: {
      usaspending_id: normalizeAwardId(result['Award ID'] || ''),
      legal_name: result['Recipient Name'] || '',
      awarded_contractor: result['Recipient Name'] || '',
      award_amount: typeof result['Award Amount'] === 'number' ? result['Award Amount'] : 0,
      naics_code: String(result['NAICS Code'] || ''),
      place_of_performance: place,
      source: 'USASpending',
      discovery_date: todayIso,
      last_enriched: todayIso,
    },
  }
}

// ── Batch create records in Airtable (10 per batch) ──────────────────────────

async function batchCreateRecords(
  records: AirtableIntelRecord[]
): Promise<{ created: number; errors: string[] }> {
  const errors: string[] = []
  let created = 0
  const BATCH_SIZE = 10

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    try {
      const res = await fetch(AIRTABLE_INTEL_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records: batch }),
        signal: AbortSignal.timeout(15000),
      })

      if (!res.ok) {
        const errText = await res.text()
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed (${res.status}): ${errText.slice(0, 200)}`)
      } else {
        const data = await res.json()
        created += (data.records ?? []).length
      }
    } catch (err) {
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1} exception: ${String(err)}`)
    }
  }

  return { created, errors }
}

// ── GET Handler ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url)
    const pagesParam = parseInt(searchParams.get('pages') ?? '1', 10)
    const pagesToFetch = Math.max(1, Math.min(pagesParam, 10))

    const todayIso = new Date().toISOString().split('T')[0]

    // Step 1: Fetch existing IDs from Airtable for dedup
    let existingIds: Set<string>
    try {
      existingIds = await fetchExistingIds()
    } catch (err) {
      console.warn('Could not fetch existing IDs — proceeding without dedup:', err)
      existingIds = new Set()
    }

    // Step 2: Fetch USASpending pages
    const allResults: USASpendingResult[] = []
    const fetchErrors: string[] = []

    for (let page = 1; page <= pagesToFetch; page++) {
      try {
        const results = await fetchUSASpendingPage(page)
        allResults.push(...results)
        if (results.length < 100) break  // last page
      } catch (err) {
        fetchErrors.push(`USASpending page ${page}: ${String(err)}`)
        break  // stop fetching on first USASpending error
      }
    }

    const total_fetched = allResults.length

    // Step 3: Filter out duplicates
    const newResults = allResults.filter((r) => {
      const id = normalizeAwardId(r['Award ID'] || '')
      return id && !existingIds.has(id)
    })

    const skipped_duplicates = total_fetched - newResults.length

    // Step 4: Build Airtable records
    const airtableRecords = newResults.map((r) => buildAirtableRecord(r, todayIso))

    // Step 5: Batch create in Airtable
    let synced = 0
    const createErrors: string[] = []

    if (airtableRecords.length > 0) {
      const { created, errors } = await batchCreateRecords(airtableRecords)
      synced = created
      createErrors.push(...errors)
    }

    const allErrors = [...fetchErrors, ...createErrors]

    return NextResponse.json({
      success: true,
      synced,
      skipped_duplicates,
      total_fetched,
      pages_fetched: pagesToFetch,
      errors: allErrors,
      synced_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('National sync error:', err)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: String(err),
        synced: 0,
        skipped_duplicates: 0,
        total_fetched: 0,
        errors: [String(err)],
      },
      { status: 500 }
    )
  }
}
