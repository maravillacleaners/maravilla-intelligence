/**
 * GET   /api/leads/[id]  — Lead detail with score breakdown + related contacts + opportunities
 * PATCH /api/leads/[id]  — Update stage, notes, next_action
 */

import { NextRequest, NextResponse } from 'next/server'
import { credentials, airtableTables } from '@/app/lib/credentials'
import { authMiddleware } from '@/app/lib/auth-middleware'
import { computeLeadScore } from '@/app/lib/scoring'

const KEY = credentials.airtableApiKey
const BASE = credentials.airtableBaseId
const TBL_LEADS = airtableTables.leads
const TBL_CONTACTS = airtableTables.contacts
const TBL_OPPORTUNITIES = airtableTables.opportunities

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
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check auth
  const authError = await authMiddleware(req)
  if (authError) {
    return authError
  }

  const { id } = params
  const lead = await atGet(TBL_LEADS, id)

  if (lead.error) {
    return NextResponse.json({ error: lead.error?.message || 'Not found' }, { status: 404 })
  }

  const f = lead.fields || {}

  // Compute score breakdown
  const scoreBreakdown = computeLeadScore(f)

  // Fetch related contacts
  let relatedContacts: any[] = []
  if (TBL_CONTACTS) {
    try {
      const contactsRes = await fetch(
        `${AT}/${TBL_CONTACTS}?filterByFormula=${encodeURIComponent(`{Lead_ID}='${id}'`)}&maxRecords=100`,
        { headers: HDR() }
      )
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json()
        relatedContacts = (contactsData.records || []).map((r: any) => ({
          id: r.id,
          ...r.fields,
        }))
      }
    } catch (err) {
      console.warn('Failed to fetch related contacts:', err)
    }
  }

  // Fetch related opportunities
  let relatedOpportunities: any[] = []
  if (TBL_OPPORTUNITIES) {
    try {
      const oppRes = await fetch(
        `${AT}/${TBL_OPPORTUNITIES}?filterByFormula=${encodeURIComponent(`{Lead_ID}='${id}'`)}&maxRecords=100`,
        { headers: HDR() }
      )
      if (oppRes.ok) {
        const oppData = await oppRes.json()
        relatedOpportunities = (oppData.records || []).map((r: any) => ({
          id: r.id,
          ...r.fields,
        }))
      }
    } catch (err) {
      console.warn('Failed to fetch related opportunities:', err)
    }
  }

  return NextResponse.json({
    id,
    lead: {
      entity_name: f.Entity_Name || '',
      stage: f.Stage || 'New Signal',
      priority_score: f.Priority_Score || scoreBreakdown.total,
      source: f.Source || '',
      value: f.Value || 0,
      location: f.Location || '',
      naics_codes: f.NAICS_Codes || '',
      agency_name: f.Agency_Name || '',
      description: f.Description || '',
      signal_date: f.Signal_Date || '',
      next_action: f.Next_Action || '',
      has_decision_maker: f.Has_Decision_Maker || false,
      decision_maker_name: f.Decision_Maker_Name || '',
      decision_maker_email: f.Decision_Maker_Email || '',
      decision_maker_phone: f.Decision_Maker_Phone || '',
      notes: f.Notes || '',
    },
    scoreBreakdown,
    relatedContacts,
    relatedOpportunities,
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check auth
  const authError = await authMiddleware(req)
  if (authError) {
    return authError
  }

  const { id } = params
  const body = await req.json()
  const { stage, notes, next_action } = body

  const updates: Record<string, any> = {}
  if (stage) updates.Stage = stage
  if (notes !== undefined) updates.Notes = notes
  if (next_action) updates.Next_Action = next_action

  const updated = await atPatch(TBL_LEADS, id, updates)

  return NextResponse.json({ ok: true, fields: updated.fields })
}
