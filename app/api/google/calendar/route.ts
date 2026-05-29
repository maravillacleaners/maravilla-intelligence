/**
 * GET /api/google/calendar?user_id=recXXX&days=14
 * Reads upcoming calendar events, flags procurement/bid-related meetings
 */

import { NextResponse } from 'next/server'

const KEY = process.env.AIRTABLE_API_KEY!
const BASE = process.env.AIRTABLE_BASE_ID!
const AT = `https://api.airtable.com/v0/${BASE}`
const HDR = () => ({ Authorization: `Bearer ${KEY}` })

let USERS_TBL = ''

async function getTokenAndRefresh(user_id: string): Promise<string | null> {
  if (!USERS_TBL) {
    const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, { headers: HDR() })
    const data = await res.json()
    USERS_TBL = (data.tables || []).find((t: any) => t.name === 'Users')?.id || ''
  }
  if (!USERS_TBL) return null

  const res = await fetch(`${AT}/${USERS_TBL}/${user_id}`, { headers: HDR() })
  const data = await res.json()
  const f = data.fields
  if (!f?.Google_Access_Token) return null

  const expiry = f.Google_Token_Expiry || ''
  if (expiry && new Date(expiry) > new Date(Date.now() + 60000)) return f.Google_Access_Token

  // Refresh
  const client_id = process.env.GOOGLE_CLIENT_ID || ''
  const client_secret = process.env.GOOGLE_CLIENT_SECRET || ''
  if (!client_id || !f.Google_Refresh_Token) return f.Google_Access_Token

  const rRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id, client_secret,
      refresh_token: f.Google_Refresh_Token,
      grant_type: 'refresh_token',
    }),
  })
  const rData = await rRes.json()
  if (rData.access_token) {
    await fetch(`${AT}/${USERS_TBL}/${user_id}`, {
      method: 'PATCH', headers: { ...HDR(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: {
        Google_Access_Token: rData.access_token,
        Google_Token_Expiry: new Date(Date.now() + (rData.expires_in || 3600) * 1000).toISOString(),
        Calendar_Last_Sync: new Date().toISOString(),
      }}),
    }).catch(() => {})
    return rData.access_token
  }
  return f.Google_Access_Token
}

const MEETING_SIGNALS = ['bid', 'rfp', 'rfq', 'proposal', 'procurement', 'vendor', 'contract', 'solicitation',
  'demo', 'outreach', 'meeting', 'call', 'followup', 'follow-up', 'client', 'cleaning', 'janitorial']

function classifyEvent(summary: string, description: string) {
  const text = (summary + ' ' + description).toLowerCase()
  const matches = MEETING_SIGNALS.filter(s => text.includes(s))
  return {
    is_sales: matches.length > 0,
    signals: matches,
    category: matches.includes('bid') || matches.includes('rfp') ? 'govcon'
      : matches.includes('outreach') || matches.includes('client') ? 'commercial'
      : matches.length > 0 ? 'sales' : 'other',
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const user_id = searchParams.get('user_id') || ''
  const days = Math.min(Number(searchParams.get('days') || 14), 90)

  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const access_token = await getTokenAndRefresh(user_id)
  if (!access_token) return NextResponse.json({ error: 'Google not connected for this user' }, { status: 401 })

  const now = new Date()
  const end = new Date(Date.now() + days * 86400000)

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
    `timeMin=${now.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=50`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  )
  const data = await res.json()

  if (data.error) {
    return NextResponse.json({ error: data.error.message }, { status: 401 })
  }

  const events = (data.items || []).map((ev: any) => {
    const start = ev.start?.dateTime || ev.start?.date || ''
    const end_time = ev.end?.dateTime || ev.end?.date || ''
    const summary = ev.summary || '(no title)'
    const description = ev.description || ''
    const { is_sales, signals, category } = classifyEvent(summary, description)

    return {
      id: ev.id,
      summary,
      description: description.slice(0, 200),
      start,
      end: end_time,
      location: ev.location || '',
      attendees: (ev.attendees || []).map((a: any) => ({ email: a.email, name: a.displayName || '', status: a.responseStatus })),
      is_sales,
      signals,
      category,
      html_link: ev.htmlLink || '',
    }
  })

  const today = new Date().toISOString().split('T')[0]
  const today_events = events.filter(e => e.start.startsWith(today))
  const sales_events = events.filter(e => e.is_sales)

  return NextResponse.json({
    total: events.length,
    today_count: today_events.length,
    sales_events_count: sales_events.length,
    events,
    today_events,
    sales_events,
  })
}
