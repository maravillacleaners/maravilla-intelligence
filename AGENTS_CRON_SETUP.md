# Autonomous Agent Cron Jobs Setup

**Status:** Ready for deployment  
**Date:** 2026-06-04  
**Cron Jobs Configured:** 3  
**First Run:** See schedule below

---

## Overview

Three autonomous agent cron jobs have been configured to trigger intelligence API endpoints on recurring schedules:

| Agent | Endpoint | Schedule | Interval |
|-------|----------|----------|----------|
| SAM Discovery | `/api/agents/sam-discovery` | 00:00, 06:00, 12:00, 18:00 UTC | 6 hours |
| Company Enrichment | `/api/agents/enrich-company` | Every hour at :00 UTC | 1 hour |
| Contact Discovery | `/api/agents/discover-contacts` | 00:00, 02:00, 04:00... 22:00 UTC | 2 hours |

**Total Daily Executions:** 4 + 24 + 12 = **40 autonomous agent runs/day**

---

## Deployment Options

### Option A: GitHub Actions (Recommended for VPS)

**Files Created:**
- `.github/workflows/agents-discovery-cron.yml` — SAM discovery every 6h
- `.github/workflows/agents-enrichment-cron.yml` — Enrichment every 1h
- `.github/workflows/agents-contacts-cron.yml` — Contacts every 2h

**Setup Steps:**

1. **Set GitHub Secrets**
   ```bash
   gh secret set API_BASE_URL --body "http://72.61.92.220:3002"
   gh secret set API_JWT_TOKEN --body "<your-jwt-token-here>"
   gh secret set SLACK_WEBHOOK_OPS --body "<slack-ops-webhook-url>"
   ```

2. **Verify Secrets**
   ```bash
   gh secret list
   # Should show:
   # API_BASE_URL          updated 2026-06-04
   # API_JWT_TOKEN         updated 2026-06-04
   # SLACK_WEBHOOK_OPS     updated 2026-06-04
   ```

3. **Monitor Workflows**
   - Go to: https://github.com/maravillacleaners/maravilla-intelligence/actions
   - Watch workflows execute on schedule
   - Check logs for HTTP status codes (200/202 = success)

**Advantages:**
- ✅ Free tier includes 2,000 GitHub Actions minutes/month
- ✅ Automatic retry on failure
- ✅ Built-in logging & history
- ✅ No additional infrastructure
- ✅ Works with existing VPS deployment

**Costs:** $0 (within free tier for most projects)

---

### Option B: n8n Self-Hosted (For Advanced Orchestration)

**Files Created:**
- `n8n-workflows/agent-cron-sam-discovery.json`
- `n8n-workflows/agent-cron-enrichment.json`
- `n8n-workflows/agent-cron-contacts.json`

**Setup Steps:**

1. **Access n8n UI**
   ```
   http://srv1112587.hstgr.cloud:5678
   ```

2. **Import Workflows**
   - Click "Projects" → "+ Create New Workflow"
   - Copy JSON from `n8n-workflows/agent-cron-*.json`
   - Paste into Editor
   - Click "Import from JSON"

3. **Configure Credentials**
   ```
   Settings → Credentials → New
   Type: HTTP Header Auth
   Name: jwt_token
   Headers: { "Authorization": "Bearer <your-jwt-token>" }
   ```

4. **Set Environment Variables**
   ```
   API_HOST: http://72.61.92.220:3002
   SLACK_WEBHOOK_OPS: <slack-webhook-url>
   ```

5. **Activate Workflows**
   - Toggle "Active" to ON for each workflow
   - Workflows will trigger on schedule

**Advantages:**
- ✅ Visual workflow builder
- ✅ More complex conditional logic possible
- ✅ Local execution (no GitHub Actions minutes used)
- ✅ Database retention of all executions
- ✅ Email/SMS notifications built-in

**Costs:** Free (self-hosted) or $10-50/month (n8n Cloud)

---

## API Endpoint Details

### 1. SAM Discovery Agent
**Endpoint:** `POST /api/agents/sam-discovery`

**Request Body:**
```json
{
  "source": "sam",
  "limit": 100,
  "filters": {
    "status": "Active"
  }
}
```

**Expected Response (202 Accepted):**
```json
{
  "success": true,
  "jobId": "sam-discovery-1717459200000",
  "recordsProcessed": 87,
  "timestamp": "2026-06-04T06:00:00Z"
}
```

**Success Codes:** 200, 202  
**Timeout:** 10 minutes

---

### 2. Company Enrichment Agent
**Endpoint:** `POST /api/agents/enrich-company`

**Request Body:**
```json
{
  "batchSize": 50,
  "prioritizeNew": true,
  "sources": ["hunter", "clearbit"]
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "enriched": 42,
  "skipped": 8,
  "errors": 0,
  "timestamp": "2026-06-04T07:00:00Z"
}
```

**Success Codes:** 200, 202, 204  
**Timeout:** 60 seconds

---

### 3. Contact Discovery Agent
**Endpoint:** `POST /api/agents/discover-contacts`

**Request Body:**
```json
{
  "limit": 200,
  "includeRelated": true,
  "enrichRoles": true,
  "filters": {
    "minScore": 50,
    "status": "Active"
  }
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "discovered": 156,
  "related": 312,
  "timestamp": "2026-06-04T08:00:00Z"
}
```

**Success Codes:** 200, 202  
**Timeout:** 15 minutes

---

## Scheduling Calendar

### UTC Schedule (Full 24-hour cycle)

**SAM Discovery (Every 6 hours)**
```
00:00 ← First run
06:00
12:00
18:00
```
→ **Next SAM run:** 4 times daily

**Company Enrichment (Every 1 hour)**
```
00:00, 01:00, 02:00, 03:00, 04:00, 05:00, 06:00, 07:00,
08:00, 09:00, 10:00, 11:00, 12:00, 13:00, 14:00, 15:00,
16:00, 17:00, 18:00, 19:00, 20:00, 21:00, 22:00, 23:00
```
→ **Next enrichment run:** 24 times daily (every hour)

**Contact Discovery (Every 2 hours)**
```
00:00, 02:00, 04:00, 06:00, 08:00, 10:00, 12:00, 14:00,
16:00, 18:00, 20:00, 22:00
```
→ **Next contact run:** 12 times daily (every 2 hours)

---

## First Run Times

**From deployment time (assume 18:00 UTC on 2026-06-04):**

| Agent | First Run | Minutes Until |
|-------|-----------|----------------|
| SAM Discovery | 2026-06-05 00:00 UTC | 360 min (6 hours) |
| Company Enrichment | 2026-06-04 19:00 UTC | 60 min (1 hour) |
| Contact Discovery | 2026-06-04 20:00 UTC | 120 min (2 hours) |

**Note:** GitHub Actions scheduler runs crons at UTC. Adjust accordingly for your timezone.

---

## Monitoring & Troubleshooting

### GitHub Actions

**View Execution Logs:**
1. Go to: https://github.com/maravillacleaners/maravilla-intelligence/actions
2. Click workflow name (e.g., "Agent Cron - SAM Discovery")
3. Click latest run
4. Expand "Trigger SAM Discovery Agent" step
5. Check HTTP status code and response body

**Common HTTP Status Codes:**
- ✅ `200` — Success, processing complete
- ✅ `202` — Accepted, processing async
- ✅ `204` — No content (nothing to process)
- ❌ `401` — JWT token expired or invalid
- ❌ `403` — Forbidden, check permissions
- ❌ `500` — Server error, check API logs

**If Cron Fails:**
1. Check API server is running: `curl http://72.61.92.220:3002/health`
2. Verify JWT token is valid (check `.env` on VPS)
3. Check GitHub Actions secret: `gh secret list`
4. View VPS logs: `ssh root@72.61.92.220 && docker logs <container-id>`

### n8n

**View Execution History:**
1. Login to n8n: http://srv1112587.hstgr.cloud:5678
2. Click workflow
3. Click "Executions" tab
4. Review success/failure for each run

**If Workflow Fails:**
1. Check HTTP endpoint is reachable: n8n "Test Trigger"
2. Verify credentials in "Settings" → "Credentials"
3. Check environment variables: "Settings" → "Environment Variables"
4. Review error in execution details

---

## Manual Trigger (For Testing)

### Test GitHub Actions Manually

```bash
# SAM Discovery
curl -X POST \
  -H "Authorization: Bearer ${API_JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"source": "sam", "limit": 100, "filters": {"status": "Active"}}' \
  http://72.61.92.220:3002/api/agents/sam-discovery

# Company Enrichment
curl -X POST \
  -H "Authorization: Bearer ${API_JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 50, "prioritizeNew": true, "sources": ["hunter", "clearbit"]}' \
  http://72.61.92.220:3002/api/agents/enrich-company

# Contact Discovery
curl -X POST \
  -H "Authorization: Bearer ${API_JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"limit": 200, "includeRelated": true, "enrichRoles": true, "filters": {"minScore": 50, "status": "Active"}}' \
  http://72.61.92.220:3002/api/agents/discover-contacts
```

### Expected Output (All Success)
```
HTTP 200 or 202
{
  "success": true,
  "jobId": "...",
  "timestamp": "2026-06-04T..."
}
```

---

## Performance Metrics

### Daily Agent Execution Volume

```
SAM Discovery:        4 runs × 100 records  = 400 records/day
Company Enrichment:  24 runs × 50 records  = 1,200 records/day
Contact Discovery:  12 runs × 200 records = 2,400 records/day
────────────────────────────────────────────────────────────
TOTAL:              40 runs              = 4,000 events/day
```

### Estimated Processing Time

| Agent | Per Run | Daily Total | CPU Impact |
|-------|---------|-------------|-----------|
| SAM Discovery | 2-3 min | 8-12 min | Low |
| Company Enrichment | 30-40 sec | 12-16 min | Medium |
| Contact Discovery | 3-5 min | 36-60 min | Medium |
| **COMBINED** | **~6-8 min** | **~60-90 min** | **Medium** |

**Note:** Enrichment agents may have overlapping execution windows. VPS should handle comfortably.

---

## Next Steps

### Immediate (Deploy Today)

- [ ] Choose deployment option (GitHub Actions recommended)
- [ ] Configure secrets/credentials
- [ ] Push to GitHub or import into n8n
- [ ] Monitor first 24 hours of executions

### Week 1

- [ ] Review Slack notifications for failures
- [ ] Check Airtable records are being populated
- [ ] Validate data quality from agents

### Ongoing

- [ ] Set up alerting for failed crons
- [ ] Monitor API response times
- [ ] Adjust batch sizes if needed
- [ ] Schedule weekly review of agent logs

---

## Files Reference

### GitHub Actions Workflows
- `.github/workflows/agents-discovery-cron.yml` (6h schedule)
- `.github/workflows/agents-enrichment-cron.yml` (1h schedule)
- `.github/workflows/agents-contacts-cron.yml` (2h schedule)

### n8n Workflows
- `n8n-workflows/agent-cron-sam-discovery.json`
- `n8n-workflows/agent-cron-enrichment.json`
- `n8n-workflows/agent-cron-contacts.json`

### Environment Variables Needed
- `API_BASE_URL` — http://72.61.92.220:3002
- `API_JWT_TOKEN` — JWT token with agent permissions
- `SLACK_WEBHOOK_OPS` — Slack ops webhook for notifications

---

## Support

For issues or questions:
1. Check VPS API health: `curl http://72.61.92.220:3002/health`
2. Review GitHub Actions logs
3. Check n8n execution history
4. Inspect API server logs on VPS

---

**Last Updated:** 2026-06-04  
**Deploy Status:** Ready ✅
