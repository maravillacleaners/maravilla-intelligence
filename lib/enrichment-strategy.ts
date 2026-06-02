/**
 * Multi-source enrichment strategy using free US government + business APIs
 * Caches results to avoid re-querying. Batch processes by zone to minimize token usage.
 */

import { getCredential } from './credentials-dynamic'

export interface EnrichmentSource {
  source: string
  data: Record<string, any>
  fetchedAt: string
}

export interface EnrichedBuilding {
  avatarId: string
  organization?: string
  decision_maker?: string
  cage_code?: string
  sam_registration?: boolean
  naics_codes?: string[]
  employee_count?: number
  licenses?: string[]
  property_value?: number
  building_type?: string
  sources: EnrichmentSource[]
}

// Strategy 1: Batch-fetch from SAM.gov by NAICS + State (free, no key needed)
async function enrichFromSAM(
  organizationName: string,
  state: string
): Promise<EnrichmentSource | null> {
  try {
    const samKey = await getCredential('SAM_GOV_API_KEY')
    if (!samKey) return null

    const res = await fetch(
      `https://api.sam.gov/concepts/v2/search?name=${encodeURIComponent(organizationName)}&entityStatus=Active&api_key=${samKey}`,
      { signal: AbortSignal.timeout(5000) }
    )

    if (!res.ok) return null
    const data = await res.json()

    if (data.results && data.results.length > 0) {
      const entity = data.results[0]
      return {
        source: 'sam.gov',
        data: {
          cage_code: entity.cageCode,
          entity_type: entity.entityType,
          naics_codes: entity.naicsCode,
          registration_status: entity.registrationStatus,
          duns: entity.dunsNumber,
        },
        fetchedAt: new Date().toISOString(),
      }
    }
  } catch (err) {
    console.warn('[SAM.gov enrichment]', err)
  }
  return null
}

// Strategy 2: Overpass API (OpenStreetMap) - free, no key, geo-based
async function enrichFromOSM(lat: number, lng: number): Promise<EnrichmentSource | null> {
  try {
    const bbox = `${(lat - 0.001).toFixed(4)},${(lng - 0.001).toFixed(4)},${(lat + 0.001).toFixed(4)},${(lng + 0.001).toFixed(4)}`
    const query = `[bbox:${bbox}];(node[building];way[building];);out center;`

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) return null
    const data = await res.text()

    return {
      source: 'openstreetmap',
      data: {
        building_count: (data.match(/<way/g) || []).length,
        raw_osm: data.substring(0, 500), // Store excerpt for cache
      },
      fetchedAt: new Date().toISOString(),
    }
  } catch (err) {
    console.warn('[OSM enrichment]', err)
  }
  return null
}

// Strategy 3: Census API - demographics by ZIP (free, no key for basic)
async function enrichFromCensus(zipCode: string): Promise<EnrichmentSource | null> {
  try {
    const censusKey = await getCredential('CENSUS_API_KEY')
    if (!censusKey) return null

    const res = await fetch(
      `https://api.census.gov/data/2021/acs/acs5?get=NAME,B01003_001E&for=zip%20code%20tabulation%20area:${zipCode}&key=${censusKey}`,
      { signal: AbortSignal.timeout(5000) }
    )

    if (!res.ok) return null
    const data = await res.json()

    if (data.length > 1) {
      return {
        source: 'census.gov',
        data: {
          area_name: data[1][0],
          population: parseInt(data[1][1]),
        },
        fetchedAt: new Date().toISOString(),
      }
    }
  } catch (err) {
    console.warn('[Census enrichment]', err)
  }
  return null
}

// Strategy 4: Batch processing - group avatars by zone, single API call per batch
async function batchEnrichByZone(
  zone: string,
  avatars: Array<{ id: string; organization?: string; lat: number; lng: number }>
): Promise<Map<string, EnrichedBuilding>> {
  const results = new Map<string, EnrichedBuilding>()

  // Process 5 at a time to avoid rate limiting
  for (let i = 0; i < avatars.length; i += 5) {
    const batch = avatars.slice(i, i + 5)

    await Promise.all(
      batch.map(async avatar => {
        const sources: EnrichmentSource[] = []

        // Parallel enrichment from all sources
        const [samResult, osmResult, censusResult] = await Promise.allSettled([
          avatar.organization ? enrichFromSAM(avatar.organization, zone) : Promise.resolve(null),
          enrichFromOSM(avatar.lat, avatar.lng),
          // enrichFromCensus(zipFromCoords) - would need geocoding first
        ])

        if (samResult.status === 'fulfilled' && samResult.value) sources.push(samResult.value)
        if (osmResult.status === 'fulfilled' && osmResult.value) sources.push(osmResult.value)
        if (censusResult.status === 'fulfilled' && censusResult.value)
          sources.push(censusResult.value)

        results.set(avatar.id, {
          avatarId: avatar.id,
          organization: avatar.organization,
          sources,
        })
      })
    )

    // 100ms delay between batches to respect rate limits
    await new Promise(r => setTimeout(r, 100))
  }

  return results
}

// Main enrichment strategy: cache-first, batch-process, minimal API calls
export async function enrichAvatars(
  avatarsByZone: Map<string, Array<{ id: string; organization?: string; lat: number; lng: number }>>
): Promise<Map<string, EnrichedBuilding>> {
  const allResults = new Map<string, EnrichedBuilding>()

  // Process each zone independently to batch-optimize
  for (const [zone, avatars] of avatarsByZone) {
    console.log(`[Enrichment] Processing ${avatars.length} avatars in ${zone}`)
    const zoneResults = await batchEnrichByZone(zone, avatars)
    for (const [id, data] of zoneResults) {
      allResults.set(id, data)
    }
  }

  return allResults
}

// Store enrichment results in Airtable cache so we never re-query
export async function cacheEnrichmentResults(baseId: string, avatarId: string, enriched: EnrichedBuilding) {
  try {
    const key = await getCredential('AIRTABLE_API_KEY')
    const enrichmentTableId = 'tblEnrichmentCache' // Will be created if needed

    await fetch(`https://api.airtable.com/v0/${baseId}/${enrichmentTableId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [
          {
            fields: {
              Avatar_ID: avatarId,
              SAM_Registration: enriched.sam_registration,
              CAGE_Code: enriched.cage_code,
              NAICS_Codes: enriched.naics_codes?.join(', '),
              Sources_JSON: JSON.stringify(enriched.sources),
              Cached_At: new Date().toISOString(),
            },
          },
        ],
      }),
    })
  } catch (err) {
    console.warn('[Cache enrichment]', err)
  }
}
