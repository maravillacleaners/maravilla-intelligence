/**
 * GET  /api/settings/integrations — Integration status based on env vars (server-side only)
 * POST /api/settings/integrations — Toggle enable/disable (stored in Airtable Config)
 *
 * Secrets are NEVER returned to the client — only masked presence indicators.
 */

import { NextResponse } from 'next/server'

function checkEnv(vars: string[]): 'configured' | 'demo_key' | 'not_configured' {
  if (vars.length === 0) return 'configured' // public / no key needed
  const DEMO_PATTERNS = /demo|test|placeholder|your-|change-|example|replace|fake|temp/i
  const values = vars.map(v => process.env[v] || '')
  const missing = values.filter(v => !v || v.length < 4)
  if (missing.length === vars.length) return 'not_configured'
  if (values.some(v => DEMO_PATTERNS.test(v))) return 'demo_key'
  if (missing.length > 0) return 'not_configured' // partial — still not configured
  return 'configured'
}

function configuredCount(vars: string[]): number {
  return vars.filter(v => {
    const val = process.env[v] || ''
    return val.length >= 4 && !/demo|test|placeholder|your-|change-/i.test(val)
  }).length
}

const INTEGRATIONS = [
  // ── Government Data Sources ────────────────────────────────────────────────
  {
    id: 'usaspending', name: 'USASpending.gov', category: 'Government Data',
    description: 'Federal contract awards — 3,000+ records synced. Public API, no key needed.',
    env: [], always_available: true,
    docs_url: 'https://api.usaspending.gov',
  },
  {
    id: 'highergov', name: 'HigherGov', category: 'Government Data',
    description: 'Opportunities, people, agencies, awardees, incumbents, recompetes, buyer contacts.',
    env: ['HIGHERGOV_API_KEY'],
    docs_url: 'https://www.highergov.com',
  },
  {
    id: 'samgov', name: 'SAM.gov', category: 'Government Data',
    description: 'Federal opportunities with contracting officer POC + entity registrations.',
    env: ['SAM_GOV_API_KEY'],
    docs_url: 'https://sam.gov',
  },
  {
    id: 'opengov', name: 'OpenGov', category: 'Government Data',
    description: 'State and local government procurement portals.',
    env: ['OPENGOV_API_KEY'],
    docs_url: null,
  },
  {
    id: 'bonfire', name: 'Bonfire', category: 'Government Data',
    description: 'Municipal and state bid management platform.',
    env: ['BONFIRE_API_KEY'],
    docs_url: null,
  },
  {
    id: 'ionwave', name: 'IonWave', category: 'Government Data',
    description: 'Government e-procurement marketplace.',
    env: ['IONWAVE_API_KEY'],
    docs_url: null,
  },
  {
    id: 'demandstar', name: 'DemandStar', category: 'Government Data',
    description: 'Government bid notifications network.',
    env: ['DEMANDSTAR_API_KEY'],
    docs_url: null,
  },
  // ── Business Registration ──────────────────────────────────────────────────
  {
    id: 'sunbiz', name: 'Florida SunBiz', category: 'Business Registration',
    description: 'Florida business entity search. n8n workflow active.',
    env: [], always_available: true,
    docs_url: 'https://dos.myflorida.com/sunbiz',
  },
  {
    id: 'sos', name: 'Secretary of State APIs', category: 'Business Registration',
    description: 'Business registration lookups across all 50 states.',
    env: ['SOS_API_KEY'],
    docs_url: null,
  },
  {
    id: 'property', name: 'Property & Permit Sources', category: 'Business Registration',
    description: 'County property records and building permits for commercial targeting.',
    env: ['PROPERTY_API_KEY'],
    docs_url: null,
  },
  // ── Google Workspace ───────────────────────────────────────────────────────
  {
    id: 'gmail', name: 'Gmail', category: 'Google Workspace',
    description: 'Scan procurement emails, extract opportunities, build entity timelines.',
    env: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_GMAIL_TOKEN'],
    docs_url: null,
  },
  {
    id: 'google_calendar', name: 'Google Calendar', category: 'Google Workspace',
    description: 'Create walkthroughs, reminders, no-show follow-up tasks.',
    env: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALENDAR_TOKEN'],
    docs_url: null,
  },
  {
    id: 'google_drive', name: 'Google Drive', category: 'Google Workspace',
    description: 'Store RFP documents, bid attachments, and intelligence PDFs.',
    env: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    docs_url: null,
  },
  {
    id: 'google_maps', name: 'Google Maps', category: 'Google Workspace',
    description: 'Geocode client locations and validate property addresses.',
    env: ['GOOGLE_MAPS_API_KEY'],
    docs_url: null,
  },
  // ── CRM & Sales ───────────────────────────────────────────────────────────
  {
    id: 'ghl', name: 'GoHighLevel', category: 'CRM & Sales',
    description: 'CRM pipeline sync, follow-up sequences, SMS and email automation.',
    env: ['GHL_API_KEY', 'GHL_LOCATION_ID'],
    docs_url: null,
  },
  {
    id: 'smartlead', name: 'Smartlead', category: 'CRM & Sales',
    description: 'Cold email outreach campaigns at scale.',
    env: ['SMARTLEAD_API_KEY'],
    docs_url: null,
  },
  {
    id: 'instantly', name: 'Instantly', category: 'CRM & Sales',
    description: 'Email warm-up and outreach automation.',
    env: ['INSTANTLY_API_KEY'],
    docs_url: null,
  },
  // ── Contact Intelligence ───────────────────────────────────────────────────
  {
    id: 'hunter', name: 'Hunter.io', category: 'Contact Intelligence',
    description: 'Find and verify professional email addresses by company domain.',
    env: ['HUNTER_API_KEY'],
    docs_url: null,
  },
  {
    id: 'apollo', name: 'Apollo', category: 'Contact Intelligence',
    description: 'B2B contact database with 200M+ profiles.',
    env: ['APOLLO_API_KEY'],
    docs_url: null,
  },
  {
    id: 'apify', name: 'Apify / LinkedIn', category: 'Contact Intelligence',
    description: 'LinkedIn scraping for decision-maker profiles and company data.',
    env: ['APIFY_API_KEY'],
    docs_url: null,
  },
  // ── Communication ──────────────────────────────────────────────────────────
  {
    id: 'twilio', name: 'Twilio / SMS', category: 'Communication',
    description: 'SMS notifications, alerts, and outreach sequences.',
    env: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'],
    docs_url: null,
  },
  {
    id: 'whatsapp', name: 'WhatsApp Business', category: 'Communication',
    description: 'WhatsApp messaging for lead follow-up and client communication.',
    env: ['WHATSAPP_API_KEY'],
    docs_url: null,
  },
  {
    id: 'facebook_leads', name: 'Facebook Leads', category: 'Communication',
    description: 'Real-time lead form submissions from Meta ad campaigns.',
    env: ['META_ACCESS_TOKEN'],
    docs_url: null,
  },
  {
    id: 'instagram', name: 'Instagram / Messenger', category: 'Communication',
    description: 'DM automation and comment response for lead capture.',
    env: ['META_ACCESS_TOKEN'],
    docs_url: null,
  },
  // ── Infrastructure ─────────────────────────────────────────────────────────
  {
    id: 'airtable', name: 'Airtable', category: 'Infrastructure',
    description: 'Primary database — Intelligence, Leads, Avatars, Tasks, Events, Opportunities.',
    env: ['AIRTABLE_API_KEY'],
    docs_url: null,
  },
  {
    id: 'supabase', name: 'Supabase', category: 'Infrastructure',
    description: 'PostgreSQL for payroll, high-volume data, and analytics.',
    env: ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'],
    docs_url: null,
  },
  {
    id: 'n8n', name: 'n8n', category: 'Infrastructure',
    description: '74 active workflows — Sofia recruiting, payroll, supplier portal, GLSA.',
    env: ['N8N_API_KEY'],
    docs_url: null,
  },
  // ── AI ─────────────────────────────────────────────────────────────────────
  {
    id: 'anthropic', name: 'Anthropic / Claude', category: 'AI',
    description: 'Document analysis, email extraction, entity resolution, score explanations.',
    env: ['ANTHROPIC_API_KEY'],
    docs_url: 'https://console.anthropic.com',
  },
  {
    id: 'openai', name: 'OpenAI', category: 'AI',
    description: 'Embeddings, image generation, transcription for creative engine.',
    env: ['OPENAI_API_KEY'],
    docs_url: null,
  },
]

export async function GET() {
  const integrations = INTEGRATIONS.map(intg => {
    const status = (intg as any).always_available ? 'configured' : checkEnv(intg.env)
    const missing_vars = intg.env.filter(v => {
      const val = process.env[v] || ''
      return !val || val.length < 4 || /demo|test|placeholder|your-|change-/i.test(val)
    })

    return {
      id:               intg.id,
      name:             intg.name,
      category:         intg.category,
      description:      intg.description,
      status,
      always_available: !!(intg as any).always_available,
      env_var_count:    intg.env.length,
      configured_count: (intg as any).always_available ? intg.env.length : configuredCount(intg.env),
      missing_vars,           // var names only, never values
      docs_url:         intg.docs_url,
      enabled:          status === 'configured' || (intg as any).always_available,
      last_run:         null, // TODO: pull from Events table
      records_created:  null, // TODO: pull from Events table
      last_error:       null,
    }
  })

  const configured   = integrations.filter(i => i.status === 'configured').length
  const demo_key     = integrations.filter(i => i.status === 'demo_key').length
  const not_set      = integrations.filter(i => i.status === 'not_configured').length

  return NextResponse.json({
    integrations,
    summary: {
      total: integrations.length,
      configured,
      demo_key,
      not_configured: not_set,
    },
  })
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const id     = searchParams.get('id')

  if (action === 'test') {
    const intg = INTEGRATIONS.find(i => i.id === id)
    if (!intg) return NextResponse.json({ error: 'Unknown integration' }, { status: 404 })
    const status = (intg as any).always_available ? 'configured' : checkEnv(intg.env)
    return NextResponse.json({
      id, status,
      message: status === 'configured'
        ? `${intg.name}: credentials present`
        : `${intg.name}: missing ${intg.env.filter(v => !process.env[v]).join(', ')}`,
    })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
