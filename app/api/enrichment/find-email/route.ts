/**
 * POST /api/enrichment/find-email
 * Hunter.io Email Finder
 *
 * Finds email address for a person at a specific company domain
 * Body: { firstName: string, lastName: string, domain: string }
 * Returns: { email, confidence, pattern }
 */

import { NextResponse } from 'next/server'
import { findEmail } from '@/lib/scrapers/hunter-io-combined'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { firstName, lastName, domain } = body as {
      firstName: string
      lastName: string
      domain: string
    }

    if (!firstName || !lastName || !domain) {
      return NextResponse.json(
        { error: 'firstName, lastName, and domain are required' },
        { status: 400 }
      )
    }

    const result = await findEmail(firstName, lastName, domain)

    if (!result) {
      return NextResponse.json(
        { error: 'Email not found or API key not configured' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      person: { firstName, lastName, domain },
      data: result,
    })
  } catch (err) {
    console.error('[API /enrichment/find-email] Error:', err)
    return NextResponse.json(
      { error: 'Email lookup failed', details: String(err) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    description: 'POST { firstName: string, lastName: string, domain: string } to find email',
    examples: [
      {
        method: 'POST',
        body: { firstName: 'John', lastName: 'Doe', domain: 'example.com' },
        returns: {
          ok: true,
          person: { firstName: 'John', lastName: 'Doe', domain: 'example.com' },
          data: { email: 'john.doe@example.com', confidence: 85, pattern: '{first}.{last}' },
        },
      },
    ],
  })
}
