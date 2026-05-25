# Task 1: SUBS_STAGING Airtable Base Setup

**Status:** READY FOR MANUAL AIRTABLE SETUP  
**Date:** 2026-05-25  
**Task ID:** Phase 2 Task 1 (Supplier Portal)

## Overview

This task creates the foundation for the Supplier Portal by establishing the SUBS_STAGING Airtable base and its 4 core tables.

## What Was Created

### 1. Setup Script: `scripts/setup-subs-staging.ts`
- **Purpose:** Documents the complete schema for SUBS_STAGING base
- **Contains:** Schema definition for all 4 tables with field specifications
- **Usage:** Run with `node scripts/setup-subs-staging.ts` to display schema documentation
- **Includes:** Manual setup instructions for Airtable UI

### 2. Environment Variable: `.env`
- Added `AIRTABLE_SUBS_BASE_ID=appXXXXXXXXXXXXXX` placeholder
- Will be updated after manual base creation in Airtable

## Schema Definition

### Table 1: Suppliers (20 fields)
Master registry for vendor/supplier information

**Identity & Contact:**
- `supplier_id` (text) - Unique identifier
- `legal_name` (text) - Business legal name
- `contact_name` (text) - Primary contact
- `business_email` (email) - Contact email
- `phone` (phone_number) - Contact phone
- `website` (url) - Business website

**Categorization:**
- `sub_category` (single_select) - Janitorial Services, HVAC, Plumbing, Electrical, Construction, Landscaping, Security, Other
- `services_offered` (multiple_select) - Deep Cleaning, Routine Cleaning, Commercial Cleaning, Post-Construction, Maintenance, Specialty Services
- `preferred_counties` (multiple_select) - Lee, Hillsborough, Pinellas, Duval, Miami-Dade, Polk, St. Lucie, Collier

**Government & Compliance:**
- `certification_status` (single_select) - Not Certified, MBE, WBE, VOSB, HUBZone, GSA Schedule, State Contract, Multiple
- `sam_gov_id` (text) - SAM.gov registration
- `cage_code` (text) - CAGE code for federal contracting

**Operational:**
- `availability_start_date` (date) - When supplier became available
- `estimated_annual_capacity_usd` (number) - Annual capacity in USD
- `insurance_certificate_url` (url) - Insurance certificate URL

**Status & Tracking:**
- `registration_status` (single_select) - Pending, Active, Inactive, Suspended, Approved
- `registration_date` (date) - Registration date
- `last_activity_date` (date) - Last activity timestamp

**Authentication:**
- `password_hash` (text) - [INTERNAL ONLY] Hashed password for portal login

**Notes:**
- `notes` (long_text) - Additional supplier information

### Table 2: Supplier_Opportunities (11 fields)
Government contracting opportunities matched to suppliers

- `supplier_id` (text) - Reference to supplier
- `opportunity_id` (text) - Unique opportunity ID
- `opportunity_name` (text) - Opportunity title
- `agency` (text) - Government agency (EPA, DOD, GSA, etc.)
- `contract_value_usd` (number) - Contract value in USD
- `deadline` (date) - Application deadline
- `match_score` (number) - Algorithm match score (0-100)
- `match_reason` (long_text) - Why matched to supplier
- `status` (single_select) - New, Matched, Applied, Won, Lost, Archived
- `date_matched` (date) - When opportunity was matched
- `date_applied` (date) - When supplier applied

### Table 3: Supplier_Applications (8 fields)
Track supplier applications to opportunities

- `supplier_id` (text) - Reference to supplier
- `supplier_name` (text) - Supplier legal name (denormalized)
- `opportunity_id` (text) - Reference to opportunity
- `opportunity_name` (text) - Opportunity name (denormalized)
- `application_status` (single_select) - Draft, Submitted, Under Review, Accepted, Rejected, Withdrawn
- `application_date` (date) - When submitted
- `response_date` (date) - When response received
- `notes` (long_text) - Application notes/feedback

### Table 4: Communications (6 fields)
Email communications log with suppliers

- `supplier_id` (text) - Reference to supplier
- `supplier_email` (email) - Email recipient
- `email_type` (single_select) - Opportunity Notification, Application Reminder, Feedback, Onboarding, Follow-up, System Alert
- `email_subject` (text) - Email subject line
- `sent_date` (date) - When email was sent
- `open_status` (single_select) - Sent, Delivered, Opened, Clicked, Bounced

## Manual Setup Instructions

### Step 1: Create Base in Airtable
1. Go to https://airtable.com
2. Click "Create" → "Create Base from scratch"
3. Name it **SUBS_STAGING** (exact name required)
4. Wait for base to be created
5. **Note the Base ID** (appears in URL as `https://airtable.com/appXXXXXXXXXXXXXX/...`)

### Step 2: Create 4 Tables
In the base, create these 4 tables with exact names:
1. `Suppliers`
2. `Supplier_Opportunities`
3. `Supplier_Applications`
4. `Communications`

### Step 3: Add Fields to Each Table

#### For Suppliers Table (20 fields):
Use the "Add field" button and create fields in this order:
- supplier_id (Text)
- legal_name (Text)
- contact_name (Text)
- business_email (Email)
- phone (Phone number)
- website (URL)
- sub_category (Single select) - Add options: Janitorial Services, HVAC, Plumbing, Electrical, Construction, Landscaping, Security, Other
- services_offered (Multiple select) - Add options: Deep Cleaning, Routine Cleaning, Commercial Cleaning, Post-Construction, Maintenance, Specialty Services
- preferred_counties (Multiple select) - Add options: Lee, Hillsborough, Pinellas, Duval, Miami-Dade, Polk, St. Lucie, Collier
- certification_status (Single select) - Add options: Not Certified, MBE, WBE, VOSB, HUBZone, GSA Schedule, State Contract, Multiple
- sam_gov_id (Text)
- cage_code (Text)
- availability_start_date (Date)
- estimated_annual_capacity_usd (Number)
- insurance_certificate_url (URL)
- registration_status (Single select) - Add options: Pending, Active, Inactive, Suspended, Approved
- registration_date (Date)
- last_activity_date (Date)
- password_hash (Text)
- notes (Long text)

#### For Supplier_Opportunities Table (11 fields):
- supplier_id (Text)
- opportunity_id (Text)
- opportunity_name (Text)
- agency (Text)
- contract_value_usd (Number)
- deadline (Date)
- match_score (Number)
- match_reason (Long text)
- status (Single select) - Add options: New, Matched, Applied, Won, Lost, Archived
- date_matched (Date)
- date_applied (Date)

#### For Supplier_Applications Table (8 fields):
- supplier_id (Text)
- supplier_name (Text)
- opportunity_id (Text)
- opportunity_name (Text)
- application_status (Single select) - Add options: Draft, Submitted, Under Review, Accepted, Rejected, Withdrawn
- application_date (Date)
- response_date (Date)
- notes (Long text)

#### For Communications Table (6 fields):
- supplier_id (Text)
- supplier_email (Email)
- email_type (Single select) - Add options: Opportunity Notification, Application Reminder, Feedback, Onboarding, Follow-up, System Alert
- email_subject (Text)
- sent_date (Date)
- open_status (Single select) - Add options: Sent, Delivered, Opened, Clicked, Bounced

### Step 4: Create Views (Optional but Recommended)
For better organization, create these views in each table:

**Suppliers:**
- All Suppliers
- Active
- GSA Schedule Holders
- By Category

**Supplier_Opportunities:**
- Active Opportunities
- Applied
- Won
- By Agency

**Supplier_Applications:**
- Pending Review
- Accepted
- Rejected
- By Supplier

**Communications:**
- Sent
- Opened
- By Type

### Step 5: Update .env with Base ID
1. Copy the Base ID from the Airtable URL
2. Update `.env` file:
   ```
   AIRTABLE_SUBS_BASE_ID=appYourActualBaseIDHere
   ```

## Verification Checklist

After manual setup, verify:

- [ ] Base "SUBS_STAGING" exists in Airtable
- [ ] Base ID is correct and in format `appXXXXXXXXXXXXXX`
- [ ] 4 tables exist with exact names: Suppliers, Supplier_Opportunities, Supplier_Applications, Communications
- [ ] All fields exist in each table with correct types
- [ ] All select field options are configured correctly
- [ ] AIRTABLE_SUBS_BASE_ID added to .env
- [ ] Views are created (if doing optional step)

## Testing the Schema

Run the setup script to display the schema documentation:
```bash
node scripts/setup-subs-staging.ts
```

This will output the complete schema for reference and verification.

## Next Steps (Task 2)

Once this base is created and .env is updated:
1. Task 2: Create database access layer (`services/airtable-subs.ts`)
2. Task 3: Implement supplier registration endpoints
3. Task 4: Build opportunity matching logic
4. And so on...

## Files Modified

- **Created:** `scripts/setup-subs-staging.ts` - Schema documentation and setup script
- **Modified:** `.env` - Added AIRTABLE_SUBS_BASE_ID placeholder
- **Created:** `TASK-1-SUBS-STAGING-SETUP.md` - This documentation file

## Important Notes

- All field names must match exactly (they are case-sensitive in code)
- The `password_hash` field is for internal use only - never expose in UI
- All date fields use ISO 8601 format
- Multi-select fields should have consistent option values
- Supplier IDs should follow a consistent format (e.g., SUP-001, SUP-002, etc.)

## Support

For field type reference:
- **Text:** Short text strings (max 255 chars)
- **Long text:** Longer content (no limit)
- **Email:** Email validation
- **URL:** URL validation
- **Phone number:** Phone number formatting
- **Date:** Date picker
- **Number:** Numeric values
- **Single select:** One option from list
- **Multiple select:** Multiple options from list

---

**Task Status:** Ready for manual Airtable setup  
**Expected Duration:** 15-20 minutes to set up manually  
**Blockers:** None  
**Next:** Update .env with base ID, then move to Task 2
