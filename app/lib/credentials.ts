// Credentials management - NO hardcoded values
// All secrets must come from environment variables

export const credentials = {
  // Authentication (required)
  adminSecret: process.env.ADMIN_SECRET || '',
  jwtSecret: process.env.JWT_SECRET_SUPPLIER || '',

  // Airtable (required)
  airtableApiKey: process.env.AIRTABLE_API_KEY || process.env.NEXT_PUBLIC_AIRTABLE_API_KEY || '',
  airtableBaseId: process.env.AIRTABLE_BASE_ID || process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || '',

  // External APIs (optional)
  samGovApiKey: process.env.SAM_GOV_API_KEY || '',
  n8nApiKey: process.env.N8N_API_KEY || '',
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  hunterApiKey: process.env.HUNTER_API_KEY || '',
}

// Table IDs - read from env with sensible defaults
export const airtableTables = {
  leads: process.env.AIRTABLE_TBL_LEADS || 'tblja2oeA4oNEjioT',
  contacts: process.env.AIRTABLE_TBL_CONTACTS || 'tblrIv6lKjsMeUcyU',
  opportunities: process.env.AIRTABLE_TBL_OPPORTUNITIES || 'tbldTDb1v79dVNCTQ',
  intelligence: process.env.AIRTABLE_TBL_INTELLIGENCE || 'tbl3qWHqunA0eERE2',
  subs: process.env.AIRTABLE_TBL_SUBS || 'tblVcDFJFCXJX1NKR',
  awards: process.env.AIRTABLE_TBL_AWARDS || 'tblSAM5sYGJOWaYXf',
  companies: process.env.AIRTABLE_TBL_COMPANIES || '',
}

// Validate critical credentials
export function validateCredentials() {
  const missing: string[] = []
  if (!credentials.adminSecret) missing.push('ADMIN_SECRET')
  if (!credentials.airtableApiKey) missing.push('AIRTABLE_API_KEY')
  if (!credentials.airtableBaseId) missing.push('AIRTABLE_BASE_ID')

  if (missing.length > 0) {
    console.error(`❌ Missing required env vars: ${missing.join(', ')}`)
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing required credentials')
    }
  }
}
