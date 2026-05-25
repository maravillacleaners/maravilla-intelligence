# Flow E Manual Testing Checklist

Quick reference for testing Flow E re-engagement workflow.

## Pre-Test Checklist
- [ ] n8n instance running
- [ ] Airtable credentials configured
- [ ] Scoring service running (localhost:3000 or configured)
- [ ] At least 1 prospect in Airtable CLIENTS table

---

## Test Execution

### Phase 1: Create Test Data (2 minutes)

**Action:** Create a new test prospect in Airtable

```
Table: CLIENTS
Record: Test Corp (New)

Fields to set:
  legal_name:           "Test Corp"
  email:                "test@example.com"
  physical_address:     "100 Old Ave, Tampa, FL"
  website:              (leave empty)
  officer_name:         "John Smith"
  num_sites:            1
  last_field_snapshot:  '{"physical_address":"100 Old Ave, Tampa, FL","website":"","officer_name":"John Smith","num_sites":1}'
  pipeline_status:      "pending_review"
  re_engagement_candidate: false
  icebreaker:           (current/old value)
```

**✓ DONE:** Record created with baseline values

---

### Phase 2: Change Fields (1 minute)

**Action:** Edit the Test Corp record and modify tracked fields

```
In Airtable, edit Test Corp record:
  physical_address:     "100 Old Ave, Tampa, FL" → "200 New St, Miami, FL" ✓
  num_sites:            1 → 3 ✓
  
DO NOT CHANGE:
  last_field_snapshot   (Flow E will update this)
  re_engagement_candidate (Flow E will set to true)
  icebreaker            (Flow E will regenerate)
```

**✓ DONE:** 2 field changes made (physical_address, num_sites)

---

### Phase 3: Run Flow E (5 minutes)

**Action:** Execute Flow E workflow in n8n

```
In n8n UI:
  1. Open "Flow E - Re-Engagement" workflow
  2. Click "Execute Workflow" button
  3. Watch nodes execute in order:
     - Schedule Trigger - 7 AM ET
     - Initialize Flow State
     - Fetch All Prospects           ← should return ~500 records
     - Parse Prospects & Detect Changes
     - Filter - Has Field Changes    ← should pass Test Corp
     - Call Claude for Fresh Icebreaker
     - Extract New Icebreaker
     - Update Prospect - Set Re-Engagement  ← PATCH request
     - Create Audit Log - Re-Engagement    ← POST to audit table
     - Return Flow Result
```

**Expected Output:**
```json
{
  "status": "completed",
  "legal_name": "Test Corp",
  "email": "test@example.com",
  "field_changes": {
    "physical_address": { "old_value": "100 Old Ave, Tampa, FL", "new_value": "200 New St, Miami, FL" },
    "num_sites": { "old_value": "1", "new_value": "3" }
  },
  "new_icebreaker_generated": true,
  "pipeline_status_updated": "pending_review",
  "re_engagement_candidate_set": true,
  "audit_logged": true,
  "timestamp": "2026-05-25T12:34:56Z"
}
```

**✓ DONE:** Workflow executed successfully

---

### Phase 4: Verify Airtable Updates (3 minutes)

**Action:** Check Test Corp record for correct updates

```
In Airtable, view Test Corp record:

VERIFY THESE FIELDS:
  
  ✓ icebreaker          
    Expected: Something like "I noticed you've moved to Miami and expanded to 3 locations..."
    Actual: [CHECK THE VALUE]
    
  ✓ re_engagement_candidate
    Expected: true
    Actual: [CHECK THE VALUE]
    
  ✓ pipeline_status
    Expected: "pending_review"
    Actual: [CHECK THE VALUE]
    
  ✓ last_field_snapshot
    Expected: '{"physical_address":"200 New St, Miami, FL","website":"","officer_name":"John Smith","num_sites":3}'
    Actual: [CHECK THE VALUE]
    
  ✓ last_reengagement_date
    Expected: Today's date (e.g., 2026-05-25)
    Actual: [CHECK THE VALUE]
    
  ✓ intent_signal
    Expected: "high" or "medium" (from Claude)
    Actual: [CHECK THE VALUE]
```

**Status:** 
- [ ] All fields updated correctly
- [ ] Icebreaker is contextual to the changes

**✓ DONE:** Airtable record verified

---

### Phase 5: Verify Audit Log (2 minutes)

**Action:** Check Audit Log table for re_engaged event

```
In Airtable, view Audit Log table:

LOOK FOR:
  event_type:    "re_engaged"
  legal_name:    "Test Corp"
  email:         "test@example.com"
  source:        "Flow E - Field Change Detection"
  details:       "Field change detected: physical_address, num_sites. New icebreaker: ..."
  timestamp:     Today's date/time (should match flow execution)

VERIFY:
  [ ] Event exists
  [ ] Fields are correct
  [ ] Details mention the changed fields
  [ ] Timestamp matches Flow E execution
```

**Status:**
- [ ] Audit log entry created
- [ ] Details include field changes + icebreaker

**✓ DONE:** Audit log verified

---

### Phase 6: Test No-Change Scenario (2 minutes)

**Action:** Run Flow E again without changing fields

```
In n8n UI:
  1. Open "Flow E - Re-Engagement" workflow
  2. Execute Workflow
  3. Watch nodes:
     - Fetch All Prospects
     - Parse Prospects & Detect Changes
     - Filter - Has Field Changes     ← Test Corp should NOT pass this filter
     - No Changes - End Flow         ← Should execute this path instead
```

**Expected Output:**
```json
{
  "message": "No field changes detected",
  "total_prospects_checked": 500,
  "timestamp": "2026-05-25T12:45:00Z",
  "status": "completed_no_changes"
}
```

**Verify in Airtable:**
  [ ] Test Corp record NOT updated again
  [ ] No new audit log entry
  [ ] Previous icebreaker still in place

**✓ DONE:** No-change scenario verified

---

### Phase 7: Test Field Removal (3 minutes)

**Action:** Clear a field and verify detection

```
In Airtable, edit Test Corp:
  website:  (leave empty) → stays empty
  (No change expected)

Then change:
  website:  (empty) → "https://testcorp.com"
  
Execute Flow E again
```

**Expected:**
  [ ] Change detected (website field populated)
  [ ] New icebreaker: mentions website launch
  [ ] Updated in Airtable

Then test removal:
```
In Airtable, edit Test Corp:
  website:  "https://testcorp.com" → (clear/delete)
  
Execute Flow E again
```

**Expected:**
  [ ] Change detected (website cleared)
  [ ] New icebreaker: mentions website no longer active
  [ ] Updated in Airtable

**✓ DONE:** Field removal scenario verified

---

## Final Verification

Check all completed:
- [ ] Phase 1: Test data created
- [ ] Phase 2: Fields changed
- [ ] Phase 3: Flow E executed
- [ ] Phase 4: Airtable updated (icebreaker, flags)
- [ ] Phase 5: Audit log created
- [ ] Phase 6: No-change scenario works
- [ ] Phase 7: Field removal detected

---

## Known Issues & Workarounds

### Issue 1: Claude API returns no icebreaker
**Symptoms:** icebreaker field empty after run
**Workaround:** Check if SCORING_SERVICE_URL is correct; uses fallback "I noticed some updates to your profile - let's reconnect!"

### Issue 2: Airtable API 404 error
**Symptoms:** "Update Prospect - Set Re-Engagement" fails
**Workaround:** Verify AIRTABLE_BASE_ID and field names exist in CLIENTS table

### Issue 3: Filter node passes all records
**Symptoms:** All prospects updated even without changes
**Workaround:** Check Parse Prospects function returns `has_changes: false` for unchanged records

### Issue 4: Audit log not created
**Symptoms:** Airtable update succeeds but no audit entry
**Workaround:** ContinueOnFail is true; check Audit Log table permissions or field schema

---

## Success Criteria

✓ Flow E PASS when:
1. Field changes detected in tracked fields (physical_address, website, officer_name, num_sites)
2. Fresh icebreaker generated via Claude API
3. `re_engagement_candidate` set to true
4. `pipeline_status` set to "pending_review"
5. `last_field_snapshot` updated with current values
6. Audit log entry created with event_type="re_engaged"
7. No changes → Flow ends gracefully without updates
8. All nodes execute without critical errors

---

**Test Completed:** [Date/Time]  
**Tester:** [Name]  
**Status:** [ ] PASS [ ] FAIL [ ] PARTIAL

**Notes:**
[Space for notes]

---

**Flow E v1.0 Testing Guide**  
Last updated: 2026-05-25
