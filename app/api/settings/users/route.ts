import { NextResponse } from 'next/server'

const KEY = process.env.AIRTABLE_API_KEY!
const BASE = process.env.AIRTABLE_BASE_ID!
const AT = `https://api.airtable.com/v0/${BASE}`
const HDR = () => ({ Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' })

let USERS_TBL = ''

async function getUsersTbl() {
  if (USERS_TBL) return USERS_TBL
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, { headers: HDR() })
  const data = await res.json()
  USERS_TBL = (data.tables || []).find((t: any) => t.name === 'Users')?.id || ''
  return USERS_TBL
}

async function atFetch(formula?: string): Promise<any[]> {
  const tbl = await getUsersTbl()
  if (!tbl) return []
  const parts = ['pageSize=100']
  if (formula) parts.push(`filterByFormula=${encodeURIComponent(formula)}`)
  const res = await fetch(`${AT}/${tbl}?${parts.join('&')}`, { headers: HDR() })
  const data = await res.json()
  return data.records || []
}

function mapUser(r: any) {
  const f = r.fields
  return {
    id: r.id,
    name: f.Name || '',
    email: f.Email || '',
    role: f.Role || 'sales',
    active: !!f.Active,
    google_connected: !!f.Google_Connected,
    google_email: f.Google_Email || '',
    gmail_last_sync: f.Gmail_Last_Sync || '',
    calendar_last_sync: f.Calendar_Last_Sync || '',
    created_at: f.Created_At || r.createdTime,
    // Never expose tokens
    has_refresh_token: !!f.Google_Refresh_Token,
  }
}

export async function GET() {
  const records = await atFetch()
  return NextResponse.json({ users: records.map(mapUser) })
}

export async function POST(request: Request) {
  const tbl = await getUsersTbl()
  if (!tbl) return NextResponse.json({ error: 'Users table not found' }, { status: 500 })
  const body = await request.json()
  const { name, email, role = 'sales' } = body
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  // Check if exists
  const existing = await atFetch(`{Email}="${email}"`)
  if (existing.length > 0) {
    return NextResponse.json({ ok: true, user: mapUser(existing[0]), created: false })
  }

  const res = await fetch(`${AT}/${tbl}`, {
    method: 'POST', headers: HDR(),
    body: JSON.stringify({ fields: { Name: name, Email: email, Role: role, Active: true, Created_At: new Date().toISOString() }, typecast: true }),
  })
  const rec = await res.json()
  return NextResponse.json({ ok: true, user: mapUser(rec), created: true })
}
