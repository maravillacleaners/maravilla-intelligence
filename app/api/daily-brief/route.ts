/**
 * GET /api/daily-brief — Aggregated intelligence brief
 *
 * Returns:
 *  - new_leads: leads created or updated in last 24h
 *  - contactable: leads with email, not yet Won/Lost
 *  - enrichment_needed: top priority leads needing contact search
 *  - high_priority: score >= 70, active
 *  - new_avatars: avatars added/seen in last 7 days
 *  - tasks_due: tasks with Due_Date <= today, Status=Open
 *  - last_run: most recent daily pipeline run
 *  - stats: counts summary
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

async function atFetch(table: string, parts: string[]): Promise<any[]> {
  const url = `${AT}/${table}?${parts.join('&')}`
  const res = await fetch(url, { headers: HDR() })
  if (!res.ok) return []
  const data = await res.json()
  return data.records || []
}

export async function GET() {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const week_ago = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const [
    newLeads,
    contactable,
    enrichmentNeeded,
    highPriority,
    newAvatars,
    tasksDue,
    lastRuns,
    recentEvents,
  ] = await Promise.all([
    // New leads: Signal_Date >= yesterday
    atFetch(TBL_LEADS, [
      `filterByFormula=${encodeURIComponent(`{Signal_Date}>="${yesterday}"`)}`,
      `sort%5B0%5D%5Bfield%5D=Priority_Score&sort%5B0%5D%5Bdirection%5D=desc`,
      `maxRecords=20`,
    ]),

    // Contactable: has email, active stage
    atFetch(TBL_LEADS, [
      `filterByFormula=${encodeURIComponent(`AND({Contactable}=1,NOT(OR({Stage}="Won",{Stage}="Lost")))`)}`,
      `sort%5B0%5D%5Bfield%5D=Priority_Score&sort%5B0%5D%5Bdirection%5D=desc`,
      `maxRecords=10`,
    ]),

    // Enrichment needed: priority sorted
    atFetch(TBL_LEADS, [
      `filterByFormula=${encodeURIComponent(`AND({Enrichment_Needed}=1,NOT(OR({Stage}="Won",{Stage}="Lost",{Stage}="Monitor")))`)}`,
      `sort%5B0%5D%5Bfield%5D=Priority_Score&sort%5B0%5D%5Bdirection%5D=desc`,
      `maxRecords=10`,
    ]),

    // High priority: score >= 70, active
    atFetch(TBL_LEADS, [
      `filterByFormula=${encodeURIComponent(`AND({Priority_Score}>=70,NOT(OR({Stage}="Won",{Stage}="Lost")))`)}`,
      `sort%5B0%5D%5Bfield%5D=Priority_Score&sort%5B0%5D%5Bdirection%5D=desc`,
      `maxRecords=10`,
    ]),

    // New avatars: last 7 days
    atFetch(TBL_AVATARS, [
      `filterByFormula=${encodeURIComponent(`{Last_Seen}>="${week_ago}"`)}`,
      `sort%5B0%5D%5Bfield%5D=Relevance_Score&sort%5B0%5D%5Bdirection%5D=desc`,
      `maxRecords=10`,
    ]),

    // Tasks due today or overdue
    atFetch(TBL_TASKS, [
      `filterByFormula=${encodeURIComponent(`AND({Status}="Open",{Due_Date}<="${today}")`)}`,
      `sort%5B0%5D%5Bfield%5D=Priority&sort%5B0%5D%5Bdirection%5D=desc`,
      `maxRecords=20`,
    ]),

    // Last pipeline runs
    atFetch(TBL_EVENTS, [
      `filterByFormula=${encodeURIComponent(`{Event_Type}="daily_run"`)}`,
      `sort%5B0%5D%5Bfield%5D=Timestamp&sort%5B0%5D%5Bdirection%5D=desc`,
      `maxRecords=3`,
    ]),

    // Recent events (last 24h)
    atFetch(TBL_EVENTS, [
      `filterByFormula=${encodeURIComponent(`{Timestamp}>="${yesterday}T00:00:00.000Z"`)}`,
      `sort%5B0%5D%5Bfield%5D=Timestamp&sort%5B0%5D%5Bdirection%5D=desc`,
      `maxRecords=20`,
    ]),
  ])

  const mapLead = (r: any) => ({
    id: r.id,
    entity_name: r.fields.Entity_Name || '',
    lead_type: r.fields.Lead_Type || '',
    stage: r.fields.Stage || '',
    priority_score: r.fields.Priority_Score || 0,
    commercial_fit: r.fields.Commercial_Fit || 0,
    govcon_fit: r.fields.GovCon_Fit || 0,
    value: r.fields.Value || 0,
    location: r.fields.Location || '',
    naics: r.fields.NAICS || '',
    agency: r.fields.Agency || '',
    decision_maker_name: r.fields.Decision_Maker_Name || '',
    decision_maker_email: r.fields.Decision_Maker_Email || '',
    source: r.fields.Source || '',
    signal_date: r.fields.Signal_Date || '',
    contactable: !!(r.fields.Contactable),
    enrichment_needed: !!(r.fields.Enrichment_Needed),
    relevance_tier: r.fields.Relevance_Tier || 'target',
    award_count: r.fields.Award_Count || 1,
  })

  const mapAvatar = (r: any) => ({
    id: r.id,
    name: r.fields.Name || '',
    title: r.fields.Title || '',
    avatar_type: r.fields.Avatar_Type || '',
    organization: r.fields.Organization || '',
    email: r.fields.Email || '',
    influence_score: r.fields.Influence_Score || 0,
    relevance_score: r.fields.Relevance_Score || 0,
    last_seen: r.fields.Last_Seen || '',
    outreach_status: r.fields.Outreach_Status || 'not_contacted',
  })

  const mapTask = (r: any) => ({
    id: r.id,
    task: r.fields.Task || '',
    status: r.fields.Status || '',
    priority: r.fields.Priority || '',
    due_date: r.fields.Due_Date || '',
    entity_name: r.fields.Entity_Name || '',
    entity_key: r.fields.Entity_Key || '',
    entity_url: r.fields.Entity_URL || '',
    notes: r.fields.Notes || '',
    overdue: r.fields.Due_Date ? r.fields.Due_Date < today : false,
  })

  const mapEvent = (r: any) => ({
    id: r.id,
    event_type: r.fields.Event_Type || '',
    description: r.fields.Description || '',
    entity_name: r.fields.Entity_Name || '',
    timestamp: r.fields.Timestamp || r.createdTime,
    source: r.fields.Source || '',
  })

  // GovCon vs commercial split for high priority
  const govcon_leads = highPriority.filter(r => (r.fields.GovCon_Fit || 0) >= (r.fields.Commercial_Fit || 0))
  const commercial_leads = highPriority.filter(r => (r.fields.Commercial_Fit || 0) > (r.fields.GovCon_Fit || 0))

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    date: today,

    new_leads: newLeads.map(mapLead),
    contactable: contactable.map(mapLead),
    enrichment_needed: enrichmentNeeded.map(mapLead),
    top_govcon: govcon_leads.slice(0, 5).map(mapLead),
    top_commercial: commercial_leads.slice(0, 5).map(mapLead),
    new_avatars: newAvatars.map(mapAvatar),
    tasks_due: tasksDue.map(mapTask),
    recent_events: recentEvents.filter(r => r.fields.Event_Type !== 'daily_run').slice(0, 10).map(mapEvent),
    last_run: lastRuns[0] ? mapEvent(lastRuns[0]) : null,

    stats: {
      new_leads_24h: newLeads.length,
      contactable_total: contactable.length,
      enrichment_needed_total: enrichmentNeeded.length,
      high_priority_total: highPriority.length,
      tasks_due_today: tasksDue.length,
      overdue_tasks: tasksDue.filter(r => r.fields.Due_Date < today).length,
      new_avatars_7d: newAvatars.length,
      events_24h: recentEvents.length,
    },
  })
}
