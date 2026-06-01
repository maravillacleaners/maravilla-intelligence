import { credentials, airtableTables } from '@/app/lib/credentials'
import { authMiddleware } from '@/app/lib/auth-middleware'
/**
 * Opportunities API
 * GET  – List opportunities from Airtable with filter/sort/limit params
 * POST – Create a new opportunity in Airtable
 * Requires: Valid auth token
 */

import { NextRequest, NextResponse } from 'next/server'

const AIRTABLE_API_KEY = credentials.airtableApiKey
const AIRTABLE_BASE_ID = credentials.airtableBaseId
const AIRTABLE_TABLE = airtableTables.opportunities
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


// ── GET ───────────────────────────────────────────────────────────────────────

async function getHandler(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || searchParams.get('q') || ''
    const status = searchParams.get('status')
    const stateFilter = searchParams.get('state') || ''
    const deadlineFrom = searchParams.get('deadlineFrom') || ''
    const deadlineTo = searchParams.get('deadlineTo') || ''
    const valueMin = searchParams.get('valueMin') || ''
    const valueMax = searchParams.get('valueMax') || ''
    const scoreMin = searchParams.get('scoreMin') || ''
    const sort = searchParams.get('sort') || 'deadline'
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Build Airtable query params
    const params = new URLSearchParams()
    params.set('pageSize', String(Math.min(limit, 100)))
    if (offset > 0) {
      params.set('offset', String(offset))
    }

    // Field selection optimization: only fetch necessary fields
    const fields = [
      'bid_id', 'title', 'agency', 'state', 'deadline', 'estimated_value',
      'source', 'status', 'score', 'signal_strength', 'scope_summary',
      'cleaning_keywords', 'naics_codes'
    ]
    fields.forEach((f, i) => params.set(`fields[${i}]`, f))

    const filters: string[] = []
    if (search) {
      const searchLower = search.toLowerCase()
      filters.push(`OR(SEARCH(LOWER("${searchLower}"),LOWER({title})),SEARCH(LOWER("${searchLower}"),LOWER({agency})),SEARCH(LOWER("${searchLower}"),LOWER({scope_summary})))`)
    }
    if (status) filters.push(`{status}='${status}'`)
    if (stateFilter) filters.push(`{state}='${stateFilter}'`)
    if (deadlineFrom) filters.push(`{deadline}>='${deadlineFrom}'`)
    if (deadlineTo) filters.push(`{deadline}<='${deadlineTo}'`)
    if (valueMin) filters.push(`{estimated_value}>=${valueMin}`)
    if (valueMax) filters.push(`{estimated_value}<=${valueMax}`)
    if (scoreMin) filters.push(`{score}>=${scoreMin}`)

    const formula = filters.length === 0 ? '' : filters.length === 1 ? filters[0] : `AND(${filters.join(',')})`
    if (formula) {
      params.set('filterByFormula', formula)
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
      const errBody = await res.text()
      console.error('❌ Airtable Opportunities fetch failed:', {
        status: res.status,
        error: errBody,
        url: `${AIRTABLE_API_URL}?${params.toString()}`,
      })
      return NextResponse.json(
        { success: false, error: 'Airtable fetch failed', details: errBody },
        { status: res.status }
      )
    }

    const data = await res.json()
    const records: Record<string, unknown>[] = data?.records ?? []
    const opportunities = records.map(mapAirtableRecord)

    const response = NextResponse.json({
      opportunities,
      total: opportunities.length,
      filters: { status, sort, limit },
    })
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600')
    return response
  } catch (err) {
    console.error('Opportunities GET error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(err) },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Check auth
  const authError = await authMiddleware(req)
  if (authError) {
    return authError
  }

  return getHandler(req)
}

// ── POST ──────────────────────────────────────────────────────────────────────

async function postHandler(req: NextRequest): Promise<NextResponse> {
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Check auth
  const authError = await authMiddleware(req)
  if (authError) {
    return authError
  }

  return postHandler(req)
}
