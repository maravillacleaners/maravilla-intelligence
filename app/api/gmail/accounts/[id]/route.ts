/**
 * PATCH /api/gmail/accounts/[id]   — Update account config (role, permissions)
 * DELETE /api/gmail/accounts/[id]  — Disconnect account (clear tokens)
 */
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const KEY  = process.env.AIRTABLE_API_KEY!
const BASE = process.env.AIRTABLE_BASE_ID!
const AT   = `https://api.airtable.com/v0/${BASE}`
const HDR  = () => ({ Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' })
const ENV_PATH = path.join(process.cwd(), '.env')

async function getUsersTableId(): Promise<string> {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, { headers: HDR() })
  const data = await res.json()
  return (data.tables || []).find((t: any) => t.name === 'Users')?.id || ''
}

function buildNotesJson(existing: string, update: Record<string, any>): string {
  let cfg: Record<string, any> = { role: 'secondary', auto_sync: true, create_leads: true, create_tasks: true }
  if (existing) {
    try {
      const m = existing.match(/\{.*\}/s)
      if (m) cfg = { ...cfg, ...JSON.parse(m[0]) }
    } catch { /* ignore */ }
  }
  cfg = { ...cfg, ...update }
  // Keep any non-JSON notes content
  const nonJson = existing.replace(/\{.*\}/s, '').trim()
  return nonJson ? `${nonJson}\n${JSON.stringify(cfg)}` : JSON.stringify(cfg)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { role, auto_sync, create_leads, create_tasks, active } = body

  // Handle __env__ (primary account stored in .env)
  if (id === '__env__') {
    return NextResponse.json({ ok: true, note: 'Primary account config updated (stored in .env)' })
  }

  try {
    const tbl = await getUsersTableId()
    if (!tbl) return NextResponse.json({ error: 'Users table not found' }, { status: 404 })

    // Get current record
    const getRes = await fetch(`${AT}/${tbl}/${id}`, { headers: HDR() })
    if (!getRes.ok) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    const rec = await getRes.json()
    const currentNotes = rec.fields?.Notes || ''

    const cfgUpdate: Record<string, any> = {}
    if (role !== undefined) cfgUpdate.role = role
    if (auto_sync !== undefined) cfgUpdate.auto_sync = auto_sync
    if (create_leads !== undefined) cfgUpdate.create_leads = create_leads
    if (create_tasks !== undefined) cfgUpdate.create_tasks = create_tasks

    const fields: Record<string, any> = {
      Notes: buildNotesJson(currentNotes, cfgUpdate),
    }
    if (active !== undefined) fields['Active'] = active

    // If promoting to primary, we need to update the .env with this account's tokens
    if (role === 'primary') {
      const accessToken = rec.fields?.Google_Access_Token
      const refreshToken = rec.fields?.Google_Refresh_Token
      const tokenExpiry = rec.fields?.Google_Token_Expiry
      if (accessToken && fs.existsSync(ENV_PATH)) {
        let env = fs.readFileSync(ENV_PATH, 'utf-8')
        const updates: Record<string, string> = { GOOGLE_GMAIL_TOKEN: accessToken }
        if (refreshToken) updates['GOOGLE_REFRESH_TOKEN'] = refreshToken
        if (tokenExpiry) updates['GOOGLE_TOKEN_EXPIRY'] = tokenExpiry
        for (const [k, v] of Object.entries(updates)) {
          if (env.includes(`${k}=`)) {
            env = env.replace(new RegExp(`^${k}=.*$`, 'm'), `${k}=${v}`)
          } else {
            env += `\n${k}=${v}`
          }
        }
        fs.writeFileSync(ENV_PATH, env, 'utf-8')
      }
    }

    const patchRes = await fetch(`${AT}/${tbl}/${id}`, {
      method: 'PATCH', headers: HDR(),
      body: JSON.stringify({ fields, typecast: true }),
    })
    if (!patchRes.ok) return NextResponse.json({ error: await patchRes.text() }, { status: patchRes.status })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Disconnect primary (.env account)
  if (id === '__env__') {
    try {
      if (fs.existsSync(ENV_PATH)) {
        let env = fs.readFileSync(ENV_PATH, 'utf-8')
        env = env.split('\n').map(line => {
          const k = line.split('=')[0]
          return ['GOOGLE_GMAIL_TOKEN', 'GOOGLE_REFRESH_TOKEN', 'GOOGLE_TOKEN_EXPIRY'].includes(k)
            ? `${k}=`
            : line
        }).join('\n')
        fs.writeFileSync(ENV_PATH, env, 'utf-8')
      }
      return NextResponse.json({ ok: true, restart_required: true })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  try {
    const tbl = await getUsersTableId()
    if (!tbl) return NextResponse.json({ error: 'Users table not found' }, { status: 404 })

    await fetch(`${AT}/${tbl}/${id}`, {
      method: 'PATCH', headers: HDR(),
      body: JSON.stringify({ fields: {
        Google_Connected: false,
        Google_Access_Token: '',
        Google_Refresh_Token: '',
        Google_Token_Expiry: '',
      }, typecast: true }),
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
