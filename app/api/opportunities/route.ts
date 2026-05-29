/**
 * Opportunities API
 * GET  – List opportunities from Airtable with filter/sort/limit params
 * POST – Create a new opportunity in Airtable
 */

import { NextRequest, NextResponse } from 'next/server'

const AIRTABLE_API_KEY = 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92'
const AIRTABLE_BASE_ID = 'appZhXnyFiKbnOZLr'
const AIRTABLE_TABLE = 'tbldTDb1v79dVNCTQ'
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE}`

// ── Types ─────────────────────────────────────────────────────────────────────

interface Opportunity {
  id: string
  bid_id: string
  title: string
  agency: string
  state: string
  deadline: string | null
  estimated_value: number | null
  source: string
  status: string
  score: number
  signal_strength: 'high' | 'medium' | 'low'
  scope_summary: string
  cleaning_keywords: string[]
  naics_codes: string[]
  created_at: string
  days_until_deadline: number | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeDaysUntilDeadline(deadline: string | null): number | null {
  if (!deadline) return null
  const ms = new Date(deadline).getTime() - Date.now()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

function mapAirtableRecord(record: Record<string, unknown>): Opportunity {
  const f = (record.fields ?? {}) as Record<string, unknown>
  const deadline = (f.deadline as string) || null
  return {
    id: record.id as string,
    bid_id: (f.bid_id as string) || '',
    title: (f.title as string) || '',
    agency: (f.agency as string) || '',
    state: (f.state as string) || '',
    deadline,
    estimated_value: (f.estimated_value as number) || null,
    source: (f.source as string) || '',
    status: (f.status as string) || 'new',
    score: (f.score as number) || 0,
    signal_strength: ((f.signal_strength as string) || 'low') as 'high' | 'medium' | 'low',
    scope_summary: (f.scope_summary as string) || '',
    cleaning_keywords: f.cleaning_keywords
      ? String(f.cleaning_keywords).split(',').map((s) => s.trim()).filter(Boolean)
      : [],
    naics_codes: f.naics_codes
      ? String(f.naics_codes).split(',').map((s) => s.trim()).filter(Boolean)
      : [],
    created_at: (f.created_at as string) || new Date().toISOString(),
    days_until_deadline: computeDaysUntilDeadline(deadline),
  }
}

function getMockOpportunities(): Opportunity[] {
  const now = new Date()
  const future = (days: number) =>
    new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  return [
    {
      id: 'mock-1',
      bid_id: 'OPP-MOCK-001',
      title: 'Janitorial Services - Broward County Schools Zone 3',
      agency: 'Broward County School District',
      state: 'FL',
      deadline: future(30),
      estimated_value: 485000,
      source: 'sam.gov',
      status: 'new',
      score: 88,
      signal_strength: 'high',
      scope_summary: 'Comprehensive custodial services for 12 school facilities.',
      cleaning_keywords: ['janitorial', 'custodial', 'floor care'],
      naics_codes: ['561720'],
      created_at: now.toISOString(),
      days_until_deadline: 30,
    },
    {
      id: 'mock-2',
      bid_id: 'OPP-MOCK-002',
      title: 'Custodial Services - Miami International Airport Terminals',
      agency: 'Miami-Dade Aviation Department',
      state: 'FL',
      deadline: future(45),
      estimated_value: 1200000,
      source: 'opengov',
      status: 'reviewing',
      score: 75,
      signal_strength: 'high',
      scope_summary: 'Full custodial operations across 3 concourses, 24/7 coverage required.',
      cleaning_keywords: ['custodial', 'sanitation', 'terminal cleaning'],
      naics_codes: ['561720', '561790'],
      created_at: now.toISOString(),
      days_until_deadline: 45,
    },
    {
      id: 'mock-3',
      bid_id: 'OPP-MOCK-003',
      title: 'Office Cleaning Services - City of Fort Lauderdale Municipal Buildings',
      agency: 'City of Fort Lauderdale',
      state: 'FL',
      deadline: future(20),
      estimated_value: 95000,
      source: 'email',
      status: 'bidding',
      score: 62,
      signal_strength: 'medium',
      scope_summary: 'Routine office cleaning for 5 city-owned facilities, M-F schedule.',
      cleaning_keywords: ['office cleaning', 'janitorial', 'trash removal'],
      naics_codes: ['561720'],
      created_at: now.toISOString(),
      days_until_deadline: 20,
    },
  ]
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const sort = searchParams.get('sort') || 'deadline'
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    // Build Airtable query params
    const params = new URLSearchParams()
    params.set('pageSize', String(Math.min(limit, 100)))

    if (status) {
      params.set('filterByFormula', `{status}='${status}'`)
    }

    if (sort === 'deadline') {
      params.set('sort[0][field]', 'deadline')
      params.set('sort[0][direction]', 'asc')
    } else if (sort === 'value') {
      params.set('sort[0][field]', 'estimated_value')
      params.set('sort[0][direction]', 'desc')
    } else if (sort === 'score') {
      params.set('sort[0][field]', 'score')
      params.set('sort[0][direction]', 'desc')
    }

    const res = await fetch(`${AIRTABLE_API_URL}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
    })

    if (!res.ok) {
      console.warn('Airtable Opportunities fetch failed:', res.status)
      const mockData = getMockOpportunities()
      return NextResponse.json({
        opportunities: mockData,
        total: mockData.length,
        filters: { status, sort, limit },
        error: 'table_not_configured',
      })
    }

    const data = await res.json()
    const records: Record<string, unknown>[] = data?.records ?? []
    const opportunities = records.map(mapAirtableRecord)

    return NextResponse.json({
      opportunities,
      total: opportunities.length,
      filters: { status, sort, limit },
    })
  } catch (err) {
    console.error('Opportunities GET error:', err)
    const mockData = getMockOpportunities()
    return NextResponse.json({
      opportunities: mockData,
      total: mockData.length,
      filters: {},
      error: 'table_not_configured',
    })
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()

    const {
      bid_id,
      title,
      agency,
      state,
      deadline,
      estimated_value,
      source,
      status,
      score,
      signal_strength,
      scope_summary,
      cleaning_keywords,
      naics_codes,
      source_url,
      contact_name,
      contact_email,
    } = body

    if (!title || !agency) {
      return NextResponse.json(
        { success: false, error: 'title and agency are required' },
        { status: 400 }
      )
    }

    const generatedBidId = bid_id || `OPP-${Date.now()}`
    const daysUntilDeadline = computeDaysUntilDeadline(deadline ?? null)

    const fields: Record<string, unknown> = {
      bid_id: generatedBidId,
      title,
      agency,
      state: state ?? '',
      deadline: deadline ?? '',
      estimated_value: estimated_value ?? null,
      source: source ?? 'manual',
      status: status ?? 'new',
      score: score ?? 0,
      signal_strength: signal_strength ?? 'low',
      scope_summary: scope_summary ?? '',
      cleaning_keywords: Array.isArray(cleaning_keywords) ? cleaning_keywords.join(', ') : '',
      naics_codes: Array.isArray(naics_codes) ? naics_codes.join(', ') : '',
      source_url: source_url ?? '',
      contact_name: contact_name ?? '',
      contact_email: contact_email ?? '',
      created_at: new Date().toISOString(),
    }

    const res = await fetch(AIRTABLE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Airtable opportunity create failed:', res.status, errText)
      return NextResponse.json(
        { success: false, error: 'Failed to create opportunity', details: errText },
        { status: 500 }
      )
    }

    const record = await res.json()

    const opportunity: Opportunity = {
      id: record.id,
      bid_id: generatedBidId,
      title,
      agency,
      state: state ?? '',
      deadline: deadline ?? null,
      estimated_value: estimated_value ?? null,
      source: source ?? 'manual',
      status: status ?? 'new',
      score: score ?? 0,
      signal_strength: signal_strength ?? 'low',
      scope_summary: scope_summary ?? '',
      cleaning_keywords: Array.isArray(cleaning_keywords) ? cleaning_keywords : [],
      naics_codes: Array.isArray(naics_codes) ? naics_codes : [],
      created_at: new Date().toISOString(),
      days_until_deadline: daysUntilDeadline,
    }

    return NextResponse.json({
      success: true,
      opportunity,
      airtable_record_id: record.id,
    })
  } catch (err) {
    console.error('Opportunities POST error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(err) },
      { status: 500 }
    )
  }
}
