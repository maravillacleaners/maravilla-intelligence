/**
 * GET /api/intelligence/national-summary
 *
 * Comprehensive national intelligence summary combining:
 *   - Facilities contract winners (client targets)  — NAICS 531312, 561210, 561990, 531311
 *   - Cleaning sector companies (competitors/subs)  — NAICS 561720, 561722, 561740, 561790
 *   - Pricing benchmarks                            — NAICS 561720, 561722, 561740
 *
 * Fetches all three sources in parallel with a 15-second timeout each.
 * Returns zeros/empty arrays on partial failures.
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

export interface WinnerRecord {
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

export interface CompanyRecord {
  company: string
  uei: string
  state: string
  total_contracts: number
  contract_count: number
  avg_contract: number
  last_award: string
  naics: string
  angle: 'prime_contractor' | 'competitor' | 'subcontractor_prospect'
}

interface NationalSummary {
  summary: {
    total_client_targets: number
    total_sector_companies: number
    total_market_value: number
    states_covered: number
    top_opportunity_state: string
    avg_contract_value: number
  }
  top_client_targets: WinnerRecord[]
  top_competitors: CompanyRecord[]
  generated_at: string
}

// ── NAICS Sets ────────────────────────────────────────────────────────────────

const BUYER_NAICS = ['531312', '561210', '561990', '531311']
const CLEANING_NAICS = ['561720', '561722', '561740', '561790']
const PRICING_NAICS = ['561720', '561722', '561740']

// ── Shared fetch helper ───────────────────────────────────────────────────────

async function fetchUSASpending(body: Record<string, unknown>): Promise<USASpendingAward[]> {
  try {
    const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const data = (await res.json()) as USASpendingResponse
    return data.results ?? []
  } catch {
    return []
  }
}

// ── Fields used in all queries ────────────────────────────────────────────────

const SHARED_FIELDS = [
  'Award ID',
  'Recipient Name',
  'Award Amount',
  'Action Date',
  'Awarding Agency',
  'NAICS Code',
  'NAICS Description',
  'Place of Performance State Code',
  'Recipient UEI',
]

// ── Winners query builder ─────────────────────────────────────────────────────

function winnersBody(): Record<string, unknown> {
  return {
    filters: {
      award_type_codes: ['A', 'B', 'C', 'D'],
      naics_codes: { require: BUYER_NAICS },
      award_amounts: [{ lower_bound: 50_000, upper_bound: 5_000_000 }],
    },
    fields: SHARED_FIELDS,
    limit: 25,
    sort: 'Award Amount',
    order: 'desc',
    page: 1,
  }
}

// ── Companies query builder ───────────────────────────────────────────────────

function companiesBody(): Record<string, unknown> {
  return {
    filters: {
      award_type_codes: ['A', 'B', 'C', 'D'],
      naics_codes: { require: CLEANING_NAICS },
      award_amounts: [{ lower_bound: 10_000 }],
    },
    fields: SHARED_FIELDS,
    limit: 100,
    sort: 'Award Amount',
    order: 'desc',
    page: 1,
  }
}

// ── Pricing query builder ─────────────────────────────────────────────────────

function pricingBody(): Record<string, unknown> {
  return {
    filters: {
      award_type_codes: ['A', 'B', 'C', 'D'],
      naics_codes: { require: PRICING_NAICS },
      award_amounts: [{ lower_bound: 1_000 }],
    },
    fields: SHARED_FIELDS,
    limit: 100,
    sort: 'Award Amount',
    order: 'desc',
    page: 1,
  }
}

// ── Transformers ──────────────────────────────────────────────────────────────

function buildWinnerReason(award: USASpendingAward): string {
  const val = award['Award Amount']
  const formatted = val >= 1_000_000
    ? `$${(val / 1_000_000).toFixed(1)}M`
    : `$${Math.round(val / 1_000)}K`
  const agency = award['Awarding Agency'] || 'a federal agency'
  const naicsDesc = (award['NAICS Description'] || '').toLowerCase()
  if (naicsDesc.includes('property management') || naicsDesc.includes('531')) {
    return `Won ${formatted} property management contract from ${agency} — facilities require janitorial subcontractors`
  }
  if (naicsDesc.includes('facilities') || naicsDesc.includes('building')) {
    return `Won ${formatted} facilities management contract from ${agency} — needs janitorial subcontractors`
  }
  return `Won ${formatted} government contract from ${agency} — facilities scope requires professional cleaning`
}

function awardsToWinners(awards: USASpendingAward[]): WinnerRecord[] {
  return awards
    .filter(a => (a['Award Amount'] ?? 0) >= 50_000)
    .map(a => ({
      id: a['Award ID'] || '',
      company: a['Recipient Name'] || '',
      naics: a['NAICS Code'] || '',
      naics_desc: a['NAICS Description'] || '',
      contract_value: a['Award Amount'] ?? 0,
      agency: a['Awarding Agency'] || '',
      state: a['Place of Performance State Code'] || '',
      date: a['Action Date'] || '',
      uei: a['Recipient UEI'] || '',
      angle: 'client_target' as const,
      reason: buildWinnerReason(a),
    }))
    .sort((a, b) => b.contract_value - a.contract_value)
}

function awardsToCompanies(awards: USASpendingAward[]): CompanyRecord[] {
  const map = new Map<string, { uei: string; state: string; naics: string; amounts: number[]; dates: string[] }>()
  for (const award of awards) {
    const name = (award['Recipient Name'] || '').trim().toUpperCase()
    if (!name) continue
    if (!map.has(name)) {
      map.set(name, { uei: award['Recipient UEI'] || '', state: award['Place of Performance State Code'] || '', naics: award['NAICS Code'] || '', amounts: [], dates: [] })
    }
    const entry = map.get(name)!
    entry.amounts.push(award['Award Amount'] ?? 0)
    if (award['Action Date']) entry.dates.push(award['Action Date'])
  }
  return Array.from(map.entries()).map(([companyUpper, data]) => {
    const company = companyUpper.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
    const total = data.amounts.reduce((a, b) => a + b, 0)
    const count = data.amounts.length
    const avg = count > 0 ? total / count : 0
    const lastAward = [...data.dates].sort().reverse()[0] || ''
    const angle: CompanyRecord['angle'] = avg > 5_000_000 ? 'prime_contractor' : avg < 200_000 && count < 10 ? 'subcontractor_prospect' : 'competitor'
    return { company, uei: data.uei, state: data.state, total_contracts: total, contract_count: count, avg_contract: avg, last_award: lastAward, naics: data.naics, angle }
  }).sort((a, b) => b.total_contracts - a.total_contracts)
}

// ── GET Handler ───────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  const [winnersAwards, companiesAwards, pricingAwards] = await Promise.all([
    fetchUSASpending(winnersBody()),
    fetchUSASpending(companiesBody()),
    fetchUSASpending(pricingBody()),
  ])

  const winners = awardsToWinners(winnersAwards)
  const companies = awardsToCompanies(companiesAwards)

  // Combine all awards for aggregate stats
  const allAwards = [...winnersAwards, ...companiesAwards, ...pricingAwards]
  const allAmounts = allAwards.map(a => a['Award Amount'] ?? 0).filter(v => v > 0)
  const totalMarketValue = allAmounts.reduce((s, v) => s + v, 0)
  const avgContractValue = allAmounts.length > 0 ? totalMarketValue / allAmounts.length : 0

  // State coverage — unique states across all sources
  const stateSet = new Set<string>()
  const stateValues = new Map<string, number>()
  for (const award of allAwards) {
    const state = award['Place of Performance State Code']
    if (state) {
      stateSet.add(state)
      stateValues.set(state, (stateValues.get(state) ?? 0) + (award['Award Amount'] ?? 0))
    }
  }

  // Top opportunity state by total value
  let topOpportunityState = ''
  let topStateVal = 0
  for (const [state, val] of stateValues.entries()) {
    if (val > topStateVal) { topStateVal = val; topOpportunityState = state }
  }

  const summary: NationalSummary = {
    summary: {
      total_client_targets: winners.length,
      total_sector_companies: companies.length,
      total_market_value: totalMarketValue,
      states_covered: stateSet.size,
      top_opportunity_state: topOpportunityState,
      avg_contract_value: avgContractValue,
    },
    top_client_targets: winners.slice(0, 5),
    top_competitors: companies.filter(c => c.angle === 'competitor').slice(0, 5),
    generated_at: new Date().toISOString(),
  }

  return NextResponse.json(summary)
}
