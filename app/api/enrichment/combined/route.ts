/**
 * POST /api/enrichment/combined
 * Hunter.io Combined API endpoint
 *
 * Fetches person + company + email patterns in one call
 * Body: { domain: string, firstName?: string, lastName?: string }
 * Returns: person, company, emails, email_pattern, confidence
 */

import { NextResponse } from 'next/server'
import { searchCombined, verifyEmail, findEmail, type CombinedResult } from '@/lib/scrapers/hunter-io-combined'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { domain, firstName, lastName } = body as {
      domain: string
      firstName?: string
      lastName?: string
    }

    if (!domain) {
      return NextResponse.json(
        { error: 'domain is required' },
        { status: 400 }
      )
    }

    const result = await searchCombined(domain, firstName, lastName)

    if (!result) {
      return NextResponse.json(
        { error: 'Hunter.io query failed or API key not configured' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      data: result,
    })
  } catch (err) {
    console.error('[API /enrichment/combined] Error:', err)
    return NextResponse.json(
      { error: 'Combined enrichment failed', details: String(err) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    description: 'POST { domain: string, firstName?: string, lastName?: string } to fetch person + company + emails',
    examples: [
      {
        method: 'POST',
        body: { domain: 'google.com', firstName: 'Sheryl', lastName: 'Sandberg' },
        returns: {
          ok: true,
          data: {
            person: { firstName: 'Sheryl', lastName: 'Sandberg', email: 'sheryl@google.com' },
            company: { name: 'Google', domain: 'google.com', size: 'Large', industry: 'Technology' },
            emails: [{ email: 'sheryl@google.com', pattern: '{first}.{last}', confidence: 95 }],
            email_pattern: '{first}.{last}',
            confidence: 95,
          },
        },
      },
    ],
  })
}
