# Flow B - Sub Discovery (Sunbiz Query)

## Overview

Flow B is an automated n8n workflow that discovers and classifies janitorial service providers (suppliers/subs) to build a supplier database for potential outreach and partnerships.

**Key Characteristics:**
- **Trigger:** Daily at 6:00 AM ET
- **Data Source:** Sunbiz API (Florida business registrations)
- **Target Industry:** NAICS 561720 (Janitorial Services)
- **Target Formation Age:** < 180 days (newly formed subs)
- **Output:** SUBS_STAGING Airtable table with classification
- **Status:** `New` (ready for outreach/qualification)

---

## Purpose

Flow B complements Flow A (client discovery) by identifying potential sub/supplier partners in the janitorial services space. This enables:

1. **Supplier Network Building** - Connect with other cleaning companies for joint bids, overflow capacity, specialty services
2. **Partnership Opportunities** - White-label relationships, contractor networks
3. **Subcontracting Platform** - Build a marketplace of pre-vetted cleaning services
4. **Capacity Planning** - Scale business by partnering with other established subs

---

## Workflow Architecture

### Node Sequence

```
Schedule Trigger (6 AM ET)
  ↓
Initialize Query Parameters (date < 180 days, NAICS=561720)
  ↓
Query Sunbiz API (NAICS=561720, state=FL, active)
  ↓
Parse Sunbiz Records (extract fields)
  ↓
Dedup Check - Airtable (legal_name + sunbiz_record_id)
  ├─ Already exists + opted_out=true → Route to Skipped
  └─ New or exists but not opted out → Continue
      ↓
      Check - Already Exists or Opted Out (flag for filtering)
      ↓
      Filter - Skip Opted Out Only (pass through new records)
      ↓
      Classify Sub Category (Commercial/Residential/Specialty/GovCon)
      ↓
      Enrich Sub - Contact Details (email, phone, website)
      ↓
      Prepare Airtable Record (map to SUBS_STAGING fields)
      ↓
      Save to Airtable SUBS_STAGING (status='New')
      ├─ Log Created Event (audit trail)
      └─ Log Classified Event (audit trail)

Filter - Route Skipped Records (existing + opted_out)
  ↓
Log Skipped Event (audit trail)
```

### 14 Nodes Total

| # | Node Name | Type | Purpose |
|----|-----------|------|---------|
| 1 | Schedule Trigger - 6 AM ET | Trigger | Daily 6 AM ET execution |
| 2 | Initialize Query Parameters | Function | Calculate 180-day window, set query params |
| 3 | Query Sunbiz API - NAICS 561720 | HTTP | Fetch janitorial subs from Sunbiz |
| 4 | Parse Sunbiz Records | Function | Extract fields from Sunbiz response |
| 5 | Dedup Check - Airtable | HTTP | Check if legal_name or sunbiz_record_id exists |
| 6 | Check - Already Exists or Opted Out | Function | Determine if record should be skipped |
| 7 | Filter - Skip Opted Out Only | Filter | Pass only new records (not opted out) |
| 8 | Classify Sub Category | Function | Assign Commercial/Residential/Specialty/GovCon |
| 9 | Enrich Sub - Contact Details | HTTP | Resolve email, phone, website |
| 10 | Prepare Airtable Record | Function | Map fields to SUBS_STAGING schema |
| 11 | Save to Airtable SUBS_STAGING | HTTP | Create record in Airtable |
| 12 | Log Created Event | HTTP | Audit log: 'created' event |
| 13 | Log Classified Event | HTTP | Audit log: 'classified' event |
| 14 | Filter - Route Skipped Records | Filter | Route opted-out records to logging |
| 15 | Log Skipped Event | HTTP | Audit log: 'skipped' event |

---

## Sub Category Classification

Flow B assigns one of four categories based on business name and DBA signals:

### 1. **Commercial**
- Keywords: `office`, `corporate`, `business`, `commercial`, `medical`, `clinic`
- Profile: Office buildings, corporate tenants, medical facilities, retail spaces
- Service Fit: Routine & deep cleaning contracts with consistent revenue

### 2. **Residential**
- Keywords: `residential`, `home`, `house`, `apartment`, `airbnb`, `str`, `short-term`
- Profile: Residential cleaning companies, STR cleaners, home cleaning services
- Service Fit: Single-family, apartment complex, vacation rental deep cleans

### 3. **Specialty**
- Keywords: `carpet`, `pressure`, `wash`, `window`, `junk`, `removal`, `floor`, `specialized`
- Profile: Carpet cleaners, pressure washers, post-construction, specialty services
- Service Fit: Partner for add-on services (carpet, pressure washing, specialized cleaning)

### 4. **GovCon** (Government Contractor)
- Keywords: `federal`, `government`, `state`, `municipal`, `contract`
- Profile: Government contractors, government services companies
- Service Fit: High-value government contracts with compliance requirements

**Default:** If no keywords match, defaults to `Commercial`

---

## Data Flow

### Input: Sunbiz Query

```json
{
  "state": "FL",
  "naics": "561720",
  "date_formed_after": "2026-XX-XX",  // 180 days ago
  "status": "ACTIVE",
  "page": 1,
  "limit": 100
}
```

### Processing Steps

1. **Deduplication**
   - Check Airtable SUBS_STAGING for existing legal_name
   - Skip if found AND opt_out=true
   - Continue if new or exists but not opted out

2. **Classification**
   - Analyze legal_name + DBA for keywords
   - Assign sub_category (Commercial/Residential/Specialty/GovCon)
   - Include classification reasoning

3. **Enrichment** (simulated/optional)
   - Contact details service resolves:
     - business_email (from domain registration or directory)
     - phone (from NCDB or public records)
     - website (from domain or search)

### Output: SUBS_STAGING Record

```json
{
  "legal_name": "ProClean Commercial Services",
  "contact_name": "Michael Rodriguez",
  "business_email": "contact@procleancommercial.com",
  "phone": "+1-305-123-4567",
  "website": "https://www.procleancommercial.com",
  "date_formed": "2026-01-10",
  "county": "Miami-Dade",
  "sub_category": "Commercial",
  "status": "New",
  "source": "Sunbiz",
  "notes": "NAICS: 561720 (Janitorial Services). Formed: 2026-01-10. Officer: Michael Rodriguez. Address: 1000 Business Plaza, Miami, FL 33101. Classification: Commercial service keywords detected"
}
```

---

## Airtable SUBS_STAGING Table Schema

| Field | Type | Notes |
|-------|------|-------|
| legal_name | Text | Company name from Sunbiz (primary key) |
| contact_name | Text | Principal officer name |
| business_email | Email | Contact email |
| phone | Phone | Contact phone |
| website | URL | Business website |
| date_formed | Date | Company formation date from Sunbiz |
| county | Select | FL county (Miami-Dade, Broward, Hillsborough, etc.) |
| sub_category | Select | **Commercial** / **Residential** / **Specialty** / **GovCon** |
| status | Select | **New** (on creation) |
| source | Select | Always 'Sunbiz' |
| notes | Long Text | Classification details, address, officer info |

---

## Environment Variables

All are **REQUIRED** for production deployment:

```bash
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXXXXXX
AIRTABLE_API_KEY=patXXXXXXXXXXXXXXXXXX
SUNBIZ_API_URL=https://sunbiz.example.com/api/search
ENRICHMENT_SERVICE_URL=http://localhost:3000/api/enrich
```

---

## Deduplication Logic

Flow B prevents duplicate subs in SUBS_STAGING:

1. **Lookup:** Query SUBS_STAGING for:
   - Exact legal_name match (case-insensitive)
   - OR exact sunbiz_record_id match

2. **Decision:**
   - If found + opt_out=true → **Skip** (log skipped event)
   - If found + opt_out=false → **Skip** (already in pipeline)
   - If not found → **Continue** (new sub)

3. **Outcome:**
   - Prevents duplicate Airtable records
   - Respects opt-out preferences from user feedback

---

## Audit Logging

Every execution is logged to Audit Log table for compliance and debugging:

### Event Type: `created`
```json
{
  "event_type": "created",
  "source": "Flow B - Sunbiz Sub Discovery",
  "performed_by": "n8n-automation",
  "notes": "New janitorial sub created from Sunbiz query: ProClean Commercial Services (Category: Commercial, County: Miami-Dade)"
}
```

### Event Type: `classified`
```json
{
  "event_type": "classified",
  "source": "Flow B - Sub Category Classifier",
  "performed_by": "n8n-automation",
  "notes": "Sub classified: ProClean Commercial Services (Commercial) - New"
}
```

### Event Type: `skipped`
```json
{
  "event_type": "skipped",
  "source": "Flow B - Dedup Check",
  "performed_by": "n8n-automation",
  "notes": "Sub skipped (already exists or opted out): Elite Cleaning Services"
}
```

---

## Test Results

**Test File:** `migration/sunbiz-test-subs.json`  
**Test Script:** `scripts/test-flow-b.js`  
**Test Output:** `tests/flow-b-test-results.json`

### Test Data (5 Mock Records)

| # | Company | Classification | Reasoning |
|---|---------|-----------------|-----------|
| 1 | ProClean Commercial Services | Commercial | Commercial service keywords |
| 2 | Residential Cleaning Solutions Inc | Residential | Residential/home keywords |
| 3 | Specialty Carpet & Pressure Washing | Specialty | Specialty service keywords |
| 4 | Federal Government Facility Services LLC | GovCon | Government/federal keywords |
| 5 | Commercial Office Maintenance Corp | Commercial | Commercial/office keywords |

### Test Results: PASS ✓

```
Total records processed:     5
Successfully classified:     5
Routed to SUBS_STAGING:      5
All records valid:           YES

Category distribution:
  - Commercial:  2 (40%)
  - Residential: 1 (20%)
  - Specialty:   1 (20%)
  - GovCon:      1 (20%)

All required Airtable fields:  ✓
Audit logging prepared:        ✓ (10 events: 5 created + 5 classified)
```

---

## Error Handling Strategy

| Scenario | Behavior |
|----------|----------|
| Sunbiz API fails | continueOnFail=true, returns no records, logs error |
| Dedup check fails | continueOnFail=true, assumes new record, continues |
| Enrichment fails | continueOnFail=true, uses fallback values, continues |
| Airtable save fails | **STOPS** (critical) - logs error to console |
| Audit logging fails | continueOnFail=true (non-blocking, non-critical) |

---

## Integration Points

### Upstream Flows
- **None** - Flow B is an independent daily trigger

### Downstream Flows
- **Flow E (Re-engagement)** - Can target subs marked as inactive
- **Dashboard** - `/subs` page displays SUBS_STAGING records for outreach

### Services
- **Airtable API:** SUBS_STAGING + Audit Log tables
- **Sunbiz API:** Business registration data (NAICS=561720, <180 days)
- **Enrichment Service:** Contact resolution (email, phone, website)

### Dashboard Integration
- `/subs` page fetches SUBS_STAGING records
- "Contact Sub" button updates status to 'Contacted'
- "Qualify" button updates status to 'Qualified'
- Audit Log tracks all changes

---

## Deployment Instructions

### 1. Import JSON to n8n

```bash
# In n8n UI:
# 1. Click "+ New" → Workflow
# 2. Click "⋮" (menu) → "Load from file"
# 3. Select n8n-workflows/flow-b-subs.json
# 4. Click "Save"
```

### 2. Configure Environment Variables

In n8n Credentials:

```
Airtable API Key: [paste from .env]
Base ID: [paste from .env]
```

### 3. Test Execution

```bash
# Trigger workflow manually in n8n UI
# OR run test script
node scripts/test-flow-b.js
```

### 4. Enable Daily Schedule

In n8n workflow:
```
Schedule Trigger - 6 AM ET → Enabled
```

### 5. Monitor Execution

```bash
# Check Airtable SUBS_STAGING for new records
# Check Airtable Audit Log for 'created' and 'classified' events
# Check n8n execution logs for errors
```

---

## Known Limitations (TRL 3)

- Sunbiz API integration uses mock/fallback (production API key required)
- Enrichment Service (localhost:3000/api/enrich) must be running
- Pagination not implemented (max 100 records/run)
- No retry logic for failed external API calls
- Email notifications on completion not implemented
- Category classification is keyword-based (not ML-powered)

---

## Future Enhancements

1. **Multi-page Pagination** - Process all matching Sunbiz records, not just first 100
2. **ML-based Classification** - Train classifier on historical sub data
3. **Relationship Mapping** - Link related subs (e.g., specialty subs to commercial subs)
4. **Capability Assessment** - Score subs by service offerings, geographic coverage, capacity
5. **Pricing Intelligence** - Estimate sub pricing based on service category
6. **Outreach Automation** - Auto-send initial outreach email to new subs
7. **Webhook Integration** - Real-time notification on new subs added
8. **Scheduled Re-qualification** - Periodically re-run classification on stale subs

---

## Troubleshooting

### No records in SUBS_STAGING after run

**Check:**
1. Sunbiz API returned no results (check Airtable Audit Log)
2. All records were filtered out (check dedup logic)
3. All records were opt_out=true (check existing SUBS_STAGING records)

**Fix:**
- Verify `date_formed < 180 days` condition
- Check Sunbiz API connectivity
- Review test data in `migration/sunbiz-test-subs.json`

### Classification incorrect

**Check:**
1. Legal name doesn't contain expected keywords
2. DBA is null or blank

**Fix:**
- Manually update classification in Airtable (override allowed)
- Review and update keyword logic in "Classify Sub Category" node

### Airtable API errors

**Check:**
1. Airtable API key is valid
2. Base ID is correct
3. SUBS_STAGING table exists
4. Required fields are present

**Fix:**
```bash
node airtable/validate-schemas.js
```

---

## Success Metrics

Track these KPIs to measure Flow B effectiveness:

1. **Discovery Rate**
   - New subs added per week
   - Coverage of NAICS=561720 market

2. **Quality Metrics**
   - % correctly classified (manual review)
   - % with valid contact info
   - % with complete information

3. **Pipeline Metrics**
   - % progressed from 'New' → 'Contacted'
   - % progressed to 'Qualified' → 'Active'
   - Partnership conversion rate

4. **Operational Metrics**
   - Workflow execution time
   - Error rate
   - Dedup effectiveness (% prevented duplicates)

---

**Status:** Ready for n8n import + testing  
**Version:** 1.0 - Initial Release  
**TRL:** 3 - Proof of Concept  
**Test Date:** 2026-05-25  
**Test Result:** PASS (5/5 records classified correctly)
