/**
 * TypeScript Type Definitions for Census Scraper
 *
 * Provides complete type safety for Census API integration
 */

/**
 * Request parameters for Census enrichment
 */
export interface CensusEnrichmentRequest {
  /** State code (required if county/city not provided) */
  zip?: string
  /** County name or FIPS code */
  county?: string
  /** State code (FL, CA, NY, etc.) */
  state?: string
  /** City name */
  city?: string
  /** NAICS code for industry context */
  naics?: string
  /** Include socioeconomic demographics */
  includeSocioeconomic?: boolean
  /** Include employment data */
  includeEmployment?: boolean
}

/**
 * Complete Census enrichment response
 */
export interface CensusEnrichmentResponse {
  /** Operation successful */
  success: boolean
  /** Location information from request */
  location: CensusLocation
  /** Demographic statistics */
  demographics?: CensusDemographics
  /** Employment and labor data */
  employment?: CensusEmployment
  /** Business context and market analysis */
  businessContext?: CensusBusinessContext
  /** Source of data: live API, cached, or fallback */
  source: 'census_api' | 'cached' | 'fallback'
  /** ISO timestamp of response */
  timestamp: string
  /** Whether result came from cache */
  cacheHit?: boolean
}

/**
 * Location details from request
 */
export interface CensusLocation {
  /** ZIP code if provided */
  zip?: string
  /** City name if provided */
  city?: string
  /** County name if provided */
  county?: string
  /** State code */
  state?: string
}

/**
 * Demographic statistics from Census Bureau
 */
export interface CensusDemographics {
  /** Total population */
  totalPopulation?: number
  /** Median household income ($) */
  medianHouseholdIncome?: number
  /** Population 25+ with Bachelor's degree */
  populationWithBachelor?: number
  /** Total housing units */
  totalHousingUnits?: number
  /** Occupied housing units */
  occupiedHousingUnits?: number
  /** Racial and ethnic composition */
  racialComposition?: {
    /** White population */
    white?: number
    /** Black/African American population */
    black?: number
    /** Asian population */
    asian?: number
    /** Hispanic population */
    hispanic?: number
  }
}

/**
 * Employment and labor statistics
 */
export interface CensusEmployment {
  /** Total workers 16+ years old */
  totalWorkers?: number
  /** Workers using car/truck/van for commute */
  workersUsingCar?: number
  /** Labor force participation rate (%) */
  laborForceParticipationRate?: number
}

/**
 * Business context derived from Census data
 */
export interface CensusBusinessContext {
  /** Key industries in the area */
  keyIndustries?: string[]
  /** Estimated market size category */
  estimatedMarketSize?: string
}

/**
 * Cache statistics response
 */
export interface CensusCacheStats {
  /** Total cached entries */
  size: number
  /** Details of each cached entry */
  entries: Array<{
    /** Cache key (truncated) */
    key: string
    /** Age of entry in milliseconds */
    age: number
    /** Time until expiration in milliseconds */
    expiresIn: number
  }>
}

/**
 * Cache metrics endpoint response
 */
export interface CensusCacheMetrics {
  success: boolean
  cache: CensusCacheStats
  timestamp: string
}

/**
 * Error response
 */
export interface CensusErrorResponse {
  error: string
  details?: string
  required?: string | string[]
  example?: string | object
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  /** Requests allowed in window */
  maxRequests: number
  /** Window duration in milliseconds */
  windowMs: number
  /** Descriptive name */
  name: string
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /** Request allowed */
  success: boolean
  /** Requests remaining in window */
  remaining: number
  /** Unix timestamp when window resets */
  reset: number
  /** Seconds to retry after (if not allowed) */
  retryAfter?: number
}

/**
 * Common NAICS codes for government contracting
 */
export const NAICS_CODES = {
  JANITORIAL: '561720',
  CLEANING_SERVICES: '561700',
  DISINFECTING: '561722',
  CARPET_CLEANING: '561740',
  PLUMBING: '236220',
  PAINTING: '238320',
  ELECTRICAL: '238210',
  SPECIALTY_TRADE: '238990',
} as const

/**
 * Market size categories
 */
export enum MarketSizeCategory {
  VERY_SMALL = 'Very Small (<10K)',
  SMALL = 'Small (10K-50K)',
  SMALL_MEDIUM = 'Small-Medium (50K-100K)',
  MEDIUM = 'Medium (100K-500K)',
  LARGE = 'Large (500K-1M)',
  VERY_LARGE = 'Large (>1M)',
}

/**
 * Census API state codes
 */
export const STATE_CODES = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09', DE: '10',
  FL: '12', GA: '13', HI: '15', ID: '16', IL: '17', IN: '18', IA: '19', KS: '20',
  KY: '21', LA: '22', ME: '23', MD: '24', MA: '25', MI: '26', MN: '27', MS: '28',
  MO: '29', MT: '30', NE: '31', NV: '32', NH: '33', NJ: '34', NM: '35', NY: '36',
  NC: '37', ND: '38', OH: '39', OK: '40', OR: '41', PA: '42', RI: '44', SC: '45',
  SD: '46', TN: '47', TX: '48', UT: '49', VT: '50', VA: '51', WA: '53', WV: '54',
  WI: '55', WY: '56',
} as const

/**
 * Helper type to get state codes
 */
export type StateCode = keyof typeof STATE_CODES

/**
 * Integration helpers
 */
export namespace CensusHelpers {
  /**
   * Check if Census API is available
   */
  export async function isAvailable(): Promise<boolean> {
    try {
      const response = await fetch('/api/scrapers/census?state=FL')
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Get market size category from population
   */
  export function getMarketSizeCategory(population?: number): string {
    if (!population) return 'Unknown'
    if (population > 1000000) return MarketSizeCategory.VERY_LARGE
    if (population > 500000) return MarketSizeCategory.LARGE
    if (population > 100000) return MarketSizeCategory.MEDIUM
    if (population > 50000) return MarketSizeCategory.SMALL_MEDIUM
    if (population > 10000) return MarketSizeCategory.SMALL
    return MarketSizeCategory.VERY_SMALL
  }

  /**
   * Format population with thousand separators
   */
  export function formatPopulation(pop?: number): string {
    if (!pop) return 'N/A'
    return pop.toLocaleString()
  }

  /**
   * Format income as currency
   */
  export function formatIncome(income?: number): string {
    if (!income) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(income)
  }
}

/**
 * Batch enrichment request/response
 */
export interface CensusBatchRequest {
  records: Array<{
    id: string
    state?: string
    county?: string
    zip?: string
    city?: string
    naics?: string
  }>
  concurrency?: number
}

export interface CensusBatchResponse {
  success: boolean
  completed: number
  failed: number
  results: Array<{
    id: string
    result: CensusEnrichmentResponse
  }>
  errors: Array<{
    id: string
    error: string
  }>
  timestamp: string
}

/**
 * Webhook event for Census enrichment completion
 */
export interface CensusEnrichmentWebhook {
  event: 'census.enrichment.complete'
  data: CensusEnrichmentResponse
  timestamp: string
}
