import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

const LOG_PATH = join(process.cwd(), 'data', 'sync-runs.json')
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID || 'appZhXnyFiKbnOZLr'
const AIRTABLE_TABLE = 'tbl3qWHqunA0eERE2'
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY

export async function GET() {
  try {
    // Read sync runs log from cron script
    let runs: any[] = []
    try {
      const raw = readFileSync(LOG_PATH, 'utf8')
      runs = JSON.parse(raw).runs || []
    } catch {
      // Log not yet created — cron hasn't run with new script
    }

    // Get live Airtable stats
    let airtableStats = { total: 0, mostRecent: '', avgScore: 0, sources: {} as Record<string, number> }
    if (AIRTABLE_KEY) {
      try {
        // Page through all records to get accurate total
        let allRecords: any[] = []
        let offset: string | undefined = undefined
        const fields = ['discovery_date', 'score', 'source'].map(f => `fields[]=${encodeURIComponent(f)}`).join('&')
        const filter = encodeURIComponent(`NOT({discovery_date}='')`)
        for (let page = 0; page < 30; page++) {
          const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?${fields}&filterByFormula=${filter}&pageSize=100${offset ? `&offset=${offset}` : ''}&sort[0][field]=discovery_date&sort[0][direction]=desc`
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${AIRTABLE_KEY}` },
            next: { revalidate: 60 },
          })
          if (!res.ok) break
          const data = await res.json()
          allRecords = allRecords.concat(data.records || [])
          if (!data.offset) break
          offset = data.offset
        }
        airtableStats.total = allRecords.length
        airtableStats.mostRecent = allRecords[0]?.fields?.discovery_date || ''
        const scores = allRecords.map((r: any) => r.fields.score || 0).filter((s: number) => s > 0)
        airtableStats.avgScore = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0
        for (const r of allRecords) {
          const src = r.fields.source || 'Unknown'
          airtableStats.sources[src] = (airtableStats.sources[src] || 0) + 1
        }
      } catch {}
    }

    // Compute cron health from runs
    const lastRun = runs[0] || null
    const lastRunAge = lastRun
      ? Math.floor((Date.now() - new Date(lastRun.timestamp).getTime()) / 60000)
      : null

    return NextResponse.json({
      runs: runs.slice(0, 20),
      airtable: airtableStats,
      cron: {
        schedule: '*/15 * * * *',
        lastRun: lastRun?.timestamp || null,
        lastRunAgeMinutes: lastRunAge,
        status: lastRunAge === null ? 'no_data' : lastRunAge < 30 ? 'healthy' : lastRunAge < 120 ? 'delayed' : 'stale',
        nextSources: ['USASpending', 'SAM.gov (pending key)'],
      },
      generated_at: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
