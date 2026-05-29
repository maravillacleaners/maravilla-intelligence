/**
 * GET   /api/leads/[id]  — Lead detail with avatars + related data
 * PATCH /api/leads/[id]  — Update stage, notes, next_action
 */

import { NextResponse } from 'next/server'

const KEY = process.env.AIRTABLE_API_KEY!
const BASE = process.env.AIRTABLE_BASE_ID!
const TBL_LEADS = 'tblja2oeA4oNEjioT'
const TBL_AVATARS = 'tblrIv6lKjsMeUcyU'
const TBL_EVENTS = 'tbl84x3ZGOIGf8bDA'
const TBL_TASKS = 'tblrB7Cj84vLwI8tD'

const AT = `https://api.airtable.com/v0/${BASE}`
const HDR = () => ({ Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' })

async function atGet(table: string, id: string) {
  const res = await fetch(`${AT}/${table}/${id}`, { headers: HDR() })
  return res.json()
}

async function atList(table: string, formula: string, maxRecords = 20) {
  const p = new URLSearchParams({ filterByFormula: formula, maxRecords: String(maxRecords) })
  const res = await fetch(`${AT}/${table}?${p}`, { headers: HDR() })
  return res.json()
}

async function atPatch(table: string, id: string, fields: Record<string, any>) {
  const res = await fetch(`${AT}/${table}/${id}`, {
    method: 'PATCH',
    headers: HDR(),
    body: JSON.stringify({ fields, typecast: true }),
  })
  return res.json()
}

async function atCreate(table: string, fields: Record<string, any>) {
  const res = await fetch(`${AT}/${table}`, {
    method: 'POST',
    headers: HDR(),
    body: JSON.stringify({ fields, typecast: true }),
  })
  return res.json()
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const lead = await atGet(TBL_LEADS, id)

  if (lead.error) {
    return NextResponse.json({ error: lead.error?.message || 'Not found' }, { status: 404 })
  }

  const f = lead.fields || {}
  const ek = f.Entity_Key || ''
  const safe_ek = ek.replace(/"/g, '\\"')

  // Fetch related data in parallel
  const [avatars, events, tasks] = await Promise.all([
    ek ? atList(TBL_AVATARS, `{Entity_Key}="${safe_ek}"`, 10) : Promise.resolve({ records: [] }),
    ek ? atList(TBL_EVENTS, `SEARCH("${safe_ek.slice(0, 40)}", {entity_key})>0`, 20) : Promise.resolve({ records: [] }),
    ek ? atList(TBL_TASKS, `SEARCH("${safe_ek.slice(0, 40)}", {entity_key})>0`, 20) : Promise.resolve({ records: [] }),
  ])

  const avatar_list = (avatars.records || []).map((r: any) => ({
    id: r.id,
    name: r.fields.Name || '',
    title: r.fields.Title || '',
    avatar_type: r.fields.Avatar_Type || '',
    email: r.fields.Email || '',
    phone: r.fields.Phone || '',
    influence_score: r.fields.Influence_Score || 0,
    relevance_score: r.fields.Relevance_Score || 0,
    decision_role: r.fields.Decision_Role || '',
    outreach_status: r.fields.Outreach_Status || 'not_contacted',
    next_action: r.fields.Next_Action || '',
    linkedin_url: r.fields.LinkedIn_URL || '',
    outreach_strategy: r.fields.Outreach_Strategy || '',
    organization: r.fields.Organization || '',
  }))

  const decision_maker = avatar_list.find((a: any) => a.decision_role === 'primary') || null

  const score_signals = f.Score_Signals
    ? f.Score_Signals.split('\n').filter(Boolean)
    : []

  return NextResponse.json({
    id,
    entity_key: ek,
    entity_name: f.Entity_Name || '',
    lead_type: f.Lead_Type || 'Commercial Prospect',
    stage: f.Stage || 'New Signal',
    priority_score: f.Priority_Score || 0,
    commercial_fit: f.Commercial_Fit || 0,
    govcon_fit: f.GovCon_Fit || 0,
    score_signals,
    source: f.Source || '',
    source_record_id: f.Source_Record_ID || '',
    value: f.Value || 0,
    total_value: f.Total_Value || f.Value || 0,
    award_count: f.Award_Count || 1,
    location: f.Location || '',
    naics: f.NAICS || '',
    agency: f.Agency || '',
    description: f.Description || '',
    signal_date: f.Signal_Date || '',
    deadline: f.Deadline || null,
    next_action: f.Next_Action || '',
    recommended_outreach: f.Recommended_Outreach || '',
    avatar_count: f.Avatar_Count || avatar_list.length,
    has_decision_maker: !!(f.Has_Decision_Maker || decision_maker),
    decision_maker_name: f.Decision_Maker_Name || '',
    decision_maker_email: f.Decision_Maker_Email || '',
    decision_maker_phone: f.Decision_Maker_Phone || '',
    notes: f.Notes || '',
    contactable: !!(f.Decision_Maker_Email || (decision_maker && decision_maker.email)),
    avatars: avatar_list,
    decision_maker,
    events: (events.records || []).map((r: any) => ({
      id: r.id,
      event_type: r.fields.event_type || '',
      description: r.fields.description || '',
      actor: r.fields.actor || '',
      source: r.fields.source || '',
      created_time: r.createdTime,
    })),
    tasks: (tasks.records || []).map((r: any) => ({
      id: r.id,
      title: r.fields.title || r.fields.Task || '',
      status: r.fields.status || r.fields.Status || '',
      due_date: r.fields.due_date || r.fields.Due_Date || '',
      assignee: r.fields.assignee || r.fields.Assignee || '',
    })),
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { stage, notes, next_action, stage_reason } = body

  const updates: Record<string, any> = {}
  if (stage) updates.Stage = stage
  if (notes !== undefined) updates.Notes = notes
  if (next_action) updates.Next_Action = next_action

  const updated = await atPatch(TBL_LEADS, id, updates)

  if (stage) {
    const ek = updated.fields?.Entity_Key || ''
    if (ek) {
      await atCreate(TBL_EVENTS, {
        entity_key: ek,
        entity_type: 'lead',
        entity_name: updated.fields?.Entity_Name || '',
        event_type: 'stage_change',
        description: `Stage → ${stage}${stage_reason ? ': ' + stage_reason : ''}`,
        actor: 'Maravilla Intelligence',
        source: 'lead_inbox',
      })
    }
  }

  return NextResponse.json({ ok: true, fields: updated.fields })
}
