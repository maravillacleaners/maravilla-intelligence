# Census Bureau API Setup & Integration

## Overview

The Census Bureau API provides free demographic data for enriching prospect profiles with location-based insights:
- Population statistics
- Median household income
- Educational attainment
- Employment & labor force
- Housing data
- Racial/ethnic composition

## Setup Steps

### 1. Request API Key (Free)

1. Go to https://api.census.gov/data/key_signup.html
2. Enter your email address
3. Check email for API key (arrives within seconds)
4. Add to `.env` file:

```bash
CENSUS_API_KEY=your_api_key_here
```

### 2. Verify Configuration

```bash
# Test connectivity locally
curl "http://localhost:3000/api/census-health"

# Expected response:
{
  "api": "Census",
  "status": "active",
  "message": "Census API connected. Florida population: 21538187",
  "timestamp": "2026-06-04T12:00:00.000Z",
  "details": {
    "dataset": "ACS5_2021",
    "endpoint": "https://api.census.gov/data/2021/acs/acs5",
    "configured": true
  }
}
```

### 3. Deploy to VPS

Update `/root/maravilla-intelligence/.env` on the VPS:

```bash
ssh root@72.61.92.220

# Edit .env
nano /root/maravilla-intelligence/.env

# Add Census API key
# Restart container
docker restart maravilla-intelligence
```

## Data Sources & Variables

### Available Datasets

- **ACS5_2021**: American Community Survey 5-Year Data (2021)
- Used for consistent data across all geographies
- Updated annually

### Key Variables

| Code | Description |
|------|-------------|
| B01003_001E | Total Population |
| B19013_001E | Median Household Income |
| B15003_022E | Population 25+ with Bachelor's Degree |
| B08006_001E | Total Workers 16+ |
| B08006_003E | Workers Using Car/Truck/Van |
| B25001_001E | Total Housing Units |
| B25002_002E | Occupied Housing Units |
| B02001_002E | White Population |
| B02001_003E | Black/African American Population |
| B02001_005E | Asian Population |
| B03003_003E | Hispanic Population |

## Integration Points

### 1. Enrichment API
**Path:** `/app/api/enrich/route.ts`

Future enhancement: Add demographic data to company enrichment response:

```typescript
// Get county demographics
const countyDemos = await getCountyDemographics(stateCode, countyCode)

return {
  ...enrichmentResult,
  demographics: {
    population: countyDemos?.B01003_001E,
    median_income: countyDemos?.B19013_001E,
    college_educated_pct: (countyDemos?.B15003_022E / countyDemos?.B01003_001E) * 100,
  }
}
```

### 2. Prospect Enrichment
**Path:** `/lib/census-api.ts`

```typescript
import { parseLocation, getCountyDemographics } from '@/lib/census-api'

// Enrich prospect with location demographics
const geoData = parseLocation(prospect.county)
if (geoData) {
  const demos = await getCountyDemographics(
    geoData.stateCode,
    geoData.countyCode
  )
  prospect.demographics = demos
}
```

### 3. Analytics Dashboard
**Path:** `/app/discovery/analytics`

Display demographic heatmaps by county/region:
- Population density
- Income distribution
- Educational attainment by area
- Employment opportunities

## API Usage

### Query by State

```typescript
import { getCensusData } from '@/lib/census-api'

// Get Florida population & income
const floridaData = await getCensusData(
  'state:12',
  ['B01003_001E', 'B19013_001E']
)
// Returns: [{ NAME: 'Florida', B01003_001E: '21538187', B19013_001E: '60826', state: '12' }]
```

### Query by County

```typescript
// Get all Florida counties population
const countyData = await getCensusData(
  'county:12,*',
  ['B01003_001E']
)
// Returns array of all 67 Florida counties with population
```

### Helper Functions

```typescript
import {
  getStateDemographics,
  getCountyDemographics,
  parseLocation,
  validateCensusConnection
} from '@/lib/census-api'

// Get state summary
const fl = await getStateDemographics('12') // FIPS code
// { NAME: 'Florida', B01003_001E: '21538187', ... }

// Get county summary
const lee = await getCountyDemographics('12', '071') // FL, Lee County
// { NAME: 'Lee County, Florida', B01003_001E: '705539', ... }

// Parse location string
const geo = parseLocation('Lee County, FL')
// { geoId: 'county:12,071', description: 'Lee County, FL' }

// Validate connection
const health = await validateCensusConnection()
// { status: 'active'|'error', message: '...', timestamp: '...' }
```

## Rate Limiting

- Census API: No rate limit (public API)
- No authentication token required
- Free to use indefinitely

## Troubleshooting

### "CENSUS_API_KEY not configured"
- Ensure CENSUS_API_KEY is set in `.env`
- Restart the application after updating `.env`
- Verify key at https://api.census.gov/data/key_signup.html

### Census API Returns 400 Error
- Check geo ID format: `state:12` or `county:12,071`
- Verify FIPS codes are correct
- See Florida county mapping in `lib/census-api.ts`

### No Data Returned
- Verify variable codes are correct (B01003_001E, etc.)
- Some variables may not be available for all geographies
- Check Census API documentation: https://api.census.gov/

### Timeout on VPS
- Allow up to 10 seconds for Census API response
- VPS may have slower internet to Census servers
- Consider caching results in Airtable

## Production Checklist

- [x] Census API module created (`lib/census-api.ts`)
- [x] Health check endpoint created (`app/api/census-health/route.ts`)
- [ ] Add CENSUS_API_KEY to VPS `.env`
- [ ] Restart VPS container
- [ ] Test health check: `GET /api/census-health`
- [ ] Integrate demographics into enrichment flow
- [ ] Document in dashboard UI
- [ ] Cache results to reduce API calls

## Next Steps

1. **Request API Key** (5 min)
   - Go to key signup page
   - Add to `.env`

2. **Local Testing** (10 min)
   - Restart dev server
   - Call `/api/census-health`
   - Verify response

3. **Integration** (2-4 hours)
   - Update enrichment endpoint
   - Add demographics to prospect records
   - Build analytics visualizations

4. **Production Deployment** (30 min)
   - Update VPS `.env`
   - Restart container
   - Test with live prospects

## References

- Census Bureau API: https://api.census.gov/
- API Key Signup: https://api.census.gov/data/key_signup.html
- API Documentation: https://api.census.gov/data/2021/acs/acs5.html
- FIPS Code Reference: https://transition.fcc.gov/oet/info/maps/census/fips.txt
- ACS Data Dictionary: https://api.census.gov/data/2021/acs/acs5/variables.html
