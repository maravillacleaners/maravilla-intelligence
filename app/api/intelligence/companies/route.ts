/**
 * GET /api/intelligence/companies
 *
 * Angle 2 — "Find Subcontractors / Compete"
 * Returns cleaning companies nationwide from USASpending awarded contracts.
 * Classifies each as 'competitor' or 'subcontractor_prospect' based on scale.
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
  'Place of Performance City Code': string
  'Recipient UEI': string
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

interface CompanyRecord {
  company: string
  uei: string
  state: string
  city: string
  naics: string
  naics_desc: string
  total_contracts: number
  contract_count: number
  avg_contract: number
  last_award: string
  largest_award: number
  agencies: string[]
  angle: 'prime_contractor' | 'competitor' | 'subcontractor_prospect'
  signal: string
}

interface CompanyStats {
  avg_national_contract: number
  top_states: string[]
  total_market_value: number
}

// ── NAICS Sets ────────────────────────────────────────────────────────────────

// 561210 excluded — too broad, pulls DoE nuclear lab contracts that contaminate sector intel
const CLEANING_NAICS = ['561720', '561722', '561740', '561790']

// ── Signal Generator ──────────────────────────────────────────────────────────

function buildSignal(record: Omit<CompanyRecord, 'signal'>): string {
  const avgFmt =
    record.avg_contract >= 1_000_000
      ? `$${(record.avg_contract / 1_000_000).toFixed(1)}M`
      : `$${Math.round(record.avg_contract / 1_000)}K`

  const totalFmt =
    record.total_contracts >= 1_000_000
      ? `$${(record.total_contracts / 1_000_000).toFixed(1)}M`
      : `$${Math.round(record.total_contracts / 1_000)}K`

  if (record.angle === 'prime_contractor') {
    return `Prime contractor — ${totalFmt} in cleaning NAICS. Likely subcontracts janitorial work → strong client target for Maravilla`
  }
  if (record.angle === 'competitor') {
    const agencyCount = record.agencies.length
    return `Direct competitor — ${totalFmt} across ${record.contract_count} gov contracts, ${agencyCount} agency relationship${agencyCount !== 1 ? 's' : ''}`
  }
  // subcontractor_prospect
  const stateNote = record.state ? `${record.state}-based` : 'Regional'
  return `${stateNote}, ${avgFmt} avg contract — sub-scale operator, potential subcontract partner for Maravilla`
}

// ── Deduplication & Aggregation ───────────────────────────────────────────────

function aggregateByCompany(awards: USASpendingAward[]): CompanyRecord[] {
  const map = new Map<
    string,
    {
      uei: string
      state: string
      city: string
      naics: string
      naics_desc: string
      amounts: number[]
      dates: string[]
      agencies: Set<string>
    }
  >()

  for (const award of awards) {
    const name = (award['Recipient Name'] || '').trim().toUpperCase()
    if (!name) continue

    const amount = award['Award Amount'] ?? 0
    const date = award['Action Date'] || ''
    const agency = award['Awarding Agency'] || ''

    if (!map.has(name)) {
      map.set(name, {
        uei: award['Recipient UEI'] || '',
        state: award['Place of Performance State Code'] || '',
        city: award['Place of Performance City Code'] || '',
        naics: award['NAICS Code'] || '',
        naics_desc: award['NAICS Description'] || '',
        amounts: [],
        dates: [],
        agencies: new Set(),
      })
    }

    const entry = map.get(name)!
    entry.amounts.push(amount)
    if (date) entry.dates.push(date)
    if (agency) entry.agencies.add(agency)
  }

  return Array.from(map.entries()).map(([company, data]) => {
    const total = data.amounts.reduce((a, b) => a + b, 0)
    const count = data.amounts.length
    const avg = count > 0 ? total / count : 0
    const largest = Math.max(...data.amounts)
    const sortedDates = [...data.dates].sort().reverse()
    const lastAward = sortedDates[0] || ''

    // Large primes (avg > $5M) = potential clients (they sub cleaning to Maravilla)
    // Mid-scale = direct competitors
    // Small = subcontractor prospects
    const angle: 'prime_contractor' | 'competitor' | 'subcontractor_prospect' =
      avg > 5_000_000
        ? 'prime_contractor'
        : avg < 200_000 && count < 10
        ? 'subcontractor_prospect'
        : 'competitor'

    const partial: Omit<CompanyRecord, 'signal'> = {
      company: company.split(' ').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' '),
      uei: data.uei,
      state: data.state,
      city: data.city,
      naics: data.naics,
      naics_desc: data.naics_desc,
      total_contracts: total,
      contract_count: count,
      avg_contract: avg,
      last_award: lastAward,
      largest_award: largest,
      agencies: Array.from(data.agencies),
      angle,
    }

    return { ...partial, signal: buildSignal(partial) }
  })
}

// ── Stats Calculator ──────────────────────────────────────────────────────────

function computeStats(companies: CompanyRecord[]): CompanyStats {
  if (companies.length === 0) {
    return { avg_national_contract: 0, top_states: [], total_market_value: 0 }
  }

  const totalMarket = companies.reduce((sum, c) => sum + c.total_contracts, 0)
  const totalContracts = companies.reduce((sum, c) => sum + c.contract_count, 0)
  const avgNational = totalContracts > 0 ? totalMarket / totalContracts : 0

  const stateMap = new Map<string, number>()
  for (const c of companies) {
    if (c.state) {
      stateMap.set(c.state, (stateMap.get(c.state) ?? 0) + c.total_contracts)
    }
  }
  const topStates = Array.from(stateMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([state]) => state)

  return {
    avg_national_contract: avgNational,
    top_states: topStates,
    total_market_value: totalMarket,
  }
}

// ── GET Handler ───────────────────────────────────────────────────────────────

export async function GET(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)

  const stateFilter = searchParams.get('state') || null
  const minContracts = parseFloat(searchParams.get('min_contracts') || '0')
  const maxContracts = parseFloat(searchParams.get('max_contracts') || 'Infinity') || Infinity
  const angleFilter = searchParams.get('angle') as 'competitor' | 'subcontractor_prospect' | null

  const requestBody: Record<string, unknown> = {
    filters: {
      award_type_codes: ['A', 'B', 'C', 'D'],
      naics_codes: { require: CLEANING_NAICS },
      award_amounts: [{ lower_bound: 10_000 }],
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
      'Place of Performance City Code',
      'Recipient UEI',
    ],
    limit: 100,
    sort: 'Award Amount',
    order: 'desc',
    page: 1,
  }

  if (stateFilter) {
    requestBody.filters = {
      ...(requestBody.filters as Record<string, unknown>),
      place_of_performance_scope: 'domestic',
      place_of_performance_locations: [{ country: 'USA', state: stateFilter }],
    }
  }

  let allAwards: USASpendingAward[] = []

  // Fetch page 1
  try {
    const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(15000),
      next: { revalidate: 3600 },
    })

    if (res.ok) {
      const data = (await res.json()) as USASpendingResponse
      allAwards = data.results ?? []
    } else {
      console.warn(`USASpending companies API (page 1) returned ${res.status}`)
    }
  } catch (err) {
    console.warn('USASpending companies fetch (page 1) failed:', (err as Error).message)
  }

  // Optionally fetch page 2 for better coverage
  if (allAwards.length === 100) {
    try {
      const body2 = { ...requestBody, page: 2 }
      const res2 = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body2),
        signal: AbortSignal.timeout(15000),
        next: { revalidate: 3600 },
      })

      if (res2.ok) {
        const data2 = (await res2.json()) as USASpendingResponse
        allAwards = [...allAwards, ...(data2.results ?? [])]
      }
    } catch (err) {
      console.warn('USASpending companies fetch (page 2) failed:', (err as Error).message)
    }
  }

  // Aggregate and deduplicate by company name
  // Trust USASpending's naics_codes filter — NAICS field in response can be empty
  let companies = aggregateByCompany(allAwards)

  // Apply filters
  if (minContracts > 0) {
    companies = companies.filter((c) => c.total_contracts >= minContracts)
  }
  if (isFinite(maxContracts)) {
    companies = companies.filter((c) => c.total_contracts <= maxContracts)
  }
  if (angleFilter) {
    companies = companies.filter((c) => c.angle === angleFilter)
  }

  // Sort by total contracts descending
  companies.sort((a, b) => b.total_contracts - a.total_contracts)

  const stats = computeStats(companies)

  return NextResponse.json({
    companies,
    total: companies.length,
    stats,
    generated_at: new Date().toISOString(),
    filters_applied: {
      state: stateFilter,
      min_contracts: minContracts,
      max_contracts: isFinite(maxContracts) ? maxContracts : null,
      angle: angleFilter,
      naics_covered: CLEANING_NAICS,
    },
  })
}
