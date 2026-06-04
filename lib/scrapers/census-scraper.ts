/**
 * Census Bureau Scraper
 *
 * Enriches company records with:
 * - Demographics (population, income, age, education)
 * - NAICS industry distribution
 * - Employment data
 * - Housing/business statistics
 *
 * Uses Census API for real data + caching to avoid duplicate calls
 */

import { getCensusData, getStateDemographics, getCountyDemographics, parseLocation } from '@/lib/census-api'
import { censusCache } from '@/lib/census-cache'

export interface CensusEnrichmentRequest {
  zip?: string
  county?: string
  state?: string
  city?: string
  naics?: string
  includeSocioeconomic?: boolean
  includeEmployment?: boolean
}

export interface CensusEnrichmentResponse {
  success: boolean
  location: {
    zip?: string
    city?: string
    county?: string
    state?: string
  }
  demographics?: {
    totalPopulation?: number
    medianHouseholdIncome?: number
    populationWithBachelor?: number
    totalHousingUnits?: number
    occupiedHousingUnits?: number
    racialComposition?: {
      white?: number
      black?: number
      asian?: number
      hispanic?: number
    }
  }
  employment?: {
    totalWorkers?: number
    workersUsingCar?: number
    laborForceParticipationRate?: number
  }
  businessContext?: {
    keyIndustries?: string[]
    estimatedMarketSize?: string
  }
  source: 'census_api' | 'cached' | 'fallback'
  timestamp: string
  cacheHit?: boolean
}

/**
 * NAICS Code Descriptions (Common Government Contract Codes)
 */
const NAICS_DESCRIPTIONS: Record<string, string> = {
  '561720': 'Janitorial Services',
  '561700': 'Cleaning Services',
  '561722': 'Disinfecting & Pest Control',
  '561740': 'Carpet & Upholstery Cleaning',
  '236220': 'Plumbing Contractors',
  '238320': 'Painting & Wall Covering',
  '238210': 'Electrical Contractors',
  '238990': 'Other Specialty Trade',
}

/**
 * State FIPS Code Mapping
 */
const STATE_FIPS: Record<string, string> = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09', DE: '10',
  FL: '12', GA: '13', HI: '15', ID: '16', IL: '17', IN: '18', IA: '19', KS: '20',
  KY: '21', LA: '22', ME: '23', MD: '24', MA: '25', MI: '26', MN: '27', MS: '28',
  MO: '29', MT: '30', NE: '31', NV: '32', NH: '33', NJ: '34', NM: '35', NY: '36',
  NC: '37', ND: '38', OH: '39', OK: '40', OR: '41', PA: '42', RI: '44', SC: '45',
  SD: '46', TN: '47', TX: '48', UT: '49', VT: '50', VA: '51', WA: '53', WV: '54',
  WI: '55', WY: '56',
}

/**
 * Enrich company location with Census demographic data
 */
export async function enrichWithCensusData(
  request: CensusEnrichmentRequest
): Promise<CensusEnrichmentResponse> {
  try {
    // Build cache key
    const cacheKey = {
      zip: request.zip,
      county: request.county,
      state: request.state,
      city: request.city,
    }

    // Check cache first
    const cached = censusCache.get<CensusEnrichmentResponse>('enrichment', cacheKey)
    if (cached) {
      console.log('[CensusScraper] Cache hit for', { ...cacheKey })
      return { ...cached, cacheHit: true }
    }

    // Build location query
    const locationQuery = buildLocationQuery(request)
    if (!locationQuery.state) {
      throw new Error('State is required for Census API queries')
    }

    // Fetch demographic data
    const demographics = await fetchDemographics(locationQuery)

    // Build response
    const response: CensusEnrichmentResponse = {
      success: true,
      location: {
        zip: request.zip,
        city: request.city,
        county: request.county,
        state: request.state,
      },
      demographics: demographics,
      businessContext: {
        keyIndustries: request.naics
          ? [NAICS_DESCRIPTIONS[request.naics] || `NAICS ${request.naics}`]
          : ['Janitorial Services', 'Building Maintenance', 'Specialty Trade'],
        estimatedMarketSize: estimateMarketSize(demographics?.totalPopulation),
      },
      source: 'census_api',
      timestamp: new Date().toISOString(),
    }

    // Cache the result (24 hours)
    censusCache.set('enrichment', cacheKey, response)

    return response
  } catch (error) {
    console.error('[CensusScraper] Error:', error)
    return buildFallbackResponse(request, error)
  }
}

/**
 * Build location query from request parameters
 */
function buildLocationQuery(request: CensusEnrichmentRequest): {
  state?: string
  county?: string
  geoId?: string
} {
  if (!request.state && !request.county && !request.city) {
    throw new Error('At least state, county, or city is required')
  }

  let state = request.state
  if (!state && (request.county || request.city)) {
    // Default to Florida if not specified
    state = 'FL'
  }

  const stateFips = STATE_FIPS[state?.toUpperCase() || '']
  if (!stateFips) {
    throw new Error(`Invalid state code: ${state}`)
  }

  return {
    state: stateFips,
    county: request.county,
    geoId: request.county ? `county:${stateFips},${request.county}` : `state:${stateFips}`,
  }
}

/**
 * Fetch demographic data from Census API
 */
async function fetchDemographics(locationQuery: {
  state?: string
  county?: string
  geoId?: string
}): Promise<CensusEnrichmentResponse['demographics']> {
  const variables = [
    'B01003_001E', // Total Population
    'B19013_001E', // Median Household Income
    'B15003_022E', // Population 25+ with Bachelor's Degree
    'B08006_001E', // Total Workers 16+
    'B08006_003E', // Workers Using Car/Truck/Van
    'B25001_001E', // Total Housing Units
    'B25002_002E', // Occupied Housing Units
    'B02001_002E', // White Population
    'B02001_003E', // Black/African American
    'B02001_005E', // Asian Population
    'B03003_003E', // Hispanic Population
  ]

  try {
    if (!locationQuery.geoId) {
      throw new Error('Invalid geography ID')
    }

    const results = await getCensusData(locationQuery.geoId, variables)

    if (!results || results.length === 0) {
      return {}
    }

    const data = results[0]

    return {
      totalPopulation: parseInt(data.B01003_001E) || undefined,
      medianHouseholdIncome: parseInt(data.B19013_001E) || undefined,
      populationWithBachelor: parseInt(data.B15003_022E) || undefined,
      totalHousingUnits: parseInt(data.B25001_001E) || undefined,
      occupiedHousingUnits: parseInt(data.B25002_002E) || undefined,
      racialComposition: {
        white: parseInt(data.B02001_002E) || undefined,
        black: parseInt(data.B02001_003E) || undefined,
        asian: parseInt(data.B02001_005E) || undefined,
        hispanic: parseInt(data.B03003_003E) || undefined,
      },
    }
  } catch (error) {
    console.warn('[CensusScraper] Could not fetch demographics:', error)
    return {}
  }
}

/**
 * Estimate market size based on population
 */
function estimateMarketSize(population?: number): string {
  if (!population) return 'Unknown'

  if (population > 1000000) return 'Large (>1M)'
  if (population > 500000) return 'Large (500K-1M)'
  if (population > 100000) return 'Medium (100K-500K)'
  if (population > 50000) return 'Small-Medium (50K-100K)'
  if (population > 10000) return 'Small (10K-50K)'
  return 'Very Small (<10K)'
}

/**
 * Build fallback response when Census API is unavailable
 */
function buildFallbackResponse(
  request: CensusEnrichmentRequest,
  error: any
): CensusEnrichmentResponse {
  console.warn('[CensusScraper] Using fallback response:', error)

  return {
    success: false,
    location: {
      zip: request.zip,
      city: request.city,
      county: request.county,
      state: request.state,
    },
    source: 'fallback',
    timestamp: new Date().toISOString(),
  }
}

/**
 * Get cache statistics
 */
export function getCensusMetrics() {
  return censusCache.getStats()
}

/**
 * Clear Census cache (admin only)
 */
export function clearCensusCache() {
  censusCache.clear()
  return { message: 'Census cache cleared', timestamp: new Date().toISOString() }
}
