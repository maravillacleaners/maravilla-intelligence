/**
 * Email Scan API
 * GET – Scan Gmail inbox for procurement signals (or return mock data if no token)
 */

import { NextRequest, NextResponse } from 'next/server'

const GMAIL_ACCESS_TOKEN = process.env.GMAIL_ACCESS_TOKEN
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

// ── Types ─────────────────────────────────────────────────────────────────────

type SignalType =
  | 'renewal'
  | 'expansion'
  | 'bid_opportunity'
  | 'urgent'
  | 'vendor_issue'
  | 'deadline'

interface EmailResult {
  id: string
  subject: string
  sender_name: string
  sender_email: string
  date: string
  snippet: string
  body_preview: string
  signals: SignalType[]
  score: number
  processed: boolean
}

// ── Signal Detection ──────────────────────────────────────────────────────────

function detectSignals(text: string): SignalType[] {
  const lower = text.toLowerCase()
  const signals: SignalType[] = []

  if (/contract renewal|renewal notice/.test(lower)) signals.push('renewal')
  if (/new location|new clinic|opening|grand opening/.test(lower)) signals.push('expansion')
  if (/\brfp\b|bid|solicitation|procurement/.test(lower)) signals.push('bid_opportunity')
  if (/urgent|\basap\b|immediately/.test(lower)) signals.push('urgent')
  if (/complaint|issue|problem|not satisfied/.test(lower)) signals.push('vendor_issue')
  if (/deadline|\bdue\b|due date|expires/.test(lower)) signals.push('deadline')

  return signals
}

function scoreSignals(signals: SignalType[]): number {
  return Math.min(signals.length * 20, 100)
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

function getMockEmails(): EmailResult[] {
  const now = new Date()
  const dateStr = now.toISOString()

  const mocks: Omit<EmailResult, 'signals' | 'score'>[] = [
    {
      id: 'mock-email-001',
      subject: 'Janitorial Services RFP - Broward County Schools - Deadline June 15',
      sender_name: 'Procurement Office',
      sender_email: 'procurement@browardschools.com',
      date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      snippet: 'Broward County School District is accepting bids for janitorial services across Zone 3...',
      body_preview:
        'Dear Vendor, We are pleased to announce RFP #2026-JAN-117 for Janitorial Services in Zone 3 schools. Deadline for submission is June 15, 2026. Pre-bid meeting scheduled for June 2nd at 10am. Contact: Sandra Martinez, smartinez@browardschools.com.',
      processed: false,
    },
    {
      id: 'mock-email-002',
      subject: 'Contract Renewal Notice - Building 4 Custodial - Miami-Dade Transit',
      sender_name: 'Operations Manager',
      sender_email: 'ops@miamidade.gov',
      date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      snippet: 'Your current contract for custodial services in Building 4 is up for renewal...',
      body_preview:
        'Dear Maravilla Cleaners, This is a formal contract renewal notice for the custodial services agreement covering Building 4 at Miami-Dade Transit headquarters. Current contract expires July 31, 2026. Please confirm your intent to renew by June 30.',
      processed: false,
    },
    {
      id: 'mock-email-003',
      subject: 'New clinic opening - need cleaning vendor ASAP - 3 locations Coral Gables',
      sender_name: 'Maria Gonzalez',
      sender_email: 'mgonzalez@coralmedical.com',
      date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      snippet: 'We are opening 3 new medical clinic locations in Coral Gables and need a reliable cleaning...',
      body_preview:
        'Hi, We are urgently looking for a commercial cleaning company for our 3 new clinic locations opening in Coral Gables next month. Each location is approx 2,500 sq ft. We need daily cleaning Mon-Sat plus deep cleaning monthly. Please call ASAP: (305) 555-0191.',
      processed: false,
    },
    {
      id: 'mock-email-004',
      subject: 'Re: Bid #2026-JAN-042 Janitorial Services - Pre-bid meeting Thursday',
      sender_name: 'City of Fort Lauderdale Purchasing',
      sender_email: 'purchasing@fortlauderdale.gov',
      date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      snippet: 'This is a reminder that the pre-bid meeting for Bid #2026-JAN-042 is this Thursday at 9am...',
      body_preview:
        'This is an official reminder for all interested bidders. The mandatory pre-bid meeting for Bid #2026-JAN-042 (Janitorial Services - Municipal Buildings) will be held Thursday, May 29 at 9:00 AM at City Hall Room 200. Bid deadline is June 20, 2026. Questions due by June 10.',
      processed: false,
    },
    {
      id: 'mock-email-005',
      subject: 'URGENT: Compliance inspection next week - facility cleaning needed',
      sender_name: 'Patricia Ruiz',
      sender_email: 'pruiz@healthfacility.org',
      date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      snippet: 'We have a state compliance inspection scheduled for June 3rd and need emergency deep cleaning...',
      body_preview:
        'URGENT - We have a state health compliance inspection on June 3rd. We need a professional deep cleaning company immediately for our 8,000 sq ft facility in Hialeah. Current vendor has an issue and cannot fulfill. Please call today: (305) 555-0174. Budget approved.',
      processed: false,
    },
  ]

  return mocks.map((email) => {
    const combined = `${email.subject} ${email.body_preview} ${email.snippet}`
    const signals = detectSignals(combined)
    return {
      ...email,
      signals,
      score: scoreSignals(signals),
    }
  })
}

// ── Gmail API Helpers ─────────────────────────────────────────────────────────

function decodeBase64Url(encoded: string): string {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    return Buffer.from(base64, 'base64').toString('utf-8')
  } catch {
    return ''
  }
}

function extractGmailBody(payload: Record<string, unknown>): string {
  if (payload.body) {
    const body = payload.body as Record<string, unknown>
    if (body.data) return decodeBase64Url(body.data as string)
  }
  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts as Record<string, unknown>[]) {
      const mimeType = part.mimeType as string
      if (mimeType === 'text/plain' || mimeType === 'text/html') {
        const partBody = part.body as Record<string, unknown>
        if (partBody?.data) return decodeBase64Url(partBody.data as string)
      }
    }
  }
  return ''
}

function parseGmailHeaders(headers: { name: string; value: string }[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const h of headers) {
    result[h.name.toLowerCase()] = h.value
  }
  return result
}

async function fetchGmailMessages(): Promise<EmailResult[]> {
  const sevenDaysAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000)
  const query = `janitorial OR cleaning OR custodial OR RFP OR bid OR procurement OR solicitation after:${sevenDaysAgo}`

  const listRes = await fetch(
    `${GMAIL_API_BASE}/messages?q=${encodeURIComponent(query)}&maxResults=20`,
    {
      headers: { Authorization: `Bearer ${GMAIL_ACCESS_TOKEN}` },
    }
  )

  if (!listRes.ok) {
    throw new Error(`Gmail list failed: ${listRes.status}`)
  }

  const listData = await listRes.json()
  const messages: { id: string }[] = listData?.messages ?? []

  const results: EmailResult[] = []

  for (const msg of messages.slice(0, 20)) {
    try {
      const msgRes = await fetch(`${GMAIL_API_BASE}/messages/${msg.id}`, {
        headers: { Authorization: `Bearer ${GMAIL_ACCESS_TOKEN}` },
      })

      if (!msgRes.ok) continue

      const msgData = await msgRes.json()
      const headers = parseGmailHeaders(msgData?.payload?.headers ?? [])
      const body = extractGmailBody(msgData?.payload ?? {})
      const bodyPreview = body.replace(/<[^>]+>/g, '').slice(0, 500).trim()

      const combined = `${headers.subject ?? ''} ${bodyPreview} ${msgData.snippet ?? ''}`
      const signals = detectSignals(combined)

      // Parse sender
      const fromRaw = headers.from ?? ''
      const senderMatch = fromRaw.match(/^(.+?)\s*<(.+?)>$/)
      const senderName = senderMatch ? senderMatch[1].trim().replace(/['"]/g, '') : fromRaw
      const senderEmail = senderMatch ? senderMatch[2] : fromRaw

      results.push({
        id: msg.id,
        subject: headers.subject ?? '(no subject)',
        sender_name: senderName,
        sender_email: senderEmail,
        date: headers.date ?? new Date().toISOString(),
        snippet: msgData.snippet ?? '',
        body_preview: bodyPreview.slice(0, 500),
        signals,
        score: scoreSignals(signals),
        processed: false,
      })
    } catch (msgErr) {
      console.warn(`Failed to fetch Gmail message ${msg.id}:`, msgErr)
    }
  }

  return results
}

// ── GET Handler ───────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const hasGmailConnected = Boolean(GMAIL_ACCESS_TOKEN)

  if (hasGmailConnected) {
    try {
      const emails = await fetchGmailMessages()
      return NextResponse.json({
        emails,
        total: emails.length,
        has_gmail_connected: true,
        last_scanned: new Date().toISOString(),
      })
    } catch (err) {
      console.error('Gmail fetch failed, falling back to mock:', err)
    }
  }

  const mockEmails = getMockEmails()
  return NextResponse.json({
    emails: mockEmails,
    total: mockEmails.length,
    has_gmail_connected: false,
    last_scanned: new Date().toISOString(),
  })
}
