/**
 * GET /api/leads — Paginated leads list from Leads table
 * Supports: ?stage=&limit=50&offset=0&sort=Priority_Score&dir=desc
 * Requires: Valid auth token
 */

import { NextResponse, NextRequest } from 'next/server'
import { credentials, airtableTables } from '@/app/lib/credentials'
import { authMiddleware } from '@/app/lib/auth-middleware'

const KEY  = credentials.airtableApiKey
const BASE = credentials.airtableBaseId
const TBL  = airtableTables.leads
const AT   = `https://api.airtable.com/v0/${BASE}`
const HDR  = () => ({ Authorization: `Bearer ${KEY}` })

async function handler(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const stage  = searchParams.get('stage') || ''
  const source = searchParams.get('source') || ''
  const scoreMin = searchParams.get('scoreMin') || ''
  const scoreMax = searchParams.get('scoreMax') || ''
  const hasContact = searchParams.get('hasContact') || ''
  const limit  = Math.min(Number(searchParams.get('limit') || 50), 100)
  const offset = searchParams.get('offset') || ''
  const sort   = searchParams.get('sort') || 'Priority_Score'
  const dir    = searchParams.get('dir') || 'desc'
  const search = searchParams.get('search') || searchParams.get('q') || ''

  const parts: string[] = [
    `pageSize=${limit}`,
    `sort[0][field]=${encodeURIComponent(sort)}`,
    `sort[0][direction]=${dir}`,
  ]

  const filters: string[] = []
  if (stage) filters.push(`{Stage}="${stage}"`)
  if (source) filters.push(`{Source}="${source}"`)
  if (scoreMin) filters.push(`{Priority_Score}>=${scoreMin}`)
  if (scoreMax) filters.push(`{Priority_Score}<=${scoreMax}`)
  if (hasContact === 'yes') filters.push(`{Has_Decision_Maker}=TRUE()`)
  if (hasContact === 'no') filters.push(`{Has_Decision_Maker}=FALSE()`)
  if (search) {
    const searchLower = search.toLowerCase()
    filters.push(`OR(SEARCH(LOWER("${searchLower}"),LOWER({Entity_Name}))>0,SEARCH(LOWER("${searchLower}"),LOWER({Agency}))>0,SEARCH(LOWER("${searchLower}"),LOWER({Location}))>0,SEARCH(LOWER("${searchLower}"),LOWER({NAICS_Codes}))>0)`)
  }
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

  const response = NextResponse.json({
    records,
    limit,
    offset:      data.offset || null,
    has_more:    !!data.offset,
  })
  response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600')
  return response
}

export async function GET(request: NextRequest) {
  // Check auth
  const authError = await authMiddleware(request)
  if (authError) {
    return authError
  }

  return handler(request)
}
