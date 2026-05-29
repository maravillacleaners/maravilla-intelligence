# n8n Automation Setup Guide

Complete guide to setup and configure n8n workflows for Maravilla Intelligence automation.

## Overview

n8n workflows automate:
- **Contract Discovery** - Scraping SAM.gov and USASpending APIs
- **Contract Matching** - Intelligent matching of contracts to suppliers
- **Supplier Notifications** - Automated email/SMS notifications

## Installation

### Option 1: Docker (Recommended)

```bash
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n:latest
```

Then access at: http://localhost:5678

### Option 2: npm

```bash
npm install -g n8n
n8n start
```

### Option 3: Cloud (n8n Cloud)

Visit https://n8n.cloud and sign up for free tier.

## Configuration

### 1. Update Environment Variable

```bash
# .env
N8N_WEBHOOK_URL=http://localhost:5678
```

Or for cloud:
```bash
N8N_WEBHOOK_URL=https://your-instance.n8n.cloud
```

### 2. Create Webhooks in n8n

In n8n UI, create these webhook endpoints:

#### Webhook 1: SAM.gov Scraper
- **URL**: `/webhook/sam-gov-scraper`
- **Method**: POST
- **Response**: JSON with contract data

#### Webhook 2: USASpending Scraper
- **URL**: `/webhook/usaspending-scraper`
- **Method**: POST
- **Response**: JSON with award data

#### Webhook 3: Contract Matcher
- **URL**: `/webhook/contract-matcher`
- **Method**: POST
- **Response**: Match results

#### Webhook 4: Notifier
- **URL**: `/webhook/notifier`
- **Method**: POST
- **Response**: Notification status

## Workflow Configurations

### Workflow 1: SAM.gov Scraper

**Trigger**: Webhook (POST /webhook/sam-gov-scraper)

**Steps**:
1. Receive webhook payload
2. Call SAM.gov API: `https://api.sam.gov/prod/opportunities/v1/search`
3. Transform response
4. Save to Airtable Intelligence table
5. Return confirmation

**n8n Nodes**:
```
Webhook → HTTP Request (SAM.gov API) → Transform → Airtable → Respond to Webhook
```

**Environment Variables**:
- `SAM_GOV_API_KEY` - Your SAM.gov API key

### Workflow 2: USASpending Scraper

**Trigger**: Webhook (POST /webhook/usaspending-scraper)

**Steps**:
1. Receive webhook payload
2. Call USASpending API: `https://api.usaspending.gov/api/v2/search/spending_by_award/`
3. Filter by contract value
4. Save to Airtable Intelligence table
5. Return confirmation

**n8n Nodes**:
```
Webhook → HTTP Request (USASpending API) → Transform → Airtable → Respond to Webhook
```

### Workflow 3: Contract Matching

**Trigger**: Webhook (POST /webhook/contract-matcher)

**Steps**:
1. Fetch all contracts from Airtable
2. Fetch all suppliers from Airtable
3. Run matching algorithm
4. Create opportunities in Supplier_Opportunities table
5. Return results

**n8n Nodes**:
```
Webhook → Airtable (Get Contracts) → Airtable (Get Suppliers) → Function (Match) → Airtable (Create Opportunities) → Respond
```

### Workflow 4: Supplier Notifications

**Trigger**: Webhook (POST /webhook/notifier)

**Steps**:
1. Receive notification request
2. Get supplier emails from Airtable
3. Fetch new opportunities
4. Send emails via SendGrid or SMTP
5. Log notification status
6. Return confirmation

**n8n Nodes**:
```
Webhook → Airtable (Get Suppliers) → Airtable (Get Opportunities) → SendGrid/SMTP → Airtable (Log) → Respond
```

## Scheduling

Add scheduled triggers to workflows:

### SAM.gov Scraper
- **Schedule**: Every 6 hours
- **Node**: Cron trigger `0 */6 * * *`

### USASpending Scraper
- **Schedule**: Daily at 2 AM
- **Node**: Cron trigger `0 2 * * *`

### Contract Matching
- **Schedule**: Hourly
- **Node**: Cron trigger `0 * * * *`

### Notifications
- **Schedule**: Every 6 hours
- **Node**: Cron trigger `0 */6 * * *`

## API Integration

### From Next.js

Trigger workflows programmatically:

```typescript
import {
  triggerSamGovScraping,
  triggerContractMatching,
  triggerNotifications,
} from '@/lib/n8n-client'

// Trigger SAM.gov scraper
await triggerSamGovScraping({ limit: 100 })

// Trigger matching
await triggerContractMatching()

// Send notifications
await triggerNotifications(['supplier-id-1', 'supplier-id-2'])
```

### From Admin Dashboard

Navigate to `/admin/workflows` to:
- View all workflows
- See schedule information
- Trigger workflows manually
- View recent status

## Testing

### 1. Test SAM.gov Scraper

```bash
curl -X POST http://localhost:5678/webhook/sam-gov-scraper \
  -H "Content-Type: application/json" \
  -d '{"action":"scrape","filters":{}}'
```

### 2. Test USASpending Scraper

```bash
curl -X POST http://localhost:5678/webhook/usaspending-scraper \
  -H "Content-Type: application/json" \
  -d '{"action":"scrape","filters":{}}'
```

### 3. Test Contract Matching

```bash
curl -X POST http://localhost:5678/webhook/contract-matcher \
  -H "Content-Type: application/json" \
  -d '{"action":"match"}'
```

### 4. Test Notifications

```bash
curl -X POST http://localhost:5678/webhook/notifier \
  -H "Content-Type: application/json" \
  -d '{"action":"notify","suppliers":[]}'
```

## Airtable Integration

n8n needs Airtable credentials:

1. Get Personal Access Token from Airtable:
   - Visit https://airtable.com/account/tokens
   - Create new token with these scopes:
     - `data.records:read`
     - `data.records:write`
     - `schema.bases:read`

2. In n8n, add Airtable credentials:
   - Go to Credentials
   - Add new Airtable credential
   - Paste Personal Access Token
   - Save

3. Reference correct base/table IDs:
   - Intelligence Base: `appZhXnyFiKbnOZLr`
   - SUBS_STAGING Base: `appZhXnyFiKbnOZLr`
   - Suppliers Table: `tbl7NYtv13vA377a1`

## Monitoring

### Check Workflow Status

Via API:
```bash
curl http://localhost:5678/webhook/workflow-status?id=sam-gov-scraper
```

Via Dashboard:
- Visit http://localhost:5678
- Click "Executions" tab
- View recent runs and errors

### Enable Logging

In .env:
```bash
N8N_LOG_LEVEL=debug
```

## Troubleshooting

### Webhook Not Responding

1. Verify n8n is running: `curl http://localhost:5678`
2. Check webhook URL is correct in Airtable/Next.js
3. Check firewall allows port 5678

### API Key Errors

1. Verify API keys in n8n credentials:
   - SAM.gov API Key
   - Airtable Personal Access Token
   - SendGrid API Key (if using)

2. Test API directly:
```bash
curl -H "Authorization: Bearer YOUR_KEY" https://api.sam.gov/prod/opportunities/v1/search
```

### No Data in Airtable

1. Check Airtable base/table IDs are correct
2. Verify Personal Access Token has `data.records:write` scope
3. Check transformer node output in n8n execution history

## Security

### Best Practices

1. **Use Environment Variables**: Never hardcode API keys
2. **Restrict Webhook Access**: Consider adding auth headers
3. **Regular Backups**: Export n8n workflows regularly
4. **Monitor Logs**: Check for errors daily
5. **API Key Rotation**: Rotate SAM.gov/Airtable keys quarterly

### Protected Endpoints

Optionally add auth to webhooks:

```typescript
// In n8n webhook node
if (req.headers['x-api-key'] !== process.env.N8N_WEBHOOK_SECRET) {
  return { statusCode: 401, body: { error: 'Unauthorized' } }
}
```

## Next Steps

1. Install n8n locally or use cloud
2. Create Airtable Personal Access Token
3. Create webhook endpoints in n8n
4. Configure environment variables
5. Test each workflow
6. Enable scheduling
7. Monitor via admin dashboard

## Support

For n8n documentation:
- https://docs.n8n.io/
- https://community.n8n.io/

For Maravilla Intelligence:
- Check SETUP_GUIDE.md
- Review app logs: `tail -f .next/dev/logs/next-development.log`
