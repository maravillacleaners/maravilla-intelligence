# Phase 5 Contract Intelligence System - Deployment Guide

## Prerequisites
- n8n instance running (cloud or self-hosted)
- Node.js 16+ with TypeScript support
- Airtable account with Intelligence table created
- Slack workspace with webhook URL
- USA Spending API (no key required)
- SAM.gov API key (optional, currently not configured)

## Environment Configuration

All sensitive data and URLs are externalized in `.env`:
```
API_SERVER_URL=http://localhost:3000
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/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
AIRTABLE_API_KEY=pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92
AIRTABLE_BASE_ID=appZhXnyFiKbnOZLr
```

## Step 1: Start API Server

```powershell
cd C:\Users\Rosan\maravilla-intelligence
npx ts-node src/api-server.ts
```

Expected output:
```
🚀 Phase 5 Contract Intelligence API Server
📡 Running on http://localhost:3000

📋 Available endpoints:
  GET  /health
  GET  /api/discovery/usaspending
  GET  /api/discovery/fedbizopps
  POST /api/intelligence/save-discoveries
  POST /api/intelligence/score-awards
  GET  /api/intelligence/high-scoring-awards

✅ Ready for n8n workflow orchestration
```

## Step 2: Import Workflow into n8n

1. Open n8n dashboard
2. Click **Workflows** → **Import**
3. Select file: `workflows/phase5-contract-intelligence-daily.json`
4. Verify all nodes load without errors
5. Check that environment variable references are visible:
   - `{{ env.API_SERVER_URL }}`
   - `{{ env.SLACK_WEBHOOK_URL }}`

## Step 3: Configure n8n Environment Variables

n8n needs access to the same `.env` file for runtime variable resolution:

**If self-hosted:**
- Copy `.env` to n8n's configuration directory
- Set `N8N_ENCRYPTION_KEY` in `.env` for production
- Restart n8n service

**If cloud-hosted:**
- Add environment variables via n8n dashboard: Settings → Environment
- Configure each variable separately:
  - `API_SERVER_URL`
  - `SLACK_WEBHOOK_URL`
  - `AIRTABLE_API_KEY`
  - `AIRTABLE_BASE_ID`

## Step 4: Test Individual Endpoints

Before activating the full workflow, test each endpoint:

```bash
# Health check
curl http://localhost:3000/health

# USASpending discovery
curl http://localhost:3000/api/discovery/usaspending

# FedBizOpps discovery
curl http://localhost:3000/api/discovery/fedbizopps

# Save discoveries (requires POST with array)
curl -X POST http://localhost:3000/api/intelligence/save-discoveries \
  -H "Content-Type: application/json" \
  -d '{"discoveries":[]}'

# Score awards
curl -X POST http://localhost:3000/api/intelligence/score-awards \
  -H "Content-Type: application/json" \
  -d '{"source":"usaspending"}'

# Get high-scoring awards
curl http://localhost:3000/api/intelligence/high-scoring-awards?minScore=50
```

## Step 5: Verify Airtable Connectivity

1. Open Airtable base: `appZhXnyFiKbnOZLr`
2. Navigate to **Intelligence** table
3. Check field structure matches:
   - `title` (text)
   - `record_type` (select: contract/award)
   - `source` (select: usaspending/sam-gov/fedbizopps)
   - `deadline` (date)
   - `estimated_value` (number)
   - `description` (long text)
   - `naics_code` (text)
   - `url` (url)
   - `discovery_date` (date)
   - `award_score` (number, optional)
   - `scoring_status` (select, optional)
   - `usaspending_id` (text, optional)
   - `sam_contract_id` (text, optional)

## Step 6: Test Slack Notification

In n8n, execute just the final **notify_slack** node with test data to verify webhook connection.

Expected Slack message format:
```
*Phase 5 Contract Intelligence Daily Report*
2026-05-26T12:30:00.000Z

✅ Pipeline Status: completed
📊 High Scoring Awards (score ≥ 50): 42

Phase 5 orchestration completed at 2026-05-26T12:30:00.000Z. Found 42 high-scoring awards (score >= 50).

---
*Top Awards*
```

## Step 7: Activate Workflow

1. In n8n, open **phase5-contract-intelligence-daily**
2. Click **Save**
3. Click **Activate**
4. Verify status shows: **Active** with green indicator
5. Confirm schedule shows: **Cron: Daily 7AM** (America/New_York timezone)

## Execution Schedule

- **Trigger:** Daily at 7:00 AM EST/EDT (America/New_York)
- **Execution order:** Sequential with parallel discovery queries
- **Timeout:** 3600 seconds (1 hour)
- **Max retries:** 2 per node
- **Notification:** Slack #general channel with daily report

## Workflow Data Flow

```
Cron 7AM
  ↓
┌─→ Query USA Spending API (parallel)
│   ├─→ Parse results → DiscoveryResult[]
│   └─→ 
│
├─→ Query FedBizOpps/SAM.gov API (parallel)
│   ├─→ Parse results → DiscoveryResult[]
│   └─→
│
Combine & Merge ──→ [USA Spending, FedBizOpps]
  ↓
Save to Airtable Intelligence table
  ↓
┌─→ Score USA Spending records (parallel)
│   └─→ award_score = base_50 + NAICS + value + type + recency
│
└─→ Score SAM.gov records (parallel)
    └─→ award_score = base_50 + NAICS + value + type + recency
  ↓
Retrieve High-Scoring Awards (minScore ≥ 50)
  ↓
Generate Daily Report (count, summary)
  ↓
Post to Slack #general
```

## Scoring Algorithm Reference

- **Base:** 50 points
- **NAICS Match (561700 or 5617xx):** +30 points
- **Value >= $500K:** +20 points
- **Value >= $100K:** +10 points
- **Record Type = contract:** +10 points
- **Posted within 7 days:** +15 points
- **Posted within 30 days:** +5 points
- **Cap:** 100 points max

## Troubleshooting

### n8n Cannot Resolve Environment Variables
- Verify `.env` is in project root or n8n config directory
- Check n8n has read permissions on `.env` file
- Restart n8n service after adding/updating `.env`
- Syntax check: `{{ env.VARIABLE_NAME }}` (case-sensitive)

### API Server Not Responding
- Verify server is running: `GET http://localhost:3000/health`
- Check firewall allows port 3000
- Review API server logs for errors
- Confirm `.env` has `API_SERVER_URL=http://localhost:3000`

### Airtable Records Not Saving
- Verify `AIRTABLE_API_KEY` is valid and not expired
- Check `AIRTABLE_BASE_ID` exists and is accessible
- Verify Intelligence table schema matches expected fields
- Check Airtable API rate limits (300 req/30sec)

### Slack Notification Not Received
- Test webhook URL with curl: `curl -X POST $SLACK_WEBHOOK_URL -d '{"text":"test"}'`
- Verify webhook is still active (Slack webhooks can expire)
- Check Slack channel #general exists and bot has access
- Review n8n logs for HTTP errors from Slack endpoint

### Empty Discovery Results
- Verify API endpoints are accessible: `curl http://localhost:3000/api/discovery/usaspending`
- Check USASpending API is not rate-limited or down
- Verify SAM.gov API key is configured if needed
- Review discovery function logs for parsing errors

## Monitoring

After activation, monitor these daily:

1. **n8n Executions:** Check workflow run log for failures
2. **Slack Reports:** Verify daily message arrives at 7:00 AM EDT
3. **Airtable Records:** Check Intelligence table for new discoveries
4. **Award Scores:** Verify scoring_status = "scored" on all new records
5. **API Server Logs:** Monitor for errors or rate-limit warnings

## Rollback Plan

If workflow encounters issues:

1. **Pause workflow:** Click **Deactivate** in n8n
2. **Review logs:** Check execution history for error details
3. **Fix root cause:** Update code, .env, or workflow configuration
4. **Test endpoints:** Re-run manual endpoint tests
5. **Reactivate:** Click **Activate** to resume daily execution

## Production Considerations

- Move Slack webhook URL to secrets manager (not plaintext .env)
- Implement error alerting (email/PagerDuty on workflow failure)
- Add data validation before Airtable save (duplicate detection)
- Monitor API rate limits for USA Spending and SAM.gov
- Set up Airtable backup/audit logging
- Implement cost tracking (API calls, storage, compute)
- Document data retention policy for Intelligence table

## Support

For issues or updates:
1. Check Phase 5 documentation: `docs/phase5-contract-intelligence.md`
2. Review API server logs: `src/api-server.ts` console output
3. Check discovery logs: `lib/agent-discovery.ts` console output
4. Check scoring logs: `lib/agent-scoring.ts` console output
5. Review n8n workflow execution logs in dashboard

---

**Last Updated:** 2026-05-26  
**Status:** Ready for import and activation  
**Next Step:** Import workflow JSON into n8n instance
