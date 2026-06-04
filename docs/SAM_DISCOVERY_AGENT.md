# SAM Discovery Agent

Autonomous federal contract discovery agent that continuously monitors SAM.gov for new opportunities and automatically stores them in the Opportunities table.

## Overview

The SAM Discovery Agent:
- Fetches new federal contract opportunities from SAM.gov API
- Processes and normalizes contract data
- Stores results in Airtable (Opportunities table)
- Detects and skips duplicate records
- Runs autonomously every 6 hours
- Includes rate limiting and error handling

## Architecture

### Files

```
lib/agents/
├── sam-discovery-agent.ts       # Core agent implementation
└── sam-discovery-scheduler.ts   # Scheduler/cron integration

app/api/agents/
└── sam-discovery/
    └── route.ts                 # API endpoint

.github/workflows/
└── sam-discovery-agent.yml      # GitHub Actions 6-hour schedule
```

### Components

1. **SAMDiscoveryAgent** - Core agent class
   - `fetchOpportunities()` - Query SAM.gov API
   - `processOpportunities()` - Normalize and transform data
   - `saveToAirtable()` - Store in Opportunities table
   - `run()` - Orchestrate full workflow

2. **SAMDiscoveryScheduler** - Scheduling wrapper
   - `start()` - Start 6-hour interval
   - `stop()` - Stop scheduler
   - `executeWithRetry()` - Run with retry logic
   - `getStatus()` - Check scheduler status

3. **API Endpoint** - `/api/agents/sam-discovery`
   - `POST` - Trigger discovery run manually
   - `GET` - Health check and documentation

## API Endpoint

### POST /api/agents/sam-discovery

Trigger the discovery agent manually.

**Authentication:** Required (JWT token)

**Query Parameters:**
```
daysBack (optional): number - How many days to look back (1-90, default: 7)
```

**Request:**
```bash
curl -X POST "http://localhost:3002/api/agents/sam-discovery?daysBack=7" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "agent": "SAM Discovery",
  "status": "success",
  "endpoint": "/api/agents/sam-discovery",
  "timestamp": "2026-06-04T12:00:00.000Z",
  "recordsProcessed": 42,
  "recordsSaved": 38,
  "errors": [],
  "nextRun": "2026-06-04T18:00:00.000Z",
  "message": "Processed 42 opportunities, saved 38, skipped 4 duplicates in 3452ms"
}
```

### GET /api/agents/sam-discovery

Health check and documentation.

**Request:**
```bash
curl -X GET "http://localhost:3002/api/agents/sam-discovery"
```

**Response:**
```json
{
  "agent": "SAM Discovery",
  "status": "deployed",
  "endpoint": "/api/agents/sam-discovery",
  "description": "Autonomous SAM.gov federal contract discovery agent",
  "schedule": "every 6 hours",
  "capabilities": [...],
  "documentation": {...}
}
```

## Configuration

### Environment Variables

Required:
```bash
AIRTABLE_API_KEY=pat...         # Airtable API key
AIRTABLE_BASE_ID=appXxx        # Airtable base ID
SAM_GOV_API_KEY=xxx            # SAM.gov API key
```

Optional:
```bash
AIRTABLE_TBL_OPPORTUNITIES=tbl... # Opportunities table ID (default: tbldTDb1v79dVNCTQ)
```

### Airtable Schema

The agent expects an **Opportunities** table with these fields:

| Field | Type | Required |
|-------|------|----------|
| Title | Text | Yes |
| Agency | Text | Yes |
| Department | Text | No |
| SAM Contract ID | Text | Yes (unique) |
| Source | Single Select | Yes |
| Description | Long Text | No |
| NAICS Code | Text | No |
| Classification Code | Text | No |
| Solicitation Number | Text | No |
| Award Type | Text | No |
| Deadline | Date | No |
| Estimated Value | Number | No |
| Posted Date | Date | Yes |
| Discovered At | Date | Yes |
| URL | URL | No |
| Status | Single Select | Yes |

**Source field options:**
- sam-gov
- usaspending
- fedbizopps

**Status field options:**
- new
- updated
- reviewed
- archived

## Scheduling

### GitHub Actions (Recommended)

The agent runs automatically every 6 hours via `.github/workflows/sam-discovery-agent.yml`:

```
00:00 UTC
06:00 UTC
12:00 UTC
18:00 UTC
```

**Manual trigger:**
```bash
gh workflow run sam-discovery-agent.yml
```

### Node.js Scheduler

For local development or self-hosted deployments:

```typescript
import { initializeSAMScheduler } from '@/lib/agents/sam-discovery-scheduler'

const scheduler = initializeSAMScheduler({
  interval: 6 * 60 * 60 * 1000, // 6 hours
  daysBack: 7,
  maxRetries: 3,
  enabled: true,
})

scheduler.start()

// Later, if needed:
scheduler.stop()
console.log(scheduler.getStatus())
```

### Cron Integration

For n8n, Zapier, or other cron platforms:

```typescript
import { cronSAMDiscovery } from '@/lib/agents/sam-discovery-scheduler'

// Call this on your cron schedule
await cronSAMDiscovery()
```

### Railway/Vercel Cron

Add to your deployment configuration:

```toml
[build.crons]
sam_discovery = "0 */6 * * * node -e \"require('./dist/lib/agents/sam-discovery-scheduler').cronSAMDiscovery()\""
```

## Data Flow

```
SAM.gov API
    ↓
SAMDiscoveryAgent.fetchOpportunities()
    ↓
processOpportunities() [normalize]
    ↓
recordExists() [check for duplicates]
    ↓
saveToAirtable() [batch insert with rate limiting]
    ↓
Airtable Opportunities Table
    ↓
[Other agents can act on new opportunities]
```

## Features

### Duplicate Detection

Before saving, the agent checks if a record with the same SAM Contract ID already exists:

```typescript
const exists = await this.recordExists(opp.samContractId)
if (exists) {
  skipped++
  continue
}
```

### Rate Limiting

The agent respects API rate limits:

```typescript
// 500ms delay between Airtable requests
const RATE_LIMIT_DELAY = 500
await this.delay(RATE_LIMIT_DELAY)
```

### Error Handling

- Graceful handling of API timeouts
- Individual record errors don't stop batch processing
- Partial success returns (`status: 'partial'`)
- Detailed error messages for debugging

### Retry Logic

Built-in retry mechanism with configurable attempts:

```typescript
{
  maxRetries: 3,        // Retry up to 3 times
  retryDelay: 5000,     // 5 second delay between retries
}
```

## Monitoring

### Logs

Each run produces detailed console logs:

```
[SAM Discovery] Starting discovery run...
[SAM Discovery] Fetched 42 opportunities from SAM.gov
[SAM Discovery] Processing 42 opportunities...
[SAM Discovery] Saving to Airtable...
[SAM Discovery] Saved opportunity: SAM-2026-123456 - Title...
[SAM Discovery] Record already exists: SAM-2026-123457
```

### Slack Notifications

GitHub Actions workflow posts success/failure to Slack:

```json
{
  "text": "SAM Discovery Agent - Run Completed",
  "status": "Success ✅",
  "workflow": "link to GitHub Action"
}
```

### Response Status Codes

| Status | Meaning |
|--------|---------|
| `success` | All opportunities processed and saved |
| `partial` | Some errors occurred, but processed some records |
| `error` | Fatal error, no records processed |

## Testing

### Manual Test (Local)

```typescript
import { runSAMDiscoveryAgent } from '@/lib/agents/sam-discovery-agent'

const result = await runSAMDiscoveryAgent(7) // 7 days back
console.log(result)
```

### API Test

```bash
# Health check
curl http://localhost:3002/api/agents/sam-discovery

# Trigger run (requires auth)
curl -X POST http://localhost:3002/api/agents/sam-discovery?daysBack=7 \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Test Date Range

To test with old data:

```bash
curl -X POST "http://localhost:3002/api/agents/sam-discovery?daysBack=30" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## Troubleshooting

### Agent Not Running

**Check GitHub Actions:**
1. Go to Repository > Actions > SAM Discovery Agent
2. View latest run logs
3. Verify secrets are configured

**Check local scheduler:**
```typescript
const status = scheduler.getStatus()
console.log(status)
// { enabled: true, running: false, interval: 21600000, isActive: true }
```

### No Records Saved

**Verify configuration:**
```bash
echo $SAM_GOV_API_KEY          # Should not be empty
echo $AIRTABLE_API_KEY         # Should not be empty
echo $AIRTABLE_BASE_ID         # Should start with 'app'
```

**Check SAM.gov API:**
```bash
curl "https://api.sam.gov/prod/opportunities/v1/search?api_key=$SAM_GOV_API_KEY" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"postedFrom":"2026-05-29","postedTo":"2026-06-04","limit":10}'
```

### Rate Limit Errors

If you get 429 errors from Airtable:
- Increase `RATE_LIMIT_DELAY` in agent
- Reduce batch size
- Stagger runs (change schedule)

### Authentication Errors

- Verify JWT token is valid
- Check token hasn't expired
- Confirm `ADMIN_SECRET` is set
- Verify Airtable API key has base access

## Integration Examples

### With Lead Scoring

After new opportunities are discovered, trigger lead enrichment:

```typescript
// In your workflow
if (result.recordsSaved > 0) {
  await triggerLeadEnrichment(result.recordsSaved)
}
```

### With Slack Notifications

Post detailed opportunity summaries to Slack:

```typescript
const message = `Found ${result.recordsSaved} new federal contracts:
${opportunities.map(o => `• ${o.title} ($${o.estimatedValue}) - ${o.agency}`).join('\n')}`

await postToSlack(message)
```

### With Watch Automation

Automatically create watches for high-value opportunities:

```typescript
for (const opp of opportunities) {
  if (opp.estimatedValue > 500000) {
    await createWatch({
      title: opp.title,
      agency: opp.agency,
      naicsCode: opp.naicsCode,
    })
  }
}
```

## Performance

Typical run metrics:

| Metric | Value |
|--------|-------|
| API fetch time | 2-4s |
| Processing time | <1s |
| Airtable saves | 3-8s (depends on batch size) |
| Total run time | 5-15s |
| Record throughput | ~10 records/sec |

## Security

- All API keys stored in environment variables
- JWT authentication required for manual API triggers
- Rate limiting prevents API abuse
- Duplicate detection prevents data duplication
- No sensitive data logged

## Future Enhancements

- [ ] Webhook notifications on new high-value opportunities
- [ ] Automatic watch creation for matching profiles
- [ ] ML-based opportunity scoring
- [ ] Multi-source aggregation (FedBizOpps, GSA)
- [ ] Custom field enrichment from external sources
- [ ] Historical trend analysis
- [ ] Opportunity expiration monitoring

## References

- [SAM.gov API Documentation](https://api.data.gov/docs/sam/)
- [Airtable API Reference](https://airtable.com/api)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
