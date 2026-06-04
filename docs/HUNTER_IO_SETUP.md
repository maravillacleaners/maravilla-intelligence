# Hunter.io Email Enrichment Setup Guide

## Overview

Hunter.io is integrated into the Maravilla Intelligence platform to automatically enrich prospect records with missing email addresses, contact patterns, and organization data. The integration supports both real-time enrichment (via API endpoint) and batch enrichment (via scheduled jobs).

## Status

- **API Endpoint**: `/api/enrich` (POST)
- **Integration Level**: Production-ready
- **Fallback Strategy**: Graceful downgrade to pattern inference if Hunter.io unavailable
- **Rate Limiting**: Configured to respect Hunter.io plan limits

## Installation & Setup

### 1. Sign Up for Hunter.io

Visit [hunter.io](https://hunter.io) and create a free account:

- **Free Plan**: 100 API requests/month
- **Starter Plan**: $49/month for 5,000 requests
- **Pro Plan**: $199/month for 25,000 requests
- **Enterprise**: Custom pricing for high-volume needs

Government contracting (SAM.gov focus) typically requires Starter or Pro plan.

### 2. Get Your API Key

1. Log in to Hunter.io dashboard
2. Navigate to **Settings** → **API**
3. Copy your **API Key**
4. Add to your `.env` file:

```env
HUNTER_API_KEY=your-api-key-here
```

### 3. Configure in Maravilla Intelligence

The `.env` file has been pre-configured with placeholders:

```env
# HUNTER.IO API (Email & Contact Enrichment)
HUNTER_API_KEY=

# GOOGLE PLACES API (Physical Location Verification)
GOOGLE_PLACES_API_KEY=
```

Paste your Hunter.io API key:

```env
HUNTER_API_KEY=abc123def456...
```

### 4. (Optional) Google Places API

For physical location verification, set up Google Places API:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable Places API
3. Create an API key
4. Add to `.env`:

```env
GOOGLE_PLACES_API_KEY=your-google-places-key
```

## Usage

### API Endpoint: `/api/enrich`

#### Request

```bash
curl -X POST http://localhost:3000/api/enrich \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Acme Corporation",
    "domain": "acme.com",
    "email": "contact@acme.com"  // optional
  }'
```

#### Parameters

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `companyName` | string | Yes* | Legal business name |
| `domain` | string | No* | Website domain (e.g., example.com) |
| `email` | string | No* | Any email from the company |
| `record_id` | string | No | Airtable record ID to fetch name from |

*At least one of `companyName`, `domain`, or `email` is required.

#### Response (Success)

```json
{
  "success": true,
  "email_patterns": [
    "firstname.lastname@acme.com",
    "firstname@acme.com",
    "info@acme.com"
  ],
  "domain": "acme.com",
  "estimated_contacts": 47,
  "estimated_size": "Small-Mid (50-200 employees)",
  "has_physical_location": true,
  "organization": "Acme Corporation",
  "source": "hunter",
  "enriched_at": "2026-06-04T10:30:00.000Z"
}
```

#### Response (Fallback - Hunter.io Not Available)

```json
{
  "success": true,
  "email_patterns": [
    "firstname.lastname@acme.com",
    "firstname@acme.com",
    "info@acme.com",
    "contact@acme.com"
  ],
  "domain": "acme.com",
  "estimated_contacts": 0,
  "estimated_size": "Small (10-50 employees)",
  "has_physical_location": true,
  "source": "inferred",
  "enriched_at": "2026-06-04T10:30:00.000Z"
}
```

### Batch Enrichment (via Airtable Webhook)

When used with Airtable automation, the enrichment pipeline:

1. **Trigger**: New record added to `Opportunities` table
2. **Action**: Call `/api/enrich` with company name
3. **Store**: Write enriched data back to record
4. **Log**: Track enrichment source (Hunter.io vs inferred)

## Testing

### Run the Connectivity Test

```bash
node scripts/test-hunter-enrichment.js
```

Output:
```
========================================
   Hunter.io Enrichment Connectivity
========================================

[TEST] Hunter.io API Connectivity

✓ HUNTER_API_KEY configured
✓ API Connection: Success
✓ Status Code: 200

[TEST] Email Enrichment Quality

✓ google.com
  Pattern: {first}.{last}
  Emails found: 23
  Organization: Google LLC

[TEST] Rate Limit Headers

✓ Rate Limit Limit: 100 requests
✓ Rate Limit Remaining: 89 requests
✓ Rate Limit Reset: 1728086400
```

### Test Manually in the App

1. Start the development server:
```bash
npm run dev
```

2. Navigate to `/discovery/enrich` (if available in UI)

3. Or use curl:
```bash
curl -X POST http://localhost:3000/api/enrich \
  -H "Content-Type: application/json" \
  -d '{"companyName": "Google"}'
```

## Enrichment Strategy

The system uses a **multi-source enrichment strategy**:

### Priority Order

1. **Hunter.io** (Primary)
   - Real email patterns from the domain
   - Actual employee contacts found
   - Organization data verified
   - Best for: Government contractors, established companies

2. **Inference Engine** (Fallback)
   - Common email patterns (firstname.lastname@domain)
   - Government/federal signals detected
   - Pattern confidence: Medium
   - Best for: New companies, limited Hunter.io quota

3. **Google Places** (Verification)
   - Confirms physical business presence
   - Helps filter spam/fake businesses
   - Optional (improves data quality)

## Rate Limiting

### Free Plan (100 requests/month)

```
100 requests ÷ 30 days ≈ 3.33 requests/day
```

**Recommendation**: Use Hunter.io only for:
- High-priority prospects
- First-touch enrichment
- Contract opportunities

For bulk/daily use, upgrade to Starter plan ($49/month = 5,000 requests).

### Starter Plan (5,000 requests/month)

```
5,000 requests ÷ 30 days ≈ 166 requests/day
```

**Good for**: Running hourly enrichment on new opportunities, leads

### Tracking Usage

Check current quota at: [Hunter.io API Status](https://hunter.io/account/api)

Response headers include rate limit info:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 78
X-RateLimit-Reset: 1728086400
```

## Airtable Integration

### Auto-Enrichment Workflow

1. **Trigger**: New record in `Opportunities` table
2. **Condition**: `business_email` is empty
3. **Action**: Call `/api/enrich` with `legal_name` + `website`
4. **Update**: Write `business_email`, `enriched_at`, `enrichment_source`

### Setup in Airtable

**Automation Rules:**

```
When: Record enters view "Unenriched Leads"
Do: POST to /api/enrich
  Body: { "companyName": {legal_name}, "domain": {website} }
Then: Update record with response
  - business_email: {email_patterns[0]}
  - enriched_at: {timestamp}
  - enrichment_source: {source}
```

## Production Deployment

### VPS (72.61.92.220)

1. Set `HUNTER_API_KEY` in `.env` on VPS:

```bash
ssh root@72.61.92.220
cd /root/maravilla-intelligence
nano .env
# Add: HUNTER_API_KEY=your-key
# Save & exit

docker restart intelligence-api
```

2. Verify:

```bash
curl http://72.61.92.220:3000/api/enrich -X GET
```

Expected response:
```json
{
  "status": "ok",
  "env": {
    "hunter_configured": true,
    "google_places_configured": false
  }
}
```

### GitHub Actions (CI/CD)

Add to `.github/workflows/deploy.yml`:

```yaml
- name: Set Hunter.io API Key
  run: |
    echo "HUNTER_API_KEY=${{ secrets.HUNTER_API_KEY }}" >> .env.production
```

## Troubleshooting

### Error: "HUNTER_API_KEY not configured"

**Solution**: Add your key to `.env`:
```env
HUNTER_API_KEY=abc123...
```

### Error: "Authentication failed - invalid API key"

**Solution**: 
1. Check if API key is correct in dashboard
2. Verify no extra spaces: `HUNTER_API_KEY=key` (not `key `)
3. Re-generate key if needed

### Error: "Rate limit exceeded"

**Solution**:
1. Check current quota at hunter.io/account/api
2. Upgrade plan if needed
3. Implement request queuing to spread requests

### Email patterns are inferred, not real

**Reason**: Hunter.io key is missing or invalid. System is using fallback inference.

**Solution**: 
1. Set valid `HUNTER_API_KEY` in `.env`
2. Test connectivity: `node scripts/test-hunter-enrichment.js`
3. Restart server

## Security Best Practices

### Do Not

- Commit `.env` file with API key to Git
- Expose `HUNTER_API_KEY` in client-side code
- Log raw API responses with user data

### Do

- Use environment variables for all secrets
- Validate/sanitize domain names before API calls
- Cache enrichment results to reduce API calls
- Implement request timeout (8 seconds)
- Monitor rate limit headers

## Cost Analysis

| Plan | Cost | Requests/Month | Cost per Request |
|------|------|-----------------|-----------------|
| Free | $0 | 100 | $0 |
| Starter | $49 | 5,000 | $0.0098 |
| Pro | $199 | 25,000 | $0.008 |
| Enterprise | Custom | Custom | Negotiable |

**ROI Example** (Starter Plan):
- Cost: $49/month
- Requests: 5,000/month
- Cost per lead enriched: $0.01
- If 10% of enriched leads convert at $500 LTV:
  - 500 conversions × $500 = $250,000 revenue
  - ROI: 5,100x

## Next Steps

1. [ ] Create free Hunter.io account
2. [ ] Get API key
3. [ ] Add to `.env` file
4. [ ] Run: `node scripts/test-hunter-enrichment.js`
5. [ ] Test `/api/enrich` endpoint
6. [ ] Set up Airtable automation
7. [ ] Monitor usage and upgrade if needed

## Additional Resources

- [Hunter.io API Documentation](https://hunter.io/api)
- [Hunter.io Changelog](https://hunter.io/changelog)
- [Email Pattern Guide](https://hunter.io/domain-search/google.com)
- [Maravilla Intelligence Docs](/README.md)
- [Enrichment API Reference](/docs/api/enrich.md)

## Support

For issues or questions:
- Check Hunter.io status: https://status.hunter.io
- Review API docs: https://hunter.io/api-documentation
- Test connectivity: `node scripts/test-hunter-enrichment.js`
- Check logs: `tail -f logs/api.log`
