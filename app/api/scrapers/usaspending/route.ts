/**
 * USASpending Scraper API Route
 * POST /api/scrapers/usaspending
 *
 * Triggers USASpending contract awards discovery
 */

import { scrapeUSASpending } from '@/lib/scrapers/usaspending-scraper'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500)
  const minAmount = Math.min(parseInt(searchParams.get('minAmount') || '50000', 10), 10000000)

  console.log('[API /api/scrapers/usaspending] GET request')

  try {
    const awards = await scrapeUSASpending({ limit, min_amount: minAmount })

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
    console.error('[API /api/scrapers/usaspending] GET error:', error)
    return Response.json(
      {
        error: 'USASpending scraping failed',
        details: errorMsg,
      },
      { status: 500 }
    )
  }
}

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
