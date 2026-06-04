/**
 * FPDS.gov (Federal Procurement Data System) Scraper API Route
 * GET/POST /api/scrapers/fpds
 *
 * Scrapes FPDS for federal contract actions in janitorial/facility services
 * - Targets NAICS 561720 (Janitorial), 561210 (Facilities Support), etc.
 * - Geographic filter: FL, TX, CA, GA, NC, VA
 * - Stores results in Airtable Opportunities table
 *
 * Response: { contractsFound, saved, errors, timestamp }
 */

import { scrapeFpds } from '@/lib/scrapers/fpds-scraper'

interface ScrapeResult {
  contractsFound: number
  saved: number
  errors: string[]
  timestamp: string
  skipped?: number
}

/**
 * Main scrape handler
 */
async function scrapeHandler(daysBack: number = 30, limit: number = 100): Promise<ScrapeResult> {
  const startTime = Date.now()

  try {
    console.log(`[FPDS] Starting scrape - ${daysBack} days back, limit ${limit}`)

    const result = await scrapeFpds({
      daysBack: Math.min(daysBack, 90), // Max 90 days
      limit: Math.min(limit, 500), // Max 500 records per run
    })

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(
      `[FPDS] Scrape complete: ${result.saved}/${result.contractsFound} saved in ${duration}s`
    )

    return {
      contractsFound: result.contractsFound,
      saved: result.saved,
      errors: result.errors,
      skipped: result.contractsFound - result.saved,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[FPDS] Scrape error:', error)

    return {
      contractsFound: 0,
      saved: 0,
      skipped: 0,
      errors: [msg],
      timestamp: new Date().toISOString(),
    }
  }
}

// ── HTTP Handlers ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const daysBack = Math.min(parseInt(searchParams.get('daysBack') || '30', 10), 90)
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500)

  console.log('[API /api/scrapers/fpds] GET request')
  const result = await scrapeHandler(daysBack, limit)

  return Response.json(result, { status: 200 })
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const daysBack = Math.min(body.daysBack || 30, 90)
    const limit = Math.min(body.limit || 100, 500)

    console.log('[API /api/scrapers/fpds] POST request - starting FPDS scrape')

    const result = await scrapeHandler(daysBack, limit)

    return Response.json(result, { status: 200 })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[API /api/scrapers/fpds] Request error:', error)

    return Response.json(
      {
        contractsFound: 0,
        saved: 0,
        skipped: 0,
        errors: [errorMsg],
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    )
  }
}
