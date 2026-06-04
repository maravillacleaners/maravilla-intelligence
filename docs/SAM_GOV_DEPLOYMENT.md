# SAM.gov Scraper - Deployment Guide

## Pre-Deployment Checklist

- [ ] SAM.gov API key obtained and tested
- [ ] Airtable credentials configured
- [ ] Opportunities table exists with required fields
- [ ] Build passes locally: `npm run build`
- [ ] Tests pass: `npm test` (if applicable)
- [ ] Route compiles without TypeScript errors

## 1. Get SAM.gov API Key

### Step 1: Register for API Access
1. Visit: https://api.sam.gov/api-key-management/create
2. Fill out registration form
3. Email confirmation received
4. Verify email address

### Step 2: Generate API Key
1. Log in to: https://api.sam.gov/
2. Click "Create API Key"
3. Copy the key (format: `SAM-xxxxxxxx-xxxx-xxxx-xxxx`)
4. Save securely

**Note:** Keys do not expire, but can be revoked. Keep backup copy.

## 2. Prepare Environment Variables

### Local Development (.env.local)

```bash
# Airtable (get from base settings)
AIRTABLE_API_KEY=patXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXXXX
AIRTABLE_TBL_OPPORTUNITIES=tblXXXXXXXXXXXXXXXX

# SAM.gov (from step 1 above)
SAM_GOV_API_KEY=SAM-xxxxxxxx-xxxx-xxxx-xxxx
```

### Production VPS (.env or environment)

On VPS at `/root/maravilla-intelligence/.env`:

```bash
# Copy all values from .env.local
# Critical: DO NOT commit .env to git
# Store credentials separately on VPS
```

## 3. Verify Airtable Table Structure

### Required Table: Opportunities (tbldTDb1v79dVNCTQ)

**Field Definitions:**

| Field Name | Type | Notes |
|-----------|------|-------|
| bid_id | Text | SAM.gov Notice ID (primary key) |
| title | Text | Opportunity title |
| agency | Text | Contracting agency |
| state | Text | State code (always 'FL') |
| deadline | Date | Response deadline |
| estimated_value | Number | Dollar amount |
| source | Text | 'SAM.gov' |
| status | Single Select | Values: new, review, won, lost, archived |
| score | Number | 1-100 relevance score |
| signal_strength | Single Select | Values: high, medium, low |
| scope_summary | Long Text | Opportunity description |
| cleaning_keywords | Text | Comma-separated keywords |
| naics_codes | Text | NAICS codes |
| source_url | Text | URL to opportunity |
| contact_name | Text | Primary POC name |
| contact_email | Email | Primary POC email |
| contact_phone | Text | Primary POC phone |

**Creation Instructions:**

1. In Airtable, create table named "Opportunities"
2. Add fields above (copy field names exactly)
3. Set field types as specified
4. For status: add options: new, review, won, lost, archived
5. For signal_strength: add options: high, medium, low
6. Copy table ID (tblXXXX...) from base URL

## 4. Local Testing

### Quick Test

```bash
# Start dev server
npm run dev

# In another terminal, trigger scrape
curl -X POST http://localhost:3000/api/scrapers/sam-gov \
  -H "Content-Type: application/json" \
  -d '{"daysBack": 3}'
```

### Expected Output

```json
{
  "opportunities_found": 5,
  "stored": 4,
  "errors": 0,
  "skipped": 1,
  "timestamp": "2026-06-04T10:30:00.000Z",
  "sample": [...]
}
```

### Troubleshooting Errors

**Error: "Missing Airtable credentials"**
```bash
# Check .env.local
grep AIRTABLE .env.local

# Restart dev server after adding to .env.local
# (Next.js doesn't hot-reload env vars)
```

**Error: "SAM.gov API error 401"**
```bash
# Verify API key format
echo $SAM_GOV_API_KEY  # Should start with "SAM-"

# Test key directly
curl https://api.sam.gov/prod/opportunities/v2/search \
  -G \
  --data-urlencode "api_key=YOUR_KEY" \
  --data-urlencode "limit=1"
```

**Error: "Invalid Airtable table ID"**
```bash
# Get correct table ID from URL
# When viewing table, URL is: 
# https://airtable.com/BASE_ID/TBL_ID
# Copy TBL_ID (starts with 'tbl')
```

## 5. Production Deployment

### On VPS (72.61.92.220)

```bash
# SSH to VPS
ssh root@72.61.92.220

# Navigate to project
cd /root/maravilla-intelligence

# Update code
git pull origin main

# Update .env with SAM.gov key (if not already present)
nano .env

# Add these lines:
# SAM_GOV_API_KEY=SAM-xxxxxxxx-xxxx-xxxx-xxxx
# (Keep other vars unchanged)

# Save (Ctrl+X, Y, Enter)

# Rebuild (if using standalone mode)
npm run build

# Restart container/process
docker restart maravilla-intelligence
# OR if using systemd:
systemctl restart maravilla

# Verify running
ps aux | grep node

# Check logs
docker logs -f maravilla-intelligence
# OR
journalctl -u maravilla -f
```

## 6. Scheduling Automated Scrapes

### Option A: GitHub Actions (Recommended)

Create `.github/workflows/sam-gov-scrape.yml`:

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
          curl -X POST https://suppliers.maravillacleaners.com/api/scrapers/sam-gov \
            -H "Content-Type: application/json" \
            -d '{"daysBack": 7}' \
            --max-time 300
```

### Option B: Cron Job on VPS

On VPS `/root/cron-sam-scrape.sh`:

```bash
#!/bin/bash

# Daily SAM.gov scrape at 8 AM
curl -X POST http://localhost:3002/api/scrapers/sam-gov \
  -H "Content-Type: application/json" \
  -d '{"daysBack": 1}' \
  --max-time 300

# Log results
echo "[$(date)] SAM.gov scrape completed" >> /var/log/maravilla/sam-scrape.log
```

Add to crontab:
```bash
crontab -e

# Add line:
0 8 * * * /root/cron-sam-scrape.sh
```

### Option C: Node.js Cron (In-App)

In `/lib/cron-jobs.ts`:

```typescript
import cron from 'node-cron'

export function registerSamGovScrape() {
  // Every Monday at 8 AM
  cron.schedule('0 8 * * 1', async () => {
    try {
      const res = await fetch(`${process.env.APP_URL}/api/scrapers/sam-gov`, {
        method: 'POST',
        body: JSON.stringify({ daysBack: 7 })
      })
      const result = await res.json()
      console.log('[SAM.gov Cron] Result:', result)
    } catch (error) {
      console.error('[SAM.gov Cron] Error:', error)
    }
  })
}

// Call in server initialization:
// import { registerSamGovScrape } from '@/lib/cron-jobs'
// registerSamGovScrape()
```

## 7. Monitoring in Production

### View Logs

```bash
# Real-time logs
docker logs -f maravilla-intelligence

# Last 50 lines
docker logs --tail 50 maravilla-intelligence

# Search for SAM.gov entries
docker logs maravilla-intelligence | grep "SAM.gov"
```

### Check Airtable Records

1. Open Airtable base
2. Go to Opportunities table
3. Filter: `{source} = 'SAM.gov'`
4. Sort by created date (newest first)
5. Verify fields populated correctly

### Verify Scoring

1. In Opportunities table, add view/filter by score
2. High-signal opportunities (score 70+) should include:
   - NAICS 561720 (Janitorial)
   - "Cleaning" or "Janitorial" in title
   - Small business set-asides
   - Near-term deadlines

### Alert on Errors

Option 1: Add Slack notification to scraper:

```typescript
if (result.errors > 0) {
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify({
      text: `❌ SAM.gov scrape: ${result.errors} errors`,
      details: result.errors_list
    })
  })
}
```

Option 2: Monitor logs with error tracking (DataDog, Sentry, etc.)

## 8. Optimization Tips

### Reduce API Calls
- **Default:** 30-day lookback
- **Daily runs:** Use `daysBack: 1`
- **Weekly runs:** Use `daysBack: 7`
- **Monthly runs:** Use `daysBack: 30`

### Improve Performance
```bash
# Run during off-peak hours (e.g., 2 AM)
2 2 * * * /root/cron-sam-scrape.sh

# Or before high-traffic windows
30 7 * * 1  # 7:30 AM Monday
```

### Manage Storage
- Archive old opportunities after 90 days
- Filter by `{status} != 'new'` when archiving
- Bulk delete via Airtable interface

## 9. Troubleshooting Deployment Issues

### Issue: Scraper timeout (>5 min)
```bash
# Check network latency to SAM.gov
ping api.sam.gov

# Reduce daysBack or number of NAICS codes
# Increase rate-limit delays if SAM.gov returning 429
```

### Issue: Airtable quota exceeded
```bash
# Check Airtable API usage
# https://airtable.com/account/billing

# Options:
# 1. Reduce frequency of scrapes
# 2. Reduce daysBack window
# 3. Upgrade Airtable plan
```

### Issue: Records not appearing in Airtable
```bash
# Check status code in logs
grep "response: 20" logs  # Expect 200-299

# Verify table exists and ID is correct
# Check field names match exactly (case-sensitive)

# Manual test:
curl -X GET https://api.airtable.com/v0/appXXX/tblXXX \
  -H "Authorization: Bearer patXXX" | jq '.records | length'
```

## 10. Rollback Plan

If scraper causes issues:

```bash
# Stop scraper (disable cron)
crontab -e  # Comment out SAM.gov line

# Remove problematic records
# In Airtable: Filter {source} = 'SAM.gov' and delete rows
# OR via API:
# Use /api/opportunities?source=SAM.gov and delete each

# Rollback code to previous version
git revert <commit-hash>
npm run build
docker restart maravilla-intelligence
```

## Next Steps

1. **Test locally first** with `daysBack=3`
2. **Deploy to VPS** and verify with `daysBack=1`
3. **Check Airtable** for records with correct fields
4. **Schedule** for daily/weekly runs
5. **Monitor** first week closely
6. **Optimize** scoring weights based on real results
7. **Integrate** with outreach workflows

## Support

For issues:
1. Check SAM_GOV_SCRAPER_ENHANCED.md for API details
2. Review logs: `docker logs maravilla-intelligence | grep SAM`
3. Verify .env variables present and correct
4. Test with curl commands above
5. Confirm Airtable table structure matches

## References

- SAM.gov API Docs: https://api.sam.gov/
- Airtable API Docs: https://airtable.com/developers/web/api/overview
- Next.js API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
