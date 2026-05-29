/**
 * GET  /api/settings/keys — Returns current status of all managed env vars (masked, never full values)
 * POST /api/settings/keys — Writes keys to .env file. Requires app restart to take effect.
 *
 * Security: values are NEVER returned to client — only presence indicators.
 * The .env file is on the Docker volume and writable by the Node.js process.
 */

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const ENV_PATH = path.join(process.cwd(), '.env')

const DEMO_PATTERNS = /demo|test|placeholder|your-|change-|example|replace|fake|temp/i

// All API keys managed through the UI
const MANAGED_KEYS = [
  // Government Data
  'SAM_GOV_API_KEY',
  'HIGHERGOV_API_KEY',
  // Contact Intelligence
  'HUNTER_API_KEY',
  'APOLLO_API_KEY',
  'APIFY_API_KEY',
  // AI
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  // CRM & Outreach
  'GHL_API_KEY',
  'GHL_LOCATION_ID',
  'SMARTLEAD_API_KEY',
  'INSTANTLY_API_KEY',
  // Communication
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'WHATSAPP_API_KEY',
  'META_ACCESS_TOKEN',
  // Google
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_MAPS_API_KEY',
  'GOOGLE_GMAIL_TOKEN',
  'GOOGLE_CALENDAR_TOKEN',
  // Infrastructure
  'N8N_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  // Config (not secret)
  'SLACK_WEBHOOK_URL',
  'API_SERVER_URL',
] as const

function isConfigured(key: string): boolean {
  const v = process.env[key] || ''
  return v.length >= 4 && !DEMO_PATTERNS.test(v)
}

function maskValue(key: string): string {
  const v = process.env[key] || ''
  if (!v || !isConfigured(key)) return ''
  if (v.length <= 8) return '••••'
  return '••••' + v.slice(-4)
}

// Preserve .env structure (comments, blank lines) while updating values
function applyUpdatesToEnvContent(original: string, updates: Record<string, string>): string {
  const lines = original.split('\n')
  const applied = new Set<string>()

  const updated = lines.map(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return line
    const eq = trimmed.indexOf('=')
    if (eq === -1) return line
    const k = trimmed.slice(0, eq).trim()
    if (k in updates && updates[k].trim()) {
      applied.add(k)
      return `${k}=${updates[k].trim()}`
    }
    return line
  })

  // Append any new keys not already in file
  for (const [k, v] of Object.entries(updates)) {
    if (!applied.has(k) && v.trim()) {
      updated.push(`${k}=${v.trim()}`)
    }
  }

  return updated.join('\n')
}

export async function GET() {
  const status: Record<string, { configured: boolean; masked: string }> = {}
  for (const key of MANAGED_KEYS) {
    status[key] = { configured: isConfigured(key), masked: maskValue(key) }
  }

  // SAM expiry: the key expires 90 days after creation, but SAM.gov shows 19 days left as of 2026-05-28
  const samKeySet  = isConfigured('SAM_GOV_API_KEY')
  const samExpiry  = samKeySet ? new Date('2026-06-16').toISOString().split('T')[0] : null
  const samDaysLeft = samExpiry ? Math.round((new Date(samExpiry).getTime() - Date.now()) / 86400000) : null

  return NextResponse.json({
    status,
    sam_expiry: samExpiry,
    sam_days_left: samDaysLeft,
    env_path: ENV_PATH,
    writable: (() => { try { fs.accessSync(ENV_PATH, fs.constants.W_OK); return true } catch { return false } })(),
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const { keys, clear } = body as { keys?: Record<string, string>; clear?: string[] }

  // Handle clearing keys
  if (clear && Array.isArray(clear)) {
    const allowed = clear.filter(k => MANAGED_KEYS.includes(k as any))
    if (allowed.length === 0) return NextResponse.json({ error: 'No valid keys to clear' }, { status: 400 })
    try {
      const current = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf-8') : ''
      const lines = current.split('\n').map(line => {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) return line
        const eq = trimmed.indexOf('=')
        if (eq === -1) return line
        const k = trimmed.slice(0, eq).trim()
        return allowed.includes(k) ? `${k}=` : line
      })
      fs.writeFileSync(ENV_PATH, lines.join('\n'), 'utf-8')
      return NextResponse.json({ ok: true, cleared: allowed, restart_required: true })
    } catch (e: any) {
      return NextResponse.json({ error: `Cannot write .env: ${e.message}` }, { status: 500 })
    }
  }

  if (!keys || typeof keys !== 'object') {
    return NextResponse.json({ error: 'body must be { keys: { KEY: value } } or { clear: [KEY] }' }, { status: 400 })
  }

  // Only allow managed keys — never arbitrary shell injection
  const allowed = Object.fromEntries(
    Object.entries(keys)
      .filter(([k, v]) => MANAGED_KEYS.includes(k as any) && typeof v === 'string' && v.trim().length > 0)
  )

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'No valid keys provided' }, { status: 400 })
  }

  try {
    const current = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf-8') : ''
    const newContent = applyUpdatesToEnvContent(current, allowed)
    fs.writeFileSync(ENV_PATH, newContent, 'utf-8')

    return NextResponse.json({
      ok: true,
      saved: Object.keys(allowed),
      count: Object.keys(allowed).length,
      restart_required: true,
      message: `${Object.keys(allowed).length} key(s) written to .env — restart the app to activate them.`,
    })
  } catch (e: any) {
    return NextResponse.json({ error: `Cannot write to .env: ${e.message}` }, { status: 500 })
  }
}
