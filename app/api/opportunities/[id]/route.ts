/**
 * GET /api/opportunities/[id] — Fetch single opportunity
 * PATCH /api/opportunities/[id] — Update opportunity fields
 * DELETE /api/opportunities/[id] — Delete opportunity
 * Requires: Valid auth token
 */

import { NextRequest, NextResponse } from 'next/server'
import { credentials, airtableTables } from '@/app/lib/credentials'
import { authMiddleware } from '@/app/lib/auth-middleware'

const KEY  = credentials.airtableApiKey
const BASE = credentials.airtableBaseId
const TBL  = airtableTables.opportunities
const AT   = `https://api.airtable.com/v0/${BASE}`
const HDR  = () => ({ Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' })

function computeDaysUntilDeadline(deadline: string | null): number | null {
  if (!deadline) return null
  const ms = new Date(deadline).getTime() - Date.now()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

function mapAirtableRecord(record: any) {
  const f = record.fields ?? {}
  const deadline = (f.deadline as string) || null
  return {
    id: record.id,
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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await authMiddleware(req)
  if (authError) return authError

  const { id } = params

  try {
    const res = await fetch(`${AT}/${TBL}/${id}`, { headers: HDR() })
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: res.status }
      )
    }

    const record = await res.json()
    const opportunity = mapAirtableRecord(record)

    const response = NextResponse.json(opportunity)
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600')
    return response
  } catch (err) {
    console.error('GET opportunity error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await authMiddleware(req)
  if (authError) return authError

  const { id } = params

  try {
    const body = await req.json()

    // Only allow updates to specific fields
    const updatableFields = [
      'status',
      'score',
      'signal_strength',
      'scope_summary',
      'cleaning_keywords',
      'naics_codes',
      'notes',
    ]

    const fields: Record<string, any> = {}
    for (const key of updatableFields) {
      if (key in body) {
        if (key === 'cleaning_keywords' || key === 'naics_codes') {
          fields[key] = Array.isArray(body[key])
            ? body[key].join(', ')
            : body[key]
        } else {
          fields[key] = body[key]
        }
      }
    }

    if (Object.keys(fields).length === 0) {
      return NextResponse.json(
        { error: 'No updatable fields provided' },
        { status: 400 }
      )
    }

    const res = await fetch(`${AT}/${TBL}/${id}`, {
      method: 'PATCH',
      headers: HDR(),
      body: JSON.stringify({ fields }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error('Airtable PATCH failed:', errBody)
      return NextResponse.json(
        { error: 'Failed to update opportunity' },
        { status: res.status }
      )
    }

    const record = await res.json()
    const opportunity = mapAirtableRecord(record)

    return NextResponse.json(opportunity)
  } catch (err) {
    console.error('PATCH opportunity error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await authMiddleware(req)
  if (authError) return authError

  const { id } = params

  try {
    const res = await fetch(`${AT}/${TBL}/${id}`, {
      method: 'DELETE',
      headers: HDR(),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to delete opportunity' },
        { status: res.status }
      )
    }

    return NextResponse.json({ success: true, id })
  } catch (err) {
    console.error('DELETE opportunity error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
