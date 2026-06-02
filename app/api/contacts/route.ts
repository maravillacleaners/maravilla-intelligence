/**
 * GET /api/contacts
 * Lists contacts (Avatars table) with filters: source, avatar_type, status, q
 * POST /api/contacts
 * Creates a new contact manually
 * Requires: Valid auth token
 */
import { NextRequest, NextResponse } from 'next/server'
import { credentials, airtableTables } from '@/app/lib/credentials'
import { authMiddleware } from '@/app/lib/auth-middleware'

export const dynamic = 'force-dynamic'

const KEY  = credentials.airtableApiKey
const BASE = credentials.airtableBaseId
const TBL  = airtableTables.contacts
const AT   = `https://api.airtable.com/v0/${BASE}`
const HDR  = () => ({ Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' })

function mapContact(r: any, matchScore?: number) {
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
    match_score:           matchScore ?? 0,
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

async function getHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search      = searchParams.get('search') || searchParams.get('q') || ''
  const source      = searchParams.get('source') || ''
  const avatarType  = searchParams.get('avatar_type') || ''
  const status      = searchParams.get('status') || ''
  const minInfluence = searchParams.get('minInfluence') || ''
  const hasEmail = searchParams.get('hasEmail') || ''
  const limit       = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const offset      = parseInt(searchParams.get('offset') || '0', 10)

  const formulas: string[] = []
  if (search) {
    const searchLower = search.toLowerCase()
    formulas.push(`OR(SEARCH(LOWER("${searchLower}"),LOWER({Name})),SEARCH(LOWER("${searchLower}"),LOWER({Organization})),SEARCH(LOWER("${searchLower}"),LOWER({Email})))`)
  }
  if (source) formulas.push(`{Source}="${source}"`)
  if (avatarType) formulas.push(`{Avatar_Type}="${avatarType}"`)
  if (status) formulas.push(`{Status}="${status}"`)
  if (minInfluence) formulas.push(`{Influence_Score}>=${minInfluence}`)
  if (hasEmail === 'yes') formulas.push(`{Email}!=""`)
  if (hasEmail === 'no') formulas.push(`{Email}=""`)

  const formula = formulas.length === 0 ? '' : formulas.length === 1 ? formulas[0] : `AND(${formulas.join(',')})`

  const params = new URLSearchParams({
    'sort[0][field]': 'Last_Seen',
    'sort[0][direction]': 'desc',
    pageSize: String(limit),
  })
  if (offset > 0) {
    params.set('offset', String(offset))
  }
  if (formula) params.set('filterByFormula', formula)

  try {
    // Fetch contacts
    const res = await fetch(`${AT}/${TBL}?${params}`, { headers: HDR(), cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status })
    const data = await res.json()

    // Fetch opportunities to get agency names for match_score computation
    const oppParams = new URLSearchParams({
      fields: 'agency',
      pageSize: '50',
    })
    let agencies: string[] = []
    try {
      const oppRes = await fetch(`${AT}/${airtableTables.opportunities}?${oppParams}`, { headers: HDR(), cache: 'no-store' })
      if (oppRes.ok) {
        const oppData = await oppRes.json()
        agencies = (oppData.records || [])
          .map((r: any) => (r.fields?.agency || '').toLowerCase())
          .filter((a: string) => a.length > 0)
      }
    } catch (err) {
      console.warn('Failed to fetch opportunities for match scoring:', err)
    }

    // Compute match_score for each contact
    const contacts = (data.records || []).map((r: any) => {
      let score = 0
      const contact = mapContact(r)

      // +50 if organization matches any opportunity agency
      const contactOrg = (contact.organization || '').toLowerCase()
      if (contactOrg && agencies.some(a => a.includes(contactOrg) || contactOrg.includes(a))) {
        score += 50
      }

      // +30 if decision_role is in key roles
      const keyRoles = ['contracting_officer', 'facilities_manager', 'government_buyer', 'prime_bd']
      if (contact.decision_role && keyRoles.some(r => contact.decision_role.toLowerCase().includes(r))) {
        score += 30
      }

      // Normalize to 0-100
      const matchScore = Math.min(Math.round((score / 80) * 100), 100)
      contact.match_score = matchScore
      return contact
    })

    // Sort by match_score descending
    contacts.sort((a: any, b: any) => (b.match_score || 0) - (a.match_score || 0))

    const srcCounts: Record<string, number> = {}
    const typeCounts: Record<string, number> = {}
    contacts.forEach((c: any) => {
      srcCounts[c.source || 'unknown'] = (srcCounts[c.source || 'unknown'] || 0) + 1
      typeCounts[c.avatar_type || 'unknown'] = (typeCounts[c.avatar_type || 'unknown'] || 0) + 1
    })

    const response = NextResponse.json({ contacts, total: contacts.length, source_counts: srcCounts, type_counts: typeCounts })
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600')
    return response
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  // Check auth
  const authError = await authMiddleware(req)
  if (authError) {
    return authError
  }

  return getHandler(req)
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
