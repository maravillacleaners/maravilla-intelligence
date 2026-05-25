# Phase 2 Setup Checklist

Quick reference for Phase 2 deployment. **Time: ~1-2 hours**

---

## ✅ Step 1: Airtable Base Setup (20 min)

- [ ] Create base named `SUBS_STAGING` at airtable.com
- [ ] Copy Base ID from URL (format: `appXXXXXXXXXXXXXX`)
- [ ] Create 4 tables:
  - [ ] `Suppliers` (20 fields)
  - [ ] `Supplier_Opportunities` (11 fields)
  - [ ] `Supplier_Applications` (8 fields)
  - [ ] `Communications` (6 fields)
- [ ] Add all required fields (see PHASE-2-SETUP-GUIDE.md for exact list)

**Result:** SUBS_STAGING base with 4 tables, 45 fields

---

## ✅ Step 2: Environment Variables (5 min)

Edit `.env`:

```env
# Airtable - Suppliers Portal
AIRTABLE_SUBS_BASE_ID=appXXXXXXXXXXXXXX

# SendGrid (optional but recommended)
EMAIL_SERVICE=sendgrid
EMAIL_API_KEY=SG.xxxxxx...
EMAIL_FROM=suppliers@maravillacleaners.com
```

- [ ] Add AIRTABLE_SUBS_BASE_ID (from Step 1)
- [ ] Add EMAIL_SERVICE=sendgrid (optional)
- [ ] Add EMAIL_API_KEY from SendGrid (optional)
- [ ] Verify JWT_SECRET_SUPPLIER exists

**Result:** Environment variables configured

---

## ✅ Step 3: SendGrid Setup (10 min) — Optional

- [ ] Create SendGrid account: https://sendgrid.com
- [ ] Settings → API Keys → Create API Key
- [ ] Copy key to `.env` as EMAIL_API_KEY
- [ ] Settings → Sender Authentication → Verify `suppliers@maravillacleaners.com`
- [ ] Click verification email link sent to that address

**Result:** SendGrid ready for email sending

---

## ✅ Step 4: Test Portal (30-45 min)

Start dev server:
```bash
npm run dev
```

### Test Registration
- [ ] Open: http://localhost:3000/suppliers/register
- [ ] Fill 5-step form with test data
- [ ] Submit → Check localStorage has `supplier_token`
- [ ] Check Airtable Suppliers table for new record

### Test Admin Approval
- [ ] Open: http://localhost:3000/admin/suppliers
- [ ] See pending supplier
- [ ] Click "Approve" → status changes to "Active"

### Test Login
- [ ] Logout (clear localStorage)
- [ ] Open: http://localhost:3000/suppliers/login
- [ ] Enter test credentials
- [ ] Verify dashboard loads with welcome message

### Test Profile Edit
- [ ] Open: http://localhost:3000/suppliers/profile
- [ ] Edit a field (phone, website, etc.)
- [ ] Click "Save Changes"
- [ ] Verify Airtable record updated

**Result:** All pages working, data persisted to Airtable

---

## ✅ Step 5: Validation Tests (5 min)

```bash
npx ts-node scripts/test-supplier-portal.ts
```

- [ ] Run test script
- [ ] All 7+ tests pass
- [ ] See "✅ All tests passed!"

**Result:** Code validation complete

---

## ✅ Step 6: Manual Security Check (5 min)

- [ ] Create 2 test suppliers (different emails)
- [ ] Login as supplier 1
- [ ] Try to access supplier 2's data: `/api/suppliers/{supplier2-id}`
- [ ] Verify: Returns **401 Unauthorized**

**Result:** Security isolation verified

---

## ✅ Step 7: n8n Workflows (Optional)

If using n8n:

- [ ] Deploy `n8n-workflows/flow-h-opportunity-matching.json`
- [ ] Deploy `n8n-workflows/flow-i-supplier-notifications.json`
- [ ] Test manual trigger → check Supplier_Opportunities table
- [ ] Verify emails appear in SendGrid Mail Activity

**Result:** Automated matching & notifications working

---

## ✅ Production Deployment (Optional)

When ready to go live:

- [ ] Choose hosting: Vercel (recommended) / Railway / Render
- [ ] Deploy with all environment variables
- [ ] Configure custom domain
- [ ] Update n8n webhook URLs to production domain
- [ ] Set up backups & monitoring
- [ ] Create support contact channel

**Result:** Portal live and accessible to suppliers

---

## 🧪 Testing Summary

| Test | Command | Expected |
|------|---------|----------|
| Automated tests | `npx ts-node scripts/test-supplier-portal.ts` | 7/7 pass ✅ |
| Dev server | `npm run dev` | Starts on :3000 ✅ |
| Registration | Visit `/suppliers/register` | 5-step form loads ✅ |
| Login | Visit `/suppliers/login` | Token created ✅ |
| Dashboard | After login | Welcome message shows ✅ |
| Data isolation | Cross-supplier API call | 401 Unauthorized ✅ |

---

## 🚨 Troubleshooting Quick Links

- **"Unauthorized" on login** → Check password_hash in Airtable
- **"Failed to create supplier"** → Check AIRTABLE_SUBS_BASE_ID in .env
- **Emails not sending** → Check EMAIL_API_KEY and sender verification
- **"supplier_token not defined"** → Logout/login to refresh token

See **PHASE-2-SETUP-GUIDE.md** for detailed troubleshooting.

---

## 📊 Success Criteria

All items checked = **Phase 2 Ready for Production**

| Item | Status |
|------|--------|
| SUBS_STAGING base created | ✅ Manual |
| Environment variables set | ✅ Manual |
| SendGrid configured (optional) | ⚠️ Optional |
| Registration tested | ✅ Manual |
| Login tested | ✅ Manual |
| Profile edit tested | ✅ Manual |
| Admin approval tested | ✅ Manual |
| Automated tests pass | ✅ Auto |
| Security isolation verified | ✅ Manual |
| n8n workflows deployed (optional) | ⚠️ Optional |
| Domain configured (optional) | ⚠️ Optional |

---

**Estimated Time:** 1-2 hours  
**Difficulty:** Low (mostly manual Airtable setup)  
**Result:** Fully functional supplier portal ready for beta testing

Start with Step 1 above ⬆️
