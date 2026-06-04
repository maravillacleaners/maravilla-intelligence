import { NextRequest, NextResponse } from 'next/server'
import { GenericScraperFactory } from '@/lib/scraper-factory'
import configs from '@/lib/scraper-configs.json'

export async function POST(req: NextRequest) {
  try {
    const config = configs.find((c: any) => c.source_id === 'lda-lobbying-disclosures')
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
      source_id: 'lda-lobbying-disclosures',
      timestamp: new Date().toISOString(),
      data: result
    })
  } catch (error) {
    console.error(`Scraper error for lda-lobbying-disclosures:`, error)
    return NextResponse.json(
      { 
        error: 'Scraper execution failed',
        source_id: 'lda-lobbying-disclosures',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export const GET = POST
