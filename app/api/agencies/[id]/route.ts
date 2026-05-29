/**
 * Agency Profile API
 * GET /api/agencies/[id]
 *
 * [id] is URL-encoded agency name, e.g. "Department%20of%20Defense"
 * Returns federal spending data, Airtable intelligence, and AI analysis
 * scoped for Maravilla Cleaners (FL commercial janitorial company).
 */

import { NextRequest, NextResponse } from 'next/server'

// ── Constants ─────────────────────────────────────────────────────────────────

const AIRTABLE_KEY = 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92'
const AIRTABLE_BASE = 'appZhXnyFiKbnOZLr'
const TBL_OPP = 'tbldTDb1v79dVNCTQ'
const TBL_INTEL = 'tbl3qWHqunA0eERE2'
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

// ── Types ─────────────────────────────────────────────────────────────────────

interface USASpendingAward {
  award_id: string
  recipient: string
  amount: number
  naics: string
  date: string
  description: string
  state: string
}

interface TopRecipient {
  name: string
  total: number
  count: number
}

interface NaicsEntry {
  code: string
  count: number
}

interface AgencyProfile {
  name: string
  slug: string
  total_spend: number
  contract_count: number
  fl_spend: number
  fl_contract_count: number
  cleaning_spend: number
  cleaning_count: number
  score: number
  years_active: number[]
}

interface ContactToFind {
  title: string
  department: string
  relevance: string
}

interface AIAnalysis {
  why_matters: string
  opportunity_signals: string[]
  procurement_pattern: string
  recompete_likelihood: 'high' | 'medium' | 'low'
  recommended_approach: string
  contacts_to_find: ContactToFind[]
}

interface AirtableRecord {
  id: string
  [key: string]: unknown
}

// ── Airtable helper ───────────────────────────────────────────────────────────

async function airtableSearch(table: string, formula: string): Promise<AirtableRecord[]> {
  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${table}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=50`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_KEY}` },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.records || []).map((r: { id: string; fields: Record<string, unknown> }) => ({
      id: r.id,
      ...r.fields,
    }))
  } catch {
    return []
  }
}

// ── USASpending fetch ─────────────────────────────────────────────────────────

async function fetchAgencyAwards(name: string): Promise<USASpendingAward[]> {
  try {
    const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters: {
          agencies: [{ type: 'awarding', tier: 'toptier', name }],
          award_type_codes: ['A', 'B', 'C', 'D'],
          time_period: [{ start_date: '2020-01-01', end_date: '2026-12-31' }],
        },
        fields: [
          'Award ID',
          'Recipient Name',
          'Award Amount',
          'NAICS Code',
          'Award Date',
          'Description',
          'Place of Performance State Code',
        ],
        page: 1,
        limit: 50,
        sort: 'Award Amount',
        order: 'desc',
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.results || []).map((r: Record<string, unknown>) => ({
      award_id: String(r['Award ID'] || ''),
      recipient: String(r['Recipient Name'] || ''),
      amount: Number(r['Award Amount']) || 0,
      naics: String(r['NAICS Code'] || ''),
      date: String(r['Award Date'] || ''),
      description: String(r['Description'] || ''),
      state: String(r['Place of Performance State Code'] || ''),
    }))
  } catch {
    return []
  }
}

// ── Computation helpers ───────────────────────────────────────────────────────

function computeTopRecipients(awards: USASpendingAward[]): TopRecipient[] {
  const map = new Map<string, { total: number; count: number }>()
  for (const a of awards) {
    const key = a.recipient || 'Unknown'
    const existing = map.get(key) ?? { total: 0, count: 0 }
    map.set(key, { total: existing.total + a.amount, count: existing.count + 1 })
  }
  return Array.from(map.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
}

function computeNaicsDistribution(awards: USASpendingAward[]): NaicsEntry[] {
  const map = new Map<string, number>()
  for (const a of awards) {
    if (!a.naics) continue
    map.set(a.naics, (map.get(a.naics) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
}

function computeYearsActive(awards: USASpendingAward[]): number[] {
  const years = new Set<number>()
  for (const a of awards) {
    if (a.date) {
      const y = new Date(a.date).getFullYear()
      if (!isNaN(y)) years.add(y)
    }
  }
  return Array.from(years).sort()
}

function computeScore(
  totalSpend: number,
  flSpend: number,
  cleaningSpend: number,
  flContractCount: number,
  cleaningCount: number,
): number {
  let score = 0
  if (flSpend > 0) score += 25
  if (cleaningSpend > 0) score += 30
  if (totalSpend > 10_000_000) score += 20
  else if (totalSpend > 1_000_000) score += 10
  if (flContractCount > 3) score += 15
  else if (flContractCount > 0) score += 8
  if (cleaningCount > 2) score += 10
  return Math.min(score, 100)
}

// ── Fallback AI analysis ──────────────────────────────────────────────────────

function buildFallbackAI(
  name: string,
  totalSpend: number,
  flSpend: number,
  cleaningSpend: number,
  flContractCount: number,
  cleaningCount: number,
  score: number,
): AIAnalysis {
  const signals: string[] = []
  if (flSpend > 0) signals.push(`active FL awards ($${(flSpend / 1_000_000).toFixed(1)}M)`)
  if (cleaningSpend > 0) signals.push(`janitorial/cleaning contracts present`)
  if (totalSpend > 10_000_000) signals.push('major federal spender (>$10M)')
  if (flContractCount > 3) signals.push(`${flContractCount} FL contracts on record`)
  if (cleaningCount > 2) signals.push(`${cleaningCount} cleaning NAICS awards`)
  if (signals.length === 0) signals.push('federal awarding agency with tracked spend')

  const recompete: 'high' | 'medium' | 'low' =
    cleaningCount > 2 ? 'high' : flContractCount > 0 ? 'medium' : 'low'

  return {
    why_matters: `${name} has awarded $${(totalSpend / 1_000_000).toFixed(1)}M in contracts, with ${flContractCount} Florida awards totaling $${(flSpend / 1_000_000).toFixed(1)}M. This represents a direct contracting opportunity for Maravilla's commercial janitorial services.`,
    opportunity_signals: signals,
    procurement_pattern: cleaningCount > 0
      ? `${name} actively awards cleaning/janitorial contracts under NAICS 561xxx, suggesting recurring procurement cycles.`
      : `${name} has not yet awarded visible janitorial contracts, but FL operational footprint signals facility maintenance needs.`,
    recompete_likelihood: recompete,
    recommended_approach: score >= 50
      ? `Submit a capabilities brief targeting ${name}'s contracting office, emphasizing Maravilla's FL presence and 561720 NAICS registration.`
      : `Monitor ${name} solicitations on SAM.gov and build indirect relationships through prime contractors operating in FL.`,
    contacts_to_find: [
      {
        title: 'Contracting Officer',
        department: 'Procurement / Acquisitions',
        relevance: 'Primary decision-maker for janitorial service contracts',
      },
      {
        title: 'Facilities Management Director',
        department: 'Facilities / Operations',
        relevance: 'Sets facility maintenance requirements and vendor preferences',
      },
      {
        title: 'Small Business Program Office Representative',
        department: 'Small Business Office',
        relevance: 'Channels small business set-aside opportunities to qualified vendors',
      },
    ],
  }
}

// ── Claude AI analysis ────────────────────────────────────────────────────────

async function generateAI(
  name: string,
  awards: USASpendingAward[],
  totalSpend: number,
  flSpend: number,
  cleaningSpend: number,
  flContractCount: number,
  cleaningCount: number,
  score: number,
): Promise<AIAnalysis> {
  const fallback = buildFallbackAI(name, totalSpend, flSpend, cleaningSpend, flContractCount, cleaningCount, score)

  if (!ANTHROPIC_KEY) return fallback

  const sampleAwards = awards
    .slice(0, 8)
    .map(
      (a) =>
        `${a.recipient}: $${(a.amount / 1000).toFixed(0)}K — NAICS ${a.naics} — ${a.description || 'N/A'} (${a.state})`,
    )
    .join('\n')

  const prompt = `You are a government procurement intelligence analyst for Maravilla Cleaners — a Florida commercial janitorial company (NAICS 561720) pursuing US federal government cleaning contracts.

Federal agency being analyzed: ${name}
Total contract spend (all types, 2020–2026): $${(totalSpend / 1_000_000).toFixed(2)}M across ${awards.length} awards
Florida awards: ${flContractCount} contracts, $${(flSpend / 1_000_000).toFixed(2)}M
Cleaning/janitorial awards (NAICS 561xxx): ${cleaningCount} contracts, $${(cleaningSpend / 1_000_000).toFixed(2)}M
Maravilla relevance score: ${score}/100
Sample awards:
${sampleAwards || 'No award details available'}

Return ONLY valid JSON with no markdown fencing:
{
  "why_matters": "2 concise sentences explaining why this agency matters specifically for Maravilla Cleaners",
  "opportunity_signals": ["3-4 short signal phrases like 'active FL janitorial awards' or 'recurring cleaning NAICS spend'"],
  "procurement_pattern": "1 sentence describing how this agency typically awards cleaning/facilities contracts",
  "recompete_likelihood": "high|medium|low",
  "recommended_approach": "1-2 sentences on the best path for Maravilla to pursue this agency",
  "contacts_to_find": [
    {
      "title": "job title to target",
      "department": "department name",
      "relevance": "why this person matters for Maravilla's outreach"
    }
  ]
}

Generate 2-3 contacts_to_find. Be specific to this agency's procurement structure.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return fallback
    const data = await res.json()
    const text: string = data?.content?.[0]?.text ?? ''
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(cleaned) as AIAnalysis
    return parsed
  } catch {
    return fallback
  }
}

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const name = decodeURIComponent(params.id)
  const nameSafe = name.replace(/"/g, '')

  // Parallel fetch: USASpending + 2 Airtable tables
  const [awards, airtable_opportunities, airtable_intel] = await Promise.all([
    fetchAgencyAwards(name),
    airtableSearch(
      TBL_OPP,
      `OR(SEARCH(LOWER("${nameSafe}"), LOWER(IFERROR({title},"")))>0, SEARCH(LOWER("${nameSafe}"), LOWER(IFERROR({agency},"")))>0)`,
    ),
    airtableSearch(
      TBL_INTEL,
      `OR(SEARCH(LOWER("${nameSafe}"), LOWER(IFERROR({agency},"")))>0, SEARCH(LOWER("${nameSafe}"), LOWER(IFERROR({company},"")))>0)`,
    ),
  ])

  // Compute derived metrics
  const total_spend = awards.reduce((s, a) => s + a.amount, 0)
  const contract_count = awards.length

  const fl_awards = awards.filter((a) => a.state === 'FL')
  const fl_spend = fl_awards.reduce((s, a) => s + a.amount, 0)
  const fl_contract_count = fl_awards.length

  const cleaning_awards = awards.filter((a) => String(a.naics).startsWith('561'))
  const cleaning_spend = cleaning_awards.reduce((s, a) => s + a.amount, 0)
  const cleaning_count = cleaning_awards.length

  const top_recipients = computeTopRecipients(awards)
  const naics_distribution = computeNaicsDistribution(awards)
  const years_active = computeYearsActive(awards)
  const recent_awards = awards.slice(0, 15)

  const score = computeScore(total_spend, fl_spend, cleaning_spend, fl_contract_count, cleaning_count)

  // AI analysis (non-blocking fallback on error)
  const ai = await generateAI(
    name,
    awards,
    total_spend,
    fl_spend,
    cleaning_spend,
    fl_contract_count,
    cleaning_count,
    score,
  )

  const agency: AgencyProfile = {
    name,
    slug: params.id,
    total_spend,
    contract_count,
    fl_spend,
    fl_contract_count,
    cleaning_spend,
    cleaning_count,
    score,
    years_active,
  }

  return NextResponse.json({
    agency,
    ai,
    top_recipients,
    naics_distribution,
    recent_awards,
    airtable_opportunities,
    airtable_intel,
  })
}
