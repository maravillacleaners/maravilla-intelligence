/**
 * POST /api/scrapers/batch
 * Execute multiple scrapers in parallel
 * 
 * Request:
 * {
 *   sources: [
 *     { source_id: 'sam-gov', query: { state: 'FL' } },
 *     { source_id: 'census-api', query: { geo: 'state' } }
 *   ],
 *   parallel: true,
 *   timeout: 60000
 * }
 * 
 * Response:
 * {
 *   results: ScraperResult[],
 *   totalRecords: number,
 *   totalDurationMs: number,
 *   timestamp: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getScraper, registerScrapers } from '@/lib/scraper-factory'
import scraperConfigs from '@/lib/scraper-configs.json'

let registryInitialized = false

function initializeRegistry() {
  if (registryInitialized) return
  
  if (scraperConfigs.sources && Array.isArray(scraperConfigs.sources)) {
    registerScrapers(scraperConfigs.sources)
    registryInitialized = true
  }
}

export async function POST(request: NextRequest) {
  const startMs = Date.now()
  
  try {
    initializeRegistry()

    const body = await request.json()
    const { sources, parallel = true, timeout = 300000 } = body

    if (!Array.isArray(sources) || sources.length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid request: sources must be non-empty array',
          example: {
            sources: [
              { source_id: 'sam-gov', query: { state: 'FL', limit: 10 } },
              { source_id: 'census-api', query: { geo: 'state' } }
            ],
            parallel: true
          }
        },
        { status: 400 }
      )
    }

    // Execute scrapers
    let promises: Promise<any>[] = []
    let results: any[] = []

    for (const { source_id, query } of sources) {
      const scraper = getScraper(source_id)
      if (!scraper) {
        console.warn(`[Batch Scraper] Source not found: ${source_id}`)
        results.push({
          source: source_id,
          error: `Source not found`,
          count: 0,
          records: [],
          storedToAirtable: false,
          timestamp: new Date().toISOString(),
          durationMs: 0
        })
        continue
      }

      const scrapePromise = scraper.scrape(query)
      
      if (parallel) {
        promises.push(scrapePromise)
      } else {
        results.push(await scrapePromise)
      }
    }

    // Wait for parallel results
    if (parallel && promises.length > 0) {
      const parallelResults = await Promise.allSettled(promises)
      for (const result of parallelResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          results.push({
            error: result.reason?.message || 'Unknown error',
            count: 0,
            records: [],
            storedToAirtable: false,
            timestamp: new Date().toISOString(),
            durationMs: 0
          })
        }
      }
    }

    const totalRecords = results.reduce((sum, r) => sum + (r.count || 0), 0)
    const totalDurationMs = Date.now() - startMs

    return NextResponse.json({
      results,
      totalRecords,
      totalDurationMs,
      timestamp: new Date().toISOString(),
      summary: {
        sourcesRequested: sources.length,
        sourcesSuccessful: results.filter(r => !r.error).length,
        sourcesFailed: results.filter(r => r.error).length,
        totalRecordsCollected: totalRecords,
        parallelExecution: parallel
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Batch Scraper] Error:', message)
    
    return NextResponse.json(
      {
        error: 'Batch execution failed',
        details: message
      },
      { status: 500 }
    )
  }
}
