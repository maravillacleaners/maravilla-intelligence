/**
 * Single Opportunity API
 * GET   /api/opportunities/[id] – Fetch one opportunity by Airtable record ID
 * PATCH /api/opportunities/[id] – Update opportunity fields
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
  source_url: string
  contact_name: string
  contact_email: string
  notes: string
  created_at: string
  days_until_deadline: number | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeDaysUntilDeadline(deadline: string | null): number | null {
  if (!deadline) return null
  const ms = new Date(deadline).getTime() - Date.now()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

function mapRecord(record: Record<string, unknown>): Opportunity {
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
    source_url: (f.source_url as string) || '',
    contact_name: (f.contact_name as string) || '',
    contact_email: (f.contact_email as string) || '',
    notes: (f.notes as string) || '',
    created_at: (f.created_at as string) || new Date().toISOString(),
    days_until_deadline: computeDaysUntilDeadline(deadline),
  }
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 })
    }

    const res = await fetch(`${AIRTABLE_API_URL}/${id}`, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
    })

    if (res.status === 404) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    }

    if (!res.ok) {
      const errText = await res.text()
      console.error('Airtable GET single failed:', res.status, errText)
      return NextResponse.json(
        { error: 'Failed to fetch opportunity', details: errText },
        { status: 500 }
      )
    }

    const record = await res.json()
    return NextResponse.json({ opportunity: mapRecord(record) })
  } catch (err) {
    console.error('Opportunity GET [id] error:', err)
    return NextResponse.json(
      { error: 'Internal server error', details: String(err) },
      { status: 500 }
    )
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 })
    }

    const body = await req.json()

    // Build fields object from allowed patchable fields
    const allowed = [
      'title', 'agency', 'state', 'deadline', 'estimated_value', 'source',
      'status', 'score', 'signal_strength', 'scope_summary', 'cleaning_keywords',
      'naics_codes', 'source_url', 'contact_name', 'contact_email', 'notes',
    ]

    const fields: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) {
        if ((key === 'cleaning_keywords' || key === 'naics_codes') && Array.isArray(body[key])) {
          fields[key] = (body[key] as string[]).join(', ')
        } else {
          fields[key] = body[key]
        }
      }
    }

    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const res = await fetch(`${AIRTABLE_API_URL}/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    })

    if (res.status === 404) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    }

    if (!res.ok) {
      const errText = await res.text()
      console.error('Airtable PATCH failed:', res.status, errText)
      return NextResponse.json(
        { success: false, error: 'Failed to update opportunity', details: errText },
        { status: 500 }
      )
    }

    const record = await res.json()
    return NextResponse.json({
      success: true,
      opportunity: mapRecord(record),
    })
  } catch (err) {
    console.error('Opportunity PATCH [id] error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(err) },
      { status: 500 }
    )
  }
}
