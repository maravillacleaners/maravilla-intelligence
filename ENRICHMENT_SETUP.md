# Real-Time Contact Enrichment Setup

## Overview
The portal now supports real-time contact enrichment with two mechanisms:

### 1. **On-Page Load Enrichment (Client-Side)**
When a user opens a contact detail page (`/contacts/{id}`), if the contact is missing an email address, the portal **automatically attempts enrichment** via Hunter.io:
- Silent background process (no manual button click needed)
- Shows toast notification on success
- Refetches contact data to display newly enriched email
- Only attempts once per page load (prevents duplicate API calls)

**File:** `/app/contacts/[id]/page.tsx`
- State: `autoEnrichedOnce` prevents re-attempts
- useEffect hook fires after contact data loads
- Calls `POST /api/enrichment` with contact info

---

### 2. **Batch Enrichment Cron Job (Server-Side)**
A scheduled job runs **every 1 hour** to bulk-enrich all contacts lacking email addresses:
- Fetches all contacts without email (max 50 per batch)
- Calls Hunter.io for each contact
- Updates Airtable with discovered emails
- Appends enrichment history to Notes field
- 1-second delay between API calls (Hunter.io rate limiting)

**File:** `POST /api/enrichment/batch`
- No auth required (internal cron use)
- Returns: `{ success, enriched, skipped, errors, total }`
- Rate-limited: ~60 contacts/hour (1 req/sec)

**File:** `.github/workflows/enrichment-cron.yml`
- Runs at top of every hour (`:00`)
- Requires `ENRICHMENT_API_URL` secret

---

## Setup Instructions

### Step 1: Add GitHub Actions Secret
1. Go to **Settings → Secrets and variables → Actions**
2. Create a new secret:
   - **Name:** `ENRICHMENT_API_URL`
   - **Value:** `https://suppliers.maravillacleaners.com` (or your VPS URL with port, e.g., `http://72.61.92.220:3002`)

### Step 2: Verify Hunter.io API Key
Ensure `credentials.hunterApiKey` is set in `.env.local`:
```env
HUNTER_API_KEY=your_hunter_io_api_key_here
```

### Step 3: Test Endpoints

**Test on-page enrichment (manual):**
```bash
curl -X POST http://localhost:3000/api/enrichment \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "rec...",
    "name": "John Doe",
    "organization": "Acme Corp"
  }'
```

**Test batch enrichment:**
```bash
curl -X POST http://localhost:3000/api/enrichment/batch \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Data Flow

### Contact Without Email Opens
```
User opens /contacts/{id} (no email)
  ↓
Component loads contact data
  ↓
useEffect detects: email missing + autoEnrichedOnce=false
  ↓
POST /api/enrichment { contactId, name, organization }
  ↓
Hunter.io responds with email (confidence ≥50)
  ↓
PATCH contact in Airtable with new email
  ↓
Append to Notes: "[Enriched via hunter.io on 2026-06-02: john@acmecorp.com]"
  ↓
Toast notification + refetch contact data
```

### Hourly Cron Job Runs
```
GitHub Actions triggers (top of every hour)
  ↓
POST /api/enrichment/batch
  ↓
Fetch all contacts with {Email} = ""
  ↓
For each contact (max 50):
  - Extract domain from organization
  - Call Hunter.io email-finder
  - If confidence ≥50, PATCH Airtable
  - Append to Notes with timestamp
  - Wait 1 second (rate limit)
  ↓
Return: { success: true, enriched: N, skipped: M, total: T }
```

---

## Troubleshooting

### "Enrichment API not responding"
- Check `ENRICHMENT_API_URL` secret in GitHub Settings
- Verify VPS is running (http://72.61.92.220:3002)
- Check `.env.local` has `HUNTER_API_KEY` set

### "No email found via Hunter.io"
- Hunter.io didn't match the name + domain combination
- Domain extraction may have failed (org name unclear)
- Confidence score was below 50%
- Contact will be retried on next hourly batch job

### "Enrichment appended to Notes but email field not updated"
- Email was found but Notes append succeeded while email PATCH failed
- Airtable API token may have expired
- Manually edit contact and add email, enrichment history is preserved in Notes

---

## Monitoring

Check batch enrichment logs:
```bash
# View last batch enrichment run
git log --oneline .github/workflows/enrichment-cron.yml

# Watch for enrichment in Airtable Notes
# Filter: {Notes} contains "Enriched via hunter.io"

# In the portal, visit any contact and watch auto-enrichment toast notification
```

---

## FAQ

**Q: Why do contacts get enriched automatically?**
A: Real-time enrichment means your contact database stays fresh without manual intervention. The batch job ensures you capture emails for all contacts over time.

**Q: What if Hunter.io fails?**
A: The contact is skipped and retried on the next hourly run. Errors are logged but don't stop the batch.

**Q: Can I disable auto-enrichment?**
A: Yes:
- Remove the `useEffect` hook from `/app/contacts/[id]/page.tsx` to disable on-page enrichment
- Delete `.github/workflows/enrichment-cron.yml` to disable hourly batch job

**Q: How many contacts can be enriched per hour?**
A: ~60 (1 API call/sec × 60 sec). Adjust the 1-second delay in `/api/enrichment/batch` if needed, but respect Hunter.io's rate limits.

**Q: Do enriched emails overwrite manual entries?**
A: No. The endpoint skips enrichment if an email already exists. Manual emails are never overwritten.
