# SUBS_STAGING Quick Start Guide

**Task:** Phase 2 Task 1 - Create SUBS_STAGING Airtable Base & Tables  
**Status:** READY TO EXECUTE  
**Time to Complete:** 20-25 minutes

## Overview

The SUBS_STAGING base is a separate Airtable base that powers the Supplier Portal. It contains 4 tables with 45 total fields.

## Option A: Manual Setup (Recommended for First-Time)

If you prefer to understand the structure before automation, do this manually in the Airtable UI:

### 1. Create Base (5 minutes)

```
1. Go to https://airtable.com
2. Click "Create" → "Create Base from scratch"
3. Name it: SUBS_STAGING
4. Wait for creation to complete
5. Copy the Base ID from the URL (looks like: appXXXXXXXXXXXXXX)
```

### 2. Create 4 Tables (5 minutes)

Inside the SUBS_STAGING base, create these 4 empty tables:
- `Suppliers`
- `Supplier_Opportunities`
- `Supplier_Applications`
- `Communications`

### 3. Add Fields (10-15 minutes)

See **SUBS_STAGING_SETUP_STATUS.md** for the complete field definitions.

Alternatively, use Option B (automated) below.

### 4. Update Environment

```bash
# Edit .env
AIRTABLE_SUBS_BASE_ID=appYourActualBaseIDHere
```

### 5. Verify Setup

```bash
npx ts-node scripts/verify-subs-staging.ts
```

Expected output:
```
✅ SUBS_STAGING base is ready!
```

---

## Option B: Automated Setup (Faster)

If you already have the base and 4 empty tables created, automate field creation:

### 1. Create Base (5 minutes)

```
1. Go to https://airtable.com
2. Click "Create" → "Create Base from scratch"
3. Name it: SUBS_STAGING
4. Copy the Base ID
```

### 2. Create 4 Empty Tables (3 minutes)

In the SUBS_STAGING base:
- Create table: `Suppliers`
- Create table: `Supplier_Opportunities`
- Create table: `Supplier_Applications`
- Create table: `Communications`

(Just create the tables, don't add fields yet)

### 3. Run Automated Setup (2 minutes)

```bash
# Option A: Provide Base ID as argument
npx ts-node scripts/auto-setup-subs-staging.ts appXXXXXXXXXXXXXX

# Option B: Prompt will ask for Base ID
npx ts-node scripts/auto-setup-subs-staging.ts
```

The script will:
- ✓ Add all 20 fields to Suppliers table
- ✓ Add all 11 fields to Supplier_Opportunities table
- ✓ Add all 8 fields to Supplier_Applications table
- ✓ Add all 6 fields to Communications table

### 4. Update Environment

```bash
# Edit .env
AIRTABLE_SUBS_BASE_ID=appYourActualBaseIDHere
```

### 5. Verify Setup

```bash
npx ts-node scripts/verify-subs-staging.ts
```

Expected output:
```
✅ SUBS_STAGING base is ready!
```

---

## Complete Field List (Reference)

### Suppliers Table (20 fields)
```
supplier_id, legal_name, contact_name, business_email, phone, website,
sub_category, services_offered, preferred_counties, certification_status,
sam_gov_id, cage_code, availability_start_date, estimated_annual_capacity_usd,
insurance_certificate_url, registration_status, registration_date,
last_activity_date, password_hash, notes
```

### Supplier_Opportunities Table (11 fields)
```
supplier_id, opportunity_id, opportunity_name, agency, contract_value_usd,
deadline, match_score, match_reason, status, date_matched, date_applied
```

### Supplier_Applications Table (8 fields)
```
supplier_id, supplier_name, opportunity_id, opportunity_name,
application_status, application_date, response_date, notes
```

### Communications Table (6 fields)
```
supplier_id, supplier_email, email_type, email_subject, sent_date, open_status
```

---

## What You'll Have After Setup

- **SUBS_STAGING base** - New Airtable base for supplier portal
- **4 tables** - Suppliers, Opportunities, Applications, Communications
- **45 fields** - All configured with correct types and select options
- **Verified schema** - All tables and fields verified to work

---

## Next Steps After Verification Passes

1. **Task 2:** Create database access layer (`services/airtable-subs.ts`)
2. **Task 3:** Implement supplier registration endpoints (`app/api/suppliers/register`)
3. **Task 4:** Build opportunity matching algorithm
4. **Task 5:** Create supplier portal UI (React components)
5. ... and so on

---

## Troubleshooting

### "AIRTABLE_SUBS_BASE_ID not set in environment"
- You forgot to update `.env`
- Make sure format is: `AIRTABLE_SUBS_BASE_ID=appXXXXXXXXXXXXXX`

### "Base not found"
- Verify the Base ID is correct (check URL in Airtable)
- Make sure SUBS_STAGING base was created

### "Some required tables not found"
- Verify all 4 table names match exactly (case-sensitive):
  - `Suppliers`
  - `Supplier_Opportunities`
  - `Supplier_Applications`
  - `Communications`

### Automated setup fails with "API Error"
- Verify `AIRTABLE_API_KEY` is correct in `.env`
- Ensure tables are empty before running script
- Check that table names are exactly correct

### Manual setup takes too long
- Use the automated setup (Option B) instead
- It takes 2 minutes vs 15 minutes

---

## Files

- **SUBS_STAGING_SETUP_STATUS.md** - Detailed setup instructions with full field list
- **SUBS_STAGING_QUICK_START.md** - This file
- **scripts/setup-subs-staging.ts** - Schema documentation
- **scripts/auto-setup-subs-staging.ts** - Automated field creation
- **scripts/verify-subs-staging.ts** - Verification and testing
- **.env** - Environment configuration (update AIRTABLE_SUBS_BASE_ID)

---

## Timeline Estimate

- **Manual Setup:** 20-25 minutes
- **Automated Setup:** 15-20 minutes
- **Verification:** 2-3 minutes
- **Total:** 20-30 minutes

**Next phase starts immediately after verification passes.**

---

**Created:** 2026-05-25  
**Task ID:** Phase 2 Task 1  
**Status:** READY TO START
