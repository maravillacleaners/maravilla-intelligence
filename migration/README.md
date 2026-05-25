# Flow 0 - CSV Migration & Lead Scoring

This directory contains the CSV migration flow that imports existing leads into the Maravilla Intelligence system.

## Files

- **existing-leads.csv** - Test CSV with 5 sample records (legal_name, business_email, phone, website, county, employees_estimate)
- **README.md** - This file

## CSV Format

The CSV must have the following headers (minimum required):

```csv
legal_name,business_email,phone,website,county,employees_estimate
```

### Field Descriptions

- **legal_name** (required) - Official company name
- **business_email** (optional) - Primary business email. If missing, enrichment will attempt to infer from website domain
- **phone** (optional) - Business phone number (format: (XXX) XXX-XXXX)
- **website** (optional) - Company website URL (format: https://example.com)
- **county** (required) - Florida county name (e.g., Miami-Dade, Broward, Orange)
- **employees_estimate** (required) - Estimated number of employees (numeric)

## Supported Florida Counties

- Miami-Dade
- Broward
- Palm Beach
- Orange
- Hillsborough
- Pinellas
- Duval
- Seminole

## Migration Process

Flow 0 (n8n workflow) executes:

1. **Read CSV** - Imports records from migration/existing-leads.csv
2. **Parse CSV Rows** - Converts CSV to prospect objects
3. **Enrich Prospect Data** - Fills missing email/phone/website using domain inference and public sources
4. **Score via Claude API** - Calls Claude to evaluate ICP fit and intent signals
5. **Prepare Airtable Record** - Combines enrichment + scoring results
6. **Save to Airtable Prospects** - Creates prospect records with:
   - pipeline_status = 'pending_review'
   - score = 1-100 (from Claude)
   - service_fit, segment, priority, intent_signal
7. **Log Audit Events** - Creates two audit log entries per record:
   - "created" event (import source)
   - "scored" event (score details)

## Testing Locally

To test the migration flow locally:

```bash
# Install dependencies (includes @anthropic-ai/sdk)
npm install

# Set up environment variables in .env
# CLAUDE_API_KEY=sk-ant-...
# AIRTABLE_API_KEY=pat...
# AIRTABLE_BASE_ID=app...

# Run test script
node scripts/test-flow-0.js
```

## Expected Output

Each record imported will:
- Appear in Airtable CLIENTS base → Prospects table
- Have pipeline_status = 'pending_review'
- Have score field populated (1-100)
- Have service_fit, segment, priority, intent_signal fields
- Have icebreaker field (personalized outreach opening)
- Appear in Audit Log with "created" + "scored" events

## Example CSV

```csv
legal_name,business_email,phone,website,county,employees_estimate
Tech Startup LLC,info@tech.com,(305) 555-1234,https://tech.com,Miami-Dade,50
Medical Clinic,admin@clinic.com,(954) 555-5678,https://clinic.com,Broward,25
Retail Plaza,,(407) 555-9999,https://plaza.com,Orange,15
Office Complex,contact@office.com,(850) 555-1111,,Duval,100
Property Management LLC,,,https://propman.com,Hillsborough,20
```

## Scoring Details

Claude evaluates each prospect on:

- **Service Fit** - How well they match janitorial/cleaning services (high/medium/low)
- **Ticket Estimate** - Expected project value (e.g., $2,000-$5,000)
- **Segment** - ICP segment classification (Property Manager, Clinic/Medical, Office Complex, Government/GovCon, Newly Formed, Other)
- **Priority** - Sales priority level (1=highest, 5=lowest)
- **Intent Signal** - Likelihood they need services now (high/medium/low)
- **Icebreaker** - Personalized opening line for outreach
- **Score** - Overall fit score (1-100)

## Enrichment Strategy

When fields are missing:

1. **Email** - Inferred from website domain (info@example.com, hello@example.com, contact@example.com)
2. **Phone** - Marked for manual research (not auto-filled in current version)
3. **Website** - Marked for manual research (not auto-filled in current version)

Enriched records are marked with `enriched=true` and `enriched_at` timestamp.

## Next Steps

After migration:

1. Review pending_review records in Airtable
2. Verify scoring accuracy and ICP fit
3. Use icebreaker text for outreach personalization
4. Transition high-priority (priority=1-2) records to outreach workflows
5. Manually research and fill missing data for enriched=false records
