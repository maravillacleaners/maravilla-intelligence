# SAM.gov Scraper - Quick Reference Card

## Endpoint

```
GET  /api/scrapers/sam-gov?daysBack=30
POST /api/scrapers/sam-gov
```

## Quick Start

```bash
# Test locally
npm run dev

# In another terminal
curl -X POST http://localhost:3000/api/scrapers/sam-gov \
  -H "Content-Type: application/json" \
  -d '{"daysBack": 3}'
```

## Response

```json
{
  "opportunities_found": 15,      // Filtered to Florida + active
  "stored": 12,                   // Written to Airtable
  "errors": 1,                    // Failed to write
  "skipped": 2,                   // Rate-limited/excluded
  "timestamp": "2026-06-04T...",
  "sample": [                     // First 3 stored records
    {
      "notice_id": "a1234567",
      "title": "Janitorial Services",
      "score": 85,
      "agency": "GSA",
      "deadline": "2026-07-15T23:59Z"
    }
  ],
  "errors_list": []               // First 10 errors (if any)
}
```

## Scoring (1-100)

| Component | Points | Notes |
|-----------|--------|-------|
| NAICS 561720 | +50 | Janitorial Services |
| NAICS 561710-790 | +30 | Related cleaning/facility codes |
| Each keyword match | +10 | janitorial, cleaning, custodian, etc. (max 50) |
| Small business set-aside | +15 | Easier to win |
| Deadline <7 days | +20 | Urgent |
| Deadline 7-14 days | +10 | Soon |
| **Auto-Exclude (=0)** | | asbestos, hazmat, remediation, etc. |

**Result:**
- HIGH (70+) = High confidence opportunity
- MEDIUM (50-69) = Moderate match
- LOW (<50) = Weak signal

## Environment Variables

```bash
# .env or .env.local
AIRTABLE_API_KEY=pat...
AIRTABLE_BASE_ID=app...
AIRTABLE_TBL_OPPORTUNITIES=tbl...
SAM_GOV_API_KEY=SAM-...
```

## Get API Keys

**SAM.gov:** https://api.sam.gov/api-key-management/create  
**Airtable:** Account Settings → Developer Hub

## Airtable Table Fields

| Field | Type | Example |
|-------|------|---------|
| bid_id | Text | a1234567890 |
| title | Text | Janitorial Services - GSA |
| agency | Text | General Services Admin |
| state | Text | FL |
| deadline | Date | 2026-07-15 |
| estimated_value | Number | 50000 |
| source | Text | SAM.gov |
| status | Select | new, review, won, lost |
| score | Number | 85 |
| signal_strength | Select | high, medium, low |
| scope_summary | Long Text | Cleaning and custodial services for federal buildings... |
| cleaning_keywords | Text | janitorial, cleaning, custodian |
| naics_codes | Text | 561720 |
| source_url | Text | https://sam.gov/opp/a1234567890/view |
| contact_name | Text | John Smith |
| contact_email | Email | john.smith@gsa.gov |
| contact_phone | Text | 202-555-0100 |

## Test Locally

```bash
# Unit tests
npx ts-node scripts/test-sam-scraper.ts

# Expected: ✅ 6 tests pass

# Integration test (after running dev server)
curl http://localhost:3000/api/scrapers/sam-gov?daysBack=1

# Check Airtable
# Filter: {source} = 'SAM.gov'
# Should see new records with scores
```

## Deploy to VPS

```bash
ssh root@72.61.92.220
cd /root/maravilla-intelligence

# Add API key to .env
nano .env
# Add: SAM_GOV_API_KEY=SAM-...

git pull
npm run build
docker restart maravilla-intelligence

# Verify
curl http://localhost:3002/api/scrapers/sam-gov?daysBack=1
```

## Schedule Scrapes

### GitHub Actions (Monday 8 AM)
```yaml
# .github/workflows/sam-gov-scrape.yml
name: Weekly SAM.gov Scrape
on:
  schedule:
    - cron: '0 8 * * 1'

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - run: curl -X POST https://suppliers.maravillacleaners.com/api/scrapers/sam-gov \
              -d '{"daysBack": 7}' -H 'Content-Type: application/json'
```

### Cron (Linux)
```bash
# Add to crontab
crontab -e

# Daily 8 AM
0 8 * * * curl -X POST http://localhost:3002/api/scrapers/sam-gov -d '{"daysBack": 1}' -H 'Content-Type: application/json'
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Missing Airtable credentials" | Check .env has all 3 AIRTABLE_* vars |
| "SAM.gov API error 401" | Verify SAM_GOV_API_KEY starts with "SAM-" |
| "Invalid table ID" | Copy correct ID from Airtable (starts with tbl...) |
| Opportunities not storing | Check table fields exist and match names (case-sensitive) |
| Slow performance | Reduce daysBack or run during off-peak |
| No opportunities found | Scoring filters low-relevance ones; check for excluded keywords |

## Monitoring

```bash
# View logs in real-time
docker logs -f maravilla-intelligence | grep SAM

# Last 50 lines
docker logs --tail 50 maravilla-intelligence | grep SAM

# Search errors
docker logs maravilla-intelligence | grep -i error | grep SAM
```

## Airtable Quick Checks

1. **Verify table structure:** Opportunities table has 17 fields
2. **Check recent records:** Filter {source} = 'SAM.gov'
3. **Validate scoring:** Top records (score 70+) are relevant
4. **Confirm contacts:** High-signal records have email addresses
5. **Check deadlines:** Most deadlines 30+ days away (planning horizon)

## Performance Targets

| Metric | Target | Actual |
|--------|--------|--------|
| Runtime (30-day) | <2 min | ~60s |
| Opportunities found | 10-50 | TBD |
| High-signal rate (70+) | 30-50% | TBD |
| Contact capture | 80%+ | TBD |
| Duplicate rate | <5% | TBD |

## Files

| Path | Purpose |
|------|---------|
| `/app/api/scrapers/sam-gov/route.ts` | Main endpoint (330 lines) |
| `/scripts/test-sam-scraper.ts` | Test suite (200 lines) |
| `/SAM_GOV_SCRAPER_ENHANCED.md` | Full documentation |
| `/docs/SAM_GOV_DEPLOYMENT.md` | Deployment guide |
| `/docs/SAM_GOV_QUICK_REFERENCE.md` | This file |

## Support

**Full docs:** See `/SAM_GOV_SCRAPER_ENHANCED.md`  
**Deployment:** See `/docs/SAM_GOV_DEPLOYMENT.md`  
**Issues:** Check Troubleshooting section above or review logs

---

**Version:** 1.0.0 | **Date:** 2026-06-04 | **Status:** Production-Ready
