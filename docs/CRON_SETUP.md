# Cron Job Setup Guide

## Overview

The cron sync jobs automatically pull opportunities and intelligence data from external sources (USASpending, SAM.gov) and sync them to Airtable.

### Endpoints

- **GET /api/sync/opportunities** — Fetch recently-awarded cleaning contracts from USASpending (default: 2 pages, 90-day lookback)
- **GET /api/sync/national** — Fetch intelligence/contract intelligence data from USASpending (default: 1 page)
- **GET /api/sync-status** — Check cron health and latest sync run status

### Current Schedule

Every 15 minutes (`*/15 * * * *`)

## VPS Setup Instructions

### 1. Copy the Cron Script

```bash
scp scripts/cron-sync.js root@72.61.92.220:/app/scripts/
```

### 2. Install on VPS

```bash
ssh root@72.61.92.220

# Create logs directory
mkdir -p /app/logs

# Test the script
cd /app
node scripts/cron-sync.js

# Output should show sync results
```

### 3. Add to Crontab

```bash
# Edit crontab
crontab -e

# Add this line (runs every 15 minutes):
*/15 * * * * cd /app && node scripts/cron-sync.js >> logs/cron-sync.log 2>&1

# Or for every 6 hours (as mentioned in Phase 9):
0 */6 * * * cd /app && node scripts/cron-sync.js >> logs/cron-sync.log 2>&1
```

### 4. Verify Setup

```bash
# Check if cron job is installed
crontab -l

# Monitor logs in real-time
tail -f /app/logs/cron-sync.log

# Check sync status via API
curl http://localhost:3002/api/sync-status
```

## API Reference

### GET /api/sync/opportunities

**Query Parameters:**
- `pages` (default: 2, max: 5) — Number of USASpending pages to fetch
- `days` (default: 90, max: 365) — Lookback window in days

**Response:**
```json
{
  "success": true,
  "synced": 5,
  "skipped": 10,
  "total_fetched": 15,
  "errors": [],
  "synced_at": "2026-06-01T18:40:01.000Z"
}
```

### GET /api/sync/national

**Query Parameters:**
- `pages` (default: 1, max: 10) — Number of USASpending pages to fetch

**Response:**
```json
{
  "success": true,
  "synced": 3,
  "skipped": 5,
  "intelligence_created": 3,
  "synced_at": "2026-06-01T18:40:01.000Z"
}
```

### GET /api/sync-status

**Response:**
```json
{
  "runs": [
    {
      "timestamp": "2026-06-01T18:40:01.000Z",
      "name": "opportunities",
      "endpoint": "/api/sync/opportunities?pages=2&days=90",
      "success": true,
      "synced": 5,
      "skipped": 10,
      "duration_ms": 1234
    }
  ],
  "airtable": {
    "total": 150,
    "mostRecent": "2026-06-01",
    "avgScore": 45,
    "sources": {
      "USASpending": 100,
      "SAM.gov": 50
    }
  },
  "cron": {
    "schedule": "*/15 * * * *",
    "lastRun": "2026-06-01T18:40:01.000Z",
    "lastRunAgeMinutes": 5,
    "status": "healthy",
    "nextSources": ["USASpending", "SAM.gov (pending key)"]
  },
  "generated_at": "2026-06-01T18:45:01.000Z"
}
```

## Sync Run Log

Sync runs are logged to `data/sync-runs.json` with the last 100 runs kept for history.

```bash
# View recent sync runs
cat data/sync-runs.json | jq '.runs | .[0:5]'
```

## Troubleshooting

### Cron job not running

1. Verify cron is installed: `crontab -l`
2. Check cron daemon: `systemctl status cron` (Linux) or `launchctl list | grep cron` (macOS)
3. Check logs: `tail -f /app/logs/cron-sync.log`
4. Test manually: `cd /app && node scripts/cron-sync.js`

### Sync failures

1. Check Airtable API key in environment: `echo $AIRTABLE_API_KEY`
2. Verify USASpending API is accessible: `curl https://api.usaspending.gov/api/v2/search/spending_by_award/ -X POST`
3. Check application logs: `pm2 logs maravilla-intelligence`

### Rate limiting

If you see rate-limiting errors:
- Reduce sync frequency (increase cron interval)
- Reduce pages per sync (add `?pages=1` to endpoints)
- Increase delay between batches in sync script

## Performance Notes

- **Opportunities sync:** ~1-3 seconds per 2 pages (30-60 seconds with Airtable ingestion)
- **Intelligence sync:** ~0.5-2 seconds per page (5-10 seconds with Airtable ingestion)
- **Batch size:** 10 records per Airtable batch write (respects rate limits)
- **Typical run time:** 90-120 seconds for full sync

## Next Steps

1. Deploy script to VPS
2. Add cron job to crontab
3. Monitor `/api/sync-status` for health
4. Adjust schedule if needed (currently every 15 minutes, could be 30min, 1h, or 6h)

---

**Last Updated:** 2026-06-01  
**Status:** Ready for VPS deployment
