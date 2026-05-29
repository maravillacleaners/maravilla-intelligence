# Multi-Source Opportunity Discovery - Implementation Checklist

**Target date:** Complete by end of day (2-3 hours)  
**Success criteria:** All 4 workflows active, opportunities flowing to Airtable, suppliers can see matches  
**Owner:** Rosan

---

## Pre-Flight Check (15 minutes)

**Before starting, verify you have:**

- [ ] n8n server access: https://n8n.srv1112587.hstgr.cloud
- [ ] Airtable base access: appZhXnyFiKbnOZLr
- [ ] Airtable API token with write access
- [ ] HigherGov API key: `4be72a011d644af8bca9a11f85c90d95`
- [ ] SendGrid API key (optional, for email notifications)
- [ ] N8N_MULTISOURCE_SETUP_PLAYBOOK.md (complete guide)
- [ ] N8N_JAVASCRIPT_CODE_REFERENCE.md (code snippets)
- [ ] validate-airtable-schema.js (validation script)

**Optional - Run validation:**
```bash
# Verify Airtable schema
AIRTABLE_API_KEY=patXXX node scripts/validate-airtable-schema.js
```

---

## Phase 1: Prepare Airtable (30 minutes)

**Goal:** Verify all tables and fields exist

### Step 1: Check Intelligence Table

**Base:** appZhXnyFiKbnOZLr  
**Table:** Intelligence

- [ ] Open base and find Intelligence table
- [ ] Verify these fields exist:
  - [ ] opportunity_id (Text)
  - [ ] title (Text)
  - [ ] agency (Text)
  - [ ] description (Long text)
  - [ ] source (Text)
  - [ ] deadline (Date)
  - [ ] estimated_value (Number)
  - [ ] url (Text)
  - [ ] naics_codes (Text)
  - [ ] place_of_performance (Text)
  - [ ] set_asides (Text)
  - [ ] posted_date (Date)
  - [ ] record_type (Text)
  - [ ] url_hash (Text)
  - [ ] source_data (Long text)
  - [ ] matched (Checkbox)
  - [ ] date_added (Timestamp)

**If missing:** Create field by clicking "+" in table header

### Step 2: Check Supplier_Opportunities Table

**Table:** Supplier_Opportunities

- [ ] supplier_id (Text)
- [ ] opportunity_id (Text)
- [ ] opportunity_name (Text)
- [ ] contract_value_usd (Number)
- [ ] deadline (Date)
- [ ] match_score (Number)
- [ ] match_reason (Long text)
- [ ] status (Single select with options: Pending, Sent, Applied, Won, Lost)
- [ ] date_matched (Timestamp)
- [ ] notified (Checkbox)
- [ ] notification_date (Timestamp)
- [ ] supplier_email (Email)
- [ ] source (Text)

### Step 3: Check Suppliers Table

**Table:** Suppliers

- [ ] supplier_id (Text)
- [ ] legal_name (Text)
- [ ] contact_name (Text)
- [ ] business_email (Email)
- [ ] phone (Text)
- [ ] naics_codes (Text)
- [ ] preferred_counties (Text)
- [ ] estimated_annual_capacity_usd (Number)
- [ ] registration_status (Single select with options: Pending, Approved, Active, Inactive)
- [ ] website (Text)
- [ ] sub_category (Text)
- [ ] date_registered (Timestamp)

---

## Phase 2: Create n8n Workflows (1.5 - 2 hours)

**Estimated time per workflow:** 20-30 minutes

### Workflow 1: HigherGov Opportunity Scraper

**Estimated time:** 25 minutes

**Setup:**
1. [ ] Open n8n: https://n8n.srv1112587.hstgr.cloud
2. [ ] Click "+ New Workflow"
3. [ ] Name: `HigherGov Opportunity Scraper`

**Add nodes (in order):**
1. [ ] **Node 1 - Webhook**
   - Type: Webhook
   - Method: POST
   - Path: `highergov-scraper`

2. [ ] **Node 2 - HTTP Request**
   - Type: HTTP Request
   - URL: `https://api.highergov.com/v1/opportunities`
   - Method: GET
   - Headers: `API Key: 4be72a011d644af8bca9a11f85c90d95`
   - Query: `status=open&page=1&per_page=100&sort_by=deadline`

3. [ ] **Node 3 - Code (Transform)**
   - Type: Code (JavaScript)
   - Copy from: N8N_JAVASCRIPT_CODE_REFERENCE.md → "Workflow 1 Node 3"
   - Paste entire code block

4. [ ] **Node 4 - Airtable (Check Duplicates)**
   - Type: Airtable
   - Action: Read records
   - Base: appZhXnyFiKbnOZLr
   - Table: Intelligence
   - Filter: `url_hash` equals `[from input]`

5. [ ] **Node 5 - Code (Filter Duplicates)**
   - Type: Code (JavaScript)
   - Copy from: N8N_JAVASCRIPT_CODE_REFERENCE.md → "Workflow 1 Node 5"

6. [ ] **Node 6 - Airtable (Save)**
   - Type: Airtable
   - Action: Create records
   - Base: appZhXnyFiKbnOZLr
   - Table: Intelligence
   - Map fields (see playbook for exact mappings)

7. [ ] **Node 7 - Code (Log)**
   - Type: Code (JavaScript)
   - Copy from: N8N_JAVASCRIPT_CODE_REFERENCE.md → "Workflow 1 Node 7"

8. [ ] **Node 8 - Respond to Webhook**
   - Type: Respond to Webhook
   - Response: `{ success: true }`

**Test:**
- [ ] Click "Execute Workflow"
- [ ] Check execution log (should show success)
- [ ] Verify Airtable Intelligence table has new records
- [ ] At least 50+ opportunities should be added

**Schedule:**
- [ ] Click "Trigger" button
- [ ] Change from "Webhook" to "Cron"
- [ ] Enter: `0 */6 * * *`
- [ ] Click "Activate"

---

### Workflow 2: Deduplication Engine

**Estimated time:** 20 minutes

**Setup:**
1. [ ] Click "+ New Workflow"
2. [ ] Name: `Deduplication Engine`

**Add nodes:**
1. [ ] **Node 1 - Webhook**
   - Type: Webhook
   - Path: `deduplication-engine`

2. [ ] **Node 2 - Airtable (Read)**
   - Type: Airtable
   - Action: Read records
   - Base: appZhXnyFiKbnOZLr
   - Table: Intelligence
   - Limit: 1000

3. [ ] **Node 3 - Code (Identify Duplicates)**
   - Type: Code (JavaScript)
   - Copy from: N8N_JAVASCRIPT_CODE_REFERENCE.md → "Workflow 2 Node 3"

4. [ ] **Node 4 - Airtable (Delete)**
   - Type: Airtable
   - Action: Delete records
   - Base: appZhXnyFiKbnOZLr
   - Table: Intelligence
   - Record ID: [from duplicates array]

5. [ ] **Node 5 - Code (Log)**
   - Copy from: N8N_JAVASCRIPT_CODE_REFERENCE.md → "Workflow 2 Node 5"

6. [ ] **Node 6 - Respond to Webhook**
   - Type: Respond to Webhook

**Test:**
- [ ] Execute workflow
- [ ] Should return duplicates_found: 0 (none yet)

**Schedule:**
- [ ] Click "Trigger"
- [ ] Change to "Cron"
- [ ] Enter: `0 * * * *`
- [ ] Activate

---

### Workflow 3: Contract Matcher

**Estimated time:** 25 minutes

**Setup:**
1. [ ] Click "+ New Workflow"
2. [ ] Name: `Contract Matcher`

**Add nodes:**
1. [ ] **Node 1 - Webhook**
   - Type: Webhook
   - Path: `contract-matcher`

2. [ ] **Node 2 - Airtable (Read Opportunities)**
   - Type: Airtable
   - Action: Read records
   - Base: appZhXnyFiKbnOZLr
   - Table: Intelligence
   - Filter: `matched` is not checked
   - Limit: 100

3. [ ] **Node 3 - Airtable (Read Suppliers)**
   - Type: Airtable
   - Action: Read records
   - Base: appZhXnyFiKbnOZLr
   - Table: Suppliers
   - Filter: `registration_status` is "Approved" or "Active"
   - Limit: 1000

4. [ ] **Node 4 - Code (Matching Algorithm)**
   - Type: Code (JavaScript)
   - Copy from: N8N_JAVASCRIPT_CODE_REFERENCE.md → "Workflow 3 Node 4"

5. [ ] **Node 5 - Airtable (Save Matches)**
   - Type: Airtable
   - Action: Create records
   - Base: appZhXnyFiKbnOZLr
   - Table: Supplier_Opportunities
   - Map all fields from matched results

6. [ ] **Node 6 - Code (Update Flag)**
   - Copy from: N8N_JAVASCRIPT_CODE_REFERENCE.md → "Workflow 3 Node 6"

7. [ ] **Node 7 - Airtable (Mark Matched)**
   - Type: Airtable
   - Action: Update records
   - Base: appZhXnyFiKbnOZLr
   - Table: Intelligence
   - Set `matched = true` for matched opportunity IDs

8. [ ] **Node 8 - Respond to Webhook**
   - Type: Respond to Webhook

**Test:**
- [ ] First add test suppliers to Suppliers table:
  - Legal name: "Test Corp"
  - NAICS codes: "236200,237300"
  - Preferred counties: "Miami-Dade"
  - Estimated capacity: 1000000
  - Status: "Approved"
  
- [ ] Execute matcher workflow
- [ ] Check Supplier_Opportunities table for new matches
- [ ] Verify match_score >= 60

**Schedule:**
- [ ] Click "Trigger"
- [ ] Change to "Cron"
- [ ] Enter: `5 * * * *` (runs at :05 each hour)
- [ ] Activate

---

### Workflow 4: Supplier Notifications (Optional - Email)

**Estimated time:** 20 minutes

**Setup:**
1. [ ] Click "+ New Workflow"
2. [ ] Name: `Supplier Notifications`

**Add nodes:**
1. [ ] **Node 1 - Webhook**
   - Type: Webhook
   - Path: `supplier-notifications`

2. [ ] **Node 2 - Airtable (Read Unnotified)**
   - Type: Airtable
   - Action: Read records
   - Base: appZhXnyFiKbnOZLr
   - Table: Supplier_Opportunities
   - Filter: `notified` is not checked AND `status` is "Pending"
   - Limit: 100

3. [ ] **Node 3 - Code (Group by Supplier)**
   - Type: Code (JavaScript)
   - Copy from: N8N_JAVASCRIPT_CODE_REFERENCE.md → "Workflow 4 Node 3"

4. [ ] **Node 4 - SendGrid (Send Email)** *(OPTIONAL)*
   - Type: SendGrid (add as credential first if not exists)
   - From Email: `notifications@maravillacleaners.com`
   - To Email: `[supplier_email]`
   - Subject: `New Federal Opportunities Matched to Your Company`
   - HTML: [Use template from playbook]

5. [ ] **Node 5 - Code (Prepare Update)**
   - Copy from: N8N_JAVASCRIPT_CODE_REFERENCE.md → "Workflow 4 Node 5"

6. [ ] **Node 6 - Airtable (Mark Notified)**
   - Type: Airtable
   - Action: Update records
   - Base: appZhXnyFiKbnOZLr
   - Table: Supplier_Opportunities
   - Set `notified = true` and `notification_date = now()`

7. [ ] **Node 7 - Respond to Webhook**
   - Type: Respond to Webhook

**Test:**
- [ ] Execute workflow
- [ ] Check Supplier_Opportunities for notified = checked
- [ ] If SendGrid enabled, verify email sent

**Schedule:**
- [ ] Click "Trigger"
- [ ] Change to "Cron"
- [ ] Enter: `30 */6 * * *` (every 6 hours at :30)
- [ ] Activate

---

## Phase 3: End-to-End Testing (30 minutes)

### Test Scenario 1: Full Opportunity Discovery Flow

**Step 1: Trigger HigherGov Scraper**
```bash
curl -X POST https://n8n.srv1112587.hstgr.cloud/webhook/highergov-scraper \
  -H "Content-Type: application/json" \
  -d '{}'
```

- [ ] Check execution log for success
- [ ] Verify Intelligence table: 50+ new records with source=highergov
- [ ] Verify url_hash populated on all

**Step 2: Trigger Deduplication**
```bash
curl -X POST https://n8n.srv1112587.hstgr.cloud/webhook/deduplication-engine \
  -H "Content-Type: application/json" \
  -d '{}'
```

- [ ] Check results (should show duplicates_found: 0 on first run)
- [ ] Verify no records were deleted

**Step 3: Add Test Supplier**
- [ ] Go to Suppliers table
- [ ] Click "+" to add record
- [ ] Fill in:
  - legal_name: "Federal Solutions Inc"
  - contact_name: "John Smith"
  - business_email: "john@federalsolutions.com"
  - phone: "(555) 123-4567"
  - naics_codes: "236200,236210,237310"
  - preferred_counties: "Hillsborough,Pinellas"
  - estimated_annual_capacity_usd: 5000000
  - registration_status: "Approved"
  - sub_category: "General Contractor"
- [ ] Click Save

**Step 4: Trigger Contract Matcher**
```bash
curl -X POST https://n8n.srv1112587.hstgr.cloud/webhook/contract-matcher \
  -H "Content-Type: application/json" \
  -d '{}'
```

- [ ] Check execution log
- [ ] Verify Supplier_Opportunities table has new matches
- [ ] Check match_score values (should be 60-100)
- [ ] Verify match_reason contains scoring breakdown

**Step 5: Trigger Supplier Notifications**
```bash
curl -X POST https://n8n.srv1112587.hstgr.cloud/webhook/supplier-notifications \
  -H "Content-Type: application/json" \
  -d '{}'
```

- [ ] Check execution log
- [ ] Verify Supplier_Opportunities: notified = checked, notification_date populated
- [ ] If SendGrid enabled: check email (may be in spam)

### Test Scenario 2: Supplier Portal Verification

- [ ] Go to supplier portal: `http://localhost:3000/suppliers` or production URL
- [ ] Register new supplier account
- [ ] Login with registered account
- [ ] Check Dashboard: Should show available opportunities (from matching)
- [ ] Click on an opportunity: Should show match score and details
- [ ] Submit application: Should appear in Applications tab

---

## Phase 4: Production Readiness (20 minutes)

### Verify All Workflows Active

- [ ] Open each workflow in n8n UI
- [ ] Verify "Trigger" shows "Cron" with schedule
- [ ] Verify "Activate" button status is ON (green)

**Workflows status:**
1. [ ] HigherGov Opportunity Scraper - ACTIVE
2. [ ] Deduplication Engine - ACTIVE
3. [ ] Contract Matcher - ACTIVE
4. [ ] Supplier Notifications - ACTIVE

### Verify Schedules

```
Time    Action
─────────────────────────────────────────
00:00   ✓ HigherGov Scraper starts
00:05   → Deduplication Engine runs
00:10   → Contract Matcher runs
00:30   → Supplier Notifications (if enabled)

06:00   ✓ HigherGov Scraper
06:05   → Dedup
06:10   → Matcher
06:30   → Notifier

12:00   ✓ HigherGov Scraper
12:05   → Dedup
12:10   → Matcher
12:30   → Notifier

18:00   ✓ HigherGov Scraper
18:05   → Dedup
18:10   → Matcher
18:30   → Notifier
```

- [ ] All times correct?
- [ ] All workflows scheduled?

### Monitoring Setup

**Daily checklist:**
```
[ ] Check n8n execution logs (any errors?)
[ ] Count new opportunities in Intelligence table
[ ] Verify deduplicated count
[ ] Check match creation rate
[ ] Monitor supplier notification delivery
```

---

## Phase 5: Scale Up (Next Week)

### Add SAM.gov Scraper (When API Key Available)

**Status:** Pending SAM.gov API key from https://api.data.gov/signup

- [ ] Request SAM.gov API key
- [ ] Receive email with key
- [ ] Create new workflow: "SAM.gov Opportunity Scraper"
- [ ] Duplicate HigherGov scraper workflow
- [ ] Update Node 2 (HTTP) to use SAM.gov API
- [ ] Change source field to "sam-gov"
- [ ] Schedule: `0 */8 * * *`
- [ ] Activate

**Result:** Opportunities from both HigherGov and SAM.gov, deduplicated automatically

### Add USASpending Scraper (Phase 2)

- [ ] Create workflow: "USASpending Enrichment"
- [ ] Similar setup to HigherGov
- [ ] Uses https://api.usaspending.gov API
- [ ] Schedule: `0 2 * * *` (daily at 2 AM)
- [ ] Record type: "Award" instead of "Contract"

### Add Grants.gov Scraper (Phase 3)

- [ ] Create workflow: "Grants.gov Opportunities"
- [ ] Uses https://grants.gov/grantsapi API
- [ ] Schedule: `0 2 * * 3` (weekly on Wednesday 2 AM)
- [ ] Record type: "Grant"

---

## Success Criteria

**Immediate (Today):**
- [ ] All 4 workflows created and active
- [ ] HigherGov opportunities flowing to Airtable
- [ ] Deduplication working (no duplicates)
- [ ] Matches created for test suppliers
- [ ] Supplier notifications sent (if enabled)

**After 24 hours:**
- [ ] 200-400 new opportunities in Intelligence table
- [ ] Match score distribution (60-100%)
- [ ] 0 workflow errors in n8n logs
- [ ] Supplier portal showing opportunities

**After 1 week:**
- [ ] 1,400-2,800 opportunities discovered
- [ ] Consistent dedup rate (90%+)
- [ ] 50-200 matches per day
- [ ] Suppliers registering in portal
- [ ] Suppliers viewing opportunities

---

## File Reference

**Setup & Configuration:**
- `N8N_MULTISOURCE_SETUP_PLAYBOOK.md` — Complete node-by-node setup guide
- `N8N_JAVASCRIPT_CODE_REFERENCE.md` — Code snippets for all Code nodes
- `OPPORTUNITY_SOURCES_RESEARCH.md` — Analysis of all 14 sources

**Validation & Testing:**
- `scripts/validate-airtable-schema.js` — Verify Airtable setup
- `scripts/test-n8n-connection.js` — Test n8n connectivity
- `scripts/test-supplier-portal.js` — Verify supplier portal API

**Documentation:**
- `HIGHERGOV_IMPLEMENTATION_STRATEGY.md` — Architecture overview
- `SESSION_SUMMARY_2026_05_25.md` — Previous session summary

---

**Status:** Ready to implement  
**Estimated total time:** 2-3 hours  
**Start time:** [INSERT YOUR START TIME]  
**Target completion:** [INSERT YOUR END TIME]

**Notes:**
- All workflows can be created in parallel (no dependencies)
- Test after each workflow creation
- Contact support if any n8n errors occur
- Keep n8n logs open during setup for debugging

---

**Good luck! 🚀**

