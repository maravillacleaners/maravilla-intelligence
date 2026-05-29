/**
 * GET /api/google/gmail?user_id=recXXX&max=20&q=query
 * Reads Gmail threads, extracts lead signals from portal emails (OpenGov, Bonfire, DemandStar)
 */

import { NextResponse } from 'next/server'

const KEY = process.env.AIRTABLE_API_KEY!
const BASE = process.env.AIRTABLE_BASE_ID!
const AT = `https://api.airtable.com/v0/${BASE}`
const HDR = () => ({ Authorization: `Bearer ${KEY}` })

let USERS_TBL = ''

async function getToken(user_id: string): Promise<{ access_token: string; refresh_token: string; client_id: string; client_secret: string } | null> {
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

  const client_id = process.env.GOOGLE_CLIENT_ID || ''
  const client_secret = process.env.GOOGLE_CLIENT_SECRET || ''
  return { access_token: f.Google_Access_Token, refresh_token: f.Google_Refresh_Token || '', client_id, client_secret }
}

async function refreshIfNeeded(user_id: string, token: any): Promise<string> {
  const expiry = await (async () => {
    const res = await fetch(`${AT}/${USERS_TBL}/${user_id}`, { headers: HDR() })
    const d = await res.json()
    return d.fields?.Google_Token_Expiry || ''
  })()

  if (expiry && new Date(expiry) > new Date(Date.now() + 60000)) {
    return token.access_token
  }

  // Refresh token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: token.client_id, client_secret: token.client_secret,
      refresh_token: token.refresh_token, grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (data.access_token) {
    const new_expiry = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString()
    await fetch(`${AT}/${USERS_TBL}/${user_id}`, {
      method: 'PATCH', headers: { ...HDR(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { Google_Access_Token: data.access_token, Google_Token_Expiry: new_expiry } }),
    })
    return data.access_token
  }
  return token.access_token
}

const PORTAL_SENDERS = ['openGov', 'bonfire', 'demandstar', 'periscope', 'planetbids', 'bid', 'rfp', 'solicitation', 'procurement']

function extractLeadSignals(subject: string, snippet: string): { is_lead: boolean; signals: string[]; lead_type: string } {
  const text = (subject + ' ' + snippet).toLowerCase()
  const signals: string[] = []
  let lead_type = ''

  if (PORTAL_SENDERS.some(p => text.includes(p))) { signals.push('procurement portal'); lead_type = 'GovCon Opportunity' }
  if (text.includes('rfp') || text.includes('request for proposal')) { signals.push('RFP'); lead_type = 'GovCon Opportunity' }
  if (text.includes('rfq') || text.includes('request for quote')) { signals.push('RFQ') }
  if (text.includes('bid') || text.includes('solicitation')) { signals.push('bid/solicitation') }
  if (text.includes('janitorial') || text.includes('custodial') || text.includes('cleaning')) { signals.push('cleaning services') }
  if (text.includes('561720') || text.includes('561710')) { signals.push('NAICS 561720') }
  if (text.includes('subcontract') || text.includes('teaming')) { signals.push('subcontracting') }
  if (text.includes('award') || text.includes('contract award')) { signals.push('contract award') }

  return { is_lead: signals.length > 0, signals, lead_type: lead_type || (signals.length ? 'GovCon Opportunity' : '') }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const user_id = searchParams.get('user_id') || ''
  const max = Math.min(Number(searchParams.get('max') || 20), 50)
  const q = searchParams.get('q') || 'in:inbox'

  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const token = await getToken(user_id)
  if (!token) return NextResponse.json({ error: 'User not found or Google not connected' }, { status: 401 })

  const access_token = await refreshIfNeeded(user_id, token)

  // List messages
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${max}&q=${encodeURIComponent(q)}`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  )
  const listData = await listRes.json()

  if (listData.error) {
    return NextResponse.json({ error: listData.error.message, code: listData.error.code }, { status: 401 })
  }

  const messages = listData.messages || []

  // Fetch thread details in parallel (batch of 10)
  const details = await Promise.all(
    messages.slice(0, 10).map(async (m: any) => {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${access_token}` } }
      )
      return res.json()
    })
  )

  const threads = details.map((msg: any) => {
    const headers: Record<string, string> = {}
    for (const h of msg.payload?.headers || []) headers[h.name] = h.value
    const subject = headers['Subject'] || '(no subject)'
    const from = headers['From'] || ''
    const date = headers['Date'] || ''
    const snippet = msg.snippet || ''
    const { is_lead, signals, lead_type } = extractLeadSignals(subject, snippet)

    return {
      id: msg.id,
      thread_id: msg.threadId,
      subject,
      from,
      date,
      snippet,
      is_lead,
      signals,
      lead_type,
      label_ids: msg.labelIds || [],
    }
  })

  const lead_emails = threads.filter(t => t.is_lead)

  // Update last sync
  if (USERS_TBL) {
    await fetch(`${AT}/${USERS_TBL}/${user_id}`, {
      method: 'PATCH', headers: { ...HDR(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { Gmail_Last_Sync: new Date().toISOString() } }),
    }).catch(() => {})
  }

  return NextResponse.json({
    total_fetched: threads.length,
    lead_signals: lead_emails.length,
    threads,
    lead_emails,
    next_page_token: listData.nextPageToken || null,
  })
}
