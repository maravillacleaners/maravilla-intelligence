/**
 * POST /api/enrichment/verify-email
 * Hunter.io Email Verifier
 *
 * Verifies if a specific email address is valid and deliverable
 * Body: { email: string }
 * Returns: { valid, confidence, result }
 */

import { NextResponse } from 'next/server'
import { verifyEmail } from '@/lib/scrapers/hunter-io-combined'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body as { email: string }

    if (!email) {
      return NextResponse.json(
        { error: 'email is required' },
        { status: 400 }
      )
    }

    const result = await verifyEmail(email)

    if (!result) {
      return NextResponse.json(
        { error: 'Email verification failed or API key not configured' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      email,
      data: result,
    })
  } catch (err) {
    console.error('[API /enrichment/verify-email] Error:', err)
    return NextResponse.json(
      { error: 'Email verification failed', details: String(err) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    description: 'POST { email: string } to verify email deliverability',
    examples: [
      {
        method: 'POST',
        body: { email: 'john@example.com' },
        returns: {
          ok: true,
          email: 'john@example.com',
          data: { valid: true, confidence: 'high', result: 'deliverable' },
        },
      },
    ],
  })
}
