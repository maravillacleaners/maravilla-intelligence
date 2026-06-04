import { NextRequest, NextResponse } from 'next/server'
import { GenericScraperFactory } from '@/lib/scraper-factory'
import configs from '@/lib/scraper-configs.json'

export async function POST(req: NextRequest) {
  try {
    const config = configs.find((c: any) => c.source_id === 'g2-reviews-api')
    if (!config) {
      return NextResponse.json(
        { error: 'Source configuration not found' },
        { status: 404 }
      )
    }

    const factory = new GenericScraperFactory(config)
    const result = await factory.scrape()

    return NextResponse.json({
      success: true,
      source_id: 'g2-reviews-api',
      timestamp: new Date().toISOString(),
      data: result
    })
  } catch (error) {
    console.error(`Scraper error for g2-reviews-api:`, error)
    return NextResponse.json(
      { 
        error: 'Scraper execution failed',
        source_id: 'g2-reviews-api',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export const GET = POST
