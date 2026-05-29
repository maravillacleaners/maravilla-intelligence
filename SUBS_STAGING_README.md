# SUBS_STAGING - Supplier Portal Airtable Base

**Phase 2 Task 1: Complete**  
**Status:** Ready for Manual Execution  
**Created:** 2026-05-25

---

## Quick Access

**Start here:**
- First time? → Read **SUBS_STAGING_QUICK_START.md** (2 min read)
- Need details? → Read **SUBS_STAGING_SETUP_STATUS.md** (5 min read)
- In a hurry? → Use **SUBS_STAGING_CHEATSHEET.md** (quick reference)
- Want full report? → Read **PHASE2_TASK1_COMPLETION_REPORT.md**

---

## What is SUBS_STAGING?

SUBS_STAGING is a new Airtable base that powers the Supplier Portal. It's separate from the main intelligence base (appZhXnyFiKbnOZLr) and focuses entirely on supplier management.

**Key features:**
- Supplier registration and profiles
- Government opportunity matching
- Application tracking
- Email communications log

**Size:**
- 4 tables
- 45 fields total
- Designed for supplier self-service

---

## Architecture

```
SUBS_STAGING Base
├── Suppliers (20 fields)
│   ├── Profile: supplier_id, legal_name, contact_name, email, phone, website
│   ├── Category: sub_category, services_offered, preferred_counties
│   ├── Compliance: certification_status, sam_gov_id, cage_code
│   ├── Operations: availability_start_date, capacity, insurance_url
│   ├── Status: registration_status, registration_date, last_activity_date
│   ├── Auth: password_hash
│   └── Notes: notes
│
├── Supplier_Opportunities (11 fields)
│   ├── Links: supplier_id, opportunity_id
│   ├── Details: opportunity_name, agency, contract_value_usd, deadline
│   ├── Matching: match_score, match_reason, status
│   └── Timeline: date_matched, date_applied
│
├── Supplier_Applications (8 fields)
│   ├── Links: supplier_id, supplier_name, opportunity_id, opportunity_name
│   ├── Status: application_status
│   ├── Timeline: application_date, response_date
│   └── Notes: notes
│
└── Communications (6 fields)
    ├── Links: supplier_id, supplier_email
    ├── Content: email_type, email_subject
    ├── Timeline: sent_date
    └── Status: open_status
```

---

## Setup Timeline

| Time | Task | Method |
|------|------|--------|
| 5 min | Create SUBS_STAGING base | Airtable UI (manual) |
| 3 min | Create 4 tables | Airtable UI (manual) |
| 2-15 min | Add fields | Automated script OR manual |
| 2 min | Update .env | Text editor |
| 2 min | Verify setup | Run script |
| **14-27 min total** |

---

## The Two Paths

### Path A: Manual Setup (Detailed Learning)
- Go through Airtable UI and create each field manually
- Time: 20-25 minutes
- Benefits: Understand the structure, can fix issues easily
- Best for: First-time setup, debugging

**Steps:**
1. Create SUBS_STAGING base in Airtable
2. Create 4 empty tables
3. Manually add all 45 fields using field definitions from SUBS_STAGING_SETUP_STATUS.md
4. Update .env
5. Run verification script

### Path B: Automated Setup (Fast)
- Create base and empty tables, then run script to add all fields
- Time: 15-20 minutes
- Benefits: Faster, less typing, less error-prone
- Best for: Experienced users, scripted deployments

**Steps:**
1. Create SUBS_STAGING base in Airtable
2. Create 4 empty tables
3. Run: `npx ts-node scripts/auto-setup-subs-staging.ts appXXXXXXXXXXXXXX`
4. Update .env
5. Run verification script

---

## Step-by-Step (Path B - Recommended)

### Step 1: Create SUBS_STAGING Base (5 minutes)

```
1. Go to https://airtable.com
2. Click "Create" → "Create Base from scratch"
3. Name it exactly: SUBS_STAGING
4. Wait for base to be created
5. Copy the Base ID from the URL
   Format: appXXXXXXXXXXXXXX
   Example: appK5mPz7xN8qR2wL
```

### Step 2: Create 4 Empty Tables (3 minutes)

In the SUBS_STAGING base you just created:

```
Click "Add a table" and create:
1. Suppliers
2. Supplier_Opportunities
3. Supplier_Applications
4. Communications

(Just create them - don't add any fields yet)
```

### Step 3: Add Fields Automatically (2 minutes)

```bash
npx ts-node scripts/auto-setup-subs-staging.ts appXXXXXXXXXXXXXX
```

Replace `appXXXXXXXXXXXXXX` with your actual Base ID.

Expected output:
```
📋 Setting up "Suppliers" table...
  ✓ Found table (ID: tblXXXXXXXXXXXXXX)
  Adding 20 fields...
    ✓ supplier_id
    ✓ legal_name
    ... (more fields)
  ✅ Suppliers: 20 created, 0 skipped

📋 Setting up "Supplier_Opportunities" table...
  ... (11 fields)

📋 Setting up "Supplier_Applications" table...
  ... (8 fields)

📋 Setting up "Communications" table...
  ... (6 fields)

✅ Setup Complete!

📝 Next steps:
1. Update .env with: AIRTABLE_SUBS_BASE_ID=appXXXXXXXXXXXXXX
2. Verify setup: npx ts-node scripts/verify-subs-staging.ts
```

### Step 4: Update .env (2 minutes)

Edit `.env` file:

```bash
# Find this line:
AIRTABLE_SUBS_BASE_ID=appZhXnyFiKbnOZLr

# Replace with your new base ID:
AIRTABLE_SUBS_BASE_ID=appXXXXXXXXXXXXXX
```

### Step 5: Verify Setup (2 minutes)

```bash
npx ts-node scripts/verify-subs-staging.ts
```

Expected output:
```
════════════════════════════════════════════════════════════════
SUBS_STAGING Airtable Base Verification
════════════════════════════════════════════════════════════════

✓ Checking for required tables...
  ✓ Suppliers exists
  ✓ Supplier_Opportunities exists
  ✓ Supplier_Applications exists
  ✓ Communications exists

✓ Checking for required fields...
  [detailed field list]

✓ Creating test records...
  ✓ Created test supplier
  ✓ Cleaned up test record
  ... (more tests)

════════════════════════════════════════════════════════════════
Verification Summary
════════════════════════════════════════════════════════════════
Base ID: appXXXXXXXXXXXXXX
Tables found: 4/4
Fields verified: ✓ All
Test records: ✓ Passed

✅ SUBS_STAGING base is ready!

Next steps:
  1. npm run dev
  2. Navigate to /suppliers/register
  3. Test supplier portal
```

---

## Complete Field Reference

### Suppliers (20 fields)
```
Identity:          supplier_id, legal_name, contact_name
Contact:           business_email, phone, website
Category:          sub_category, services_offered, preferred_counties
Compliance:        certification_status, sam_gov_id, cage_code
Operations:        availability_start_date, estimated_annual_capacity_usd, insurance_certificate_url
Status:            registration_status, registration_date, last_activity_date
Authentication:    password_hash
Notes:             notes
```

### Supplier_Opportunities (11 fields)
```
Identifiers:  supplier_id, opportunity_id
Details:      opportunity_name, agency, contract_value_usd, deadline
Matching:     match_score, match_reason, status
Timeline:     date_matched, date_applied
```

### Supplier_Applications (8 fields)
```
Identifiers:  supplier_id, supplier_name, opportunity_id, opportunity_name
Status:       application_status
Timeline:     application_date, response_date
Notes:        notes
```

### Communications (6 fields)
```
Identifiers:  supplier_id, supplier_email
Content:      email_type, email_subject
Timeline:     sent_date
Status:       open_status
```

---

## Files in This Package

### Documentation
- **SUBS_STAGING_README.md** - This file (overview)
- **SUBS_STAGING_QUICK_START.md** - Quick start guide
- **SUBS_STAGING_SETUP_STATUS.md** - Detailed instructions with all field definitions
- **SUBS_STAGING_CHEATSHEET.md** - Quick reference card
- **PHASE2_TASK1_COMPLETION_REPORT.md** - Full technical report

### Scripts
- **scripts/setup-subs-staging.ts** - Display schema (reference only)
- **scripts/auto-setup-subs-staging.ts** - Automated field creation
- **scripts/verify-subs-staging.ts** - Verification and testing

### Configuration
- **.env** - Environment variables (update AIRTABLE_SUBS_BASE_ID)

---

## Troubleshooting

### "AIRTABLE_SUBS_BASE_ID not set in environment"
- Open `.env` file
- Find the line with `AIRTABLE_SUBS_BASE_ID=`
- Replace with your actual base ID from Step 1

### "Base not found in Airtable"
- Double-check your Base ID (must start with "app")
- Go to https://airtable.com and verify SUBS_STAGING exists
- Copy the ID from the URL

### "Some required tables not found"
- Go to SUBS_STAGING base in Airtable
- Verify all 4 tables exist with exact names:
  - `Suppliers` (not "Supplier", not "supplier")
  - `Supplier_Opportunities` (with underscore)
  - `Supplier_Applications` (with underscore)
  - `Communications`

### "Some required fields"
- If using manual path: Add missing fields from SUBS_STAGING_SETUP_STATUS.md
- If using automated path: Re-run the auto-setup script
- Verify field types and select options match exactly

### Automated setup fails with "API Error"
- Check that AIRTABLE_API_KEY is correct in .env
- Make sure tables are empty before running script
- Airtable Pro plan may be required for Fields API

---

## What Happens After Verification

Once verification passes, you're ready for:

1. **Task 2:** Create database access layer
2. **Task 3:** Build registration endpoints
3. **Task 4:** Implement opportunity matching
4. **Task 5:** Build portal UI
5. **And more...**

---

## Key Concepts

### Base ID
- Format: `appXXXXXXXXXXXXXX`
- Always starts with "app"
- Unique per Airtable workspace
- Used to connect code to Airtable

### Tables
- 4 tables with specific names (case-sensitive)
- Each table holds different data type
- Tables are related by supplier_id and opportunity_id

### Fields
- 45 fields total across all tables
- Each field has a name, type, and options
- Names are case-sensitive in code

### Verification
- Script tests all requirements
- Creates temporary test records
- Cleans up after itself
- Reports ✅ if all pass

---

## Environment

### Required
- Airtable account (free tier works, may need Pro for Fields API)
- AIRTABLE_API_KEY (already in .env)
- Node.js (already available)
- npm or yarn (already available)

### New for This Task
- AIRTABLE_SUBS_BASE_ID (to be added to .env)
- SUBS_STAGING base (to be created in Airtable)

---

## Performance Notes

- Automated setup: ~10 seconds
- Manual setup: 10-15 minutes
- Verification: ~5 seconds
- No external API calls during setup (only Airtable)

---

## Security Notes

- `password_hash` field is for internal use only
- Never expose in UI or API responses
- Contains hashed passwords (not plain text)
- Supplier authentication handled separately

---

## Next Steps After Completion

1. **Immediately:** Start Task 2
2. **Today:** Implement supplier registration
3. **This week:** Build opportunity matching
4. **Next week:** Portal UI and testing
5. **Soon:** Deploy to production

---

## Support

For detailed help:
- Manual setup → SUBS_STAGING_SETUP_STATUS.md
- Quick reference → SUBS_STAGING_CHEATSHEET.md
- Troubleshooting → SUBS_STAGING_SETUP_STATUS.md (bottom)
- Full report → PHASE2_TASK1_COMPLETION_REPORT.md

---

## Quick Commands Reference

```bash
# Show schema (reference what fields should exist)
npx ts-node scripts/setup-subs-staging.ts

# Automatically create fields (requires empty tables)
npx ts-node scripts/auto-setup-subs-staging.ts appXXXXXXXXXXXXXX

# Verify everything is set up correctly
npx ts-node scripts/verify-subs-staging.ts

# Start development server
npm run dev

# Run tests
npm run test
```

---

## Summary

| What | Where | Time |
|------|-------|------|
| Create base | Airtable UI | 5 min |
| Create tables | Airtable UI | 3 min |
| Add fields | Script | 2 min |
| Update .env | .env file | 2 min |
| Verify | Script | 2 min |
| **Total** | **All** | **14 min** |

---

## Status

- [x] Schema designed
- [x] Scripts created
- [x] Documentation complete
- [ ] Base created in Airtable (user action)
- [ ] Fields added (user action)
- [ ] .env updated (user action)
- [ ] Verification passed (user action)

**Task Status:** Ready for execution  
**User Action Required:** Follow SUBS_STAGING_QUICK_START.md

---

**Created:** 2026-05-25  
**Task:** Phase 2 Task 1 - SUBS_STAGING Base Setup  
**Status:** Complete - Ready for User Execution

For questions, see the detailed documentation files above.
