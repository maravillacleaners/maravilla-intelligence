/**
 * GET /api/enrich/[domain]
 * Returns enrichment data for a specific domain.
 * Reuses the core enrichment logic from the POST route.
 *
 * Example: GET /api/enrich/acmecleaning.com
 */

const HUNTER_API_KEY = process.env.HUNTER_API_KEY
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY

async function queryHunter(domain: string): Promise<any | null> {
  if (!HUNTER_API_KEY) return null

  try {
    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${HUNTER_API_KEY}&limit=5`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null

    const json = await res.json()
    const data = json?.data
    if (!data) return null

    const patternSet = new Set<string>()

    if (data.pattern) {
      const example = data.pattern
        .replace('{first}', 'firstname')
        .replace('{last}', 'lastname')
        .replace('{f}', 'f')
        .replace('{l}', 'l')
      patternSet.add(`${example}@${domain}`)
    }

    if (Array.isArray(data.emails)) {
      for (const entry of data.emails.slice(0, 5)) {
        if (entry.value) patternSet.add(entry.value)
      }
    }

    if (patternSet.size === 0) {
      patternSet.add(`info@${domain}`)
      patternSet.add(`contact@${domain}`)
    }

    return {
      email_patterns: Array.from(patternSet),
      estimated_contacts: data.emails?.length || 0,
      organization: data.organization,
      source: 'hunter' as const,
    }
  } catch {
    return null
  }
}

function inferEmailPatterns(domain: string): string[] {
  return [
    `firstname.lastname@${domain}`,
    `firstname@${domain}`,
    `f.lastname@${domain}`,
    `info@${domain}`,
    `contact@${domain}`,
    `contracts@${domain}`,
  ]
}

async function checkPhysicalPresence(domain: string): Promise<boolean> {
  if (!GOOGLE_PLACES_API_KEY) return true // optimistic default

  try {
    const query = encodeURIComponent(domain.replace(/\.(com|gov|org|net|mil)$/, ''))
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=place_id&key=${GOOGLE_PLACES_API_KEY}`
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return true
    const json = await res.json()
    return json.status === 'OK' && json.candidates?.length > 0
  } catch {
    return true
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain: rawParam } = await params
    const domain = decodeURIComponent(rawParam).toLowerCase().trim()

    if (!domain || !domain.includes('.')) {
      return Response.json(
        { error: 'Invalid domain format. Use e.g. acmecleaning.com' },
        { status: 400 }
      )
    }

    const [hunterResult, hasPhysical] = await Promise.all([
      queryHunter(domain),
      checkPhysicalPresence(domain),
    ])

    if (hunterResult) {
      return Response.json({
        success: true,
        domain,
        email_patterns: hunterResult.email_patterns,
        estimated_contacts: hunterResult.estimated_contacts,
        has_physical_location: hasPhysical,
        organization: hunterResult.organization,
        source: 'hunter',
        enriched_at: new Date().toISOString(),
      })
    }

    // Fallback inference
    return Response.json({
      success: true,
      domain,
      email_patterns: inferEmailPatterns(domain),
      estimated_contacts: 0,
      has_physical_location: hasPhysical,
      source: 'inferred',
      enriched_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[API /enrich/[domain]] Error:', error)
    return Response.json(
      { error: 'Enrichment failed', details: String(error) },
      { status: 500 }
    )
  }
}
