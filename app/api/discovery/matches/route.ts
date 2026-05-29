import { NextResponse } from 'next/server'

const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appZhXnyFiKbnOZLr'
const TABLE_ID = 'tbl3qWHqunA0eERE2'
const API_KEY = process.env.AIRTABLE_API_KEY

export async function GET() {
  try {
    const fields = [
      'legal_name', 'opportunity_title', 'naics_code', 'county', 'place_of_performance',
      'discovery_date', 'score', 'pipeline_status', 'business_email',
      'record_type', 'source', 'segment', 'awarded_contractor', 'award_amount',
    ].map((f) => `fields[]=${encodeURIComponent(f)}`).join('&')

    // Show all records with a discovery_date — no score filter since scoring is async
    const filter = encodeURIComponent(`NOT({discovery_date}='')`)
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${fields}&filterByFormula=${filter}&pageSize=100&sort[0][field]=discovery_date&sort[0][direction]=desc`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      next: { revalidate: 60 },
    })

    if (!res.ok) throw new Error(`Airtable error ${res.status}`)
    const data = await res.json()

    const matches = (data.records || []).map((rec: any) => {
      const f = rec.fields
      const ps = f['pipeline_status']
      const psName = typeof ps === 'object' ? ps?.name : (ps || 'New Lead')
      const discoveryDate = f['discovery_date']
      const days = discoveryDate
        ? Math.floor((Date.now() - new Date(discoveryDate).getTime()) / 86400000)
        : 0

      // Use best available name field
      const legalName =
        f['legal_name'] ||
        f['awarded_contractor'] ||
        f['opportunity_title'] ||
        'Unknown'

      const score = f['score'] || 0
      const awardAmount = f['award_amount'] || 0
      // Map score to routing action (pipeline_status may not be set yet)
      let action: 'auto-approve' | 'queue' | 'drop'
      if (score >= 80) action = 'auto-approve'
      else if (score >= 55) action = 'queue'
      else action = 'drop'

      // Parse place_of_performance "City, ST" or just "FL"
      const rawPlace = f['place_of_performance'] || f['county'] || 'FL'
      const placeParts = rawPlace.split(',').map((s: string) => s.trim())
      const city = placeParts.length > 1 ? placeParts[0] : ''
      const state = placeParts.length > 1 ? placeParts[1] : placeParts[0]

      return {
        id: rec.id,
        legalName,
        naics: f['naics_code'] || '561720',
        county: city || state || 'FL',
        days,
        predictedScore: score,
        action,
        email: !!(f['business_email']),
        award_amount: awardAmount,
        place: { city, state },
        pipelineStatus: psName,
        current: days <= 30,
      }
    })

    return NextResponse.json({ matches })
  } catch (err) {
    console.error('[/api/discovery/matches]', err)
    return NextResponse.json({ matches: [] }, { status: 500 })
  }
}
