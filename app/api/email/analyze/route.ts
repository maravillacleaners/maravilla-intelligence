/**
 * Email Analysis API
 * POST – Analyze an email for government contract intelligence via Claude.
 *        When intent_score > 60, saves each detected opportunity to Airtable
 *        Opportunities table (tbldTDb1v79dVNCTQ).
 */

import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const AIRTABLE_API_KEY = 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92'
const AIRTABLE_BASE_ID = 'appZhXnyFiKbnOZLr'
const AIRTABLE_TABLE_ID = 'tbldTDb1v79dVNCTQ'
const AIRTABLE_BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`

// ── Types ─────────────────────────────────────────────────────────────────────

interface DetectedOpportunity {
  title: string
  agency: string
  deadline: string | null
  estimated_value: number | null
  description: string
}

interface ClaudeAnalysis {
  intent_score: number          // 0-100
  signal_type: string           // e.g. 'bid_opportunity', 'contract_renewal', etc.
  entities: {
    people: { name: string; role: string; company: string }[]
    companies: { name: string; type: string; address: string }[]
  }
  summary: string
  opportunities_detected: DetectedOpportunity[]
}

interface SavedRecord {
  airtable_id: string
  title: string
}

// ── Heuristic fallback (no API key) ──────────────────────────────────────────

function scoreWithHeuristics(subject: string, body: string, sender: string): ClaudeAnalysis {
  const text = `${subject} ${body}`.toLowerCase()
  const keywords = [
    'rfp', 'rfq', 'bid', 'proposal', 'contract', 'solicitation',
    'janitorial', 'cleaning', 'custodial',
  ]
  const hits = keywords.filter((kw) => text.includes(kw))
  const intent_score = Math.min(hits.length * 15, 85)

  const signal_type = hits.some((k) => ['rfp', 'rfq', 'bid', 'solicitation'].includes(k))
    ? 'bid_opportunity'
    : hits.some((k) => ['contract'].includes(k))
    ? 'contract_renewal'
    : 'general_inquiry'

  // Extract agency from sender domain (e.g. "browardschools.com" → "Browardschools")
  const domain = sender.split('@')[1] ?? ''
  const agencyGuess = domain.split('.')[0]
    ? domain.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Unknown Agency'

  const opportunities: DetectedOpportunity[] = intent_score > 0
    ? [
        {
          title: subject || 'Cleaning Services Opportunity',
          agency: agencyGuess,
          deadline: null,
          estimated_value: null,
          description: `Keyword-matched signal from email. Hits: ${hits.join(', ')}`,
        },
      ]
    : []

  return {
    intent_score,
    signal_type,
    entities: { people: [], companies: [] },
    summary: `Heuristic analysis detected ${hits.length} keyword(s): ${hits.join(', ') || 'none'}. Intent score: ${intent_score}/100.`,
    opportunities_detected: opportunities,
  }
}

// ── Claude Analysis ───────────────────────────────────────────────────────────

async function analyzeWithClaude(
  subject: string,
  body: string,
  sender: string
): Promise<ClaudeAnalysis> {
  if (!ANTHROPIC_API_KEY) {
    return scoreWithHeuristics(subject, body, sender)
  }

  const prompt = `You are a government contract intelligence analyst specializing in janitorial/cleaning contracts.

Analyze this email and extract structured intelligence. Return ONLY valid JSON with no markdown fences.

JSON schema:
{
  "intent_score": <integer 0-100, likelihood this email relates to a cleaning contract opportunity>,
  "signal_type": <one of: "bid_opportunity" | "contract_renewal" | "expansion" | "vendor_issue" | "urgent" | "complaint" | "inspection" | "new_location" | "general_inquiry">,
  "entities": {
    "people": [{"name": string, "role": string, "company": string}],
    "companies": [{"name": string, "type": string, "address": string}]
  },
  "summary": <1-2 sentence summary of the email signal>,
  "opportunities_detected": [
    {
      "title": <descriptive title for the procurement opportunity>,
      "agency": <agency or company name>,
      "deadline": <ISO date string YYYY-MM-DD or null>,
      "estimated_value": <numeric dollar value or null>,
      "description": <brief scope/description>
    }
  ]
}

If no opportunities are detected, set opportunities_detected to [].
Set intent_score > 60 only if there is a genuine government or commercial cleaning contract opportunity.

Email:
From: ${sender}
Subject: ${subject}

${body}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    console.warn('Claude API error:', res.status, '— falling back to heuristics')
    return scoreWithHeuristics(subject, body, sender)
  }

  const data = await res.json()
  const text: string = data?.content?.[0]?.text ?? ''

  try {
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    return JSON.parse(cleaned) as ClaudeAnalysis
  } catch {
    console.warn('Failed to parse Claude JSON — falling back to heuristics')
    return scoreWithHeuristics(subject, body, sender)
  }
}

// ── Airtable: save one opportunity record ─────────────────────────────────────

async function saveOpportunityToAirtable(
  opp: DetectedOpportunity,
  analysis: ClaudeAnalysis,
  subject: string
): Promise<SavedRecord | null> {
  try {
    const signalScore = analysis.intent_score
    const fields: Record<string, unknown> = {
      bid_id: `EMAIL_${Date.now()}`,
      title: opp.title || subject || 'Email-sourced Opportunity',
      agency: opp.agency || '',
      status: 'New',
      source: 'email_intel',
      scope_summary: opp.description || analysis.summary || '',
      naics_codes: '561720',
      cleaning_keywords: 'janitorial, cleaning, custodial',
      score: Math.min(signalScore, 100),
      signal_strength: signalScore >= 75 ? 'High' : signalScore >= 50 ? 'Medium' : 'Low',
    }

    // Optional fields — only include when present
    if (opp.deadline) fields.deadline = opp.deadline
    if (opp.estimated_value != null) fields.estimated_value = opp.estimated_value

    const res = await fetch(AIRTABLE_BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.warn('Airtable create failed:', res.status, errText)
      return null
    }

    const record = await res.json()
    return { airtable_id: record.id, title: opp.title }
  } catch (err) {
    console.warn('Airtable save error (non-fatal):', err)
    return null
  }
}

// ── POST Handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()

    const {
      subject,
      sender,
      body: emailBody,
      thread_id,
    } = body as {
      subject?: string
      sender?: string
      body?: string
      thread_id?: string
    }

    if (!subject || !emailBody) {
      return NextResponse.json(
        { success: false, error: 'subject and body are required' },
        { status: 400 }
      )
    }

    const analysis = await analyzeWithClaude(
      subject,
      emailBody,
      sender ?? ''
    )

    const records: SavedRecord[] = []

    if (analysis.intent_score > 60 && analysis.opportunities_detected.length > 0) {
      // Save each detected opportunity to Airtable in parallel
      const results = await Promise.all(
        analysis.opportunities_detected.map((opp) =>
          saveOpportunityToAirtable(opp, analysis, subject)
        )
      )
      for (const r of results) {
        if (r !== null) records.push(r)
      }
    }

    return NextResponse.json({
      success: true,
      analysis,
      opportunities_saved: records.length,
      records,
      thread_id: thread_id ?? null,
      analyzed_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Email analyze error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(err) },
      { status: 500 }
    )
  }
}
