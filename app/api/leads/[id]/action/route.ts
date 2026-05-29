/**
 * POST /api/leads/[id]/action
 * Executes a sales action on a lead — updates stage, creates event, creates task.
 *
 * Actions:
 *   qualify        → Stage: "Outreach Ready" + event
 *   find_contact   → Stage: "Contact Found" + enrichment task
 *   start_outreach → Stage: "Outreach Ready" + outreach task + event
 *   pipeline       → Stage: "In Conversation" + event
 *   monitor        → Stage: "Monitor" + event
 *   not_a_fit      → Stage: "Lost" + event
 *   won            → Stage: "Won" + event
 */

import { NextResponse } from 'next/server'

const KEY  = process.env.AIRTABLE_API_KEY!
const BASE = process.env.AIRTABLE_BASE_ID!
const AT   = `https://api.airtable.com/v0/${BASE}`
const HDR  = () => ({ Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' })

const TBL_LEADS  = 'tblja2oeA4oNEjioT'
const TBL_EVENTS = 'tbl84x3ZGOIGf8bDA'
const TBL_TASKS  = 'tblrB7Cj84vLwI8tD'

async function atGet(table: string, id: string): Promise<any> {
  const res = await fetch(`${AT}/${table}/${id}`, { headers: HDR() })
  if (!res.ok) return null
  return res.json()
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

const ACTION_CONFIG: Record<string, {
  stage: string
  event_type: string
  event_description: (lead: any, notes?: string) => string
  task?: (lead: any, notes?: string) => Record<string, any> | null
}> = {
  qualify: {
    stage: 'Outreach Ready',
    event_type: 'lead_qualified',
    event_description: (lead) => `Lead qualified as outreach-ready. Score: ${lead.fields?.Priority_Score || 0}. Source: ${lead.fields?.Source || 'unknown'}.`,
    task: (lead) => ({
      Task:       `Outreach: Send capabilities statement to ${lead.fields?.Entity_Name}`,
      Notes:      `Qualified lead — review score signals and prepare outreach package. Agency: ${lead.fields?.Agency || 'N/A'} | NAICS: ${lead.fields?.NAICS || 'N/A'}`,
      Status:     'Open',
      Priority:   (lead.fields?.Priority_Score || 0) >= 80 ? 'High' : 'Medium',
      Owner:      'Sales',
      Due_Date:   (() => { const d = new Date(); d.setDate(d.getDate() + 3); return d.toISOString().split('T')[0] })(),
      Created_At: new Date().toISOString(),
    }),
  },
  find_contact: {
    stage: 'Contact Found',
    event_type: 'contact_search_started',
    event_description: (lead) => `Contact search initiated for ${lead.fields?.Entity_Name}. Checking Apollo, Hunter, LinkedIn.`,
    task: (lead) => ({
      Task:       `Find decision-maker contact at ${lead.fields?.Entity_Name}`,
      Notes:      `Look up on Apollo/Hunter/LinkedIn. Agency: ${lead.fields?.Agency || lead.fields?.Entity_Name}. NAICS: ${lead.fields?.NAICS || 'N/A'}. Location: ${lead.fields?.Location || 'N/A'}.`,
      Status:     'Open',
      Priority:   'Medium',
      Owner:      'Research',
      Due_Date:   (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] })(),
      Created_At: new Date().toISOString(),
    }),
  },
  start_outreach: {
    stage: 'Outreach Ready',
    event_type: 'outreach_started',
    event_description: (lead, notes) => `Outreach initiated for ${lead.fields?.Entity_Name}. ${notes ? `Notes: ${notes}` : ''}`,
    task: (lead) => ({
      Task:       `Send outreach email to ${lead.fields?.Decision_Maker_Name || 'contact'} at ${lead.fields?.Entity_Name}`,
      Notes:      `Email: ${lead.fields?.Decision_Maker_Email || 'TBD'} | Phone: ${lead.fields?.Decision_Maker_Phone || 'TBD'} | Score: ${lead.fields?.Priority_Score || 0}`,
      Status:     'Open',
      Priority:   (lead.fields?.Priority_Score || 0) >= 80 ? 'High' : 'Medium',
      Owner:      'Sales',
      Due_Date:   (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] })(),
      Created_At: new Date().toISOString(),
    }),
  },
  pipeline: {
    stage: 'In Conversation',
    event_type: 'moved_to_pipeline',
    event_description: (lead, notes) => `${lead.fields?.Entity_Name} moved to active pipeline. ${notes || ''}`,
    task: (lead) => ({
      Task:       `Follow up with ${lead.fields?.Entity_Name} — schedule walkthrough or proposal call`,
      Notes:      `In conversation. Contact: ${lead.fields?.Decision_Maker_Name || 'unknown'} (${lead.fields?.Decision_Maker_Email || 'no email'})`,
      Status:     'Open',
      Priority:   'High',
      Owner:      'Sales',
      Due_Date:   (() => { const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString().split('T')[0] })(),
      Created_At: new Date().toISOString(),
    }),
  },
  monitor: {
    stage: 'Monitor',
    event_type: 'set_to_monitor',
    event_description: (lead, notes) => `${lead.fields?.Entity_Name} set to monitor. ${notes || 'Will re-evaluate when timing improves.'}`,
    task: null as any,
  },
  not_a_fit: {
    stage: 'Lost',
    event_type: 'marked_not_a_fit',
    event_description: (lead, notes) => `${lead.fields?.Entity_Name} marked not a fit. Reason: ${notes || 'Not specified.'}`,
    task: null as any,
  },
  won: {
    stage: 'Won',
    event_type: 'lead_won',
    event_description: (lead, notes) => `${lead.fields?.Entity_Name} WON. ${notes || ''}`,
    task: (lead) => ({
      Task:       `Onboard ${lead.fields?.Entity_Name} — send contract and schedule kickoff`,
      Notes:      `New client! Contact: ${lead.fields?.Decision_Maker_Name || 'unknown'}`,
      Status:     'Open',
      Priority:   'High',
      Owner:      'Ops',
      Due_Date:   (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] })(),
      Created_At: new Date().toISOString(),
    }),
  },
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body   = await request.json().catch(() => ({}))
  const { action, notes } = body

  if (!action || !ACTION_CONFIG[action]) {
    return NextResponse.json({ error: `Unknown action: ${action}. Valid: ${Object.keys(ACTION_CONFIG).join(', ')}` }, { status: 400 })
  }

  const cfg = ACTION_CONFIG[action]

  // Fetch current lead
  const lead = await atGet(TBL_LEADS, id)
  if (!lead || lead.error) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const entity_key  = lead.fields?.Entity_Key || ''
  const entity_name = lead.fields?.Entity_Name || id

  // 1. Update lead stage
  const patchFields: Record<string, any> = {
    Stage:       cfg.stage,
    Signal_Date: new Date().toISOString().split('T')[0],
  }
  if (notes) patchFields.Notes = (lead.fields?.Notes ? lead.fields.Notes + '\n' : '') + `[${new Date().toLocaleDateString()}] ${notes}`
  await atPatch(TBL_LEADS, id, patchFields)

  // 2. Create event
  await atCreate(TBL_EVENTS, {
    Entity_Key:  entity_key,
    Entity_Type: 'lead',
    Entity_Name: entity_name,
    Event_Type:  cfg.event_type,
    Description: cfg.event_description(lead, notes),
    Actor:       'sales_user',
    Source:      'manual_action',
    Timestamp:   new Date().toISOString(),
  })

  // 3. Create task (if applicable)
  let task_id: string | null = null
  if (cfg.task) {
    const taskFields = cfg.task(lead, notes)
    if (taskFields) {
      const taskResult = await atCreate(TBL_TASKS, {
        ...taskFields,
        Entity_Key:  entity_key,
        Entity_Name: entity_name,
        Entity_Type: 'lead',
      })
      task_id = taskResult?.id || null
    }
  }

  return NextResponse.json({
    ok: true,
    action,
    lead_id:  id,
    new_stage: cfg.stage,
    task_created: !!task_id,
    task_id,
    entity_name,
  })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return NextResponse.json({
    description: `POST /api/leads/${id}/action`,
    actions: Object.keys(ACTION_CONFIG),
    body: { action: 'qualify | find_contact | start_outreach | pipeline | monitor | not_a_fit | won', notes: 'optional' },
  })
}
