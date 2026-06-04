# SAM Discovery Agent - Deployment Checklist

## Pre-Deployment

- [ ] Verify SAM.gov API key is valid
  ```bash
  curl "https://api.sam.gov/prod/opportunities/v1/search?api_key=$SAM_GOV_API_KEY" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"postedFrom":"2026-05-29","postedTo":"2026-06-04","limit":1}'
  ```

- [ ] Verify Airtable credentials
  ```bash
  curl "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/meta/bases/$AIRTABLE_BASE_ID" \
    -H "Authorization: Bearer $AIRTABLE_API_KEY"
  ```

- [ ] Confirm Opportunities table exists and has required fields
  - Title, Agency, Department, SAM Contract ID, Source, Description, etc.

- [ ] Test agent locally
  ```bash
  npm run build
  npm test -- tests/agents/sam-discovery.test.ts
  ```

- [ ] Review code changes
  ```bash
  git diff lib/agents/ app/api/agents/ .github/workflows/
  ```

## GitHub Actions Deployment

- [ ] Ensure all secrets are configured in GitHub repository settings:
  - `AIRTABLE_API_KEY`
  - `AIRTABLE_BASE_ID`
  - `SAM_GOV_API_KEY`
  - `ADMIN_SECRET`
  - `JWT_SECRET_SUPPLIER`
  - `SLACK_WEBHOOK_URL` (for notifications)

- [ ] Test workflow manually
  ```bash
  gh workflow run sam-discovery-agent.yml
  ```

- [ ] Monitor first run in GitHub Actions
  - Go to Actions > SAM Discovery Agent
  - Check logs for errors
  - Verify records were created in Airtable

- [ ] Verify scheduled runs
  - Check that agent runs at: 00:00, 06:00, 12:00, 18:00 UTC
  - Monitor for at least one full 24-hour cycle

## VPS Deployment (72.61.92.220)

- [ ] SSH into VPS
  ```bash
  ssh root@72.61.92.220
  cd /root/maravilla-intelligence
  ```

- [ ] Pull latest code
  ```bash
  git fetch origin
  git checkout origin/master
  ```

- [ ] Install dependencies
  ```bash
  npm ci
  npm run build
  ```

- [ ] Set environment variables
  ```bash
  # Edit .env or environment in Docker container
  export SAM_GOV_API_KEY=xxx
  export AIRTABLE_API_KEY=xxx
  export AIRTABLE_BASE_ID=xxx
  ```

- [ ] Test agent endpoint
  ```bash
  curl -X POST "http://localhost:3002/api/agents/sam-discovery" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json"
  ```

- [ ] (Optional) Set up cron job for local scheduling
  ```bash
  # Add to crontab
  0 */6 * * * curl -X POST "http://localhost:3002/api/agents/sam-discovery" \
    -H "Authorization: Bearer $JWT_TOKEN"
  ```

- [ ] Restart application
  ```bash
  docker-compose restart
  # or
  pm2 restart maravilla-intelligence
  ```

## Monitoring Setup

- [ ] Configure Slack notifications
  - Update webhook URL in GitHub secrets
  - Test success/failure notifications

- [ ] Set up log aggregation (optional)
  - CloudWatch, DataDog, Papertrail, etc.
  - Filter for `[SAM Discovery]` logs

- [ ] Create monitoring dashboard
  - Track successful runs vs failures
  - Monitor records saved per day
  - Alert on >3 consecutive failures

## Post-Deployment Verification

### Day 1

- [ ] Check that agent ran 4 times (00:00, 06:00, 12:00, 18:00 UTC)
- [ ] Verify new records appear in Airtable Opportunities table
- [ ] Check for any error logs
- [ ] Confirm Slack notifications working

### Day 7

- [ ] Review weekly statistics
  - Total records processed: ___
  - Total records saved: ___
  - Duplicate records skipped: ___
  - Error rate: ___

- [ ] Verify no duplicate records in Airtable
  ```bash
  # Query Airtable for duplicate SAM Contract IDs
  # Should have 0-1 records per SAM Contract ID
  ```

- [ ] Check storage usage
  - Airtable records growth: ___
  - No excessive storage consumption

### Week 1-4

- [ ] Monitor ongoing operation
  - All 4 daily runs completing successfully
  - New opportunities consistently added
  - No unexpected errors

- [ ] Fine-tune parameters if needed
  - Adjust `daysBack` if too many/few records
  - Adjust `RATE_LIMIT_DELAY` if hitting rate limits
  - Adjust batch size if performance issues

## Troubleshooting During Deployment

### Agent not running

**Check GitHub Actions workflow:**
```bash
gh run list -w sam-discovery-agent.yml --limit 5
gh run view <run-id> --log
```

**Check secrets:**
```bash
gh secret list
# Verify all required secrets are present
```

### No records saved

**Test SAM.gov API directly:**
```bash
curl "https://api.sam.gov/prod/opportunities/v1/search?api_key=$SAM_GOV_API_KEY" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "postedFrom": "2026-05-29",
    "postedTo": "2026-06-04",
    "limit": 10
  }' | jq '.opportunitiesData | length'
```

**Test Airtable write:**
```bash
curl "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/$OPPORTUNITIES_TABLE_ID" \
  -X POST \
  -H "Authorization: Bearer $AIRTABLE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": {
      "Title": "Test Record",
      "Agency": "Test Agency",
      "SAM Contract ID": "TEST-'"$(date +%s)"'"
    }
  }'
```

### Rate limit errors

**Reduce batch size:**
- Edit `limit` in `fetchOpportunities()` from 100 to 50

**Increase delay:**
- Edit `RATE_LIMIT_DELAY` from 500ms to 1000ms

**Stagger runs:**
- Change cron schedule to less frequent (e.g., every 12 hours instead of 6)

### Authentication errors

**Verify JWT token:**
```bash
# Get current token from supplier auth
curl "http://localhost:3002/api/suppliers/login" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

**Check ADMIN_SECRET:**
```bash
# Should not be empty
echo $ADMIN_SECRET
```

## Rollback Plan

If issues occur:

1. **Disable scheduled runs:**
   ```bash
   # Disable GitHub Actions workflow
   gh workflow disable sam-discovery-agent
   ```

2. **Revert code:**
   ```bash
   git revert <commit-hash>
   git push origin master
   ```

3. **Clean up duplicate records (if needed):**
   ```bash
   # Manually delete test/duplicate records from Airtable
   # Use API or UI to filter by discovery date
   ```

4. **Re-enable after fix:**
   ```bash
   git commit -m "Fix SAM agent issue"
   git push origin master
   gh workflow enable sam-discovery-agent
   ```

## Success Criteria

Agent is successfully deployed when:

- ✅ Endpoint `/api/agents/sam-discovery` responds to GET requests
- ✅ Health check returns `status: "deployed"`
- ✅ Manual POST requests successfully trigger discovery runs
- ✅ Scheduled runs execute every 6 hours without errors
- ✅ New SAM.gov opportunities appear in Airtable Opportunities table
- ✅ Duplicate detection works (no duplicate SAM Contract IDs)
- ✅ Slack notifications configured and working
- ✅ No rate limit errors in logs
- ✅ Error rate < 5% over 7 days
- ✅ Average run time < 15 seconds

## Long-Term Maintenance

### Weekly
- Review agent logs for anomalies
- Check Slack notifications for errors
- Monitor Airtable record growth

### Monthly
- Analyze opportunity quality and relevance
- Adjust NAICS codes or filtering if needed
- Review and optimize performance

### Quarterly
- Expand to additional sources (FedBizOpps, GSA)
- Implement additional enrichment
- Analyze ROI and lead quality metrics

## Support

For issues or questions:
- Check logs: `[SAM Discovery]` tag in console/logs
- Review documentation: `/docs/SAM_DISCOVERY_AGENT.md`
- GitHub Issues: Create issue with `[SAM Agent]` label
- Slack: #intelligence-team channel
