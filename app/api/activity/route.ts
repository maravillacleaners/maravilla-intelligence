/**
 * GET /api/activity
 * Returns recent events from the Events table in Airtable.
 * Shows real activity: stage changes, enrichments, intakes, pipeline runs.
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const KEY  = process.env.AIRTABLE_API_KEY!
const BASE = process.env.AIRTABLE_BASE_ID!
const TBL_EVENTS = 'tbl84x3ZGOIGf8bDA'
const AT = `https://api.airtable.com/v0/${BASE}`
const HDR = () => ({ Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' })

function mapEvent(r: any) {
  const f = r.fields || {}
  return {
    id: r.id,
    event_type: f['Event_Type'] || f['event_type'] || 'note',
    description: f['Description'] || f['description'] || '',
    entity_name: f['Entity_Name'] || f['entity_name'] || '',
    entity_key:  f['Entity_Key']  || f['entity_key']  || '',
    entity_type: f['Entity_Type'] || f['entity_type'] || '',
    actor:       f['Actor']       || f['actor']       || '',
    source:      f['Source']      || f['source']      || '',
    timestamp:   f['Timestamp']   || f['timestamp']   || r.createdTime || '',
    metadata:    f['Metadata']    || f['metadata']     || '',
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit     = Math.min(parseInt(searchParams.get('limit') || '100'), 200)
  const eventType = searchParams.get('type') || ''
  const since     = searchParams.get('since') || '' // ISO date

  const formulas: string[] = []
  if (eventType) formulas.push(`{Event_Type}="${eventType}"`)
  if (since) formulas.push(`IS_AFTER({Timestamp}, "${since}")`)

  const filterByFormula = formulas.length === 1
    ? formulas[0]
    : formulas.length > 1
    ? `AND(${formulas.join(',')})`
    : ''

  const params = new URLSearchParams({
    'sort[0][field]': 'Timestamp',
    'sort[0][direction]': 'desc',
    maxRecords: String(limit),
  })
  if (filterByFormula) params.set('filterByFormula', filterByFormula)

  try {
    const res = await fetch(`${AT}/${TBL_EVENTS}?${params}`, {
      headers: HDR(),
      cache: 'no-store',
    })
    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: res.status })
    }
    const data = await res.json()
    const events = (data.records || []).map(mapEvent)

    // Count by event_type for sidebar stats
    const counts: Record<string, number> = {}
    events.forEach((e: any) => { counts[e.event_type] = (counts[e.event_type] || 0) + 1 })

    return NextResponse.json({
      events,
      total: events.length,
      counts,
      fetched_at: new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
