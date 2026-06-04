/**
 * POST /api/enrichment/batch — Batch enrich multiple contacts without email
 * No auth required (called by cron job)
 * Returns: { success: boolean, enriched: number, skipped: number, errors: string[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { credentials, airtableTables } from '@/app/lib/credentials'

const KEY = credentials.airtableApiKey
const BASE = credentials.airtableBaseId
const TBL = airtableTables.contacts
const AT = `https://api.airtable.com/v0/${BASE}`
const HDR = () => ({ Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' })
const HUNTER_KEY = credentials.hunterApiKey

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

async function enrichViaHunter(name: string, organization: string): Promise<{ email?: string; source: string; date: string } | null> {
  if (!HUNTER_KEY) return null

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
  try {
    console.log('[BATCH ENRICHMENT] Starting batch enrichment job at', new Date().toISOString())

    // Validate credentials
    if (!KEY || !BASE || !TBL) {
      console.error('[BATCH ENRICHMENT] Missing credentials:', { KEY: !!KEY, BASE: !!BASE, TBL: !!TBL })
      return NextResponse.json(
        { success: false, error: 'Missing Airtable credentials', details: 'API key or base ID not configured' },
        { status: 400 }
      )
    }

    console.log('[BATCH ENRICHMENT] Credentials validated. Fetching contacts without email...')

    // Fetch all contacts without email
    const listRes = await fetch(
      `${AT}/${TBL}?filterByFormula=${encodeURIComponent('{Email} = ""')}&fields[]=Name&fields[]=Organization&pageSize=50`,
      { headers: HDR() }
    )

    if (!listRes.ok) {
      const errText = await listRes.text()
      console.error('[BATCH ENRICHMENT] Failed to fetch contacts:', listRes.status, errText)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch contacts', status: listRes.status, details: errText },
        { status: 500 }
      )
    }

    const listData = await listRes.json()
    const contacts = listData.records || []

    console.log(`[BATCH ENRICHMENT] Found ${contacts.length} contacts without email`)

    let enriched = 0
    let skipped = 0
    const errors: string[] = []

    // Process each contact
    for (const record of contacts) {
      const { id, fields } = record
      const name = fields?.Name || ''
      const organization = fields?.Organization || ''

      if (!name) {
        skipped++
        continue
      }

      try {
        // Attempt enrichment
        const result = await enrichViaHunter(name, organization)

        if (!result) {
          skipped++
          continue
        }

        // Build PATCH payload
        const patchFields: Record<string, string> = {}
        if (result.email) patchFields['Email'] = result.email

        const notesEntry = `[Enriched via ${result.source} on ${new Date(result.date).toLocaleDateString()}: ${result.email}]`

        // Get current notes
        try {
          const getRes = await fetch(`${AT}/${TBL}/${id}`, { headers: HDR() })
          if (getRes.ok) {
            const getRecord = await getRes.json()
            const currentNotes = getRecord.fields?.Notes || ''
            patchFields['Notes'] = currentNotes ? `${currentNotes}\n${notesEntry}` : notesEntry
          }
        } catch (err) {
          console.warn(`Failed to fetch notes for ${id}:`, err)
          patchFields['Notes'] = notesEntry
        }

        // PATCH the contact
        const patchRes = await fetch(`${AT}/${TBL}/${id}`, {
          method: 'PATCH',
          headers: HDR(),
          body: JSON.stringify({ fields: patchFields }),
        })

        if (patchRes.ok) {
          enriched++
          console.log(`[BATCH ENRICHMENT] Enriched ${name}: ${result.email}`)
        } else {
          const errBody = await patchRes.text()
          errors.push(`Failed to patch ${id}: ${errBody}`)
          skipped++
        }
      } catch (err) {
        errors.push(`Error enriching ${id}: ${err}`)
        skipped++
      }

      // Rate limit: 1 request per second to avoid Hunter.io throttling
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log(`[BATCH ENRICHMENT] Complete: ${enriched} enriched, ${skipped} skipped`)

    return NextResponse.json({
      success: true,
      enriched,
      skipped,
      errors,
      total: contacts.length,
    })
  } catch (err) {
    console.error('Batch enrichment error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
