import { NextRequest, NextResponse } from 'next/server'

const AIRTABLE_KEY = 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92'
const BASE = 'appZhXnyFiKbnOZLr'
const TBL_INTEL = 'tbl3qWHqunA0eERE2'
const TBL_OPP = 'tbldTDb1v79dVNCTQ'
const TBL_SUBS = 'tblxyHqJihk9cJ0t9'
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

export interface SearchResult {
  type: 'company' | 'contract' | 'agency' | 'opportunity' | 'contact'
  id: string
  title: string
  subtitle: string
  meta: string
  url: string
  score: number
  badge?: string
  badgeColor?: string
  match_reasons?: string[]
  recommended_actions?: string[]
}

// ── Query parsing ─────────────────────────────────────────────────────────────

interface ParsedQuery {
  keywords: string[]
  state?: string
  naics?: string
  agency?: string
  intent: 'company' | 'contract' | 'agency' | 'opportunity' | 'any'
}

const STATE_ABBRS: Record<string, string> = {
  florida: 'FL', 'fl': 'FL',
  texas: 'TX', 'tx': 'TX',
  california: 'CA', 'ca': 'CA',
  virginia: 'VA', 'va': 'VA',
  maryland: 'MD', 'md': 'MD',
}

const INTENT_WORDS: Record<string, ParsedQuery['intent']> = {
  contractor: 'company', contractors: 'company', company: 'company', companies: 'company', firm: 'company',
  contract: 'contract', contracts: 'contract', award: 'contract', awards: 'contract',
  agency: 'agency', agencies: 'agency', department: 'agency', office: 'agency',
  opportunity: 'opportunity', opportunities: 'opportunity', rfp: 'opportunity', rfq: 'opportunity', bid: 'opportunity',
}

async function parseQueryWithClaude(q: string): Promise<ParsedQuery | null> {
  if (!ANTHROPIC_KEY) return null
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Parse this government contract search query into structured JSON. Return ONLY valid JSON, no markdown.

Query: "${q}"

Schema:
{"keywords":["main search terms, max 5"],"state":"2-letter state code or null","naics":"NAICS code or null","agency":"agency name or null","intent":"company|contract|agency|opportunity|any"}

Examples:
"Florida janitorial contractors with DoD relationships" → {"keywords":["janitorial","DoD"],"state":"FL","naics":"561720","agency":"Department of Defense","intent":"company"}
"AKIMA" → {"keywords":["AKIMA"],"state":null,"naics":null,"agency":null,"intent":"company"}
"GSA cleaning contracts 2024" → {"keywords":["cleaning"],"state":null,"naics":null,"agency":"General Services Administration","intent":"contract"}`,
        }],
      }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const text: string = data?.content?.[0]?.text ?? ''
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    return JSON.parse(cleaned) as ParsedQuery
  } catch {
    return null
  }
}

function parseQueryHeuristic(q: string): ParsedQuery {
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean)
  const keywords: string[] = []
  let state: string | undefined
  let intent: ParsedQuery['intent'] = 'any'

  for (const token of tokens) {
    if (STATE_ABBRS[token]) { state = STATE_ABBRS[token]; continue }
    if (INTENT_WORDS[token]) { intent = INTENT_WORDS[token]; continue }
    if (['with', 'and', 'or', 'in', 'at', 'for', 'the', 'a', 'an', 'of'].includes(token)) continue
    keywords.push(token)
  }

  return { keywords: keywords.slice(0, 5), state, intent }
}

// ── Data fetchers ─────────────────────────────────────────────────────────────

async function searchAirtableIntel(terms: string[]): Promise<SearchResult[]> {
  const results: SearchResult[] = []
  for (const term of terms.slice(0, 3)) {
    const safe = term.replace(/"/g, '')
    const formula = `OR(SEARCH(LOWER("${safe}"),LOWER(IFERROR({company},"")))>0,SEARCH(LOWER("${safe}"),LOWER(IFERROR({agency},"")))>0)`
    const url = `https://api.airtable.com/v0/${BASE}/${TBL_INTEL}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=20`
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_KEY}` }, signal: AbortSignal.timeout(6000) })
      if (!res.ok) continue
      const data = await res.json()
      for (const r of (data.records || []) as { id: string; fields: Record<string, unknown> }[]) {
        const f = r.fields
        const company = String(f.company || '')
        if (!company) continue
        results.push({
          type: 'company',
          id: company,
          title: company,
          subtitle: String(f.agency || 'Intelligence record'),
          meta: String(f.state || ''),
          url: `/companies/${encodeURIComponent(company)}`,
          score: 70,
          badge: String(f.angle || 'intel'),
          badgeColor: '#4F46E5',
        })
      }
    } catch { /* non-fatal */ }
  }
  return results
}

async function searchAirtableOpps(terms: string[]): Promise<SearchResult[]> {
  const results: SearchResult[] = []
  for (const term of terms.slice(0, 3)) {
    const safe = term.replace(/"/g, '')
    const formula = `OR(SEARCH(LOWER("${safe}"),LOWER(IFERROR({title},"")))>0,SEARCH(LOWER("${safe}"),LOWER(IFERROR({agency},"")))>0)`
    const url = `https://api.airtable.com/v0/${BASE}/${TBL_OPP}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=15`
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_KEY}` }, signal: AbortSignal.timeout(6000) })
      if (!res.ok) continue
      const data = await res.json()
      for (const r of (data.records || []) as { id: string; fields: Record<string, unknown> }[]) {
        const f = r.fields
        const title = String(f.title || f.bid_id || '')
        if (!title) continue
        results.push({
          type: 'opportunity',
          id: r.id,
          title,
          subtitle: String(f.agency || ''),
          meta: String(f.status || 'New'),
          url: `/opportunities`,
          score: Number(f.score) || 50,
          badge: String(f.signal_strength || 'Medium'),
          badgeColor: f.signal_strength === 'High' ? '#16A34A' : f.signal_strength === 'Low' ? '#78716C' : '#D97706',
        })
      }
    } catch { /* non-fatal */ }
  }
  return results
}

async function searchAirtableSubs(terms: string[]): Promise<SearchResult[]> {
  const results: SearchResult[] = []
  for (const term of terms.slice(0, 3)) {
    const safe = term.replace(/"/g, '')
    const formula = `OR(SEARCH(LOWER("${safe}"),LOWER(IFERROR({legal_name},"")))>0,SEARCH(LOWER("${safe}"),LOWER(IFERROR({contact_name},"")))>0)`
    const url = `https://api.airtable.com/v0/${BASE}/${TBL_SUBS}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=10`
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_KEY}` }, signal: AbortSignal.timeout(6000) })
      if (!res.ok) continue
      const data = await res.json()
      for (const r of (data.records || []) as { id: string; fields: Record<string, unknown> }[]) {
        const f = r.fields
        const name = String(f.contact_name || f.legal_name || '')
        if (!name) continue
        results.push({
          type: 'contact',
          id: r.id,
          title: name,
          subtitle: String(f.legal_name || ''),
          meta: String(f.sub_category || f.supplier_type || ''),
          url: `/subs`,
          score: 60,
          badge: 'Verified',
          badgeColor: '#16A34A',
        })
      }
    } catch { /* non-fatal */ }
  }
  return results
}

async function searchUSASpending(
  keywords: string[],
  state?: string,
  naics?: string,
): Promise<{ companies: SearchResult[]; contracts: SearchResult[]; agencies: SearchResult[] }> {
  const keyword = keywords.join(' ')
  if (!keyword) return { companies: [], contracts: [], agencies: [] }

  try {
    const filters: Record<string, unknown> = {
      keywords: [keyword],
      award_type_codes: ['A', 'B', 'C', 'D'],
      time_period: [{ start_date: '2020-01-01', end_date: '2026-12-31' }],
    }
    if (state) filters.place_of_performance_locations = [{ country: 'USA', state }]
    if (naics) filters.naics_codes = [naics]

    const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters,
        fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Awarding Agency', 'NAICS Code', 'Award Date', 'Description', 'Place of Performance State Code', 'generated_internal_id'],
        page: 1,
        limit: 30,
        sort: 'Award Amount',
        order: 'desc',
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return { companies: [], contracts: [], agencies: [] }
    const data = await res.json()
    const records = data.results || []

    const companySeen = new Set<string>()
    const agencySeen = new Set<string>()
    const companies: SearchResult[] = []
    const contracts: SearchResult[] = []
    const agencies: SearchResult[] = []

    for (const r of records as Record<string, unknown>[]) {
      const recipient = String(r['Recipient Name'] || '')
      const agency = String(r['Awarding Agency'] || '')
      const amount = Number(r['Award Amount']) || 0
      const awardId = String(r['Award ID'] || '')
      const generatedId = String(r['generated_internal_id'] || awardId)
      const state_ = String(r['Place of Performance State Code'] || '')
      const naics_ = String(r['NAICS Code'] || '')
      const desc = String(r['Description'] || '')
      const date = String(r['Award Date'] || '')

      if (recipient && !companySeen.has(recipient)) {
        companySeen.add(recipient)
        companies.push({
          type: 'company',
          id: recipient,
          title: recipient,
          subtitle: `${agency}`,
          meta: state_,
          url: `/companies/${encodeURIComponent(recipient)}`,
          score: amount > 5_000_000 ? 90 : amount > 1_000_000 ? 75 : 60,
          badge: amount > 5_000_000 ? 'Prime' : amount > 200_000 ? 'Competitor' : 'Sub Prospect',
          badgeColor: amount > 5_000_000 ? '#D97706' : amount > 200_000 ? '#DC2626' : '#16A34A',
        })
      }

      contracts.push({
        type: 'contract',
        id: awardId,
        title: desc || `Award to ${recipient}`,
        subtitle: `${recipient} · ${agency}`,
        meta: `$${amount >= 1_000_000 ? (amount / 1_000_000).toFixed(1) + 'M' : Math.round(amount / 1000) + 'K'} · ${date.slice(0, 4)}`,
        url: `/contracts/${encodeURIComponent(generatedId || awardId)}`,
        score: 70,
        badge: state_,
        badgeColor: state_ === 'FL' ? '#4F46E5' : '#78716C',
      })

      if (agency && !agencySeen.has(agency)) {
        agencySeen.add(agency)
        agencies.push({
          type: 'agency',
          id: agency,
          title: agency,
          subtitle: `${agencySeen.size === 1 ? 'Awarding agency' : 'Federal agency'}`,
          meta: `${records.filter((x: Record<string, unknown>) => x['Awarding Agency'] === agency).length} awards found`,
          url: `/agencies/${encodeURIComponent(agency)}`,
          score: 65,
          badge: 'Agency',
          badgeColor: '#2563EB',
        })
      }
    }

    return { companies, contracts, agencies }
  } catch {
    return { companies: [], contracts: [], agencies: [] }
  }
}

// ── Reasoning + recommended actions ──────────────────────────────────────────

function buildReasoning(
  result: SearchResult,
  parsed: ParsedQuery,
): { match_reasons: string[]; recommended_actions: string[] } {
  const reasons: string[] = []
  const actions: string[] = []
  const titleLc = result.title.toLowerCase()

  // State match
  if (parsed.state && (result.meta === parsed.state || result.subtitle.includes(parsed.state))) {
    reasons.push(`${parsed.state} operations confirmed`)
  }

  // Keywords matched
  for (const kw of parsed.keywords.slice(0, 3)) {
    if (titleLc.includes(kw.toLowerCase()) || result.subtitle.toLowerCase().includes(kw.toLowerCase())) {
      reasons.push(`matched keyword "${kw}"`)
      break
    }
  }

  // Agency match
  if (parsed.agency && (result.subtitle.toLowerCase().includes(parsed.agency.toLowerCase()) || titleLc.includes(parsed.agency.toLowerCase()))) {
    reasons.push(`${parsed.agency} relationship`)
  }

  // NAICS match
  if (parsed.naics && result.subtitle.includes(parsed.naics)) {
    reasons.push(`NAICS ${parsed.naics} match`)
  }

  // Type-specific reasons
  if (result.type === 'company') {
    if (result.badge === 'Prime') reasons.push('prime contractor — subcontracting opportunities')
    else if (result.badge === 'Competitor') reasons.push('competitor in your market')
    else reasons.push('sub-contractor prospect')
    if (result.score >= 80) reasons.push('high relevance score')
  }

  if (result.type === 'opportunity') {
    reasons.push('active procurement opportunity')
    if (result.badge === 'High') reasons.push('high signal strength')
  }

  if (result.type === 'agency') {
    reasons.push('federal awarding agency')
    reasons.push('procurement intelligence available')
  }

  // Recommended actions by type
  if (result.type === 'company') {
    actions.push('View company profile', 'Find contacts', 'Add to pipeline')
  } else if (result.type === 'contract') {
    actions.push('View company profile', 'Check recompete window')
  } else if (result.type === 'agency') {
    actions.push('View agency profile', 'See top recipients', 'Find procurement contacts')
  } else if (result.type === 'opportunity') {
    actions.push('Review opportunity', 'Start outreach')
  } else if (result.type === 'contact') {
    actions.push('View contact', 'Start outreach')
  }

  return {
    match_reasons: [...new Set(reasons)].slice(0, 4),
    recommended_actions: actions.slice(0, 3),
  }
}

// ── Dedup + rank ──────────────────────────────────────────────────────────────

function dedup(results: SearchResult[]): SearchResult[] {
  const seen = new Map<string, SearchResult>()
  for (const r of results) {
    const key = `${r.type}:${r.title.toLowerCase().trim()}`
    const existing = seen.get(key)
    if (!existing || r.score > existing.score) seen.set(key, r)
  }
  return [...seen.values()].sort((a, b) => b.score - a.score)
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() || ''
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || '40'), 100)

  if (!q || q.length < 2) {
    return NextResponse.json({ query: q, results: [], total: 0, parsed: null })
  }

  // Parse query — Claude first, heuristic fallback
  const parsed = (await parseQueryWithClaude(q)) || parseQueryHeuristic(q)
  const terms = parsed.keywords.length > 0 ? parsed.keywords : [q]

  // Run all searches in parallel
  const [intelResults, oppResults, subResults, usaResults] = await Promise.all([
    searchAirtableIntel(terms),
    searchAirtableOpps(terms),
    searchAirtableSubs(terms),
    searchUSASpending(terms, parsed.state, parsed.naics),
  ])

  const all: SearchResult[] = [
    ...intelResults,
    ...oppResults,
    ...subResults,
    ...usaResults.companies,
    ...usaResults.contracts,
    ...usaResults.agencies,
  ]

  const deduped = dedup(all).slice(0, limit).map((r) => ({
    ...r,
    ...buildReasoning(r, parsed),
  }))

  const grouped = {
    companies: deduped.filter((r) => r.type === 'company'),
    contracts: deduped.filter((r) => r.type === 'contract'),
    agencies: deduped.filter((r) => r.type === 'agency'),
    opportunities: deduped.filter((r) => r.type === 'opportunity'),
    contacts: deduped.filter((r) => r.type === 'contact'),
  }

  return NextResponse.json({
    query: q,
    parsed,
    results: deduped,
    grouped,
    total: deduped.length,
  })
}
