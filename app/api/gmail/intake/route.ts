/**
 * POST /api/gmail/intake
 * Scans Gmail inbox for procurement emails → creates leads in TBL_LEADS
 *
 * Creates for each new procurement email:
 *   - Lead record (source: 'gmail')
 *   - Event record (event_type: 'email_signal_detected')
 *   - Task record (if actionable bid/RFP)
 *
 * GET /api/gmail/intake
 * Returns configuration status.
 */

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getGmailAccessToken } from '@/lib/gmail-tokens'

const ENV_PATH = path.join(process.cwd(), '.env')

const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY!
const BASE = process.env.AIRTABLE_BASE_ID!
const AT = `https://api.airtable.com/v0/${BASE}`
const AT_HDR = () => ({ Authorization: `Bearer ${AIRTABLE_KEY}`, 'Content-Type': 'application/json' })

const TBL_LEADS = 'tblja2oeA4oNEjioT'
const TBL_EVENTS = 'tbl84x3ZGOIGf8bDA'
const TBL_TASKS = 'tblrB7Cj84vLwI8tD'

// ─── .env write helper ──────────────────────────────────────────────────────

function updateEnv(updates: Record<string, string>) {
  const current = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf-8') : ''
  const lines = current.split('\n')
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

  fs.writeFileSync(ENV_PATH, updated.join('\n'), 'utf-8')
}

// ─── Gmail helpers ──────────────────────────────────────────────────────────

function decodeBase64Url(str: string): string {
  try {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    return Buffer.from(base64, 'base64').toString('utf-8')
  } catch {
    return ''
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function extractBodyText(payload: any): string {
  if (!payload) return ''

  // Direct body
  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data)
    return payload.mimeType?.includes('html') ? stripHtml(decoded) : decoded
  }

  // Multipart: prefer text/plain, fall back to text/html
  if (payload.parts) {
    let htmlPart = ''
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64Url(part.body.data)
      }
      if (part.mimeType === 'text/html' && part.body?.data) {
        htmlPart = stripHtml(decodeBase64Url(part.body.data))
      }
      // Recurse into nested multipart
      if (part.mimeType?.startsWith('multipart/')) {
        const nested = extractBodyText(part)
        if (nested) return nested
      }
    }
    return htmlPart
  }

  return ''
}

function getHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  return headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || ''
}

interface ParsedEmail {
  subject: string
  from: string
  from_email: string
  from_name: string
  date: string
  snippet: string
  body: string
  domain: string
  is_gov: boolean
}

function parseEmail(message: any): ParsedEmail {
  const headers: Array<{ name: string; value: string }> = message.payload?.headers || []
  const subject = getHeader(headers, 'subject')
  const from = getHeader(headers, 'from')
  const date = getHeader(headers, 'date')
  const snippet = message.snippet || ''
  const body = extractBodyText(message.payload)

  // Parse "Name <email@domain.com>" or "email@domain.com"
  const emailMatch = from.match(/<([^>]+)>/) || from.match(/([^\s]+@[^\s]+)/)
  const from_email = emailMatch ? emailMatch[1].trim() : from.trim()
  const nameMatch = from.match(/^([^<]+)</)
  const from_name = nameMatch ? nameMatch[1].trim().replace(/^"|"$/g, '') : from_email

  const domainMatch = from_email.match(/@([^>]+)$/)
  const domain = domainMatch ? domainMatch[1].toLowerCase().trim() : ''
  const is_gov = domain.endsWith('.gov') || domain.endsWith('.mil')

  return { subject, from, from_email, from_name, date, snippet, body, domain, is_gov }
}

interface Signals {
  has_rfp: boolean
  has_bid: boolean
  has_solicitation: boolean
  has_deadline: boolean
  has_amendment: boolean
  has_award: boolean
  has_janitorial: boolean
  has_naics: boolean
  bid_opportunity: boolean
}

function detectSignals(text: string): Signals {
  const t = text.toLowerCase()
  const has_rfp = /\brfp\b|\brequest for proposal/.test(t)
  const has_bid = /\bbid\b|\bifb\b|\binvitation for bid/.test(t)
  const has_solicitation = /\bsolicitation\b|\brebid\b/.test(t)
  const has_deadline = /\bdeadline\b|\bdue by\b|\bsubmit by\b|\bcloses\b/.test(t)
  const has_amendment = /\bamendment\b|\baddendum\b/.test(t)
  const has_award = /\baward\b|\bcontract award/.test(t)
  const has_janitorial = /\bjanitorial\b|\bcleaning\b|\bcustodial\b/.test(t)
  const has_naics = /naics\s*561720/.test(t)
  const bid_opportunity = has_rfp || has_bid || has_solicitation

  return {
    has_rfp, has_bid, has_solicitation, has_deadline,
    has_amendment, has_award, has_janitorial, has_naics, bid_opportunity,
  }
}

function scoreEmail(email: ParsedEmail, signals: Signals): number {
  let score = 50
  if (signals.has_rfp) score += 15
  if (signals.has_bid) score += 15
  if (signals.has_solicitation) score += 10
  if (signals.has_deadline) score += 10
  if (signals.has_naics) score += 10
  if (signals.has_janitorial) score += 10
  if (signals.has_amendment) score += 5
  if (signals.has_award) score += 5
  if (email.is_gov) score += 10
  return Math.min(score, 100)
}

function extractDeadline(text: string): string | null {
  // Look for date patterns near deadline keywords
  const deadlinePattern = /(?:deadline|due\s+by|submit\s+by|closes?|submission\s+date)[^\n.]{0,60}(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
  const m = text.match(deadlinePattern)
  if (m?.[1]) {
    const d = new Date(m[1])
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }
  return null
}

function buildEntityName(domain: string, email_parsed: ParsedEmail): string {
  // Try to humanize from domain: browardschools.com → Broward Schools
  const base = domain.replace(/\.(gov|edu|com|org|net|mil)$/, '')
  return base
    .split(/[.\-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function buildEntityKey(domain: string): string {
  return 'company:' + domain.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 60)
}

// ─── Airtable helpers ────────────────────────────────────────────────────────

async function findLead(entity_key: string): Promise<string | null> {
  const formula = encodeURIComponent(`{Entity_Key}="${entity_key}"`)
  const res = await fetch(
    `${AT}/${TBL_LEADS}?filterByFormula=${formula}&maxRecords=1&fields[]=Entity_Key`,
    { headers: AT_HDR() }
  )
  const data = await res.json()
  return data.records?.[0]?.id || null
}

async function createLead(fields: Record<string, any>): Promise<string | null> {
  const res = await fetch(`${AT}/${TBL_LEADS}`, {
    method: 'POST',
    headers: AT_HDR(),
    body: JSON.stringify({ fields, typecast: true }),
  })
  const data = await res.json()
  return data.id || null
}

async function createEvent(fields: Record<string, any>): Promise<void> {
  await fetch(`${AT}/${TBL_EVENTS}`, {
    method: 'POST',
    headers: AT_HDR(),
    body: JSON.stringify({ fields, typecast: true }),
  })
}

async function createTask(fields: Record<string, any>): Promise<void> {
  await fetch(`${AT}/${TBL_TASKS}`, {
    method: 'POST',
    headers: AT_HDR(),
    body: JSON.stringify({ fields, typecast: true }),
  })
}

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET() {
  const configured = !!(process.env.GOOGLE_GMAIL_TOKEN)
  return NextResponse.json({
    configured,
    description: 'Scans Gmail for procurement emails and creates leads, events, and tasks in Airtable.',
    endpoint: 'POST /api/gmail/intake',
    query_keywords: ['cleaning', 'janitorial', 'custodial', 'rfp', 'rfq', 'bid', 'solicitation', 'procurement', 'NAICS 561720', 'IFB', 'amendment', 'rebid'],
    lookback_days: 7,
    max_messages: 20,
    min_score: 40,
  })
}

// ─── Multi-account scanner ───────────────────────────────────────────────────

async function getConnectedAccounts(): Promise<Array<{ id: string; email: string; token: string; create_leads: boolean; create_tasks: boolean }>> {
  const accounts: Array<{ id: string; email: string; token: string; create_leads: boolean; create_tasks: boolean }> = []

  // Primary from .env
  const envToken = await getGmailAccessToken()
  if (envToken) {
    accounts.push({
      id: '__env__',
      email: process.env.GMAIL_IMPERSONATE_EMAIL || 'primary',
      token: envToken,
      create_leads: true,
      create_tasks: true,
    })
  }

  // Secondary accounts from Airtable Users table
  const KEY = process.env.AIRTABLE_API_KEY!
  const BASE = process.env.AIRTABLE_BASE_ID!
  try {
    const metaRes = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, {
      headers: { Authorization: `Bearer ${KEY}` },
    })
    const meta = await metaRes.json()
    const tbl = (meta.tables || []).find((t: any) => t.name === 'Users')?.id
    if (tbl) {
      const formula = encodeURIComponent('{Google_Connected}=1')
      const usersRes = await fetch(`https://api.airtable.com/v0/${BASE}/${tbl}?filterByFormula=${formula}&maxRecords=10`, {
        headers: { Authorization: `Bearer ${KEY}` },
        cache: 'no-store' as const,
      })
      if (usersRes.ok) {
        const usersData = await usersRes.json()
        for (const rec of (usersData.records || [])) {
          const f = rec.fields || {}
          const token = f['Google_Access_Token'] || ''
          const email = f['Google_Email'] || f['Email'] || ''
          if (!token || !email) continue
          // Skip if already in env account
          if (accounts.find(a => a.email === email)) continue
          // Parse config from Notes
          let cfg: Record<string, any> = { auto_sync: true, create_leads: true, create_tasks: true }
          try {
            const m = (f['Notes'] || '').match(/\{.*\}/s)
            if (m) cfg = { ...cfg, ...JSON.parse(m[0]) }
          } catch { /* ignore */ }
          if (cfg.auto_sync === false) continue // skip paused accounts
          accounts.push({
            id: rec.id,
            email,
            token,
            create_leads: cfg.create_leads !== false,
            create_tasks: cfg.create_tasks !== false,
          })
        }
      }
    }
  } catch { /* non-critical */ }

  return accounts
}

async function scanAccount(
  token: string,
  accountEmail: string,
  options: { create_leads: boolean; create_tasks: boolean }
): Promise<{ scanned: number; qualifying: number; leads_created: number; leads_updated: number; events_created: number; tasks_created: number }> {
  const stats = { scanned: 0, qualifying: 0, leads_created: 0, leads_updated: 0, events_created: 0, tasks_created: 0 }

  const afterDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const afterUnix = Math.floor(afterDate.getTime() / 1000)
  const queryTerms = [
    '"cleaning" OR "janitorial" OR "custodial" OR "rfp" OR "rfq" OR "bid"',
    'OR "solicitation" OR "procurement" OR "NAICS 561720" OR "IFB" OR "amendment" OR "rebid"',
    `after:${afterUnix}`,
  ].join(' ')

  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(queryTerms)}&maxResults=20`
  const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${token}` } })
  if (!listRes.ok) return stats

  const listData = await listRes.json()
  const messages: Array<{ id: string }> = listData.messages || []
  stats.scanned = messages.length
  if (messages.length === 0) return stats

  const today = new Date().toISOString().split('T')[0]
  const twoDaysOut = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  for (const { id } of messages) {
    try {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!msgRes.ok) continue
      const message = await msgRes.json()
      const email = parseEmail(message)
      const fullText = `${email.subject} ${email.body} ${email.snippet}`
      const signals = detectSignals(fullText)
      const score = scoreEmail(email, signals)
      if (score < 40 && !signals.bid_opportunity) continue
      stats.qualifying++

      const entity_name = buildEntityName(email.domain, email)
      const entity_key = buildEntityKey(email.domain)
      const agency = email.is_gov ? entity_name : undefined
      const deadline = extractDeadline(fullText)
      const existingId = await findLead(entity_key)

      if (options.create_leads) {
        if (!existingId) {
          const leadFields: Record<string, any> = {
            Entity_Name: entity_name,
            Entity_Key: entity_key,
            Source: 'gmail',
            Stage: 'New Signal',
            Priority_Score: score,
            Signal_Date: today,
            Notes: `Account: ${accountEmail}\nSubject: ${email.subject}\nFrom: ${email.from}\nDate: ${email.date}\n\n${email.snippet}`,
          }
          if (agency) leadFields.Agency = agency
          const newId = await createLead(leadFields)
          if (newId) stats.leads_created++
        } else {
          stats.leads_updated++
        }
      }

      await createEvent({
        Entity_Key: entity_key,
        Entity_Type: 'lead',
        Entity_Name: entity_name,
        Event_Type: 'email_signal_detected',
        Description: `Gmail (${accountEmail}): "${email.subject}" from ${email.from_email}`,
        Actor: 'gmail_intake',
        Source: 'gmail',
        Timestamp: new Date().toISOString(),
      })
      stats.events_created++

      if (options.create_tasks && signals.bid_opportunity && deadline) {
        await createTask({
          Task: `Review bid: ${email.subject.slice(0, 80)}`,
          Notes: `From: ${email.from} | Account: ${accountEmail} | Deadline: ${deadline}`,
          Status: 'Open',
          Priority: score >= 70 ? 'High' : 'Medium',
          Owner: 'Sales',
          Due_Date: deadline || twoDaysOut,
          Entity_Key: entity_key,
          Entity_Name: entity_name,
          Entity_Type: 'lead',
          Created_At: new Date().toISOString(),
        })
        stats.tasks_created++
      }
    } catch { /* skip individual message errors */ }
  }

  return stats
}

// ─── POST handler ────────────────────────────────────────────────────────────

export async function POST() {
  // Get all connected accounts (primary .env + secondary from Users table)
  const accounts = await getConnectedAccounts()
  if (accounts.length === 0) {
    return NextResponse.json({ ok: false, error: 'No Gmail accounts connected', configured: false }, { status: 200 })
  }

  // Scan all accounts in parallel
  const results = await Promise.allSettled(
    accounts.map(acc => scanAccount(acc.token, acc.email, {
      create_leads: acc.create_leads,
      create_tasks: acc.create_tasks,
    }))
  )

  // Aggregate results
  const totals = { scanned: 0, qualifying: 0, leads_created: 0, leads_updated: 0, events_created: 0, tasks_created: 0 }
  const accountResults: Record<string, any> = {}

  results.forEach((r, i) => {
    const acc = accounts[i]
    if (r.status === 'fulfilled') {
      Object.keys(totals).forEach(k => { (totals as any)[k] += (r.value as any)[k] || 0 })
      accountResults[acc.email] = { ...r.value, ok: true }
    } else {
      accountResults[acc.email] = { ok: false, error: r.reason?.message || 'scan failed' }
    }
  })

  return NextResponse.json({
    ok: true,
    ...totals,
    accounts_scanned: accounts.length,
    per_account: accountResults,
    configured: true,
  })
}
