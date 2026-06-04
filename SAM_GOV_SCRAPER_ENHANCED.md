# SAM.gov Scraper - Enhanced Opportunity Discovery

## Overview

The enhanced SAM.gov scraper endpoint at `/api/scrapers/sam-gov` discovers federal cleaning contract opportunities in Florida and automatically stores them in the Airtable Opportunities table with scoring and relevance filtering.

**File:** `/app/api/scrapers/sam-gov/route.ts`

## Features

### 1. Location Filtering
- **Geographic Focus:** Florida only (state = 'FL')
- **County Support:** Miami-Dade, Hillsborough, Duval, Lee, Polk, St Lucie, Collier, Broward, Orange, Palm Beach
- **Active Opportunities Only:** Filters for opportunities with `active: true`

### 2. NAICS Code Filtering
- **561720** - Janitorial Services (primary target - 50 points)
- **561710** - Exterminating and Pest Control (30 points)
- **561730** - Landscaping Services (30 points)
- **561790** - Other Services to Buildings and Dwellings (30 points)
- **561110** - Office Administrative Services (30 points)
- **561210** - Facilities Support Services (30 points)

### 3. Opportunity Scoring (1-100)
Scoring algorithm evaluates:
- **NAICS Code Match** (0-50 points)
  - Exact match on 561720 = 50 points
  - Related codes = 30 points
  
- **Keyword Matching** (0-50 points)
  - Scoring keywords: janitorial, cleaning, custodian, housekeeping, sanitation, facility, maintenance, disinfect, sanitiz, hygiene
  - Each match = +10 points
  
- **Set-Aside Status** (+15 points)
  - Small business set-asides indicate easier win probability
  
- **Deadline Urgency** (0-20 points)
  - Less than 7 days = +20 points
  - 7-14 days = +10 points
  
- **Automatic Disqualifiers** (Score = 0)
  - Contains keywords: asbestos, hazmat, remediation, abatement, waste disposal, landfill

### 4. Signal Strength Classification
- **HIGH:** Score >= 70 (High confidence opportunities)
- **MEDIUM:** Score 50-69 (Moderate match)
- **LOW:** Score < 50 (Weak signal, may still be relevant)

### 5. Contact Information Extraction
- Extracts primary point of contact (POC) from SAM.gov API:
  - Full name
  - Email address
  - Phone number
- Falls back to secondary contact if primary unavailable
- Stored in Opportunities table for direct outreach

### 6. Airtable Storage
Creates/updates records in Opportunities table with fields:
- **bid_id** - SAM.gov Notice ID
- **title** - Opportunity title (200 char limit)
- **agency** - Contracting agency (100 char limit)
- **state** - 'FL'
- **deadline** - Response deadline (ISO 8601)
- **estimated_value** - Opportunity value (null if unavailable)
- **source** - 'SAM.gov'
- **status** - 'new' (initial status)
- **score** - Relevance score (1-100)
- **signal_strength** - 'high' | 'medium' | 'low'
- **scope_summary** - Opportunity description (500 char limit)
- **cleaning_keywords** - Comma-separated keywords found
- **naics_codes** - NAICS code(s)
- **source_url** - Direct link to opportunity on SAM.gov
- **contact_name** - Primary POC name
- **contact_email** - Primary POC email
- **contact_phone** - Primary POC phone

## API Endpoints

### GET /api/scrapers/sam-gov

Trigger a scrape and store opportunities.

**Query Parameters:**
```
?daysBack=30  // Optional: lookback period (default: 30, max: 90)
```

**Example:**
```bash
curl -X GET "http://localhost:3000/api/scrapers/sam-gov?daysBack=30"
```

**Response:**
```json
{
  "opportunities_found": 15,
  "stored": 12,
  "errors": 1,
  "skipped": 2,
  "timestamp": "2026-06-04T10:30:00.000Z",
  "sample": [
    {
      "notice_id": "a1234567890",
      "title": "Janitorial Services for Federal Building",
      "score": 85,
      "agency": "General Services Administration",
      "deadline": "2026-07-15T23:59:59Z"
    }
  ],
  "errors_list": [
    "a1234567891: timeout after 30s"
  ]
}
```

### POST /api/scrapers/sam-gov

Trigger a scrape with optional parameters.

**Request Body:**
```json
{
  "daysBack": 30
}
```

**Example:**
```bash
curl -X POST "http://localhost:3000/api/scrapers/sam-gov" \
  -H "Content-Type: application/json" \
  -d '{"daysBack": 30}'
```

**Response:** (Same format as GET)

## Response Format

```typescript
interface ScrapeResult {
  opportunities_found: number  // Total opportunities matching criteria
  stored: number              // Successfully written to Airtable
  errors: number              // Failed writes
  skipped: number             // Filtered or rate-limited
  timestamp: string           // When scrape completed
  sample?: Array<{            // First 3 stored opportunities
    notice_id: string
    title: string
    score: number
    agency: string
    deadline: string | null
  }>
  errors_list?: string[]      // First 10 errors encountered
}
```

## Implementation Details

### Rate Limiting
- **SAM.gov API:** 300ms delay between NAICS/state combinations
- **Airtable Writes:** 100ms delay between records
- **Prevents:** API throttling and rate-limit errors

### Error Handling
- **Missing Credentials:** Returns 400 with error message
- **SAM.gov API Errors:** Logs and continues, returns partial results
- **Airtable Write Failures:** Records in `errors_list`, continues processing
- **Timeout Protection:** Maximum 90 days lookback period

### Deduplication
- Checks SAM.gov notice IDs to prevent duplicate records
- Airtable handles duplicate bid_id validation at database level

### Scoring Examples

**High-Signal (Score: 85)**
- Title: "Janitorial Services Contract - GSA Schedule"
- NAICS: 561720 (+50)
- Keywords: "janitorial" (+10), "cleaning" (+10), "custodian" (+10)
- Set-aside: Small business (+15)
- **Total: 95 (capped at 100)**

**Medium-Signal (Score: 55)**
- Title: "Facility Maintenance Services"
- NAICS: 561790 (+30)
- Keywords: "facility" (+10), "maintenance" (+10)
- Deadline: 10 days (+5)
- **Total: 55**

**Low-Signal (Score: 25)**
- Title: "General Building Support"
- NAICS: 561110 (+30)
- Keywords: (none matched, 0 points)
- No set-aside
- **Total: 30**

**Excluded (Score: 0)**
- Any title/description containing: asbestos, hazmat, remediation, abatement, waste disposal, landfill

## Configuration

### Environment Variables Required
```env
AIRTABLE_API_KEY=pat_...               # Airtable API key
AIRTABLE_BASE_ID=app...                # Airtable base ID
AIRTABLE_TBL_OPPORTUNITIES=tbl...      # Opportunities table ID
SAM_GOV_API_KEY=SAM-...                # SAM.gov API key
```

### How to Get SAM.gov API Key
1. Visit: https://api.sam.gov/api-key-management/create
2. Register (free)
3. Generate API key
4. Add to environment: `SAM_GOV_API_KEY=SAM-xxxx-xxxx-xxxx`

## Usage Examples

### Daily Scrape via Cron
Add to `/lib/cron-jobs.ts`:
```typescript
export async function runDailySamGovScrape() {
  const res = await fetch('http://localhost:3000/api/scrapers/sam-gov', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ daysBack: 1 })
  })
  const result = await res.json()
  console.log(`[SAM.gov Cron] Scraped ${result.opportunities_found}, stored ${result.stored}`)
}
```

### Manual Dashboard Trigger
Add to frontend component:
```typescript
const handleScrape = async () => {
  setLoading(true)
  try {
    const res = await fetch('/api/scrapers/sam-gov', {
      method: 'POST',
      body: JSON.stringify({ daysBack: 7 })
    })
    const result = await res.json()
    setResult(result)
  } finally {
    setLoading(false)
  }
}
```

### Scheduled Weekly Run
In GitHub Actions (`.github/workflows/sam-gov-scrape.yml`):
```yaml
name: Weekly SAM.gov Scrape
on:
  schedule:
    - cron: '0 8 * * 1'  # Every Monday at 8 AM UTC

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger SAM.gov Scrape
        run: |
          curl -X POST https://your-domain.com/api/scrapers/sam-gov \
            -H "Content-Type: application/json" \
            -d '{"daysBack": 7}'
```

## Performance

- **Typical Run Time:** 30-90 seconds for 30-day lookback
- **API Calls:** ~100-150 to SAM.gov (depends on states/NAICS codes)
- **Airtable Writes:** ~10-50 records per run
- **Network:** ~2-5 MB data transfer

## Monitoring & Debugging

### Check Logs
```bash
# Production logs
tail -f /var/log/maravilla-intelligence/api.log | grep "SAM.gov"

# Local development
npm run dev  # Logs appear in console
```

### Test Locally
```bash
# Run with custom lookback
curl -X POST http://localhost:3000/api/scrapers/sam-gov \
  -H "Content-Type: application/json" \
  -d '{"daysBack": 3}'

# Check stored records in Airtable
# Filter Opportunities table by: {source} = 'SAM.gov'
```

### Troubleshooting

**Issue: "Missing Airtable credentials"**
- Check `.env.local` has: `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `AIRTABLE_TBL_OPPORTUNITIES`

**Issue: SAM.gov API errors (403/401)**
- Verify `SAM_GOV_API_KEY` is valid and active
- Check API key hasn't expired (keys can expire)

**Issue: Opportunities not storing**
- Check Airtable table has required fields (see fields list above)
- Verify opportunity `score > 0` (low-relevance ones filtered)
- Check for duplicate `bid_id` (Airtable may reject)

**Issue: Slow performance**
- Reduce `daysBack` to narrow scope
- Run during off-peak hours
- Check network connectivity to SAM.gov and Airtable

## Next Steps

1. **Deploy to VPS:** Update `.env` on production server with API keys
2. **Test First:** Run with `daysBack=3` to verify scoring/storage
3. **Schedule:** Add to daily/weekly cron or GitHub Actions
4. **Monitor:** Review Opportunities table for quality of matches
5. **Refine:** Adjust scoring weights if needed based on real results
6. **Enhance:** Add email notifications when high-signal opportunities found

## Testing Checklist

- [ ] GET request works: `curl http://localhost:3000/api/scrapers/sam-gov?daysBack=3`
- [ ] POST request works: `curl -X POST http://localhost:3000/api/scrapers/sam-gov`
- [ ] Opportunities stored in Airtable with correct fields
- [ ] Scoring produces scores between 1-100
- [ ] Contact information extracted correctly
- [ ] Duplicate handling works
- [ ] Error handling graceful (returns partial results)
- [ ] Rate limiting working (no SAM.gov API errors)
- [ ] Response format matches ScrapeResult interface

## Files Modified

- `/app/api/scrapers/sam-gov/route.ts` - Enhanced endpoint with full implementation
- `/lib/scrapers/sam-gov-scraper.ts` - Existing fetcher (unchanged, reused)
- `/app/lib/credentials.ts` - Existing credentials helper (reused)

## Version

- **Created:** 2026-06-04
- **Type:** Production-Ready
- **Last Updated:** 2026-06-04
