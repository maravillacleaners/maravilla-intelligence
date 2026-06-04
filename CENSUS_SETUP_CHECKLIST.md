# Census Scraper Setup Checklist

Complete these steps to activate the Census Bureau scraper for production.

## Phase 1: API Key Setup (5 minutes)

- [ ] Visit https://api.census.gov/data/key_signup.html
- [ ] Register your email
- [ ] Check email for API key
- [ ] Copy API key (starts with letter or number)
- [ ] Open `.env` file in project root
- [ ] Add line: `CENSUS_API_KEY=your_key_here`
- [ ] Save `.env` file
- [ ] Restart development server: `npm run dev`

## Phase 2: Verify Installation (5 minutes)

- [ ] Open terminal in project directory
- [ ] Run: `curl "http://localhost:3000/api/scrapers/census?state=FL"`
- [ ] Verify response contains `"success":true`
- [ ] Verify response contains `"demographics":{...}`
- [ ] Check response time (should be <1 second)
- [ ] Run same request again
- [ ] Verify second response has `"cacheHit":true`
- [ ] Check cache metrics: `curl "http://localhost:3000/api/scrapers/census?action=metrics"`

## Phase 3: Run Tests (5 minutes)

- [ ] Run: `npm test -- census-scraper.test.ts`
- [ ] All tests should pass
- [ ] No console errors or warnings
- [ ] Note test results for documentation

## Phase 4: Integration (30 minutes)

Choose which integration pattern to implement:

### Option A: Contact Enrichment on Intake
- [ ] Open `/app/api/leads/intake/route.ts`
- [ ] Import `enrichWithCensusData` from `@/lib/scrapers/census-scraper`
- [ ] Add Census enrichment before saving to Airtable
- [ ] Test with sample contact
- [ ] Verify Census data in Airtable

### Option B: Bulk Enrichment Cron Job
- [ ] Create `/lib/agents/census-enrichment-agent.ts`
- [ ] Implement bulk enrichment function
- [ ] Add to scheduler at `/lib/scheduler.ts`
- [ ] Run manually to test
- [ ] Verify cron job executes at scheduled time

### Option C: Quick API Endpoint Test
- [ ] Create test file with manual requests
- [ ] Test GET request: `?state=FL&county=Lee`
- [ ] Test POST request with JSON body
- [ ] Test with different states
- [ ] Test error cases (invalid state, no params)

## Phase 5: Airtable Field Setup (15 minutes)

- [ ] Open Airtable base
- [ ] Go to Companies or Contacts table
- [ ] Create new fields:
  - [ ] `Census Population` (Number)
  - [ ] `Median Income` (Number)
  - [ ] `Market Size` (Single Select: "Very Small", "Small", "Medium", "Large")
  - [ ] `Census Timestamp` (Date)
  - [ ] `Census Source` (Single Select: "api", "cached", "fallback")
- [ ] Save field definitions
- [ ] Test enrichment writes data to fields

## Phase 6: Documentation (10 minutes)

- [ ] Read `/docs/CENSUS_QUICK_REFERENCE.md`
- [ ] Read `/docs/census-integration-guide.md`
- [ ] Share quick reference with team
- [ ] Add link to `#development` Slack channel
- [ ] Update team wiki/docs with Census feature

## Phase 7: Monitoring Setup (15 minutes)

- [ ] Set up logging for Census API calls
- [ ] Configure alert if Census API down
- [ ] Monitor cache hit rate
- [ ] Set cache size alert (>1000 entries)
- [ ] Test error handling (unplug internet)
- [ ] Verify fallback works

## Phase 8: Production Deployment (30 minutes)

- [ ] Verify CENSUS_API_KEY in production environment
- [ ] Test endpoint in staging: `curl https://staging.example.com/api/scrapers/census?state=FL`
- [ ] Run performance test (50+ concurrent requests)
- [ ] Monitor response times (should be <1s)
- [ ] Check cache behavior in production
- [ ] Verify error handling
- [ ] Set up production monitoring/alerts
- [ ] Document deployment in runbook

## Phase 9: Team Training (20 minutes)

- [ ] Brief team on Census enrichment feature
- [ ] Show quick reference card
- [ ] Demonstrate API endpoint
- [ ] Show how to use in code
- [ ] Explain caching behavior
- [ ] Cover error scenarios
- [ ] Answer questions

## Phase 10: Validation & Sign-Off (10 minutes)

- [ ] Production endpoint responding ✓
- [ ] Cache hit rate >80% ✓
- [ ] Error handling tested ✓
- [ ] Team aware and trained ✓
- [ ] Monitoring alerts active ✓
- [ ] Documentation complete ✓
- [ ] Manager sign-off ✓

---

## Quick Test Commands

```bash
# Simple test
curl "http://localhost:3000/api/scrapers/census?state=FL"

# With parameters
curl "http://localhost:3000/api/scrapers/census?state=FL&county=Lee&naics=561720"

# POST request
curl -X POST http://localhost:3000/api/scrapers/census \
  -H "Content-Type: application/json" \
  -d '{"state":"FL","county":"Lee"}'

# Check cache
curl "http://localhost:3000/api/scrapers/census?action=metrics"

# Run tests
npm test -- census-scraper.test.ts
```

## File Locations (For Reference)

```
API Endpoint:           /app/api/scrapers/census/route.ts
Core Logic:             /lib/scrapers/census-scraper.ts
Cache Manager:          /lib/census-cache.ts
Type Definitions:       /lib/types/census.ts
Tests:                  /tests/census-scraper.test.ts

Documentation:
- Full API Docs:        /docs/census-scraper.md
- Integration Guide:    /docs/census-integration-guide.md
- Quick Reference:      /docs/CENSUS_QUICK_REFERENCE.md
- Implementation:       /CENSUS_SCRAPER_IMPLEMENTATION.md
- This Checklist:       /CENSUS_SETUP_CHECKLIST.md

Existing Dependency:
- Census API Client:    /lib/census-api.ts (already exists)
```

## Expected Responses

### Success Response (200)
```json
{
  "success": true,
  "demographics": {
    "totalPopulation": 2693117,
    "medianHouseholdIncome": 56789,
    "populationWithBachelor": 450000
  },
  "businessContext": {
    "estimatedMarketSize": "Large (>1M)",
    "keyIndustries": ["Janitorial Services"]
  },
  "source": "census_api",
  "cacheHit": false,
  "timestamp": "2026-06-04T12:00:00Z"
}
```

### Cache Hit Response (200)
```json
{
  ...same fields...,
  "source": "cached",
  "cacheHit": true
}
```

### Error Response (400/500)
```json
{
  "error": "Census enrichment failed",
  "details": "State is required"
}
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "CENSUS_API_KEY not configured" | Add to .env, restart npm |
| Slow response (>5 sec) | Census API slow. Check internet. Will fallback. |
| Rate limit (429) | Wait Retry-After seconds. Too many requests. |
| No demographic data | Check state code (FL, CA, NY, etc.) |
| Cache not working | Check browser cache headers |
| Test failures | Verify CENSUS_API_KEY set before running tests |

## Support & Questions

- **API Docs**: `/docs/census-scraper.md`
- **Integration Guide**: `/docs/census-integration-guide.md`
- **Quick Ref**: `/docs/CENSUS_QUICK_REFERENCE.md`
- **Census API**: https://api.census.gov/data/

## Sign-Off

- Implementation Date: ___________
- API Key Verified: ___________
- Tests Passing: ___________
- Team Training Complete: ___________
- Production Deployed: ___________

---

**Estimated Total Time**: 2-3 hours
**Difficulty**: Easy
**Risk Level**: Low (Census API is read-only, no side effects)
**Rollback Plan**: Remove CENSUS_API_KEY from .env, API returns fallback responses
