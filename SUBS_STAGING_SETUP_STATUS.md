# SUBS_STAGING Airtable Base Setup Status

**Last Updated:** 2026-05-25  
**Task:** Phase 2 Task 1 - Create SUBS_STAGING Airtable Base & Tables  
**Status:** READY FOR MANUAL BASE CREATION IN AIRTABLE UI

## Summary

The SUBS_STAGING base needs to be created manually in Airtable and populated with 4 tables. The schema is fully defined and all supporting scripts are ready.

## Current State

- **Base ID in .env:** `appZhXnyFiKbnOZLr` (currently pointing to main base)
- **Schema Documentation:** ✓ Complete (`scripts/setup-subs-staging.ts`)
- **Verification Script:** ✓ Complete (`scripts/verify-subs-staging.ts`)
- **Manual Setup Guide:** Below

## What Needs to Be Done (Manual in Airtable UI)

### Step 1: Create SUBS_STAGING Base

1. Go to https://airtable.com
2. Click **Create** → **Create Base from scratch**
3. Name it exactly: **SUBS_STAGING**
4. **Copy the Base ID** from the URL (format: `appXXXXXXXXXXXXXX`)

### Step 2: Create 4 Empty Tables

In the new SUBS_STAGING base, create these 4 tables with exact names:

1. `Suppliers`
2. `Supplier_Opportunities`
3. `Supplier_Applications`
4. `Communications`

### Step 3: Add Fields to Each Table

Use Airtable's "Add Field" button to create these fields. **Exact names and types required:**

#### Table 1: Suppliers (20 fields)

| Field Name | Type | Notes |
|---|---|---|
| supplier_id | Text | Unique identifier |
| legal_name | Text | Business legal name |
| contact_name | Text | Primary contact |
| business_email | Email | Contact email |
| phone | Phone Number | Contact phone |
| website | URL | Business website |
| sub_category | Single Select | Options: Janitorial Services, HVAC, Plumbing, Electrical, Construction, Landscaping, Security, Other |
| services_offered | Multiple Select | Options: Deep Cleaning, Routine Cleaning, Commercial Cleaning, Post-Construction, Maintenance, Specialty Services |
| preferred_counties | Multiple Select | Options: Lee, Hillsborough, Pinellas, Duval, Miami-Dade, Polk, St. Lucie, Collier |
| certification_status | Single Select | Options: Not Certified, MBE, WBE, VOSB, HUBZone, GSA Schedule, State Contract, Multiple |
| sam_gov_id | Text | SAM.gov ID |
| cage_code | Text | CAGE code |
| availability_start_date | Date | Start date |
| estimated_annual_capacity_usd | Number | Annual capacity |
| insurance_certificate_url | URL | Insurance URL |
| registration_status | Single Select | Options: Pending, Active, Inactive, Suspended, Approved |
| registration_date | Date | Registration date |
| last_activity_date | Date | Last activity |
| password_hash | Text | [Internal] Hashed password |
| notes | Long Text | Additional notes |

#### Table 2: Supplier_Opportunities (11 fields)

| Field Name | Type | Notes |
|---|---|---|
| supplier_id | Text | Reference to supplier |
| opportunity_id | Text | Unique opportunity ID |
| opportunity_name | Text | Opportunity title |
| agency | Text | Government agency |
| contract_value_usd | Number | Contract value |
| deadline | Date | Application deadline |
| match_score | Number | Match score 0-100 |
| match_reason | Long Text | Why matched |
| status | Single Select | Options: New, Matched, Applied, Won, Lost, Archived |
| date_matched | Date | When matched |
| date_applied | Date | When applied |

#### Table 3: Supplier_Applications (8 fields)

| Field Name | Type | Notes |
|---|---|---|
| supplier_id | Text | Reference to supplier |
| supplier_name | Text | Supplier name (denormalized) |
| opportunity_id | Text | Reference to opportunity |
| opportunity_name | Text | Opportunity name (denormalized) |
| application_status | Single Select | Options: Draft, Submitted, Under Review, Accepted, Rejected, Withdrawn |
| application_date | Date | Submission date |
| response_date | Date | Response date |
| notes | Long Text | Application notes |

#### Table 4: Communications (6 fields)

| Field Name | Type | Notes |
|---|---|---|
| supplier_id | Text | Reference to supplier |
| supplier_email | Email | Email address |
| email_type | Single Select | Options: Opportunity Notification, Application Reminder, Feedback, Onboarding, Follow-up, System Alert |
| email_subject | Text | Email subject |
| sent_date | Date | When sent |
| open_status | Single Select | Options: Sent, Delivered, Opened, Clicked, Bounced |

### Step 4: Update .env

After creating the base, update your `.env` file:

```bash
AIRTABLE_SUBS_BASE_ID=appYourActualBaseIDHere
```

Replace `appYourActualBaseIDHere` with the actual Base ID from Step 1.

## Verification

After setup, run the verification script:

```bash
npx ts-node scripts/verify-subs-staging.ts
```

This will:
- ✓ Verify the base exists
- ✓ Check all 4 tables exist
- ✓ Verify all fields are present with correct types
- ✓ Create and delete test records to validate the schema
- ✓ Report any missing tables or fields

## Files Provided

### Documentation
- **scripts/setup-subs-staging.ts** - Schema reference (describes all fields and types)
- **scripts/verify-subs-staging.ts** - Verification script (validates setup via API)
- **TASK-1-SUBS-STAGING-SETUP.md** - Detailed setup instructions

### Environment
- **.env** - Will be updated with AIRTABLE_SUBS_BASE_ID

## Important Notes

1. **Base ID Format:** Always starts with "app" (e.g., `appXXXXXXXXXXXXXX`)
2. **Field Names:** Must match exactly - they are case-sensitive in code
3. **Table Names:** Must match exactly - they are case-sensitive
4. **API Key:** Uses existing `AIRTABLE_API_KEY` from environment
5. **Separate Base:** SUBS_STAGING is a NEW base, NOT the main `appZhXnyFiKbnOZLr` base

## Checklist for Manual Setup

- [ ] Go to https://airtable.com
- [ ] Create new base named "SUBS_STAGING"
- [ ] Copy Base ID (starts with "app")
- [ ] Create 4 tables: Suppliers, Supplier_Opportunities, Supplier_Applications, Communications
- [ ] Add all 20 fields to Suppliers table
- [ ] Add all 11 fields to Supplier_Opportunities table
- [ ] Add all 8 fields to Supplier_Applications table
- [ ] Add all 6 fields to Communications table
- [ ] Verify all select field options are added correctly
- [ ] Update .env with AIRTABLE_SUBS_BASE_ID=app...
- [ ] Run: `npx ts-node scripts/verify-subs-staging.ts`
- [ ] See ✅ "SUBS_STAGING base is ready!"

## Troubleshooting

### "AIRTABLE_SUBS_BASE_ID not set in environment"
- You forgot to update .env with the new Base ID
- Make sure it's in the format: `AIRTABLE_SUBS_BASE_ID=appXXXXXXXXXXXXXX`

### "Base not found in Airtable"
- Double-check the Base ID is correct
- Go to https://airtable.com and verify SUBS_STAGING base exists
- Copy the ID from the URL

### "Some required tables" or "Some required fields"
- Go back to the SUBS_STAGING base
- Verify all 4 tables are created with exact names
- Verify all fields are added with exact names and correct types
- Re-run the verification script

### Test records fail
- All fields must have correct types (Text, Email, Date, Select, etc.)
- All select fields must have the specified options
- Make sure no fields are set to "required" unless specified

## Next Steps After Setup

Once verification passes:

1. **Task 2:** Create database access layer (`services/airtable-subs.ts`)
2. **Task 3:** Implement supplier registration endpoints
3. **Task 4:** Build opportunity matching logic
4. **Task 5:** Create supplier portal UI
5. ... and so on

## Support

For field type reference, see `scripts/setup-subs-staging.ts` which contains complete definitions.

---

**Created:** 2026-05-25  
**Task Status:** AWAITING MANUAL AIRTABLE UI SETUP  
**Estimated Time:** 15-20 minutes for manual setup + 2 minutes to verify
