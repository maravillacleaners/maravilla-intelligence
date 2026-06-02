/**
 * POST /api/enrichment — Enrich contact with missing data
 * Body: { contactId: string, name: string, organization: string, email?: string }
 * Uses: Hunter.io email finder, then Airtable PATCH
 * Returns: { success: boolean, enriched?: { email?, enrichment_source, enrichment_date }, reason?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { credentials, airtableTables } from '@/app/lib/credentials'
import { authMiddleware } from '@/app/lib/auth-middleware'

const KEY = credentials.airtableApiKey
const BASE = credentials.airtableBaseId
const TBL = airtableTables.contacts
const AT = `https://api.airtable.com/v0/${BASE}`
const HDR = () => ({ Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' })
const HUNTER_KEY = credentials.hunterApiKey

// Extract domain from organization name by removing common words and slugifying
function extractDomain(org: string): string {
  if (!org) return ''

  const stopwords = ['llc', 'inc', 'corp', 'corporation', 'company', 'ltd', 'limited', 'us', 'usa', 'department', 'of', 'the', 'and', '&']
  const isGov = /government|federal|department|agency|corps|bureau/i.test(org)

  let cleaned = org
    .toLowerCase()
    .split(/\s+/)
    .filter(w => !stopwords.includes(w))
    .join('-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  if (!cleaned) return ''
  return `${cleaned}.${isGov ? 'gov' : 'com'}`
}

async function enrichViaHunter(name: string, organization: string, currentEmail?: string): Promise<{ email?: string; source: string; date: string } | null> {
  if (!HUNTER_KEY || currentEmail) return null

  const domain = extractDomain(organization)
  if (!domain) return null

  try {
    const url = `https://api.hunter.io/v2/email-finder?full_name=${encodeURIComponent(name)}&domain=${encodeURIComponent(domain)}&api_key=${encodeURIComponent(HUNTER_KEY)}`
    const res = await fetch(url)

    if (!res.ok) {
      console.warn(`Hunter.io request failed: ${res.status}`)
      return null
    }

    const data = await res.json()

    // Hunter.io returns: { data: { email?: string, confidence?: number, ... }, ... }
    if (data.data?.email && data.data.confidence >= 50) {
      return {
        email: data.data.email,
        source: 'hunter.io',
        date: new Date().toISOString(),
      }
    }

    return null
  } catch (err) {
    console.error('Hunter.io enrichment error:', err)
    return null
  }
}

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req)
  if (authError) return authError

  try {
    const { contactId, name, organization, email } = await req.json()

    if (!contactId || !name) {
      return NextResponse.json(
        { error: 'Missing contactId or name' },
        { status: 400 }
      )
    }

    // Attempt enrichment via Hunter.io
    const enriched = await enrichViaHunter(name, organization, email)

    if (!enriched) {
      return NextResponse.json({
        success: false,
        reason: 'no_result',
      })
    }

    // Build PATCH payload with enriched data
    const fields: Record<string, string> = {}
    if (enriched.email) fields['Email'] = enriched.email

    // Always append to Notes field
    const notesEntry = `[Enriched via ${enriched.source} on ${new Date(enriched.date).toLocaleDateString()}: ${enriched.email || 'no email found'}]`

    try {
      // Get current notes
      const getRes = await fetch(`${AT}/${TBL}/${contactId}`, { headers: HDR() })
      if (getRes.ok) {
        const record = await getRes.json()
        const currentNotes = record.fields?.Notes || ''
        fields['Notes'] = currentNotes ? `${currentNotes}\n${notesEntry}` : notesEntry
      }
    } catch (err) {
      console.warn('Failed to fetch current notes:', err)
      fields['Notes'] = notesEntry
    }

    // PATCH the contact
    const patchRes = await fetch(`${AT}/${TBL}/${contactId}`, {
      method: 'PATCH',
      headers: HDR(),
      body: JSON.stringify({ fields }),
    })

    if (!patchRes.ok) {
      const errBody = await patchRes.text()
      console.error('Airtable PATCH failed:', errBody)
      return NextResponse.json(
        { error: 'Failed to update contact' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      enriched: {
        email: enriched.email,
        enrichment_source: enriched.source,
        enrichment_date: enriched.date,
      },
    })
  } catch (err) {
    console.error('Enrichment API error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
