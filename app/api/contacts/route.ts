/**
 * GET /api/contacts
 * Lists contacts (Avatars table) with filters: source, avatar_type, status, q
 * POST /api/contacts
 * Creates a new contact manually
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const KEY  = process.env.AIRTABLE_API_KEY!
const BASE = process.env.AIRTABLE_BASE_ID!
const TBL  = 'tblrIv6lKjsMeUcyU'
const AT   = `https://api.airtable.com/v0/${BASE}`
const HDR  = () => ({ Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' })

function mapContact(r: any) {
  const f = r.fields || {}
  return {
    id: r.id,
    name:                  f['Name']                  || f['Full_Name']            || '',
    title:                 f['Title']                 || '',
    email:                 f['Email']                 || '',
    phone:                 f['Phone']                 || '',
    organization:          f['Organization']          || f['Agency']               || '',
    avatar_type:           f['Avatar_Type']           || '',
    decision_role:         f['Decision_Role']         || '',
    influence_score:       f['Influence_Score']       || 0,
    relevance_score:       f['Relevance_Score']       || 0,
    source:                f['Source']                || '',
    status:                f['Status']                || 'Active',
    outreach_status:       f['Outreach_Status']       || '',
    linkedin_url:          f['LinkedIn_URL']          || '',
    entity_key:            f['Entity_Key']            || '',
    entity_name:           f['Entity_Name']           || f['Organization']         || '',
    entity_type:           f['Entity_Type']           || '',
    notes:                 f['Notes']                 || '',
    last_seen:             f['Last_Seen']             || '',
    geographic_jurisdiction: f['Geographic_Jurisdiction'] || '',
    procurement_categories:  f['Procurement_Categories']  || '',
    confidence:            f['Confidence']            || '',
    created_time:          r.createdTime              || '',
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q           = searchParams.get('q') || ''
  const source      = searchParams.get('source') || ''
  const avatarType  = searchParams.get('avatar_type') || ''
  const status      = searchParams.get('status') || ''
  const limit       = Math.min(parseInt(searchParams.get('limit') || '100'), 200)

  const formulas: string[] = []
  if (q) formulas.push(`OR(SEARCH(LOWER("${q}"),LOWER({Name})),SEARCH(LOWER("${q}"),LOWER({Organization})),SEARCH(LOWER("${q}"),LOWER({Email})))`)
  if (source) formulas.push(`{Source}="${source}"`)
  if (avatarType) formulas.push(`{Avatar_Type}="${avatarType}"`)
  if (status) formulas.push(`{Status}="${status}"`)

  const formula = formulas.length === 0 ? '' : formulas.length === 1 ? formulas[0] : `AND(${formulas.join(',')})`

  const params = new URLSearchParams({
    'sort[0][field]': 'Last_Seen',
    'sort[0][direction]': 'desc',
    maxRecords: String(limit),
  })
  if (formula) params.set('filterByFormula', formula)

  try {
    const res = await fetch(`${AT}/${TBL}?${params}`, { headers: HDR(), cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status })
    const data = await res.json()
    const contacts = (data.records || []).map(mapContact)

    const srcCounts: Record<string, number> = {}
    const typeCounts: Record<string, number> = {}
    contacts.forEach((c: any) => {
      srcCounts[c.source || 'unknown'] = (srcCounts[c.source || 'unknown'] || 0) + 1
      typeCounts[c.avatar_type || 'unknown'] = (typeCounts[c.avatar_type || 'unknown'] || 0) + 1
    })

    return NextResponse.json({ contacts, total: contacts.length, source_counts: srcCounts, type_counts: typeCounts })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { name, email, title, organization, avatar_type, source, entity_key, entity_name, notes } = body
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const fields: Record<string, any> = {
    Name: name,
    Status: 'Active',
    Source: source || 'manual',
    Entity_Key: entity_key || `company:${(organization || name).toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 60)}`,
  }
  if (email) fields['Email'] = email
  if (title) fields['Title'] = title
  if (organization) fields['Organization'] = organization
  if (avatar_type) fields['Avatar_Type'] = avatar_type
  if (entity_name) fields['Entity_Name'] = entity_name
  if (notes) fields['Notes'] = notes

  try {
    const res = await fetch(`${AT}/${TBL}`, {
      method: 'POST', headers: HDR(),
      body: JSON.stringify({ fields, typecast: true }),
    })
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status })
    const rec = await res.json()
    return NextResponse.json({ contact: mapContact(rec) }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
