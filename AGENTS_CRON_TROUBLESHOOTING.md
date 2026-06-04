# Agent Cron Jobs — Troubleshooting Guide

**Last Updated:** 2026-06-04

---

## Quick Diagnostics

### 1. Check if API Server is Running

```bash
curl -v http://72.61.92.220:3002/health
```

**Expected Output:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-04T..."
}
```

**If Not Responding:**
```bash
# SSH into VPS
ssh root@72.61.92.220

# Check Docker status
docker ps

# Check logs
docker logs <container-id>

# Restart container if needed
docker restart <container-id>
```

---

### 2. Test JWT Token

```bash
# Set your token
export API_JWT_TOKEN="your-token-here"

# Test auth header
curl -X POST \
  -H "Authorization: Bearer $API_JWT_TOKEN" \
  http://72.61.92.220:3002/api/agents/sam-discovery \
  -d '{}'
```

**Expected HTTP Code:** 200 or 202  
**Error 401:** Token is invalid or expired

---

### 3. Verify GitHub Secrets (GitHub Actions Only)

```bash
gh secret list
```

**Should show:**
```
API_BASE_URL          updated 2026-06-04
API_JWT_TOKEN         updated 2026-06-04
SLACK_WEBHOOK_OPS     updated 2026-06-04
```

**To Reset a Secret:**
```bash
gh secret delete API_JWT_TOKEN
gh secret set API_JWT_TOKEN --body "new-token-here"
```

---

## Common Issues & Solutions

### Issue 1: "Workflow File Not Found"

**Error Message:**
```
Error: .github/workflows/agents-discovery-cron.yml not found
```

**Solution:**
```bash
# Verify files exist
ls -la .github/workflows/agents-*.yml

# If missing, commit them
git add .github/workflows/agents-*.yml
git commit -m "Add agent cron workflows"
git push
```

---

### Issue 2: "401 Unauthorized" on Cron Execution

**GitHub Actions Log:**
```
Trigger SAM Discovery Agent
HTTP Status: 401
Response: {"error": "Unauthorized"}
```

**Causes:**
1. JWT token expired
2. Token not in secret
3. Token format incorrect

**Solutions:**

**Option A: Update JWT Token**
```bash
# Generate new token on VPS
ssh root@72.61.92.220

# Check .env
cat /root/maravilla-intelligence/.env | grep JWT_SECRET

# Generate new token (if script available)
node generate-jwt.js

# Update GitHub secret
gh secret set API_JWT_TOKEN --body "new-token"
```

**Option B: Verify Secret Format**
```bash
# Check if token was set correctly
gh secret list API_JWT_TOKEN

# If there's an issue, delete and reset
gh secret delete API_JWT_TOKEN
gh secret set API_JWT_TOKEN --body "$(cat /path/to/token.txt)"
```

---

### Issue 3: "Cron Job Never Runs"

**Symptoms:**
- No execution history in GitHub Actions
- No logs appearing at scheduled time

**Causes:**
1. Workflow file has errors
2. Schedule syntax is incorrect
3. Workflow not activated

**Solutions:**

**Option A: Check Workflow Syntax**
```bash
# Validate YAML
yamllint .github/workflows/agents-discovery-cron.yml

# Or use online validator
# https://yamllint.com/
```

**Correct Schedule Syntax:**
```yaml
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
    - cron: '0 * * * *'    # Every hour
    - cron: '0 */2 * * *'  # Every 2 hours
```

**Option B: Activate Workflow**
```bash
# Make sure workflow file is not disabled
# Check top of .yml file:

name: Agent Cron - SAM Discovery  # ✅ Should be present
on:                               # ✅ Should be present
  schedule:
    - cron: '0 0,6,12,18 * * *'   # ✅ Should be present

# NOT commented out, should have no "disabled: true"
```

**Option C: Verify GitHub Actions Enabled**
1. Go to GitHub repo settings
2. Check "Actions" tab
3. Verify "All actions and reusable workflows" is selected

---

### Issue 4: "HTTP 500" from API Endpoint

**GitHub Actions Log:**
```
HTTP Status: 500
Response: {"error": "Internal Server Error"}
```

**Causes:**
1. API endpoint not implemented
2. Database connection issue
3. Missing environment variables

**Solutions:**

**Step 1: Check VPS Logs**
```bash
ssh root@72.61.92.220
docker logs -f <container-id> | grep -i error
```

**Step 2: Verify API Endpoints Exist**
```bash
# Check if endpoints are implemented
curl http://72.61.92.220:3002/api/agents/sam-discovery -X OPTIONS -v
```

**Step 3: Verify .env Configuration**
```bash
ssh root@72.61.92.220
cat /root/maravilla-intelligence/.env | grep -E "AIRTABLE|HUNTER|DB"
```

---

### Issue 5: "No Content" (204 Response)

**GitHub Actions Log:**
```
HTTP Status: 204
Response: (empty)
```

**Meaning:** Agent executed successfully but has nothing to process

**This is OK:**
- Enrichment agent: No contacts to enrich (all have emails)
- Contact discovery: No new contacts to discover
- SAM discovery: No new SAM records to import

**To Check:**
```bash
# Manually trigger and check Airtable
curl -X POST \
  -H "Authorization: Bearer $API_JWT_TOKEN" \
  http://72.61.92.220:3002/api/agents/enrich-company \
  -d '{"batchSize": 50}'

# Monitor Airtable for new/updated records
# Filter: Created timestamp = today
```

---

### Issue 6: "Cron Runs but No Data Updated"

**Symptoms:**
- Cron executes successfully (200 response)
- Airtable records not updated
- No enriched contacts/companies

**Causes:**
1. API credentials not valid
2. Airtable base/table mismatch
3. Rate limits hit

**Solutions:**

**Option A: Verify API Credentials**
```bash
ssh root@72.61.92.220

# Check Airtable token
cat /root/maravilla-intelligence/.env | grep AIRTABLE

# Check Hunter.io token
cat /root/maravilla-intelligence/.env | grep HUNTER
```

**Option B: Manual Test**
```bash
# Run enrichment manually with debug
curl -X POST \
  -H "Authorization: Bearer $API_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 5, "debug": true}' \
  http://72.61.92.220:3002/api/agents/enrich-company

# Check response for errors
```

**Option C: Check Rate Limits**
```bash
# View API logs
ssh root@72.61.92.220
docker logs <container-id> | tail -100 | grep -i "rate\|limit"
```

---

### Issue 7: "n8n Workflow Not Executing"

**Symptoms:**
- Workflow enabled but no executions
- Schedule shows but doesn't trigger

**Solutions:**

**Option A: Check n8n Service**
```bash
# Access n8n
http://srv1112587.hstgr.cloud:5678

# Check if service is running
curl http://srv1112587.hstgr.cloud:5678

# Restart if needed
docker restart n8n
```

**Option B: Verify Cron Syntax**
```
n8n interval format (NOT cron):
- Every hour: repeatInterval = 1 hour
- Every 6 hours: repeatInterval = 6 hours
- Every 2 hours: repeatInterval = 2 hours

NOT CRON format like "0 * * * *"
```

**Option C: Check Credentials**
```
n8n UI → Settings → Credentials
Verify:
- HTTP Header Auth credentials exist
- Bearer token is correct
- Headers are formatted: { "Authorization": "Bearer <token>" }
```

**Option D: Test Workflow Manually**
```
n8n UI → Workflow → Test
Click "Test Trigger" on Schedule node
Should show "Trigger fired at..."
```

---

## Monitoring & Health Checks

### Daily Checklist

```bash
# 1. API health
curl http://72.61.92.220:3002/health

# 2. GitHub Actions (if using)
gh workflow list --all
gh run list --limit 5

# 3. Check Airtable records
# Navigate to: https://airtable.com/base/appXXX
# Filter records created "Today"
# Look for enriched contacts/companies

# 4. Check Slack notifications
# Go to #ops-leads
# Should see agent execution updates
```

### Weekly Review

1. **Execution Success Rate**
   ```bash
   gh run list --limit 50 | grep -c "completed successfully"
   ```

2. **Data Quality**
   - Check Airtable for proper enrichment
   - Verify email addresses are valid
   - Review contact roles/companies

3. **Performance Metrics**
   - Average execution time per agent
   - Records processed per run
   - Error rate

---

## Debugging Tips

### Enable Verbose Logging

**GitHub Actions:**
```yaml
- name: Debug API Response
  run: |
    set -x  # Enable debug mode
    curl -X POST ...
```

**n8n:**
```
Settings → General
Enable "Debug mode"
Will show detailed logs in execution history
```

**VPS:**
```bash
docker logs -f <container-id> --tail 100
# Look for [API], [AGENT], [ERROR] prefixes
```

### Check Environment Variables

```bash
# On VPS
ssh root@72.61.92.220
env | grep -E "AIRTABLE|HUNTER|API|JWT"

# Should show:
# AIRTABLE_API_KEY=...
# HUNTER_API_KEY=...
# JWT_SECRET=...
```

### Test Individual Endpoints

```bash
# SAM Discovery
curl -X POST http://72.61.92.220:3002/api/agents/sam-discovery \
  -H "Authorization: Bearer $JWT" \
  -d '{"source": "sam", "limit": 10}'

# Company Enrichment
curl -X POST http://72.61.92.220:3002/api/agents/enrich-company \
  -H "Authorization: Bearer $JWT" \
  -d '{"batchSize": 10}'

# Contact Discovery
curl -X POST http://72.61.92.220:3002/api/agents/discover-contacts \
  -H "Authorization: Bearer $JWT" \
  -d '{"limit": 50}'
```

---

## Recovery Procedures

### If All Crons Fail

1. **Check API Server**
   ```bash
   ssh root@72.61.92.220
   docker ps
   docker restart <container>
   ```

2. **Verify Credentials**
   ```bash
   cat /root/maravilla-intelligence/.env
   # Check JWT_SECRET, AIRTABLE_API_KEY, HUNTER_API_KEY
   ```

3. **Reset GitHub Secrets**
   ```bash
   gh secret delete API_BASE_URL
   gh secret delete API_JWT_TOKEN
   gh secret set API_BASE_URL --body "http://72.61.92.220:3002"
   gh secret set API_JWT_TOKEN --body "new-token"
   ```

4. **Manual Trigger**
   ```bash
   # Manually run one cron to verify
   curl -X POST http://72.61.92.220:3002/api/agents/sam-discovery \
     -H "Authorization: Bearer <token>"
   ```

### Restore from Backup

```bash
# SSH to VPS
ssh root@72.61.92.220

# Check backup
ls -la /root/backups/

# Restore if needed
docker cp /root/backups/db-backup.sql <container>:/tmp/
docker exec <container> psql -U user < /tmp/db-backup.sql
```

---

## Getting Help

**For Detailed Logs:**
```bash
# GitHub Actions
gh run view <run-id> --log

# n8n
UI → Executions → Click run → View log

# VPS
docker logs <container> | tail -200
```

**Contact Information:**
- GitHub: https://github.com/maravillacleaners/maravilla-intelligence
- VPS: root@72.61.92.220
- Email: hello@maravillacleaners.com

---

**Last Updated:** 2026-06-04
