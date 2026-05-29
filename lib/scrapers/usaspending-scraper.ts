import Airtable from 'airtable'

const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appZhXnyFiKbnOZLr'
const TABLE_ID = 'tbl3qWHqunA0eERE2'
const api = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })

const NAICS_TARGETS = ['561720', '561700', '561722', '561740']
const USA_SPENDING_URL = 'https://api.usaspending.gov/api/v2/search/spending_by_award/'

export async function scrapeUSASpending(options: { limit?: number; min_amount?: number; days_back?: number } = {}): Promise<any[]> {
  const { limit = 100, min_amount = 50000, days_back = 90 } = options

  const since = new Date(Date.now() - days_back * 86400000).toISOString().split('T')[0]

  const body = {
    filters: {
      award_type_codes: ['A', 'B', 'C', 'D'],
      naics_codes: NAICS_TARGETS,
      award_amounts: [{ lower_bound: min_amount }],
      time_period: [{ start_date: since, end_date: new Date().toISOString().split('T')[0] }],
      place_of_performance_locations: [{ country: 'USA', state: 'FL' }],
    },
    fields: [
      'Award ID', 'Recipient Name', 'Award Amount', 'Awarding Agency', 'Award Date',
      'NAICS Code', 'Place of Performance City Code', 'Place of Performance State Code',
      'Type of Set Aside', 'Contract Award Type',
    ],
    page: 1,
    limit,
    sort: 'Award Amount',
    order: 'desc',
  }

  const res = await fetch(USA_SPENDING_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`USASpending API error ${res.status}`)
  const data = await res.json()

  const awards = (data.results || []).map((r: any) => ({
    opportunity_title: r['Award ID'] || '',
    awarded_contractor: r['Recipient Name'] || '',
    agency: r['Awarding Agency'] || '',
    award_amount: r['Award Amount'] || 0,
    award_date: r['Award Date'] || null,
    naics_code: r['NAICS Code'] || '561720',
    place_of_performance: [r['Place of Performance City Code'], r['Place of Performance State Code']].filter(Boolean).join(', '),
    set_asides: r['Type of Set Aside'] || 'Open Competition',
    source: 'usaspending',
    record_type: 'contract',
  }))

  console.log(`[USASpending] Fetched ${awards.length} awards`)
  await saveAwardsToAirtable(awards)
  return awards
}

export async function saveAwardsToAirtable(awards: any[]) {
  const table = api.base(BASE_ID).table(TABLE_ID)

  const today = new Date().toISOString().split('T')[0]
  const chunks = []
  for (let i = 0; i < awards.length; i += 10) chunks.push(awards.slice(i, i + 10))

  for (const chunk of chunks) {
    await table.create(
      chunk.map((a) => ({
        fields: {
          opportunity_title: a.opportunity_title,
          awarded_contractor: a.awarded_contractor,
          award_amount: a.award_amount,
          award_date: a.award_date || undefined,
          naics_code: a.naics_code,
          place_of_performance: a.place_of_performance,
          set_asides: a.set_asides,
          source: a.source,
          record_type: 'contract',
          discovery_date: today,
          score: 0,
        },
      }))
    )
  }
  console.log(`[USASpending] Saved ${awards.length} records to Airtable`)
}
