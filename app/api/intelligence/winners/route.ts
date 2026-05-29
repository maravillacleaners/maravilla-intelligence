/**
 * GET /api/intelligence/winners
 *
 * Angle 1 — "Find Clients"
 * Returns companies that WON government facilities/property management contracts
 * nationwide. These companies NEED janitorial subcontractors = potential clients
 * for Maravilla Cleaners.
 *
 * Data source: USASpending.gov /api/v2/search/spending_by_award/
 */

import { NextResponse } from 'next/server'

// ── Types ─────────────────────────────────────────────────────────────────────

interface USASpendingAward {
  'Award ID': string
  'Recipient Name': string
  'Award Amount': number
  'Action Date': string
  'Awarding Agency': string
  'NAICS Code': string
  'NAICS Description': string
  'Place of Performance State Code': string
  'Recipient UEI': string
  'Recipient DUNS Number'?: string
}

interface USASpendingResponse {
  results: USASpendingAward[]
  page_metadata?: {
    count: number
    page: number
    hasNext: boolean
    total: number
  }
}

interface WinnerRecord {
  id: string
  company: string
  naics: string
  naics_desc: string
  contract_value: number
  agency: string
  state: string
  date: string
  uei: string
  angle: 'client_target'
  reason: string
}

// ── Reason Generator ──────────────────────────────────────────────────────────

function buildReason(award: USASpendingAward): string {
  const value = award['Award Amount']
  const formatted =
    value >= 1_000_000
      ? `$${(value / 1_000_000).toFixed(1)}M`
      : `$${Math.round(value / 1_000)}K`

  const agency = award['Awarding Agency'] || 'a federal agency'
  const naicsDesc = (award['NAICS Description'] || '').toLowerCase()

  if (naicsDesc.includes('property management') || naicsDesc.includes('531')) {
    return `Won ${formatted} property management contract from ${agency} — manages facilities that require professional janitorial services`
  }
  if (naicsDesc.includes('facilities') || naicsDesc.includes('building')) {
    return `Won ${formatted} facilities management contract from ${agency} — needs janitorial subcontractors for ongoing building maintenance`
  }
  if (naicsDesc.includes('construction') || naicsDesc.includes('238') || naicsDesc.includes('236')) {
    return `Won ${formatted} construction/building contract from ${agency} — will need post-construction cleaning services`
  }
  if (naicsDesc.includes('support') || naicsDesc.includes('561')) {
    return `Won ${formatted} building support services contract from ${agency} — core service includes or requires cleaning subcontractors`
  }
  return `Won ${formatted} government contract from ${agency} — facilities scope indicates need for professional cleaning services`
}

// ── NAICS Sets ────────────────────────────────────────────────────────────────

// These are BUYERS of cleaning services — facilities/property management NAICS
const BUYER_NAICS = ['531312', '561210', '561990', '561110', '531311', '237310', '238990']

// ── GET Handler ───────────────────────────────────────────────────────────────

export async function GET(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)

  const stateFilter = searchParams.get('state') || null
  const naicsFilter = searchParams.get('naics') || null
  const minValue = parseInt(searchParams.get('min_value') || '50000', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 100)

  const naicsCodes = naicsFilter
    ? naicsFilter.split(',').map((n) => n.trim())
    : BUYER_NAICS

  const requestBody: Record<string, unknown> = {
    filters: {
      award_type_codes: ['A', 'B', 'C', 'D'],
      naics_codes: { require: naicsCodes },
      // Cap at $5M — excludes billion-dollar nuclear lab / DoD megacontracts
      // while capturing real property management companies that need cleaning subs
      award_amounts: [{ lower_bound: minValue, upper_bound: 5_000_000 }],
    },
    fields: [
      'Award ID',
      'Recipient Name',
      'Award Amount',
      'Action Date',
      'Awarding Agency',
      'NAICS Code',
      'NAICS Description',
      'Place of Performance State Code',
      'Recipient DUNS Number',
      'Recipient UEI',
    ],
    limit,
    sort: 'Award Amount',
    order: 'desc',
    page: 1,
  }

  // Only add state filter if explicitly requested
  if (stateFilter) {
    requestBody.filters = {
      ...(requestBody.filters as Record<string, unknown>),
      place_of_performance_scope: 'domestic',
      place_of_performance_locations: [{ country: 'USA', state: stateFilter }],
    }
  }

  let awards: USASpendingAward[] = []
  let totalFromApi = 0
  let sourcesChecked = 0

  try {
    const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(15000),
      next: { revalidate: 3600 },
    })

    sourcesChecked++

    if (res.ok) {
      const data = (await res.json()) as USASpendingResponse
      awards = data.results ?? []
      totalFromApi = data.page_metadata?.total ?? awards.length
    } else {
      console.warn(`USASpending winners API returned ${res.status}`)
    }
  } catch (err) {
    console.warn('USASpending winners fetch failed:', (err as Error).message)
  }

  // Keep all facilities management awards — large primes ARE client targets
  // (they subcontract cleaning to companies like Maravilla).
  const filteredAwards = awards.filter((a) => {
    const val = a['Award Amount'] ?? 0
    return val >= (minValue || 50_000)
  })

  const winners: WinnerRecord[] = filteredAwards.map((award) => ({
    id: award['Award ID'] || '',
    company: award['Recipient Name'] || '',
    naics: award['NAICS Code'] || '',
    naics_desc: award['NAICS Description'] || '',
    contract_value: award['Award Amount'] ?? 0,
    agency: award['Awarding Agency'] || '',
    state: award['Place of Performance State Code'] || '',
    date: award['Action Date'] || '',
    uei: award['Recipient UEI'] || '',
    angle: 'client_target',
    reason: buildReason(award),
  }))

  return NextResponse.json({
    winners,
    total: totalFromApi,
    angle: 'client_targets',
    generated_at: new Date().toISOString(),
    sources_checked: sourcesChecked,
    filters_applied: {
      state: stateFilter,
      naics: naicsCodes,
      min_value: minValue,
      limit,
    },
  })
}
