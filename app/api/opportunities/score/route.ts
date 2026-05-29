/**
 * Opportunity Scoring API
 *
 * POST – Score one or many opportunities (0-100) using weighted factors.
 *        Body: { opportunities: [...] }  OR  { opportunity: {...} }
 *
 * GET  – ?source=airtable  Fetch all 'New' opportunities from Airtable
 *         Opportunities table, score them, and optionally update the `score`
 *         field back in Airtable.
 */

import { NextRequest, NextResponse } from 'next/server'

const AIRTABLE_API_KEY = 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92'
const AIRTABLE_BASE_ID = 'appZhXnyFiKbnOZLr'
const AIRTABLE_TABLE_ID = 'tbldTDb1v79dVNCTQ'
const AIRTABLE_BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`

// ── Types ─────────────────────────────────────────────────────────────────────

interface OpportunityInput {
  id?: string
  title?: string
  agency?: string
  naics_code?: string
  estimated_value?: number | null
  deadline?: string | null
  set_aside?: string | null
  state?: string | null
  source?: string
  [key: string]: unknown
}

interface ScoreBreakdown {
  value_score: number
  naics_score: number
  setaside_score: number
  deadline_score: number
  geography_score: number
}

interface Recommendation {
  label: 'high_priority' | 'worth_reviewing' | 'low_priority' | 'skip'
  reason: string
}

interface ScoredOpportunity extends OpportunityInput {
  score: number
  breakdown: ScoreBreakdown
  recommendation: Recommendation
}

interface Stats {
  high_priority: number
  worth_reviewing: number
  low_priority: number
  skip: number
  avg_score: number
}

// ── Scoring Logic ─────────────────────────────────────────────────────────────

function scoreValue(value: number | null | undefined): number {
  if (!value || value <= 0) return 0
  return Math.min(25, (Math.log10(value) / Math.log10(5_000_000)) * 25)
}

function scoreNaics(naics: string | null | undefined): number {
  if (!naics) return 0
  const code = String(naics).trim()
  if (code.startsWith('5617')) return 20   // janitorial / cleaning
  if (code.startsWith('5612')) return 15   // facilities support
  if (code.startsWith('5311')) return 10   // property management
  return 5
}

const SOUTHEAST = new Set(['GA', 'SC', 'NC', 'AL', 'MS', 'TN'])
const LARGE_MARKETS = new Set(['TX', 'NY', 'CA', 'VA', 'MD', 'DC'])

function scoreGeography(state: string | null | undefined): number {
  if (!state) return 3
  const s = state.trim().toUpperCase()
  if (s === 'FL') return 15
  if (SOUTHEAST.has(s)) return 10
  if (LARGE_MARKETS.has(s)) return 5
  return 3
}

function scoreSetAside(setAside: string | null | undefined): number {
  if (!setAside) return 0
  const s = setAside.toUpperCase()
  if (s.includes('WOSB') || s.includes('WO')) return 20
  if (s.includes('EDWOSB')) return 20
  if (s.includes('SDB') || s.includes('SB')) return 15
  if (s.includes('SDVOSB') || s.includes('HUBZONE')) return 10
  if (s.includes('FULL AND OPEN') || s === 'OPEN') return 0
  return 0
}

function scoreDeadline(deadline: string | null | undefined): number {
  if (!deadline) return 0
  const ms = new Date(deadline).getTime() - Date.now()
  if (isNaN(ms)) return 0
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24))
  if (days < 7) return 0           // too late
  if (days <= 14) return 15        // 7-14 days
  if (days <= 60) return 20        // sweet spot
  if (days <= 90) return 10        // 60-90 days
  return 5                         // > 90 days
}

function buildRecommendation(score: number, breakdown: ScoreBreakdown): Recommendation {
  if (score >= 75) {
    const reasons: string[] = []
    if (breakdown.naics_score >= 20) reasons.push('strong NAICS match (janitorial)')
    if (breakdown.geography_score === 15) reasons.push('Florida — home market')
    if (breakdown.setaside_score >= 20) reasons.push('favorable set-aside (WOSB/EDWOSB)')
    if (breakdown.deadline_score === 20) reasons.push('ideal deadline window (15-60 days)')
    if (breakdown.value_score >= 20) reasons.push('high contract value')
    return {
      label: 'high_priority',
      reason: reasons.length > 0 ? reasons.join('; ') : 'Strong overall match',
    }
  }
  if (score >= 50) {
    return {
      label: 'worth_reviewing',
      reason: 'Moderate match — review scope and competition before committing resources',
    }
  }
  if (score >= 25) {
    const weak: string[] = []
    if (breakdown.naics_score < 10) weak.push('weak NAICS alignment')
    if (breakdown.geography_score < 5) weak.push('outside primary markets')
    if (breakdown.deadline_score === 0 && breakdown.value_score < 5) weak.push('unknown deadline and value')
    return {
      label: 'low_priority',
      reason: weak.length > 0 ? `Low priority: ${weak.join('; ')}` : 'Low overall fit — monitor only',
    }
  }
  return {
    label: 'skip',
    reason: 'Poor fit: low value alignment, weak NAICS, or outside serviceable geography',
  }
}

function scoreOpportunity(opp: OpportunityInput): ScoredOpportunity {
  const breakdown: ScoreBreakdown = {
    value_score: Math.round(scoreValue(opp.estimated_value)),
    naics_score: scoreNaics(opp.naics_code),
    setaside_score: scoreSetAside(opp.set_aside),
    deadline_score: scoreDeadline(opp.deadline),
    geography_score: scoreGeography(opp.state),
  }

  const total_score = Math.min(
    100,
    breakdown.value_score +
      breakdown.naics_score +
      breakdown.setaside_score +
      breakdown.deadline_score +
      breakdown.geography_score
  )

  const recommendation = buildRecommendation(total_score, breakdown)

  return { ...opp, score: total_score, breakdown, recommendation }
}

function computeStats(scored: ScoredOpportunity[]): Stats {
  const counts = { high_priority: 0, worth_reviewing: 0, low_priority: 0, skip: 0 }
  let sum = 0
  for (const s of scored) {
    counts[s.recommendation.label]++
    sum += s.score
  }
  return {
    ...counts,
    avg_score: scored.length > 0 ? Math.round(sum / scored.length) : 0,
  }
}

// ── Airtable helpers ──────────────────────────────────────────────────────────

interface AirtableRecord {
  id: string
  fields: Record<string, unknown>
}

function mapAirtableToInput(record: AirtableRecord): OpportunityInput {
  const f = record.fields
  return {
    id: record.id,
    title: (f.title as string) || '',
    agency: (f.agency as string) || '',
    naics_code: (f.naics_code as string) || (f.naics_codes as string) || '',
    estimated_value: (f.estimated_value as number) || null,
    deadline: (f.deadline as string) || null,
    set_aside: (f.set_aside as string) || null,
    state: (f.state as string) || null,
    source: (f.source as string) || '',
    status: (f.status as string) || '',
  }
}

async function fetchNewOpportunitiesFromAirtable(): Promise<AirtableRecord[]> {
  const filter = encodeURIComponent(`{status}='New'`)
  const url = `${AIRTABLE_BASE_URL}?filterByFormula=${filter}&pageSize=100`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    throw new Error(`Airtable fetch failed: ${res.status}`)
  }

  const data = await res.json()
  return (data.records ?? []) as AirtableRecord[]
}

async function updateScoreInAirtable(recordId: string, score: number): Promise<boolean> {
  try {
    const res = await fetch(`${AIRTABLE_BASE_URL}/${recordId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: { score } }),
      signal: AbortSignal.timeout(10000),
    })
    return res.ok
  } catch {
    return false
  }
}

// ── GET Handler ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url)
    const source = searchParams.get('source')

    if (source !== 'airtable') {
      return NextResponse.json(
        { success: false, error: 'Use ?source=airtable or POST with opportunity data' },
        { status: 400 }
      )
    }

    const records = await fetchNewOpportunitiesFromAirtable()
    const inputs = records.map(mapAirtableToInput)
    const scored = inputs.map(scoreOpportunity)

    // Best-effort score updates back to Airtable (ignore field-not-found errors)
    await Promise.allSettled(
      scored.map((s) => {
        if (s.id) return updateScoreInAirtable(s.id as string, s.score)
        return Promise.resolve(false)
      })
    )

    return NextResponse.json({
      success: true,
      scored,
      stats: computeStats(scored),
    })
  } catch (err) {
    console.error('Opportunities score GET error:', err)
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    )
  }
}

// ── POST Handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()

    let inputs: OpportunityInput[]

    if (body.opportunities && Array.isArray(body.opportunities)) {
      inputs = body.opportunities as OpportunityInput[]
    } else if (body.opportunity && typeof body.opportunity === 'object') {
      inputs = [body.opportunity as OpportunityInput]
    } else {
      return NextResponse.json(
        { success: false, error: 'Provide opportunities[] array or opportunity object' },
        { status: 400 }
      )
    }

    if (inputs.length === 0) {
      return NextResponse.json({ success: true, scored: [], stats: computeStats([]) })
    }

    const scored = inputs.map(scoreOpportunity)

    return NextResponse.json({
      success: true,
      scored,
      stats: computeStats(scored),
    })
  } catch (err) {
    console.error('Opportunities score POST error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(err) },
      { status: 500 }
    )
  }
}
