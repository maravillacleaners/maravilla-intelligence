/**
 * GHL Sync API — ContractEdge Intelligence
 *
 * POST /api/ghl/sync
 * Body: { record_id: string }
 *
 * Takes an Airtable Intelligence record (a prime contractor or award) and
 * creates or updates the corresponding contact in GoHighLevel CRM.
 * After a successful sync it writes pipeline_status = 'Discovered' back
 * to the Airtable record and stores the GHL contact ID.
 */

import { NextResponse } from 'next/server'

const AIRTABLE_API_URL = 'https://api.airtable.com/v0'
const GHL_API_URL = 'https://rest.gohighlevel.com/v1'

const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appZhXnyFiKbnOZLr'
const TABLE_ID = 'tbl3qWHqunA0eERE2'

// ── Airtable helpers ──────────────────────────────────────────────────────────

async function fetchIntelligenceRecord(recordId: string): Promise<any | null> {
  const apiKey = process.env.AIRTABLE_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(
      `${AIRTABLE_API_URL}/${BASE_ID}/${TABLE_ID}/${recordId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    )
    if (!res.ok) {
      console.error(`[GHL Sync] Airtable fetch error ${res.status} for ${recordId}`)
      return null
    }
    return await res.json()
  } catch (err) {
    console.error('[GHL Sync] Airtable fetch failed:', err)
    return null
  }
}

async function updateAirtableRecord(
  recordId: string,
  fields: Record<string, any>
): Promise<boolean> {
  const apiKey = process.env.AIRTABLE_API_KEY
  if (!apiKey) return false

  try {
    const res = await fetch(
      `${AIRTABLE_API_URL}/${BASE_ID}/${TABLE_ID}/${recordId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      }
    )
    if (!res.ok) {
      console.error(`[GHL Sync] Airtable update error ${res.status}`)
      return false
    }
    return true
  } catch (err) {
    console.error('[GHL Sync] Airtable update failed:', err)
    return false
  }
}

// ── GHL helpers ───────────────────────────────────────────────────────────────

interface GHLContactPayload {
  firstName: string
  lastName: string
  name: string
  companyName: string
  email?: string
  tags: string[]
  customFields?: Array<{ id: string; field_value: string | number }>
  source: string
}

/**
 * Map an Airtable Intelligence record's fields to a GHL contact payload.
 * The awarded_contractor or legal_name becomes both name and company.
 */
function buildContactPayload(fields: Record<string, any>): GHLContactPayload {
  const contractorName =
    fields['awarded_contractor'] ||
    fields['legal_name'] ||
    fields['opportunity_title'] ||
    'Unknown Contractor'

  const nameParts = contractorName.trim().split(/\s+/)
  const firstName = nameParts[0] || contractorName
  const lastName = nameParts.slice(1).join(' ') || ''

  const naicsCode = String(fields['naics_code'] || '561720')
  const awardAmount = fields['award_amount'] || 0
  const placeOfPerformance = fields['place_of_performance'] || ''

  const tags = [
    'prime-contractor',
    `naics-${naicsCode}`,
    'fl-contract',
    'maravilla-intel',
  ]

  // Add set-aside tag if present
  const setAside = fields['set_asides'] || fields['set_aside_type'] || ''
  if (setAside && setAside.toLowerCase() !== 'none') {
    const normalized = setAside.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30)
    tags.push(`setaside-${normalized}`)
  }

  // Build custom fields array — GHL v1 custom fields are keyed by field key
  // We include as metadata; actual field IDs depend on the GHL account setup.
  // These will be ignored gracefully by GHL if not configured.
  const customFields: Array<{ id: string; field_value: string | number }> = [
    { id: 'award_amount', field_value: awardAmount },
    { id: 'naics_code', field_value: naicsCode },
    { id: 'place_of_performance', field_value: placeOfPerformance },
  ]

  return {
    firstName,
    lastName,
    name: contractorName,
    companyName: contractorName,
    ...(fields['business_email'] ? { email: fields['business_email'] } : {}),
    tags,
    customFields,
    source: 'maravilla-intelligence',
  }
}

/**
 * Search GHL for an existing contact by company name.
 * Returns the contact ID if found, null otherwise.
 */
async function searchGHLContact(
  companyName: string,
  locationId: string,
  apiKey: string
): Promise<string | null> {
  try {
    const query = encodeURIComponent(companyName.slice(0, 50))
    const res = await fetch(
      `${GHL_API_URL}/contacts/search?query=${query}&locationId=${locationId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.contacts?.[0]?.id || null
  } catch {
    return null
  }
}

/**
 * Create a new GHL contact. Returns the contact ID or null on failure.
 */
async function createGHLContact(
  payload: GHLContactPayload,
  locationId: string,
  apiKey: string
): Promise<string | null> {
  try {
    const res = await fetch(`${GHL_API_URL}/contacts/?locationId=${locationId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) {
      console.error(`[GHL Sync] Create contact error ${res.status}`)
      return null
    }
    const data = await res.json()
    return data.id || data.contact?.id || null
  } catch (err) {
    console.error('[GHL Sync] Create contact failed:', err)
    return null
  }
}

/**
 * Update an existing GHL contact. Returns success boolean.
 */
async function updateGHLContact(
  contactId: string,
  payload: Partial<GHLContactPayload>,
  locationId: string,
  apiKey: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `${GHL_API_URL}/contacts/${contactId}?locationId=${locationId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(12000),
      }
    )
    if (!res.ok) {
      console.error(`[GHL Sync] Update contact error ${res.status}`)
      return false
    }
    return true
  } catch (err) {
    console.error('[GHL Sync] Update contact failed:', err)
    return false
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { record_id } = body as { record_id?: string }

    if (!record_id) {
      return NextResponse.json(
        { error: 'Missing required field: record_id' },
        { status: 400 }
      )
    }

    // 1. Fetch the Airtable record
    const airtableRecord = await fetchIntelligenceRecord(record_id)
    if (!airtableRecord) {
      return NextResponse.json(
        { error: `Record ${record_id} not found in Intelligence table` },
        { status: 404 }
      )
    }

    const fields = airtableRecord.fields || {}
    const contactPayload = buildContactPayload(fields)

    // 2. Sync to GHL (with graceful mock fallback when credentials are absent)
    const ghlApiKey = process.env.GHL_API_KEY
    const ghlLocationId = process.env.GHL_LOCATION_ID || ''

    let ghlContactId: string
    let ghlAction: 'created' | 'updated' | 'mock'

    if (!ghlApiKey) {
      // No credentials — log and return a mock ID so the rest of the pipeline continues
      console.log(`[GHL Sync] No GHL_API_KEY — mock sync for "${contactPayload.companyName}"`)
      ghlContactId = `mock_${Date.now()}`
      ghlAction = 'mock'
    } else {
      // Try to find existing contact first
      const existingId = await searchGHLContact(
        contactPayload.companyName,
        ghlLocationId,
        ghlApiKey
      )

      if (existingId) {
        await updateGHLContact(existingId, contactPayload, ghlLocationId, ghlApiKey)
        ghlContactId = existingId
        ghlAction = 'updated'
      } else {
        const newId = await createGHLContact(contactPayload, ghlLocationId, ghlApiKey)
        if (!newId) {
          return NextResponse.json(
            { error: 'Failed to create GHL contact — check GHL_API_KEY and GHL_LOCATION_ID' },
            { status: 502 }
          )
        }
        ghlContactId = newId
        ghlAction = 'created'
      }
    }

    // 3. Write back to Airtable: pipeline_status = 'Discovered' + ghl_contact_id
    const updateFields: Record<string, any> = {
      pipeline_status: 'Discovered',
      ghl_contact_id: ghlContactId,
      ghl_synced_at: new Date().toISOString(),
    }

    const updated = await updateAirtableRecord(record_id, updateFields)

    console.log(
      `[API /ghl/sync] record=${record_id} ghl_contact=${ghlContactId} action=${ghlAction} airtable_updated=${updated}`
    )

    return NextResponse.json({
      success: true,
      record_id,
      ghl_contact_id: ghlContactId,
      ghl_action: ghlAction,
      pipeline_status: 'Discovered',
      airtable_updated: updated,
      contact_name: contactPayload.companyName,
      tags: contactPayload.tags,
      synced_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[API /ghl/sync] Error:', err)
    return NextResponse.json(
      { error: 'GHL sync failed', details: String(err) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    description: 'POST { record_id } to sync an Intelligence record to GoHighLevel CRM',
    env_required: ['GHL_API_KEY', 'GHL_LOCATION_ID'],
    env_configured: {
      ghl_api_key: !!process.env.GHL_API_KEY,
      ghl_location_id: !!process.env.GHL_LOCATION_ID,
      airtable_api_key: !!process.env.AIRTABLE_API_KEY,
    },
  })
}
