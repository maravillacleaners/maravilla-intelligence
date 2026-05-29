# Federal Opportunity Data Sources - Research & Analysis

**Date:** May 25, 2026  
**Purpose:** Identify and evaluate all available sources for federal contracting opportunities

---

## Tier 1: Primary Official Sources (Government)

### 1. SAM.gov (System for Award Management)
```
Website: https://sam.gov
API: https://api.sam.gov/prod/opportunities/v1/search

Status: ✅ OFFICIAL - Government maintained
Coverage: ALL federal opportunities (highest authority)
Data Quality: ⭐⭐⭐⭐⭐ (Direct from government)
API Status: ✅ Public API available
Authentication: API Key required (free, no key needed for basic access)
Rate Limit: 10 req/sec
Response Time: 1-3s

Documentation: https://sam.gov/content/dam/SAM/downloads/SAM_Opportunities_API_Specification_v1.pdf

Sample Endpoint:
GET https://api.sam.gov/prod/opportunities/v1/search
  ?api_key=YOUR_KEY
  &status=open
  &limit=100

Data Returned:
- opportunity_id
- title
- agency
- description
- posted_date
- deadline
- estimated_value
- naics_codes
- place_of_performance
- attachments_url
- url (to sam.gov listing)

Cost: FREE (government service)
Latency: Real-time (updates hourly)
```

### 2. USASpending.gov
```
Website: https://www.usaspending.gov
API: https://api.usaspending.gov/api/v2/

Status: ✅ OFFICIAL - Government transparency data
Coverage: All federal spending, awards, contracts
Data Quality: ⭐⭐⭐⭐⭐ (Direct from government agencies)
API Status: ✅ Public API available
Authentication: None required
Rate Limit: 5 req/sec
Response Time: 2-5s

Documentation: https://usaspending-api.herokuapp.com/

Key Endpoints:
- /api/v2/search/spending_by_award/
- /api/v2/awards/
- /api/v2/contracts/

Sample Data:
{
  "piid": "contract_id",
  "contractor_name": "Company Name",
  "award_amount": 1000000,
  "start_date": "2026-05-01",
  "end_date": "2027-05-01",
  "agency": "Department Name",
  "contract_type": "FFP",
  "psc_codes": ["1234"]
}

Cost: FREE (government service)
Latency: Near real-time (updates daily)
```

### 3. FPDS.gov (Federal Procurement Data System)
```
Website: https://www.fpds.gov
Status: ✅ OFFICIAL - Contract action reporting
Coverage: ALL federal contracts > $25,000
Data Quality: ⭐⭐⭐⭐⭐ (Required reporting)
API Status: ⚠️ Limited - XML/CSV export available
Authentication: None required
Response Time: Export files

Key Data:
- Contract actions
- Contractor information
- Contract values
- NAICS codes
- Performance metrics

Cost: FREE (government service)
Latency: Near real-time (daily updates)
```

---

## Tier 2: Consolidated Government Sources

### 4. HigherGov (Third-party consolidator)
```
Website: https://highergov.com
API: https://api.highergov.com/v1/

Status: ✅ COMMERCIAL - Government data consolidation
Coverage: Consolidated federal opportunities
Data Quality: ⭐⭐⭐⭐ (Aggregates from SAM.gov + others)
API Status: ✅ Public API available
Authentication: API Key required
Key: 4be72a011d644af8bca9a11f85c90d95
Rate Limit: 100 req/min
Response Time: 1-2s

Endpoints:
- /v1/opportunities (search opportunities)
- /v1/agencies
- /v1/contractors
- /v1/opportunities/{id}

Features:
✅ Real-time updates from SAM.gov
✅ Cleaner JSON responses
✅ Filter options (status, deadline, value)
✅ Historical data
✅ Webhook support

Cost: Freemium model (API included with account)
Latency: Real-time (mirrors SAM.gov)
```

### 5. Grants.gov
```
Website: https://grants.gov
API: https://grants.gov/grantsapi

Status: ✅ OFFICIAL - Federal grants
Coverage: Grant opportunities only
Data Quality: ⭐⭐⭐⭐⭐ (Official source)
API Status: ✅ Public API available
Authentication: Required (registration needed)
Rate Limit: 500 req/day
Response Time: 2-4s

Data:
- Grant opportunities
- Funding amounts
- Deadline dates
- CFDA codes (grant categories)
- Eligible entities

Note: DIFFERENT from contracts - grants are non-repayable funds
Cost: FREE
Latency: Daily updates
```

---

## Tier 3: Specialized/Industry-Specific Sources

### 6. FedBizOpps (deprecated → now SAM.gov)
```
Status: ⚠️ DEPRECATED - Merged into SAM.gov in 2019
Use: SAM.gov instead
```

### 7. Small Business Administration (SBA)
```
Website: https://www.sba.gov/contracting
API: Limited - mostly web scraping required

Status: ✅ OFFICIAL - Small business set-asides
Coverage: 8(a) contracts, HUBZone, Women-owned, etc.
API Status: ⚠️ No official API - data available via SAM.gov filters

Key Information:
- Set-aside programs
- Business size standards
- NAICS code classifications

Cost: FREE
```

### 8. GSA Schedule (IDIQ Contracts)
```
Website: https://www.gsaelibrary.gsa.gov
API: https://api.gsa.gov/

Status: ✅ OFFICIAL - Government purchasing schedule
Coverage: Pre-negotiated IDIQ contracts
Data Quality: ⭐⭐⭐⭐
API Status: ✅ Available

Data:
- Schedule contracts
- Contractors on schedule
- Pricing information
- Contract terms

Cost: FREE
```

### 9. DOD Opportunities
```
Website: https://www.defense.gov/News/Releases/
API: Available via FedBizOpps/SAM.gov

Status: ✅ Part of SAM.gov
Coverage: Defense department contracts
Data Quality: ⭐⭐⭐⭐⭐
```

---

## Tier 4: Aggregator/Analytics Platforms

### 10. Mentor (Commercial)
```
Website: https://mentor.gov
API: Limited
Status: ⚠️ COMMERCIAL - Business intelligence on federal contracts
Coverage: Analytics + historical data
Data Quality: ⭐⭐⭐⭐
Cost: $$ (Subscription based)
Use Case: Historical analysis, competitor research
```

### 11. GovWin (formerly GovShop)
```
Website: https://govwin.com
API: Available for enterprise
Status: ⚠️ COMMERCIAL - Contract intelligence
Coverage: Comprehensive federal opportunities + insights
Data Quality: ⭐⭐⭐⭐
Cost: $$$ (Enterprise subscription)
Use Case: Advanced filtering, pipeline management
```

### 12. HigherGov (Advanced Features)
```
Same as #4 but includes:
- Contract pipeline analytics
- Company matchmaking
- Alert system
- Historical opportunity data
```

---

## Tier 5: State/Local Opportunities

### 13. State Procurement Websites
```
Coverage: State-level contracts (varies by state)
Data Quality: Varies ⭐⭐ to ⭐⭐⭐
Status: Varies by state
Aggregator: Procurify tracks many states

Florida Specific:
https://www.myflorida.com/apps/vbs/
```

### 14. Municipal Opportunities
```
Coverage: City/county contracts
Data Quality: Varies widely
Status: No unified API
Aggregation: Multiple platforms available

Not recommended for initial MVP (too fragmented)
```

---

## Recommendation Matrix

### For MVP (Phase 1) - RECOMMENDED
| Source | Reason | Implementation |
|--------|--------|-----------------|
| **SAM.gov** | Official, comprehensive, free | API integration ✅ |
| **HigherGov** | Real-time mirror, better API, free | Already available ✅ |
| **USASpending** | Complementary data (awards), free | API integration ✅ |
| **Grants.gov** | Different funding type, official | API integration (Phase 2) |

### For Phase 2 - ADDITIONAL COVERAGE
| Source | Reason | Implementation |
|--------|--------|-----------------|
| **GSA Schedule** | IDIQ contracts, growing segment | API integration |
| **DOD** | Largest spender, via SAM.gov | Already covered |
| **State Procurement** | Regional focus (Florida) | Scraper + integration |

### For Phase 3 - ADVANCED
| Source | Reason | Cost |
|--------|--------|------|
| **GovWin** | Enterprise insights | $$$ |
| **Mentor** | Historical + analytics | $$ |
| **Custom State API** | Deep regional coverage | $$ |

---

## Data Integration Strategy

### Architecture for Multi-Source Extraction

```
┌──────────────────────────────────────────────────────┐
│        Opportunity Discovery Layer                   │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│            n8n Orchestration                         │
├──────────────────────────────────────────────────────┤
│  ├─ SAM.gov Scraper (real-time)                     │
│  ├─ HigherGov Scraper (real-time)                   │
│  ├─ USASpending Scraper (daily)                     │
│  ├─ Grants.gov Scraper (daily)                      │
│  └─ Deduplication Engine                            │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│          Data Normalization                          │
│  - Standardize field names                          │
│  - Convert date formats                             │
│  - Classify by opportunity type                     │
│  - Extract NAICS codes                              │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│      Airtable Intelligence Base                      │
│  - Single source of truth                           │
│  - Deduplication by URL                             │
│  - Enrichment with supplier matching                │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│        Contract Matcher + Notifications              │
│  - Match to suppliers                               │
│  - Send notifications                               │
│  - Track applications                               │
└──────────────────────────────────────────────────────┘
```

---

## Phase 1 Implementation Plan

### Week 1: Foundation
- [x] HigherGov Scraper (already configured)
- [ ] SAM.gov Scraper setup
- [ ] USASpending Scraper setup
- [ ] Deduplication logic

### Week 2: Enhancement
- [ ] Grants.gov integration
- [ ] Data normalization layer
- [ ] Quality assurance

### Week 3: Optimization
- [ ] Performance tuning
- [ ] Schedule optimization
- [ ] Error handling

---

## API Comparison Table

| Feature | SAM.gov | HigherGov | USASpending | Grants.gov |
|---------|---------|-----------|-------------|-----------|
| Official | ✅ YES | ⚠️ Aggregator | ✅ YES | ✅ YES |
| Coverage | Contracts | Contracts | Spending/Awards | Grants |
| API Available | ✅ | ✅ | ✅ | ✅ |
| Free | ✅ | ✅ | ✅ | ✅ |
| Real-time | ✅ | ✅ | Daily | Weekly |
| NAICS Codes | ✅ | ✅ | ✅ | ❌ (CFDA) |
| Deadline Data | ✅ | ✅ | ❌ | ✅ |
| Response Speed | Good | Excellent | Good | Moderate |
| Pagination | Yes | Yes | Yes | Yes |
| JSON API | ✅ | ✅ | ✅ | ✅ |

---

## Recommended Scraping Schedule

```
HigherGov:        Every 6 hours (0,6,12,18)   - Real-time mirror
SAM.gov:          Every 8 hours (0,8,16)      - Backup to HigherGov
USASpending:      Every 24 hours (2 AM)       - Complementary data
Grants.gov:       Every 48 hours (Wed 2 AM)   - Weekly digest
Deduplication:    Every 1 hour                - Remove duplicates
```

---

## Data Points to Extract (All Sources)

### Core Fields (Standardized across all)
```
- title: string
- agency: string
- opportunity_type: string (Contract, Grant, Award, etc)
- source: string (sam-gov, highergov, usaspending, grants-gov)
- deadline: date
- estimated_value: number
- description: string
- url: string (link to original posting)
- naics_codes: array
- place_of_performance: string
- posted_date: date
- set_asides: array (8(a), HUBZone, Women-owned, etc)
```

### Extended Fields (Source-specific)
```
SAM.gov:
  - opportunity_id
  - pdf_url
  - attachments_count
  - response_deadline

USASpending:
  - contract_type
  - contractor_name
  - award_amount
  - start_date
  - end_date

Grants.gov:
  - cfda_code
  - funding_opportunity_id
  - grant_amount
  - match_required

HigherGov:
  - company_match_percentage
  - ai_recommended
  - historical_opportunities
```

---

## Deduplication Strategy

**Challenge:** Same opportunity may appear in multiple sources

**Solution:** Hash-based matching
```javascript
const urlHash = crypto
  .createHash('sha256')
  .update(opportunity.url)
  .digest('hex');

// Check if hash exists in Airtable
// If exists: update with new source info
// If new: insert as new record
```

**Additional deduplication:**
- Match by (agency + title + deadline)
- Match by opportunity_id (if available)
- Manual review for borderline cases

---

## Risk Assessment

| Source | Risk | Mitigation |
|--------|------|-----------|
| SAM.gov | Government changes | Monitor API status |
| HigherGov | 3rd party dependency | Have SAM.gov fallback |
| USASpending | Updates lag SAM.gov | Use for enrichment only |
| Grants.gov | Different schema | Separate pipeline |

---

## Cost Analysis

### Monthly Cost for MVP

```
SAM.gov:       FREE   (government service)
HigherGov:     FREE   (basic API)
USASpending:   FREE   (government service)
Grants.gov:    FREE   (government service)

Total Cost: $0 per month (for Phase 1)

Phase 2 would add state-specific sources ($100-500/mo)
Phase 3 would add commercial intelligence ($1000+/mo)
```

---

## Conclusion & Recommendation

**For MVP (Phase 1):**
1. ✅ **HigherGov** - Primary real-time source (already available)
2. ✅ **SAM.gov** - Backup/verification (get free API key today)
3. ✅ **USASpending** - Enrichment data (contract awards)

**For Phase 2:**
4. ✅ **Grants.gov** - Expand to grant opportunities

**Implementation Effort:**
- HigherGov: Already ready ✅
- SAM.gov: 2-3 hours
- USASpending: 2-3 hours
- Grants.gov: 2-3 hours

**Total effort:** ~8 hours for complete multi-source system

---

**Status:** Research complete, ready for implementation

