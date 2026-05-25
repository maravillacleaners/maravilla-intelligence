# Flow E - Re-Engagement (Field Change Detection)

**Status:** DELIVERED v1.0  
**Trigger:** Daily @ 7:00 AM ET (after Flow A)  
**Language:** n8n JSON Workflow  
**Purpose:** Detect field changes on existing prospects, generate fresh icebreaker, mark for re-engagement

---

## Overview

Flow E automatically detects when key fields change on existing prospects in the CLIENTS table, generates a fresh icebreaker via Claude API using the change as a hook, and marks the prospect for re-engagement review. This enables intelligent follow-up based on prospect activity changes.

### Key Features

- **Daily Schedule Trigger** 7 AM ET (1 hour after Flow A)
- **Field Change Detection** Compares current values against `last_field_snapshot`
- **Tracked Fields:** `physical_address`, `website`, `officer_name`, `num_sites`
- **Smart Icebreaker Generation** Claude API generates contextual opener based on detected change
- **Re-Engagement Marking** Sets `re_engagement_candidate=true`, `pipeline_status='pending_review'`
- **Field Snapshot Update** Stores current field values for next run's comparison
- **Audit Logging** Records "re_engaged" event with change details

---

## Workflow Architecture

```
Schedule Trigger (7 AM ET)
  ↓
Initialize Flow State (metadata)
  ↓
Fetch All Prospects (from Airtable)
  ↓
Parse & Compare with Snapshot
  ├─ Detect changes in tracked fields
  └─ Filter records with changes
      ↓
      Filter - Has Changes
      ├─ YES: Call Claude for Fresh Icebreaker
      │   ↓
      │   Extract New Icebreaker
      │   ↓
      │   Update Prospect (re_engagement_candidate=true, pending_review)
      │   ↓
      │   Log Audit Event (re_engaged)
      │   ↓
      │   Return Flow Result
      │
      └─ NO: No Changes - End Flow
```

---

## Node Details

### 1. Schedule Trigger - 7 AM ET
- **Type:** Schedule Trigger
- **Config:** Daily @ 07:00 ET
- **Purpose:** Runs 1 hour after Flow A completes
- **Output:** Timestamp + run metadata

### 2. Initialize Flow State
- **Type:** Function (JavaScript)
- **Logic:** Set up tracking variables
- **Output:** 
  ```json
  {
    "timestamp": "ISO-8601",
    "flow_name": "Flow E - Re-Engagement",
    "tracked_fields": ["physical_address", "website", "officer_name", "num_sites"],
    "changes_detected": 0,
    "prospects_processed": 0,
    "prospects_reengaged": 0
  }
  ```

### 3. Fetch All Prospects
- **Type:** HTTP Request (GET)
- **URL:** `https://api.airtable.com/v0/{{ $env.AIRTABLE_BASE_ID }}/Prospects`
- **Query Params:**
  - view = "All"
  - maxRecords = 500
  - fields = `[legal_name, email, physical_address, website, officer_name, num_sites, last_field_snapshot, pipeline_status, re_engagement_candidate, icebreaker]`
- **Output:** Array of prospect records with all tracked fields

### 4. Parse Prospects & Detect Changes
- **Type:** Function (JavaScript)
- **Logic:**
  - For each prospect, parse `last_field_snapshot` (JSON-stored previous values)
  - Compare current field values against snapshot values
  - Track which fields changed (and store old_value → new_value)
  - Filter to only records with changes
- **Output:** Array of records with `has_changes=true` and `detected_changes` object
  ```json
  {
    "record_id": "rec123...",
    "legal_name": "Example Corp",
    "email": "contact@example.com",
    "current_fields": {
      "physical_address": "123 New St",
      "website": "https://example.com",
      "officer_name": "Jane Doe",
      "num_sites": 5
    },
    "snapshot_fields": {
      "physical_address": "456 Old Ave",
      "website": "",
      "officer_name": "John Smith",
      "num_sites": 2
    },
    "detected_changes": {
      "physical_address": { "old_value": "456 Old Ave", "new_value": "123 New St" },
      "website": { "old_value": "", "new_value": "https://example.com" },
      "num_sites": { "old_value": "2", "new_value": "5" }
    },
    "has_changes": true
  }
  ```

### 5. Filter - Has Field Changes
- **Type:** Filter Node
- **Condition:** `has_changes == true`
- **Purpose:** Split: records with changes → continue; no changes → alternate path

### 6. Call Claude for Fresh Icebreaker
- **Type:** HTTP Request (POST)
- **URL:** `{{ $env.SCORING_SERVICE_URL || 'http://localhost:3000/api/score' }}`
- **Body:** Enriched prospect + detected_changes + context="re_engagement"
  ```json
  {
    "legal_name": "Example Corp",
    "email": "contact@example.com",
    "physical_address": "123 New St",
    "website": "https://example.com",
    "officer_name": "Jane Doe",
    "num_sites": 5,
    "detected_changes": {
      "physical_address": { ... },
      "website": { ... },
      "num_sites": { ... }
    },
    "context": "re_engagement"
  }
  ```
- **Returns:** 
  ```json
  {
    "icebreaker": "I noticed you've expanded to 5 locations - congrats on the growth!",
    "intent_signal": "high",
    "segment": "Multi-location Operator",
    "score": 75
  }
  ```
- **ContinueOnFail:** true (fallback: generic icebreaker)

### 7. Extract New Icebreaker
- **Type:** Function (JavaScript)
- **Logic:** Extract Claude response, prepare payload for update
- **Output:**
  ```json
  {
    "record_id": "rec123...",
    "legal_name": "Example Corp",
    "email": "contact@example.com",
    "new_icebreaker": "I noticed you've expanded to 5 locations - congrats on the growth!",
    "intent_signal": "high",
    "reason_for_reengagement": "physical_address, website, num_sites"
  }
  ```

### 8. Update Prospect - Set Re-Engagement
- **Type:** HTTP Request (PATCH)
- **URL:** `https://api.airtable.com/v0/{{ $env.AIRTABLE_BASE_ID }}/Prospects/{{ record_id }}`
- **Body:**
  ```json
  {
    "fields": {
      "icebreaker": "[NEW ICEBREAKER]",
      "re_engagement_candidate": true,
      "pipeline_status": "pending_review",
      "last_field_snapshot": "[JSON CURRENT FIELDS]",
      "last_reengagement_date": "2026-05-25",
      "intent_signal": "high"
    }
  }
  ```
- **Result:** Prospect record updated with new icebreaker + flags

### 9. Create Audit Log - Re-Engagement
- **Type:** HTTP Request (POST)
- **URL:** `https://api.airtable.com/v0/{{ $env.AIRTABLE_BASE_ID }}/Audit%20Log`
- **Body:**
  ```json
  {
    "fields": {
      "event_type": "re_engaged",
      "legal_name": "Example Corp",
      "email": "contact@example.com",
      "source": "Flow E - Field Change Detection",
      "details": "Field change detected: physical_address, website, num_sites. New icebreaker: I noticed you've expanded to 5 locations...",
      "timestamp": "2026-05-25T12:34:56Z"
    }
  }
  ```

### 10. No Changes - End Flow
- **Type:** Function (JavaScript)
- **Logic:** Fallback path when no field changes detected
- **Output:** Status summary with prospect count

### 11. Return Flow Result
- **Type:** Function (JavaScript)
- **Logic:** Aggregate success result
- **Output:**
  ```json
  {
    "status": "completed",
    "legal_name": "Example Corp",
    "email": "contact@example.com",
    "field_changes": { ... },
    "new_icebreaker_generated": true,
    "pipeline_status_updated": "pending_review",
    "re_engagement_candidate_set": true,
    "audit_logged": true,
    "timestamp": "2026-05-25T07:15:00Z"
  }
  ```

---

## Testing Procedure

### Prerequisites
1. n8n running locally or deployed
2. Airtable credentials configured (AIRTABLE_BASE_ID, AIRTABLE_API_KEY)
3. Scoring service running on localhost:3000 (or SCORING_SERVICE_URL set)
4. At least 1 prospect record in Airtable CLIENTS table

### Test Step 1: Create/Select Test Prospect

Option A (Create new):
```bash
# In Airtable, create a new prospect record:
- legal_name: "Test Corp"
- email: "test@example.com"
- physical_address: "100 Old Ave, Tampa, FL"
- website: "(empty)"
- officer_name: "John Smith"
- num_sites: 1
- last_field_snapshot: '{"physical_address": "100 Old Ave, Tampa, FL", "website": "", "officer_name": "John Smith", "num_sites": 1}'
- pipeline_status: "pending_review"
- re_engagement_candidate: false
```

Option B (Use existing):
- Select a prospect that already has data
- Take note of current field values
- Set `last_field_snapshot` to current values first

### Test Step 2: Manually Change a Field

In Airtable Prospects table, edit the test record:
- Change `physical_address` from "100 Old Ave, Tampa, FL" to "200 New St, Miami, FL"
- Change `num_sites` from 1 to 3
- **Do NOT change** `last_field_snapshot` yet (Flow E will do this)

Expected result: 2 field changes detected

### Test Step 3: Run Flow E Manually

In n8n UI:
1. Open "Flow E - Re-Engagement" workflow
2. Click "Execute Workflow" (or manually trigger)
3. Watch execution:
   - "Fetch All Prospects" should return 500 records
   - "Parse Prospects & Detect Changes" should filter to records with changes
   - "Filter - Has Field Changes" should pass your test record
   - "Call Claude for Fresh Icebreaker" should POST to scoring service
   - "Update Prospect - Set Re-Engagement" should PATCH the record
   - "Create Audit Log - Re-Engagement" should POST audit event

### Test Step 4: Verify Results in Airtable

Check the test record in Airtable CLIENTS:
- ✅ `icebreaker` has new value (e.g., "I noticed you've expanded to 3 locations...")
- ✅ `re_engagement_candidate` = true
- ✅ `pipeline_status` = "pending_review"
- ✅ `last_field_snapshot` = JSON with updated values
- ✅ `last_reengagement_date` = today's date
- ✅ `intent_signal` = new value from Claude

Check Audit Log table:
- ✅ New record with event_type="re_engaged"
- ✅ Source="Flow E - Field Change Detection"
- ✅ Details includes detected fields and new icebreaker
- ✅ Timestamp matches execution time

### Test Step 5: Verify No Duplicate Re-engagement

Change a different field on the same record:
- Example: Change `officer_name` from "John Smith" to "Jane Doe"
- Run Flow E again

Expected: Field change detected, new icebreaker generated, audit log appended

### Test Step 6: Run Daily Trigger

Once manual testing passes:
1. Enable the Schedule Trigger (7 AM ET)
2. Wait for next scheduled run OR manually trigger at 7 AM
3. Check n8n execution history
4. Verify Airtable records updated with correct icebreakers

---

## Expected Behavior

### Scenario 1: Field Changed
```
Input:  physical_address: "100 Old Ave" → "200 New St"
Action: Call Claude with change context
Output: 
  - new_icebreaker: "I noticed you've moved to a new location - let's reconnect!"
  - re_engagement_candidate: true
  - pipeline_status: "pending_review"
  - Audit log: event_type="re_engaged"
```

### Scenario 2: Multiple Fields Changed
```
Input:  physical_address: "..." → "..."
        website: "" → "https://example.com"
        num_sites: 1 → 5
Action: Call Claude with all changes
Output:
  - new_icebreaker: "I noticed you've expanded to 5 locations and launched a new website..."
  - reason_for_reengagement: "physical_address, website, num_sites"
  - Audit log includes all changes
```

### Scenario 3: No Changes
```
Input:  All fields match last_field_snapshot
Action: Skip to "No Changes - End Flow"
Output: 
  - Logs "No field changes detected"
  - Completes without updating any prospects
  - No audit log entries
```

### Scenario 4: Field Cleared (Removed)
```
Input:  website: "https://example.com" → ""
Action: Compares "" vs "https://example.com"
Output: 
  - Detected as a change (removal)
  - Icebreaker generated: "I see your website is no longer active - let's check in..."
  - Updated in Airtable
```

---

## Required Environment Variables

```bash
# Airtable
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXXXXXXXX
AIRTABLE_API_KEY=pat_XXXXXXXXXXXXXXX

# Scoring Service (local or remote)
SCORING_SERVICE_URL=http://localhost:3000/api/score
# Fallback: http://localhost:3000/api/score if env var not set
```

---

## Airtable Schema (CLIENTS table)

New/Modified fields for Flow E:

| Field | Type | Purpose | Set By |
|-------|------|---------|--------|
| last_field_snapshot | Long Text | JSON snapshot of tracked fields | Flow E (on each run) |
| re_engagement_candidate | Checkbox | Marked true when change detected | Flow E |
| last_reengagement_date | Date | Date of last re-engagement | Flow E |

Existing fields used:

| Field | Type | Source |
|-------|------|--------|
| physical_address | Text | Flow A or manual |
| website | URL | Flow A or manual |
| officer_name | Text | Flow A or manual |
| num_sites | Number | Manual or enrichment |
| icebreaker | Long Text | Claude (Flow A or Flow E) |
| pipeline_status | Select | Flow A/B/E |
| email | Email | Flow A or enrichment |

---

## Error Handling

- **Fetch Prospects fails:** Continues without error (ContinueOnFail=true)
- **Parse/Detect Changes fails:** Returns "no changes" message
- **Claude scoring fails:** Uses generic fallback icebreaker, continues
- **Airtable update fails:** Logs error but continues to audit log
- **Audit log fails:** ContinueOnFail=true, doesn't block success

---

## Notes

1. **Scheduled after Flow A:** Flow E runs at 7 AM (1 hour after Flow A's 6 AM)
2. **Field Snapshot Strategy:** Each run updates `last_field_snapshot` with current values for next comparison
3. **Re-engagement Flag:** `re_engagement_candidate=true` signals to downstream workflows/dashboard that prospect needs follow-up
4. **Icebreaker Context:** Claude API receives `context="re_engagement"` to generate contextual openers based on changes
5. **Non-Destructive:** Flow E never deletes data; it only updates icebreaker + flags + adds audit logs
6. **Frequency:** Runs once daily; multiple changes within a day are caught on next run

---

## Next Steps

- Integrate with Flow C (Contracts) to trigger on existing contracts with changes
- Add email notification to sales team when re_engagement_candidate=true
- Build dashboard widget: "Re-Engagement Candidates" with change summary
- Add field change history tracking in Audit Log
- Extend tracked fields based on business feedback

---

**Delivered:** 2026-05-25  
**Version:** 1.0 - Initial Release  
**Test Status:** READY FOR MANUAL TESTING
