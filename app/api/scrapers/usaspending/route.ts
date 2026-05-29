/**
 * USASpending Scraper API Route
 * POST /api/scrapers/usaspending
 *
 * Triggers USASpending contract awards discovery
 */

import { scrapeUSASpending } from '@/lib/scrapers/usaspending-scraper'

export async function POST(request: Request) {
  try {
    const { limit = 100, min_amount = 50000 } = await request.json()

    console.log('[API /api/scrapers/usaspending] Starting USASpending scrape')

    const awards = await scrapeUSASpending({ limit, min_amount })

    return Response.json(
      {
        success: true,
        awardsFound: awards.length,
        timestamp: new Date().toISOString(),
        awards: awards.slice(0, 10), // Return first 10 for preview
      },
      { status: 200 }
    )
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[API /api/scrapers/usaspending] Error:', error)
    return Response.json(
      {
        error: 'USASpending scraping failed',
        details: errorMsg,
      },
      { status: 500 }
    )
  }
}
