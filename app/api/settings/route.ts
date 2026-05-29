/**
 * GET  /api/settings        — All settings from Config table
 * POST /api/settings        — Upsert a setting (key/value)
 * GET  /api/settings/users  — All users
 * POST /api/settings/users  — Create/update user
 */

import { NextResponse } from 'next/server'

const KEY = process.env.AIRTABLE_API_KEY!
const BASE = process.env.AIRTABLE_BASE_ID!
const AT = `https://api.airtable.com/v0/${BASE}`
const HDR = () => ({ Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' })

let CONFIG_TBL = ''
let USERS_TBL = ''

async function getTableIds() {
  if (CONFIG_TBL && USERS_TBL) return
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, { headers: HDR() })
  const data = await res.json()
  for (const t of data.tables || []) {
    if (t.name === 'Config') CONFIG_TBL = t.id
    if (t.name === 'Users') USERS_TBL = t.id
  }
}

async function atFetch(tbl: string, formula?: string): Promise<any[]> {
  const parts = ['pageSize=100']
  if (formula) parts.push(`filterByFormula=${encodeURIComponent(formula)}`)
  const res = await fetch(`${AT}/${tbl}?${parts.join('&')}`, { headers: HDR() })
  const data = await res.json()
  return data.records || []
}

async function atUpsert(tbl: string, formula: string, fields: Record<string, any>): Promise<any> {
  const existing = await atFetch(tbl, formula)
  if (existing.length > 0) {
    const res = await fetch(`${AT}/${tbl}/${existing[0].id}`, {
      method: 'PATCH', headers: HDR(),
      body: JSON.stringify({ fields, typecast: true }),
    })
    return res.json()
  }
  const res = await fetch(`${AT}/${tbl}`, {
    method: 'POST', headers: HDR(),
    body: JSON.stringify({ fields: { ...fields, Created_At: new Date().toISOString() }, typecast: true }),
  })
  return res.json()
}

export async function GET(request: Request) {
  await getTableIds()
  if (!CONFIG_TBL) return NextResponse.json({ error: 'Config table not found' }, { status: 500 })

  const records = await atFetch(CONFIG_TBL)
  const settings: Record<string, any> = {}
  for (const r of records) {
    const f = r.fields
    const key = f.Key || ''
    // Mask API keys in response
    const value = (f.Type === 'api_key' || key.toLowerCase().includes('secret') || key.toLowerCase().includes('token'))
      ? (f.Value ? '••••••••' + (f.Value.slice(-4) || '') : '')
      : (f.Value || '')
    settings[key] = { value, type: f.Type, description: f.Description, enabled: f.Enabled, id: r.id }
  }

  // Also include env vars (as read-only indicators)
  const env_keys = ['SAM_GOV_API_KEY', 'HIGHERGOV_API_KEY', 'HUNTER_API_KEY', 'APOLLO_API_KEY',
    'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SMTP_HOST', 'SMTP_USER']
  for (const k of env_keys) {
    if (process.env[k] && !settings[k]) {
      settings[k] = { value: '••••••••', type: 'api_key', description: 'Set via environment variable', enabled: true, source: 'env' }
    }
  }

  return NextResponse.json({ settings, count: records.length })
}

export async function POST(request: Request) {
  await getTableIds()
  if (!CONFIG_TBL) return NextResponse.json({ error: 'Config table not found' }, { status: 500 })

  const body = await request.json()
  const { key, value, type = 'config', description = '', enabled = true } = body

  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

  const result = await atUpsert(
    CONFIG_TBL,
    `{Key}="${key}"`,
    { Key: key, Value: value, Type: type, Description: description, Enabled: enabled, Updated_At: new Date().toISOString() }
  )

  return NextResponse.json({ ok: true, id: result.id })
}
