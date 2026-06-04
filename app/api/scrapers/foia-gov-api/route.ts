import { NextRequest, NextResponse } from 'next/server'
import { GenericScraperFactory } from '@/lib/scraper-factory'
import configs from '@/lib/scraper-configs.json'

export async function POST(req: NextRequest) {
  try {
    const config = configs.find((c: any) => c.source_id === 'foia-gov-api')
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
      source_id: 'foia-gov-api',
      timestamp: new Date().toISOString(),
      data: result
    })
  } catch (error) {
    console.error(`Scraper error for foia-gov-api:`, error)
    return NextResponse.json(
      { 
        error: 'Scraper execution failed',
        source_id: 'foia-gov-api',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export const GET = POST
