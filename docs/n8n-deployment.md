# n8n Workflow Deployment Guide

## Overview

The Maravilla Intelligence System uses 6 n8n workflows to automate discovery, enrichment, scoring, outreach, and compliance:

- **Flow 0**: CSV Migration & Lead Scoring
- **Flow A**: Client Discovery (Sunbiz Query) — Daily 6 AM ET
- **Flow B**: Subcontractor Discovery (USASpending Query) — Daily 7 AM ET
- **Flow C**: Federal Contracts Intelligence (SAM.gov) — Daily 8 AM ET
- **Flow D**: Opt-Out Compliance (CAN-SPAM) — On-demand
- **Flow E**: Re-engagement for Dormant Prospects — Weekly

## Prerequisites

### Required Services
- n8n instance (cloud or self-hosted)
- Maravilla Intelligence dashboard running (localhost:3000)
- Airtable API token with base access
- Claude API key
- SAM.gov API key (free at sam.gov)

### API Endpoints Available
- `POST /api/enrich` — Enriches prospect data
- `POST /api/score` — Scores prospects with Claude
- `POST /prospects/approve` — Syncs to GHL

## Deployment Steps

### 1. Set Up n8n Environment Variables

In your n8n instance, create credentials:

```
AIRTABLE_API_KEY: pat99rdlH4w13bxyF.c355b3271a8c2596ec4ff7a7095898ec56567ea71bb7981ff96f6d1c0890b920
AIRTABLE_BASE_ID: appZhXnyFiKbnOZLr
PRIMARY_NAICS: 561720
CLAUDE_API_KEY: sk-ant-...
SAMGOV_API_KEY: [Get from sam.gov]
SUNBIZ_API_URL: https://services.sunbiz.org/api/search
SAMGOV_API_URL: https://api.sam.gov/opportunities
ENRICH_API_URL: http://localhost:3000/api/enrich
SCORE_API_URL: http://localhost:3000/api/score
GHL_API_KEY: [Get from GHL account]
WEBHOOK_BASE_URL: https://your-n8n-instance.com
```

### 2. Import Workflows

#### Method A: Manual Import
1. In n8n UI, click **Import Workflow**
2. Copy-paste JSON from each `flow-*.json` file
3. Save with same filename as label

#### Method B: Via n8n CLI
```bash
n8n import:workflow --input=flow-0-migration.json
n8n import:workflow --input=flow-a-clients.json
n8n import:workflow --input=flow-b-subs.json
n8n import:workflow --input=flow-c-contracts.json
n8n import:workflow --input=flow-d-optout.json
n8n import:workflow --input=flow-e-reengagement.json
```

### 3. Activate Scheduled Workflows

- **Flow A**: Enable schedule (6 AM ET daily)
- **Flow B**: Enable schedule (7 AM ET daily)
- **Flow C**: Enable schedule (8 AM ET daily)
- **Flow E**: Enable schedule (Monday 9 AM ET weekly)

**Flow 0** remains manual-trigger for CSV imports
**Flow D** remains manual-trigger for compliance reviews

### 4. Configure Airtable Credentials

In each workflow:
1. Click on "Save to Airtable" node
2. Configure Airtable connection:
   - API Key: Use the PAT token from environment
   - Base ID: appZhXnyFiKbnOZLr

### 5. Test Workflows

#### Test Flow A (Client Discovery)
```bash
curl -X POST http://localhost:3000/api/enrich \
  -H "Content-Type: application/json" \
  -d '{
    "legal_name": "Acme Federal Solutions LLC",
    "business_email": "test@acme.com",
    "website": "https://acmefederal.com",
    "county": "Miami-Dade"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "count": 1,
  "data": {
    "legal_name": "Acme Federal Solutions LLC",
    "employees_estimate": 125,
    "revenue_estimate": "$10M - $50M",
    "key_signals": ["government contracts", "multiple locations"],
    "enriched_at": "2026-05-25T12:00:00Z"
  }
}
```

#### Test Scoring Endpoint
```bash
curl -X POST http://localhost:3000/api/score \
  -H "Content-Type: application/json" \
  -d '{
    "legal_name": "Acme Federal Solutions LLC",
    "business_type": "Government Contractor",
    "employees_estimate": 125,
    "revenue_estimate": "$10M - $50M"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "count": 1,
  "data": {
    "legal_name": "Acme Federal Solutions LLC",
    "score": 82,
    "priority": "high",
    "segment": "Government/GovCon",
    "service_fit": 0.85,
    "intent_signal": "high",
    "icebreaker": "Acme Federal has strong government contracts...",
    "scoring_rationale": "Score based on company profile and segment fit.",
    "scored_at": "2026-05-25T12:00:00Z"
  }
}
```

## Workflow Data Flow

### Flow A: Client Discovery
```
Sunbiz API Query
    ↓
Parse Companies
    ↓
Filter Non-561720 NAICS
    ↓
Enrich (API)
    ↓
Score (Claude)
    ↓
Deduplicate (Airtable)
    ↓
Save to Intelligence Table (record_type=prospect)
```

### Flow C: Contracts
```
SAM.gov API Query
    ↓
Parse Opportunities
    ↓
Enrich (business info)
    ↓
Score (opportunity fit)
    ↓
Save to Intelligence Table (record_type=contract)
```

## Monitoring & Alerts

### Workflow Execution Logs
Check n8n execution logs for each workflow:
1. Flow name → "Executions" tab
2. Filter by date/status
3. Click execution to see full log

### Error Handling

**API Timeout:** Workflows continue on fail (configurable)
**Missing Env Vars:** Workflows use sensible defaults
**Rate Limiting:** Built-in delay between requests (configurable in n8n)

## Troubleshooting

### Flow not triggering at scheduled time
- Check n8n instance is running
- Verify webhook base URL is correct
- Confirm timezone is set to ET

### "Invalid permissions" error from Airtable
- Verify PAT token has `data.records:write` scope
- Check base ID matches environment

### Claude scoring returns 403
- Verify CLAUDE_API_KEY is valid
- Check API quota hasn't been exceeded

### SAM.gov returns no results
- Verify SAMGOV_API_KEY is valid
- Check date range (last 7 days)

## Next Steps

1. **Set up GHL Sync** — Configure Flow for contact creation
2. **Enable FOIA Drafts** — Activate Flow D for compliance
3. **Monitor Dashboard** — Check Airtable Intelligence table for incoming prospects
4. **Test Approvals** — Use dashboard approve button to sync to GHL

## Webhook URLs

After importing, workflows generate these endpoints:

- Flow A: `https://your-n8n-instance/webhook/flow-a-daily-trigger`
- Flow B: `https://your-n8n-instance/webhook/flow-b-daily-trigger`
- Flow C: `https://your-n8n-instance/webhook/flow-c-daily-trigger`

Use these to trigger workflows manually if needed.

## Costs & Rate Limits

| Service | Monthly Limit | Cost |
|---------|--------|------|
| Sunbiz | Unlimited | Free |
| SAM.gov | Unlimited | Free |
| USASpending | Unlimited | Free |
| Claude API | $X per M tokens | Pay-as-you-go |
| Airtable | Varies by plan | $10-120/month |

---

**Last Updated:** 2026-05-25
**Version:** 1.0
