# Week 5 — Maravilla Intelligence Portal

## Context
Week 4 delivered analytics dashboards, CSV exports, and advanced filters. Week 5 focuses on bulk operations, enrichment, search, and mobile responsiveness—features that unlock productivity at scale.

---

## Task 14: Bulk Operations

### Bulk Status Updates
**File to create/modify:** `app/leads/page.tsx`, `app/api/bulk/route.ts`

- Add checkbox column to leads table (select multiple rows)
- Add "Bulk Actions" dropdown menu when rows selected: Change Stage, Add Tag, Change Score, Delete
- Create `POST /api/bulk` endpoint to batch-update Airtable records
- Endpoint accepts: `{ table: 'leads'|'contacts'|'opportunities', ids: string[], action: 'updateStage'|'deleteRecords'|'updateStatus', payload: any }`
- Fetch all selected record IDs, construct bulk Airtable update request (max 10 per batch), apply authMiddleware
- Show toast notification with count updated: "Updated 15 leads"
- Require user confirmation for destructive actions (delete)

### Bulk Export Enhancement
**File to modify:** `app/api/export/[table]/route.ts`

- Add support for `?ids=id1,id2,id3` query param to export only selected records
- If ids param present, filter records before CSV generation
- Useful when user selects rows and clicks "Export Selection"

---

## Task 15: Lead Scoring & Prioritization

### Lead Score Breakdown
**File to create:** `app/leads/[id]/page.tsx` (detail view)

- Add detail page route for individual lead
- Display full lead record with all fields
- Show score breakdown: components that make up the total score
  - GovCon Fit (0-30 points)
  - Commercial Fit (0-30 points)  
  - Signal Recency (0-20 points)
  - Contact Completeness (0-20 points)
- Show progress bars for each component
- Show related Contacts and Opportunities

**File to modify:** `app/api/leads/route.ts`

- Add `GET /api/leads/[id]` endpoint to fetch single lead with full details + related records
- Return: lead object + contacts array + opportunities array + score breakdown

### Auto-Scoring Rules
**File to create:** `app/lib/scoring.ts`

- Implement scoring algorithm:
  - Commercial Fit: if cleaning_keywords match + agency type = commercial → +30
  - GovCon Fit: if NAICS matches government contracts → +30
  - Signal Recency: days since signal < 7 → +20, < 30 → +15, < 90 → +10
  - Contact Complete: has decision_maker + email + phone → +20, partial → +10
- Export function to recompute all lead scores

---

## Task 16: Search & Smart Filtering

### Full-Text Search
**File to modify:** `app/leads/page.tsx`, `app/api/leads/route.ts`

- Add search input at top of page: "Search leads by name, agency, NAICS..."
- Implement SEARCH() formula in Airtable (searches across multiple fields):
  ```
  OR(
    SEARCH(LOWER(q), LOWER({entity_name})),
    SEARCH(LOWER(q), LOWER({agency})),
    SEARCH(LOWER(q), LOWER({location})),
    SEARCH(LOWER(q), LOWER({naics_codes}))
  )
  ```
- Same for contacts (search name, org, email) and opportunities (search title, agency, state)

### Saved Filters
**File to create/modify:** `app/lib/storage.ts`, lead/contact/opportunity pages

- Add "Save Filter" button next to active filters
- Store filter state in localStorage: `{ name: 'Hot Commercial Leads', filters: { stageFilter: 'Contact Found', scoreMin: 75 }, table: 'leads' }`
- Add "Filters" dropdown showing saved filters + quick-apply
- Allow delete/rename of saved filters
- Show "Last used: 2 days ago" next to each

---

## Task 17: Mobile Responsiveness

### Responsive Layout
**File to modify:** `app/globals.css`, all page components

- Update grid layouts to be 1-column on mobile (<640px), 2-3 columns on tablet (640px+)
- Make table horizontal-scrollable on mobile instead of collapsing columns
- Stack filter panel horizontally as scrollable pills on mobile
- Make buttons full-width on mobile for tap targets
- Test on actual devices: iPhone 12, iPad, Android

### Mobile Navigation
**File to modify:** `app/(root)/layout.tsx`

- Add hamburger menu for mobile (sidebar collapses to icon-only)
- Make header sticky so nav always visible
- Add breadcrumb trail on mobile for context

---

## Task 18: Contact Enrichment

### Manual Enrichment
**File to create:** `app/api/enrichment/route.ts`, `app/contacts/[id]/page.tsx`

- Add detail page for contact (similar to leads)
- Add "Enrich" button to fetch missing data:
  - Query publicly available sources (LinkedIn, Google, Crunchbase API if available)
  - Find alternative emails, phone numbers
  - Find company website, funding info
- Display: "Enriching..." → show newly found fields
- Save enriched data back to Airtable
- Show data source (e.g., "LinkedIn 2026-05-29")

### Match Score
**File to modify:** `app/api/contacts/route.ts`

- Add computed field: `match_score` = relevance to current opportunities
  - If contact's org matches any opportunity's agency → +50 points
  - If contact's title is decision role → +30 points
  - Total score 0-100
- Sort contacts by match_score descending by default
- Show score badge next to each contact in list

---

## Task 19: Quick Actions & Workflows

### One-Click Actions
**File to modify:** page components, `app/api/actions/route.ts`

- Add context menu (right-click) on any lead/contact/opportunity:
  - "Send Email" → open gmail compose with contact email
  - "Copy LinkedIn URL" → copy to clipboard
  - "Add to Watch" → create watch for this opportunity
  - "Create Task" → add to team task list
  - "Add to CRM" → if Salesforce/HubSpot integrated

### Quick Status Updates
**File to modify:** table UI

- Add inline status dropdown (no page navigation)
- Click dropdown → change status → auto-save with POST to `/api/leads/[id]`
- Show optimistic update (immediate UI change)

---

## Task 20: Dashboard Customization

### Role-Based Views
**File to create:** `app/dashboards/[role]/page.tsx`, `app/lib/dashboards.ts`

- Create role-specific dashboards:
  - **Sales**: New leads, recent signals, hot opportunities, conversion funnel
  - **Operations**: Active watches, matches queue, automation health
  - **Executive**: Revenue pipeline, top agencies, quarterly summary
- Store dashboard config in Airtable `Dashboards` table or localStorage
- Allow user to customize cards: drag-drop reorder, hide/show

### Custom Reports
**File to create:** `app/reports/page.tsx`, `app/api/reports/route.ts`

- Allow building custom reports: select table, filters, columns, date range
- Generate PDF report with charts
- Schedule report delivery (email weekly/monthly)
- Show report history with "View" / "Download" buttons

---

## Task 21: Performance & Caching

### Query Optimization
**File to modify:** all API routes

- Add database query profiling: log fetch time for each Airtable call
- Implement aggressive caching:
  - Leads list: `max-age=300` (5 min)
  - Analytics: `max-age=600` (10 min)
  - Contacts: `max-age=900` (15 min)
  - Add `stale-while-revalidate=2592000` (30 days)
- Add ISR (Incremental Static Regeneration) for static pages
- Batch Airtable requests: fetch only visible rows (pagination)

### Pagination Performance
**File to modify:** list pages

- Implement cursor-based pagination instead of offset
- Load more button (load 50 at a time) instead of "go to page 5"
- Infinite scroll option with IntersectionObserver

---

## Verification

- Bulk update 5 leads → all show updated status
- Save "Hot Leads" filter → appears in dropdown
- Search "govcon" → returns only government leads
- Open lead detail page → shows score breakdown + related records
- Click "Enrich" on contact → new fields populate
- Test on mobile: all pages render in 1 column, buttons tap-able
- Check build: zero TypeScript errors

---

## Priority Order

If not all tasks can fit Week 5, prioritize:
1. **Task 14** (Bulk Operations) — high ROI, frequently requested
2. **Task 15** (Scoring/Enrichment) — improves data quality
3. **Task 16** (Search) — improves UX significantly
4. **Task 17** (Mobile) — enables remote access
5. Tasks 18-21: Nice-to-have for following weeks
