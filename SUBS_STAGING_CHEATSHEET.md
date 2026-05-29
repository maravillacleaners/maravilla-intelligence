# SUBS_STAGING Setup Cheatsheet

**Quick commands and steps for setting up SUBS_STAGING base**

## TL;DR

```bash
# 1. Create SUBS_STAGING base in Airtable UI (5 min)
https://airtable.com → Create → Name: SUBS_STAGING

# 2. Create 4 empty tables in that base (3 min)
Suppliers, Supplier_Opportunities, Supplier_Applications, Communications

# 3. Option A: Auto-create fields (2 min)
npx ts-node scripts/auto-setup-subs-staging.ts appXXXXXXXXXXXXXX

# 3. Option B: Manually add fields (15 min)
See SUBS_STAGING_SETUP_STATUS.md

# 4. Update .env
AIRTABLE_SUBS_BASE_ID=appXXXXXXXXXXXXXX

# 5. Verify (2 min)
npx ts-node scripts/verify-subs-staging.ts

# Success if you see: ✅ SUBS_STAGING base is ready!
```

---

## The 4 Tables

| Table | Fields | Purpose |
|-------|--------|---------|
| Suppliers | 20 | Supplier info & registration |
| Supplier_Opportunities | 11 | Gov contracts matched to suppliers |
| Supplier_Applications | 8 | Track applications & responses |
| Communications | 6 | Email log |

---

## All 45 Fields at a Glance

### Suppliers (20)
```
supplier_id, legal_name, contact_name, business_email, phone, website,
sub_category, services_offered, preferred_counties, certification_status,
sam_gov_id, cage_code, availability_start_date, estimated_annual_capacity_usd,
insurance_certificate_url, registration_status, registration_date,
last_activity_date, password_hash, notes
```

### Supplier_Opportunities (11)
```
supplier_id, opportunity_id, opportunity_name, agency, contract_value_usd,
deadline, match_score, match_reason, status, date_matched, date_applied
```

### Supplier_Applications (8)
```
supplier_id, supplier_name, opportunity_id, opportunity_name,
application_status, application_date, response_date, notes
```

### Communications (6)
```
supplier_id, supplier_email, email_type, email_subject, sent_date, open_status
```

---

## Select Field Options

### sub_category
```
Janitorial Services, HVAC, Plumbing, Electrical, Construction, Landscaping, Security, Other
```

### services_offered (Multi)
```
Deep Cleaning, Routine Cleaning, Commercial Cleaning, Post-Construction, Maintenance, Specialty Services
```

### preferred_counties (Multi)
```
Lee, Hillsborough, Pinellas, Duval, Miami-Dade, Polk, St. Lucie, Collier
```

### certification_status
```
Not Certified, MBE, WBE, VOSB, HUBZone, GSA Schedule, State Contract, Multiple
```

### registration_status
```
Pending, Active, Inactive, Suspended, Approved
```

### Supplier_Opportunities.status
```
New, Matched, Applied, Won, Lost, Archived
```

### application_status
```
Draft, Submitted, Under Review, Accepted, Rejected, Withdrawn
```

### email_type
```
Opportunity Notification, Application Reminder, Feedback, Onboarding, Follow-up, System Alert
```

### open_status
```
Sent, Delivered, Opened, Clicked, Bounced
```

---

## Step-by-Step (Manual)

### 1. Create Base
```
1. https://airtable.com
2. Click "Create" → "Create Base from scratch"
3. Name it: SUBS_STAGING
4. Copy Base ID from URL (appXXXXXXXXXXXXXX)
```

### 2. Create Tables
```
1. In SUBS_STAGING base, create 4 tables:
   - Suppliers
   - Supplier_Opportunities
   - Supplier_Applications
   - Communications
2. Don't add fields yet (do manually or use script)
```

### 3a. Add Fields Manually
```
1. Open each table
2. Click "Add field"
3. Use SUBS_STAGING_SETUP_STATUS.md for field definitions
4. Add field name, type, and options
```

### 3b. Add Fields Automatically
```
npx ts-node scripts/auto-setup-subs-staging.ts appXXXXXXXXXXXXXX
```

### 4. Update Environment
```
Edit .env:
AIRTABLE_SUBS_BASE_ID=appXXXXXXXXXXXXXX
```

### 5. Verify Everything
```
npx ts-node scripts/verify-subs-staging.ts
```

Expected output:
```
✅ SUBS_STAGING base is ready!

Next steps:
  1. npm run dev
  2. Navigate to /suppliers/register
  3. Test supplier portal
```

---

## Common Errors & Fixes

| Error | Fix |
|-------|-----|
| "AIRTABLE_SUBS_BASE_ID not set" | Update .env with base ID |
| "Base not found" | Check base ID format (must start with "app") |
| "Table not found" | Verify table names (case-sensitive) |
| "Some required fields" | Run auto-setup OR add fields manually |
| "API Error 401" | Check AIRTABLE_API_KEY in .env |
| "API Error 403" | May need Airtable Pro for Fields API |

---

## File References

- **Setup:** SUBS_STAGING_SETUP_STATUS.md
- **Quick Start:** SUBS_STAGING_QUICK_START.md
- **Scripts:** scripts/setup-subs-staging.ts, auto-setup-subs-staging.ts, verify-subs-staging.ts
- **Report:** PHASE2_TASK1_COMPLETION_REPORT.md
- **This:** SUBS_STAGING_CHEATSHEET.md

---

## What Each Script Does

```bash
# Display schema (what fields should exist)
npx ts-node scripts/setup-subs-staging.ts

# Create fields automatically
npx ts-node scripts/auto-setup-subs-staging.ts appXXXXXXXXXXXXXX

# Verify everything is set up correctly
npx ts-node scripts/verify-subs-staging.ts
```

---

## Timeline

- Create base: 5 min
- Create tables: 3 min
- Add fields (auto): 2 min OR (manual): 15 min
- Update .env: 2 min
- Verify: 2 min
- **Total: 14-27 minutes**

---

## Key Points

1. ✓ SUBS_STAGING is a NEW base (not the main one)
2. ✓ Separate from appZhXnyFiKbnOZLr
3. ✓ All 4 table names must be EXACT (case-sensitive)
4. ✓ All select options must be EXACT
5. ✓ Base ID must start with "app"
6. ✓ Run verification after setup
7. ✓ Then move to Task 2

---

## Success = This Output

```
════════════════════════════════════════════════════════════════
Verification Summary
════════════════════════════════════════════════════════════════
Base ID: appXXXXXXXXXXXXXX
Tables found: 4/4
Fields verified: ✓ All
Test records: ✓ Passed

✅ SUBS_STAGING base is ready!
```

---

**Date:** 2026-05-25 | **Task:** Phase 2 Task 1 | **Status:** READY
