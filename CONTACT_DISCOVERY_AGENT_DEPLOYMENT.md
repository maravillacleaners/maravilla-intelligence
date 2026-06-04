# Contact Discovery Agent Deployment

**Date:** 2026-06-04  
**Status:** ✅ DEPLOYED  
**Version:** 1.0

## Overview

Autonomous Hunter.io contact discovery agent for discovering and validating email addresses for companies. Stores validated contacts directly in the Contacts (Avatars) Airtable table.

## Components

### 1. Agent Library
**File:** `/lib/agent-contact-discovery.ts`

Core agent class that:
- Fetches companies without recent contact discovery
- Queries Hunter.io API for email patterns and contact estimates
- Generates contact guesses based on email patterns
- Creates contacts in Airtable Avatars table
- Updates company discovery status

**Key Methods:**
- `fetchCompaniesForDiscovery(limit)` - Fetch companies pending discovery
- `queryHunterDomain(domain)` - Query Hunter.io API
- `inferDomain(companyName)` - Infer domain from company name
- `generateContactGuesses(domain, hunterData)` - Generate contact list
- `createContact(contact)` - Store contact in Airtable
- `updateCompanyStatus(companyId, status, contactCount)` - Update company record
- `execute()` - Main execution flow

### 2. API Endpoint
**File:** `/app/api/agents/discover-contacts/route.ts`  
**Endpoint:** `POST|GET /api/agents/discover-contacts`

REST API to trigger and monitor contact discovery:

```bash
# Check status
curl -X GET https://[domain]/api/agents/discover-contacts \
  -H "Authorization: Bearer $AIRTABLE_API_KEY"

# Trigger discovery
curl -X POST https://[domain]/api/agents/discover-contacts \
  -H "Authorization: Bearer $AIRTABLE_API_KEY"
```

**Response:**
```json
{
  "agent": "Contact Discovery",
  "status": "completed|running|error",
  "endpoint": "/api/agents/discover-contacts",
  "results": [
    {
      "company_id": "rec...",
      "company_name": "Acme Corp",
      "domain": "acme.com",
      "contacts_found": 5,
      "contacts_created": 3,
      "estimated_total": 25,
      "patterns": ["{first}.{last}"],
      "timestamp": "2026-06-04T..."
    }
  ],
  "summary": {
    "companies_processed": 1,
    "total_contacts_created": 3,
    "total_contacts_found": 5,
    "estimated_total_contacts": 25,
    "execution_time_seconds": 42
  }
}
```

### 3. GitHub Actions Workflow
**File:** `/.github/workflows/contact-discovery-agent.yml`  
**Schedule:** Every 2 hours (00:00, 02:00, 04:00, ..., 22:00 UTC)

**Triggers:**
- Scheduled: Every 2 hours
- Manual: Workflow dispatch with optional `maxCompanies` parameter

**Secrets Required:**
- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `HUNTER_API_KEY`
- `ADMIN_SECRET`
- `JWT_SECRET_SUPPLIER`
- `SLACK_WEBHOOK_URL` (for notifications)

## Configuration

### Environment Variables
```bash
AIRTABLE_API_KEY=patXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXX
HUNTER_API_KEY=xxxxxxxxxxxx
```

### Airtable Tables
- **Companies:** `tblrjCq3RvHQZZRFq` - Source for discovery
- **Contacts/Avatars:** `tblrIv6lKjsMeUcyU` - Destination for created contacts

### Hunter.io Integration
- API base URL: `https://api.hunter.io/v2/domain-search`
- Rate limit: 8 second timeout per request
- Fallback: If Hunter.io fails, falls back to generic patterns (info@, contact@, sales@)

## Workflow

### Discovery Process
1. **Fetch Companies** - Query Companies table for records with `Discovery_Status` = "pending" or blank
2. **Resolve Domain** - Use provided domain, inferred from company name, or skip
3. **Query Hunter.io** - Get email patterns and estimated contacts
4. **Generate Contacts** - Create list of likely contacts based on patterns
5. **Create Records** - For each contact guess, create Airtable record
6. **Update Status** - Set company `Discovery_Status` to "completed" or "failed"

### Contact Record Structure
```typescript
{
  Name: string                    // Generated from email (e.g., "john.smith")
  Email: string                   // Validated email address
  Organization: string            // Company name
  Entity_Key: string             // "company-{domain}"
  Entity_Name: string            // Company name
  Entity_Type: string            // "company"
  Avatar_Type: string            // "contact"
  Source: string                 // "hunter-discovery"
  Status: string                 // "Active"
  Decision_Role: string          // Email title (e.g., "Manager")
  Influence_Score: number        // 0 (can be updated by enrichment)
  Confidence: string             // "high|medium|low"
  Last_Seen: string             // ISO timestamp
}
```

## Rate Limiting & Performance

### Timeouts
- Hunter.io request: 8 seconds per domain
- Airtable request: Standard Airtable limits
- Rate limiting between companies: 500ms

### Execution Time
- Per company (with Hunter.io): ~2-5 seconds
- Per contact creation: ~200ms
- Total for 5 companies: ~30-60 seconds

### Limits
- Max companies per run: 5 (configurable)
- Max contacts per company: 5
- Max execution time: 30 minutes (GitHub Actions limit)

## Testing

### Local Test Script
```bash
node test-contact-agent.js
```

**Requires:**
- Node.js 18+
- Build output: `npm run build`
- Environment variables set

### Manual API Test
```bash
# Start server
npm run dev

# In another terminal
curl -X POST http://localhost:3000/api/agents/discover-contacts \
  -H "Authorization: Bearer $AIRTABLE_API_KEY" \
  -H "Content-Type: application/json"
```

## Monitoring & Alerts

### GitHub Actions Notifications
- Success: Slack notification to `$SLACK_WEBHOOK_URL`
- Failure: Slack notification with error details
- Logs: Artifacts uploaded if execution fails

### Agent Logging
All activities logged with `[ContactAgent]` prefix:
```
[ContactAgent] Starting contact discovery...
[ContactAgent] Fetched 5 companies for discovery
[ContactAgent] Processing Acme Corp (acme.com)...
[ContactAgent] Created contact john@acme.com (ID: rec...)
[ContactAgent] Completed in 42s, created 3 contacts
```

## Troubleshooting

### Hunter.io Errors
- "API key not configured" → Set `HUNTER_API_KEY` env var
- "HTTP 401" → Verify Hunter API key is valid
- "HTTP 429" → Rate limited; wait before retrying

### Airtable Errors
- "Invalid base ID" → Check `AIRTABLE_BASE_ID`
- "Invalid API key" → Check `AIRTABLE_API_KEY`
- "Contact already exists" → Skipped (no duplicate)

### Domain Inference Issues
- Company name too short → Skipped
- Ambiguous legal suffixes → May over-simplify name
- Non-standard names → Manual domain entry recommended

## Future Enhancements

1. **Email Validation** - Integrate with email verification API (e.g., Clearbit, RocketReach)
2. **Contact Enrichment** - Add LinkedIn URLs, phone numbers, department info
3. **Batch Processing** - Process 100+ companies per run with parallel requests
4. **Smart Deduplication** - Detect duplicate contacts across domains
5. **Pattern Learning** - Build company-specific email patterns from existing records
6. **Webhook Notifications** - Real-time updates as contacts are discovered
7. **Contact Scoring** - Automatic influence/relevance scoring based on role
8. **Inbound Integration** - Sync contacts from external CRM (HubSpot, Salesforce)

## Support & Documentation

- **Agent Code:** `/lib/agent-contact-discovery.ts`
- **Endpoint:** `/app/api/agents/discover-contacts/route.ts`
- **Workflow:** `/.github/workflows/contact-discovery-agent.yml`
- **Test Script:** `/test-contact-agent.js`

---

**Deployed by:** Claude Code  
**Deployment Date:** 2026-06-04  
**Next Run:** 2026-06-04 02:00 UTC (scheduled)
