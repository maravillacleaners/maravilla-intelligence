# Flow 0 - CSV Migration & Lead Scoring

**Status:** COMPLETE - Ready for testing
**Date Created:** 2026-05-25
**Task:** TASK 4 of 12

## Overview

Flow 0 is the entry point for migrating existing leads into the Maravilla Intelligence system. It orchestrates:

1. CSV import from migration/existing-leads.csv
2. Enrichment of missing contact information
3. Scoring via Claude API (ICP fit evaluation)
4. Storage in Airtable with pending_review status
5. Audit logging of all operations

## Created Files

### Library Files

#### lib/enrichment.js (NEW)
- **EnrichmentClient** class
- Enriches prospect records with missing contact data
- Strategies:
  - Email: Inferred from website domain
  - Phone: Marked for manual research (placeholder for API integration)
  - Website: Marked for manual research (placeholder for API integration)
- Methods:
  - `enrich(prospect)` - Single prospect enrichment
  - `enrichBatch(prospects)` - Batch enrichment
  - `extractDomain(url)` - Domain extraction helper
  - `findEmail(name, website)` - Email inference
  - `findPhone(name, website)` - Phone lookup (placeholder)
  - `findWebsite(name)` - Website lookup (placeholder)

#### lib/scoring.js (NEW)
- **ScoringEngine** class
- Uses Claude API to score prospects
- Prompt: CLIENT_SCORING_PROMPT (comprehensive sales consultant prompt)
- Returns JSON with:
  - `score` (1-100) - Overall fit
  - `service_fit` (high/medium/low) - Cleaning service fit
  - `ticket_estimate` ($X,XXX-$X,XXX) - Expected project value
  - `segment` - ICP segment (Property Manager, Clinic/Medical, Office Complex, Government/GovCon, Newly Formed, Other)
  - `priority` (1-5) - Sales priority (1=highest)
  - `intent_signal` (high/medium/low) - Need likelihood
  - `intent_explanation` - Reason for intent assessment
  - `icebreaker` - Personalized outreach opening
  - `reasoning` - Scoring rationale
- Methods:
  - `scoreProspect(prospect)` - Single prospect scoring
  - `scoreBatch(prospects)` - Batch scoring with error handling

### Migration Files

#### migration/existing-leads.csv (NEW)
Test CSV with 5 sample records:
```
legal_name,business_email,phone,website,county,employees_estimate
Tech Startup LLC,info@tech.com,(305) 555-1234,https://tech.com,Miami-Dade,50
Medical Clinic,admin@clinic.com,(954) 555-5678,https://clinic.com,Broward,25
Retail Plaza,,(407) 555-9999,https://plaza.com,Orange,15
Office Complex,contact@office.com,(850) 555-1111,,Duval,100
Property Management LLC,,,https://propman.com,Hillsborough,20
```

Includes:
- 3 records with complete data
- 1 record missing email (Retail Plaza)
- 1 record missing website (Office Complex)
- 1 record missing email AND website (Property Management LLC)

Tests enrichment pipeline for various missing data scenarios.

#### migration/README.md (NEW)
Comprehensive guide for CSV migration:
- Format specifications
- Supported Florida counties
- Migration process steps
- Testing instructions
- Expected output format
- Scoring details
- Enrichment strategy

### Workflow Files

#### n8n-workflows/flow-0-migration.json (NEW)
Complete n8n workflow orchestrating the migration:

**Nodes (11 total):**
1. Manual Trigger - Entry point (can be scheduled later)
2. Read CSV File - Loads migration/existing-leads.csv
3. Parse CSV Rows - Converts to prospect objects
4. Enrich Prospect Data - HTTP POST to enrichment service
5. Score via Claude API - HTTP POST to scoring service
6. Prepare Airtable Record - Combines enrichment + scoring
7. Save to Airtable Prospects - Creates prospect record
8. Log Created Event - Audit log entry (source: CSV Migration)
9. Log Scored Event - Audit log entry (score details)
10. Return Success Response - Webhook response

**Key Features:**
- Manual trigger (not scheduled) for controlled testing
- Parallel enrichment + scoring paths
- Error handling with continueOnFail
- Two audit log entries per record (created + scored)
- pipeline_status = 'pending_review' on all imports
- Supports environment variables for service URLs

**Field Mapping:**
```json
{
  "legal_name": "string",
  "business_email": "string",
  "phone": "string",
  "website": "string",
  "county": "string",
  "employees_estimate": "number",
  "score": "1-100",
  "service_fit": "high|medium|low",
  "segment": "string",
  "priority": "1-5",
  "intent_signal": "high|medium|low",
  "icebreaker": "string",
  "pipeline_status": "pending_review",
  "source": "CSV Migration",
  "created_at": "ISO timestamp",
  "scored_at": "ISO timestamp"
}
```

### Test Files

#### scripts/test-flow-0.js (NEW)
Local Node.js test script for Flow 0:
- Parses CSV directly
- Runs enrichment batch
- Runs scoring batch
- Saves to Airtable
- Creates audit log entries
- Provides detailed summary output

**Usage:**
```bash
npm install
node scripts/test-flow-0.js
```

**Output:**
- Step-by-step progress
- Record count at each stage
- Individual record scores
- Summary statistics
- Success/failure indication

### Modified Files

#### package.json (UPDATED)
Added dependency:
```json
"@anthropic-ai/sdk": "^0.24.0"
```

## Testing Checklist

### Pre-Test Setup
- [ ] Environment variables configured (.env file):
  - CLAUDE_API_KEY=sk-ant-...
  - AIRTABLE_API_KEY=pat...
  - AIRTABLE_BASE_ID=app...
  - NODE_ENV=development
- [ ] npm install executed
- [ ] Airtable base created with schema (TASK 2 prerequisite)

### Test Execution
- [ ] Run test script: `node scripts/test-flow-0.js`
- [ ] Verify 5 records imported from CSV
- [ ] Confirm all records have score 1-100
- [ ] Check pipeline_status = 'pending_review' on all records
- [ ] Verify Airtable Prospects table has 5 new records
- [ ] Verify Airtable Audit Log has 10 new entries (2 per record)

### Validation

**Expected in Airtable:**
- **Prospects table:** 5 records
  - All fields populated (legal_name, phone, website, county, etc.)
  - All have score field (numeric 1-100)
  - All have service_fit, segment, priority, intent_signal
  - All have icebreaker text
  - All have pipeline_status = 'pending_review'
  - source = 'CSV Migration' for all

- **Audit Log table:** 10 entries
  - Event types: 5x 'created', 5x 'scored'
  - All linked to prospect_id
  - Timestamps in ISO format
  - Details field populated with context

### Scoring Expectations

Based on ICP configuration:
- **Tech Startup LLC** - Medium fit (priority 5, newly formed signal)
- **Medical Clinic** - High fit (priority 2, medical segment)
- **Retail Plaza** - Low fit (retail not in ICP)
- **Office Complex** - High fit (priority 3, 100+ employees)
- **Property Management LLC** - Highest fit (priority 1, property management)

## ICP Configuration

Scoring uses config.js ICP_SEGMENTS:
1. Property Manager (fit: 0.95, priority: 1)
2. Clinic/Medical (fit: 0.90, priority: 2)
3. Office Complex (fit: 0.88, priority: 3)
4. Government/GovCon (fit: 0.85, priority: 4)
5. Newly Formed (fit: 0.80, priority: 5)

## Integration Points

### With Airtable Schema (TASK 2)
- Writes to: Prospects table
- Writes to: Audit Log table
- Uses: Custom fields (score, service_fit, segment, priority, intent_signal, icebreaker, pipeline_status)

### With Config (TASK 1)
- Reads: config.js ICP_SEGMENTS
- Reads: FLORIDA_COUNTIES
- Reads: LEAD_SCORING thresholds

### With Compliance (TASK 3 dependency)
- Audit logging uses same pattern as opt-out compliance
- Future flows will check opt-out status before outreach

## Next Steps

### Immediate (after testing)
1. Verify 5 records appear in Airtable with scores
2. Review score quality and accuracy
3. Validate icebreaker text for personalization
4. Check for any enrichment failures or edge cases

### Short-term
1. Migrate real prospect data from legacy systems
2. Integrate enrichment APIs (phone/website lookups)
3. Add manual data review step before outreach transition
4. Create Flow 1 (Outreach) that consumes pending_review records

### Medium-term
1. Schedule Flow 0 for daily/weekly execution
2. Add duplicate detection (email/phone)
3. Integration with other discovery flows (A, B, C)
4. Transition to fully automated pipeline

## Architecture Notes

**Data Flow:**
```
CSV → Enrichment → Scoring → Airtable → Audit Log
       ↓            ↓              ↓
  Domain inference Claude API  pending_review
  Email/phone    ICP fit        pipeline status
  Website        Intent signal
```

**Error Handling:**
- Enrichment failures mark record as enriched=false
- Scoring failures logged but don't block Airtable save
- continueOnFail in n8n allows partial success processing
- All errors captured in Audit Log details field

**Performance:**
- Batch enrichment: instant (domain inference)
- Batch scoring: ~1-2 sec per record (Claude API latency)
- 5 records: ~10-15 seconds total end-to-end
- Airtable writes: parallel where possible

## File Locations

```
C:\Users\Rosan\maravilla-intelligence\
├── lib/
│   ├── enrichment.js              (NEW)
│   ├── scoring.js                 (NEW)
│   └── compliance.js              (existing)
├── migration/
│   ├── existing-leads.csv         (NEW)
│   └── README.md                  (NEW)
├── n8n-workflows/
│   ├── flow-0-migration.json      (NEW)
│   └── flow-d-optout.json         (existing)
├── scripts/
│   ├── test-flow-0.js             (NEW)
│   └── [other scripts]            (existing)
├── docs/
│   ├── FLOW-0-MIGRATION.md        (NEW - this file)
│   └── [other docs]               (existing)
├── config/
│   └── config.js                  (existing)
└── package.json                   (UPDATED - added @anthropic-ai/sdk)
```

## Completion Status

- [x] lib/enrichment.js - Created with full implementation
- [x] lib/scoring.js - Created with Claude API integration
- [x] migration/existing-leads.csv - Created with 5 test records
- [x] n8n-workflows/flow-0-migration.json - Created complete workflow
- [x] scripts/test-flow-0.js - Created test harness
- [x] migration/README.md - Created with comprehensive guide
- [x] docs/FLOW-0-MIGRATION.md - Created (this file)
- [x] package.json - Updated with Anthropic SDK dependency

**Ready for Testing:** YES
**Blocked by:** TASK 2 (Airtable schema) must be complete
**Blocks:** TASK 5+ (require populated Airtable data)
