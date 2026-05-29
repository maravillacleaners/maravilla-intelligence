/**
 * Email / Domain Enrichment API
 * POST { companyName: string, domain?: string, email?: string }
 * Returns { email_patterns, domain, estimated_contacts, source: 'real'|'inferred' }
 *
 * Strategy:
 * 1. Resolve domain from provided domain/email/company name
 * 2. Try Hunter.io if HUNTER_API_KEY is set
 * 3. Fallback: infer common email patterns from domain
 * 4. Try Google Places if GOOGLE_PLACES_API_KEY is set for physical presence check
 */

const HUNTER_API_KEY = process.env.HUNTER_API_KEY
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY
const AIRTABLE_API_URL = 'https://api.airtable.com/v0'

// ── Domain Inference ──────────────────────────────────────────────────────────

/**
 * Derive a best-guess .com domain from a company name.
 * Strips common legal suffixes, normalises, collapses whitespace.
 */
async function inferDomain(companyName: string): Promise<string | null> {
  const clean = companyName
    .toLowerCase()
    .replace(
      /\b(llc|inc|corp|ltd|co|group|services|solutions|industries|associates|international|federal|government|contracting|contractors|management|enterprises|systems|technology|technologies|consulting|consultants|company|companies)\b/g,
      ''
    )
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '')

  return clean.length > 2 ? `${clean}.com` : null
}

/**
 * Extract domain from an email address string.
 */
function extractDomainFromEmail(email: string): string | null {
  const parts = email.split('@')
  if (parts.length === 2 && parts[1].includes('.')) {
    return parts[1].toLowerCase()
  }
  return null
}

// ── Hunter.io Integration ─────────────────────────────────────────────────────

interface HunterResult {
  email_patterns: string[]
  estimated_contacts: number
  organization?: string
  source: 'hunter'
}

async function queryHunter(domain: string): Promise<HunterResult | null> {
  if (!HUNTER_API_KEY) return null

  try {
    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${HUNTER_API_KEY}&limit=5`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })

    if (!res.ok) {
      console.warn(`[Enrich] Hunter.io returned ${res.status} for ${domain}`)
      return null
    }

    const json = await res.json()
    const data = json?.data

    if (!data) return null

    // Deduplicate patterns from returned emails
    const patternSet = new Set<string>()

    if (data.pattern) {
      // Hunter returns a pattern like "{first}.{last}" — convert to example format
      const example = data.pattern
        .replace('{first}', 'firstname')
        .replace('{last}', 'lastname')
        .replace('{f}', 'f')
        .replace('{l}', 'l')
      patternSet.add(`${example}@${domain}`)
    }

    // Also add patterns inferred from actual emails found
    if (Array.isArray(data.emails)) {
      for (const entry of data.emails.slice(0, 5)) {
        if (entry.value) patternSet.add(entry.value)
      }
    }

    // Fallback pattern if nothing returned
    if (patternSet.size === 0) {
      patternSet.add(`info@${domain}`)
      patternSet.add(`contact@${domain}`)
    }

    return {
      email_patterns: Array.from(patternSet),
      estimated_contacts: data.emails?.length || 0,
      organization: data.organization,
      source: 'hunter',
    }
  } catch (err) {
    console.warn(`[Enrich] Hunter.io query failed for ${domain}:`, err)
    return null
  }
}

// ── Fallback Pattern Inference ────────────────────────────────────────────────

interface InferredResult {
  email_patterns: string[]
  estimated_contacts: number
  source: 'inferred'
}

function inferEmailPatterns(domain: string, companyName: string): InferredResult {
  // Most common B2B email patterns, ordered by frequency in government contracting space
  const patterns = [
    `firstname.lastname@${domain}`,
    `firstname@${domain}`,
    `f.lastname@${domain}`,
    `info@${domain}`,
    `contact@${domain}`,
    `contracts@${domain}`,
    `bids@${domain}`,
  ]

  // If company name has government/federal signals, add compliance-style patterns
  const nameLower = companyName.toLowerCase()
  if (
    nameLower.includes('federal') ||
    nameLower.includes('gov') ||
    nameLower.includes('defense') ||
    nameLower.includes('military')
  ) {
    patterns.splice(4, 0, `contracts@${domain}`, `procurement@${domain}`)
  }

  return {
    email_patterns: [...new Set(patterns)].slice(0, 6),
    estimated_contacts: 0,
    source: 'inferred',
  }
}

// ── Google Places Physical Presence Check ─────────────────────────────────────

async function checkPhysicalPresence(
  companyName: string,
  domain: string
): Promise<boolean> {
  if (!GOOGLE_PLACES_API_KEY) {
    // Heuristic fallback: .gov / .mil domains almost always have physical presence
    // Generic company domains — assume true (most government contractors have offices)
    if (domain.endsWith('.gov') || domain.endsWith('.mil')) return true
    return true // optimistic default for government contractors
  }

  try {
    const query = encodeURIComponent(companyName)
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=place_id,name&key=${GOOGLE_PLACES_API_KEY}`
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) })

    if (!res.ok) return true // optimistic on API error

    const json = await res.json()
    return (
      json.status === 'OK' &&
      Array.isArray(json.candidates) &&
      json.candidates.length > 0
    )
  } catch {
    return true // optimistic on timeout/error
  }
}

// ── Size Estimation ───────────────────────────────────────────────────────────

function estimateSize(
  hunterContacts: number,
  companyName: string
): string {
  if (hunterContacts >= 500) return 'Large (500+ employees)'
  if (hunterContacts >= 100) return 'Mid-size (100-500 employees)'
  if (hunterContacts >= 20) return 'Small (20-100 employees)'

  // Name-based heuristics for government contractors
  const nameLower = companyName.toLowerCase()
  if (nameLower.includes('international') || nameLower.includes('global')) {
    return 'Mid-size (100-500 employees)'
  }
  if (
    nameLower.includes('enterprise') ||
    nameLower.includes('systems') ||
    nameLower.includes('technologies')
  ) {
    return 'Small-Mid (50-200 employees)'
  }
  return 'Small (10-50 employees)'
}

// ── Airtable Helpers ──────────────────────────────────────────────────────────

async function fetchAirtableRecord(recordId: string): Promise<any | null> {
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID
  if (!apiKey || !baseId) return null

  try {
    const res = await fetch(
      `${AIRTABLE_API_URL}/${baseId}/Intelligence/${recordId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    )
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// ── Core Enrichment Logic ─────────────────────────────────────────────────────

export interface EnrichmentResponse {
  email_patterns: string[]
  domain: string | null
  estimated_contacts: number
  estimated_size: string
  has_physical_location: boolean
  organization?: string
  source: 'hunter' | 'inferred'
  enriched_at: string
}

async function enrichDomain(
  domain: string,
  companyName: string
): Promise<EnrichmentResponse> {
  const [hunterResult, hasPhysical] = await Promise.all([
    queryHunter(domain),
    checkPhysicalPresence(companyName, domain),
  ])

  if (hunterResult) {
    return {
      email_patterns: hunterResult.email_patterns,
      domain,
      estimated_contacts: hunterResult.estimated_contacts,
      estimated_size: estimateSize(hunterResult.estimated_contacts, companyName),
      has_physical_location: hasPhysical,
      organization: hunterResult.organization,
      source: 'hunter',
      enriched_at: new Date().toISOString(),
    }
  }

  // Fallback: infer patterns
  const inferred = inferEmailPatterns(domain, companyName)
  return {
    ...inferred,
    domain,
    estimated_size: estimateSize(0, companyName),
    has_physical_location: hasPhysical,
    enriched_at: new Date().toISOString(),
  }
}

// ── Route Handlers ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { companyName, domain: rawDomain, email, record_id } = body as {
      companyName?: string
      domain?: string
      email?: string
      record_id?: string
    }

    // If an Airtable record_id is provided, fetch company name from there
    let resolvedCompanyName = companyName || ''
    if (record_id && !resolvedCompanyName) {
      const record = await fetchAirtableRecord(record_id)
      resolvedCompanyName =
        record?.fields?.recipient_name ||
        record?.fields?.legal_name ||
        record?.fields?.title ||
        ''
    }

    if (!resolvedCompanyName && !rawDomain && !email) {
      return Response.json(
        { error: 'Provide at least companyName, domain, or email' },
        { status: 400 }
      )
    }

    // Resolve domain in priority order: explicit > from email > inferred from name
    let domain: string | null = rawDomain?.toLowerCase().trim() || null

    if (!domain && email) {
      domain = extractDomainFromEmail(email)
    }

    if (!domain && resolvedCompanyName) {
      domain = await inferDomain(resolvedCompanyName)
    }

    if (!domain) {
      return Response.json(
        {
          error: 'Could not resolve domain',
          companyName: resolvedCompanyName,
          email_patterns: [],
          source: 'inferred',
        },
        { status: 422 }
      )
    }

    const result = await enrichDomain(domain, resolvedCompanyName || domain)

    console.log(
      `[API /enrich] ${resolvedCompanyName || domain} → ${domain} (source: ${result.source}, patterns: ${result.email_patterns.length})`
    )

    return Response.json({ success: true, ...result })
  } catch (error) {
    console.error('[API /enrich] Error:', error)
    return Response.json(
      { error: 'Enrichment failed', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return Response.json({
    status: 'ok',
    description: 'POST { companyName, domain?, email?, record_id? } to enrich a company',
    env: {
      hunter_configured: !!HUNTER_API_KEY,
      google_places_configured: !!GOOGLE_PLACES_API_KEY,
    },
  })
}
