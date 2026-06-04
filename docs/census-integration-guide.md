# Census Scraper Integration Guide

How to integrate the Census Bureau scraper into your enrichment pipeline, cron jobs, and API workflows.

## Quick Start (5 minutes)

### 1. Set Census API Key

```bash
# Get free key at: https://api.census.gov/data/key_signup.html
# Add to .env:
CENSUS_API_KEY=your_api_key_here

# Restart server
npm run dev
```

### 2. Test the Endpoint

```bash
# Simple test
curl "http://localhost:3000/api/scrapers/census?state=FL"

# With all parameters
curl "http://localhost:3000/api/scrapers/census?state=FL&county=Lee&zip=33901&naics=561720"

# Check cache metrics
curl "http://localhost:3000/api/scrapers/census?action=metrics"
```

### 3. Integrate into Code

```typescript
import { enrichWithCensusData } from '@/lib/scrapers/census-scraper'

const census = await enrichWithCensusData({
  state: 'FL',
  county: 'Lee',
  naics: '561720',
})

console.log(census.demographics.totalPopulation)
console.log(census.businessContext.estimatedMarketSize)
```

## Integration Patterns

### Pattern 1: Contact Enrichment Pipeline

Add Census data when a new contact is created:

```typescript
// app/api/leads/intake/route.ts

import { enrichWithCensusData } from '@/lib/scrapers/census-scraper'

export async function POST(request: Request) {
  const { email, company, state, county } = await request.json()

  // Enrich with Census data
  const census = await enrichWithCensusData({
    state,
    county,
  })

  // Save to Airtable with Census context
  await airtable.base(BASE_ID).table('Contacts').create([
    {
      fields: {
        email,
        company,
        state,
        county,
        // Add Census fields
        'Census Population': census.demographics?.totalPopulation,
        'Median Income': census.demographics?.medianHouseholdIncome,
        'Market Size': census.businessContext?.estimatedMarketSize,
        'Census Data': JSON.stringify(census),
      },
    },
  ])

  return Response.json({ success: true, census })
}
```

### Pattern 2: Bulk Enrichment Cron Job

Enrich all records without Census data (hourly):

```typescript
// lib/agents/census-enrichment-agent.ts

import { enrichWithCensusData } from '@/lib/scrapers/census-scraper'
import Airtable from 'airtable'

const airtable = new Airtable()

export async function enrichCompaniesWithCensus() {
  console.log('[CensusEnrichment] Starting bulk enrichment')

  const BASE_ID = process.env.AIRTABLE_BASE_ID
  const companies = await airtable
    .base(BASE_ID)
    .table('Companies')
    .select({
      filterByFormula: "AND({Census Population} = BLANK(), {State} != BLANK())",
      pageSize: 100,
    })
    .all()

  let enriched = 0

  for (const record of companies) {
    const { State, County, NAICS } = record.fields

    try {
      const census = await enrichWithCensusData({
        state: State,
        county: County,
        naics: NAICS,
      })

      // Update record with Census data
      await airtable
        .base(BASE_ID)
        .table('Companies')
        .update(record.id, {
          'Census Population': census.demographics?.totalPopulation,
          'Median Income': census.demographics?.medianHouseholdIncome,
          'Market Size': census.businessContext?.estimatedMarketSize,
          'Census Timestamp': new Date().toISOString(),
        })

      enriched++
      console.log(`[CensusEnrichment] Enriched: ${record.fields.Name}`)
    } catch (error) {
      console.error(`[CensusEnrichment] Failed for ${record.fields.Name}:`, error)
    }
  }

  console.log(`[CensusEnrichment] Completed: ${enriched}/${companies.length}`)
  return { enriched, total: companies.length }
}
```

Add to cron scheduler:

```typescript
// lib/scheduler.ts

import { enrichCompaniesWithCensus } from '@/lib/agents/census-enrichment-agent'
import cron from 'node-cron'

// Run hourly at :30 minute mark
cron.schedule('30 * * * *', async () => {
  console.log('[Scheduler] Running Census enrichment...')
  await enrichCompaniesWithCensus()
})
```

### Pattern 3: Opportunities Discovery

Combine Census data with opportunity matching:

```typescript
// lib/agents/discovery-with-census.ts

import { enrichWithCensusData } from '@/lib/scrapers/census-scraper'

export async function scoreOpportunitiesWithCensus(opportunities: any[]) {
  for (const opp of opportunities) {
    // Get Census data for opportunity location
    const census = await enrichWithCensusData({
      state: opp.state,
      county: opp.county,
    })

    // Use population as market size indicator
    const marketMultiplier = census.demographics?.totalPopulation 
      ? Math.min(2, census.demographics.totalPopulation / 100000)
      : 1

    // Adjust opportunity score based on market size
    opp.adjustedScore = opp.baseScore * marketMultiplier
    opp.marketContext = census.businessContext

    console.log(`[Discovery] ${opp.title}: Score ${opp.adjustedScore} (Pop: ${census.demographics?.totalPopulation})`)
  }

  return opportunities.sort((a, b) => b.adjustedScore - a.adjustedScore)
}
```

### Pattern 4: API Endpoint with Census Enrichment

Create a unified endpoint that returns prospects with Census context:

```typescript
// app/api/prospects/enriched/route.ts

import { enrichWithCensusData } from '@/lib/scrapers/census-scraper'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const prospectId = searchParams.get('id')

  // Get prospect from database
  const prospect = await getProspect(prospectId)

  // Enrich with Census data
  const census = await enrichWithCensusData({
    state: prospect.state,
    county: prospect.county,
  })

  return Response.json({
    prospect,
    census,
    enrichedAt: new Date().toISOString(),
  })
}
```

### Pattern 5: Contact Scoring with Demographics

Use Census demographics for lead scoring:

```typescript
// lib/scoring/census-lead-scorer.ts

import { enrichWithCensusData } from '@/lib/scrapers/census-scraper'

interface LeadScore {
  base: number
  demographic: number
  market: number
  total: number
}

export async function scoreLeadByCensus(contact: any): Promise<LeadScore> {
  const census = await enrichWithCensusData({
    state: contact.state,
    county: contact.county,
    naics: contact.naics,
  })

  let demographicScore = 0
  let marketScore = 0

  // Higher income = higher priority
  if (census.demographics?.medianHouseholdIncome) {
    demographicScore = Math.min(100, census.demographics.medianHouseholdIncome / 1000)
  }

  // Larger markets = more opportunity
  const pop = census.demographics?.totalPopulation || 0
  if (pop > 500000) marketScore = 100
  else if (pop > 100000) marketScore = 75
  else if (pop > 50000) marketScore = 50
  else if (pop > 10000) marketScore = 25

  const baseScore = contact.engagement || 50
  const total = (baseScore * 0.4) + (demographicScore * 0.3) + (marketScore * 0.3)

  return {
    base: baseScore,
    demographic: demographicScore,
    market: marketScore,
    total: Math.round(total),
  }
}
```

## Airtable Field Setup

### Add Census Fields to Companies Table

```
Field Name                Type      Description
──────────────────────────────────────────────────
Census Population        Number    Total population
Median Income            Number    Median household income
Population Bachelor's    Number    Pop with Bachelor's
Market Size              Single Select  Market size category
Total Housing Units      Number    Total housing units
Occupied Housing Units   Number    Occupied housing units
White Population         Number    
Black Population         Number    
Asian Population         Number    
Hispanic Population      Number    
Key Industries           Multiple Select  From NAICS
Census Timestamp         Date      Last enrichment date
Census Source            Single Select  api/cached/fallback
```

Create a formula field for market size category:

```
IF({Census Population} > 1000000, "Large (>1M)",
IF({Census Population} > 500000, "Large (500K-1M)",
IF({Census Population} > 100000, "Medium (100K-500K)",
IF({Census Population} > 50000, "Small-Medium",
"Small (<50K)"))))
```

## Caching Best Practices

### 1. Monitor Cache Performance

```typescript
// Get cache stats periodically
export async function monitorCacheHealth() {
  const metrics = getCensusMetrics()
  
  console.log(`[Cache] Size: ${metrics.size} entries`)
  
  metrics.entries.forEach(entry => {
    console.log(`  - ${entry.key}: age=${entry.age}ms, expires=${entry.expiresIn}ms`)
  })
  
  // Alert if cache grows too large (>1000 entries)
  if (metrics.size > 1000) {
    console.warn('[Cache] Cache size exceeds 1000 entries!')
  }
}
```

Run in monitoring cron:

```typescript
cron.schedule('0 * * * *', () => {
  monitorCacheHealth()
})
```

### 2. Clear Cache on Deployment

```typescript
// During application startup
import { clearCensusCache } from '@/lib/scrapers/census-scraper'

export function initializeApp() {
  clearCensusCache()
  console.log('[Init] Census cache cleared')
}
```

### 3. Batch Requests to Maximize Cache Reuse

```typescript
// GOOD: Batches similar requests
const locations = ['FL', 'CA', 'TX']
for (const state of locations) {
  const result = await enrichWithCensusData({ state })
  // Cache hit after first request to each state
}

// LESS EFFICIENT: Different parameters each time
for (const record of records) {
  const result = await enrichWithCensusData({
    state: record.state,
    county: record.county,
    zip: record.zip,  // Different every time = no cache reuse
  })
}
```

## Error Handling

### Fallback Strategy

When Census API is unavailable, the scraper returns a fallback response:

```typescript
if (response.source === 'fallback') {
  console.warn('Census API unavailable, using default market assumptions')
  
  // Use conservative defaults
  const marketSize = 'Medium (100K-500K)'  // Default assumption
  const population = 250000  // Middle of range
}
```

### Retry Logic

```typescript
async function enrichWithRetry(
  params: CensusEnrichmentRequest,
  maxRetries = 3
): Promise<CensusEnrichmentResponse> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await enrichWithCensusData(params)
    } catch (error) {
      console.warn(`[Retry] Attempt ${attempt}/${maxRetries} failed:`, error)
      
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(r => setTimeout(r, Math.pow(2, attempt - 1) * 1000))
      }
    }
  }
  
  // Return fallback after max retries
  return buildFallbackResponse(params, new Error('Max retries exceeded'))
}
```

## Performance Optimization

### 1. Parallel Requests with Concurrency Limit

```typescript
import pQueue from 'p-queue'

const queue = new pQueue({ concurrency: 5 })  // Max 5 parallel requests

async function enrichBatch(companies: any[]) {
  const promises = companies.map(c =>
    queue.add(() => enrichWithCensusData({
      state: c.state,
      county: c.county,
    }))
  )
  
  return Promise.all(promises)
}
```

### 2. Batch by Geography for Cache Efficiency

```typescript
// Group companies by state/county for better cache hit rate
const grouped = _.groupBy(companies, c => `${c.state}|${c.county}`)

for (const [location, group] of Object.entries(grouped)) {
  const [state, county] = location.split('|')
  const census = await enrichWithCensusData({ state, county })
  
  // Apply same Census data to all companies in group
  group.forEach(c => {
    c.censusData = census
  })
}
```

### 3. Skip Enrichment for Invalid Locations

```typescript
async function shouldEnrich(company: any): Promise<boolean> {
  // Skip if already has recent Census data
  if (company.censusTimestamp) {
    const age = Date.now() - new Date(company.censusTimestamp).getTime()
    if (age < 24 * 60 * 60 * 1000) return false  // Skip if <24h old
  }
  
  // Skip if no state
  if (!company.state) return false
  
  return true
}
```

## Monitoring & Alerts

### Set Up Logging

```typescript
// lib/logger.ts

export function logCensusEvent(
  event: string,
  data: Record<string, any>
) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: `census:${event}`,
    ...data,
  }))
}

// Usage
logCensusEvent('enrichment_success', {
  state: 'FL',
  population: 2693117,
  source: 'census_api',
})
```

### Monitor Cache Hit Rate

```typescript
let cacheHits = 0
let cacheTotal = 0

export async function enrichWithMetrics(params: any) {
  const result = await enrichWithCensusData(params)
  
  cacheTotal++
  if (result.cacheHit) cacheHits++
  
  const hitRate = (cacheHits / cacheTotal * 100).toFixed(1)
  console.log(`[Cache] Hit rate: ${hitRate}% (${cacheHits}/${cacheTotal})`)
  
  return result
}
```

## Testing Checklist

- [ ] CENSUS_API_KEY set in .env
- [ ] Can get response with `?state=FL`
- [ ] Can get response with `?state=FL&county=Lee`
- [ ] Cache returns second request quickly
- [ ] Fallback works when API unavailable
- [ ] Rate limiting works (test with many requests)
- [ ] Error handling graceful on invalid state
- [ ] Airtable fields match Census field names
- [ ] Cron job runs without errors
- [ ] Bulk enrichment completes in reasonable time

## Production Deployment

### 1. Verify API Key

```bash
# Before deployment, test with real key
CENSUS_API_KEY=your_key npm run dev

# Call endpoint
curl "http://localhost:3000/api/scrapers/census?state=FL"
```

### 2. Set Up Monitoring

```typescript
// Monitor Census API availability
cron.schedule('*/5 * * * *', async () => {
  try {
    const result = await enrichWithCensusData({ state: 'FL' })
    if (result.success) {
      console.log('[Monitor] Census API: OK')
    } else {
      console.error('[Monitor] Census API: Fallback mode')
      // Send alert
    }
  } catch (error) {
    console.error('[Monitor] Census API: ERROR', error)
    // Send critical alert
  }
})
```

### 3. Document Field Mappings

Update your data dictionary with Census field names for team reference.

## Next Steps

1. **Register Census API key**: https://api.census.gov/data/key_signup.html
2. **Add to .env**: `CENSUS_API_KEY=your_key`
3. **Test endpoint**: `curl http://localhost:3000/api/scrapers/census?state=FL`
4. **Run cron job**: Add to scheduler
5. **Monitor cache**: Check metrics in production

## Questions?

- Census API docs: https://api.census.gov/data/
- Endpoint docs: `/docs/census-scraper.md`
- Test file: `/tests/census-scraper.test.ts`
