/**
 * Census Scraper Tests
 *
 * Run with: npm test -- census-scraper.test.ts
 */

import { enrichWithCensusData, getCensusMetrics, clearCensusCache } from '@/lib/scrapers/census-scraper'
import { censusCache } from '@/lib/census-cache'

describe('Census Scraper', () => {
  beforeEach(() => {
    // Clear cache before each test
    censusCache.clear()
  })

  describe('enrichWithCensusData', () => {
    it('should handle GET request with state parameter', async () => {
      const result = await enrichWithCensusData({
        state: 'FL',
      })

      expect(result.success).toBe(true)
      expect(result.location.state).toBe('FL')
      expect(result.source).toMatch(/census_api|cached|fallback/)
      expect(result.timestamp).toBeDefined()
    })

    it('should accept ZIP code parameter', async () => {
      const result = await enrichWithCensusData({
        state: 'FL',
        zip: '33101',
      })

      expect(result.location.zip).toBe('33101')
      expect(result.location.state).toBe('FL')
    })

    it('should accept county parameter', async () => {
      const result = await enrichWithCensusData({
        state: 'FL',
        county: 'Miami-Dade',
      })

      expect(result.location.county).toBe('Miami-Dade')
    })

    it('should accept NAICS code for industry context', async () => {
      const result = await enrichWithCensusData({
        state: 'FL',
        naics: '561720',
      })

      expect(result.businessContext?.keyIndustries).toBeDefined()
      expect(result.businessContext?.keyIndustries?.[0]).toContain('Janitorial')
    })

    it('should return cached result on second call', async () => {
      const params = { state: 'FL', county: 'Lee' }

      // First call
      const result1 = await enrichWithCensusData(params)
      const isCached1 = result1.cacheHit

      // Second call should be cached
      const result2 = await enrichWithCensusData(params)
      const isCached2 = result2.cacheHit

      expect(result2.cacheHit).toBe(true)
      expect(JSON.stringify(result1.demographics)).toBe(JSON.stringify(result2.demographics))
    })

    it('should estimate market size based on population', async () => {
      const result = await enrichWithCensusData({
        state: 'FL',
      })

      if (result.demographics?.totalPopulation) {
        expect(result.businessContext?.estimatedMarketSize).toBeDefined()
        expect(result.businessContext?.estimatedMarketSize).toMatch(
          /Unknown|Very Small|Small|Small-Medium|Medium|Large/
        )
      }
    })

    it('should fail gracefully without required state', async () => {
      const result = await enrichWithCensusData({})
      expect(result.success).toBe(false)
    })

    it('should include demographic data when available', async () => {
      const result = await enrichWithCensusData({
        state: 'FL',
      })

      if (result.source === 'census_api' && result.demographics?.totalPopulation) {
        expect(result.demographics).toHaveProperty('totalPopulation')
        expect(typeof result.demographics.totalPopulation).toBe('number')
      }
    })
  })

  describe('Cache Management', () => {
    it('should track cache statistics', async () => {
      await enrichWithCensusData({ state: 'FL' })
      await enrichWithCensusData({ state: 'CA' })

      const metrics = getCensusMetrics()
      expect(metrics.size).toBeGreaterThan(0)
      expect(metrics.entries).toBeDefined()
    })

    it('should clear cache when requested', async () => {
      await enrichWithCensusData({ state: 'FL' })
      const metricsBeforeClear = getCensusMetrics()

      clearCensusCache()
      const metricsAfterClear = getCensusMetrics()

      expect(metricsBeforeClear.size).toBeGreaterThan(0)
      expect(metricsAfterClear.size).toBe(0)
    })
  })

  describe('API Integration', () => {
    it('should format response for API consumption', async () => {
      const result = await enrichWithCensusData({
        state: 'FL',
        city: 'Miami',
        naics: '561720',
      })

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('location')
      expect(result).toHaveProperty('source')
      expect(result).toHaveProperty('timestamp')

      // Validate structure
      expect(typeof result.success).toBe('boolean')
      expect(typeof result.location).toBe('object')
      expect(typeof result.timestamp).toBe('string')
    })

    it('should include business context for industry intelligence', async () => {
      const result = await enrichWithCensusData({
        state: 'FL',
        naics: '561720',
      })

      expect(result.businessContext).toBeDefined()
      expect(result.businessContext?.keyIndustries).toBeDefined()
      expect(result.businessContext?.estimatedMarketSize).toBeDefined()
    })
  })

  describe('Production Requirements', () => {
    it('should not make unnecessary API calls', async () => {
      const params = { state: 'FL', county: 'Hillsborough' }

      await enrichWithCensusData(params)
      const firstCallMetrics = getCensusMetrics()

      await enrichWithCensusData(params)
      const secondCallMetrics = getCensusMetrics()

      // Same metrics = no new API call, cache was used
      expect(firstCallMetrics.size).toBe(secondCallMetrics.size)
    })

    it('should have 24-hour cache TTL', async () => {
      const result = await enrichWithCensusData({ state: 'FL' })
      const metrics = getCensusMetrics()

      // All entries should have expiresIn in range (slightly less than 24h in ms)
      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
      const entry = metrics.entries[0]

      expect(entry.expiresIn).toBeLessThanOrEqual(TWENTY_FOUR_HOURS_MS)
      expect(entry.expiresIn).toBeGreaterThan(TWENTY_FOUR_HOURS_MS - 60000) // Within 1 min
    })

    it('should handle concurrent requests', async () => {
      const promises = [
        enrichWithCensusData({ state: 'FL' }),
        enrichWithCensusData({ state: 'CA' }),
        enrichWithCensusData({ state: 'NY' }),
        enrichWithCensusData({ state: 'TX' }),
      ]

      const results = await Promise.all(promises)

      expect(results).toHaveLength(4)
      expect(results.every((r) => r.timestamp)).toBe(true)
    })
  })
})

/**
 * Manual Test Examples
 *
 * GET /api/scrapers/census?state=FL
 * GET /api/scrapers/census?state=FL&county=Lee&zip=33901
 * GET /api/scrapers/census?state=FL&naics=561720
 * GET /api/scrapers/census?action=metrics
 * POST /api/scrapers/census { state: "FL", county: "Miami-Dade" }
 */
