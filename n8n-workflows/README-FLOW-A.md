# Flow A - Client Discovery (Sunbiz Query)

**Status:** DELIVERED v1.0  
**Trigger:** Daily @ 6:00 AM ET  
**Language:** n8n JSON Workflow  
**Test Status:** PASS (4/4 valid records, 1 routed to Flow B)

---

## Overview

Flow A discovers new commercial clients from Florida SunBiz API, applies intelligent routing (NAICS check), enriches company data, scores prospects via Claude API, and saves to Airtable with `pipeline_status='pending_review'`.

### Key Features

- **Daily Schedule Trigger** 6 AM ET
- **Sunbiz Query** New FL companies < 90 days old
- **Branch Logic** NAICS check: 561720 → Flow B (suppliers), else → Flow A (clients)
- **SAM Check** Federal registration (government ready)
- **Dedup Check** Skip existing or opted-out prospects
- **Contact Enrichment** Email, phone, website resolution
- **Claude Scoring** Priority 1-5, segment, intent signal, icebreaker
- **Audit Logging** "Created" + "Scored" events

---

## Workflow Architecture

```
Schedule Trigger (6 AM ET)
  ↓
Initialize Query Parameters (date < 90 days)
  ↓
Query Sunbiz API
  ↓
Parse Sunbiz Records → Extract company data
  ↓
Branch - Check NAICS
  ├─ NAICS = 561720 → Log to Audit → (Flow B path)
  └─ NAICS ≠ 561720 → Continue (Flow A path)
      ↓
      SAM Check - Federal Registration
      ↓
      Enrich - Add SAM Data
      ↓
      Dedup Check - Airtable (legal_name + sunbiz_record_id)
      ↓
      Filter - Skip if already exists OR opted_out
      ↓
      Enrich Prospect - Contact Details (email, phone, website)
      ↓
      Score via Claude API
      ↓
      Prepare Airtable Record
      ↓
      Save to Airtable Prospects (pipeline_status='pending_review')
      ↓
      Log Created Event
      ├─ Log Scored Event
```

---

## Node Details

### 1. Schedule Trigger - 6 AM ET
- **Type:** Schedule Trigger
- **Config:** Daily @ 06:00 ET
- **Output:** Timestamp + run metadata

### 2. Initialize Query Parameters
- **Type:** Function (JavaScript)
- **Logic:** Calculate 90-day lookback date
- **Output:** query_date, state='FL', status='active'

### 3. Query Sunbiz API
- **Type:** HTTP Request (GET)
- **URL:** `{{ $env.SUNBIZ_API_URL }}`
- **Query Params:**
  - state=FL
  - date_formed_after={{ query_date }}
  - status=ACTIVE
  - limit=100
- **Fallback:** `https://sunbiz.example.com/api/search`
- **ContinueOnFail:** true

### 4. Parse Sunbiz Records
- **Type:** Function (JavaScript)
- **Logic:** Map API results to prospect schema
- **Output:** Array of normalized records (legal_name, naics, county, etc.)

### 5. Branch - Check NAICS
- **Type:** Function (JavaScript)
- **Logic:**
  ```javascript
  if (naics === '561720') {
    // Primary NAICS (Janitorial) → Flow B
    return { route: 'flow_b_skip', skip: true }
  } else {
    // Other industry → Flow A
    return { route: 'flow_a_continue', skip: false }
  }
  ```
- **Output:** Records with `skip=true` or `skip=false`

### 6. Filter - Continue Only
- **Type:** Filter Node
- **Condition:** skip = false
- **Purpose:** Split: Flow A (continue) vs Flow B (skip)

### 7. SAM Check - Federal Registration
- **Type:** HTTP Request (GET)
- **URL:** `https://api.sam.gov/prod/opendata`
- **Params:** api_key, q=legal_name, format=json
- **Fallback:** Env var `SAM_API_KEY`
- **Output:** has_sam_registration, sam_uei, sam_cage
- **ContinueOnFail:** true

### 8. Enrich - Add SAM Data
- **Type:** Function (JavaScript)
- **Logic:** Merge SAM registration data
- **Output:** Record with has_sam_registration, government_ready flag

### 9. Dedup Check - Airtable
- **Type:** HTTP Request (GET)
- **Query:** Filter by legal_name or sunbiz_record_id
- **Purpose:** Find if record already exists
- **Output:** Airtable records (if found)

### 10. Check - Already Exists or Opted Out
- **Type:** Function (JavaScript)
- **Logic:**
  ```javascript
  const alreadyExists = records.length > 0;
  const isOptedOut = alreadyExists && records[0].fields.opt_out === true;
  return { should_skip: alreadyExists || isOptedOut }
  ```

### 11. Filter - Skip Duplicates and Opted Out
- **Type:** Filter Node
- **Condition:** should_skip = false
- **Purpose:** Only process new, non-opted-out prospects

### 12. Enrich Prospect - Contact Details
- **Type:** HTTP Request (POST)
- **URL:** `{{ $env.ENRICHMENT_SERVICE_URL }}` (default: localhost:3000/api/enrich)
- **Body:** Full prospect record
- **Returns:** business_email, phone, website, linkedin, sqft_estimate, employees_estimate
- **ContinueOnFail:** true

### 13. Score via Claude API
- **Type:** HTTP Request (POST)
- **URL:** `{{ $env.SCORING_SERVICE_URL }}` (default: localhost:3000/api/score)
- **Body:** Enriched prospect record
- **Returns:** score (0-100), segment, priority (1-5), intent_signal, icebreaker
- **ContinueOnFail:** true

### 14. Prepare Airtable Record
- **Type:** Function (JavaScript)
- **Logic:** Combine enriched + scored data, set pipeline_status='pending_review'
- **Output:** Complete Airtable record object

### 15. Save to Airtable Prospects
- **Type:** HTTP Request (POST)
- **URL:** `https://api.airtable.com/v0/{{ $env.AIRTABLE_BASE_ID }}/Prospects`
- **Auth:** Airtable API
- **Body:** All prospect fields
- **Output:** Airtable record ID

### 16. Log Created Event
- **Type:** HTTP Request (POST)
- **URL:** `https://api.airtable.com/v0/{{ AIRTABLE_BASE_ID }}/Audit%20Log`
- **Fields:**
  - event_type = 'created'
  - source = 'Flow A - Sunbiz Discovery'
  - notes = "New prospect created: {legal_name} (Score: {score}, Segment: {segment})"
- **ContinueOnFail:** true

### 17. Log Scored Event
- **Type:** HTTP Request (POST)
- **URL:** Same as Log Created Event
- **Fields:**
  - event_type = 'scored'
  - source = 'Flow A - Claude Scoring'
  - notes = "Prospect scored: {legal_name} (Score: {score}/100, Priority: {priority})"

### 18. Filter - Route to Flow B
- **Type:** Filter Node
- **Condition:** skip = true
- **Purpose:** Capture records with NAICS=561720 for Flow B

### 19. Log Routed to Flow B
- **Type:** HTTP Request (POST)
- **Fields:**
  - event_type = 'routed'
  - source = 'Flow A - Branch Check'
  - notes = "Primary NAICS detected, routed to Flow B: {legal_name}"

---

## Required Environment Variables

```bash
# Airtable
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXXXXXXXX
AIRTABLE_API_KEY=pat_XXXXXXXXXXXXXXX

# Sunbiz API (optional, has fallback)
SUNBIZ_API_URL=https://sunbiz.example.com/api/search

# SAM.gov API (optional)
SAM_API_KEY=your-sam-api-key

# Enrichment Service (local service)
ENRICHMENT_SERVICE_URL=http://localhost:3000/api/enrich

# Scoring Service (local service)
SCORING_SERVICE_URL=http://localhost:3000/api/score
```

---

## Airtable Record Schema

All records saved with these fields:

| Field | Type | Value | Notes |
|-------|------|-------|-------|
| legal_name | Text | Company name | From Sunbiz |
| dba | Text | DBA name | If exists |
| sunbiz_status | Text | ACTIVE | From Sunbiz |
| date_formed | Date | YYYY-MM-DD | From Sunbiz |
| naics | Text | 6-digit code | From Sunbiz |
| officer_name | Text | Principal officer | From Sunbiz |
| registered_address | Text | Address | From Sunbiz |
| physical_address | Text | Address | From Sunbiz |
| county | Text | FL county | From Sunbiz |
| zip | Text | 5-digit | From Sunbiz |
| business_email | Email | Resolved | Via enrichment |
| phone | Phone | (XXX) XXX-XXXX | Via enrichment |
| website | URL | https://... | Via enrichment |
| has_physical_office | Checkbox | true/false | Inferred |
| sqft_estimate | Number | Estimated | Via enrichment |
| employees_estimate | Number | Estimated | Via enrichment |
| has_sam_registration | Checkbox | true/false | SAM check |
| score | Number | 0-100 | Claude API |
| segment | Select | Property Manager / Clinic/Medical / Office Complex / Government/GovCon / Newly Formed | Claude API |
| priority | Select | P1 / P2 / P3 / P4 / P5 | Claude API (1=highest) |
| service_fit | Text | high_potential / medium / low | Claude API |
| intent_signal | Text | high / medium / low | Claude API |
| icebreaker | Text | Personalized opener | Claude API |
| pipeline_status | Select | pending_review | Always set on creation |
| source | Select | Sunbiz | Always set on creation |

---

## Test Results

### Test Data
- **Test Records:** 5 mock Sunbiz companies
- **Test File:** `migration/sunbiz-test-records.json`

### Test Output

```
Total records processed: 5
Routed to Flow B (561720): 1  ← Cleaning Elite Services LLC
Saved to Airtable pending_review: 4
All Airtable fields valid: YES

Test Status: PASS
```

### Test Records Breakdown

| # | Company | NAICS | Action | Score | Priority | Segment |
|---|---------|-------|--------|-------|----------|---------|
| 1 | ABC Property Management | 531210 | Flow A | 95 | P2 | Property Manager |
| 2 | Sunshine Medical Clinic | 621498 | Flow A | 61 | P4 | Clinic/Medical |
| 3 | Office Plus Holdings | 531120 | Flow A | 92 | P1 | Office Complex |
| 4 | Federal Maintenance | 927340 | Flow A | 66 | P3 | Government/GovCon |
| 5 | Cleaning Elite Services | 561720 | Flow B | — | — | (Routed, not scored) |

---

## How to Deploy

1. **Export Workflow**
   ```bash
   cp n8n-workflows/flow-a-clients.json <your-n8n-instance>/workflows/
   ```

2. **Configure n8n**
   - Import the JSON into n8n UI
   - Set Airtable credentials
   - Test webhook connectivity

3. **Schedule**
   - Enable daily trigger for 6 AM ET
   - Monitor execution logs

4. **Verify**
   - Check Airtable "Prospects" table for new records
   - Check "Audit Log" table for created/scored events
   - Monitor n8n execution history

---

## Error Handling

- **Sunbiz API fails:** Continues without error, no records returned
- **SAM check fails:** Sets has_sam_registration=false, continues
- **Enrichment fails:** Uses fallback data, continues
- **Claude scoring fails:** Uses default scores, continues
- **Airtable save fails:** STOPS workflow, logs error
- **Audit logging fails:** ContinueOnFail=true, doesn't block

---

## Next Steps

- Integrate with Flow B (Supplier Discovery) once implemented
- Add retry logic for external API calls
- Implement pagination for Sunbiz query (>100 records)
- Add email notification on completion
- Dashboard integration: Show pending_review count

---

**Delivered:** 2026-05-25  
**Version:** 1.0 - Initial Release
