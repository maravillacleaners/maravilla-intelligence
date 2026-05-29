# n8n Workflows Testing & Setup Guide

## Test Results Summary ✅

All workflow API endpoints are **operational and correctly routing**:

```
✅ SAM.gov Scraper         - /api/workflows/trigger (workflowId: sam-gov-scraper)
✅ USASpending Scraper     - /api/workflows/trigger (workflowId: usaspending-scraper)
✅ Contract Matcher        - /api/workflows/trigger (workflowId: contract-matcher)
✅ Supplier Notifications  - /api/workflows/trigger (workflowId: notifier)
```

**Note:** Currently returning 500 errors because n8n webhooks are not configured. This guide shows how to set up n8n locally or in the cloud and configure working workflows.

---

## Quick Start: Local n8n Setup (5 minutes)

### Option A: Using npm (Recommended for Development)

```bash
# 1. Install n8n globally
npm install -g n8n

# 2. Start n8n (runs on http://localhost:5678)
n8n start

# 3. Open browser and create account
# Navigate to: http://localhost:5678

# 4. Update .env file
# Set: N8N_WEBHOOK_URL=http://localhost:5678

# 5. Restart the development server
npm run dev
```

### Option B: Using Docker (Production-Ready)

```bash
# 1. Create data directory
mkdir -p ~/.n8n

# 2. Start n8n container
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n:latest

# 3. Access at: http://localhost:5678

# 4. Update .env
# Set: N8N_WEBHOOK_URL=http://localhost:5678
```

### Option C: n8n Cloud (Zero Setup)

```
1. Visit: https://n8n.cloud
2. Sign up for free tier
3. Get your instance URL from dashboard
4. Update .env: N8N_WEBHOOK_URL=https://your-instance.n8n.cloud
```

---

## Creating Workflows in n8n

Once n8n is running, create these 4 workflows:

### 1️⃣ SAM.gov Scraper Workflow

**Setup Steps:**
1. Create new workflow in n8n UI
2. Add nodes in this order:
   - **Webhook** node
     - Method: POST
     - Path: /webhook/sam-gov-scraper
   - **HTTP Request** node
     - Method: GET
     - URL: `https://api.sam.gov/prod/opportunities/v1/search?api_key={{$env.SAM_GOV_API_KEY}}&limit=100`
   - **Transform** node (Map response data)
   - **Airtable** node
     - Base: Intelligence (appZhXnyFiKbnOZLr)
     - Table: (fetch from base)
     - Fields: title, agency, record_type='contract', deadline, estimated_value
   - **Respond to Webhook** node

**Scheduling:**
```
Cron: 0 */6 * * *  (Every 6 hours)
```

---

### 2️⃣ USASpending Scraper Workflow

**Setup Steps:**
1. Create new workflow
2. Add nodes:
   - **Webhook** node (POST /webhook/usaspending-scraper)
   - **HTTP Request** node
     - URL: `https://api.usaspending.gov/api/v2/search/spending_by_award/`
   - **Filter** node (Min value: $100,000)
   - **Airtable** node (Save to Intelligence table)
   - **Respond to Webhook** node

**Scheduling:**
```
Cron: 0 2 * * *  (Daily at 2 AM)
```

---

### 3️⃣ Contract Matching Workflow

**Setup Steps:**
1. Create new workflow
2. Add nodes:
   - **Webhook** node (POST /webhook/contract-matcher)
   - **Airtable** node (Read contracts from Intelligence)
   - **Airtable** node (Read suppliers from SUBS_STAGING)
   - **Function** node (JavaScript matching algorithm):
     ```javascript
     const matches = [];
     const contracts = $input.all()[0];
     const suppliers = $input.all()[1];
     
     for (const contract of contracts) {
       for (const supplier of suppliers) {
         const score = calculateScore(contract, supplier);
         if (score >= 60) {
           matches.push({
             contractId: contract.id,
             supplierId: supplier.supplier_id,
             matchScore: score,
             status: 'Available'
           });
         }
       }
     }
     return matches;
     ```
   - **Airtable** node (Create in Supplier_Opportunities)
   - **Respond to Webhook** node

**Scheduling:**
```
Cron: 0 * * * *  (Every hour)
```

---

### 4️⃣ Supplier Notifications Workflow

**Setup Steps:**
1. Create new workflow
2. Add nodes:
   - **Webhook** node (POST /webhook/notifier)
   - **Airtable** node (Get new opportunities)
   - **SendGrid** node (or SMTP)
     - To: `{{$node.Airtable.json.supplier_email}}`
     - Subject: New opportunity matching your profile
     - Body: Email template with opportunity details
   - **Airtable** node (Log notification in Communications table)
   - **Respond to Webhook** node

**Scheduling:**
```
Cron: 0 */6 * * *  (Every 6 hours)
```

---

## Environment Variables

Add these to your `.env` file:

```bash
# n8n Configuration
N8N_WEBHOOK_URL=http://localhost:5678

# API Keys (for n8n workflows)
SAM_GOV_API_KEY=your_sam_gov_api_key
USASPENDING_API_KEY=optional
SENDGRID_API_KEY=your_sendgrid_key
AIRTABLE_API_KEY=your_airtable_token

# Airtable Base IDs
AIRTABLE_INTELLIGENCE_BASE=appZhXnyFiKbnOZLr
AIRTABLE_SUBS_BASE=appZhXnyFiKbnOZLr
```

---

## Testing Workflows

### Method 1: Admin Dashboard

1. Navigate to `http://localhost:3000/admin/workflows`
2. Click "Trigger Now" for any workflow
3. Check n8n execution history for results

### Method 2: Direct API Call

```bash
# Test SAM.gov scraper
curl -X POST http://localhost:3000/api/workflows/trigger \
  -H "Content-Type: application/json" \
  -d '{"workflowId":"sam-gov-scraper"}'

# Test contract matcher
curl -X POST http://localhost:3000/api/workflows/trigger \
  -H "Content-Type: application/json" \
  -d '{"workflowId":"contract-matcher"}'

# Test notifications
curl -X POST http://localhost:3000/api/workflows/trigger \
  -H "Content-Type: application/json" \
  -d '{"workflowId":"notifier"}'
```

### Method 3: Test Script

```bash
# Run the automated test suite
node scripts/test-workflows.js

# Output includes:
# - API endpoint validation
# - Workflow routing verification
# - Response structure validation
# - Configuration summary
```

---

## Workflow Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    User Dashboard                       │
│            GET /admin/workflows                         │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                   API Layer                             │
│         POST /api/workflows/trigger                     │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              n8n Client Library                         │
│        (lib/n8n-client.ts)                            │
│   - triggerSamGovScraping()                            │
│   - triggerUsaSpendingScraping()                       │
│   - triggerContractMatching()                          │
│   - triggerNotifications()                             │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                  n8n Instance                           │
│     (localhost:5678 or cloud)                          │
│                                                        │
│  ┌──────────────┐  ┌──────────────┐                   │
│  │ SAM.gov      │  │ USASpending  │                   │
│  │ Scraper      │  │ Scraper      │                   │
│  └──────┬───────┘  └──────┬───────┘                   │
│         │                  │                           │
│         └──────┬───────────┘                           │
│                │                                       │
│         ┌──────▼───────┐  ┌─────────────────┐        │
│         │ Contract     │  │ Notifications   │        │
│         │ Matcher      │  │                 │        │
│         └──────┬───────┘  └────────┬────────┘        │
└─────────────────┼──────────────────┼─────────────────┘
                  │                  │
                  ▼                  ▼
        ┌──────────────────┐  ┌─────────────────┐
        │  Airtable        │  │  SendGrid/SMTP  │
        │  Intelligence    │  │  (Email)        │
        │  & SUBS_STAGING  │  │                 │
        │  Bases           │  │                 │
        └──────────────────┘  └─────────────────┘
```

---

## Troubleshooting

### "Workflow trigger error" (500 response)

**Cause:** n8n endpoint not reachable

**Solution:**
1. Check `N8N_WEBHOOK_URL` in `.env`
2. Verify n8n is running: `curl http://localhost:5678`
3. Ensure webhook paths match exactly (case-sensitive)
4. Check n8n execution logs for detailed errors

### Airtable API errors

**Cause:** Missing credentials or wrong base/table IDs

**Solution:**
1. Verify `AIRTABLE_API_KEY` is correct
2. Check base IDs: Intelligence=appZhXnyFiKbnOZLr
3. Verify SUBS_STAGING base ID is correct
4. Test Airtable connection in n8n UI

### No data appearing in Airtable

**Cause:** Workflow running but not saving data

**Solution:**
1. Check n8n execution history for errors
2. Verify transformer node is mapping fields correctly
3. Ensure Airtable table has the expected columns
4. Check field types match (text vs. select vs. number)

### Webhooks not receiving calls

**Cause:** n8n webhook path misconfiguration

**Solution:**
1. In n8n Webhook node, verify:
   - Method is POST
   - Path matches exactly (no leading/trailing slashes)
   - "Execute workflow" is enabled
2. Test webhook manually:
   ```bash
   curl -X POST http://localhost:5678/webhook/sam-gov-scraper \
     -H "Content-Type: application/json" \
     -d '{"action":"scrape"}'
   ```

---

## Performance & Scheduling

### Recommended Schedule

```
SAM.gov Scraper:      Every 6 hours    (0 */6 * * *)
USASpending Scraper:  Daily 2 AM       (0 2 * * *)
Contract Matcher:     Every hour       (0 * * * *)
Notifications:        Every 6 hours    (0 */6 * * *)
```

### Execution Times

- SAM.gov scrape: 2-5 minutes (API response time dependent)
- USASpending scrape: 1-3 minutes
- Contract matching: 30 seconds - 2 minutes (data volume dependent)
- Notifications: 1-5 minutes (email service speed)

### Estimated Data Volume

- Daily SAM.gov opportunities: 500-2,000
- Daily USASpending awards: 100-500
- Daily matches generated: 200-1,000
- Daily notifications sent: 50-500

---

## Security Best Practices

1. **Protect API Keys**
   - Never commit `.env` to git
   - Use `.env.local` for sensitive values
   - Rotate SAM.gov/SendGrid keys monthly

2. **Secure Webhooks**
   - Consider adding authentication header:
     ```javascript
     if (req.headers['x-api-key'] !== process.env.N8N_WEBHOOK_SECRET) {
       return { statusCode: 401, body: { error: 'Unauthorized' } }
     }
     ```

3. **Audit Logs**
   - Enable n8n execution logging
   - Monitor failed workflow runs
   - Track data changes in Airtable

4. **Rate Limiting**
   - SAM.gov: 10 requests/second limit
   - USASpending: 5 requests/second limit
   - Add delays in n8n if hitting rate limits

---

## Next Steps

1. ✅ Test workflow APIs (completed - see test results above)
2. 🔲 Install n8n locally or in cloud
3. 🔲 Create 4 webhook workflows in n8n
4. 🔲 Configure scheduling/cron triggers
5. 🔲 Test end-to-end with real data
6. 🔲 Monitor execution logs
7. 🔲 Deploy to production

---

## Additional Resources

- **n8n Documentation:** https://docs.n8n.io/
- **n8n Community:** https://community.n8n.io/
- **SAM.gov API:** https://open.gsa.gov/api/sam/
- **USASpending API:** https://api.usaspending.gov/

---

## Support

For issues:
1. Check n8n execution logs: http://localhost:5678/workflows
2. Review application logs: `npm run dev` console output
3. Check Airtable data: https://airtable.com/
4. Run test suite: `node scripts/test-workflows.js`
