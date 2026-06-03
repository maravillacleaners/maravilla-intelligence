/**
 * POST /api/avatars/enrich
 * Bulk enrichment of avatars using multi-source free APIs
 * Batch processes by zone, caches results to avoid re-querying
 * Body: { zoneFilter?: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCredential } from '@/lib/credentials-dynamic'
import { enrichAvatars, cacheEnrichmentResults } from '@/lib/enrichment-strategy'

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID
const AVATARS_TABLE_ID = process.env.AVATARS_TABLE_ID || 'tblrIv6lKjsMeUcyU'
const AT = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`

async function getAirtableAuth() {
  const key = await getCredential('AIRTABLE_API_KEY')
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { zoneFilter } = body

    const auth = await getAirtableAuth()

    // Fetch all avatars from Airtable
    const res = await fetch(`${AT}/${AVATARS_TABLE_ID}`, { headers: auth })
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch avatars', ok: false }, { status: 500 })
    }

    const data = await res.json()
    const avatars = data.records || []

    // Group by zone for batch processing
    const avatarsByZone = new Map<string, Array<{ id: string; organization?: string; lat: number; lng: number }>>()

    for (const record of avatars) {
      const f = record.fields
      const zone = f.Zone || 'unknown'

      // Filter by zone if specified
      if (zoneFilter && zone !== zoneFilter) continue

      if (!avatarsByZone.has(zone)) {
        avatarsByZone.set(zone, [])
      }

      avatarsByZone.get(zone)!.push({
        id: record.id,
        organization: f.Organization,
        lat: f.Latitude || 0,
        lng: f.Longitude || 0,
      })
    }

    // Run enrichment strategy
    const enrichedResults = await enrichAvatars(avatarsByZone)

    // Cache results in Airtable
    let cachedCount = 0
    for (const [avatarId, enrichedData] of enrichedResults) {
      try {
        await cacheEnrichmentResults(AIRTABLE_BASE_ID!, avatarId, enrichedData)
        cachedCount++
      } catch (err) {
        console.warn(`[Cache] Failed for ${avatarId}:`, err)
      }
    }

    return NextResponse.json({
      ok: true,
      avatarsEnriched: enrichedResults.size,
      resultsCached: cachedCount,
      sources: Array.from(enrichedResults.values()).flatMap(r => r.sources),
    })
  } catch (err) {
    console.error('[POST /api/avatars/enrich]', err)
    return NextResponse.json({ error: String(err), ok: false }, { status: 500 })
  }
}
