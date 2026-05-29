/**
 * POST /api/outreach/contacts
 *
 * Upserts a contact into the Airtable Subcontractors table (tblxyHqJihk9cJ0t9).
 * - If a record with the same legal_name already exists → returns { status: 'already_exists', id }
 * - Otherwise creates a new record → returns { status: 'created', id }
 *
 * Body: { company: string, state: string, city?: string, source: string, angle: string }
 */

import { NextResponse } from 'next/server'

const AIRTABLE_API_KEY =
  process.env.AIRTABLE_API_KEY ||
  'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92'
const AIRTABLE_BASE = 'appZhXnyFiKbnOZLr'
const AIRTABLE_TABLE = 'tblxyHqJihk9cJ0t9'
const BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`

const headers = {
  Authorization: `Bearer ${AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json()
    const { company, state, city, source, angle } = body as {
      company: string
      state: string
      city?: string
      source: string
      angle: string
    }

    if (!company || !state) {
      return NextResponse.json(
        { error: 'company and state are required' },
        { status: 400 }
      )
    }

    // ── 1. Check for existing record ──────────────────────────────────────────
    const formula = encodeURIComponent(`{legal_name}="${company.replace(/"/g, '\\"')}"`)
    const checkUrl = `${BASE_URL}?filterByFormula=${formula}&fields[]=legal_name&maxRecords=1`

    let existingId: string | null = null
    try {
      const checkRes = await fetch(checkUrl, { headers, next: { revalidate: 0 } })
      if (checkRes.ok) {
        const checkData = await checkRes.json()
        const records = checkData.records || []
        if (records.length > 0) {
          existingId = records[0].id
        }
      }
    } catch (err) {
      console.warn('Airtable lookup failed:', (err as Error).message)
      // Proceed to create — duplicate is safer than silent failure
    }

    if (existingId) {
      return NextResponse.json({ status: 'already_exists', id: existingId })
    }

    // ── 2. Create new record ──────────────────────────────────────────────────
    const notes = [
      angle,
      city ? `City: ${city}` : null,
      `Source: ${source}`,
    ]
      .filter(Boolean)
      .join(' | ')

    const createRes = await fetch(BASE_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        records: [
          {
            fields: {
              legal_name: company,
              state_of_inc: state,
              source: 'intelligence',
              notes,
            },
          },
        ],
      }),
    })

    if (!createRes.ok) {
      const errBody = await createRes.text()
      console.error('Airtable create failed:', createRes.status, errBody)
      return NextResponse.json(
        { status: 'error', message: `Airtable returned ${createRes.status}` },
        { status: 200 } // per spec: 200 even on partial failure
      )
    }

    const createData = await createRes.json()
    const newId = createData.records?.[0]?.id || ''

    return NextResponse.json({ status: 'created', id: newId })
  } catch (err) {
    console.error('/api/outreach/contacts error:', err)
    return NextResponse.json(
      { status: 'error', message: String(err) },
      { status: 200 } // per spec: 200 on partial failures
    )
  }
}
