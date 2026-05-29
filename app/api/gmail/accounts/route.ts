/**
 * GET  /api/gmail/accounts     — List all Gmail-connected accounts
 * POST /api/gmail/accounts     — Add/connect new account (returns OAuth URL)
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const KEY  = process.env.AIRTABLE_API_KEY!
const BASE = process.env.AIRTABLE_BASE_ID!
const AT   = `https://api.airtable.com/v0/${BASE}`
const HDR  = () => ({ Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' })

async function getUsersTableId(): Promise<string> {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, { headers: HDR() })
  const data = await res.json()
  return (data.tables || []).find((t: any) => t.name === 'Users')?.id || ''
}

function parseConfig(notes: string): Record<string, any> {
  if (!notes) return { role: 'secondary', auto_sync: true, create_leads: true, create_tasks: true }
  try {
    const json = notes.match(/\{.*\}/s)?.[0]
    return json ? JSON.parse(json) : { role: 'secondary', auto_sync: true, create_leads: true, create_tasks: true }
  } catch {
    return { role: 'secondary', auto_sync: true, create_leads: true, create_tasks: true }
  }
}

function mapUser(r: any) {
  const f = r.fields || {}
  const cfg = parseConfig(f['Notes'] || '')
  return {
    id: r.id,
    name: f['Name'] || '',
    email: f['Google_Email'] || f['Email'] || '',
    connected: !!f['Google_Connected'],
    active: !!f['Active'],
    last_sync: f['Gmail_Last_Sync'] || null,
    has_token: !!f['Google_Access_Token'],
    has_refresh: !!f['Google_Refresh_Token'],
    token_expiry: f['Google_Token_Expiry'] || null,
    role: cfg.role || 'secondary',
    auto_sync: cfg.auto_sync !== false,
    create_leads: cfg.create_leads !== false,
    create_tasks: cfg.create_tasks !== false,
    access_token: f['Google_Access_Token'] || '',
    refresh_token: f['Google_Refresh_Token'] || '',
  }
}

export async function GET() {
  try {
    const tbl = await getUsersTableId()
    if (!tbl) return NextResponse.json({ accounts: [] })

    const formula = encodeURIComponent('{Google_Connected}=1')
    const res = await fetch(`${AT}/${tbl}?filterByFormula=${formula}&maxRecords=20`, {
      headers: HDR(), cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json({ accounts: [] })
    const data = await res.json()
    const accounts = (data.records || []).map(mapUser)

    // Also include primary from .env if not in Users table
    const envToken = process.env.GOOGLE_GMAIL_TOKEN
    const envEmail = process.env.GMAIL_IMPERSONATE_EMAIL || 'hello@maravillacleaners.com'
    if (envToken && !accounts.find(a => a.email === envEmail)) {
      accounts.unshift({
        id: '__env__',
        name: envEmail.split('@')[0],
        email: envEmail,
        connected: true,
        active: true,
        last_sync: null,
        has_token: true,
        has_refresh: !!process.env.GOOGLE_REFRESH_TOKEN,
        token_expiry: process.env.GOOGLE_TOKEN_EXPIRY || null,
        role: 'primary',
        auto_sync: true,
        create_leads: true,
        create_tasks: true,
        access_token: envToken,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN || '',
      })
    }

    return NextResponse.json({ accounts, total: accounts.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, accounts: [] }, { status: 500 })
  }
}
