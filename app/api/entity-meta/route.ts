/**
 * Entity Meta API
 * GET        – ?entity_key=slug → returns entity meta record or { exists: false }
 * POST/PATCH – Upsert by Entity_Key
 */

import { NextRequest, NextResponse } from 'next/server'

const AIRTABLE_API_KEY = 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92'
const AIRTABLE_BASE_ID = 'appZhXnyFiKbnOZLr'
const META_TABLE = 'tblLqoH7KP1R4leaZ'
const BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${META_TABLE}`

const HEADERS = {
  Authorization: `Bearer ${AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json',
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EntityMeta {
  id: string
  entity_key: string
  entity_type: string
  entity_name: string
  owner: string
  stage: string
  monitored: boolean
  notes: string
  tags: string[]
  updated_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapRecord(record: Record<string, unknown>): EntityMeta {
  const f = (record.fields ?? {}) as Record<string, unknown>
  return {
    id: record.id as string,
    entity_key: (f['Entity_Key'] as string) || '',
    entity_type: (f['Entity_Type'] as string) || '',
    entity_name: (f['Entity_Name'] as string) || '',
    owner: (f['Owner'] as string) || '',
    stage: (f['Stage'] as string) || 'Monitoring',
    monitored: (f['Monitored'] as boolean) || false,
    notes: (f['Notes'] as string) || '',
    tags: (f['Tags'] as string[]) || [],
    updated_at: (f['Updated_At'] as string) || new Date().toISOString(),
  }
}

async function findByKey(entityKey: string): Promise<{ record: Record<string, unknown> } | null> {
  const formula = `{Entity_Key}="${entityKey.replace(/"/g, '\\"')}"`
  const params = new URLSearchParams({ filterByFormula: formula, maxRecords: '1' })
  const res = await fetch(`${BASE_URL}?${params.toString()}`, { headers: HEADERS })
  if (!res.ok) return null
  const data = await res.json() as { records: Record<string, unknown>[] }
  if (!data.records || data.records.length === 0) return null
  return { record: data.records[0] }
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const entityKey = searchParams.get('entity_key')

    if (!entityKey) {
      return NextResponse.json({ error: 'entity_key is required' }, { status: 400 })
    }

    const found = await findByKey(entityKey)
    if (!found) {
      return NextResponse.json({ exists: false })
    }

    return NextResponse.json({ exists: true, meta: mapRecord(found.record) })
  } catch (e) {
    console.error('[entity-meta GET]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── POST (upsert) ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      entity_key: string
      entity_type?: string
      entity_name?: string
      owner?: string
      stage?: string
      monitored?: boolean
      notes?: string
      tags?: string[]
    }

    if (!body.entity_key) {
      return NextResponse.json({ error: 'entity_key is required' }, { status: 400 })
    }

    const fields: Record<string, unknown> = {
      Entity_Key: body.entity_key,
      Updated_At: new Date().toISOString(),
    }
    if (body.entity_type !== undefined) fields['Entity_Type'] = body.entity_type
    if (body.entity_name !== undefined) fields['Entity_Name'] = body.entity_name
    if (body.owner !== undefined) fields['Owner'] = body.owner
    if (body.stage !== undefined) fields['Stage'] = body.stage
    if (body.monitored !== undefined) fields['Monitored'] = body.monitored
    if (body.notes !== undefined) fields['Notes'] = body.notes
    if (body.tags !== undefined) fields['Tags'] = body.tags

    // Check if exists
    const existing = await findByKey(body.entity_key)

    let res: Response
    if (existing) {
      // Update
      const recordId = (existing.record.id as string)
      res = await fetch(`${BASE_URL}/${recordId}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({ fields }),
      })
    } else {
      // Create
      res = await fetch(BASE_URL, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ fields }),
      })
    }

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: res.status })
    }

    const record = await res.json() as Record<string, unknown>
    const status = existing ? 200 : 201
    return NextResponse.json({ meta: mapRecord(record), created: !existing }, { status })
  } catch (e) {
    console.error('[entity-meta POST]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH is an alias for POST (upsert)
export { POST as PATCH }
