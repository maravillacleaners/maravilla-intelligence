# Flow E Deployment Guide

Quick steps to deploy Flow E re-engagement workflow to n8n.

---

## Step 1: Prepare Environment Variables

Ensure these are set in your n8n instance or `.env` file:

```bash
# Required
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXXXXXXXX
AIRTABLE_API_KEY=pat_XXXXXXXXXXXXXXX

# Scoring Service (local or remote)
SCORING_SERVICE_URL=http://localhost:3000/api/score
# OR use default: http://localhost:3000/api/score
```

---

## Step 2: Import Workflow into n8n

### Option A: Via n8n UI

1. Open n8n dashboard
2. Click "New Workflow"
3. Click menu → "Import from file"
4. Select: `flow-e-reengagement.json`
5. Click "Import"
6. Name: "Flow E - Re-Engagement (Field Change Detection)"
7. Save

### Option B: Via n8n Docker

```bash
# Copy workflow into n8n workflows directory
cp flow-e-reengagement.json /path/to/n8n/.data/workflows/

# Restart n8n container
docker restart n8n
```

### Option C: Via n8n API

```bash
curl -X POST http://localhost:5678/api/v1/workflows \
  -H "Content-Type: application/json" \
  -H "X-N8N-API-KEY: your-api-key" \
  -d @flow-e-reengagement.json
```

---

## Step 3: Configure Credentials

In n8n UI:

1. Go to Workflow → "Flow E - Re-Engagement"
2. Click "Credentials" tab
3. Add/verify "Airtable" credential:
   - Type: Airtable
   - API Key: `pat_XXXXX...`
   - Base ID: `appXXXXX...`
4. Save

---

## Step 4: Enable Schedule Trigger

1. Open "Flow E - Re-Engagement" workflow
2. Click "Schedule Trigger - 7 AM ET" node
3. Enable trigger:
   - Frequency: Every day
   - Time: 06:00 (6 AM) — NOTE: Change to 07:00 if Flow A is at 06:00
   - Timezone: America/New_York (ET)
4. Save

---

## Step 5: Test Manually

1. Click "Execute Workflow" button
2. Watch execution in real-time
3. Check nodes execute in order (refer to README-FLOW-E.md for expected output)
4. Verify Airtable updates

---

## Step 6: Deploy & Monitor

1. Click "Deploy" button (top right)
2. Schedule will activate
3. Monitor execution:
   - n8n Execution History tab
   - Check daily at ~7:05 AM for runs
   - Verify Airtable records updated

---

## Airtable Schema Setup (One-time)

Ensure CLIENTS table has these fields:

| Field Name | Type | Description |
|---|---|---|
| legal_name | Text | Company name |
| email | Email | Contact email |
| physical_address | Text | Office location |
| website | URL | Company website |
| officer_name | Text | Principal contact |
| num_sites | Number | Number of locations |
| icebreaker | Long Text | Sales opener |
| pipeline_status | Select | Status (pending_review, contacted, etc.) |
| re_engagement_candidate | Checkbox | Flag for follow-up |
| last_field_snapshot | Long Text | JSON snapshot of tracked fields |
| last_reengagement_date | Date | Date of last re-engagement |
| intent_signal | Select | high/medium/low |

---

## Airtable Audit Log Setup (One-time)

Ensure Audit Log table exists with these fields:

| Field Name | Type |
|---|---|
| event_type | Select |
| legal_name | Text |
| email | Email |
| source | Text |
| details | Long Text |
| timestamp | Date/Time |

---

## Verification Checklist

After deployment:

- [ ] Workflow imported successfully
- [ ] Credentials configured
- [ ] Schedule trigger enabled (7 AM ET)
- [ ] Manual test execution passes
- [ ] Airtable CLIENTS table updated with test record
- [ ] Audit Log table has "re_engaged" event
- [ ] No errors in n8n execution history

---

## Rollback

If issues occur:

1. **Pause workflow:** Open Flow E → Toggle schedule off
2. **Fix issue:** Update workflow or environment variables
3. **Re-enable:** Toggle schedule back on
4. **Monitor:** Check next execution

To completely remove:
1. Open Flow E workflow
2. Click menu → "Delete"
3. Confirm deletion

---

## Performance Notes

- **Fetch All Prospects:** Uses maxRecords=500; pagination may be needed for larger datasets
- **Execution time:** ~30-60 seconds (depends on number of records with changes)
- **API calls per run:** 2 (fetch) + 1 per changed record (Claude + Airtable update + audit)
- **Rate limit:** n8n default; Airtable API limit 5 req/sec

---

## Troubleshooting

### Workflow fails immediately
- Check AIRTABLE_BASE_ID and API_KEY are correct
- Verify Airtable credentials in n8n

### No records fetched
- Check view="All" exists in CLIENTS table
- Verify Airtable API key has read permission

### Claude scoring fails
- Verify SCORING_SERVICE_URL is correct
- Check service is running (curl http://localhost:3000/api/score)
- Fallback icebreaker will be used if service unavailable

### Records not updating
- Check AIRTABLE_API_KEY has write permission
- Verify field names match schema (case-sensitive)
- Check n8n execution error log

### Audit log not created
- Check Audit Log table exists and is accessible
- Verify field schema matches expected fields
- Check n8n execution logs (ContinueOnFail=true won't show error)

---

## Next Steps

1. **Dashboard integration:** Add widget to show re-engagement candidates
2. **Email notification:** Add step to email sales team on re-engagement
3. **Historical tracking:** Add field change history in Audit Log
4. **Extended fields:** Add more tracked fields (num_employees, funding_status, etc.)
5. **Feedback loop:** Track which re-engagement icebreakers convert to contacts

---

**Deployment Guide v1.0**  
Ready to deploy: 2026-05-25
