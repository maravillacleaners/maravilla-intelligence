/**
 * POST /api/contacts/highergov
 * Pulls government buyers from HigherGov API → creates Avatar records
 * GET  → returns { configured: boolean, description }
 */

import { NextResponse } from 'next/server'
import { writeSyncLog } from '@/lib/sync-log'

const KEY  = process.env.AIRTABLE_API_KEY!
const BASE = process.env.AIRTABLE_BASE_ID!
const TBL_AVATARS = 'tblrIv6lKjsMeUcyU'

const AT  = `https://api.airtable.com/v0/${BASE}`
const HDR = () => ({ Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' })
const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

function normalizeEntityKey(name: string): string {
  return 'company:' + name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 120)
}

async function atList(table: string, formula: string, maxRecords = 1): Promise<any[]> {
  const p = new URLSearchParams({ filterByFormula: formula, maxRecords: String(maxRecords) })
  const res = await fetch(`${AT}/${table}?${p}`, { headers: HDR() })
  if (!res.ok) return []
  const data = await res.json()
  return data.records || []
}

async function atCreate(table: string, fields: Record<string, any>): Promise<any> {
  const res = await fetch(`${AT}/${table}`, {
    method: 'POST', headers: HDR(),
    body: JSON.stringify({ fields, typecast: true }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Airtable ${res.status}: ${errText.slice(0, 200)}`)
  }
  return res.json()
}

async function avatarExistsByEmail(email: string): Promise<boolean> {
  if (!email) return false
  const safe = email.replace(/"/g, '\\"')
  const recs = await atList(TBL_AVATARS, `{Email}="${safe}"`, 1)
  return recs.length > 0
}

export async function GET() {
  const configured = !!(process.env.HIGHERGOV_API_KEY && process.env.HIGHERGOV_API_KEY.length >= 8)
  return NextResponse.json({
    configured,
    description: 'Pulls government buyers and procurement officers from HigherGov',
    setup_note: configured
      ? 'HIGHERGOV_API_KEY is set'
      : 'Add HIGHERGOV_API_KEY to your environment variables to enable this source',
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const { dry_run = false } = body

  if (!process.env.HIGHERGOV_API_KEY || process.env.HIGHERGOV_API_KEY.length < 8) {
    return NextResponse.json({
      ok: false,
      error: 'HIGHERGOV_API_KEY not configured — add it in Settings → Government Data',
      configured: false,
    }, { status: 400 })
  }

  const startMs = Date.now()
  let contacts_created = 0
  let contacts_skipped = 0
  const errors: string[] = []

  let people: any[] = []
  try {
    // HigherGov API — correct endpoint: /api-external/people/ + ?api_key=KEY
    const hgKey = process.env.HIGHERGOV_API_KEY
    const res = await fetch(
      `https://www.highergov.com/api-external/people/?api_key=${hgKey}&naics_code=561720&page_size=50`,
      { method: 'GET', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) }
    )

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({
        ok: false,
        error: 'Invalid HigherGov API key',
        configured: true,
      }, { status: 401 })
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`HigherGov HTTP ${res.status}: ${errText.slice(0, 200)}`)
    }

    const data = await res.json()
    // HigherGov returns { results: [...] }
    people = data.results || []
  } catch (err: any) {
    errors.push(`HigherGov fetch error: ${err.message}`)
    return NextResponse.json({
      ok: false,
      contacts_created: 0,
      contacts_skipped: 0,
      errors,
      configured: true,
    }, { status: 502 })
  }

  for (const person of people) {
    // HigherGov fields: contact_name, contact_email, contact_title, contact_phone, agency.agency_name
    const full_name = (
      person.contact_name ||
      [person.contact_first_name, person.contact_last_name].filter(Boolean).join(' ') ||
      person.name ||
      [person.first_name, person.last_name].filter(Boolean).join(' ')
    ).trim()

    const email        = (person.contact_email || person.email || '').trim()
    const agency_name  = (person.agency?.agency_name || person.agency_name || person.organization || '').trim()
    const entity_name  = agency_name || full_name
    if (!entity_name || entity_name.length < 2) {
      contacts_skipped++
      continue
    }

    // Deduplicate by email if we have one
    if (email) {
      try {
        const exists = await avatarExistsByEmail(email)
        if (exists) {
          contacts_skipped++
          continue
        }
      } catch (err: any) {
        errors.push(`Airtable check error for ${email}: ${err.message}`)
        contacts_skipped++
        continue
      }
    }

    const entity_key = normalizeEntityKey(entity_name)

    const notes = [
      person.contact_type ? `Type: ${person.contact_type}.` : '',
      person.path        ? `Profile: ${person.path}` : '',
      'NAICS specialty: 561720 (Janitorial)',
    ].filter(Boolean).join(' ')

    if (!dry_run) {
      try {
        const avatarType = person.contact_type === 'federal'
          ? 'government_buyer' : person.contact_type === 'sled'
          ? 'facilities_manager' : 'government_buyer'
        await atCreate(TBL_AVATARS, {
          Name:         full_name || 'Unknown',
          Title:        person.contact_title || person.title || '',
          Email:        email || '',
          Organization: agency_name || '',
          Entity_Key:   entity_key,
          Source:       'highergov',
          Status:       'Active',
          Avatar_Type:  avatarType,
          Notes:        notes.slice(0, 500),
          Last_Seen:    new Date().toISOString().split('T')[0],
        })
        contacts_created++
        await delay(300)
      } catch (err: any) {
        errors.push(`Airtable create error for ${full_name}: ${err.message}`)
      }
    } else {
      contacts_created++ // dry_run preview
    }
  }

  writeSyncLog('highergov', {
    records_created: contacts_created,
    records_updated: 0,
    errors: errors.length,
    error_messages: errors.slice(0, 5),
    duration_ms: Date.now() - startMs,
    metadata: { people_fetched: people.length, contacts_skipped },
  })

  return NextResponse.json({
    ok: true,
    dry_run,
    contacts_created,
    contacts_skipped,
    errors: errors.slice(0, 10),
    configured: true,
  })
}
