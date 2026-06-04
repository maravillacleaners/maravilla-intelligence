# Census Bureau Scraper API

Production-ready Census API integration for enriching company records with demographic and NAICS data.

## Overview

The Census scraper enriches location data with:
- **Demographics**: Population, median income, education level, housing units
- **Racial/Ethnic Composition**: White, Black, Asian, Hispanic populations
- **Employment Data**: Workers, labor force participation, transportation methods
- **Market Size Estimation**: Based on population density
- **Business Context**: Industry-specific insights from NAICS codes

## Features

- ✅ **Smart Caching**: 24-hour in-memory cache avoids duplicate API calls
- ✅ **Rate Limiting**: 30 requests/minute per IP using middleware
- ✅ **Error Handling**: Graceful fallback when Census API unavailable
- ✅ **Flexible Parameters**: Accept ZIP, county, state, city
- ✅ **Production Ready**: Tested, documented, secured

## Setup

### 1. Get Census API Key (Free)

```bash
# Register at: https://api.census.gov/data/key_signup.html
# Add to .env:
CENSUS_API_KEY=your_key_here
```

### 2. API is Ready

The endpoint is automatically available at `/api/scrapers/census`

## Usage

### GET Request

```bash
# Basic state query
curl "http://localhost:3000/api/scrapers/census?state=FL"

# With ZIP code
curl "http://localhost:3000/api/scrapers/census?state=FL&zip=33101"

# With county
curl "http://localhost:3000/api/scrapers/census?state=FL&county=Miami-Dade"

# With industry context
curl "http://localhost:3000/api/scrapers/census?state=FL&naics=561720"

# Get cache metrics
curl "http://localhost:3000/api/scrapers/census?action=metrics"
```

### POST Request

```bash
curl -X POST "http://localhost:3000/api/scrapers/census" \
  -H "Content-Type: application/json" \
  -d '{
    "zip": "33101",
    "state": "FL",
    "county": "Miami-Dade",
    "naics": "561720",
    "includeSocioeconomic": true,
    "includeEmployment": true
  }'
```

## API Response

### Success Response (200)

```json
{
  "success": true,
  "location": {
    "zip": "33101",
    "city": "Miami",
    "county": "Miami-Dade",
    "state": "FL"
  },
  "demographics": {
    "totalPopulation": 2693117,
    "medianHouseholdIncome": 56789,
    "populationWithBachelor": 450000,
    "totalHousingUnits": 998765,
    "occupiedHousingUnits": 876543,
    "racialComposition": {
      "white": 800000,
      "black": 600000,
      "asian": 250000,
      "hispanic": 1200000
    }
  },
  "employment": {
    "totalWorkers": 1200000,
    "workersUsingCar": 950000,
    "laborForceParticipationRate": 62.5
  },
  "businessContext": {
    "keyIndustries": ["Janitorial Services", "Building Maintenance", "Specialty Trade"],
    "estimatedMarketSize": "Large (>1M)"
  },
  "source": "census_api",
  "timestamp": "2026-06-04T12:00:00Z",
  "cacheHit": false
}
```

### Cache Hit (Same Request)

```json
{
  "success": true,
  "location": { ... },
  "demographics": { ... },
  "businessContext": { ... },
  "source": "cached",
  "timestamp": "2026-06-04T12:05:00Z",
  "cacheHit": true
}
```

### Error Response (400/500)

```json
{
  "error": "Census enrichment failed",
  "details": "State is required for Census API queries"
}
```

## Parameters

### Required
- **state**: State code (FL, CA, NY, TX, etc.)

### Optional
- **zip**: ZIP code (5 digits)
- **county**: County name or FIPS code
- **city**: City name
- **naics**: NAICS code for industry context (e.g., 561720 for janitorial)
- **includeSocioeconomic**: Include income, education, housing (default: true)
- **includeEmployment**: Include employment metrics (default: true)

## Response Fields

### Location
- `zip`: ZIP code if provided
- `city`: City name if provided
- `county`: County name if provided
- `state`: State code

### Demographics
- `totalPopulation`: Total population in area
- `medianHouseholdIncome`: Median household income ($)
- `populationWithBachelor`: Population 25+ with Bachelor's degree
- `totalHousingUnits`: Total housing units
- `occupiedHousingUnits`: Occupied housing units
- `racialComposition`: Breakdown by race/ethnicity

### Employment
- `totalWorkers`: Total workers 16+ years old
- `workersUsingCar`: Workers using car/truck/van for commute
- `laborForceParticipationRate`: % of population in labor force

### Business Context
- `keyIndustries`: Array of relevant industries
- `estimatedMarketSize`: Market size category based on population

### Metadata
- `source`: `census_api` (live), `cached` (from cache), or `fallback` (error)
- `timestamp`: ISO timestamp of response
- `cacheHit`: Whether result came from cache (true/false)

## NAICS Codes

Common government contracting NAICS codes:

| Code | Industry |
|------|----------|
| 561720 | Janitorial Services |
| 561700 | Cleaning Services |
| 561722 | Disinfecting & Pest Control |
| 561740 | Carpet & Upholstery Cleaning |
| 236220 | Plumbing Contractors |
| 238320 | Painting & Wall Covering |
| 238210 | Electrical Contractors |

Pass `naics` parameter to get industry-specific insights.

## Caching

### How It Works
- 24-hour cache for each unique location query
- Cache key includes: ZIP, county, state, city
- Automatic cleanup of expired entries every 1 hour
- In-memory (single server) — scales with distributed Redis if needed

### Check Cache Status
```bash
curl "http://localhost:3000/api/scrapers/census?action=metrics"
```

Response:
```json
{
  "success": true,
  "cache": {
    "size": 5,
    "entries": [
      {
        "key": "census:enrichment:...",
        "age": 12345,
        "expiresIn": 86350000
      }
    ]
  },
  "timestamp": "2026-06-04T12:00:00Z"
}
```

### Clear Cache (Admin)
```bash
curl "http://localhost:3000/api/scrapers/census?action=clear-cache"
```

## Rate Limiting

- **Limit**: 30 requests per 60 seconds per IP
- **Headers**:
  - `X-RateLimit-Remaining`: Requests remaining in window
  - `X-RateLimit-Reset`: Unix timestamp when window resets
  - `Retry-After`: Seconds to wait (only on 429)

### Rate Limit Exceeded (429)
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 45,
  "remaining": 0
}
```

## Integration Examples

### 1. Enrich in Bulk Job

```typescript
import { enrichWithCensusData } from '@/lib/scrapers/census-scraper'

async function enrichCompanyRecords() {
  const companies = [
    { id: 1, state: 'FL', county: 'Lee' },
    { id: 2, state: 'FL', county: 'Hillsborough' },
    { id: 3, state: 'CA', county: 'Los Angeles' },
  ]

  for (const company of companies) {
    const census = await enrichWithCensusData({
      state: company.state,
      county: company.county,
    })

    // Save to database
    await db.companies.update(company.id, {
      census_data: census,
    })
  }
}
```

### 2. Real-time API Call

```typescript
// From enrichment pipeline
const census = await fetch('/api/scrapers/census', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    state: 'FL',
    zip: '33101',
    naics: '561720',
  }),
}).then(r => r.json())

console.log(`Market size: ${census.businessContext.estimatedMarketSize}`)
console.log(`Population: ${census.demographics.totalPopulation}`)
```

### 3. Scheduled Enrichment Cron

```typescript
// In n8n or scheduled job
export async function enrichCensusBatch() {
  const unEnriched = await db.companies
    .where('census_data').isNull()
    .limit(100)

  const results = await Promise.all(
    unEnriched.map(c => enrichWithCensusData({
      state: c.state,
      county: c.county,
    }))
  )

  // Update records
  await db.companies.bulkUpdate(results)
}
```

## Troubleshooting

### CENSUS_API_KEY not configured
```
Error: CENSUS_API_KEY not configured
```
**Solution**: Add to `.env` and restart server

### Census API returns 400
```
Census API 400: Invalid geoId parameter
```
**Solution**: Check state/county codes are valid

### No data returned
```
Invalid Census API response format
```
**Solution**: State/county combination may have no data, use fallback

### Cache growing too large
The cache automatically cleans up expired entries every 1 hour. For production, consider:
- Switching to Redis for distributed caching
- Reducing TTL from 24 hours to 6 hours
- Implementing cache size limits

## Architecture

### Files
- `/app/api/scrapers/census/route.ts` — HTTP endpoint
- `/lib/scrapers/census-scraper.ts` — Core enrichment logic
- `/lib/census-cache.ts` — In-memory cache manager
- `/lib/census-api.ts` — Census API client (existing)

### Data Flow
```
POST /api/scrapers/census
    ↓
Rate Limit Check
    ↓
Check Cache
    ↓ (hit) → Return cached + { cacheHit: true }
    ↓ (miss)
Call enrichWithCensusData()
    ↓
Parse location params
    ↓
Fetch from Census API
    ↓
Transform response
    ↓
Store in cache (24h TTL)
    ↓
Return enriched data
```

## Performance

### Typical Response Times
- **Cache Hit**: <5ms
- **Census API Call**: 200-800ms
- **Fallback Response**: <10ms

### Optimization Tips
1. **Use state + county** instead of just state for faster results
2. **Check metrics regularly** to monitor cache hit rate
3. **Batch requests** to maximize cache reuse
4. **Set includeSocioeconomic=false** if demographic data not needed

## Testing

```bash
# Run tests
npm test -- census-scraper.test.ts

# Manual test GET
curl "http://localhost:3000/api/scrapers/census?state=FL&county=Lee"

# Manual test POST
curl -X POST http://localhost:3000/api/scrapers/census \
  -H "Content-Type: application/json" \
  -d '{"state":"FL","county":"Miami-Dade"}'
```

## Production Checklist

- [ ] CENSUS_API_KEY set in production .env
- [ ] Rate limits configured appropriately
- [ ] Cache TTL appropriate for update frequency
- [ ] Error handling tested with Census API down
- [ ] Monitor cache size in production
- [ ] Implement Redis cache for multi-server setup
- [ ] Add request logging for audit trail
- [ ] Set up alerts for API failures

## Future Enhancements

1. **Redis Cache**: Replace in-memory with Redis for distributed systems
2. **Batch Endpoint**: POST multiple locations in one request
3. **Historical Data**: Track enrichment over time
4. **Predictive Models**: Use demographics for lead scoring
5. **Integration with Airtable**: Auto-save Census data to tables
6. **Webhook Integration**: Trigger enrichment on contact creation

## Support

For Census API documentation: https://api.census.gov/data/
For issues, check logs with: `CENSUS_API_KEY=<your_key> npm run dev`
