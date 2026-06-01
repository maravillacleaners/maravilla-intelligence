# Phase 7 Deployment Guide

## Quick Deploy (Docker)

### Prerequisites
- Docker & Docker Compose installed on VPS
- Environment variables configured in `.env`
- Port 3002 available

### Deploy Steps

```bash
# 1. SSH to VPS
ssh root@72.61.92.220

# 2. Navigate to app directory
cd /root/maravilla-intelligence

# 3. Pull latest code
git pull origin main

# 4. Start with Docker Compose
docker-compose up -d

# 5. Verify deployment
curl http://localhost:3002/api/discovery/naics?q=property
```

## Environment Variables Required

```env
NODE_ENV=production
NEXT_PUBLIC_AIRTABLE_API_KEY=pat...
NEXT_PUBLIC_AIRTABLE_BASE_ID=app...
JWT_SECRET_SUPPLIER=your-secret-key
SAM_GOV_API_KEY=SAM-...
N8N_API_KEY=eyJ...
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

## Verify Endpoints

After deployment, test all three Phase 7 endpoints:

```bash
# NAICS Search API
curl http://72.61.92.220:3002/api/discovery/naics?q=property

# Watches API
curl http://72.61.92.220:3002/api/discovery/watches

# Matches API (requires auth)
curl -H "Authorization: Bearer token" http://72.61.92.220:3002/api/discovery/matches
```

## Expected Responses

### NAICS Search
```json
{
  "success": true,
  "data": [
    {
      "code": "531311",
      "title": "Residential Property Managers",
      "description": "..."
    }
  ],
  "total": 2,
  "returned": 2,
  "query": "property"
}
```

### Watches API
```json
{
  "success": true,
  "data": [
    {
      "id": "w1",
      "name": "FL Property Managers · 0–30d",
      "active": true,
      ...
    }
  ],
  "timestamp": "2026-06-01T..."
}
```

### Matches API
```json
{
  "success": true,
  "data": [
    {
      "prospectId": "...",
      "prospectName": "...",
      "predictedScore": 85,
      "action": "auto-approve",
      ...
    }
  ],
  "summary": {
    "total": 150,
    "autoApprove": 42,
    "queue": 95,
    "drop": 13
  }
}
```

## Troubleshooting

### Container won't start
```bash
docker logs maravilla-intelligence-phase7
```

### Port 3002 already in use
```bash
docker ps
docker stop <container-id>
```

### Airtable connection issues
- Verify `NEXT_PUBLIC_AIRTABLE_API_KEY` in `.env`
- Verify `NEXT_PUBLIC_AIRTABLE_BASE_ID` is correct
- Endpoints will fall back to mock data if credentials invalid

### Reset deployment
```bash
docker-compose down
docker volume prune
docker-compose up -d
```

## Portal Access

After deployment, the Discovery Studio portal is available at:

- **URL:** http://suppliers.maravillacleaners.com:3002/discovery
- **API Base:** http://72.61.92.220:3002/api/discovery

## Health Check

Docker Compose includes a health check that pings the NAICS endpoint every 30 seconds.

```bash
docker ps
# STATUS should show "Up (healthy)"
```

## Rollback

If issues occur, rollback to previous version:

```bash
docker-compose down
git checkout HEAD~1
docker-compose up -d
```

## Next Steps After Deployment

1. Test Discovery Studio portal in browser
2. Verify real Airtable integration working
3. Monitor logs for errors
4. Run integration tests against VPS endpoints
5. Confirm all three APIs responding correctly with real data
