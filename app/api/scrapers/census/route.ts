/**
 * Census Bureau Scraper API Route
 * GET/POST /api/scrapers/census
 *
 * Enriches company records with Census demographic and NAICS data
 *
 * GET Parameters:
 *   - zip: ZIP code
 *   - county: County name or FIPS code
 *   - state: State code (FL, CA, NY, etc.) — required
 *   - city: City name
 *   - naics: NAICS code for industry context
 *
 * POST Body:
 *   {
 *     "zip": "33101",
 *     "state": "FL",
 *     "county": "Miami-Dade",
 *     "naics": "561720"
 *   }
 *
 * Response:
 *   {
 *     "success": true,
 *     "location": {...},
 *     "demographics": {
 *       "totalPopulation": 2693117,
 *       "medianHouseholdIncome": 56789,
 *       "populationWithBachelor": 450000,
 *       ...
 *     },
 *     "businessContext": {
 *       "keyIndustries": ["Janitorial Services"],
 *       "estimatedMarketSize": "Large (>1M)"
 *     },
 *     "source": "census_api",
 *     "timestamp": "2026-06-04T12:00:00Z"
 *   }
 */

import { enrichWithCensusData, getCensusMetrics, clearCensusCache } from '@/lib/scrapers/census-scraper'
import { checkRateLimit, getClientIP, addRateLimitHeaders, discoveryLimiter } from '@/lib/ratelimit'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // Rate limiting
    const clientIP = getClientIP(request)
    const rateLimit = await checkRateLimit(discoveryLimiter, clientIP)

    if (!rateLimit.success) {
      const response = new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: rateLimit.retryAfter,
          remaining: rateLimit.remaining,
        }),
        { status: 429 }
      )
      addRateLimitHeaders(response, rateLimit.remaining, rateLimit.reset, rateLimit.retryAfter)
      return response
    }

    // Handle admin endpoints
    const action = searchParams.get('action')

    if (action === 'metrics') {
      const metrics = getCensusMetrics()
      return Response.json(
        {
          success: true,
          cache: metrics,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      )
    }

    if (action === 'clear-cache') {
      // TODO: Add auth check for admin-only operations
      const result = clearCensusCache()
      return Response.json(
        {
          success: true,
          ...result,
        },
        { status: 200 }
      )
    }

    // Parse query parameters
    const zip = searchParams.get('zip') || undefined
    const county = searchParams.get('county') || undefined
    const state = searchParams.get('state') || undefined
    const city = searchParams.get('city') || undefined
    const naics = searchParams.get('naics') || undefined

    if (!state && !county && !city) {
      return Response.json(
        {
          error: 'Missing required parameters',
          required: 'state (or county or city)',
          example: '/api/scrapers/census?state=FL&county=Miami-Dade&zip=33101',
        },
        { status: 400 }
      )
    }

    console.log('[API /api/scrapers/census] GET request', { zip, county, state, city, naics })

    const result = await enrichWithCensusData({
      zip,
      county,
      state,
      city,
      naics,
    })

    const response = new Response(JSON.stringify(result), { status: 200 })
    addRateLimitHeaders(response, rateLimit.remaining, rateLimit.reset)
    return response
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[API /api/scrapers/census] GET Error:', error)

    return Response.json(
      {
        error: 'Census enrichment failed',
        details: errorMsg,
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    const rateLimit = await checkRateLimit(discoveryLimiter, clientIP)

    if (!rateLimit.success) {
      const response = new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: rateLimit.retryAfter,
          remaining: rateLimit.remaining,
        }),
        { status: 429 }
      )
      addRateLimitHeaders(response, rateLimit.remaining, rateLimit.reset, rateLimit.retryAfter)
      return response
    }

    const body = await request.json()

    const { zip, county, state, city, naics, includeSocioeconomic = true, includeEmployment = true } = body

    if (!state && !county && !city) {
      return Response.json(
        {
          error: 'Missing required parameters',
          required: ['state OR county OR city'],
          example: {
            zip: '33101',
            state: 'FL',
            county: 'Miami-Dade',
            naics: '561720',
          },
        },
        { status: 400 }
      )
    }

    console.log('[API /api/scrapers/census] POST request', { zip, county, state, city, naics })

    const result = await enrichWithCensusData({
      zip,
      county,
      state,
      city,
      naics,
      includeSocioeconomic,
      includeEmployment,
    })

    const response = new Response(JSON.stringify(result), { status: 200 })
    addRateLimitHeaders(response, rateLimit.remaining, rateLimit.reset)
    return response
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[API /api/scrapers/census] POST Error:', error)

    return Response.json(
      {
        error: 'Census enrichment failed',
        details: errorMsg,
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
