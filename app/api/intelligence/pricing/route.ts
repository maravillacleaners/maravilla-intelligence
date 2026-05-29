/**
 * GET /api/intelligence/pricing
 *
 * Returns pricing benchmarks for janitorial/cleaning contracts by state nationwide.
 * Fetches 100 records from USASpending with cleaning NAICS codes and aggregates
 * them by state to compute min/max/avg/median contract values.
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

interface StateStats {
  state: string
  total_awarded: number
  avg_contract: number
  median_contract: number
  contract_count: number
  min_contract: number
  max_contract: number
  top_agencies: string[]
  pricing_tier: 'premium' | 'mid' | 'budget'
}

interface NationalStats {
  total_market: number
  avg_contract: number
  median_contract: number
  total_contracts: number
  top_states: string[]
}

interface PricingResponse {
  states: Record<string, StateStats>
  national: NationalStats
  generated_at: string
  naics_covered: string[]
}

// ── NAICS Sets ────────────────────────────────────────────────────────────────

const PRICING_NAICS = ['561720', '561722', '561740']

// ── Math Helpers ──────────────────────────────────────────────────────────────

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

// ── Aggregation ───────────────────────────────────────────────────────────────

function aggregateByState(awards: USASpendingAward[]): Map<string, { amounts: number[]; agencies: Map<string, number> }> {
  const stateMap = new Map<string, { amounts: number[]; agencies: Map<string, number> }>()

  for (const award of awards) {
    const state = (award['Place of Performance State Code'] || 'UNKNOWN').toUpperCase()
    const amount = award['Award Amount'] ?? 0
    const agency = award['Awarding Agency'] || ''

    if (!stateMap.has(state)) {
      stateMap.set(state, { amounts: [], agencies: new Map() })
    }

    const entry = stateMap.get(state)!
    entry.amounts.push(amount)

    if (agency) {
      entry.agencies.set(agency, (entry.agencies.get(agency) ?? 0) + 1)
    }
  }

  return stateMap
}

function topAgencies(agencyMap: Map<string, number>, n = 3): string[] {
  return Array.from(agencyMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name]) => name)
}

// ── GET Handler ───────────────────────────────────────────────────────────────

export async function GET(_req: Request): Promise<NextResponse> {
  const requestBody: Record<string, unknown> = {
    filters: {
      award_type_codes: ['A', 'B', 'C', 'D'],
      naics_codes: { require: PRICING_NAICS },
      award_amounts: [{ lower_bound: 1_000 }],
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
      'Recipient UEI',
    ],
    limit: 100,
    sort: 'Award Amount',
    order: 'desc',
    page: 1,
  }

  let allAwards: USASpendingAward[] = []

  // Fetch two pages for richer data coverage
  const pagePromises = [1, 2].map(async (page) => {
    try {
      const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...requestBody, page }),
        signal: AbortSignal.timeout(15000),
        next: { revalidate: 7200 },
      })

      if (!res.ok) {
        console.warn(`USASpending pricing page ${page} returned ${res.status}`)
        return []
      }

      const data = (await res.json()) as USASpendingResponse
      return data.results ?? []
    } catch (err) {
      console.warn(`USASpending pricing page ${page} failed:`, (err as Error).message)
      return []
    }
  })

  const pages = await Promise.all(pagePromises)
  // USASpending NAICS field can be empty in response even when filter worked —
  // trust the query filter; only exclude zero-value records
  allAwards = pages.flat().filter((a) => (a['Award Amount'] ?? 0) > 0)

  // Build per-state stats
  const stateRaw = aggregateByState(allAwards)

  // Compute national avg first (needed for tier classification)
  const allAmounts = allAwards.map((a) => a['Award Amount'] ?? 0).filter((a) => a > 0)
  const nationalTotal = allAmounts.reduce((s, v) => s + v, 0)
  const nationalAvg = allAmounts.length > 0 ? nationalTotal / allAmounts.length : 0
  const nationalMedian = median(allAmounts)

  // Build state records
  const states: Record<string, StateStats> = {}

  for (const [state, data] of stateRaw.entries()) {
    const amounts = data.amounts.filter((a) => a > 0)
    if (amounts.length === 0) continue

    const total = amounts.reduce((s, v) => s + v, 0)
    const avg = total / amounts.length
    const med = median(amounts)
    const min = Math.min(...amounts)
    const max = Math.max(...amounts)

    let pricing_tier: 'premium' | 'mid' | 'budget' = 'mid'
    if (nationalAvg > 0) {
      if (avg > 1.3 * nationalAvg) pricing_tier = 'premium'
      else if (avg < 0.7 * nationalAvg) pricing_tier = 'budget'
    }

    states[state] = {
      state,
      total_awarded: total,
      avg_contract: avg,
      median_contract: med,
      contract_count: amounts.length,
      min_contract: min,
      max_contract: max,
      top_agencies: topAgencies(data.agencies),
      pricing_tier,
    }
  }

  // Top states by total awarded
  const topStatesList = Object.values(states)
    .sort((a, b) => b.total_awarded - a.total_awarded)
    .slice(0, 5)
    .map((s) => s.state)

  const national: NationalStats = {
    total_market: nationalTotal,
    avg_contract: nationalAvg,
    median_contract: nationalMedian,
    total_contracts: allAmounts.length,
    top_states: topStatesList,
  }

  const response: PricingResponse = {
    states,
    national,
    generated_at: new Date().toISOString(),
    naics_covered: PRICING_NAICS,
  }

  return NextResponse.json(response)
}
