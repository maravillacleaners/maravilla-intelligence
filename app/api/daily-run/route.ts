/**
 * POST /api/daily-run  — Master daily intelligence pipeline
 * GET  /api/daily-run  — Last run summary
 *
 * Steps:
 *   1. Intake: ingest new leads from Intelligence + Avatars tables
 *   2. Enrichment: for leads with Enrichment_Needed=true, find contacts in Avatars
 *   3. Stage advance: Contactable + New Signal → Contact Found
 *   4. Task creation: outreach tasks for contactable, research tasks for high-priority
 *   5. Run log: save summary event
 */

import { NextResponse } from 'next/server'

const KEY = process.env.AIRTABLE_API_KEY!
const BASE = process.env.AIRTABLE_BASE_ID!
const TBL_LEADS   = 'tblja2oeA4oNEjioT'
const TBL_AVATARS = 'tblrIv6lKjsMeUcyU'
const TBL_EVENTS  = 'tbl84x3ZGOIGf8bDA'
const TBL_TASKS   = 'tblrB7Cj84vLwI8tD'
const AT = `https://api.airtable.com/v0/${BASE}`
const HDR = () => ({ Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' })

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

async function atFetch(table: string, filterFormula?: string, maxRecords = 200): Promise<any[]> {
  const records: any[] = []
  let offset: string | null = null
  do {
    const parts = [`pageSize=100`]
    if (filterFormula) parts.push(`filterByFormula=${encodeURIComponent(filterFormula)}`)
    if (offset) parts.push(`offset=${encodeURIComponent(offset)}`)
    if (maxRecords) parts.push(`maxRecords=${maxRecords}`)
    const res = await fetch(`${AT}/${table}?${parts.join('&')}`, { headers: HDR() })
    if (!res.ok) break
    const data = await res.json()
    records.push(...(data.records || []))
    offset = data.offset || null
  } while (offset && records.length < 500)
  return records
}

async function atPatch(table: string, id: string, fields: Record<string, any>) {
  const res = await fetch(`${AT}/${table}/${id}`, {
    method: 'PATCH', headers: HDR(),
    body: JSON.stringify({ fields, typecast: true }),
  })
  return res.json()
}

async function atCreate(table: string, fields: Record<string, any>) {
  const res = await fetch(`${AT}/${table}`, {
    method: 'POST', headers: HDR(),
    body: JSON.stringify({ fields, typecast: true }),
  })
  return res.json()
}

async function createEvent(entity_key: string, entity_name: string, event_type: string, description: string, source = 'daily_run') {
  return atCreate(TBL_EVENTS, {
    Entity_Key: entity_key,
    Entity_Type: 'lead',
    Entity_Name: entity_name,
    Event_Type: event_type,
    Description: description,
    Actor: 'Maravilla Intelligence',
    Source: source,
    Timestamp: new Date().toISOString(),
  })
}

async function taskExists(entity_key: string, task_type: string): Promise<boolean> {
  const formula = `AND({Entity_Key}="${entity_key.replace(/"/g, '\\"')}",{Status}="Open",FIND("${task_type}",{Task})>0)`
  const existing = await atFetch(TBL_TASKS, formula, 1)
  return existing.length > 0
}

async function createTask(entity_key: string, entity_name: string, task: string, notes: string, priority: string, due_days: number) {
  const due = new Date()
  due.setDate(due.getDate() + due_days)
  return atCreate(TBL_TASKS, {
    Entity_Key: entity_key,
    Entity_Name: entity_name,
    Entity_Type: 'lead',
    Entity_URL: `/leads?q=${encodeURIComponent(entity_name.slice(0, 30))}`,
    Task: task,
    Notes: notes,
    Status: 'Open',
    Priority: priority,
    Owner: 'Sales',
    Due_Date: due.toISOString().split('T')[0],
    Created_At: new Date().toISOString(),
  })
}

// ── Step 1: Intake ─────────────────────────────────────────────────────────────
async function runIntake(): Promise<{ created: number; updated: number; skipped: number; errors: number }> {
  const app_url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${app_url}/api/leads/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sources: ['intelligence', 'avatars', 'sam', 'usaspending'], dry_run: false }),
    })
    const data = await res.json()
    return {
      created: data.stats?.created || 0,
      updated: data.stats?.updated || 0,
      skipped: data.stats?.skipped || 0,
      errors: data.stats?.errors || 0,
    }
  } catch (e: any) {
    return { created: 0, updated: 0, skipped: 0, errors: 1 }
  }
}

// ── Step 1b: Gmail intake ─────────────────────────────────────────────────────
async function runGmailIntake(): Promise<{ leads_created: number; tasks_created: number; scanned: number; skipped: boolean }> {
  if (!process.env.GOOGLE_GMAIL_TOKEN) return { leads_created: 0, tasks_created: 0, scanned: 0, skipped: true }
  const app_url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${app_url}/api/gmail/intake`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
    const data = await res.json()
    return { leads_created: data.leads_created || 0, tasks_created: data.tasks_created || 0, scanned: data.scanned || 0, skipped: false }
  } catch {
    return { leads_created: 0, tasks_created: 0, scanned: 0, skipped: false }
  }
}

// ── Step 5: Lead sweep (ensure every active lead has a next task) ──────────────
async function runLeadSweep(): Promise<{ tasks_created: number; leads_scanned: number }> {
  const app_url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${app_url}/api/leads/sweep`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
    const data = await res.json()
    return { tasks_created: data.tasks_created || 0, leads_scanned: data.leads_scanned || 0 }
  } catch {
    return { tasks_created: 0, leads_scanned: 0 }
  }
}

// ── Step 2: Enrichment ─────────────────────────────────────────────────────────
async function runEnrichment(): Promise<{ leads_checked: number; enriched: number; events_created: number }> {
  const stats = { leads_checked: 0, enriched: 0, events_created: 0 }

  const needsEnrichment = await atFetch(TBL_LEADS, `{Enrichment_Needed}=1`, 100)
  stats.leads_checked = needsEnrichment.length

  for (const rec of needsEnrichment) {
    const f = rec.fields
    const ek = f.Entity_Key || ''
    if (!ek) continue

    const safe_ek = ek.replace(/"/g, '\\"')
    const avatars = await atFetch(TBL_AVATARS, `AND({Entity_Key}="${safe_ek}",{Email}!="")`, 5)

    if (avatars.length > 0) {
      const best = avatars.sort((a: any, b: any) =>
        (b.fields.Influence_Score || 0) - (a.fields.Influence_Score || 0)
      )[0]
      const af = best.fields

      await atPatch(TBL_LEADS, rec.id, {
        Contactable: true,
        Enrichment_Needed: false,
        Has_Decision_Maker: true,
        Decision_Maker_Name: af.Name || '',
        Decision_Maker_Email: af.Email || '',
        Decision_Maker_Phone: af.Phone || '',
        Avatar_Count: avatars.length,
      })

      await createEvent(ek, f.Entity_Name || '', 'enrichment_success',
        `Contact found: ${af.Name} (${af.Email}) via avatar match`)
      stats.enriched++
      stats.events_created++
    } else {
      await createEvent(ek, f.Entity_Name || '', 'enrichment_attempted',
        `No contact email found in avatars — manual research needed`)
      stats.events_created++
    }
    await delay(100)
  }
  return stats
}

// ── Step 3: Stage advance ──────────────────────────────────────────────────────
async function runStageAdvance(): Promise<{ advanced: number }> {
  let advanced = 0
  const contactableNew = await atFetch(TBL_LEADS,
    `AND({Contactable}=1,{Stage}="New Signal")`, 50)

  for (const rec of contactableNew) {
    await atPatch(TBL_LEADS, rec.id, { Stage: 'Contact Found' })
    await createEvent(
      rec.fields.Entity_Key || '', rec.fields.Entity_Name || '',
      'stage_change', 'Stage → Contact Found (contact email available)',
    )
    advanced++
    await delay(80)
  }
  return { advanced }
}

// ── Step 4: Task creation ──────────────────────────────────────────────────────
async function runTaskCreation(): Promise<{ created: number }> {
  let created = 0

  // Outreach tasks for contactable leads in "Contact Found" stage
  const contactFound = await atFetch(TBL_LEADS,
    `AND({Contactable}=1,OR({Stage}="Contact Found",{Stage}="New Signal",{Stage}="Outreach Ready"))`, 30)

  for (const rec of contactFound) {
    const f = rec.fields
    const ek = f.Entity_Key || ''
    if (!ek) continue
    const exists = await taskExists(ek, 'Outreach')
    if (!exists) {
      await createTask(
        ek, f.Entity_Name || '',
        `Outreach: Send capabilities statement to ${f.Decision_Maker_Name || 'contact'} at ${f.Entity_Name}`,
        `Email: ${f.Decision_Maker_Email || '—'} | NAICS: ${f.NAICS || '561720'} | Source: ${f.Source || 'USASpending'}`,
        'High',
        1,
      )
      created++
      await delay(100)
    }
  }

  // Research tasks for high-priority leads without contact
  const highPriNoContact = await atFetch(TBL_LEADS,
    `AND({Contactable}=0,{Priority_Score}>=70,NOT(OR({Stage}="Won",{Stage}="Lost",{Stage}="Monitor")))`, 20)

  for (const rec of highPriNoContact) {
    const f = rec.fields
    const ek = f.Entity_Key || ''
    if (!ek) continue
    const exists = await taskExists(ek, 'Find contact')
    if (!exists) {
      await createTask(
        ek, f.Entity_Name || '',
        `Find contact: Locate SB office or POC for ${f.Entity_Name}`,
        `Score: ${f.Priority_Score} | NAICS: ${f.NAICS} | Value: $${((f.Value || 0)/1e9).toFixed(1)}B | Check SAM.gov, company website, LinkedIn`,
        'Medium',
        3,
      )
      created++
      await delay(100)
    }
  }
  return { created }
}

// ── POST handler ───────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const start = Date.now()
  const errors: string[] = []

  const intake = await runIntake().catch(e => {
    errors.push(`intake: ${e.message}`)
    return { created: 0, updated: 0, skipped: 0, errors: 1 }
  })

  const gmail = await runGmailIntake().catch(e => {
    errors.push(`gmail: ${e.message}`)
    return { leads_created: 0, tasks_created: 0, scanned: 0, skipped: true }
  })

  const enrichment = await runEnrichment().catch(e => {
    errors.push(`enrichment: ${e.message}`)
    return { leads_checked: 0, enriched: 0, events_created: 0 }
  })

  const advance = await runStageAdvance().catch(e => {
    errors.push(`stage_advance: ${e.message}`)
    return { advanced: 0 }
  })

  const tasks = await runTaskCreation().catch(e => {
    errors.push(`task_creation: ${e.message}`)
    return { created: 0 }
  })

  const sweep = await runLeadSweep().catch(e => {
    errors.push(`sweep: ${e.message}`)
    return { tasks_created: 0, leads_scanned: 0 }
  })

  const duration_ms = Date.now() - start
  const today = new Date().toISOString().split('T')[0]

  // Save run log
  await createEvent('system', 'Maravilla Intelligence', 'daily_run',
    `Daily run complete in ${(duration_ms/1000).toFixed(1)}s — intake: +${intake.created} leads, gmail: +${gmail.leads_created}, enriched: ${enrichment.enriched}, tasks: +${tasks.created + sweep.tasks_created}, errors: ${errors.length}`,
    'daily_pipeline'
  ).catch(() => {})

  const result = {
    success: true,
    run_date: today,
    duration_ms,
    steps: { intake, gmail, enrichment, advance, tasks, sweep },
    errors,
  }

  return NextResponse.json(result)
}

// ── GET handler — last run log ─────────────────────────────────────────────────
export async function GET() {
  const runs = await atFetch(TBL_EVENTS, `{Event_Type}="daily_run"`, 5)
  const last = runs.sort((a: any, b: any) =>
    new Date(b.fields.Timestamp || b.createdTime).getTime() -
    new Date(a.fields.Timestamp || a.createdTime).getTime()
  )
  return NextResponse.json({
    last_runs: last.slice(0, 3).map((r: any) => ({
      id: r.id,
      description: r.fields.Description,
      timestamp: r.fields.Timestamp || r.createdTime,
    }))
  })
}
