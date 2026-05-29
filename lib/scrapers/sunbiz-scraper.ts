import Airtable from 'airtable'

const api = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })

export async function scrapeSunbiz(query: string): Promise<any[]> {
  try {
    // Puppeteer/Selenium integration here
    const records: any[] = []
    console.log(`[Sunbiz] Searching: ${query}`)
    return records
  } catch (error) {
    console.error('[Sunbiz]', error)
    return []
  }
}

export async function saveProspectsToAirtable(prospects: any[]) {
  try {
    const base = api.base(process.env.AIRTABLE_BASE_ID!)
    const table = base('Intelligence')

    for (const p of prospects) {
      await table.create({
        company_name: p.name,
        address: p.address,
        phone: p.phone,
        record_type: 'prospect',
        source: 'sunbiz',
      })
    }
  } catch (error) {
    console.error('[Sunbiz] Save error:', error)
  }
}
