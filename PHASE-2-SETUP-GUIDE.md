# Phase 2: Supplier Portal — Setup & Deployment Guide

**Status:** Ready for deployment  
**Time Required:** ~1-2 hours (mostly manual setup)  
**Date:** 2026-05-25

---

## Step 1: Create SUBS_STAGING Airtable Base (20 min)

### 1.1 Create the Base

1. Go to https://airtable.com
2. Click **"+ Create"** → **"Create a new base"**
3. Select **"Start from scratch"**
4. Name it: **`SUBS_STAGING`**
5. Click **Create base**
6. Note the **Base ID** from URL (format: `appXXXXXXXXXXXXXX`)

### 1.2 Create Table 1: Suppliers

1. In SUBS_STAGING base, click **+ Add a table**
2. Name: **`Suppliers`**
3. Delete the default "Name" field
4. Add these fields with exact types:

| Field Name | Type | Options |
|---|---|---|
| legal_name | Single line text | - |
| contact_name | Single line text | - |
| business_email | Email | - |
| phone | Phone number | - |
| website | URL | - |
| sub_category | Single line text | - |
| services_offered | Multiple select | Janitorial, Landscaping, HVAC, Painting, Construction |
| preferred_counties | Multiple select | Lee, Collier, Hillsborough, Polk, Pinellas, Duval, Miami-Dade |
| certification_status | Single select | MBE, WBE, 8(a), HUBZone, None |
| sam_gov_id | Single line text | - |
| cage_code | Single line text | - |
| availability_start_date | Date | - |
| estimated_annual_capacity_usd | Currency | $ symbol, 0 decimals |
| insurance_certificate_url | URL | - |
| registration_status | Single select | Pending Review, Approved, Rejected, Active, Inactive |
| registration_date | Date | - |
| last_activity_date | Date | - |
| supplier_id | Single line text | - |
| password_hash | Single line text | - |
| notes | Long text | - |

### 1.3 Create Table 2: Supplier_Opportunities

1. Click **+ Add a table** → Name: **`Supplier_Opportunities`**
2. Add fields:

| Field Name | Type | Options |
|---|---|---|
| supplier_id | Single line text | - |
| opportunity_id | Single line text | - |
| opportunity_name | Single line text | - |
| agency | Single line text | - |
| contract_value_usd | Currency | $ symbol, 0 decimals |
| deadline | Date | - |
| match_score | Number | 0 decimals |
| match_reason | Long text | - |
| status | Single select | Available, Applied, Declined, Selected, Won |
| date_matched | Date | - |
| date_applied | Date | - |

### 1.4 Create Table 3: Supplier_Applications

1. Click **+ Add a table** → Name: **`Supplier_Applications`**
2. Add fields:

| Field Name | Type | Options |
|---|---|---|
| supplier_id | Single line text | - |
| supplier_name | Single line text | - |
| opportunity_id | Single line text | - |
| opportunity_name | Single line text | - |
| application_status | Single select | Submitted, Under Review, Accepted, Rejected, Withdrawn |
| application_date | Date | - |
| response_date | Date | - |
| notes | Long text | - |

### 1.5 Create Table 4: Communications

1. Click **+ Add a table** → Name: **`Communications`**
2. Add fields:

| Field Name | Type | Options |
|---|---|---|
| supplier_id | Single line text | - |
| supplier_email | Email | - |
| email_type | Single select | Welcome, Opportunity Notification, Application Status, Other |
| email_subject | Single line text | - |
| sent_date | Date | - |
| open_status | Single select | Sent, Opened, Clicked, Bounced |

### 1.6 Verify Setup

✓ You should have 4 tables with exact names:
- Suppliers (20 fields)
- Supplier_Opportunities (11 fields)
- Supplier_Applications (8 fields)
- Communications (6 fields)

---

## Step 2: Update Environment Variables

### 2.1 Add AIRTABLE_SUBS_BASE_ID

Edit `.env` file and add:

```env
AIRTABLE_SUBS_BASE_ID=appXXXXXXXXXXXXXX
```

Replace `appXXXXXXXXXXXXXX` with the actual Base ID from Step 1.6.

### 2.2 Verify Existing Variables

Make sure these are already set (from Phase 1):

```env
AIRTABLE_API_KEY=patXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX (Intelligence table)
JWT_SECRET_SUPPLIER=your-super-secret-key-min-32-chars
EMAIL_FROM=suppliers@maravillacleaners.com
```

---

## Step 3: Configure SendGrid (Optional but Recommended)

### 3.1 Get SendGrid API Key

1. Go to https://sendgrid.com
2. Sign up (free tier available: 100 emails/day)
3. Create API key:
   - Settings → API Keys → Create API Key
   - Name: `Maravilla Suppliers`
   - Permissions: Full Access (or Mail Send only)
4. Copy the key (you'll only see it once)

### 3.2 Add to .env

```env
EMAIL_SERVICE=sendgrid
EMAIL_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=suppliers@maravillacleaners.com
```

### 3.3 Verify Sender Email

1. In SendGrid, go to Settings → Sender Authentication
2. Add verified sender: `suppliers@maravillacleaners.com`
3. SendGrid will send verification email - click link to verify

**Note:** Without this, emails will fail with "403 Forbidden"

---

## Step 4: Test the Portal (End-to-End)

### 4.1 Start Development Server

```bash
npm run dev
```

Expected output:
```
> maravilla-intelligence@1.0.0 dev
> next dev

▲ Next.js 16.0.0
- Local:        http://localhost:3000
```

### 4.2 Test Supplier Registration

1. Navigate to: http://localhost:3000/suppliers/register
2. Fill out 5-step form:
   - **Step 1:** Legal name: "Test Company LLC", Category: "Janitorial"
   - **Step 2:** Contact: "John Test", Email: "test@example.com", Phone: "(239) 555-0100", Password: "TestPassword123"
   - **Step 3:** Services: Select "Janitorial", Counties: Select "Lee"
   - **Step 4:** (Skip - optional)
   - **Step 5:** Agree to terms, Submit

3. Expected result:
   - ✅ New supplier created in Airtable (Suppliers table)
   - ✅ registration_status = "Pending Review"
   - ✅ Redirected to /suppliers/dashboard
   - ✅ JWT token stored in localStorage

**Check Airtable:** Open Suppliers table → should see 1 new record

### 4.3 Test Admin Approval

1. Navigate to: http://localhost:3000/admin/suppliers
2. Should see your test supplier with "Pending Review" status
3. Click **"Approve"** button
4. Status should change to "Active"

**Check Airtable:** Refresh Suppliers table → registration_status = "Active"

### 4.4 Test Supplier Login

1. Logout (clear localStorage or restart browser)
2. Navigate to: http://localhost:3000/suppliers/login
3. Enter:
   - Email: `test@example.com`
   - Password: `TestPassword123`
4. Expected result:
   - ✅ Token retrieved
   - ✅ Redirected to /suppliers/dashboard
   - ✅ Welcome message shows "Test Company LLC"
   - ✅ Status badge shows "Active"

### 4.5 Test Profile Edit

1. From dashboard, click "Edit Profile"
2. Change phone to "(239) 555-0101"
3. Add website: "https://testcompany.com"
4. Click "Save Changes"
5. Expected result:
   - ✅ Success message appears
   - ✅ Fields updated in Airtable
   - ✅ last_activity_date set to today

### 4.6 Test Email Notifications (SendGrid only)

If SendGrid is configured:

1. Create test contract in Intelligence table (record_type='contract')
2. Run: `node n8n-workflows/flow-h-opportunity-matching.json` (manually or via n8n)
3. Check SendGrid dashboard:
   - Mail Activity → should show 1 sent email
   - Email should have subject: "New Opportunity: [opportunity_name]"

---

## Step 5: Validation Testing

### 5.1 Run Automated Tests

```bash
npx ts-node scripts/test-supplier-portal.ts
```

Expected output:
```
🧪 Running Supplier Portal Tests...

✓ Password hashing
✓ JWT token generation
✓ JWT token verification
✓ JWT token expiration handling
✓ Supplier database read/write
✓ Opportunity query functionality
✓ API endpoints connectivity

📊 Test Results:

Passed: 7/7
Success Rate: 100.0%

Total Duration: 245ms

✅ All tests passed!
```

### 5.2 Manual Security Test

Test that data isolation works:

1. Create 2 test suppliers (test1@example.com, test2@example.com)
2. Log in as test1
3. Try to directly access: http://localhost:3000/api/suppliers/{test2-id}
4. Expected: **401 Unauthorized** (cannot access another supplier's data)

### 5.3 Test n8n Workflows (Manual)

If using n8n:

1. Deploy flow-h-opportunity-matching.json to n8n
2. Trigger it manually
3. Check Supplier_Opportunities table for new matches
4. Deploy flow-i-supplier-notifications.json
5. Trigger it manually
6. Check SendGrid Mail Activity for emails sent

---

## Step 6: Deploy to Staging (Optional)

### 6.1 Choose Hosting

Options:
- **Vercel** (Recommended for Next.js)
- **Railway**
- **Render**
- **Self-hosted (VPS)**

### 6.2 Deploy with Vercel

```bash
npm install -g vercel
vercel login
vercel
```

Follow prompts:
1. Connect GitHub repo
2. Set environment variables in Vercel dashboard:
   - AIRTABLE_API_KEY
   - AIRTABLE_BASE_ID (Intelligence)
   - AIRTABLE_SUBS_BASE_ID
   - JWT_SECRET_SUPPLIER
   - EMAIL_SERVICE
   - EMAIL_API_KEY
   - EMAIL_FROM

3. Deploy
4. Update DNS to point to Vercel URL

### 6.3 Update n8n Webhooks

In n8n workflows, update callback URLs:
- Change: `http://localhost:3000`
- To: `https://your-domain.com`

---

## Step 7: Production Checklist

- [ ] SUBS_STAGING base created with 4 tables
- [ ] All 20+11+8+6 = 45 fields created
- [ ] AIRTABLE_SUBS_BASE_ID added to .env
- [ ] SendGrid configured (optional but recommended)
- [ ] Dev server tested end-to-end
- [ ] Registration workflow tested
- [ ] Login workflow tested
- [ ] Profile edit tested
- [ ] Admin approval tested
- [ ] Automated tests pass (7/7)
- [ ] Security isolation tested (401 on cross-access)
- [ ] n8n workflows ready (if using)
- [ ] Domain configured (if deploying)

---

## Troubleshooting

### "Unauthorized" on login

**Problem:** Cannot login even with correct credentials
**Solution:** 
- Check password_hash is saved in Suppliers table
- Verify bcryptjs comparison in suppliers-auth.ts
- Clear localStorage and try again

### "Failed to create supplier" on registration

**Problem:** Registration form submission fails
**Solution:**
- Check AIRTABLE_SUBS_BASE_ID is correct in .env
- Check Airtable API key has write permissions
- Check all 20 fields exist in Suppliers table with correct types

### Emails not sending

**Problem:** No emails received after n8n workflow runs
**Solution:**
- Verify EMAIL_SERVICE=sendgrid in .env
- Check EMAIL_API_KEY is valid (try in curl)
- Verify sender email is verified in SendGrid
- Check SendGrid Mail Activity for bounce/failure logs

### "supplier_token is not defined" errors

**Problem:** Dashboard/profile pages show auth errors
**Solution:**
- Make sure you logged in (check localStorage has supplier_token)
- Token might be expired - logout and login again
- Check JWT_SECRET_SUPPLIER is same as when token was created

---

## Next Steps After Setup

1. **Invite test suppliers** - Register 5-10 test accounts
2. **Create test contracts** - Add opportunities in Intelligence table
3. **Run n8n flows** - Test matching and notifications
4. **Gather feedback** - Test supplier experience
5. **Refine templates** - Adjust email content based on testing
6. **Scale to production** - Deploy with real domain

---

**Version:** 1.0  
**Updated:** 2026-05-25  
**Status:** Ready for Setup
