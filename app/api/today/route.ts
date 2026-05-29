/**
 * GET /api/today
 * Operational dashboard — answers "what do I need to do right now?"
 *
 * Returns:
 *   - leads_needing_action: leads with no open task or stage stuck
 *   - outreach_pending: outreach tasks due today or overdue
 *   - contracts_expiring: leads/contracts with expiry within 30 days
 *   - new_buyers: contacts added in last 7 days
 *   - emails_detected: Gmail signals from last 24h (if configured)
 *   - followups_due: tasks due today or overdue
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const KEY  = process.env.AIRTABLE_API_KEY!
const BASE = process.env.AIRTABLE_BASE_ID!
const AT   = `https://api.airtable.com/v0/${BASE}`
const HDR  = () => ({ Authorization: `Bearer ${KEY}` })

const TBL_LEADS   = 'tblja2oeA4oNEjioT'
const TBL_AVATARS = 'tblrIv6lKjsMeUcyU'
const TBL_TASKS   = 'tblrB7Cj84vLwI8tD'
const TBL_EVENTS  = 'tbl84x3ZGOIGf8bDA'

async function atQuery(table: string, formula: string, fields: string[], max = 50): Promise<any[]> {
  const params = new URLSearchParams({
    filterByFormula: formula,
    maxRecords: String(max),
    'sort[0][field]': fields[0] || 'Created_At',
    'sort[0][direction]': 'desc',
  })
  for (const f of fields) params.append('fields[]', f)
  const res = await fetch(`${AT}/${table}?${params}`, { headers: HDR(), cache: 'no-store' })
  if (!res.ok) return []
  const data = await res.json()
  return data.records || []
}

export async function GET() {
  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const thirtyDaysOut = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString()

  const [
    overdueTasksRaw,
    todayTasksRaw,
    newLeadsRaw,
    newBuyersRaw,
    emailEventsRaw,
    expiringRaw,
    stuckLeadsRaw,
  ] = await Promise.all([
    // Overdue open tasks
    atQuery(TBL_TASKS,
      `AND({Status}="Open",IS_BEFORE({Due_Date},"${today}"))`,
      ['Task', 'Due_Date', 'Priority', 'Entity_Name', 'Owner', 'Notes'], 30),

    // Tasks due today
    atQuery(TBL_TASKS,
      `AND({Status}="Open",{Due_Date}="${today}")`,
      ['Task', 'Due_Date', 'Priority', 'Entity_Name', 'Owner', 'Notes'], 20),

    // Leads created in last 7 days (use CREATED_TIME since Signal_Date may be empty on new records)
    atQuery(TBL_LEADS,
      `AND(IS_AFTER(CREATED_TIME(),"${sevenDaysAgo}T00:00:00.000Z"),{Stage}="New Signal")`,
      ['Entity_Name', 'Source', 'Priority_Score', 'Agency', 'Stage', 'Deadline'], 20),

    // New buyers (avatars added last 7 days — Avatars has no Created_At, use CREATED_TIME)
    atQuery(TBL_AVATARS,
      `IS_AFTER(CREATED_TIME(),"${sevenDaysAgo}T00:00:00.000Z")`,
      ['Name', 'Title', 'Email', 'Organization', 'Source', 'Last_Seen'], 15),

    // Gmail email signals from last 24h
    atQuery(TBL_EVENTS,
      `AND({Event_Type}="email_signal_detected",IS_AFTER({Timestamp},"${oneDayAgo}"))`,
      ['Entity_Name', 'Description', 'Timestamp'], 10),

    // Leads with expiring deadlines (within 30 days) — field is Deadline not Response_Deadline
    atQuery(TBL_LEADS,
      `AND(NOT({Stage}="Won"),NOT({Stage}="Lost"),IS_BEFORE({Deadline},"${thirtyDaysOut}"),IS_AFTER({Deadline},"${today}"))`,
      ['Entity_Name', 'Deadline', 'Priority_Score', 'Agency', 'Stage'], 20),

    // Leads stuck in same stage for too long — use Signal_Date as activity proxy
    atQuery(TBL_LEADS,
      `OR({Stage}="In Conversation",{Stage}="Outreach Ready")`,
      ['Entity_Name', 'Stage', 'Priority_Score', 'Signal_Date', 'Decision_Maker_Email'], 30),
  ])

  // Mark stuck leads (no activity in 7+ days, using Signal_Date as proxy)
  const stuckLeads = stuckLeadsRaw.filter((r: any) => {
    const lastSeen = r.fields.Signal_Date
    if (!lastSeen) return true
    const daysSince = Math.round((Date.now() - new Date(lastSeen).getTime()) / 86400000)
    return daysSince >= 7
  })

  const allTasksDue = [
    ...overdueTasksRaw.map((r: any) => ({ ...r.fields, id: r.id, status: 'overdue' })),
    ...todayTasksRaw.map((r: any) => ({ ...r.fields, id: r.id, status: 'due_today' })),
  ].sort((a, b) => {
    if (a.status === 'overdue' && b.status !== 'overdue') return -1
    if (a.status !== 'overdue' && b.status === 'overdue') return 1
    const pa = a.Priority === 'High' ? 0 : a.Priority === 'Medium' ? 1 : 2
    const pb = b.Priority === 'High' ? 0 : b.Priority === 'Medium' ? 1 : 2
    return pa - pb
  })

  const summary = {
    attention_needed: overdueTasksRaw.length + stuckLeads.length,
    overdue_tasks: overdueTasksRaw.length,
    due_today: todayTasksRaw.length,
    new_leads_7d: newLeadsRaw.length,
    new_buyers_7d: newBuyersRaw.length,
    email_signals_24h: emailEventsRaw.length,
    contracts_expiring_30d: expiringRaw.length,
    stuck_leads: stuckLeads.length,
  }

  return NextResponse.json({
    date: today,
    summary,
    tasks_due: allTasksDue,
    new_leads: newLeadsRaw.map((r: any) => ({ id: r.id, ...r.fields })),
    new_buyers: newBuyersRaw.map((r: any) => ({ id: r.id, ...r.fields })),
    email_signals: emailEventsRaw.map((r: any) => ({ id: r.id, ...r.fields })),
    contracts_expiring: expiringRaw.map((r: any) => ({ id: r.id, ...r.fields })),
    stuck_leads: stuckLeads.map((r: any) => ({
      id: r.id,
      ...r.fields,
      days_since_activity: r.fields.Signal_Date
        ? Math.round((Date.now() - new Date(r.fields.Signal_Date).getTime()) / 86400000)
        : null,
    })),
  })
}
