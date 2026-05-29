/**
 * Single Task API
 * GET    – Get task by Airtable record ID
 * PATCH  – Partial update of any task fields
 * DELETE – Delete task
 */

import { NextRequest, NextResponse } from 'next/server'

const AIRTABLE_API_KEY = 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92'
const AIRTABLE_BASE_ID = 'appZhXnyFiKbnOZLr'
const TASKS_TABLE = 'tblrB7Cj84vLwI8tD'
const BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TASKS_TABLE}`

const HEADERS = {
  Authorization: `Bearer ${AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapRecord(record: Record<string, unknown>) {
  const f = (record.fields ?? {}) as Record<string, unknown>
  return {
    id: record.id as string,
    task: (f['Task'] as string) || '',
    status: (f['Status'] as string) || 'Open',
    priority: (f['Priority'] as string) || 'Medium',
    entity_type: (f['Entity_Type'] as string) || '',
    entity_name: (f['Entity_Name'] as string) || '',
    entity_url: (f['Entity_URL'] as string) || '',
    owner: (f['Owner'] as string) || '',
    due_date: (f['Due_Date'] as string) || null,
    notes: (f['Notes'] as string) || '',
    created_at: (f['Created_At'] as string) || new Date().toISOString(),
  }
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const res = await fetch(`${BASE_URL}/${params.id}`, { headers: HEADERS })
    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: res.status })
    }
    const record = await res.json() as Record<string, unknown>
    return NextResponse.json({ task: mapRecord(record) })
  } catch (e) {
    console.error('[task GET id]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json() as Record<string, unknown>

    const fieldMap: Record<string, string> = {
      task: 'Task',
      status: 'Status',
      priority: 'Priority',
      entity_type: 'Entity_Type',
      entity_name: 'Entity_Name',
      entity_url: 'Entity_URL',
      owner: 'Owner',
      due_date: 'Due_Date',
      notes: 'Notes',
    }

    const fields: Record<string, unknown> = {}
    for (const [key, airtableKey] of Object.entries(fieldMap)) {
      if (body[key] !== undefined) {
        fields[airtableKey] = body[key]
      }
    }

    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const res = await fetch(`${BASE_URL}/${params.id}`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ fields }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: res.status })
    }

    const record = await res.json() as Record<string, unknown>
    return NextResponse.json({ task: mapRecord(record) })
  } catch (e) {
    console.error('[task PATCH id]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const res = await fetch(`${BASE_URL}/${params.id}`, {
      method: 'DELETE',
      headers: HEADERS,
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: res.status })
    }

    return NextResponse.json({ deleted: true, id: params.id })
  } catch (e) {
    console.error('[task DELETE id]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
