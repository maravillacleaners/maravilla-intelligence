# ARQUITECTURA - Scrapers Investigativos

## Diagrama de Flujo General

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FRONTEND APPLICATION                             │
│              (Dashboard, Search, Investigation UI)                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API LAYER (Next.js)                             │
│  ┌──────────────┬──────────────┬──────────────┬──────────────────┐  │
│  │   Sunbiz     │  Property    │   Contact    │   Investigator   │  │
│  │   Scraper    │   Records    │   Finder     │     Merge        │  │
│  │              │   Scraper    │   Scraper    │   (MASTER)       │  │
│  └──────┬───────┴──────┬───────┴──────┬───────┴────────┬─────────┘  │
│         │              │              │                │            │
│         └──────────────┼──────────────┼────────────────┘            │
│                        ▼              ▼                             │
│              ┌──────────────────────────────┐                       │
│              │    Shared Utilities Layer    │                       │
│              │  (config, types, utils)      │                       │
│              └──────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
        │          │          │          │          │
        ▼          ▼          ▼          ▼          ▼
    ┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐
    │ Sunbiz ││Hunter ││Zillow  ││USASpend││Airtable│
    │  API   ││.io API││API     ││ing API ││API     │
    │ (FL    ││(emails││(real   ││(federal││(store) │
    │registry)│contacts)│estate)│contracts)│      │
    └────────┘└────────┘└────────┘└────────┘└────────┘

        ▲          ▲          ▲          ▲          ▲
        │          │          │          │          │
        └──────────┴──────────┴──────────┴──────────┘
                        EXTERNAL
                      DATA SOURCES
```

---

## Arquitectura por Capas

### Layer 1: Frontend
```
User clicks "Investigate" → name field → Submit
                                    │
                                    ▼
                            API Request sent
```

### Layer 2: API Routes (Next.js)
```
POST /api/scrapers/[scraper-name]/route.ts
  ├─ Parse request body
  ├─ Validate input (sanitize)
  ├─ Call appropriate scraper function
  ├─ Aggregate results
  ├─ Save to Airtable
  └─ Return response
```

### Layer 3: Scraper Logic
```
Each scraper:
  1. Initialize logger & config
  2. Build API request
  3. Fetch data from external source
  4. Parse response
  5. Extract relevant fields
  6. Validate data
  7. Call Airtable client to save
  8. Return results
```

### Layer 4: Utilities & Infrastructure
```
config.ts → All credentials & settings
types.ts → All interfaces & data models
utils.ts → Shared functions (logging, fetch, airtable, etc.)
```

### Layer 5: External APIs
```
Sunbiz → Florida corporate registry (web scraping)
Hunter/Apollo/RocketReach → Contact databases
Zillow/Redfin → Real estate data
USASpending/SAM → Federal contract data
Airtable → Data storage
```

---

## Flujo de Datos - Investigator Merge (Master)

```
POST /api/scrapers/investigator-merge
  │
  ├─ Input: {name: "Acme Corp", entity_type?: "Corporation"}
  │
  ├─ Step 1: Fetch Sunbiz data
  │   └─ Search Airtable: tblBusinessRegistrations
  │      └─ Returns: [legal_name, dba, officers, status, etc.]
  │
  ├─ Step 2: Fetch Property Records
  │   └─ Search Airtable: tblPropertyRecords
  │      └─ Returns: [address, owner, value, etc.]
  │
  ├─ Step 3: Fetch Contacts
  │   └─ Search Airtable: tblContacts
  │      └─ Returns: [name, email, phone, title, etc.]
  │
  ├─ Step 4: Fetch Federal Contracts
  │   └─ Search Airtable: tblAwards
  │      └─ Returns: [recipient, amount, agency, date]
  │
  ├─ Step 5: Fetch Relationships
  │   └─ Search Airtable: tblAvatarRelationships
  │      └─ Returns: [related_avatar, relationship_type, etc.]
  │
  ├─ Step 6: Calculate Score
  │   └─ Formula: confidence + (props×5) + (contacts×3) + (fed×20) + (sources×2)
  │      └─ Returns: 0-100
  │
  ├─ Step 7: Identify Risk Flags
  │   ├─ No property records? → Flag
  │   ├─ No contacts? → Flag
  │   ├─ High contract value? → Flag
  │   ├─ Low confidence? → Flag
  │   └─ Returns: [flag1, flag2, ...]
  │
  ├─ Step 8: Build Avatar Profile
  │   └─ Merge all data into single AvatarProfile object
  │
  ├─ Step 9: Save to Airtable
  │   └─ POST to tblAvatars with complete profile
  │      └─ Returns: record_id
  │
  └─ Output: {avatar_profile{}, saved_id, investigation_complete: true}
```

---

## Componente: ScraperLogger

```typescript
ScraperLogger {
  source: string
  errors: ScraperError[]

  methods:
    - log(message) → console.log
    - error(message) → console.error + store error
    - warn(message) → console.warn
    - debug(message) → console.log (if DEBUG env var)
    - getErrors() → return error array
    - clearErrors() → reset error array
}
```

---

## Componente: AirtableClient

```typescript
AirtableClient {
  baseId: string
  apiKey: string
  logger: ScraperLogger

  methods:
    - createRecord(tableId, fields) → POST /v0/{base}/{table}
    - batchCreateRecords(tableId, records[]) → Chunked posting
    - getRecords(tableId, formula?) → GET /v0/{base}/{table}
}
```

---

## Componente: HTTPClient

```typescript
HTTPClient {
  logger: ScraperLogger
  timeout: number

  methods:
    - get(url, headers?) → text response
    - getJSON<T>(url, headers?) → parsed JSON
    - post<T>(url, body, headers?) → POST & parse
}
```

---

## Data Model: AvatarProfile

```typescript
AvatarProfile {
  // Identity
  name: string
  entity_type: 'individual' | 'corporation' | 'LLC' | 'trust' | 'other'
  relationship_type: 'primary' | 'associated' | 'linked' | ...

  // Confidence & Scoring
  confidence_score: number (0-100)
  investigation_score: number (0-100)
  data_sources: string[]

  // Contact Information
  phone?: string
  email?: string
  linkedin?: string
  address?: string
  city?: string
  state?: string
  zip?: string

  // Linked Data
  properties: PropertyRecord[] ← From property scraper
  contacts: Contact[] ← From contact finder scraper
  relationships: AvatarRelationship[] ← Discovered connections
  business_registrations: BusinessRegistration[] ← From Sunbiz
  federal_contracts?: FederalAward[] ← From USASpending

  // Risk Assessment
  risk_flags: string[]
  risk_level: 'low' | 'medium' | 'high' | 'critical'

  // Metadata
  created_at?: string
  last_updated: string
  tags?: string[]
}
```

---

## Integration Points

### 1. Frontend Integration

```typescript
// React component
const [result, setResult] = useState(null)

const investigate = async (name) => {
  const res = await fetch('/api/scrapers/investigator-merge', {
    method: 'POST',
    body: JSON.stringify({ name })
  })
  const data = await res.json()
  setResult(data.avatar_profile)
}
```

### 2. Airtable Integration

```
Every scraper automatically:
  1. Saves results to appropriate table
  2. Updates timestamps
  3. Adds source attribution
  4. Links related records
```

### 3. API Chaining

```
POST /api/scrapers/investigator-merge
  ├─ Internally calls multiple scrapers
  ├─ Aggregates results
  └─ Returns unified response
```

---

## Error Handling Flow

```
Try API call
  │
  ├─ Success (200) → Parse & return
  │
  ├─ Rate Limited (429) → Log warning, retry later
  │
  ├─ Not Found (404) → Return empty array
  │
  ├─ Auth Error (401) → Log critical, return fallback
  │
  ├─ Timeout → Retry with backoff
  │
  └─ Network Error → Use cached data or fallback

All errors logged to ScraperLogger.errors[]
```

---

## Deployment Architecture

```
┌────────────────────────────────────────────────┐
│         Vercel / Next.js Server                 │
│  ┌──────────────────────────────────────────┐  │
│  │  /app/api/scrapers/**/route.ts           │  │
│  │  - Sunbiz, PropertyRecords, etc.         │  │
│  │  - Runs on each POST request             │  │
│  │  - ~500ms-5s per request depending API   │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
                    │
         ┌──────────┼──────────┐
         │          │          │
         ▼          ▼          ▼
    Airtable    External     Logging
    API         Data APIs    (Console)
```

---

## Performance Characteristics

| Operation | Typical Time | Max Time |
|-----------|--------------|----------|
| Sunbiz single call | 1-2s | 5s |
| Contact Finder call | 2-3s | 10s |
| Property Records call | 2-3s | 8s |
| Investigator Merge (all) | 5-10s | 20s |
| Airtable save | 0.5-1s | 3s |

Timeouts set at 10-12s per API call.

---

## Scalability Considerations

### Request Rate
- API supports ~100 concurrent requests
- Rate limit: depends on external APIs (see config.ts)
- Recommendation: implement queue for batch operations

### Data Volume
- Each avatar profile ~2KB JSON
- Airtable can store unlimited records
- Recommend: archive old profiles after 90 days

### Cost Optimization
- Use free tier APIs first (Sunbiz, USASpending, SAM)
- Hunter.io: $99/mo for 10K contacts
- Apollo: $49/mo for 100K records
- Total monthly: ~$150-200 for all premium APIs

---

## Security Considerations

```
✅ Input Sanitization
   - Escape quotes in company names
   - Validate email format
   - Prevent SQL injection in Airtable formulas

✅ API Key Management
   - All keys in .env (not committed)
   - Server-side only (not exposed to frontend)
   - Rotated periodically

✅ Rate Limiting
   - Respect external API limits
   - Implement exponential backoff
   - Queue system for high volume

✅ Data Privacy
   - Only public data sources used
   - No PII stored without consent
   - FCRA compliant for contact data
```

---

## Testing Strategy

```
Unit Tests:
  - Input validation
  - Data parsing
  - Deduplication logic
  - Risk flag detection

Integration Tests:
  - API endpoint responses
  - Airtable save/retrieve
  - Multi-scraper aggregation

End-to-End Tests:
  - Full investigator-merge flow
  - Frontend dashboard integration
  - Error handling scenarios
```

---

**Architecture Version:** 1.0  
**Last Updated:** 2026-06-04  
**Designed for:** Maravilla Intelligence Platform
