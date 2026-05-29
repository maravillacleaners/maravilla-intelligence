/**
 * GET /api/auth/google/callback  — Google OAuth callback
 * Exchanges code for tokens, stores in Users table + writes to .env
 */

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const ENV_PATH = path.join(process.cwd(), '.env')

function applyUpdatesToEnvContent(original: string, updates: Record<string, string>): string {
  const lines = original.split('\n')
  const applied = new Set<string>()

  const updated = lines.map(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return line
    const eq = trimmed.indexOf('=')
    if (eq === -1) return line
    const k = trimmed.slice(0, eq).trim()
    if (k in updates && updates[k] && updates[k].trim()) {
      applied.add(k)
      return `${k}=${updates[k].trim()}`
    }
    return line
  })

  for (const [k, v] of Object.entries(updates)) {
    if (!applied.has(k) && v && v.trim()) {
      updated.push(`${k}=${v.trim()}`)
    }
  }

  return updated.join('\n')
}

const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY!
const BASE = process.env.AIRTABLE_BASE_ID!
const AT = `https://api.airtable.com/v0/${BASE}`
const AT_HDR = () => ({ Authorization: `Bearer ${AIRTABLE_KEY}`, 'Content-Type': 'application/json' })

let USERS_TBL = ''
let CONFIG_TBL = ''

async function getTableIds() {
  if (USERS_TBL && CONFIG_TBL) return
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, { headers: { Authorization: `Bearer ${AIRTABLE_KEY}` } })
  const data = await res.json()
  for (const t of data.tables || []) {
    if (t.name === 'Users') USERS_TBL = t.id
    if (t.name === 'Config') CONFIG_TBL = t.id
  }
}

async function getConfigValue(key: string): Promise<string> {
  const env = process.env[key]
  if (env) return env
  if (!CONFIG_TBL) return ''
  const res = await fetch(
    `${AT}/${CONFIG_TBL}?filterByFormula=${encodeURIComponent(`{Key}="${key}"`)}&maxRecords=1`,
    { headers: AT_HDR() }
  )
  const data = await res.json()
  return data.records?.[0]?.fields?.Value || ''
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code') || ''
  const user_id = searchParams.get('state') || ''
  const error = searchParams.get('error')
  const app_url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (error) {
    return NextResponse.redirect(`${app_url}/settings?google_error=${encodeURIComponent(error)}`)
  }

  await getTableIds()

  const [client_id, client_secret] = await Promise.all([
    getConfigValue('GOOGLE_CLIENT_ID'),
    getConfigValue('GOOGLE_CLIENT_SECRET'),
  ])

  if (!client_id || !client_secret) {
    return NextResponse.redirect(`${app_url}/settings?google_error=not_configured`)
  }

  const redirect_uri = `${app_url}/api/auth/google/callback`

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id, client_secret, redirect_uri,
      grant_type: 'authorization_code',
    }),
  })
  const tokens = await tokenRes.json()

  if (tokens.error) {
    return NextResponse.redirect(`${app_url}/settings?google_error=${encodeURIComponent(tokens.error)}`)
  }

  // Get user info
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  })
  const userInfo = await userRes.json()

  const expiry = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString()

  // Write tokens to .env file
  try {
    const envUpdates: Record<string, string> = {
      GOOGLE_GMAIL_TOKEN: tokens.access_token || '',
      GOOGLE_TOKEN_EXPIRY: expiry,
    }
    if (tokens.refresh_token) {
      envUpdates.GOOGLE_REFRESH_TOKEN = tokens.refresh_token
    }
    const current = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf-8') : ''
    const newContent = applyUpdatesToEnvContent(current, envUpdates)
    fs.writeFileSync(ENV_PATH, newContent, 'utf-8')
  } catch {
    // Non-fatal: .env write failure shouldn't block OAuth flow
  }

  // Update or create user record
  if (user_id && USERS_TBL) {
    try {
      await fetch(`${AT}/${USERS_TBL}/${user_id}`, {
        method: 'PATCH', headers: AT_HDR(),
        body: JSON.stringify({
          fields: {
            Google_Connected: true,
            Google_Email: userInfo.email || '',
            Google_Access_Token: tokens.access_token || '',
            Google_Refresh_Token: tokens.refresh_token || '',
            Google_Token_Expiry: expiry,
          }, typecast: true,
        }),
      })
    } catch {}
  } else if (USERS_TBL && userInfo.email) {
    // Try to match by email
    const existing = await fetch(
      `${AT}/${USERS_TBL}?filterByFormula=${encodeURIComponent(`{Email}="${userInfo.email}"`)}&maxRecords=1`,
      { headers: AT_HDR() }
    )
    const exData = await existing.json()
    const target = exData.records?.[0]
    if (target) {
      await fetch(`${AT}/${USERS_TBL}/${target.id}`, {
        method: 'PATCH', headers: AT_HDR(),
        body: JSON.stringify({ fields: {
          Google_Connected: true,
          Google_Email: userInfo.email,
          Google_Access_Token: tokens.access_token || '',
          Google_Refresh_Token: tokens.refresh_token || '',
          Google_Token_Expiry: expiry,
        }, typecast: true }),
      })
    }
  }

  return NextResponse.redirect(`${app_url}/settings?google_connected=true&google_email=${encodeURIComponent(userInfo.email || '')}`)
}
