# HigherGov Implementation Strategy

**Status:** ✅ Ready for Manual Configuration  
**Date:** May 25, 2026  
**Using:** HigherGov API (mientras obtenemos SAM.gov key)

---

## Executive Summary

El sistema Maravilla Intelligence está **listo para usar HigherGov** como fuente de oportunidades federales. La infraestructura de Next.js y Airtable está completa. Solo falta configurar los workflows de n8n manualmente en la UI.

**Lo que funciona:**
✅ Next.js API routes para triggering de workflows  
✅ Supplier Portal (registro, login, dashboard)  
✅ Airtable integration ready  
✅ Contract matching algorithm  
✅ n8n server en Hostinger (accesible)  

**Lo que requiere configuración manual:**
🔄 n8n Workflows (3 workflows necesarios)  
🔄 HigherGov API integration  
🔄 Airtable field mapping  

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Maravilla Intelligence                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐          ┌──────────────────┐         │
│  │ Next.js Frontend│          │ Supplier Portal  │         │
│  │  & Dashboard    │          │  (React/Auth)    │         │
│  └────────┬────────┘          └──────────────────┘         │
│           │                                                 │
│  ┌────────▼────────────────────────────────────────────┐   │
│  │      Next.js API Routes                             │   │
│  │  - /api/workflows/trigger                           │   │
│  │  - /api/suppliers/*                                 │   │
│  └────────┬──────────────────────────┬─────────────────┘   │
│           │                          │                     │
│  ┌────────▼─────────┐      ┌────────▼──────────────┐      │
│  │  n8n Workflows   │      │  Airtable Bases       │      │
│  │ (Hosted)         │      │                       │      │
│  │ 1. HigherGov     │──┐   │ - Suppliers           │      │
│  │    Scraper       │  │   │ - Intelligence (opps) │      │
│  │ 2. Matcher       │  └──▶│ - Matches             │      │
│  │ 3. Notifier      │      │ - Communications      │      │
│  └──────────────────┘      └───────────────────────┘      │
│           │                                                 │
│  ┌────────▼────────────────────────────────────────────┐   │
│  │         External APIs                               │   │
│  │  - HigherGov (Opportunity Discovery)                │   │
│  │  - SendGrid (Email Notifications)                   │   │
│  │  - SAM.gov (When key available)                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## HigherGov API Details

### Endpoint
```
GET https://api.highergov.com/v1/opportunities
```

### Authentication
```
Query Parameter: api_key=4be72a011d644af8bca9a11f85c90d95
```

### Parameters
```
- status: open (required)
- page: 1 (optional, default 1)
- per_page: 100 (optional, default 25)
- sort_by: deadline (optional)
```

### Sample Response
```json
{
  "opportunities": [
    {
      "id": "SAM-123456",
      "title": "Federal Road Construction Contract",
      "agency": "Department of Transportation",
      "description": "Seeking qualified contractors for highway improvements",
      "deadline": "2026-06-30",
      "estimated_value": 5000000,
      "naics_codes": ["234110"],
      "place_of_performance": "Florida",
      "set_asides": ["Women-owned", "Veteran-owned"],
      "url": "https://sam.gov/opp/...",
      "posted_date": "2026-05-20",
      "url": "https://..."
    }
  ],
  "pagination": {
    "total": 1250,
    "page": 1,
    "per_page": 100
  }
}
```

---

## Workflow Configuration Guide

### Workflow 1: HigherGov Opportunity Scraper

**What it does:** Descubre nuevas oportunidades y las guarda en Airtable

**Steps to create:**
1. Open n8n: https://n8n.srv1112587.hstgr.cloud
2. New Workflow
3. Add nodes (see N8N_HIGHERGOV_SETUP_GUIDE.md)
4. Configure webhook path: `highergov-scraper`
5. Connect to HigherGov API
6. Map to Airtable Intelligence table
7. Activate & add schedule: `0 */6 * * *` (every 6 hours)

**Expected output:**
- 50-100 opportunities saved to Airtable per run
- Data includes: title, agency, deadline, estimated value

**Testing:**
```bash
curl -X POST http://localhost:3000/api/workflows/trigger \
  -H "Content-Type: application/json" \
  -d '{"workflowId":"highergov-scraper"}'
```

---

### Workflow 2: Contract Matcher

**What it does:** Empareja oportunidades con suppliers basado en criterios

**Matching Algorithm:**
```
Score = (Service Match × 0.60) + (Location Match × 0.20) + (Capacity Match × 0.20)

Minimum threshold: Score >= 60
```

**Steps to create:**
1. Webhook: `contract-matcher`
2. Read unmatched opportunities from Airtable
3. Read approved suppliers from Airtable
4. Run matching algorithm (Code node)
5. Save matches to Supplier_Opportunities table
6. Schedule: `0 * * * *` (every hour)

**Expected output:**
- Matches between suppliers and opportunities
- Each match has: match_score (0-100), match_reason, supplier_id, opportunity_id
- Only matches >= 60% are saved

**Testing:**
```bash
curl -X POST http://localhost:3000/api/workflows/trigger \
  -H "Content-Type: application/json" \
  -d '{"workflowId":"contract-matcher"}'
```

---

### Workflow 3: Supplier Notifications

**What it does:** Envía emails a suppliers sobre nuevas oportunidades

**Steps to create:**
1. Webhook: `notifier`
2. Read unnotified matches
3. Group by supplier
4. Fetch supplier email from Suppliers table
5. Send email via SendGrid
6. Mark as notified in Airtable
7. Schedule: `0 */6 * * *` (every 6 hours)

**Expected output:**
- Suppliers receive emails with new opportunities
- Notifications logged in Communications table
- Matches marked as notified

**Note:** Requires SendGrid API key in .env
```bash
SENDGRID_API_KEY=SG.xxxxx
```

**Testing:**
```bash
curl -X POST http://localhost:3000/api/workflows/trigger \
  -H "Content-Type: application/json" \
  -d '{"workflowId":"notifier"}'
```

---

## Setup Checklist

### Phase 1: Airtable Configuration (30 min)
- [ ] Create/verify Suppliers table with fields:
  - supplier_id, legal_name, business_email, phone
  - naics_codes, preferred_counties
  - estimated_annual_capacity_usd, registration_status
- [ ] Create/verify Intelligence table with fields:
  - title, agency, record_type, source, deadline
  - estimated_value, url, description, date_posted
- [ ] Create/verify Supplier_Opportunities table with fields:
  - supplier_id, opportunity_id, opportunity_name
  - contract_value_usd, deadline, match_score
  - status, date_matched, notified, notification_date

### Phase 2: n8n Workflows (1-2 hours)
- [ ] Create "HigherGov Opportunity Scraper" workflow
  - [ ] Add Webhook node (path: highergov-scraper)
  - [ ] Add HTTP Request node (HigherGov API)
  - [ ] Add Airtable node (save to Intelligence)
  - [ ] Add Respond node
  - [ ] Test manually
  - [ ] Add schedule: `0 */6 * * *`
  - [ ] Activate workflow

- [ ] Create "Contract Matcher" workflow
  - [ ] Add Webhook node (path: contract-matcher)
  - [ ] Add Airtable nodes (read opportunities & suppliers)
  - [ ] Add Code node (matching algorithm)
  - [ ] Add Airtable node (save matches)
  - [ ] Add Respond node
  - [ ] Test manually
  - [ ] Add schedule: `0 * * * *`
  - [ ] Activate workflow

- [ ] Create "Supplier Notifications" workflow
  - [ ] Add Webhook node (path: notifier)
  - [ ] Add Airtable nodes (read matches)
  - [ ] Add Code node (group by supplier)
  - [ ] Add Airtable node (fetch supplier emails)
  - [ ] Add SendGrid node (send emails) - OPTIONAL
  - [ ] Add Airtable node (mark notified)
  - [ ] Add Respond node
  - [ ] Test manually
  - [ ] Add schedule: `0 */6 * * *`
  - [ ] Activate workflow

### Phase 3: Testing (1 hour)
- [ ] Register test supplier via Supplier Portal
- [ ] Trigger HigherGov scraper manually
- [ ] Verify opportunities in Airtable
- [ ] Trigger matcher manually
- [ ] Verify matches in Supplier_Opportunities
- [ ] Trigger notifier manually (check email if SendGrid enabled)
- [ ] Verify supplier sees opportunities in dashboard

### Phase 4: Production (1 hour)
- [ ] Configure all 3 workflows to active
- [ ] Verify schedules are correct
- [ ] Set up monitoring/alerting
- [ ] Document runbook

---

## Testing Commands

### Test Direct n8n Webhooks
```bash
# Trigger HigherGov Scraper
curl -X POST https://n8n.srv1112587.hstgr.cloud/webhook/highergov-scraper \
  -H "Content-Type: application/json" \
  -d '{}'

# Trigger Contract Matcher
curl -X POST https://n8n.srv1112587.hstgr.cloud/webhook/contract-matcher \
  -H "Content-Type: application/json" \
  -d '{}'

# Trigger Notifier
curl -X POST https://n8n.srv1112587.hstgr.cloud/webhook/notifier \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Test via Next.js API
```bash
# Trigger from Next.js (localhost)
curl -X POST http://localhost:3000/api/workflows/trigger \
  -H "Content-Type: application/json" \
  -d '{"workflowId":"highergov-scraper"}'

curl -X POST http://localhost:3000/api/workflows/trigger \
  -H "Content-Type: application/json" \
  -d '{"workflowId":"contract-matcher"}'

curl -X POST http://localhost:3000/api/workflows/trigger \
  -H "Content-Type: application/json" \
  -d '{"workflowId":"notifier"}'
```

### Verify Data in Airtable
```bash
# Use Airtable UI to check:
# 1. Intelligence table: Should have 50+ opportunities from HigherGov
# 2. Supplier_Opportunities: Should have matches >= 60% score
# 3. Communications: Should have notification logs
```

---

## Performance Expectations

### Per Execution
| Workflow | Duration | Opportunities | Matches | Notifications |
|----------|----------|----------------|---------|----------------|
| HigherGov Scraper | 5-10s | 50-100 | N/A | N/A |
| Contract Matcher | 10-30s | N/A | 5-50 | N/A |
| Notifier | 10-20s | N/A | N/A | 1-20 |

### Daily Volume (with default schedules)
- Opportunities discovered: 200-400/day
- Matches generated: 20-200/day
- Notifications sent: 4-80/day

### Monthly Volume
- Opportunities: 6,000-12,000
- Unique matches: 600-6,000
- Supplier notifications: 120-2,400

---

## Migration Path to SAM.gov

When SAM.gov API key is available:

1. Create additional workflow: "SAM.gov Opportunity Scraper"
2. Configure HigherGov scraper to run every 12 hours
3. Configure SAM.gov scraper to run every 12 hours
4. Both save to same Intelligence table (deduplicate by URL)
5. Continue using same matcher and notifier workflows

No changes needed to Next.js code or Airtable schema.

---

## Environment Variables

Add to `.env`:
```bash
# HigherGov API
HIGHERGOV_API_KEY=4be72a011d644af8bca9a11f85c90d95

# Airtable
AIRTABLE_API_KEY=pat99rdlH4w13bxyF...
AIRTABLE_SUBS_BASE_ID=appZhXnyFiKbnOZLr
AIRTABLE_INTELLIGENCE_BASE_ID=appZhXnyFiKbnOZLr

# Email (optional, for notifications)
SENDGRID_API_KEY=SG.xxxxx
EMAIL_SERVICE=sendgrid

# n8n
N8N_WEBHOOK_URL=https://n8n.srv1112587.hstgr.cloud
```

---

## Troubleshooting

### "HigherGov API returning 401"
- Verify API key: `4be72a011d644af8bca9a11f85c90d95`
- Check request format in n8n
- Test with curl:
  ```bash
  curl "https://api.highergov.com/v1/opportunities?api_key=4be72a011d644af8bca9a11f85c90d95&status=open&page=1&per_page=10"
  ```

### "No matches found"
- Verify Suppliers table has data
- Check that suppliers have NAICS codes filled
- Lower match_score threshold in Code node (try 50 instead of 60)
- Run Contract Matcher manually to see logs

### "Emails not sending"
- Verify SendGrid API key is correct
- Check that "from" email is verified in SendGrid
- Add "from" email to n8n SendGrid node config
- Test with manual trigger

### "Airtable save failing"
- Verify table names are exact
- Check field names match exactly
- Verify API key has write access
- Test Airtable connection separately

---

## Documentation Files

Reference these for detailed setup:
- `N8N_HIGHERGOV_SETUP_GUIDE.md` - Step-by-step workflow configuration
- `SUPPLIER_PORTAL_IMPLEMENTATION_SUMMARY.md` - Supplier portal details
- `SUPPLIER_PORTAL_TEST_REPORT.md` - Portal test results
- `WORKFLOW_API_SPEC.md` - API specifications
- `WORKFLOW_TEST_REPORT.md` - Previous workflow tests

---

## Next Steps

### Immediate (Today)
1. Read N8N_HIGHERGOV_SETUP_GUIDE.md
2. Log into n8n at https://n8n.srv1112587.hstgr.cloud
3. Create first workflow (HigherGov Scraper)

### Short Term (This Week)
1. Create second workflow (Contract Matcher)
2. Create third workflow (Supplier Notifications)
3. Complete testing checklist
4. Verify data flow end-to-end

### Medium Term (Next Week)
1. Monitor workflow execution daily
2. Refine matching algorithm if needed
3. Gather supplier feedback
4. Plan SAM.gov integration

---

## Support Resources

- **n8n Docs:** https://docs.n8n.io
- **HigherGov API:** API key holder has docs
- **Airtable API:** https://airtable.com/api
- **SendGrid:** https://sendgrid.com/docs

---

**Status:** ✅ Ready to begin manual configuration  
**Recommendation:** Start with HigherGov scraper workflow today  
**Timeline:** Full system operational in 2-3 days with manual config  

