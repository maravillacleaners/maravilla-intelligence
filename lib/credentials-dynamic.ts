/**
 * Dynamic credentials from Airtable Settings table
 * Reads at runtime → no restart needed when changing keys
 * 5-minute cache to avoid hammering Airtable
 */

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || process.env.NEXT_PUBLIC_AIRTABLE_API_KEY
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID
const SETTINGS_TABLE_ID = process.env.AIRTABLE_TBL_SETTINGS || 'tblyKBBgMjzvhD9Ij'

interface SettingRecord {
  id: string
  fields: {
    Key: string
    Value: string
    Active?: boolean
    Type?: string
  }
}

let credentialsCache: Map<string, string> = new Map()
let cacheExpiry = 0

async function fetchSettingsFromAirtable(): Promise<Map<string, string>> {
  if (credentialsCache.size > 0 && Date.now() < cacheExpiry) {
    return credentialsCache
  }

  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${SETTINGS_TABLE_ID}?maxRecords=100`,
      {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      }
    )

    if (!res.ok) {
      console.warn(`[Credentials] Failed to fetch settings: ${res.status}`)
      // Fallback to .env on error
      return getEnvCredentials()
    }

    const data = await res.json()
    credentialsCache.clear()

    for (const record of data.records || []) {
      const { Key, Value, Active } = record.fields
      if (Key && Value && Active !== false) {
        credentialsCache.set(Key, Value)
      }
    }

    // Cache for 5 minutes
    cacheExpiry = Date.now() + 5 * 60 * 1000

    return credentialsCache
  } catch (e) {
    console.warn(`[Credentials] Error fetching from Airtable:`, e)
    return getEnvCredentials()
  }
}

function getEnvCredentials(): Map<string, string> {
  const env = new Map<string, string>()
  if (process.env.SAM_GOV_API_KEY) env.set('SAM_GOV_API_KEY', process.env.SAM_GOV_API_KEY)
  if (process.env.HUNTER_API_KEY) env.set('HUNTER_API_KEY', process.env.HUNTER_API_KEY)
  if (process.env.ANTHROPIC_API_KEY) env.set('ANTHROPIC_API_KEY', process.env.ANTHROPIC_API_KEY)
  if (process.env.N8N_API_KEY) env.set('N8N_API_KEY', process.env.N8N_API_KEY)
  if (process.env.SLACK_WEBHOOK_URL) env.set('SLACK_WEBHOOK_URL', process.env.SLACK_WEBHOOK_URL)
  return env
}

// Main function to get a credential
export async function getCredential(key: string): Promise<string> {
  const settings = await fetchSettingsFromAirtable()
  return settings.get(key) || process.env[key] || ''
}

// For backward compatibility: exported credentials object
export const credentials = {
  get adminSecret(): string {
    return process.env.ADMIN_SECRET || ''
  },

  get jwtSecret(): string {
    return process.env.JWT_SECRET_SUPPLIER || ''
  },

  get airtableApiKey(): string {
    return AIRTABLE_API_KEY || ''
  },

  get airtableBaseId(): string {
    return AIRTABLE_BASE_ID || ''
  },

  // These will be fetched from Airtable on first use
  samGovApiKey: '',
  hunterApiKey: '',
  anthropicApiKey: '',
  n8nApiKey: '',
  slackWebhookUrl: '',
}

// Initialize on import
if (typeof window === 'undefined') {
  // Server-side: fetch settings once at startup
  fetchSettingsFromAirtable().catch(console.warn)
}
