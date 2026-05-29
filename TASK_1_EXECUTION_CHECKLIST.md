# Phase 2 Task 1: Execution Checklist
## SUBS_STAGING Airtable Base & Tables Setup

**Task ID:** Phase 2 Task 1  
**Status:** Ready for Execution  
**Date:** 2026-05-25  
**Estimated Time:** 20-30 minutes  

---

## Pre-Execution Review

Before you start, verify you have everything needed:

- [ ] Airtable account (https://airtable.com)
- [ ] AIRTABLE_API_KEY in .env (already present)
- [ ] Node.js installed on your machine
- [ ] npm or yarn available
- [ ] This project cloned/downloaded
- [ ] Documentation files available

---

## Reading Checklist

Choose your learning path and check off as you read:

### Quick Path (15 minutes)
- [ ] Read SUBS_STAGING_CHEATSHEET.md (2 min)
- [ ] Review commands section (2 min)
- [ ] Understand 2 setup paths (3 min)
- [ ] Ready to execute (8 min)

### Standard Path (25 minutes)
- [ ] Read SUBS_STAGING_README.md (5 min)
- [ ] Read SUBS_STAGING_QUICK_START.md (5 min)
- [ ] Review field list (5 min)
- [ ] Ready to execute (10 min)

### Complete Path (45 minutes)
- [ ] Read SUBS_STAGING_README.md (5 min)
- [ ] Read SUBS_STAGING_SETUP_STATUS.md (10 min)
- [ ] Read SUBS_STAGING_QUICK_START.md (5 min)
- [ ] Review PHASE2_TASK1_COMPLETION_REPORT.md (10 min)
- [ ] Check SUBS_STAGING_CHEATSHEET.md (5 min)
- [ ] Ready to execute (10 min)

---

## Step-by-Step Execution Checklist

### Step 1: Create SUBS_STAGING Base (5 minutes)

- [ ] Go to https://airtable.com
- [ ] Click "Create" → "Create Base from scratch"
- [ ] Name it exactly: **SUBS_STAGING**
- [ ] Wait for base to load
- [ ] Copy Base ID from URL
  - Format should be: `appXXXXXXXXXXXXXX`
  - Save this somewhere (you'll need it soon)
- [ ] Verify it says "SUBS_STAGING" at the top

**Timestamp:** _________ (started)

### Step 2: Create 4 Empty Tables (3 minutes)

In your new SUBS_STAGING base:

- [ ] Click "Add a table"
- [ ] Create table #1: `Suppliers`
  - [ ] Exact name (case-sensitive)
- [ ] Create table #2: `Supplier_Opportunities`
  - [ ] Exact name with underscore
- [ ] Create table #3: `Supplier_Applications`
  - [ ] Exact name with underscore
- [ ] Create table #4: `Communications`
  - [ ] Exact name (case-sensitive)
- [ ] All 4 tables now exist and are empty

**Timestamp:** _________ (completed)

### Step 3A: Automated Field Creation (2 minutes) ⭐ RECOMMENDED

```bash
cd C:\Users\Rosan\maravilla-intelligence
npx ts-node scripts/auto-setup-subs-staging.ts appXXXXXXXXXXXXXX
```

Replace `appXXXXXXXXXXXXXX` with your actual Base ID from Step 1.

- [ ] Open terminal/command prompt
- [ ] Navigate to project directory
- [ ] Copy the command above with YOUR base ID
- [ ] Paste into terminal and press Enter
- [ ] Watch for progress output
- [ ] See "✅ Setup Complete!" message

Expected output:
```
📋 Setting up "Suppliers" table...
  ✓ Found table
  Adding 20 fields...
    ✓ supplier_id
    ✓ legal_name
    ... (more fields)

📋 Setting up "Supplier_Opportunities" table...
  ... (continues for other tables)

✅ Setup Complete!
```

- [ ] No errors in output
- [ ] All 4 tables show "✅ fields ready"

**Skip Step 3B if you completed 3A**  
**Timestamp:** _________ (completed)

---

### Step 3B: Manual Field Creation (15 minutes)

If you prefer to add fields manually or if automated failed:

- [ ] Open SUBS_STAGING_SETUP_STATUS.md
- [ ] For each table (Suppliers, Supplier_Opportunities, Supplier_Applications, Communications):
  - [ ] Open table in Airtable
  - [ ] Click "Add field" button
  - [ ] Add each field from the documentation
    - [ ] Field name (exact match)
    - [ ] Field type (Text, Email, Date, etc.)
    - [ ] Select options (if applicable)
  - [ ] Save field
  - [ ] Repeat for all fields in that table
- [ ] All 45 fields created:
  - [ ] 20 in Suppliers
  - [ ] 11 in Supplier_Opportunities
  - [ ] 8 in Supplier_Applications
  - [ ] 6 in Communications

**Skip this step if you completed 3A**  
**Timestamp:** _________ (completed)

---

### Step 4: Update .env File (2 minutes)

- [ ] Open `.env` file in your editor
- [ ] Find this line:
  ```
  AIRTABLE_SUBS_BASE_ID=appZhXnyFiKbnOZLr
  ```
- [ ] Replace the Base ID with YOUR actual Base ID:
  ```
  AIRTABLE_SUBS_BASE_ID=appXXXXXXXXXXXXXX
  ```
- [ ] Make sure format is correct (starts with "app")
- [ ] Save the file
- [ ] Verify the change was saved

**Timestamp:** _________ (completed)

---

### Step 5: Verify Setup (2 minutes)

Run the verification script:

```bash
npx ts-node scripts/verify-subs-staging.ts
```

Expected output includes:
- [ ] "✓ Found SUBS_STAGING base"
- [ ] "✓ Suppliers exists"
- [ ] "✓ Supplier_Opportunities exists"
- [ ] "✓ Supplier_Applications exists"
- [ ] "✓ Communications exists"
- [ ] "✓ All field verification lines"
- [ ] "✓ Test records passed"
- [ ] "✅ SUBS_STAGING base is ready!"

If you see any ✗ or ❌:
- [ ] Check error message
- [ ] Review SUBS_STAGING_SETUP_STATUS.md troubleshooting
- [ ] Fix the issue
- [ ] Re-run verification

**Timestamp:** _________ (completed)

---

## Post-Execution Checklist

After verification shows ✅ "SUBS_STAGING base is ready!":

- [ ] Note the Base ID shown in output
- [ ] Confirm .env has correct Base ID
- [ ] All 4 tables exist in Airtable
- [ ] All 45 fields are present
- [ ] Test records passed
- [ ] No errors in console

---

## Validation Checklist

Complete validation by checking:

### In Airtable (Manual Verification)

- [ ] Go to https://airtable.com
- [ ] Open SUBS_STAGING base
- [ ] For each table, verify:
  - [ ] `Suppliers` table exists with 20 fields
  - [ ] `Supplier_Opportunities` table exists with 11 fields
  - [ ] `Supplier_Applications` table exists with 8 fields
  - [ ] `Communications` table exists with 6 fields
- [ ] Open each table and scroll through fields:
  - [ ] Field names match exactly
  - [ ] Field types are correct
  - [ ] Select options are populated

### In Code (Automated Verification)

- [ ] Run: `npx ts-node scripts/verify-subs-staging.ts`
- [ ] Output shows: ✓ Suppliers exists
- [ ] Output shows: ✓ Supplier_Opportunities exists
- [ ] Output shows: ✓ Supplier_Applications exists
- [ ] Output shows: ✓ Communications exists
- [ ] Output shows: ✓ All field verification lines
- [ ] Output shows: ✓ Test records: ✓ Passed
- [ ] Output shows: ✅ SUBS_STAGING base is ready!

### In Environment

- [ ] `.env` file updated with correct Base ID
- [ ] Base ID format is correct (appXXXXXXXXXXXXXX)
- [ ] No typos in Base ID
- [ ] File saved

---

## Troubleshooting Checklist

If something goes wrong, work through this:

### Verification fails with "Base not found"
- [ ] Check Base ID in .env is correct
- [ ] Go to Airtable and copy Base ID again
- [ ] Make sure it starts with "app"
- [ ] Update .env
- [ ] Re-run verification

### Verification shows "Some required tables"
- [ ] Go to SUBS_STAGING base in Airtable
- [ ] Check table names (case-sensitive):
  - [ ] `Suppliers` (not "supplier")
  - [ ] `Supplier_Opportunities` (with underscore)
  - [ ] `Supplier_Applications` (with underscore)
  - [ ] `Communications`
- [ ] If missing, create the missing table
- [ ] Re-run verification

### Verification shows "Some required fields"
- [ ] Go to the table in Airtable
- [ ] Check field names match exactly
- [ ] If using automated, re-run auto-setup
- [ ] If manual, check SUBS_STAGING_SETUP_STATUS.md
- [ ] Add any missing fields
- [ ] Re-run verification

### Automated setup fails with "API Error"
- [ ] Check AIRTABLE_API_KEY in .env
- [ ] Verify API key is correct (starts with "pat")
- [ ] Ensure tables are empty before running
- [ ] Check Airtable plan (Pro may be required for Fields API)
- [ ] Try manual setup instead

### Automated setup says fields "already exist"
- [ ] This is normal and safe
- [ ] Script skips existing fields
- [ ] Verification will still pass
- [ ] No action needed

---

## Success Indicators

You're done when you see ALL of these:

- [ ] ✅ "SUBS_STAGING base is ready!" message
- [ ] ✓ Base ID format: appXXXXXXXXXXXXXX
- [ ] ✓ Tables found: 4/4
- [ ] ✓ Fields verified: ✓ All
- [ ] ✓ Test records: ✓ Passed
- [ ] No error messages in console
- [ ] SUBS_STAGING base visible in Airtable UI
- [ ] All 4 tables visible in base
- [ ] .env updated with correct Base ID

---

## Timeline Log

Track your progress:

| Step | Start Time | End Time | Duration | Status |
|------|-----------|----------|----------|--------|
| Pre-check | _________ | _________ | _______ | [ ] ✓ |
| Reading | _________ | _________ | _______ | [ ] ✓ |
| Create base | _________ | _________ | _______ | [ ] ✓ |
| Create tables | _________ | _________ | _______ | [ ] ✓ |
| Add fields | _________ | _________ | _______ | [ ] ✓ |
| Update .env | _________ | _________ | _______ | [ ] ✓ |
| Verify | _________ | _________ | _______ | [ ] ✓ |
| **TOTAL** | _________ | _________ | _______ | [ ] ✓ |

---

## Common Questions

**Q: Can I use the existing appZhXnyFiKbnOZLr base?**  
A: No, SUBS_STAGING must be a new, separate base.

**Q: Do I need Airtable Pro?**  
A: Free tier works for basic setup. Pro may be needed for automated field creation.

**Q: What if manual setup takes longer?**  
A: That's fine. Accuracy is more important than speed.

**Q: Can I skip field creation?**  
A: No, all 45 fields are required for Task 2+ to work.

**Q: What if verification fails?**  
A: See troubleshooting section above or check SUBS_STAGING_SETUP_STATUS.md.

**Q: When do I proceed to Task 2?**  
A: Only after verification shows ✅ "SUBS_STAGING base is ready!"

---

## Resources During Execution

Have these open:
- [ ] SUBS_STAGING_QUICK_START.md (reference)
- [ ] SUBS_STAGING_SETUP_STATUS.md (detailed help)
- [ ] SUBS_STAGING_CHEATSHEET.md (quick commands)
- [ ] This checklist

---

## After Task 1 Completion

Once verification passes ✅:

- [ ] Note down the Base ID
- [ ] Share SUBS_STAGING_README.md with team
- [ ] Commit .env changes to git
- [ ] Proceed to Task 2: Create database access layer
- [ ] See PHASE2_TASK1_COMPLETION_REPORT.md for next steps

---

## Handoff Checklist

Before moving to Task 2:

- [ ] SUBS_STAGING base exists in Airtable
- [ ] All 4 tables created with correct names
- [ ] All 45 fields added with correct types
- [ ] AIRTABLE_SUBS_BASE_ID in .env is correct
- [ ] Verification script passes with ✅
- [ ] No error messages
- [ ] Team is aware of new base

---

## Sign-Off

**Task 1: SUBS_STAGING Base Setup**

- [ ] All steps completed
- [ ] Verification passed ✅
- [ ] Ready for Task 2
- [ ] Date completed: _________
- [ ] Time taken: _________

**Next Task:** Phase 2 Task 2 - Create database access layer

---

**Checklist Version:** 1.0  
**Last Updated:** 2026-05-25  
**Status:** Ready for use

---

## Notes & Observations

Use this space to record any issues or notes:

```
[Your notes here]
```

---

**Good luck! You've got this. 🚀**

See SUBS_STAGING_QUICK_START.md to begin.
