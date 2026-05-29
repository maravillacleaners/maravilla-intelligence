/**
 * GET /api/browser-agent/opengov
 *
 * Returns REAL active contract opportunities for janitorial/cleaning services.
 *
 * Primary source: SAM.gov Contract Opportunities API (DEMO_KEY, free tier)
 * Fallback source: USASpending recently awarded cleaning contracts (last 90 days)
 *
 * Query params:
 *   naics    — comma-separated NAICS codes (default: 561720,561722,561740,561790)
 *   state    — optional state code (e.g. FL)
 *   limit    — max results (default 25)
 */

import { NextResponse } from 'next/server'

// ── Types ─────────────────────────────────────────────────────────────────────

interface OpportunityRecord {
  id: string
  title: string
  agency: string
  state: string
  city: string
  deadline: string
  posted_date: string
  naics: string
  set_aside: string
  type: string
  url: string
  description: string
  source: 'SAM.gov'
}

// SAM.gov raw record shape (partial — only fields we use)
interface SamGovOpportunity {
  noticeId?: string
  solicitationNumber?: string
  title?: string
  fullParentPathName?: string
  organizationHierarchy?: { name?: string }[]
  officeAddress?: { state?: string; city?: string; zip?: string }
  responseDeadLine?: string
  postedDate?: string
  naicsCode?: string
  typeOfSetAside?: string
  typeOfSetAsideDescription?: string
  type?: string
  uiLink?: string
  description?: string
}

interface SamGovResponse {
  opportunitiesData?: SamGovOpportunity[]
  totalRecords?: number
  limit?: number
  offset?: number
}

// USASpending award shape for fallback
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
  page_metadata?: { total: number }
}

// ── Date Helpers ──────────────────────────────────────────────────────────────

function toSamDateFormat(date: Date): string {
  // SAM.gov expects MM/dd/yyyy
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${mm}/${dd}/${yyyy}`
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

// ── SAM.gov Fetcher ───────────────────────────────────────────────────────────

async function fetchSamGov(
  naicsCodes: string[],
  stateFilter: string | null,
  limit: number,
): Promise<{ opportunities: OpportunityRecord[]; total: number }> {
  const postedFrom = toSamDateFormat(daysAgo(30))
  const postedTo = toSamDateFormat(new Date())

  // Fetch each NAICS code (SAM.gov doesn't accept comma-separated NAICS in free tier)
  // We parallelize and merge results
  const fetchers = naicsCodes.map(async (naics): Promise<SamGovOpportunity[]> => {
    let url =
      `https://api.sam.gov/opportunities/v2/search` +
      `?api_key=DEMO_KEY` +
      `&ptype=o` +
      `&naics=${naics}` +
      `&limit=${limit}` +
      `&postedFrom=${encodeURIComponent(postedFrom)}` +
      `&postedTo=${encodeURIComponent(postedTo)}`

    if (stateFilter) {
      url += `&state=${stateFilter}`
    }

    const res = await fetch(url, {
      headers: { 'User-Agent': 'ContractEdge/1.0 (Maravilla Intelligence Platform)' },
      signal: AbortSignal.timeout(15000),
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      throw new Error(`SAM.gov returned ${res.status} for NAICS ${naics}`)
    }

    const data = (await res.json()) as SamGovResponse
    return data.opportunitiesData ?? []
  })

  const pages = await Promise.allSettled(fetchers)
  const raw: SamGovOpportunity[] = pages.flatMap((p) =>
    p.status === 'fulfilled' ? p.value : [],
  )

  if (raw.length === 0 && pages.every((p) => p.status === 'rejected')) {
    // All failed — surface the first error so caller can try fallback
    const first = pages[0]
    if (first.status === 'rejected') throw first.reason
  }

  // Deduplicate by solicitationNumber / noticeId
  const seen = new Set<string>()
  const deduped: SamGovOpportunity[] = []
  for (const item of raw) {
    const key = item.solicitationNumber || item.noticeId || item.title || ''
    if (key && seen.has(key)) continue
    if (key) seen.add(key)
    deduped.push(item)
  }

  const opportunities: OpportunityRecord[] = deduped.slice(0, limit).map((item) => {
    const agency =
      item.fullParentPathName ||
      (item.organizationHierarchy ?? []).map((o) => o.name).filter(Boolean).join(' > ') ||
      ''

    return {
      id: item.solicitationNumber || item.noticeId || '',
      title: item.title || '',
      agency,
      state: item.officeAddress?.state || '',
      city: item.officeAddress?.city || '',
      deadline: item.responseDeadLine || '',
      posted_date: item.postedDate || '',
      naics: item.naicsCode || '',
      set_aside: item.typeOfSetAsideDescription || item.typeOfSetAside || '',
      type: item.type || 'o',
      url: item.uiLink || `https://sam.gov/opp/${item.noticeId}/view`,
      description: (item.description || '').slice(0, 300),
      source: 'SAM.gov',
    }
  })

  return { opportunities, total: raw.length }
}

// ── USASpending Fallback ──────────────────────────────────────────────────────

async function fetchUSASpendingFallback(
  naicsCodes: string[],
  stateFilter: string | null,
  limit: number,
): Promise<{ opportunities: OpportunityRecord[]; total: number }> {
  // Last 90 days
  const cutoff = daysAgo(90)
  const cutoffStr = cutoff.toISOString().split('T')[0] // YYYY-MM-DD

  const today = new Date().toISOString().split('T')[0]
  const requestBody: Record<string, unknown> = {
    filters: {
      award_type_codes: ['A', 'B', 'C', 'D'],
      naics_codes: { require: naicsCodes },
      award_amounts: [{ lower_bound: 5_000 }],
      date_range_type: 'action_date',
      time_period: [{ start_date: cutoffStr, end_date: today }],
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
    limit,
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

  const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(15000),
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    console.warn(`USASpending fallback returned ${res.status}`)
    return { opportunities: [], total: 0 }
  }

  const data = (await res.json()) as USASpendingResponse
  const awards = (data.results ?? []).filter((a) => (a['Award Amount'] ?? 0) > 0)

  const opportunities: OpportunityRecord[] = awards.map((award) => {
    const value = award['Award Amount'] ?? 0
    const formatted =
      value >= 1_000_000
        ? `$${(value / 1_000_000).toFixed(1)}M`
        : `$${Math.round(value / 1_000)}K`

    return {
      id: award['Award ID'] || '',
      title: `${award['NAICS Description'] || 'Cleaning Services'} — ${award['Awarding Agency'] || 'Federal Agency'} (Recently Awarded ${formatted})`,
      agency: award['Awarding Agency'] || '',
      state: award['Place of Performance State Code'] || '',
      city: award['Place of Performance City Code'] || '',
      deadline: '',
      posted_date: award['Action Date'] || '',
      naics: award['NAICS Code'] || '',
      set_aside: '',
      type: 'awarded',
      url: `https://www.usaspending.gov/award/${encodeURIComponent(award['Award ID'] || '')}`,
      description: `Recently awarded ${formatted} contract to ${award['Recipient Name'] || 'Unknown'}. This represents an active government cleaning contract — the awarding agency is a prospect for future bids.`,
      source: 'SAM.gov', // typed as SAM.gov per spec; actual source tracked in source_used field
    }
  })

  return { opportunities, total: data.page_metadata?.total ?? awards.length }
}

// ── GET Handler ───────────────────────────────────────────────────────────────

export async function GET(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)

  const naicsParam = searchParams.get('naics') || '561720,561722,561740,561790'
  const naicsCodes = naicsParam.split(',').map((n) => n.trim()).filter(Boolean)
  const stateFilter = searchParams.get('state') || null
  const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 100)

  let opportunities: OpportunityRecord[] = []
  let total = 0
  let sourceUsed: 'sam.gov' | 'usaspending_fallback' = 'sam.gov'

  // Try SAM.gov first
  try {
    const result = await fetchSamGov(naicsCodes, stateFilter, limit)
    opportunities = result.opportunities
    total = result.total
    sourceUsed = 'sam.gov'
  } catch (err) {
    const msg = (err as Error).message || ''
    console.warn('SAM.gov fetch failed, using USASpending fallback:', msg)

    // Fall back to USASpending recently awarded contracts
    try {
      const result = await fetchUSASpendingFallback(naicsCodes, stateFilter, limit)
      opportunities = result.opportunities
      total = result.total
      sourceUsed = 'usaspending_fallback'
    } catch (fallbackErr) {
      console.warn('USASpending fallback also failed:', (fallbackErr as Error).message)
      // Return empty gracefully
      opportunities = []
      total = 0
      sourceUsed = 'usaspending_fallback'
    }
  }

  return NextResponse.json({
    opportunities,
    total,
    source_used: sourceUsed,
    generated_at: new Date().toISOString(),
    filters_applied: {
      naics: naicsCodes,
      state: stateFilter,
      limit,
    },
  })
}
