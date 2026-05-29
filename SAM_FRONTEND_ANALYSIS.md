# SAM Frontend Architecture & Field Mapping
## Complete Data Model Analysis & Backend Integration Plan

**Date:** May 25, 2026  
**Frontend Files:** 30+ React components  
**Data Structure:** Prospect → Subcontractor → Contract → Pipeline  

---

## 1. CORE DATA MODELS

### 1.1 PROSPECT MODEL
```
{
  id: "rec8K2pXqM9vNbA3F"
  legalName: "Brickell Property Group LLC"
  dba: "BPG Residential"
  domain: "brickellpropertygroup.com"
  naics: "531311"
  naicsDesc: "Residential Property Managers"
  segment: "Property Manager"
  priority: "High" | "Medium" | "Low"
  county: "Miami-Dade"
  source: "Sunbiz daily feed"
  sunbizStatus: "Active"
  entityType: "FL LLC"
  formedDate: "2026-05-02"
  daysSinceFormed: 23
  
  address: {
    line: "1221 Brickell Ave, Suite 1500"
    city: "Miami"
    state: "FL"
    zip: "33131"
  }
  
  officer: {
    name: "Carlos Mendoza"
    role: "Managing Member"
    samRegistered: true
  }
  
  contact: {
    name: "Carlos Mendoza"
    title: "Managing Member"
    email: "carlos@brickellpropertygroup.com"
    phone: "(305) 555-0142"
    linkedin: "linkedin.com/in/carlos-mendoza-mia"
  }
  
  intelligence: {
    score: 87
    ticketEstimate: 2400
    serviceFit: 0.92
    priorityScore: 0.88
    rank: {
      position: 3
      total: 47
      group: "property managers in Miami-Dade"
    }
    icebreaker: "Saw BPG just took on..."
    intentSignal: "Newly formed FL LLC managing Class A..."
    reasoning: [
      "New entity within 30-day peak outreach window"
      "Officer has prior vendor relationship"
      "Building density: 6 other CRM prospects"
      "NAICS 531311 converts at 34% in Miami-Dade"
    ]
  }
  
  sqft: 48000
  pipelineStage: "Pending review"
  daysInStage: 2
  
  scoreBreakdown: [
    { label: "Timing window", points: 28, weight: 30 }
    { label: "Intent signal strength", points: 22, weight: 25 }
    { label: "Segment fit", points: 18, weight: 20 }
    { label: "Ticket size", points: 11, weight: 15 }
    { label: "Building density", points: 8, weight: 10 }
  ]
  
  emailDraft: {
    to: "carlos@brickellpropertygroup.com"
    subject: "1221 Brickell turnover — before you sign"
    body: "Hi Carlos..."
  }
  
  emailVariants: {
    warm: { subject: "...", body: "..." }
    direct: { subject: "...", body: "..." }
    data: { subject: "...", body: "..." }
  }
  
  timeline: [
    { ts: "2026-05-25T14:32:00Z", who: "claude", evt: "Score regenerated" }
    { ts: "2026-05-25T09:14:00Z", who: "system", evt: "Email draft composed" }
  ]
}
```

**Fields Needed in Airtable:**
- Name, legalName, dba
- domain, website_url
- naics_code, naics_description
- segment, priority, county
- source (SUNBIZ/HigherGov/SAM/etc)
- status (Active/Inactive/Pending)
- entity_type
- formed_date
- address fields (line, city, state, zip)
- officer_name, officer_title, officer_samregistered
- contact_name, contact_title, contact_email, contact_phone
- intelligence_score (0-100)
- ticket_estimate ($)
- service_fit (0-1)
- priority_score (0-1)
- icebreaker_text
- intent_signal_text
- sqft
- pipeline_stage
- days_in_stage

---

### 1.2 SUBCONTRACTOR MODEL
```
{
  id: "sub_12345"
  name: "Costa Janitorial Services"
  legalName: "Costa Janitorial Services LLC"
  domain: "costajanitorial.com"
  category: "Recurring janitorial" | "Turnovers + deep clean" | "Floor specialty"
  capacity: {
    crews: 4
    recurringNote: "steady recurring + emergency"
  }
  avgPrice: 1.85 ($/sqft/mo)
  status: "Qualified" | "Active"
  yearsActive: 12
  qualificationStatus: "Certified"
  
  publicRecord: {
    sam: {
      uei: "ABC123DEF456"
      status: "Active"
      registered: true
    }
    totalFedWon: 450000
    federalWins: [
      { id: "C-2026-0142", amount: 1840000 }
    ]
  }
  
  reputation: {
    google: { rating: 4.8, reviews: 94 }
    yelp: { rating: 4.6, reviews: 28 }
  }
  
  compliance: {
    insured: true
    bonded: true
    everify: true
    background: true
  }
  
  insurance: {
    coi: { onFile: true, expirationDate: "2027-03-15" }
    liability: 2000000
    workers_comp: true
  }
  
  coverageCounties: [
    { name: "Miami-Dade", active: true, clients: 8 }
    { name: "Broward", active: true, clients: 5 }
    { name: "Palm Beach", active: false, clients: 0 }
  ]
  
  benchmark: {
    vsZone: {
      price: {
        value: 1.85
        rank: 3
        zoneAvg: 2.15
      }
      responseTime: {
        value: "2.4h"
      }
    }
    peerCount: 12
  }
  
  replyRate: 0.96 // last 30 days
}
```

**Fields Needed in Airtable:**
- sub_name, sub_legalname, sub_domain
- sub_category, sub_yearsactive
- sub_capacity_crews
- sub_avgprice ($/sqft/mo)
- sub_qualification_status
- sub_status (Qualified/Active/Inactive)
- sub_sam_uei, sub_sam_status
- sub_totalfedwon ($)
- sub_federalwin_count
- sub_reputation_google_rating
- sub_reputation_google_reviews
- sub_reputation_yelp_rating
- sub_reputation_yelp_reviews
- sub_insured (boolean)
- sub_bonded (boolean)
- sub_everify (boolean)
- sub_background (boolean)
- sub_insurance_liability ($)
- sub_insurance_coi_onfile (boolean)
- sub_coverage_counties (JSON array)
- sub_benchmarkprice_vszone
- sub_benchmarkresponse_avg
- sub_replyrate_30d (%)

---

### 1.3 CONTRACT MODEL
```
{
  id: "C-2026-0142"
  prime: "ServiceMaster FL Inc."
  agency: "GSA Region 4"
  amount: 1840000
  place: "Miami, FL"
  periodEnd: "2027-09-30"
  naics: "561720"
}
```

**Fields Needed in Airtable:**
- contract_id
- contract_prime_vendor
- contract_agency
- contract_amount ($)
- contract_location
- contract_naics
- contract_end_date

---

### 1.4 RELATIONSHIP MODEL
```
{
  entityA: "Brickell Property Group LLC" (prospect)
  entityB: "Carlos Mendoza" (officer)
  relationType: "OFFICER" | "SAME_ADDRESS" | "SAME_OFFICER" | "NEARBY"
  
  // Same Officer relationships
  entities: [
    { name: "Mendoza Holdings LLC", naics: "531390" }
    { name: "C. Mendoza Realty Group Inc.", naics: "531210" }
  ]
  
  // Same Address relationships
  entities: [
    { name: "Atlas Wealth Advisors LLC", suite: "Suite 1500", sameFloor: true }
    { name: "Brickell Dental Partners PA", suite: "Suite 800", sameFloor: false }
  ]
}
```

**Fields Needed in Airtable:**
- relationship_entity_a
- relationship_entity_b
- relationship_type (OFFICER/SAME_ADDRESS/SAME_OFFICER/NEARBY)
- relationship_strength (1-10)

---

## 2. FRONTEND SCREENS & TABS INVENTORY

### 2.1 Main Screens
1. **Queue** - Prospect pipeline queue view
2. **Prospect** - Single prospect detail + tabs
3. **Sub** - Subcontractor detail + tabs
4. **Contract** - Federal contract detail
5. **Insights** - County-level analytics
6. **Sequences** - Outreach campaign sequences

### 2.2 Prospect Tabs
- **Profile** - Overview, contact, officer info
- **Market** - Segment benchmarks, county stats
- **Signals** - Intent signals, reasoning, scoring
- **Relationships** - Same officer, same address, nearby entities
- **Compare** - Rank against similar prospects
- **History** - Timeline of interactions
- **Insights** - Deeper analytics

### 2.3 Subcontractor Tabs
- **Profile** - Overview, capacity, pricing
- **Public** - SAM records, federal wins
- **Reputation** - Reviews, ratings
- **Pricing** - Benchmark vs zone
- **Insurance** - Compliance, COI, coverage
- **People** - Team members
- **Coverage** - County coverage map
- **RFQ** - Quote request history
- **Relationships** - Connections to prospects
- **History** - Activity timeline

---

## 3. COMPONENT INVENTORY

| Component | File | Purpose |
|-----------|------|---------|
| App | app.jsx | Router, state management |
| Hero | hero.jsx | Title, stats, actions |
| Data | data.jsx | Mock data structure |
| UI | ui.jsx | Button, Label, Chip, etc. |
| CommandPalette | command-palette.jsx | Ctrl+K search |
| AICopilot | ai-copilot.jsx | Claude integration |
| ManualEdit | manual-edit.jsx | Inline field editing |
| Notifications | notifications.jsx | Toast/bell system |
| Pipeline | pipeline.jsx | Stage flow |
| QuickActions | quick-actions.jsx | Primary CTAs |
| NextBestAction | next-best-action.jsx | Recommended action |
| Tweaks | tweaks-panel.jsx | Dev mode settings |

**Screen Components:**
- screen-queue.jsx
- screen-contract.jsx
- screen-discovery.jsx
- screen-insights.jsx
- screen-sub-finder.jsx
- screen-sub.jsx

**Tab Components:**
- tab-profile.jsx
- tab-market.jsx
- tab-signals.jsx
- tab-relationships.jsx
- tab-history.jsx
- tab-compare.jsx

---

## 4. INTEGRATION ARCHITECTURE

### Current Status:
```
Airtable Suppliers Table (65 enriched records)
  ↓
n8n Workflows (State APIs, Web Extraction, Google, LinkedIn)
  ↓
Enriched Data (contact info, officers, signals)
  ↓
[FRONTEND SAM APP] ← Data displayed here
```

### Integration Points Needed:

#### 4.1 Data Sync: Airtable → Frontend
```javascript
// Read enriched suppliers from Airtable
GET /api/suppliers?limit=50&fields=Name,legalName,contact_email,intelligence_score

// Returns to frontend as MOCK.prospect structure
// Frontend UI renders from this data
```

#### 4.2 Backend API Endpoints Required
```
GET /api/prospects                    // List all prospects
GET /api/prospects/:id                // Get single prospect detail
GET /api/prospects/:id/related         // Same officer/address/nearby
GET /api/prospects/:id/scoring         // Intelligence score breakdown
GET /api/prospects/:id/email-variants  // Draft email options

GET /api/subs                          // List subcontractors
GET /api/subs/:id                      // Single subcontractor detail
GET /api/subs/:id/benchmark            // Pricing benchmark data
GET /api/subs/:id/coverage             // County coverage map
GET /api/subs/:id/compliance           // Certification status

POST /api/prospects/:id/approve        // Move to "Approved" stage
POST /api/prospects/:id/reject         // Move to "Lost" stage
POST /api/prospects/:id/advance-stage  // Move pipeline forward

POST /api/email/send                   // Queue email from draft
POST /api/rfq/send                     // Send RFQ to subcontractor
```

#### 4.3 Real-time Updates
```
WebSocket: /ws/notifications

Events:
- new_prospect_scored
- new_prospect_enriched
- email_reply_received
- rfq_response_received
- sub_availability_change
```

---

## 5. IMPLEMENTATION ROADMAP

### Phase 1: Data Mapping (TODAY)
- [ ] Map SAM frontend fields → Airtable schema
- [ ] Create Airtable views for each screen
- [ ] Document field transformations

### Phase 2: API Backend (2 hours)
- [ ] Build Node.js/Express API
- [ ] Implement endpoints for all screens
- [ ] Add Airtable auth + caching

### Phase 3: Frontend Integration (4 hours)
- [ ] Replace MOCK data with API calls
- [ ] Add loading states
- [ ] Implement WebSocket notifications

### Phase 4: Actions & Workflows (3 hours)
- [ ] Approve/Reject actions → Pipeline update
- [ ] Email send → Queue to Smartlead/GHL
- [ ] RFQ send → n8n workflow trigger

---

## 6. FIELD MAPPING TABLE

### PROSPECT Fields
| SAM Frontend | Airtable Field | Data Type | Source |
|---|---|---|---|
| id | rec_id | Text | Airtable |
| legalName | Name | Text | SUNBIZ/Enrichment |
| dba | legal_name | Text | SUNBIZ |
| domain | website | URL | Website Extraction |
| naics | naics_code | Text | SUNBIZ |
| contact.email | business_email | Email | Website Extraction |
| contact.phone | phone | Phone | Website Extraction/Google |
| officer.name | registered_agent | Text | SUNBIZ |
| intelligence.score | intelligence_score | Number | Calculate from signals |
| intelligence.reasoning | intent_signal | LongText | Claude analysis |
| pipelineStage | pipeline_stage | Select | Manual/Auto |

---

## 7. AIRTABLE VIEW DEFINITIONS

### View: "Queue" (screen-queue.jsx)
**Fields:** Name, intelligence_score, ticket_estimate, priority, pipeline_stage, contact_email

### View: "Prospect Detail" (screen-sub.jsx)
**Fields:** All prospect fields + relationships + timeline

### View: "Subcontractor Finder" (screen-sub-finder.jsx)
**Fields:** sub_name, sub_category, sub_avgprice, sub_coverage_counties, sub_qualification_status

---

## 8. NEXT STEPS

1. **Create Airtable Views** matching each SAM screen
2. **Build Backend API** that transforms Airtable data → SAM frontend format
3. **Update SAM Frontend** to call API instead of MOCK data
4. **Add Real-time Sync** via WebSockets for notifications
5. **Deploy to Production** with full integration

**Estimated Total Time:** 10-12 hours  
**Resource:** 1 dev (full stack JavaScript/React)  
**Cost:** $0 (existing systems)

---

**Status:** Architecture complete, ready for implementation ✅
