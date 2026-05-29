# n8n Multi-Source Opportunity Discovery - Complete Setup Playbook

**Status:** Ready for implementation  
**Date:** May 25, 2026  
**Target:** Production setup in 2-3 hours  
**Created for:** Manual n8n UI configuration

---

## Quick Start Checklist

Before you begin, verify you have:
- [ ] n8n login: https://n8n.srv1112587.hstgr.cloud
- [ ] HigherGov API key: `4be72a011d644af8bca9a11f85c90d95`
- [ ] Airtable Base ID: `appZhXnyFiKbnOZLr`
- [ ] Airtable API token (with write access to Intelligence table)
- [ ] SendGrid API key (optional, for email notifications)

---

## Phase 1: Setup Airtable Tables

### Step 1: Verify/Create Intelligence Table

**Base:** appZhXnyFiKbnOZLr  
**Table Name:** Intelligence

**Required Fields** (create if missing):

```
Field Name              Type           Description
─────────────────────────────────────────────────────
opportunity_id         Text           Unique ID from source (SAM-123456)
title                  Text           Opportunity title
agency                 Text           Federal agency name
description            Long text      Full opportunity description
source                 Text           Source (highergov, sam-gov, usaspending)
deadline               Date           Application deadline
estimated_value        Number         Contract value in USD
url                    Text           Link to original posting
naics_codes            Text           NAICS classification codes (comma-separated)
place_of_performance   Text           Location where work happens
set_asides             Text           Set-asides (8(a), HUBZone, etc)
posted_date            Date           Date posted
date_added             Timestamp      When added to Intelligence table
record_type            Text           Contract, Grant, Award
url_hash               Text           SHA256 hash of URL (for deduplication)
source_data            Long text      Raw JSON from source (for archival)
matched                Checkbox       True if matched to suppliers (default: false)
```

---

### Step 2: Verify/Create Supplier_Opportunities Table

**Table Name:** Supplier_Opportunities

**Required Fields:**

```
Field Name              Type           Description
─────────────────────────────────────────────────────
supplier_id            Text           Link to supplier (record ID)
opportunity_id         Text           Link to Intelligence table record
opportunity_name       Text           Title of opportunity
contract_value_usd     Number         Estimated contract value
deadline               Date           Application deadline
match_score            Number         Matching score (0-100)
match_reason           Long text      Why this match (criteria that matched)
status                 Single select  Pending, Sent to supplier, Applied, Won, Lost
date_matched           Timestamp      When match was created
notified               Checkbox       True if supplier was notified
notification_date      Timestamp      When notification was sent
supplier_email         Email          Supplier contact email
source                 Text           Where opportunity came from
```

---

### Step 3: Verify/Create Suppliers Table

**Table Name:** Suppliers

**Required Fields:**

```
Field Name              Type           Description
─────────────────────────────────────────────────────
supplier_id            Text           Unique ID
legal_name             Text           Company name
contact_name           Text           Primary contact
business_email         Email          Contact email
phone                  Text           Phone number
naics_codes            Text           Services offered (NAICS codes)
preferred_counties     Text           Geographic focus (comma-separated)
estimated_annual_capacity_usd  Number  Annual capacity
registration_status    Single select  Pending, Approved, Active, Inactive
website                Text           Company website
sub_category           Text           Supplier type
date_registered        Timestamp      Registration date
```

---

## Phase 2: Workflow 1 - HigherGov Opportunity Scraper

**Purpose:** Discover new federal opportunities from HigherGov API  
**Frequency:** Every 6 hours (0, 6, 12, 18)  
**Execution time:** ~5-10 seconds  
**Expected output:** 50-100 opportunities per run

### Steps to Create

1. Open n8n: https://n8n.srv1112587.hstgr.cloud
2. Click **+ New Workflow**
3. Name: `HigherGov Opportunity Scraper`

### Node 1: Webhook Trigger

**Type:** Webhook  
**HTTP Method:** POST  
**Path:** `highergov-scraper`  
**Authentication:** None

### Node 2: HTTP Request - HigherGov API

**Type:** HTTP Request

**Config:**
```
URL: https://api.highergov.com/v1/opportunities
Method: GET
Authentication: Generic Credential Type
Headers:
  - API Key: 4be72a011d644af8bca9a11f85c90d95

Query Parameters:
  - status: open
  - page: 1
  - per_page: 100
  - sort_by: deadline
```

**Response Handling:**
- Expect: `{ "opportunities": [...], "pagination": {...} }`

### Node 3: Code - Transform & Deduplicate

**Type:** Code (JavaScript)

**Language:** JavaScript  
**Mode:** Run Once  

**Code:**
```javascript
// Extract opportunities from HigherGov response
const opportunities = $('HTTP Request').json().opportunities || [];

// Transform and prepare for deduplication
const transformed = opportunities.map(opp => {
  const crypto = require('crypto');
  const urlHash = crypto
    .createHash('sha256')
    .update(opp.url)
    .digest('hex');
  
  return {
    opportunity_id: opp.id,
    title: opp.title,
    agency: opp.agency,
    description: opp.description,
    source: 'highergov',
    deadline: opp.deadline,
    estimated_value: opp.estimated_value || 0,
    url: opp.url,
    naics_codes: (opp.naics_codes || []).join(','),
    place_of_performance: opp.place_of_performance,
    set_asides: (opp.set_asides || []).join(','),
    posted_date: opp.posted_date,
    record_type: 'Contract',
    url_hash: urlHash,
    source_data: JSON.stringify(opp),
    matched: false,
    date_added: new Date().toISOString()
  };
});

return transformed;
```

### Node 4: Airtable - Check for Duplicates

**Type:** Airtable  
**Action:** Query records  
**Base:** appZhXnyFiKbnOZLr  
**Table:** Intelligence

**Config:**
```
View: Grid view (or leave blank for all records)
Limit: 10000
Filter: Only records where url_hash = [from input]
```

**This node runs for EACH opportunity to check if url_hash exists**

### Node 5: Code - Filter Out Duplicates

**Type:** Code (JavaScript)

**Code:**
```javascript
// Get opportunities from Node 3
const opportunities = $('Code').json();

// Get duplicate check results from Node 4
const airtableResults = $('Airtable - Check Duplicates');

// Filter out records that already exist
const newOpportunities = opportunities.filter((opp, index) => {
  const duplicateCheck = airtableResults[index];
  // If Airtable returned 0 records, it's new
  return (!duplicateCheck || duplicateCheck.length === 0);
});

return newOpportunities;
```

### Node 6: Airtable - Save to Intelligence

**Type:** Airtable  
**Action:** Create records

**Config:**
```
Base: appZhXnyFiKbnOZLr
Table: Intelligence
```

**Field Mapping** (map each field from Node 5):
```
opportunity_id ← opportunity_id
title ← title
agency ← agency
description ← description
source ← source
deadline ← deadline
estimated_value ← estimated_value
url ← url
naics_codes ← naics_codes
place_of_performance ← place_of_performance
set_asides ← set_asides
posted_date ← posted_date
record_type ← record_type
url_hash ← url_hash
source_data ← source_data
matched ← matched
date_added ← date_added
```

### Node 7: Log Results

**Type:** Function / Code

**Code:**
```javascript
const newOpps = $('Airtable - Save').length;
console.log(`HigherGov Scraper: Added ${newOpps} new opportunities`);
return {
  success: true,
  opportunities_added: newOpps,
  timestamp: new Date().toISOString()
};
```

### Node 8: Respond to Webhook

**Type:** Respond to Webhook  
**Response:** JSON from Node 7

---

## Phase 3: Workflow 2 - Deduplication Engine

**Purpose:** Remove duplicate opportunities across sources  
**Frequency:** Every 1 hour (00 minutes, every hour)  
**Execution time:** ~10-30 seconds  

### Steps to Create

1. Click **+ New Workflow**
2. Name: `Deduplication Engine`

### Node 1: Webhook Trigger

**Type:** Webhook  
**Path:** `deduplication-engine`

### Node 2: Airtable - Read Opportunities

**Type:** Airtable  
**Action:** Read records  
**Base:** appZhXnyFiKbnOZLr  
**Table:** Intelligence

**Config:**
```
View: Grid view
Limit: 1000
Filter: Only records where matched = false (unmatched ones to skip)
```

### Node 3: Code - Identify Duplicates

**Type:** Code (JavaScript)

**Code:**
```javascript
const records = $('Airtable - Read Opportunities').json();

// Group by url_hash
const byHash = {};
const duplicates = [];

records.forEach(record => {
  const hash = record.fields.url_hash;
  if (!byHash[hash]) {
    byHash[hash] = [];
  }
  byHash[hash].push(record);
});

// Find groups with duplicates
Object.entries(byHash).forEach(([hash, group]) => {
  if (group.length > 1) {
    // Keep first (oldest by date_added), mark others for deletion
    const sorted = group.sort((a, b) => 
      new Date(a.fields.date_added) - new Date(b.fields.date_added)
    );
    const keepRecord = sorted[0];
    
    sorted.slice(1).forEach(duplicate => {
      duplicates.push({
        id: duplicate.id,
        title: duplicate.fields.title,
        source: duplicate.fields.source,
        keepId: keepRecord.id,
        keepSource: keepRecord.fields.source
      });
    });
  }
});

return {
  duplicates_found: duplicates.length,
  duplicates: duplicates
};
```

### Node 4: Airtable - Delete Duplicates

**Type:** Airtable  
**Action:** Delete records

**Config:**
```
Base: appZhXnyFiKbnOZLr
Table: Intelligence
Record ID: [from duplicates array in Node 3]
```

**Note:** Run this for each duplicate returned from Node 3

### Node 5: Log Results

**Type:** Code

**Code:**
```javascript
const result = $('Code - Identify Duplicates').json();
console.log(`Dedup: Found and removed ${result.duplicates_found} duplicates`);
return result;
```

### Node 6: Respond to Webhook

**Type:** Respond to Webhook

---

## Phase 4: Workflow 3 - Contract Matcher

**Purpose:** Match opportunities to suppliers based on scoring algorithm  
**Frequency:** Every 1 hour (05 minutes, every hour) - staggered 5 min after dedup  
**Execution time:** ~15-30 seconds  

### Steps to Create

1. Click **+ New Workflow**
2. Name: `Contract Matcher`

### Node 1: Webhook Trigger

**Type:** Webhook  
**Path:** `contract-matcher`

### Node 2: Airtable - Read Unmatched Opportunities

**Type:** Airtable  
**Action:** Read records  
**Table:** Intelligence

**Filter:**
```
matched ≠ true
```

**Limit:** 100

### Node 3: Airtable - Read Suppliers

**Type:** Airtable  
**Action:** Read records  
**Table:** Suppliers

**Filter:**
```
registration_status = "Approved" OR "Active"
```

**Limit:** 1000

### Node 4: Code - Execute Matching Algorithm

**Type:** Code (JavaScript)

**Code:**
```javascript
const opportunities = $('Airtable - Read Unmatched Opportunities').json();
const suppliers = $('Airtable - Read Suppliers').json();

const matches = [];

opportunities.forEach(opp => {
  const oppNaics = (opp.fields.naics_codes || '').split(',').map(n => n.trim());
  
  suppliers.forEach(supplier => {
    const supplierNaics = (supplier.fields.naics_codes || '').split(',').map(n => n.trim());
    const supplierCounties = (supplier.fields.preferred_counties || '').split(',').map(c => c.trim());
    
    // Service Match (60% weight)
    const serviceMatch = supplierNaics.some(n => oppNaics.includes(n)) ? 100 : 0;
    
    // Location Match (20% weight)
    const locationMatch = supplierCounties.some(c => opp.fields.place_of_performance?.includes(c)) ? 100 : 50; // 50 if not specified
    
    // Capacity Match (20% weight)
    const supplierCapacity = supplier.fields.estimated_annual_capacity_usd || 0;
    const oppValue = opp.fields.estimated_value || 0;
    const capacityMatch = supplierCapacity >= oppValue ? 100 : (supplierCapacity > 0 ? (supplierCapacity / oppValue) * 100 : 0);
    
    // Calculate total score
    const score = (serviceMatch * 0.60) + (locationMatch * 0.20) + (capacityMatch * 0.20);
    
    // Only add match if score >= 60
    if (score >= 60) {
      matches.push({
        supplier_id: supplier.id,
        supplier_email: supplier.fields.business_email,
        opportunity_id: opp.id,
        opportunity_name: opp.fields.title,
        contract_value_usd: opp.fields.estimated_value,
        deadline: opp.fields.deadline,
        match_score: Math.round(score),
        match_reason: `Service: ${serviceMatch}% | Location: ${locationMatch}% | Capacity: ${Math.round(capacityMatch)}%`,
        status: 'Pending',
        date_matched: new Date().toISOString(),
        notified: false,
        source: opp.fields.source
      });
    }
  });
});

return matches;
```

### Node 5: Airtable - Save Matches

**Type:** Airtable  
**Action:** Create records  
**Table:** Supplier_Opportunities

**Field Mapping:**
```
supplier_id ← supplier_id
opportunity_id ← opportunity_id
opportunity_name ← opportunity_name
contract_value_usd ← contract_value_usd
deadline ← deadline
match_score ← match_score
match_reason ← match_reason
status ← status
date_matched ← date_matched
notified ← notified
supplier_email ← supplier_email
source ← source
```

### Node 6: Code - Update Matched Flag

**Type:** Code

**Code:**
```javascript
const matches = $('Code - Execute Matching Algorithm').json();
const oppIds = [...new Set(matches.map(m => m.opportunity_id))];

console.log(`Matcher: Created ${matches.length} matches from ${oppIds.length} opportunities`);
return {
  matches_created: matches.length,
  opportunities_matched: oppIds.length
};
```

### Node 7: Airtable - Mark as Matched

**Type:** Airtable  
**Action:** Update records  
**Table:** Intelligence

**Filter:** ID in [opportunity IDs from Node 6]  
**Update:** `matched = true`

### Node 8: Respond to Webhook

**Type:** Respond to Webhook

---

## Phase 5: Workflow 4 - Supplier Notifications

**Purpose:** Send email notifications to suppliers about new matches  
**Frequency:** Every 6 hours (30 minutes offset, so 00:30, 06:30, 12:30, 18:30)  
**Execution time:** ~20-40 seconds

### Steps to Create

1. Click **+ New Workflow**
2. Name: `Supplier Notifications`

### Node 1: Webhook Trigger

**Type:** Webhook  
**Path:** `supplier-notifications`

### Node 2: Airtable - Read Unnotified Matches

**Type:** Airtable  
**Action:** Read records  
**Table:** Supplier_Opportunities

**Filter:**
```
notified ≠ true
AND status = "Pending"
```

**Limit:** 100

### Node 3: Code - Group by Supplier

**Type:** Code (JavaScript)

**Code:**
```javascript
const matches = $('Airtable - Read Unnotified Matches').json();

// Group by supplier_id and supplier_email
const grouped = {};

matches.forEach(match => {
  const supplierId = match.fields.supplier_id;
  const supplierEmail = match.fields.supplier_email;
  const key = supplierId || supplierEmail;
  
  if (!grouped[key]) {
    grouped[key] = {
      supplier_id: supplierId,
      supplier_email: supplierEmail,
      opportunities: [],
      match_ids: []
    };
  }
  
  grouped[key].opportunities.push({
    name: match.fields.opportunity_name,
    value: match.fields.contract_value_usd,
    deadline: match.fields.deadline,
    match_score: match.fields.match_score,
    source: match.fields.source
  });
  
  grouped[key].match_ids.push(match.id);
});

return Object.values(grouped);
```

### Node 4: SendGrid - Send Email (OPTIONAL)

**Type:** SendGrid  
**Action:** Send email

**Config:**
```
From Email: notifications@maravillacleaners.com
To Email: [supplier_email from grouped data]
Subject: 3 New Federal Opportunities Matched to Your Company
HTML: [Email template below]
```

**Email Template HTML:**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }
    .header { background-color: #3222F4; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .opp-card { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 4px; }
    .opp-title { font-size: 16px; font-weight: bold; color: #333; }
    .opp-meta { font-size: 13px; color: #666; margin-top: 8px; }
    .match-score { display: inline-block; background-color: #3222F4; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .btn { display: inline-block; background-color: #3222F4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>New Federal Opportunities Matched to Your Company</h2>
      <p>We found {{count}} opportunities that match your services and location.</p>
    </div>
    
    {{#opportunities}}
    <div class="opp-card">
      <div class="opp-title">{{name}}</div>
      <div class="opp-meta">
        <p><strong>Value:</strong> ${{value | formatNumber}}</p>
        <p><strong>Deadline:</strong> {{deadline}}</p>
        <p><strong>Source:</strong> {{source}}</p>
        <span class="match-score">{{match_score}}% Match</span>
      </div>
    </div>
    {{/opportunities}}
    
    <p><a href="https://yourportal.com/suppliers/opportunities" class="btn">View All Opportunities</a></p>
    
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
    <p style="font-size: 12px; color: #999;">
      This is an automated notification. Your opportunities are available in your supplier dashboard.
      <br>
      Questions? Contact us at hello@maravillacleaners.com
    </p>
  </div>
</body>
</html>
```

### Node 5: Code - Prepare Airtable Update

**Type:** Code (JavaScript)

**Code:**
```javascript
const grouped = $('Code - Group by Supplier').json();
const results = [];

grouped.forEach(group => {
  group.match_ids.forEach(matchId => {
    results.push({
      recordId: matchId,
      notified: true,
      notification_date: new Date().toISOString()
    });
  });
});

return results;
```

### Node 6: Airtable - Mark as Notified

**Type:** Airtable  
**Action:** Update records  
**Table:** Supplier_Opportunities

**For each item from Node 5:**
```
Record ID: recordId
Update Fields:
  notified = true
  notification_date = notification_date
```

### Node 7: Respond to Webhook

**Type:** Respond to Webhook

---

## Phase 6: Schedule All Workflows

After creating all workflows, set up schedules:

### HigherGov Scraper Schedule
1. Click workflow name: **HigherGov Opportunity Scraper**
2. Click **Trigger** button at top
3. Change from **Webhook** to **Cron**
4. Enter: `0 */6 * * *` (every 6 hours at 0:00, 6:00, 12:00, 18:00 UTC)
5. Click **Activate** button

### Deduplication Engine Schedule
1. Open **Deduplication Engine**
2. Change trigger to **Cron**
3. Enter: `0 * * * *` (every hour at :00)
4. Click **Activate**

### Contract Matcher Schedule
1. Open **Contract Matcher**
2. Change trigger to **Cron**
3. Enter: `5 * * * *` (every hour at :05, staggered 5 min after dedup)
4. Click **Activate**

### Supplier Notifications Schedule
1. Open **Supplier Notifications**
2. Change trigger to **Cron**
3. Enter: `30 */6 * * *` (every 6 hours at :30 offset)
4. Click **Activate**

---

## Phase 7: Testing & Verification

### Test 1: Trigger HigherGov Scraper Manually

```bash
curl -X POST https://n8n.srv1112587.hstgr.cloud/webhook/highergov-scraper \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected result:** 50-100 new opportunities added to Airtable Intelligence table

**Verify in Airtable:**
- Open Intelligence table
- Check that `source = "highergov"` records exist
- Verify fields are populated (title, agency, deadline, etc.)

### Test 2: Trigger Deduplication

```bash
curl -X POST https://n8n.srv1112587.hstgr.cloud/webhook/deduplication-engine \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected result:** Duplicates identified and removed (if any)

**Verify:**
- Check n8n execution logs for dedup results
- Count total records in Intelligence table (should be stable or decrease)

### Test 3: Trigger Contract Matcher

```bash
curl -X POST https://n8n.srv1112587.hstgr.cloud/webhook/contract-matcher \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected result:** Matches created in Supplier_Opportunities table

**Verify in Airtable:**
- Open Supplier_Opportunities table
- Check that records were created
- Verify `match_score` values (should be 60-100)

### Test 4: Trigger Supplier Notifications

```bash
curl -X POST https://n8n.srv1112587.hstgr.cloud/webhook/supplier-notifications \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected result:** 
- Emails sent to suppliers (if SendGrid enabled)
- Matches marked as `notified = true` in Airtable

**Verify:**
- Check Supplier_Opportunities table: `notified` should be checked
- Check email inbox for notifications (if SendGrid enabled)

---

## Phase 8: Monitor & Optimize

### Daily Checklist

```
[ ] Check n8n workflow execution logs (0 errors?)
[ ] Verify daily opportunity count: 200-400 new per day
[ ] Check deduplicated count: 180-350 unique per day
[ ] Verify matcher results: 5-50 matches per hour (1-20 per dedup cycle)
[ ] Review supplier notifications sent: 1-5 per cycle
[ ] Check Airtable Intelligence table growth
[ ] Monitor API usage (HigherGov limit: 100 req/min, should be ~1 req per 6 hrs)
```

### Performance Expectations

| Metric | Target | Alert If |
|--------|--------|----------|
| HigherGov API Response | < 5 seconds | > 10 seconds |
| Dedup Engine Execution | < 30 seconds | > 60 seconds |
| Matcher Execution | < 30 seconds | > 60 seconds |
| Notifier Execution | < 30 seconds | > 60 seconds |
| Daily Opportunities | 200-400 | < 100 or > 600 |
| Deduplicated (%) | 90%+ | < 85% |
| Matches Generated | 50-200 per day | < 10 or > 500 |

---

## Phase 9: Add SAM.gov When Key Available

When you get SAM.gov API key from https://api.data.gov/signup:

1. Create new workflow: **SAM.gov Opportunity Scraper**
2. Copy Nodes 1-6 from HigherGov scraper
3. Change Node 2 (HTTP Request):
   ```
   URL: https://api.sam.gov/prod/opportunities/v1/search
   Query params:
     - api_key: [YOUR_SAM_GOV_KEY]
     - status: open
     - limit: 100
   ```
4. Change Node 3 (Code): Set `source = 'sam-gov'` instead of 'highergov'
5. Schedule: `0 */8 * * *` (every 8 hours at 0, 8, 16)

No changes needed to dedup, matcher, or notifier - they handle both sources automatically.

---

## Troubleshooting

### Issue: "HigherGov API returning 401"
**Cause:** Invalid API key  
**Fix:** Verify key is exactly `4be72a011d644af8bca9a11f85c90d95`  
**Test:**
```bash
curl "https://api.highergov.com/v1/opportunities?api_key=4be72a011d644af8bca9a11f85c90d95&status=open&page=1&per_page=10"
```

### Issue: "Airtable connection failing"
**Cause:** Wrong API token or Base ID  
**Fix:** 
1. Get fresh Airtable token from https://airtable.com/account/tokens
2. Verify Base ID: appZhXnyFiKbnOZLr (in Intelligence table URL)
3. Verify token has read/write access to Intelligence, Supplier_Opportunities, Suppliers tables

### Issue: "No matches found"
**Cause:** Suppliers don't have NAICS codes or matching criteria too strict  
**Fix:**
1. Verify Suppliers table has NAICS codes populated
2. In Node 4 (Matcher Code), lower threshold from 60 to 50 or 40
3. Check match_reason field to see why matches aren't being created

### Issue: "Emails not sending"
**Cause:** SendGrid not configured or wrong email  
**Fix:**
1. Verify SendGrid API key in n8n credentials
2. Verify "from" email is verified in SendGrid dashboard
3. Check email spam folder
4. Test with manual email send in n8n UI first

---

## Success Metrics

After 24 hours, you should see:
- ✅ 200-400 new opportunities in Intelligence table
- ✅ 180-350 unique after deduplication
- ✅ 50-200 matches in Supplier_Opportunities
- ✅ Email notifications sent to suppliers (if enabled)
- ✅ 0 workflow errors in n8n logs

After 1 week:
- ✅ 1,400-2,800 opportunities discovered
- ✅ 350-1,400 matches created
- ✅ Supplier portal showing opportunities to authenticated suppliers
- ✅ Suppliers tracking applications

---

## Next Steps

1. **Today:** Create all 4 workflows (HigherGov, Dedup, Matcher, Notifier)
2. **Tomorrow:** Add SendGrid for email notifications
3. **This week:** Get SAM.gov API key and add SAM.gov scraper
4. **Next week:** Monitor workflow execution and refine matching algorithm
5. **Month 2:** Add Grants.gov, USASpending scrapers
6. **Month 3:** Add commercial intelligence sources

---

**Status:** ✅ Ready to implement  
**Expected time to setup:** 2-3 hours  
**Expected time to production:** 1 day  
**Support:** All n8n docs at https://docs.n8n.io

