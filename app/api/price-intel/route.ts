/**
 * Price Triangulation API — ContractEdge Intelligence
 *
 * GET /api/price-intel?naics=561720&state=FL&county=Miami-Dade
 *
 * Analyzes award amounts from the Airtable Intelligence table to triangulate
 * the going rate for a given NAICS code and geographic market, then estimates
 * realistic subcontract opportunity windows (15–25 % of prime contract value).
 */

import { NextResponse } from 'next/server'

const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appZhXnyFiKbnOZLr'
const TABLE_ID = 'tbl3qWHqunA0eERE2'
const API_KEY = process.env.AIRTABLE_API_KEY

// ── Statistical helpers ───────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = (p / 100) * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

function median(sorted: number[]): number {
  return percentile(sorted, 50)
}

// ── Insight generator ─────────────────────────────────────────────────────────

function buildInsight(
  location: string,
  naics: string,
  count: number,
  medianPrime: number,
  subMid: number
): string {
  if (count === 0) {
    return `No award records found for NAICS ${naics} in ${location}. This may indicate an emerging or under-tracked market — consider broadening search criteria.`
  }

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
        ? `$${Math.round(n / 1_000)}K`
        : `$${n}`

  const activity =
    count >= 20
      ? 'Very active market'
      : count >= 10
        ? 'Active market'
        : count >= 5
          ? 'Moderate market'
          : 'Sparse market'

  return (
    `${activity} with ${count} award${count !== 1 ? 's' : ''} on record. ` +
    `Median ${fmt(medianPrime)} prime suggests ${fmt(subMid)} mid-range sub opportunity. ` +
    `Targeting primes in the 15–25% sub range is most competitive for NAICS ${naics} in ${location}.`
  )
}

// ── Airtable fetch (with pagination) ─────────────────────────────────────────

interface AirtableRecord {
  id: string
  fields: Record<string, any>
}

async function fetchMatchingRecords(
  naics: string,
  state: string,
  county: string
): Promise<AirtableRecord[]> {
  if (!API_KEY) throw new Error('AIRTABLE_API_KEY not set')

  const allRecords: AirtableRecord[] = []

  // Build filter: naics_code match + place_of_performance containing county/state
  // We use SEARCH() for case-insensitive partial match on place_of_performance.
  const locationTerm = county ? county : state
  const filter = encodeURIComponent(
    `AND(` +
      `{naics_code}='${naics}',` +
      `SEARCH(LOWER('${locationTerm.toLowerCase()}'), LOWER({place_of_performance}))` +
    `)`
  )

  const fields = [
    'naics_code',
    'award_amount',
    'place_of_performance',
    'awarded_contractor',
    'discovery_date',
    'award_date',
    'record_type',
  ]
    .map((f) => `fields[]=${encodeURIComponent(f)}`)
    .join('&')

  let offset: string | null = null

  do {
    const offsetParam: string = offset ? `&offset=${offset}` : ''
    const url: string =
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?` +
      `${fields}&filterByFormula=${filter}&pageSize=100${offsetParam}`

    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      // No cache — always fresh data
    })

    if (!res.ok) {
      const text: string = await res.text()
      throw new Error(`Airtable error ${res.status}: ${text}`)
    }

    const data: { records?: AirtableRecord[]; offset?: string } = await res.json()
    allRecords.push(...(data.records || []))
    offset = data.offset || null
  } while (offset)

  return allRecords
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const naics = searchParams.get('naics')?.trim()
  const state = searchParams.get('state')?.trim() || ''
  const county = searchParams.get('county')?.trim() || ''

  if (!naics) {
    return NextResponse.json(
      { error: 'Missing required param: naics (e.g. ?naics=561720&state=FL&county=Miami-Dade)' },
      { status: 400 }
    )
  }

  const location = [county, state].filter(Boolean).join(', ') || 'All Markets'

  try {
    const records = await fetchMatchingRecords(naics, state, county)

    // Extract non-zero award amounts
    const amounts: number[] = records
      .map((r) => Number(r.fields['award_amount'] || 0))
      .filter((a) => a > 0)
      .sort((a, b) => a - b)

    const count = amounts.length

    // Compute prime stats (all zeros if no amounts)
    const primeMedian = count > 0 ? Math.round(median(amounts)) : 0
    const primeMin = count > 0 ? amounts[0] : 0
    const primeMax = count > 0 ? amounts[amounts.length - 1] : 0
    const primeP25 = count > 0 ? Math.round(percentile(amounts, 25)) : 0
    const primeP75 = count > 0 ? Math.round(percentile(amounts, 75)) : 0

    // Sub-estimate: 15% (low), 20% (mid), 25% (high) of prime median
    // Use P25 for low and P75 for high to give range breadth
    const subLow = Math.round(primeP25 * 0.15)
    const subMid = Math.round(primeMedian * 0.20)
    const subHigh = Math.round(primeP75 * 0.25)

    return NextResponse.json({
      naics,
      location,
      sample_size: count,
      prime_contract: {
        median: primeMedian,
        min: primeMin,
        max: primeMax,
        p25: primeP25,
        p75: primeP75,
      },
      sub_estimate: {
        low: subLow,
        mid: subMid,
        high: subHigh,
        rate: '15-25% of prime',
      },
      market_insight: buildInsight(location, naics, count, primeMedian, subMid),
      generated_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[/api/price-intel] Error:', err)
    return NextResponse.json(
      { error: 'Price triangulation failed', details: String(err) },
      { status: 500 }
    )
  }
}
