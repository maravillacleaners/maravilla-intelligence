# Maravilla Intelligence — Feature Documentation

**Last Updated:** 2026-05-25  
**Version:** 1.0.0

---

## 📱 Dashboard Pages

### 1. 👥 Prospects (`/prospects`)
**Purpose:** Browse, view, and approve qualified commercial prospects

**Features:**
- List of all prospects with score, priority, status
- Detailed view panel with full company information
- Approve button → Syncs to GHL + updates status to "approved"
- Toast notifications for actions
- Responsive grid layout (1/3 list, 2/3 detail)

**Data Fields Displayed:**
- Legal Name, Score (0-100), Priority (high/medium/low)
- Pipeline Status (pending → qualified → approved)
- Icebreaker (first contact message)
- Business Email, Phone, Website

**Typical Workflow:**
1. View prospects sorted by score
2. Click prospect → See full details + icebreaker
3. Click "Approve" → Creates GHL contact + sets status to "approved"
4. Toast confirms action

---

### 2. 📄 Contracts (`/contracts`)
**Purpose:** Track and manage federal contract opportunities from SAM.gov

**Features:**
- Browse all discovered federal contracts
- Filter by agency, value, deadline
- Copy teaming email draft to clipboard
- View estimated contract value in millions
- Status tracking (pending → contacted → interested)

**Data Fields:**
- Contract Title (from SAM.gov)
- Agency Name
- Estimated Obligated Amount ($M)
- Score (fit to your capabilities)
- Deadline / Event Date
- Teaming Email Draft (pre-written for outreach)

**Typical Workflow:**
1. View contracts ordered by opportunity value
2. Select contract → See teaming email template
3. Click "Copy" → Email ready to send
4. Use email to reach out to prime contractor or agency

---

### 3. 🏗️ Subcontractors (`/subs`)
**Purpose:** Manage subcontractor partners for federal teaming

**Features:**
- List of identified subcontractors
- View by location (county)
- Category breakdown (Janitorial, Landscaping, Security, etc.)
- Contact information (email, phone)
- Fit score % with progress bar
- "Contact Subcontractor" call-to-action

**Data Fields:**
- Legal Name
- County / Location
- Sub Category
- Email, Phone
- Fit Score (0-100%)
- Priority (high/medium/low)

**Typical Workflow:**
1. Browse subcontractors by category
2. Check fit score and contact info
3. Click "Contact Subcontractor" → Initiates outreach

---

### 4. 📈 Analytics (`/analytics`)
**Purpose:** Dashboard metrics and insights on discovery pipeline

**Features:**
- **KPI Cards:**
  - Total Records (prospects + contracts + subs)
  - Average Score (weighted fit)
  - High Priority Count (score 75+)
  - Top Opportunity Value (largest contract)

- **Score Distribution:**
  - Visual breakdown: High / Medium / Low
  - % of prospects in each tier
  - Progress bars for easy scanning

- **By ICP Segment:**
  - Count of prospects per segment
  - Federal, State, Local, Tribal, etc.

- **Pipeline Status:**
  - Prospects by stage
  - Pending → Contacted → Interested → Qualified → Approved

- **Top Opportunities:**
  - List of largest federal contracts
  - Agency, value, opportunity size

**API Endpoint:** `GET /api/analytics`
- Returns JSON with all metrics
- Data auto-updates from Airtable Intelligence table

---

### 5. ⚙️ Runs (`/runs`)
**Purpose:** Monitor n8n workflow executions and job history

**Features:**
- List of recent workflow runs (Flow 0-E)
- Status badges (success, failed, running)
- Metrics per run:
  - Records processed
  - Records added to database
  - Execution time (seconds)
  - Timestamp

- **Detail View:**
  - Full execution log
  - Success rate percentage
  - Error messages (if failed)
  - "View Full Log" → Opens n8n dashboard
  - "Retry" → Re-runs failed workflow

**Current Mock Data:**
- Flow C - Federal Contracts (success)
- Flow A - Client Discovery (success)
- Flow B - Subcontractor Discovery (success)
- Flow D - Compliance Check (failed example)

**Integration:** Connects to n8n API when deployed

---

### 6. ⚙️ Settings (`/settings`)
**Purpose:** System configuration and integration setup

**Features:**
- **System Configuration:**
  - Primary NAICS code (561720 for Janitorial)
  - Claude model selection (Opus, Sonnet, Haiku)
  - Daily processing budget limit ($)

- **GHL Integration:**
  - GHL Location ID configuration
  - Auto-Approve threshold (0-100)
  - "Test GHL Connection" button

- **Notifications:**
  - Email on workflow completion
  - Slack alerts on errors

- **Data Management:**
  - Export all data (CSV)
  - Sync records from Airtable
  - Clear local cache

- **System Status:**
  - Dashboard health
  - Airtable API connection
  - Claude API availability
  - GHL integration status

**Typical Workflow:**
1. Enter GHL Location ID
2. Set auto-approve threshold (e.g., 85)
3. Enable notifications
4. Save → All settings persist to localStorage

---

## 🔌 API Endpoints

### `/api/enrich` (POST)
**Purpose:** Enrich prospect company data

**Request:**
```json
{
  "legal_name": "Company LLC",
  "business_email": "contact@company.com",
  "website": "https://company.com",
  "county": "Miami-Dade"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "legal_name": "Company LLC",
    "employees_estimate": 125,
    "revenue_estimate": "$10M - $50M",
    "business_type": "Property Management",
    "key_signals": ["property management", "multiple locations"],
    "data_sources": ["Company Name Analysis", "Website Analysis"],
    "enriched_at": "2026-05-25T12:00:00Z"
  }
}
```

**Usage:** Called by Flow 0, A, B, C to add business context

---

### `/api/score` (POST)
**Purpose:** Score prospect fit using Claude AI

**Request:**
```json
{
  "legal_name": "Company LLC",
  "business_type": "Property Management",
  "employees_estimate": 125,
  "revenue_estimate": "$10M - $50M"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "score": 82,
    "priority": "high",
    "segment": "Property Manager",
    "service_fit": 0.82,
    "intent_signal": "high",
    "icebreaker": "Company LLC has strong property management presence...",
    "scoring_rationale": "Score based on fit analysis and segment matching",
    "scored_at": "2026-05-25T12:00:00Z"
  }
}
```

**Usage:** Called by workflows to calculate prospect fit

---

### `/api/generate-foia` (POST)
**Purpose:** Generate FOIA request letter for federal opportunity

**Request:**
```json
{
  "companyName": "My Company LLC",
  "agency": "Department of Veterans Affairs",
  "opportunityId": "SAM-123456",
  "contractValue": 5000000
}
```

**Response:**
```json
{
  "success": true,
  "foia_draft": "REQUEST FOR INFORMATION\n\nTo: Department of Veterans Affairs\n..."
}
```

**Usage:** Generate FOIA requests for compliance and intel gathering

---

### `/api/generate-email` (POST)
**Purpose:** Generate outreach email templates

**Request:**
```json
{
  "companyName": "My Company LLC",
  "agency": "GSA",
  "opportunityTitle": "Janitorial Services Contract",
  "role": "sub",
  "tone": "formal"
}
```

**Response:**
```json
{
  "success": true,
  "email": "Subject: Teaming Opportunity...\n\nDear GSA,\n..."
}
```

**Usage:** Generate personalized outreach emails

---

### `/api/analytics` (GET)
**Purpose:** Get pipeline analytics and metrics

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProspects": 45,
    "totalContracts": 12,
    "totalSubs": 8,
    "averageScore": 72,
    "scoreDistribution": {
      "high": 15,
      "medium": 20,
      "low": 10
    },
    "bySegment": {
      "Federal": 18,
      "State": 15,
      "Local": 12
    },
    "byStatus": {
      "pending": 25,
      "interested": 15,
      "qualified": 5
    },
    "topOpportunities": [
      {
        "name": "VA Medical Facility Contract",
        "value": 8500000,
        "agency": "Department of Veterans Affairs"
      }
    ]
  }
}
```

---

### `/api/prospects/approve` (POST)
**Purpose:** Approve prospect and sync to GHL

**Request:**
```json
{
  "recordId": "rec123456",
  "email": "company@example.com",
  "name": "Company LLC",
  "locationId": "location-id"
}
```

**Response:**
```json
{
  "success": true,
  "recordId": "rec123456",
  "ghlContactId": "ghl-contact-123"
}
```

---

## 🎨 UI/UX Patterns

### Color Scheme
- **Primary:** Blue (#3222F4 from brand)
- **Success:** Green (approval, added)
- **Warning:** Yellow (medium priority)
- **Critical:** Red (high priority, failed)
- **Neutral:** Gray (pending, default)

### Component Patterns
- **Detail Panels:** 2/3 width, toggleable
- **List Views:** 1/3 width, scrollable, hover states
- **Status Badges:** Colored pills with icon
- **Progress Bars:** Visual score/percentage representation
- **Toast Notifications:** Bottom-right, 3-second duration
- **Tables:** Simple, sortable by score/priority

### Responsive Design
- Desktop: Full layout (list + detail)
- Mobile: Stacked (list first, detail below)
- All pages use Tailwind CSS grid layout

---

## 🔐 Authentication

**Current:** Hardcoded login
- Username: `admin`
- Password: `admin123`

**Token Storage:**
- `auth_token` in localStorage
- Checked on page load
- Redirect to `/login` if missing

**Future:** OAuth 2.0 + Google/Microsoft

---

## 📊 Data Flow

```
n8n Workflows (Discovery)
    ↓
Enrich API
    ↓
Score API
    ↓
Airtable Intelligence Table
    ↓
Dashboard Pages
    ↓
Analytics / Reporting
    ↓
GHL Sync (on Approve)
```

---

## 🚀 Performance

| Page | Load Time | Interactions |
|------|-----------|--------------|
| Prospects | 100-200ms | Approve, Select |
| Contracts | 150-250ms | Copy Email, Select |
| Subs | 100-200ms | Contact, Filter |
| Analytics | 200-500ms | View, Refresh |
| Runs | 100-150ms | Retry, View Log |
| Settings | 50-100ms | Save, Toggle |

---

## 🔄 Refresh & Sync

- **Auto-refresh:** None (manual)
- **Airtable Sync:** Click "Sync" in Settings
- **Analytics Cache:** 5-minute client-side cache
- **Real-time:** GHL sync is immediate on approval

---

## 📝 Upcoming Features

- [ ] Email campaign builder
- [ ] SMS outreach templates
- [ ] Automated follow-up sequences
- [ ] Deal pipeline with stages
- [ ] Team collaboration features
- [ ] Custom reporting/exports
- [ ] API webhook integrations
- [ ] Multi-user authentication

---

**Questions?** See `/docs/setup.md` for setup or `/docs/compliance.md` for legal compliance.
