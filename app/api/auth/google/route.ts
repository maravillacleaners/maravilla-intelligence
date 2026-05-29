/**
 * GET /api/auth/google?user_id=recXXX  — Initiate Google OAuth
 * Redirects to Google consent screen
 */

import { NextResponse } from 'next/server'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ')

async function getGoogleConfig(): Promise<{ client_id: string; client_secret: string } | null> {
  // Try env first, then Airtable config
  const client_id = process.env.GOOGLE_CLIENT_ID
  const client_secret = process.env.GOOGLE_CLIENT_SECRET
  if (client_id && client_secret) return { client_id, client_secret }

  const KEY = process.env.AIRTABLE_API_KEY!
  const BASE = process.env.AIRTABLE_BASE_ID!
  try {
    const res = await fetch(
      `https://api.airtable.com/v0/meta/bases/${BASE}/tables`,
      { headers: { Authorization: `Bearer ${KEY}` } }
    )
    const data = await res.json()
    const configTbl = (data.tables || []).find((t: any) => t.name === 'Config')?.id
    if (!configTbl) return null

    const [idRes, secretRes] = await Promise.all([
      fetch(`https://api.airtable.com/v0/${BASE}/${configTbl}?filterByFormula=${encodeURIComponent('{Key}="GOOGLE_CLIENT_ID"')}&maxRecords=1`,
        { headers: { Authorization: `Bearer ${KEY}` } }),
      fetch(`https://api.airtable.com/v0/${BASE}/${configTbl}?filterByFormula=${encodeURIComponent('{Key}="GOOGLE_CLIENT_SECRET"')}&maxRecords=1`,
        { headers: { Authorization: `Bearer ${KEY}` } }),
    ])
    const [idData, secretData] = await Promise.all([idRes.json(), secretRes.json()])
    const cid = idData.records?.[0]?.fields?.Value
    const csecret = secretData.records?.[0]?.fields?.Value
    if (cid && csecret) return { client_id: cid, client_secret: csecret }
  } catch {}
  return null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const user_id = searchParams.get('user_id') || ''

  const config = await getGoogleConfig()
  if (!config) {
    return NextResponse.json({
      error: 'Google OAuth not configured',
      instructions: 'Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Settings → Google Integration'
    }, { status: 400 })
  }

  const app_url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirect_uri = `${app_url}/api/auth/google/callback`

  const params = new URLSearchParams({
    client_id: config.client_id,
    redirect_uri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: user_id,
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
