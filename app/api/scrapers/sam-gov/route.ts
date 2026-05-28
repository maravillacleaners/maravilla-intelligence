/**
 * SAM.gov Scraper API Route
 * POST /api/scrapers/sam-gov
 *
 * Triggers SAM.gov contract discovery
 */

import { scrapeSamGov } from '@/lib/scrapers/sam-gov-scraper'

export async function POST(request: Request) {
  try {
    const { limit = 50, search_query } = await request.json()

    console.log('[API /api/scrapers/sam-gov] Starting SAM.gov scrape')

    const contracts = await scrapeSamGov({ daysBack: 30 })

    return Response.json(
      {
        success: true,
        contractsFound: contracts.length,
        timestamp: new Date().toISOString(),
        contracts: contracts.slice(0, 10), // Return first 10 for preview
      },
      { status: 200 }
    )
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[API /api/scrapers/sam-gov] Error:', error)
    return Response.json(
      {
        error: 'SAM.gov scraping failed',
        details: errorMsg,
      },
      { status: 500 }
    )
  }
}
