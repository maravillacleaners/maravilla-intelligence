/**
 * SCRAPER CONFIGURATION
 * Centraliza todas las configuraciones y credenciales de scrapers
 */

export const scraperConfig = {
  // Airtable
  airtable: {
    baseId: process.env.AIRTABLE_BASE_ID || 'appZhXnyFiKbnOZLr',
    apiKey: process.env.AIRTABLE_API_KEY || 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92',

    tables: {
      avatars: 'tblJWKZJKLb5tqGNr',
      contacts: 'tblContacts',
      properties: 'tblPropertyRecords',
      businessRegistrations: 'tblBusinessRegistrations',
      awards: 'tblAwards',
      relationships: 'tblAvatarRelationships',
      intelligence: 'tbl3qWHqunA0eERE2',
    },
  },

  // Contact Data APIs
  apis: {
    hunter: {
      key: process.env.HUNTER_API_KEY,
      baseUrl: 'https://api.hunter.io/v2',
      timeout: 10000,
      enabled: !!process.env.HUNTER_API_KEY,
    },
    rocketreach: {
      key: process.env.ROCKETREACH_API_KEY,
      baseUrl: 'https://api.rocketsourcer.com/v1',
      timeout: 10000,
      enabled: !!process.env.ROCKETREACH_API_KEY,
    },
    apollo: {
      key: process.env.APOLLO_API_KEY,
      baseUrl: 'https://api.apollo.io/v1',
      timeout: 10000,
      enabled: !!process.env.APOLLO_API_KEY,
    },
    clearbit: {
      key: process.env.CLEARBIT_API_KEY,
      baseUrl: 'https://person-stream.clearbit.com/v2',
      timeout: 8000,
      enabled: !!process.env.CLEARBIT_API_KEY,
    },
    zillow: {
      key: process.env.ZILLOW_API_KEY,
      baseUrl: 'https://www.zillow.com',
      timeout: 8000,
      enabled: !!process.env.ZILLOW_API_KEY,
    },
    redfin: {
      baseUrl: 'https://api.redfin.com/api/v1',
      timeout: 10000,
      enabled: true, // Público, no requiere key
    },
  },

  // Federal Data APIs
  federal: {
    usaspending: {
      baseUrl: 'https://api.usaspending.gov/api/v2',
      timeout: 15000,
      enabled: true, // Público
    },
    sam: {
      baseUrl: 'https://api.sam.gov/api/v1',
      key: process.env.SAM_API_KEY,
      timeout: 15000,
      enabled: !!process.env.SAM_API_KEY || true, // Tiene free tier
    },
    grants: {
      baseUrl: 'https://api.grants.gov',
      timeout: 10000,
      enabled: true, // Público
    },
  },

  // AI Enrichment
  ai: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-sonnet-4-6',
      timeout: 12000,
      enabled: !!process.env.ANTHROPIC_API_KEY,
    },
  },

  // Scraper Settings
  scraper: {
    timeoutMs: 10000,
    maxRetries: 3,
    retryDelayMs: 1000,
    rateLimitDelayMs: 100,
    batchSize: 10,

    // Features
    saveToAirtable: true,
    useAiEnrichment: true,
    calculateRiskFlags: true,
    deduplicateContacts: true,
    deduplicateBusinesses: true,

    // Limits
    maxResultsPerSearch: 100,
    maxContactsPerCompany: 50,
    maxPropertiesPerOwner: 20,
    minConfidenceThreshold: 30,
  },

  // Logging
  logging: {
    verbose: process.env.DEBUG === 'true',
    logToConsole: true,
    logToFile: process.env.LOG_FILE_PATH,
  },

  // Rate Limiting
  rateLimits: {
    sunbiz: { requestsPerDay: 500, delayBetweenRequestsMs: 100 },
    hunter: { requestsPerMonth: 10000, delayBetweenRequestsMs: 0 },
    rocketreach: { requestsPerMonth: 25000, delayBetweenRequestsMs: 0 },
    apollo: { recordsPerMonth: 100000, delayBetweenRequestsMs: 0 },
    clearbit: { requestsPerDay: 100, delayBetweenRequestsMs: 50 },
    zillow: { requestsPerDay: 1000, delayBetweenRequestsMs: 10 },
    usaspending: { requestsPerDay: 3600, delayBetweenRequestsMs: 100 },
    sam: { requestsPerSecond: 10, delayBetweenRequestsMs: 100 },
  },
}

// Validación de configuración
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!scraperConfig.airtable.apiKey) {
    errors.push('AIRTABLE_API_KEY no configurada')
  }

  if (!scraperConfig.airtable.baseId) {
    errors.push('AIRTABLE_BASE_ID no configurada')
  }

  if (!scraperConfig.apis.hunter.enabled && !scraperConfig.apis.apollo.enabled && !scraperConfig.apis.rocketreach.enabled) {
    console.warn('Ninguna API de contactos habilitada - usando fallbacks')
  }

  if (!scraperConfig.federal.usaspending.enabled) {
    console.warn('USASpending deshabilitado - datos federales limitados')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Estado de APIs disponibles
export function getAvailableApis(): Record<string, boolean> {
  return {
    hunter: scraperConfig.apis.hunter.enabled,
    rocketreach: scraperConfig.apis.rocketreach.enabled,
    apollo: scraperConfig.apis.apollo.enabled,
    clearbit: scraperConfig.apis.clearbit.enabled,
    zillow: scraperConfig.apis.zillow.enabled,
    redfin: scraperConfig.apis.redfin.enabled,
    usaspending: scraperConfig.federal.usaspending.enabled,
    sam: scraperConfig.federal.sam.enabled,
    grants: scraperConfig.federal.grants.enabled,
    anthropic: scraperConfig.ai.anthropic.enabled,
  }
}

// Health check
export async function checkApiHealth(api: string): Promise<boolean> {
  try {
    switch (api) {
      case 'usaspending':
        const res = await fetch(`${scraperConfig.federal.usaspending.baseUrl}/search/spending_by_award`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filters: { keywords: ['test'] },
            page: 1,
            limit: 1,
          }),
          signal: AbortSignal.timeout(5000),
        })
        return res.ok || res.status === 400 // 400 es OK (solo validación)
      case 'airtable':
        const airRes = await fetch(
          `https://api.airtable.com/v0/${scraperConfig.airtable.baseId}`,
          {
            headers: { Authorization: `Bearer ${scraperConfig.airtable.apiKey}` },
            signal: AbortSignal.timeout(5000),
          }
        )
        return airRes.status === 401 || airRes.ok // 401 indica key existe pero no acceso a base
      default:
        return false
    }
  } catch {
    return false
  }
}

// Obtener configuración para un scraper específico
export function getScraperApiConfig(scraperName: string) {
  const configMap: Record<string, any> = {
    sunbiz: { baseUrl: 'https://search.sunbiz.org/Inquiry', timeout: 12000 },
    'property-records': scraperConfig.apis.zillow,
    'contact-finder': scraperConfig.apis,
    'investigator-merge': scraperConfig,
  }

  return configMap[scraperName] || null
}
