# Data Sources Integration

## Overview

The Maravilla Intelligence system now supports integration with **236+ US government and business data sources** through a comprehensive data sources catalog. This document outlines the integration APIs and workflows.

## Data Source Categories

Sources are organized into 6 categories:

1. **Gobierno federal** (Federal Government) — SAM.gov, USASpending, FPDS, Grants.gov, etc.
2. **Estatal y local** (State & Local) — Florida, California, Texas, NY, and other state registries
3. **GIS y geoespacial** (GIS & Geospatial) — Census, OpenStreetMap, ESRI, NOAA, Google Maps, etc.
4. **Salud y regulacion** (Health & Regulation) — CMS, FDA, DEA, EPA, OSHA, etc.
5. **Financiero y corporativo** (Financial & Corporate) — SEC, IRS, FDIC, SBA, PPP, etc.
6. **Directorios de negocios** (Business Directories) — Yelp, Crunchbase, LinkedIn, BBB, Glassdoor, etc.

## API Endpoints

### 1. List Data Sources

**GET `/api/sources/list`**

Retrieves all available data sources with optional filtering.

**Query Parameters:**
- `category` (optional): Filter by category name

**Example:**
```bash
curl -X GET "http://localhost:3000/api/sources/list?category=Gobierno%20federal" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "total": 236,
  "filtered": 10,
  "categories": ["Gobierno federal", "Estatal y local", "GIS y geoespacial", ...],
  "sources": [
    {
      "category": "Gobierno federal",
      "name": "SAM.gov API",
      "description": "Empresas registradas para contratos federales...",
      "url": "open.gsa.gov/api/sam/",
      "is_free": true,
      "requires_api_key": true
    },
    ...
  ],
  "timestamp": "2026-06-04T..."
}
```

### 2. Export Data Sources

**GET `/api/sources/export`**

Exports data sources in CSV or JSON format.

**Query Parameters:**
- `format` (optional): `csv` (default) or `json`
- `category` (optional): Filter by category before export

**Examples:**
```bash
# Export as CSV (all sources)
curl -X GET "http://localhost:3000/api/sources/export" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o data-sources-2026-06-04.csv

# Export as JSON, filtered by category
curl -X GET "http://localhost:3000/api/sources/export?format=json&category=Financiero%20y%20corporativo" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o sources.json
```

**CSV Format:**
```
Categoria,Nombre,Descripcion,URL,Gratis,API Key
Gobierno federal,SAM.gov API,"Empresas registradas...",open.gsa.gov/api/sam/,Si,Si
...
```

### 3. Import to Airtable

**POST `/api/sources/import-to-airtable`**

Imports data sources to Airtable (requires authenticated user and existing "Sources" table).

**Request Body:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "message": "Data sources import completed",
  "summary": {
    "total": 236,
    "uploaded": 0,
    "failed": 236,
    "categories": [...]
  },
  "note": "Create a 'Sources' table in Airtable first to persist these records",
  "timestamp": "2026-06-04T..."
}
```

## Airtable Integration

### Schema

The `DATA_SOURCES` base includes:

**Sources Table:**
- `name` (singleLineText) — Source name
- `category` (singleSelect) — Category from 6 options
- `description` (multilineText) — Source description
- `url` (url) — API endpoint or web URL
- `is_free` (checkbox) — Free or paid
- `requires_api_key` (checkbox) — API key required
- `api_key` (singleLineText) — Encrypted API key (if provided)
- `status` (singleSelect) — Active, Inactive, Testing, Error, Rate Limited
- `records_imported` (number) — Count of records imported
- `import_frequency` (singleSelect) — Manual, Hourly, Daily, Weekly, Monthly
- `data_type` (singleSelect) — Contracts, Opportunities, Companies, Contacts, Locations, Financial, Mixed
- `geographic_scope` (singleLineText) — "US Federal", "Florida", "All States", etc.
- `error_message` (multilineText) — Error details if status = Error
- `notes` (multilineText) — Internal notes

**Import Logs Table:**
- `source_name` — Name of source
- `import_date` — Date of import
- `records_count` — Number of records imported
- `status` — Success, Failed, Partial, Pending
- `error_details` — Error information
- `duration_ms` — Import duration
- `timestamp` — Auto-timestamp

### Setup

To enable Airtable import:

```bash
# 1. Create the DATA_SOURCES base in Airtable
# 2. Note the base ID

# 3. Create the Sources table with schema above
# 4. Set environment variables
export AIRTABLE_API_KEY=your_api_key
export AIRTABLE_BASE_ID=appXXXXXXXXXXXXXXX

# 5. Run the import script
npm run scripts/import-data-sources.mjs
```

## Data Source Categories Reference

### Gobierno Federal (10 sources)
- SAM.gov API — Federal contracts & opportunities
- USASpending.gov API — Federal spending data
- FPDS-NG API — Procurement data since 2004
- Grants.gov API — Federal grant opportunities
- Data.gov CKAN API — Central federal data portal
- GSA Per Diem API — Travel rates by city
- GSA Auctions API — Federal property auctions
- beta.SAM Entity API — Entity lookup
- FOIA.gov API — FOIA requests & status
- Regulations.gov API — Federal regulations & comments

### Estatal y Local (10 sources)
- OpenCorporates API — All US state company registries
- Florida Division of Corporations — Florida business registry
- California Secretary of State API — CA business records
- Texas SOS Direct API — TX business filings
- NY Open Data API — NY business licenses & permits
- Illinois Data Portal — IL business & contract data
- Miami-Dade Open Data — Local Miami business data
- City of Chicago Data Portal — Chicago business licenses
- LA County Open Data — LA County licenses & permits
- Georgia Secretary of State — GA business registry

### GIS y Geoespacial (10 sources)
- Census Bureau API — Demographics, TIGER, NAICS
- Overpass API (OSM) — OpenStreetMap data
- ESRI ArcGIS Hub API — Geospatial datasets
- USGS National Map API — Topography & satellite imagery
- HUD Location Affordability — Housing cost analysis
- NOAA Weather API — Climate & forecast data
- Google Maps Places API — Business locations
- Geocodio API — Address geocoding
- EPA Facility Registry (FRS) — Industrial facilities
- Plus 20+ more geo sources

### Salud y Regulación (6 sources)
- CMS NPI Registry — Healthcare providers
- openFDA API — Drug recalls & devices
- CMS Hospital Compare — Hospital quality data
- HRSA Health Workforce — Community health centers
- DEA Registrant Lookup — Licensed pharmacists & doctors
- CMS Physician Compare — Medicare physicians

### Financiero y Corporativo (9 sources)
- SEC EDGAR Full-Text API — Company filings 10-K, 10-Q, 8-K
- SEC EDGAR Company API — Company CIK & ticker lookup
- IRS Nonprofits (ProPublica) — Form 990 nonprofit data
- FDIC Bank Data API — Bank locations & assets
- Federal Reserve FRED API — Economic indicators
- SBA Loan Data — Small business loans
- PPP Loan Data — COVID-19 PPP recipients
- USDebtwatch API — Federal debt tracking
- Plus 20+ more financial sources

### Directorios de Negocios (6 sources)
- Yelp Fusion API — Local business listings
- Crunchbase API — Startup funding data
- LinkedIn (via Apify) — Executive profiles
- BBB API — Better Business Bureau ratings
- Glassdoor API — Company reviews & salary data
- Plus 45+ more business directory sources

## Usage Examples

### Example 1: Find Federal Contractors

```typescript
// Fetch all federal government sources
const sources = await fetch('/api/sources/list?category=Gobierno%20federal')
  .then(r => r.json())

// Filter for contract sources
const contractSources = sources.sources.filter(s => 
  s.name.includes('Contracts') || s.name.includes('contratos')
)

// Examples: SAM.gov, USASpending, FPDS-NG, Grants.gov
```

### Example 2: Export For Analysis

```bash
# Export all government & financial sources
curl "http://localhost:3000/api/sources/export?format=json" \
  -H "Authorization: Bearer token" | jq '.sources[] | select(.category == "Financiero y corporativo")'
```

### Example 3: Setup Automated Import

```typescript
// Import to Airtable and track
const result = await fetch('/api/sources/import-to-airtable', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({})
})

const { summary } = await result.json()
console.log(`Imported: ${summary.uploaded}/${summary.total}`)
```

## Next Steps

1. **Activate Free Sources** — Start with free, no-auth sources (SAM.gov, Census, etc.)
2. **Configure API Keys** — Set up API keys for premium sources
3. **Create Scrapers** — Build integrators for each category
4. **Setup Cron Jobs** — Schedule regular imports
5. **Monitor Import Status** — Track success/error rates

## Technical Notes

- CSV file stored at: `/data/fuentes_datos_eeuu.csv`
- Schema defined at: `/airtable/schema-data-sources.js`
- Import script: `/scripts/import-data-sources.mjs`
- All endpoints require JWT authentication
- Rate limiting applies to all endpoints
- CSV/JSON exports are streamed for large datasets
