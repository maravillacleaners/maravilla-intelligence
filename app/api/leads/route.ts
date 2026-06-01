/**
 * GET /api/leads — Paginated leads list from Leads table
 * Supports: ?stage=&limit=50&offset=0&sort=Priority_Score&dir=desc
 */

import { NextResponse } from 'next/server'

const KEY  = process.env.AIRTABLE_API_KEY!
const BASE = process.env.AIRTABLE_BASE_ID!
const TBL  = 'tblja2oeA4oNEjioT'
const AT   = `https://api.airtable.com/v0/${BASE}`
const HDR  = () => ({ Authorization: `Bearer ${KEY}` })

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const stage  = searchParams.get('stage') || ''
  const source = searchParams.get('source') || ''
  const limit  = Math.min(Number(searchParams.get('limit') || 50), 100)
  const offset = searchParams.get('offset') || ''
  const sort   = searchParams.get('sort') || 'Priority_Score'
  const dir    = searchParams.get('dir') || 'desc'
  const q      = searchParams.get('q') || ''

  const parts: string[] = [
    `pageSize=${limit}`,
    `sort[0][field]=${encodeURIComponent(sort)}`,
    `sort[0][direction]=${dir}`,
  ]

  const filters: string[] = []
  if (stage) filters.push(`{Stage}="${stage}"`)
  if (source) filters.push(`{Source}="${source}"`)
  if (q)     filters.push(`OR(SEARCH(LOWER("${q.toLowerCase()}"),LOWER({Entity_Name}))>0,SEARCH(LOWER("${q.toLowerCase()}"),LOWER({Agency}))>0)`)
  if (filters.length) parts.push(`filterByFormula=${encodeURIComponent(`AND(${filters.join(',')})`)}`)
  if (offset) parts.push(`offset=${encodeURIComponent(offset)}`)

  const res  = await fetch(`${AT}/${TBL}?${parts.join('&')}`, { headers: HDR() })
  const data = await res.json()

  if (!res.ok) {
    return NextResponse.json({ error: data.error?.message || 'Airtable error' }, { status: 500 })
  }

  const records = (data.records || []).map((r: any) => ({
    id:              r.id,
    entity_key:      r.fields.Entity_Key      || '',
    entity_name:     r.fields.Entity_Name     || '',
    lead_type:       r.fields.Lead_Type       || '',
    stage:           r.fields.Stage           || 'New Signal',
    priority_score:  r.fields.Priority_Score  || 0,
    govcon_fit:      r.fields.GovCon_Fit      || 0,
    commercial_fit:  r.fields.Commercial_Fit  || 0,
    source:          r.fields.Source          || '',
    agency:          r.fields.Agency          || '',
    naics:           r.fields.NAICS           || '',
    location:        r.fields.Location        || '',
    value:           r.fields.Value           || 0,
    contactable:     !!(r.fields.Contactable),
    has_decision_maker: !!(r.fields.Has_Decision_Maker),
    decision_maker_name:  r.fields.Decision_Maker_Name  || '',
    decision_maker_email: r.fields.Decision_Maker_Email || '',
    enrichment_needed: !!(r.fields.Enrichment_Needed),
    signal_date:     r.fields.Signal_Date || '',
    created_time:    r.createdTime,
  }))

  return NextResponse.json({
    records,
    limit,
    offset:      data.offset || null,
    has_more:    !!data.offset,
  })
}
