/**
 * Public Awards Alias — ContractEdge Intelligence
 *
 * GET /api/v1/awards?range=90d&type=all
 *
 * Publicly accessible alias for /api/awards that requires an API key
 * in the X-API-Key header. Intended for consumption by n8n, external
 * partner tools, and webhook automations.
 *
 * The API key is validated against the PUBLIC_API_KEY env variable.
 * If PUBLIC_API_KEY is not set, the endpoint operates in open mode
 * (with a warning logged) so development is not blocked.
 */

import { NextResponse } from 'next/server'

const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appZhXnyFiKbnOZLr'
const TABLE_ID = 'tbl3qWHqunA0eERE2'
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
const PUBLIC_API_KEY = process.env.PUBLIC_API_KEY

// ── Auth helper ───────────────────────────────────────────────────────────────

function validateApiKey(req: Request): { valid: boolean; reason?: string } {
  if (!PUBLIC_API_KEY) {
    // No key configured — allow through but log a warning
    console.warn('[v1/awards] PUBLIC_API_KEY not set — endpoint is unauthenticated')
    return { valid: true }
  }

  const provided = req.headers.get('X-API-Key') || req.headers.get('x-api-key')

  if (!provided) {
    return { valid: false, reason: 'Missing X-API-Key header' }
  }

  if (provided !== PUBLIC_API_KEY) {
    return { valid: false, reason: 'Invalid API key' }
  }

  return { valid: true }
}

// ── Award-fetching logic (mirrors /api/awards) ────────────────────────────────

function inferScope(source: string | null): 'federal' | 'state' | 'local' {
  if (!source) return 'federal'
  const s = source.toLowerCase()
  if (s.includes('usaspending') || s.includes('federal') || s.includes('sam')) return 'federal'
  if (s.includes('state') || s.includes('fl ') || s.includes('florida')) return 'state'
  return 'local'
}

function crmStatus(
  ps: string | null
): 'in-crm-active' | 'in-crm-stale' | 'not-in-crm' | 'rejected' {
  if (!ps) return 'not-in-crm'
  const s = ps.toLowerCase()
  if (s.includes('reject') || s.includes('lost')) return 'rejected'
  if (s.includes('stal') || s.includes('cold')) return 'in-crm-stale'
  if (
    s.includes('activ') ||
    s.includes('contact') ||
    s.includes('qualified') ||
    s.includes('approved') ||
    s.includes('discover')
  )
    return 'in-crm-active'
  return 'not-in-crm'
}

function parsePlace(raw: string | null): { city: string; state: string } {
  if (!raw) return { city: '', state: '' }
  const parts = raw.split(',').map((s) => s.trim())
  return { city: parts[0] || '', state: parts[1] || '' }
}

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  // 1. Validate API key
  const auth = validateApiKey(req)
  if (!auth.valid) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        reason: auth.reason,
        hint: 'Provide a valid X-API-Key header. Contact Maravilla Intelligence to obtain a key.',
      },
      { status: 401 }
    )
  }

  if (!AIRTABLE_API_KEY) {
    return NextResponse.json(
      { error: 'Server configuration error: AIRTABLE_API_KEY not set' },
      { status: 503 }
    )
  }

  // 2. Parse query params (same as /api/awards)
  const { searchParams } = new URL(req.url)
  const range = searchParams.get('range') || '90d'
  const type = searchParams.get('type') || 'all'
  const days =
    range === '7d' ? 7 : range === '30d' ? 30 : range === '1y' ? 365 : 90
  const since = new Date(Date.now() - days * 86400000)
    .toISOString()
    .split('T')[0]

  // 3. Fetch from Airtable
  try {
    const fields = [
      'awarded_contractor',
      'website',
      'agency',
      'award_amount',
      'award_date',
      'naics_code',
      'set_asides',
      'place_of_performance',
      'pipeline_status',
      'score',
      'source',
      'opportunity_title',
      'legal_name',
      'record_type',
      'discovery_date',
      'ghl_contact_id',
    ]
      .map((f) => `fields[]=${encodeURIComponent(f)}`)
      .join('&')

    const filter = encodeURIComponent(
      `AND(NOT({discovery_date}=''), {discovery_date}>='${since}', OR(NOT({awarded_contractor}=''), NOT({opportunity_title}='')))`
    )
    const url =
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?` +
      `${fields}&filterByFormula=${filter}&pageSize=100` +
      `&sort[0][field]=discovery_date&sort[0][direction]=desc`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      next: { revalidate: 120 },
    })

    if (!res.ok) throw new Error(`Airtable error ${res.status}`)
    const data = await res.json()

    const awards = (data.records || [])
      .filter(
        (rec: any) =>
          rec.fields['awarded_contractor'] ||
          rec.fields['legal_name'] ||
          rec.fields['opportunity_title']
      )
      .map((rec: any) => {
        const f = rec.fields
        const ps = f['pipeline_status']
        const psName = typeof ps === 'object' ? ps?.name : ps

        const prime =
          f['awarded_contractor'] ||
          f['legal_name'] ||
          f['opportunity_title'] ||
          'Unknown'
        const effectiveDate =
          f['award_date'] ||
          f['discovery_date'] ||
          new Date().toISOString().split('T')[0]

        return {
          id: rec.id,
          prime,
          primeDomain: (f['website'] || '')
            .replace(/^https?:\/\//, '')
            .replace(/\/$/, ''),
          agency:
            typeof f['agency'] === 'object'
              ? f['agency']?.name
              : f['agency'] || 'Federal Agency',
          scope: inferScope(f['source']),
          amount: f['award_amount'] || 0,
          awardDate: effectiveDate,
          naics: f['naics_code'] || '561720',
          setAside: f['set_asides'] || 'Open Competition',
          place: parsePlace(f['place_of_performance']),
          crmStatus: crmStatus(psName),
          crmStage: psName || undefined,
          ghlContactId: f['ghl_contact_id'] || null,
        }
      })

    // Apply type filter
    const filtered =
      type === 'prime'
        ? awards.filter((a: any) => a.amount > 500000)
        : type === 'sub'
          ? awards.filter((a: any) => a.amount <= 500000)
          : awards

    return NextResponse.json({
      awards: filtered,
      meta: {
        count: filtered.length,
        range,
        type,
        since,
        api_version: '1.0',
        generated_at: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('[/api/v1/awards] Error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch awards', details: String(err) },
      { status: 500 }
    )
  }
}
