# Census Scraper - Quick Reference

## Setup (1 min)

```bash
# 1. Get free API key: https://api.census.gov/data/key_signup.html
# 2. Add to .env:
CENSUS_API_KEY=your_key_here

# 3. Restart
npm run dev
```

## API Endpoint

**Base URL**: `/api/scrapers/census`

### GET Request
```bash
curl "http://localhost:3000/api/scrapers/census?state=FL"
curl "http://localhost:3000/api/scrapers/census?state=FL&county=Lee&naics=561720"
```

### POST Request
```bash
curl -X POST http://localhost:3000/api/scrapers/census \
  -H "Content-Type: application/json" \
  -d '{"state":"FL","county":"Lee","zip":"33901"}'
```

## Parameters

| Param | Type | Required | Example |
|-------|------|----------|---------|
| state | string | Yes* | FL, CA, NY |
| county | string | No | Lee, Miami-Dade |
| zip | string | No | 33901 |
| city | string | No | Miami |
| naics | string | No | 561720 |

*Required if county/city not provided

## Response Fields

```json
{
  "demographics": {
    "totalPopulation": 2693117,
    "medianHouseholdIncome": 56789,
    "populationWithBachelor": 450000
  },
  "businessContext": {
    "estimatedMarketSize": "Large (>1M)",
    "keyIndustries": ["Janitorial Services"]
  },
  "source": "census_api",  // or "cached" or "fallback"
  "cacheHit": false
}
```

## Code Examples

### Import
```typescript
import { enrichWithCensusData } from '@/lib/scrapers/census-scraper'
```

### Basic Usage
```typescript
const census = await enrichWithCensusData({
  state: 'FL',
  county: 'Lee',
})

console.log(census.demographics.totalPopulation)
console.log(census.businessContext.estimatedMarketSize)
```

### In API Route
```typescript
export async function POST(request: Request) {
  const { state, county } = await request.json()
  
  const census = await enrichWithCensusData({ state, county })
  
  return Response.json(census)
}
```

### In Cron Job
```typescript
import { enrichWithCensusData } from '@/lib/scrapers/census-scraper'

export async function enrichBatch() {
  const records = await db.companies.where('census').isNull()
  
  for (const record of records) {
    const census = await enrichWithCensusData({
      state: record.state,
      county: record.county,
    })
    
    await db.companies.update(record.id, { census })
  }
}
```

## NAICS Codes (Government Contracting)

| Code | Industry |
|------|----------|
| 561720 | Janitorial Services |
| 561700 | Cleaning Services |
| 561722 | Disinfecting & Pest Control |
| 236220 | Plumbing |
| 238210 | Electrical |

## Caching

- **Automatic**: 24-hour cache (no duplicate API calls)
- **Check metrics**: `?action=metrics`
- **Clear cache**: `?action=clear-cache` (admin only)

## Rate Limiting

- **Limit**: 30 requests/minute per IP
- **Check headers**: `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Wait**: `Retry-After` (seconds)

## Common Issues

| Issue | Solution |
|-------|----------|
| "CENSUS_API_KEY not configured" | Add to .env, restart |
| Rate limit (429) | Wait `Retry-After` seconds |
| No data returned | Check state code validity |
| Slow response | Check if cache hit (should be <5ms) |

## Files

| File | Purpose |
|------|---------|
| `/app/api/scrapers/census/route.ts` | HTTP endpoint |
| `/lib/scrapers/census-scraper.ts` | Core logic |
| `/lib/census-cache.ts` | In-memory cache |
| `/docs/census-scraper.md` | Full docs |
| `/docs/census-integration-guide.md` | Integration patterns |

## State Codes

FL, CA, NY, TX, PA, OH, IL, MI, NC, GA, AZ, TN, NJ, IN, MA, WA, CO, MN, MO, MD, etc.
(All US states supported)

## Resources

- **Census API**: https://api.census.gov/data/
- **Register Key**: https://api.census.gov/data/key_signup.html
- **Full Docs**: `/docs/census-scraper.md`
- **Tests**: `npm test -- census-scraper.test.ts`

## Performance Tips

1. Use state + county (faster than just state)
2. Batch requests to maximize cache hits
3. Check metrics: `?action=metrics`
4. Monitor cache size in production
5. Use fallback gracefully when Census API down

## Production Checklist

- [ ] CENSUS_API_KEY in production .env
- [ ] Tested with real key
- [ ] Cron job scheduled if using bulk enrichment
- [ ] Rate limits appropriate
- [ ] Error handling tested
- [ ] Cache monitoring in place
- [ ] Documentation updated

---

**Last updated**: 2026-06-04
**Status**: ✅ Production Ready
