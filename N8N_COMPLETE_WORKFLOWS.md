# n8n Workflows - Complete Configuration Guide

**Status:** ✅ 4 Workflows created, ready for node configuration  
**Date:** May 25, 2026

---

## Created Workflows

| Workflow | ID | Webhook | Status |
|----------|----|---------| -------|
| HigherGov Opportunity Scraper | `g44UMWxyKBGboLhd` | `/webhook/highergov-scraper` | ⏳ Needs nodes |
| Deduplication Engine | `GAmExe061Hhnai7m` | `/webhook/deduplication-engine` | ⏳ Needs nodes |
| Contract Matcher | `tctxoU2gRupksNc6` | `/webhook/contract-matcher` | ⏳ Needs nodes |
| Supplier Notifications | `IlKz4vplCqfgIKoK` | `/webhook/supplier-notifications` | ⏳ Needs nodes |

---

## How to Complete Each Workflow

### Workflow 1: HigherGov Opportunity Scraper

**Link:** https://n8n.srv1112587.hstgr.cloud/workflow/g44UMWxyKBGboLhd

**Steps:**

1. Click "+ Add Node" (next to Webhook node)
2. Search: "HTTP Request"
3. Configure:
   ```
   Method: GET
   URL: https://api.highergov.com/v1/opportunities
   Query Parameters: status=open&page=1&per_page=100&sort_by=deadline
   ```

4. Click "+ Add Node" again
5. Search: "Code"
6. Paste this code:
   ```javascript
   const opportunities = $json.opportunities || [];
   const crypto = require('crypto');
   const transformed = opportunities.map(opp => ({
     opportunity_id: opp.id,
     title: opp.title,
     agency: opp.agency,
     description: opp.description,
     source: 'highergov',
     event_date: opp.deadline,
     total_obligated_amount: opp.estimated_value || 0,
     url: opp.url,
     naics_codes: (opp.naics_codes || []).join(','),
     place_of_performance: opp.place_of_performance,
     set_asides: (opp.set_asides || []).join(','),
     url_hash: crypto.createHash('sha256').update(opp.url).digest('hex'),
     source_data: JSON.stringify(opp)
   }));
   return transformed;
   ```

7. Click "+ Add Node"
8. Search: "Airtable"
9. Configure:
   ```
   Operation: Create records
   Base: appZhXnyFiKbnOZLr
   Table: Intelligence
   ```

10. Map fields: Click "Add Field Mapping" for each:
    - opportunity_id → opportunity_id
    - title → title
    - description → description
    - source → source
    - event_date → event_date
    - total_obligated_amount → total_obligated_amount
    - url → url
    - naics_codes → naics_codes
    - place_of_performance → place_of_performance
    - set_asides → set_asides
    - url_hash → url_hash
    - source_data → source_data

11. Connect nodes: Drag from Webhook → HTTP Request → Code → Airtable → Respond

12. Click "Save" (Ctrl+S)

13. Click "Activate" (top right toggle)

14. **Add Schedule:** Click Webhook node → change "Trigger type" from "Webhook" to "Cron"
    - Enter: `0 */6 * * *` (every 6 hours)

---

### Workflow 2: Deduplication Engine

**Link:** https://n8n.srv1112587.hstgr.cloud/workflow/GAmExe061Hhnai7m

**Steps:**

1. Click "+ Add Node"
2. Search: "Airtable"
3. Configure:
   ```
   Operation: Get all records
   Base: appZhXnyFiKbnOZLr
   Table: Intelligence
   Limit: 1000
   ```

4. Click "+ Add Node"
5. Search: "Code"
6. Paste:
   ```javascript
   const records = $input.all();
   const byHash = {};
   const duplicates = [];
   
   records.forEach(rec => {
     const hash = rec.json.url_hash;
     if (!byHash[hash]) byHash[hash] = [];
     byHash[hash].push(rec);
   });
   
   Object.entries(byHash).forEach(([hash, group]) => {
     if (group.length > 1) {
       const sorted = group.sort((a, b) =>
         new Date(a.json.date_added || Date.now()) - 
         new Date(b.json.date_added || Date.now())
       );
       sorted.slice(1).forEach(dup => duplicates.push(dup.json.id));
     }
   });
   
   return [{ duplicates_found: duplicates.length, ids: duplicates }];
   ```

7. Connect: Webhook → Airtable → Code → Respond

8. Save & Activate

9. **Add Schedule:** Webhook node → Cron: `0 * * * *` (every hour)

---

### Workflow 3: Contract Matcher

**Link:** https://n8n.srv1112587.hstgr.cloud/workflow/tctxoU2gRupksNc6

**Steps:**

1. Click "+ Add Node"
2. Search: "Airtable" → Configure:
   ```
   Operation: Get all records
   Base: appZhXnyFiKbnOZLr
   Table: Intelligence
   Limit: 100
   ```
   Name this node: "Read Opportunities"

3. Click "+ Add Node" 
4. Search: "Airtable" → Configure same but Table: "Suppliers"
   Name this node: "Read Suppliers"

5. Click "+ Add Node"
6. Search: "Code"
7. Paste matching algorithm:
   ```javascript
   const opps = $node["Read Opportunities"].json;
   const sups = $node["Read Suppliers"].json;
   const matches = [];
   
   opps.forEach(opp => {
     sups.forEach(sup => {
       const oppNaics = (opp.naics_codes || '').split(',').map(n => n.trim()).filter(n => n);
       const supNaics = (sup.naics_codes || '').split(',').map(n => n.trim()).filter(n => n);
       const supCounties = (sup.preferred_counties || '').split(',').map(c => c.trim()).filter(c => c);
       
       const services = supNaics.some(n => oppNaics.includes(n)) ? 100 : 0;
       const location = supCounties.length === 0 ? 50 : 
         (supCounties.some(c => (opp.place_of_performance || '').includes(c)) ? 100 : 0);
       
       const supCap = sup.estimated_annual_capacity_usd || 0;
       const oppVal = opp.total_obligated_amount || 0;
       const capacity = supCap >= oppVal ? 100 : 
         (supCap > 0 ? Math.round((supCap / oppVal) * 100) : 0);
       
       const score = (services * 0.60) + (location * 0.20) + (capacity * 0.20);
       
       if (score >= 60) {
         matches.push({
           supplier_id: sup.supplier_id,
           opportunity_id: opp.opportunity_id,
           opportunity_name: opp.title,
           contract_value_usd: opp.total_obligated_amount,
           match_score: Math.round(score),
           match_reason: `S:${services}% L:${location}% C:${Math.round(capacity)}%`,
           status: 'Pending',
           supplier_email: sup.business_email,
           source: opp.source
         });
       }
     });
   });
   
   return matches;
   ```

8. Click "+ Add Node"
9. Search: "Airtable" → Configure:
   ```
   Operation: Create records
   Base: appZhXnyFiKbnOZLr
   Table: Supplier_Opportunities
   ```

10. Connect: Webhook → Read Opportunities → Code  
    Also: Webhook → Read Suppliers → Code  
    Then: Code → Airtable → Respond

11. Save & Activate

12. **Add Schedule:** Webhook → Cron: `5 * * * *` (every hour at :05)

---

### Workflow 4: Supplier Notifications

**Link:** https://n8n.srv1112587.hstgr.cloud/workflow/IlKz4vplCqfgIKoK

**Steps:**

1. Click "+ Add Node"
2. Search: "Airtable" → Configure:
   ```
   Operation: Get all records
   Base: appZhXnyFiKbnOZLr
   Table: Supplier_Opportunities
   Filter: status = "Pending"
   Limit: 100
   ```

3. Click "+ Add Node"
4. Search: "Code"
5. Paste:
   ```javascript
   const matches = $input.all();
   const grouped = {};
   
   matches.forEach(m => {
     const key = m.json.supplier_email;
     if (!grouped[key]) {
       grouped[key] = {
         email: m.json.supplier_email,
         opportunities: [],
         match_ids: []
       };
     }
     grouped[key].opportunities.push({
       name: m.json.opportunity_name,
       value: m.json.contract_value_usd,
       score: m.json.match_score
     });
     grouped[key].match_ids.push(m.json.id);
   });
   
   return Object.values(grouped);
   ```

6. Connect: Webhook → Airtable → Code → Respond

7. Save & Activate

8. **Add Schedule:** Webhook → Cron: `30 */6 * * *` (every 6 hours at :30)

---

## Summary Checklist

**Workflow 1: HigherGov Scraper**
- [ ] Added HTTP Request node
- [ ] Added Code node (transform)
- [ ] Added Airtable node (save)
- [ ] Connected all nodes
- [ ] Set schedule: `0 */6 * * *`
- [ ] Activated workflow

**Workflow 2: Deduplication Engine**
- [ ] Added Airtable node (read)
- [ ] Added Code node (deduplicate)
- [ ] Connected nodes
- [ ] Set schedule: `0 * * * *`
- [ ] Activated workflow

**Workflow 3: Contract Matcher**
- [ ] Added 2 Airtable nodes (read opps & suppliers)
- [ ] Added Code node (matching algorithm)
- [ ] Added Airtable node (save matches)
- [ ] Connected all nodes
- [ ] Set schedule: `5 * * * *`
- [ ] Activated workflow

**Workflow 4: Supplier Notifications**
- [ ] Added Airtable node (read)
- [ ] Added Code node (group)
- [ ] Connected nodes
- [ ] Set schedule: `30 */6 * * *`
- [ ] Activated workflow

---

## Test Workflows

Once configured, test with curl:

```bash
# Test HigherGov Scraper
curl -X POST https://n8n.srv1112587.hstgr.cloud/webhook/highergov-scraper

# Test Deduplication Engine
curl -X POST https://n8n.srv1112587.hstgr.cloud/webhook/deduplication-engine

# Test Contract Matcher
curl -X POST https://n8n.srv1112587.hstgr.cloud/webhook/contract-matcher

# Test Supplier Notifications
curl -X POST https://n8n.srv1112587.hstgr.cloud/webhook/supplier-notifications
```

---

## View Results

After running workflows:

1. **Opportunities:** Go to Airtable Intelligence table
2. **Matches:** Go to Airtable Supplier_Opportunities table
3. **Logs:** Check n8n execution logs for each workflow

---

## Expected Results After Setup

**Every 6 hours:**
- HigherGov Scraper discovers 50-100 new opportunities

**Every hour:**
- Deduplication Engine removes duplicates
- Contract Matcher creates matches (60% services + 20% location + 20% capacity)

**Twice daily (every 6 hours at :30):**
- Supplier Notifications processes matches

---

## Troubleshooting

**Workflow won't activate:**
- Check that Airtable API key is valid in Airtable credentials
- Verify n8n server connection

**No data in Airtable:**
- Check workflow execution logs for errors
- Verify Airtable table names are exact
- Make sure field names in mappings match exactly

**Matches not being created:**
- Verify suppliers have NAICS codes filled in
- Check that suppliers are marked "Approved" in registration_status
- Lower match threshold in Code node if needed (change 60 to 50)

---

**Status:** ✅ Workflows created and ready for configuration  
**Next:** Complete the 4 workflows following steps above  
**Time estimate:** 30-45 minutes total

