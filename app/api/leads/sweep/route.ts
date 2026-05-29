/**
 * POST /api/leads/sweep
 * Scans all non-terminal leads and creates a default task for any that have no open tasks.
 * Safe to call repeatedly — skips leads that already have at least one open task.
 *
 * GET  — returns { description, last_sweep, leads_without_tasks }
 * POST — runs the sweep, returns stats
 *
 * Query params (POST):
 *   limit  — max leads to process per run (default 50, max 100)
 */

import { NextResponse } from 'next/server'
import { getDefaultTask, buildTaskFields } from '@/lib/lead-lifecycle'
import { writeSyncLog, readLastSync } from '@/lib/sync-log'

const KEY  = process.env.AIRTABLE_API_KEY!
const BASE = process.env.AIRTABLE_BASE_ID!
const TBL_LEADS = 'tblja2oeA4oNEjioT'
const TBL_TASKS = 'tblrB7Cj84vLwI8tD'

const AT  = `https://api.airtable.com/v0/${BASE}`
const HDR = () => ({ Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' })

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

async function atList(table: string, formula: string, maxRecords: number): Promise<any[]> {
  const p = new URLSearchParams({
    filterByFormula: formula,
    maxRecords: String(maxRecords),
  })
  const res = await fetch(`${AT}/${table}?${p}`, { headers: HDR() })
  if (!res.ok) return []
  const data = await res.json()
  return data.records || []
}

async function atCreate(table: string, fields: Record<string, any>): Promise<any> {
  const res = await fetch(`${AT}/${table}`, {
    method: 'POST',
    headers: HDR(),
    body: JSON.stringify({ fields, typecast: true }),
  })
  return res.json()
}

// ── GET — status ───────────────────────────────────────────────────────────────

export async function GET() {
  const last = readLastSync('lead_sweep')
  return NextResponse.json({
    description: 'POST /api/leads/sweep — ensures every active lead has an open task. Safe to call repeatedly.',
    last_sweep: last?.timestamp || null,
    leads_without_tasks: last?.metadata?.leads_without_tasks ?? null,
    tasks_created_last_run: last?.records_created ?? null,
  })
}

// ── POST — run sweep ───────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get('limit') || 50), 100)

  const startTime = Date.now()

  // Terminal stages to skip
  const TERMINAL = ['Won', 'Lost']

  // 1. Fetch active leads (not Won / not Lost) — max `limit` records
  const formula = `NOT(OR({Stage}="Won", {Stage}="Lost"))`
  const leads = await atList(TBL_LEADS, formula, limit)

  let leads_scanned          = 0
  let leads_without_tasks    = 0
  let tasks_created          = 0
  let find_contact_created   = 0
  let skipped_terminal       = 0
  const errors: string[]     = []

  for (const lead of leads) {
    const f           = lead.fields || {}
    const stage       = f.Stage || 'New Signal'
    const entity_key  = f.Entity_Key || ''
    const entity_name = f.Entity_Name || lead.id
    const has_contact = f.Has_Decision_Maker || !!f.Decision_Maker_Email

    leads_scanned++

    if (TERMINAL.includes(stage)) { skipped_terminal++; continue }

    // 2. Check what open tasks already exist for this lead
    let hasOpenLifecycleTask     = false
    let hasOpenFindContactTask   = false

    if (entity_key) {
      const safeKey = entity_key.replace(/"/g, '\\"')
      await delay(200)
      const openTasks = await atList(
        TBL_TASKS,
        `AND({Entity_Key}="${safeKey}", {Status}="Open")`,
        5
      )
      for (const t of openTasks) {
        const taskName = (t.fields?.Task || '').toLowerCase()
        if (taskName.includes('find contact') || taskName.includes('find decision maker')) {
          hasOpenFindContactTask = true
        } else {
          hasOpenLifecycleTask = true
        }
      }
    }

    // 3. Create lifecycle task if missing
    if (!hasOpenLifecycleTask) {
      leads_without_tasks++
      const lifecycleTask = getDefaultTask(lead)
      if (!lifecycleTask) { skipped_terminal++; continue }

      const taskFields = buildTaskFields(lifecycleTask, lead, lead.id)
      await delay(200)
      const created = await atCreate(TBL_TASKS, taskFields)
      if (created?.id) {
        tasks_created++
      } else {
        errors.push(`Lifecycle task failed for ${entity_name}: ${created?.error?.message || 'unknown'}`)
      }
    }

    // 4. Create "Find Contact" task if no known decision maker and no such task exists
    if (!has_contact && !hasOpenFindContactTask) {
      const dueDate = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
      await delay(200)
      const created = await atCreate(TBL_TASKS, {
        Task:        `Find contact for ${entity_name}`,
        Status:      'Open',
        Priority:    'High',
        Owner:       'Research',
        Entity_Key:  entity_key,
        Entity_Name: entity_name,
        Due_Date:    dueDate,
        Notes:       `No decision maker on record. Search Hunter.io, Apollo, or LinkedIn for procurement officer / facility manager. Update lead with Decision_Maker_Name + Decision_Maker_Email.`,
      })
      if (created?.id) {
        find_contact_created++
      } else {
        errors.push(`Find Contact task failed for ${entity_name}: ${created?.error?.message || 'unknown'}`)
      }
    }
  }

  const duration_ms = Date.now() - startTime

  // 5. Write to sync log
  writeSyncLog('lead_sweep', {
    records_created: tasks_created + find_contact_created,
    records_updated: 0,
    errors: errors.length,
    error_messages: errors.slice(0, 10),
    duration_ms,
    metadata: {
      leads_scanned,
      leads_without_tasks,
      tasks_created,
      find_contact_created,
      skipped_terminal,
      limit,
    },
  })

  return NextResponse.json({
    ok: true,
    leads_scanned,
    leads_without_tasks,
    tasks_created,
    find_contact_created,
    skipped_terminal,
    duration_ms,
    errors: errors.slice(0, 10),
  })
}
