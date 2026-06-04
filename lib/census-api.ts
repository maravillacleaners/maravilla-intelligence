/**
 * Census Bureau API Integration
 *
 * Provides demographic data (population, income, education, etc.) for geographic areas
 * Used to enrich prospect data with location-based demographics
 *
 * API: https://api.census.gov/data/2021/acs/acs5
 * Requires: CENSUS_API_KEY (free from https://api.census.gov/data/key_signup.html)
 */

const CENSUS_API_BASE = 'https://api.census.gov/data'
const CENSUS_API_KEY = process.env.CENSUS_API_KEY || ''

interface CensusDataset {
  year: number
  name: string
  variables: {
    [key: string]: string
  }
}

/**
 * Available Census datasets
 */
export const CENSUS_DATASETS: Record<string, CensusDataset> = {
  ACS5_2021: {
    year: 2021,
    name: 'American Community Survey 5-Year 2021',
    variables: {
      'B01003_001E': 'Total Population',
      'B19013_001E': 'Median Household Income',
      'B15003_022E': 'Population 25+ with Bachelor\'s Degree',
      'B08006_001E': 'Total Workers 16+',
      'B08006_003E': 'Workers Using Car/Truck/Van',
      'B25001_001E': 'Total Housing Units',
      'B25002_002E': 'Occupied Housing Units',
      'B02001_002E': 'White Population',
      'B02001_003E': 'Black/African American Population',
      'B02001_005E': 'Asian Population',
      'B03003_003E': 'Hispanic Population',
    },
  },
}

/**
 * Query Census API for demographic data by state, county, or ZIP code
 *
 * Example:
 *   getCensusData('state:12', { B01003_001E, B19013_001E })  // Florida population & median income
 *   getCensusData('county:12,*', { B01003_001E })  // All Florida counties
 */
export async function getCensusData(
  geoId: string,
  variables: string[],
  datasetYear = 2021
): Promise<Record<string, any>[]> {
  if (!CENSUS_API_KEY) {
    throw new Error('CENSUS_API_KEY not configured')
  }

  try {
    const variablesStr = variables.join(',')
    const url = `${CENSUS_API_BASE}/${datasetYear}/acs/acs5?get=NAME,${variablesStr}&for=${geoId}&key=${CENSUS_API_KEY}`

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Census API ${response.status}: ${errorText}`)
    }

    const data = await response.json()

    if (!Array.isArray(data) || data.length < 2) {
      throw new Error('Invalid Census API response format')
    }

    // First row is headers, rest are data
    const headers = data[0]
    const results = data.slice(1).map((row: any[]) => {
      const obj: Record<string, any> = {}
      headers.forEach((header: string, idx: number) => {
        obj[header] = row[idx]
      })
      return obj
    })

    return results
  } catch (error) {
    console.error('[CensusAPI] Error:', error)
    throw error
  }
}

/**
 * Get state demographic summary
 */
export async function getStateDemographics(
  stateCode: string
): Promise<Record<string, any> | null> {
  try {
    const variables = [
      'B01003_001E', // Population
      'B19013_001E', // Median Income
      'B15003_022E', // Bachelor's Degree
    ]

    const results = await getCensusData(`state:${stateCode}`, variables)
    return results.length > 0 ? results[0] : null
  } catch (error) {
    console.warn(`[CensusAPI] Could not fetch state demographics for ${stateCode}:`, error)
    return null
  }
}

/**
 * Get county demographic summary
 */
export async function getCountyDemographics(
  stateCode: string,
  countyCode: string
): Promise<Record<string, any> | null> {
  try {
    const variables = [
      'B01003_001E', // Population
      'B19013_001E', // Median Income
      'B15003_022E', // Bachelor's Degree
    ]

    const results = await getCensusData(`county:${stateCode},${countyCode}`, variables)
    return results.length > 0 ? results[0] : null
  } catch (error) {
    console.warn(
      `[CensusAPI] Could not fetch county demographics for ${stateCode}-${countyCode}:`,
      error
    )
    return null
  }
}

/**
 * Parse location string to Census geography
 * Converts "Miami, FL" or "Lee County, FL" to geo parameters
 */
export function parseLocation(location: string): { geoId: string; description: string } | null {
  if (!location) return null

  const parts = location.split(',').map(p => p.trim())
  if (parts.length < 2) return null

  const state = parts[parts.length - 1].toUpperCase()
  const stateCode = STATE_TO_FIPS[state]
  if (!stateCode) return null

  const areaName = parts.slice(0, -1).join(', ').toLowerCase()

  // Check if it's a county
  if (areaName.includes('county')) {
    const countyName = areaName.replace('county', '').trim()
    const countyCode = FLORIDA_COUNTIES[countyName]
    if (countyCode) {
      return {
        geoId: `county:${stateCode},${countyCode}`,
        description: `${areaName}, ${state}`,
      }
    }
  }

  // Default to state-level
  return {
    geoId: `state:${stateCode}`,
    description: `${state}`,
  }
}

/**
 * State FIPS codes mapping
 */
const STATE_TO_FIPS: Record<string, string> = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09', DE: '10',
  FL: '12', GA: '13', HI: '15', ID: '16', IL: '17', IN: '18', IA: '19', KS: '20',
  KY: '21', LA: '22', ME: '23', MD: '24', MA: '25', MI: '26', MN: '27', MS: '28',
  MO: '29', MT: '30', NE: '31', NV: '32', NH: '33', NJ: '34', NM: '35', NY: '36',
  NC: '37', ND: '38', OH: '39', OK: '40', OR: '41', PA: '42', RI: '44', SC: '45',
  SD: '46', TN: '47', TX: '48', UT: '49', VT: '50', VA: '51', WA: '53', WV: '54',
  WI: '55', WY: '56',
}

/**
 * Florida county FIPS codes (as of 2021)
 */
const FLORIDA_COUNTIES: Record<string, string> = {
  alachua: '001', baker: '003', bay: '005', bradford: '007', brevard: '009',
  broward: '011', calhoun: '013', charlotte: '015', citrus: '017', clay: '019',
  collier: '021', columbia: '023', desoto: '027', dixie: '029', duval: '031',
  escambia: '033', flagler: '035', franklin: '037', gadsden: '039', gilchrist: '041',
  glades: '043', gulf: '045', hamilton: '047', hardee: '049', hendry: '051',
  hernando: '053', highlands: '055', hillsborough: '057', holmes: '059', indian: '061',
  jackson: '063', jefferson: '065', lafayette: '067', lake: '069', lee: '071',
  leon: '073', levy: '075', liberty: '077', madison: '079', manatee: '081',
  marion: '083', martin: '085', miami: '087', monroe: '089', nassau: '091',
  okaloosa: '093', okeechobee: '095', orange: '097', osceola: '099', palm: '101',
  pasco: '103', pinellas: '105', polk: '107', putnam: '109', stjohns: '111',
  santa: '113', sarasota: '115', seminole: '117', sumter: '119', suwannee: '121',
  taylor: '123', union: '125', volusia: '127', wakulla: '129', walton: '131',
  washington: '133',
}

/**
 * Validate Census API connectivity
 */
export async function validateCensusConnection(): Promise<{
  status: 'active' | 'error'
  message: string
  timestamp: string
}> {
  if (!CENSUS_API_KEY) {
    return {
      status: 'error',
      message: 'CENSUS_API_KEY not configured',
      timestamp: new Date().toISOString(),
    }
  }

  try {
    // Test with Florida population query
    const results = await getCensusData('state:12', ['B01003_001E'])

    if (results.length > 0 && results[0]['B01003_001E']) {
      return {
        status: 'active',
        message: `Census API connected. Florida population: ${results[0]['B01003_001E']}`,
        timestamp: new Date().toISOString(),
      }
    }

    return {
      status: 'error',
      message: 'Census API returned invalid data',
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: 'error',
      message: `Census API error: ${String(error)}`,
      timestamp: new Date().toISOString(),
    }
  }
}
