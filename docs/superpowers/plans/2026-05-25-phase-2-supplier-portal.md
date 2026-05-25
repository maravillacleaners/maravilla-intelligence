# Phase 2: Supplier Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive self-service supplier portal where subcontractors can register, manage profiles, view opportunities, and receive automated notifications—integrating with existing subcontractor discovery (Flow B).

**Architecture:** Suppliers are discovered automatically via Flow B (USASpending) and stored in the Intelligence table. The portal adds a self-service registration flow, supplier authentication, and a dedicated SUBS_STAGING Airtable base to manage supplier profiles, capabilities, and opportunity matching. Suppliers can accept/decline opportunities, which feeds back to the main system for team follow-up.

**Tech Stack:** Next.js 16 (frontend), Node.js (API), Airtable (SUBS_STAGING base for suppliers), JWT authentication, n8n (opportunity matching workflows), SendGrid (email notifications).

---

## File Structure

### Airtable Setup (SUBS_STAGING Base)
- **Suppliers table** (20 fields) — core supplier data, contact, capabilities, certifications
- **Supplier_Opportunities table** — tracks which opportunities are available to which suppliers
- **Supplier_Applications table** — supplier responses (applied/declined/interested)
- **Communications table** — email/notification history

### Frontend Pages & Components
- `/app/suppliers/layout.tsx` — Supplier portal layout (header, nav, protected routes)
- `/app/suppliers/register/page.tsx` — 5-step registration form (company → contact → services → documents → confirm)
- `/app/suppliers/login/page.tsx` — Supplier email/password login
- `/app/suppliers/dashboard/page.tsx` — Supplier home (profile status, opportunities count, notifications)
- `/app/suppliers/profile/page.tsx` — Edit profile, upload documents (insurance, certifications)
- `/app/suppliers/opportunities/page.tsx` — List available opportunities, apply/decline
- `/app/suppliers/applications/page.tsx` — View submitted applications and their status

### API Endpoints
- `/app/api/suppliers/register` — POST: create new supplier account
- `/app/api/suppliers/login` — POST: authenticate supplier, return JWT token
- `/app/api/suppliers/verify-email` — GET: email verification link
- `/app/api/suppliers/{id}` — GET/PUT: view/update supplier profile
- `/app/api/suppliers/{id}/opportunities` — GET: list opportunities for supplier (filtered by category/location)
- `/app/api/suppliers/{id}/applications` — GET/POST: view applications or submit new application
- `/app/api/admin/suppliers` — GET/PUT: admin supplier management

### Libraries & Utilities
- `/lib/suppliers-auth.ts` — JWT token generation/validation, supplier session management
- `/lib/suppliers-client.ts` — Airtable SUBS_STAGING client (read/write suppliers, opportunities, applications)
- `/lib/suppliers-email.ts` — Email templates for supplier notifications
- `/config/suppliers-config.ts` — Supplier portal configuration (API keys, email settings, opportunity matching rules)

### n8n Workflows
- `n8n-workflows/flow-h-opportunity-matching.json` — Daily 9 AM ET: match new Intelligence contracts to qualified suppliers, create Supplier_Opportunities records
- `n8n-workflows/flow-i-supplier-notifications.json` — Hourly: send email notifications to suppliers about new matching opportunities

### Documentation
- `/docs/SUPPLIERS.md` — Complete supplier portal user guide (registration, profile, opportunities, applications)

---

## Task Breakdown

### Task 1: Create SUBS_STAGING Airtable Base & Tables (20 min)

**Files:**
- Create: `scripts/setup-subs-staging.ts`
- Modify: `.env` (add AIRTABLE_SUBS_BASE_ID)

**Steps:**
1. Create SUBS_STAGING base in Airtable UI
2. Manually create 4 tables: Suppliers, Supplier_Opportunities, Supplier_Applications, Communications
3. Add all fields with proper types (see field schema in code below)
4. Add AIRTABLE_SUBS_BASE_ID to .env
5. Verify tables exist via API call

**Key Fields:**
- **Suppliers**: legal_name, contact_name, business_email, phone, website, sub_category, services_offered (multiselect), preferred_counties (multiselect), certification_status, sam_gov_id, cage_code, availability_start_date, estimated_annual_capacity_usd, insurance_certificate_url, registration_status, registration_date, last_activity_date, supplier_id, password_hash, notes
- **Supplier_Opportunities**: supplier_id, opportunity_id, opportunity_name, agency, contract_value_usd, deadline, match_score, match_reason, status, date_matched, date_applied
- **Supplier_Applications**: supplier_id, supplier_name, opportunity_id, opportunity_name, application_status, application_date, response_date, notes
- **Communications**: supplier_id, supplier_email, email_type, email_subject, sent_date, open_status

---

### Task 2: Create Supplier Authentication Library (15 min)

**Files:**
- Create: `lib/suppliers-auth.ts`
- Create: `config/suppliers-config.ts`
- Modify: `.env` (add JWT_SECRET_SUPPLIER)

**Key Functions:**
- `hashPassword()` — bcryptjs hash
- `verifyPassword()` — bcryptjs compare
- `generateToken()` — JWT creation (30-day expiry)
- `verifyToken()` — JWT validation
- `getSupplierFromRequest()` — extract JWT from Authorization header
- `generateVerificationCode()` — 6-char code for email verification

**Configuration:**
- JWT_EXPIRY = 30 days
- PASSWORD_MIN_LENGTH = 8 characters
- OPPORTUNITY_MATCHING rules (category required, location preferred, certification bonus)

---

### Task 3: Create Suppliers Airtable Client (20 min)

**Files:**
- Create: `lib/suppliers-client.ts`

**Key Functions:**
- `createSupplier()` — POST new supplier to SUBS_STAGING
- `getSupplierById()` — fetch by supplier_id
- `getSupplierByEmail()` — fetch by business_email (for login)
- `updateSupplier()` — update profile (sets last_activity_date automatically)
- `getOpportunitiesForSupplier()` — fetch with optional status filter
- `createSupplierOpportunity()` — create opportunity match
- `createSupplierApplication()` — create application record
- `getApplicationsForSupplier()` — fetch supplier's applications

**Interfaces:**
- `Supplier` — includes all 20 fields
- `SupplierOpportunity` — match record
- `SupplierApplication` — application record

---

### Task 4: Create Supplier Registration Form (40 min)

**Files:**
- Create: `app/suppliers/register/page.tsx`
- Create: `app/suppliers/layout.tsx`

**5-Step Flow:**
1. **Company** — legal_name, website, sub_category
2. **Contact** — contact_name, business_email, phone, password (8+ chars)
3. **Services** — services_offered (multiselect), preferred_counties (multiselect), estimated_annual_capacity_usd
4. **Documents** — certification_status, sam_gov_id, cage_code, insurance_certificate_url (all optional)
5. **Confirm** — review summary, agree to terms, submit

**Features:**
- Step indicator (1/5, 2/5, etc.)
- Client-side validation per step
- Back button (disabled on step 1)
- Next button (validates current step)
- Submit button on step 5 (calls /api/suppliers/register)
- Error messages for validation failures
- Stores token in localStorage after successful registration
- Redirects to /suppliers/dashboard

---

### Task 5: Create Supplier Registration API (25 min)

**Files:**
- Create: `app/api/suppliers/register/route.ts`

**Endpoint:** POST /api/suppliers/register

**Request Body:**
```json
{
  "legal_name": "Acme Janitorial Services LLC",
  "contact_name": "John Smith",
  "business_email": "john@acme.com",
  "phone": "(239) 555-0100",
  "password": "password123",
  "website": "https://acme.com",
  "sub_category": "Janitorial",
  "services_offered": ["Janitorial", "Landscaping"],
  "preferred_counties": ["Lee", "Collier"],
  "estimated_annual_capacity_usd": 500000,
  "certification_status": "MBE",
  "sam_gov_id": "xxxxx",
  "cage_code": "xxxxx",
  "insurance_certificate_url": "https://"
}
```

**Logic:**
1. Validate all required fields (legal_name, contact_name, business_email, phone, password)
2. Check if supplier already exists (query by business_email)
3. Hash password with bcryptjs (10 rounds)
4. Create supplier in SUBS_STAGING with registration_status='Pending Review'
5. Generate JWT token
6. Return: `{ success: true, token, supplier_id }`

**Error Handling:**
- 400: Missing required fields
- 409: Email already registered
- 500: Database error

---

### Task 6: Create Supplier Login Page & API (30 min)

**Files:**
- Create: `app/suppliers/login/page.tsx`
- Create: `app/api/suppliers/login/route.ts`

**Login Page:**
- Email input
- Password input
- "Login" button
- "New supplier?" link to /suppliers/register
- Error message display
- Loading state

**Login API:** POST /api/suppliers/login
- Request: `{ business_email, password }`
- Validate email/password
- Fetch supplier by email from SUBS_STAGING
- Compare password with hash
- Generate JWT token
- Return: `{ success: true, token, supplier_id, legal_name }`

**Page Logic:**
- Submit form → POST /api/suppliers/login
- Store token in localStorage
- Redirect to /suppliers/dashboard
- Add route protection (check for token before rendering)

---

### Task 7: Create Supplier Dashboard (35 min)

**Files:**
- Create: `app/suppliers/dashboard/page.tsx`

**Protected Route:**
- Check for supplier_token in localStorage
- Redirect to /suppliers/login if missing
- Decode JWT to get supplier_id

**Dashboard Features:**
- Welcome message ("Welcome back, [company_name]!")
- Status badge (Pending Review / Approved / Active)
- KPI cards:
  - Available Opportunities (count)
  - Submitted Applications (count)
  - Unread Notifications (count)
- Recent Opportunities section (last 3, with Apply button)
- Recent Applications section (last 3, with status)
- Quick Actions:
  - View All Opportunities
  - View All Applications
  - Edit Profile
  - Download Documents
- Unread notifications list

**Data Fetching:**
- GET /api/suppliers/{id} — fetch supplier profile
- GET /api/suppliers/{id}/opportunities?status=Available — list opportunities
- GET /api/suppliers/{id}/applications — list applications

---

### Task 8: Create Supplier Profile Management (30 min)

**Files:**
- Create: `app/suppliers/profile/page.tsx`
- Create: `app/api/suppliers/{id}/route.ts` (PUT endpoint)

**Profile Page:**
- Display all supplier fields in edit form
- Editable fields: contact_name, phone, website, services_offered, preferred_counties, estimated_annual_capacity_usd, notes
- Read-only fields: legal_name, business_email (can change via email verification workflow)
- Document upload section:
  - Insurance certificate
  - Certifications
  - Other documents
- Save changes button (calls PUT endpoint)
- Change password button (separate flow)

**API PUT /api/suppliers/{id}:**
- Validate JWT token
- Update fields in SUBS_STAGING
- Set last_activity_date = today
- Return updated supplier object

---

### Task 9: Create Opportunities Listing Page (30 min)

**Files:**
- Create: `app/suppliers/opportunities/page.tsx`

**Features:**
- List all opportunities matching supplier's category/location
- Filter by:
  - Status (Available / Applied / Declined / Selected)
  - County
  - Contract value (slider)
  - Agency
- Search by opportunity name
- Sort by: Deadline (soon), Contract Value (high), Match Score (high)
- Cards showing:
  - Opportunity name
  - Agency
  - Deadline
  - Contract value
  - Match score / reason
  - Apply button (if Available)
  - View details link

**Data Fetching:**
- GET /api/suppliers/{id}/opportunities?status=Available&county=Lee — filtered opportunities
- On apply: POST /api/suppliers/{id}/applications with opportunity_id

---

### Task 10: Create Applications Tracking Page (20 min)

**Files:**
- Create: `app/suppliers/applications/page.tsx`

**Features:**
- Table showing all supplier applications
- Columns: Opportunity, Agency, Applied Date, Status, Response Date, Actions
- Status badges (Submitted / Under Review / Accepted / Rejected / Withdrawn)
- Filter by status
- Search by opportunity name
- View details → opens modal with:
  - Opportunity details
  - Application message (if any)
  - Status timeline
  - Next steps (if applicable)
- Withdraw application button (if Submitted)

**Data Fetching:**
- GET /api/suppliers/{id}/applications

---

### Task 11: Create n8n Opportunity Matching Flow (40 min)

**Files:**
- Create: `n8n-workflows/flow-h-opportunity-matching.json`

**Trigger:** Daily at 9 AM ET

**Logic:**
1. Fetch new contracts from Intelligence table (record_type='contract', date_created >= yesterday)
2. For each contract, get: opportunity_id, opportunity_name, agency, deadline, estimated_value, service_category
3. Query Suppliers table: filter by sub_category matching contract service_category
4. For each matching supplier:
   a. Check preferred_counties match contract location (preferred = bonus)
   b. Calculate match_score (0-100):
      - Category match = 60 points
      - Location match = 20 points
      - Certification match = 10 points
      - Capacity sufficient = 10 points
   c. Create Supplier_Opportunities record with match_score
5. Log results: X suppliers matched for Y opportunities

**Output:** Supplier_Opportunities table updated with new matches

---

### Task 12: Create n8n Notification Flow (35 min)

**Files:**
- Create: `n8n-workflows/flow-i-supplier-notifications.json`

**Trigger:** Hourly

**Logic:**
1. Fetch new Supplier_Opportunities records (status='Available', not yet notified)
2. For each opportunity:
   a. Get supplier email
   b. Check notification preference (daily/immediate)
   c. Build email:
      - Opportunity name, agency, deadline
      - Contract value, location
      - Match score & reason
      - Link to dashboard to apply
   d. Send via SendGrid
   e. Create Communications record (email_type='Opportunity Notification')
3. Update Supplier_Opportunities (status='Notified')
4. Log: X emails sent

**Email Template:**
```
Subject: New Opportunity: [opportunity_name]

Hi [contact_name],

We found a new opportunity that matches your services:

Opportunity: [opportunity_name]
Agency: [agency]
Location: [county]
Deadline: [deadline]
Estimated Value: $[value]
Match Score: [match_score]%

Reason we matched you: [match_reason]

[APPLY NOW BUTTON] https://suppliers.maravillacleaners.com/suppliers/opportunities

Questions? Reply to this email.

Best regards,
Maravilla Intelligence Team
```

---

### Task 13: Create Supplier Admin Management Page (25 min)

**Files:**
- Create: `app/api/admin/suppliers/route.ts`
- Create: `app/admin/suppliers/page.tsx` (or extend existing admin dashboard)

**Admin Endpoints:**
- GET /api/admin/suppliers — list all suppliers (paginated)
- PUT /api/admin/suppliers/{id} — approve/reject registration
- DELETE /api/admin/suppliers/{id} — deactivate supplier

**Admin Page Features:**
- Table of pending suppliers (registration_status='Pending Review')
- Columns: Company, Contact, Email, Category, Services, Submitted Date, Action
- Approve button → sets status='Active', sends welcome email
- Reject button → sets status='Rejected', sends rejection email
- View supplier details → modal with all profile info
- Deactivate supplier → sets status='Inactive', stops future notifications

---

### Task 14: Create Email Templates Library (20 min)

**Files:**
- Create: `lib/suppliers-email.ts`

**Email Templates:**
1. **Welcome** — after successful registration (pending review)
2. **Approved** — when admin approves supplier
3. **Rejected** — when admin rejects
4. **Opportunity Notification** — new matching opportunity
5. **Application Confirmation** — when supplier applies
6. **Application Status** — when opportunity status changes
7. **Reactivation** — when supplier reactivated

**Template Engine:**
- Use SendGrid template IDs or build with Handlebars
- Variables: [company_name], [contact_name], [opportunity_name], [deadline], [value], etc.
- Base URL: https://suppliers.maravillacleaners.com

---

### Task 15: Create Supplier Portal Documentation (20 min)

**Files:**
- Create: `docs/SUPPLIERS.md`

**Sections:**
1. **Getting Started** — Registration workflow, login, account setup
2. **Dashboard** — What you see, KPIs, notifications
3. **Opportunities** — Browse, match score explanation, applying
4. **Applications** — Tracking status, next steps
5. **Profile Management** — Updating info, documents, certifications
6. **Best Practices** — How to increase match score, response time tips
7. **FAQ** — Common questions
8. **Support** — Contact information

---

### Task 16: Validation & Testing (30 min)

**Files:**
- Create: `scripts/test-supplier-portal.ts`

**Test Scenarios:**
1. Register new supplier → verify in SUBS_STAGING
2. Login with correct/incorrect credentials → verify token
3. Create opportunity match → verify in Supplier_Opportunities
4. Send opportunity notification → verify email
5. Apply to opportunity → verify in Supplier_Applications
6. Admin approve supplier → verify status change
7. Update profile → verify fields updated, last_activity_date set
8. List opportunities by category → verify filtering

**Expected Results:**
- All APIs return correct status codes
- Airtable records created properly
- JWT tokens valid and non-expired
- Emails sent successfully

---

## Summary

**Total Files:** 25+ (pages, components, APIs, libraries, workflows, docs)

**Timelines:**
- Task 1-4: ~2 hours (setup, auth, client, form)
- Task 5-10: ~2.5 hours (APIs, pages)
- Task 11-14: ~2 hours (workflows, admin, templates)
- Task 15-16: ~1 hour (docs, testing)

**Total: ~7.5 hours of focused development**

**Production Ready:**
- ✅ Supplier self-registration flow
- ✅ Email verification & password hashing
- ✅ Opportunity matching automation
- ✅ Notification emails
- ✅ Admin management
- ✅ Full documentation

**Next Phase (Phase 3):**
- Payment setup (Stripe for 1099 suppliers)
- Contract upload & review
- Prime/sub teaming recommendations
- Performance ratings & feedback

---

## Execution: Choose Your Approach

**Plan complete and saved to `docs/superpowers/plans/2026-05-25-phase-2-supplier-portal.md`**

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for comprehensive implementation with quality gates.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints. Best for real-time feedback and adjustments.

**Which approach do you prefer?**
