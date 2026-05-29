/**
 * Tasks API
 * GET  – List tasks with optional filters: entity_name, entity_type, status
 * POST – Create a new task
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

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Task {
  id: string
  task: string
  status: string
  priority: string
  entity_type: string
  entity_name: string
  entity_url: string
  owner: string
  due_date: string | null
  notes: string
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapRecord(record: Record<string, unknown>): Task {
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const entityName = searchParams.get('entity_name')
    const entityType = searchParams.get('entity_type')
    const status = searchParams.get('status')

    const formulas: string[] = []
    if (entityName) {
      formulas.push(`SEARCH(LOWER("${entityName.replace(/"/g, '\\"')}"), LOWER({Entity_Name}))`)
    }
    if (entityType) {
      formulas.push(`{Entity_Type}="${entityType}"`)
    }
    if (status) {
      formulas.push(`{Status}="${status}"`)
    }

    const filterByFormula =
      formulas.length === 0
        ? ''
        : formulas.length === 1
        ? formulas[0]
        : `AND(${formulas.join(',')})`

    const params = new URLSearchParams()
    if (filterByFormula) params.set('filterByFormula', filterByFormula)
    params.set('sort[0][field]', 'Created_At')
    params.set('sort[0][direction]', 'desc')
    params.set('maxRecords', '200')

    const url = `${BASE_URL}?${params.toString()}`
    const res = await fetch(url, { headers: HEADERS })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: res.status })
    }

    const data = await res.json() as { records: Record<string, unknown>[] }
    const tasks = (data.records || []).map(mapRecord)

    return NextResponse.json({ tasks, total: tasks.length })
  } catch (e) {
    console.error('[tasks GET]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      task: string
      status?: string
      priority?: string
      entity_type?: string
      entity_name?: string
      entity_url?: string
      owner?: string
      due_date?: string
      notes?: string
    }

    if (!body.task || !body.task.trim()) {
      return NextResponse.json({ error: 'Task name is required' }, { status: 400 })
    }

    const fields: Record<string, unknown> = {
      Task: body.task.trim(),
      Status: body.status || 'Open',
      Priority: body.priority || 'Medium',
      Created_At: new Date().toISOString(),
    }
    if (body.entity_type) fields['Entity_Type'] = body.entity_type
    if (body.entity_name) fields['Entity_Name'] = body.entity_name
    if (body.entity_url) fields['Entity_URL'] = body.entity_url
    if (body.owner) fields['Owner'] = body.owner
    if (body.due_date) fields['Due_Date'] = body.due_date
    if (body.notes) fields['Notes'] = body.notes

    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ fields }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: res.status })
    }

    const record = await res.json() as Record<string, unknown>
    return NextResponse.json({ task: mapRecord(record) }, { status: 201 })
  } catch (e) {
    console.error('[tasks POST]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
