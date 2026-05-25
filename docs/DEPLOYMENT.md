# Deployment Guide

## Quick Start (Vercel)

```bash
npm install -g vercel
vercel login
vercel --prod
```

## Environment Variables Required

```
AIRTABLE_API_KEY=pat...
AIRTABLE_BASE_ID=app...
AIRTABLE_SUBS_BASE_ID=app...
JWT_SECRET_SUPPLIER=min-32-characters...
EMAIL_SERVICE=sendgrid
EMAIL_API_KEY=SG...
```

## Database Backup

Airtable provides automatic backups. Manual export:

```bash
# Via CLI (requires setup)
airtable export
```

## Monitoring

- Vercel Analytics: vercel.com/dashboard
- Error tracking: Built into Next.js
- Logs: Available in Vercel dashboard

## Scaling Notes

- Current setup handles 100+ concurrent users
- Airtable API rate: 5 req/sec per user
- Add Redis for caching if needed (future)
- Database: Airtable can handle 10M+ records

## Rollback

```bash
# On Vercel dashboard:
# Deployments → Select previous → Promote to production
```

