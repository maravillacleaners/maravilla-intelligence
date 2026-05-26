import { NextRequest, NextResponse } from 'next/server'

export interface QueueItem {
  id: string
  legalName: string
  segment: string
  county: string
  score: number
  ticket: number
  days: number
  stage: string
  priority: string
}

const MOCK_ITEMS: QueueItem[] = [
  {
    id: 'mock-1',
    legalName: 'Brickell Tower LLC',
    segment: 'Office Buildings',
    county: 'Miami-Dade',
    score: 92,
    ticket: 4200,
    days: 18,
    stage: 'Pending review',
    priority: 'High',
  },
  {
    id: 'mock-2',
    legalName: 'South Beach Hospitality Group',
    segment: 'Hotels & Resorts',
    county: 'Miami-Dade',
    score: 77,
    ticket: 7800,
    days: 42,
    stage: 'Contacted',
    priority: 'Medium',
  },
  {
    id: 'mock-3',
    legalName: 'Lakewood Medical Center',
    segment: 'Healthcare',
    county: 'Hillsborough',
    score: 64,
    ticket: 3100,
    days: 91,
    stage: 'Pending review',
    priority: 'Low',
  },
]

function sortItems(items: QueueItem[], sortKey: string, dir: string): QueueItem[] {
  const multiplier = dir === 'asc' ? 1 : -1
  return [...items].sort((a, b) => {
    const aVal = (a as any)[sortKey] ?? 0
    const bVal = (b as any)[sortKey] ?? 0
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return multiplier * aVal.localeCompare(bVal)
    }
    return multiplier * (Number(aVal) - Number(bVal))
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const stage = searchParams.get('stage') || 'all'
  const segment = searchParams.get('segment') || 'all'
  const county = searchParams.get('county') || 'all'
  const sort = searchParams.get('sort') || 'score'
  const dir = searchParams.get('dir') || 'desc'

  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID

  if (!apiKey || !baseId) {
    const sorted = sortItems(MOCK_ITEMS, sort, dir)
    return NextResponse.json({ items: sorted, mock: true })
  }

  try {
    const tableName = encodeURIComponent('Intelligence')
    // Filter by record_type = prospect
    const filterFormula = encodeURIComponent(`{record_type} = 'prospect'`)
    let allRecords: any[] = []
    let offset: string | undefined

    do {
      const url = `https://api.airtable.com/v0/${baseId}/${tableName}?filterByFormula=${filterFormula}&pageSize=100${offset ? `&offset=${offset}` : ''}`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: 'no-store',
      })

      if (!res.ok) {
        const errText = await res.text()
        console.error('[prospects API] Airtable error:', res.status, errText)
        const sorted = sortItems(MOCK_ITEMS, sort, dir)
        return NextResponse.json({ items: sorted, mock: true, error: `Airtable ${res.status}` })
      }

      const data = await res.json()
      allRecords = allRecords.concat(data.records || [])
      offset = data.offset
    } while (offset)

    let items: QueueItem[] = allRecords.map((record: any) => ({
      id: record.id,
      legalName: record.fields.legal_name || '',
      segment: record.fields.segment || record.fields.naics_desc || 'Unknown',
      county: record.fields.county || '',
      score: record.fields.score || 0,
      ticket: record.fields.ticket_estimate || 0,
      days: record.fields.days_since_formed || 0,
      stage: record.fields.pipeline_status || 'Pending review',
      priority: record.fields.priority || 'Low',
    }))

    // Apply filters
    if (stage !== 'all') {
      items = items.filter(i => i.stage.toLowerCase() === stage.toLowerCase())
    }
    if (segment !== 'all') {
      items = items.filter(i => i.segment.toLowerCase() === segment.toLowerCase())
    }
    if (county !== 'all') {
      items = items.filter(i => i.county.toLowerCase() === county.toLowerCase())
    }

    const sortedItems = sortItems(items, sort, dir)
    return NextResponse.json({ items: sortedItems, mock: false })
  } catch (err: any) {
    console.error('[prospects API] Unexpected error:', err)
    const sorted = sortItems(MOCK_ITEMS, sort, dir)
    return NextResponse.json({ items: sorted, mock: true, error: err.message })
  }
}
