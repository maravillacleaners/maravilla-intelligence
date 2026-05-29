import { NextResponse } from 'next/server'

const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appZhXnyFiKbnOZLr'
const TABLE_ID = 'tbl3qWHqunA0eERE2'
const API_KEY = process.env.AIRTABLE_API_KEY

function inferScope(source: string | null): 'federal' | 'state' | 'local' {
  if (!source) return 'federal'
  const s = source.toLowerCase()
  if (s.includes('usaspending') || s.includes('federal') || s.includes('sam')) return 'federal'
  if (s.includes('state') || s.includes('fl ') || s.includes('florida')) return 'state'
  return 'local'
}

function crmStatus(ps: string | null): 'in-crm-active' | 'in-crm-stale' | 'not-in-crm' | 'rejected' {
  if (!ps) return 'not-in-crm'
  const s = (ps as any)?.name?.toLowerCase() || ps.toLowerCase()
  if (s.includes('reject') || s.includes('lost')) return 'rejected'
  if (s.includes('stal') || s.includes('cold')) return 'in-crm-stale'
  if (s.includes('activ') || s.includes('contact') || s.includes('qualified') || s.includes('approved')) return 'in-crm-active'
  return 'not-in-crm'
}

function parsePlace(raw: string | null): { city: string; state: string } {
  if (!raw) return { city: '', state: '' }
  const parts = raw.split(',').map((s) => s.trim())
  return { city: parts[0] || '', state: parts[1] || '' }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') || '90d'
    const type = searchParams.get('type') || 'all' // 'prime' | 'sub' | 'all'
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '1y' ? 365 : 90
    const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]

    const fields = [
      'awarded_contractor', 'website', 'agency', 'award_amount', 'award_date',
      'naics_code', 'set_asides', 'place_of_performance', 'pipeline_status',
      'score', 'source', 'opportunity_title', 'legal_name', 'record_type',
      'discovery_date',
    ].map((f) => `fields[]=${encodeURIComponent(f)}`).join('&')

    // Filter by discovery_date (award_date is 0% populated). Exclude records with no contractor/title.
    const filter = encodeURIComponent(
      `AND(NOT({discovery_date}=''), {discovery_date}>='${since}', OR(NOT({awarded_contractor}=''), NOT({opportunity_title}='')))`
    )
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${fields}&filterByFormula=${filter}&pageSize=100&sort[0][field]=discovery_date&sort[0][direction]=desc`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      next: { revalidate: 120 },
    })

    if (!res.ok) throw new Error(`Airtable error ${res.status}`)
    const data = await res.json()

    const awards = (data.records || [])
      .filter((rec: any) => rec.fields['awarded_contractor'] || rec.fields['legal_name'] || rec.fields['opportunity_title'])
      .map((rec: any) => {
        const f = rec.fields
        const ps = f['pipeline_status']
        const psName = typeof ps === 'object' ? ps?.name : ps

        const prime = f['awarded_contractor'] || f['legal_name'] || f['opportunity_title'] || 'Unknown'
        const effectiveDate = f['award_date'] || f['discovery_date'] || new Date().toISOString().split('T')[0]

        return {
          id: rec.id,
          prime,
          primeDomain: (f['website'] || '').replace(/^https?:\/\//, '').replace(/\/$/, ''),
          agency: typeof f['agency'] === 'object' ? f['agency']?.name : (f['agency'] || 'Federal Agency'),
          scope: inferScope(f['source']),
          amount: f['award_amount'] || 0,
          awardDate: effectiveDate,
          naics: f['naics_code'] || '561720',
          setAside: f['set_asides'] || 'Open Competition',
          place: parsePlace(f['place_of_performance']),
          crmStatus: crmStatus(psName),
          crmStage: psName || undefined,
          lastTouch: null,
          lastTouchBy: null,
          ourPotential: { mid: Math.round((f['score'] || 0) * 1000) },
        }
      })

    // Apply contractor type filter
    const filtered = type === 'prime'
      ? awards.filter((a: any) => a.amount > 500000)
      : type === 'sub'
        ? awards.filter((a: any) => a.amount <= 500000)
        : awards

    return NextResponse.json({ awards: filtered })
  } catch (err) {
    console.error('[/api/awards]', err)
    return NextResponse.json({ awards: [] }, { status: 500 })
  }
}
