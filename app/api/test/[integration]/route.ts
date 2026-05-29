/**
 * GET  /api/test/[integration]  — Live operational test for an integration
 * POST /api/test/[integration]  — Run sync now (dry_run=false)
 *
 * Integrations: sam | usaspending | gmail | airtable | highergov | hunter | apollo
 *
 * For each integration, proves:
 * - Real API connection (raw HTTP status)
 * - Auth validity (token, key, scopes)
 * - Sample data from last sync (records created, updated, errors)
 * - For OAuth: token expiry, refresh status, scopes
 */

import { NextResponse } from 'next/server'
import { readLastSync } from '@/lib/sync-log'
import fs from 'fs'
import path from 'path'

const KEY  = process.env.AIRTABLE_API_KEY!
const BASE = process.env.AIRTABLE_BASE_ID!

async function testSam(): Promise<Record<string, any>> {
  const apiKey = process.env.SAM_GOV_API_KEY
  if (!apiKey) return { configured: false, error: 'SAM_GOV_API_KEY not set' }

  const today = new Date()
  const from  = new Date(Date.now() - 30 * 86400000)
  const fmt   = (d: Date) => `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`

  const url = `https://api.sam.gov/prod/opportunities/v2/search?limit=3&api_key=${apiKey}&postedFrom=${fmt(from)}&postedTo=${fmt(today)}&ncode=561720&state=FL`
  const start = Date.now()
  let rawStatus = 0
  let sampleRecords: any[] = []
  let totalRecords = 0
  let error: string | null = null

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    rawStatus = res.status
    if (res.ok) {
      const data = await res.json()
      totalRecords = data.totalRecords || 0
      sampleRecords = (data.opportunitiesData || []).slice(0, 3).map((o: any) => ({
        title: o.title?.slice(0, 80),
        agency: (o.fullParentPathName || '').split('.')[0],
        naics: o.naicsCode,
        deadline: o.responseDeadLine?.split('T')[0] || null,
        poc_email: (o.pointOfContact || []).find((p: any) => p.email)?.email || null,
        url: `https://sam.gov/opp/${o.noticeId}/view`,
      }))
    } else {
      const body = await res.text().catch(() => '')
      error = `API error ${res.status}: ${body.slice(0, 200)}`
    }
  } catch (e: any) {
    error = e.message
  }

  const lastSync = readLastSync('sam')
  return {
    configured: true,
    connected: rawStatus === 200,
    raw_http_status: rawStatus,
    response_ms: Date.now() - start,
    total_opportunities_fl_561720: totalRecords,
    sample_records: sampleRecords,
    last_sync: lastSync,
    error,
    key_masked: '••••' + apiKey.slice(-6),
    api_endpoint: 'https://api.sam.gov/prod/opportunities/v2/search',
    correct_params: 'ncode (NAICS filter) + state (place of performance)',
  }
}

async function testAirtable(): Promise<Record<string, any>> {
  const apiKey = process.env.AIRTABLE_API_KEY
  if (!apiKey) return { configured: false, error: 'AIRTABLE_API_KEY not set' }

  const start = Date.now()
  let rawStatus = 0
  let baseName = ''
  let tables: string[] = []
  let leadCount = 0
  let error: string | null = null

  try {
    // Test 1: List bases
    const basesRes = await fetch('https://api.airtable.com/v0/meta/bases', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    })
    rawStatus = basesRes.status
    if (basesRes.ok) {
      const basesData = await basesRes.json()
      const base = basesData.bases?.find((b: any) => b.id === BASE)
      baseName = base?.name || BASE

      // Test 2: Count leads
      const leadsRes = await fetch(
        `https://api.airtable.com/v0/${BASE}/tblja2oeA4oNEjioT?maxRecords=1&fields[]=Entity_Name&fields[]=Stage&fields[]=Source`,
        { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(8000) }
      )
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json()
        leadCount = leadsData.records?.length || 0
      }

      // Test 3: Count tasks
      const tablesRes = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(8000),
      })
      if (tablesRes.ok) {
        const tablesData = await tablesRes.json()
        tables = (tablesData.tables || []).map((t: any) => t.name)
      }
    } else {
      error = `Airtable error ${rawStatus}`
    }
  } catch (e: any) {
    error = e.message
  }

  return {
    configured: true,
    connected: rawStatus === 200,
    raw_http_status: rawStatus,
    response_ms: Date.now() - start,
    base_id: BASE,
    base_name: baseName,
    tables_found: tables,
    sample_lead_count: leadCount,
    error,
  }
}

async function testGmail(): Promise<Record<string, any>> {
  const accessToken  = process.env.GOOGLE_GMAIL_TOKEN
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  const tokenExpiry  = process.env.GOOGLE_TOKEN_EXPIRY

  if (!accessToken) {
    return {
      configured: false,
      connected: false,
      error: 'Gmail not connected — go to Settings → Google Workspace → Connect Gmail',
      setup_instructions: ['Click "Connect Gmail →" in Settings → Google Workspace'],
    }
  }

  const result: Record<string, any> = {
    configured: true,
    connected: false,
    auth_method: 'oauth',
    setup_instructions: [],
  }

  const start = Date.now()

  // Test 1: Verify token via tokeninfo
  try {
    const tokenInfoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`,
      { signal: AbortSignal.timeout(8000) }
    )
    const tokenInfo = await tokenInfoRes.json()
    result.token_info = {
      raw_http_status: tokenInfoRes.status,
      valid: tokenInfoRes.ok && !tokenInfo.error,
      email: tokenInfo.email || null,
      scopes: tokenInfo.scope?.split(' ') || [],
      expires_in_seconds: tokenInfo.expires_in ? Number(tokenInfo.expires_in) : null,
      error: tokenInfo.error || null,
    }

    const hasGmailScope = (tokenInfo.scope || '').includes('gmail')
    result.token_info.has_gmail_scope = hasGmailScope
    result.connected = tokenInfoRes.ok && !tokenInfo.error && hasGmailScope
  } catch (e: any) {
    result.token_info = { error: e.message }
    result.connected = false
  }

  // Test 2: Gmail profile (proves API access)
  try {
    const profileRes = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/profile',
      { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(8000) }
    )
    const profile = await profileRes.json()
    result.gmail_profile = {
      raw_http_status: profileRes.status,
      email: profile.emailAddress || null,
      messages_total: profile.messagesTotal || 0,
      threads_total: profile.threadsTotal || 0,
      error: profile.error?.message || null,
    }
  } catch (e: any) {
    result.gmail_profile = { error: e.message }
  }

  // Test 3: Token expiry check
  if (tokenExpiry) {
    const expiryMs = new Date(tokenExpiry).getTime()
    const nowMs = Date.now()
    const minutesLeft = Math.round((expiryMs - nowMs) / 60000)
    result.token_expiry = {
      expires_at: tokenExpiry,
      minutes_remaining: minutesLeft,
      needs_refresh: minutesLeft < 5,
      expired: minutesLeft < 0,
    }
  }

  // Test 4: Refresh token available
  result.refresh_token = {
    available: !!refreshToken,
    note: refreshToken ? 'Token can be auto-refreshed' : 'No refresh token — if access token expires, re-connect Gmail',
  }

  // Test 5: Token survives restart (check if in .env file)
  try {
    const envPath = path.join(process.cwd(), '.env')
    const envContent = fs.readFileSync(envPath, 'utf-8')
    const inEnvFile = envContent.includes('GOOGLE_GMAIL_TOKEN=')
    result.token_persists_restart = {
      token_in_env_file: inEnvFile,
      note: inEnvFile ? 'Token is in .env file — survives container restarts' : 'Token only in memory — will be lost on restart',
    }
  } catch {
    result.token_persists_restart = { error: 'Cannot read .env file' }
  }

  // Test 6: Quick Gmail scan (procurement emails in last 24h)
  try {
    const since = Math.floor((Date.now() - 86400000) / 1000)
    const query = encodeURIComponent(`janitorial OR cleaning OR rfp OR bid OR solicitation after:${since}`)
    const scanRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=5`,
      { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(8000) }
    )
    const scanData = await scanRes.json()
    result.inbox_scan_24h = {
      raw_http_status: scanRes.status,
      procurement_emails_found: (scanData.messages || []).length,
      message: scanRes.ok ? 'Gmail scan API working' : scanData.error?.message || 'Error',
    }
  } catch (e: any) {
    result.inbox_scan_24h = { error: e.message }
  }

  const lastSync = readLastSync('gmail')
  result.last_sync = lastSync

  return result
}

async function testHigherGov(): Promise<Record<string, any>> {
  const apiKey = process.env.HIGHERGOV_API_KEY
  if (!apiKey || apiKey.length < 8) return { configured: false, error: 'HIGHERGOV_API_KEY not set or too short' }

  const start = Date.now()
  let rawStatus = 0
  let error: string | null = null
  let sample: any[] = []

  try {
    const res = await fetch(
      `https://www.highergov.com/api-external/people/?api_key=${apiKey}&naics_code=561720&page_size=3`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) }
    )
    rawStatus = res.status
    if (res.ok) {
      const data = await res.json()
      const people = data.results || []
      sample = people.slice(0, 3).map((p: any) => ({
        name: p.contact_name || `${p.contact_first_name || ''} ${p.contact_last_name || ''}`.trim(),
        title: p.contact_title,
        agency: p.agency?.agency_name || p.agency_name,
        email: p.contact_email ? '••••@' + p.contact_email.split('@')[1] : null,
      }))
    } else {
      const body = await res.text().catch(() => '')
      error = `HigherGov API ${rawStatus}: ${body.slice(0, 200)}`
    }
  } catch (e: any) {
    error = e.message
  }

  return {
    configured: true,
    connected: rawStatus === 200,
    raw_http_status: rawStatus,
    response_ms: Date.now() - start,
    sample_contacts: sample,
    last_sync: readLastSync('highergov'),
    error,
    key_masked: '••••' + apiKey.slice(-4),
  }
}

async function testUSASpending(): Promise<Record<string, any>> {
  const start = Date.now()
  let rawStatus = 0
  let error: string | null = null
  let totalAwards = 0
  let sample: any[] = []

  try {
    const body = JSON.stringify({
      filters: {
        award_type_codes: ['A', 'B', 'C', 'D'],
        naics_codes: ['561720'],
        time_period: [{ start_date: '2024-01-01', end_date: '2026-12-31' }],
        place_of_performance_locations: [{ country: 'USA', state: 'FL' }],
        award_amounts: [{ lower_bound: 25000, upper_bound: 10000000 }],
      },
      fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Awarding Agency', 'Start Date', 'End Date'],
      limit: 3,
      page: 1,
      sort: 'Award Amount',
      order: 'desc',
    })

    const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body,
      signal: AbortSignal.timeout(15000),
    })
    rawStatus = res.status
    if (res.ok) {
      const data = await res.json()
      totalAwards = data.page_metadata?.total || data.results?.length || 0
      sample = (data.results || []).slice(0, 3).map((r: any) => ({
        recipient: r['Recipient Name'],
        amount: r['Award Amount'],
        agency: r['Awarding Agency'],
        start: r['Start Date'],
        end: r['End Date'],
      }))
    } else {
      error = `USASpending ${rawStatus}`
    }
  } catch (e: any) {
    error = e.message
  }

  return {
    configured: true,
    connected: rawStatus === 200,
    raw_http_status: rawStatus,
    response_ms: Date.now() - start,
    note: 'Public API — no key required',
    total_fl_janitorial_awards: totalAwards,
    sample_prime_contractors: sample,
    last_sync: readLastSync('usaspending'),
    error,
  }
}

const TESTERS: Record<string, () => Promise<Record<string, any>>> = {
  sam: testSam,
  airtable: testAirtable,
  gmail: testGmail,
  highergov: testHigherGov,
  usaspending: testUSASpending,
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ integration: string }> }
) {
  const { integration } = await params
  const tester = TESTERS[integration.toLowerCase()]
  if (!tester) {
    return NextResponse.json({
      error: `Unknown integration: ${integration}`,
      available: Object.keys(TESTERS),
    }, { status: 404 })
  }

  const result = await tester()
  return NextResponse.json({ integration, tested_at: new Date().toISOString(), ...result })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ integration: string }> }
) {
  const { integration } = await params
  const app_url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const SYNC_ENDPOINTS: Record<string, { url: string; method: string; body?: any }> = {
    sam:         { url: `${app_url}/api/sam/run`,              method: 'POST', body: { dry_run: false } },
    usaspending: { url: `${app_url}/api/sources/usaspending`,  method: 'POST' },
    highergov:   { url: `${app_url}/api/contacts/highergov`,   method: 'POST' },
    gmail:       { url: `${app_url}/api/gmail/intake`,         method: 'POST' },
  }

  const endpoint = SYNC_ENDPOINTS[integration.toLowerCase()]
  if (!endpoint) {
    return NextResponse.json({ error: `No sync available for: ${integration}`, available: Object.keys(SYNC_ENDPOINTS) }, { status: 404 })
  }

  const syncStart = Date.now()
  try {
    const syncRes = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: { 'Content-Type': 'application/json' },
      body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
    })
    const syncData = await syncRes.json()
    // Run connectivity test after sync
    const testResult = TESTERS[integration.toLowerCase()] ? await TESTERS[integration.toLowerCase()]() : {}
    return NextResponse.json({
      integration,
      sync_triggered: true,
      sync_duration_ms: Date.now() - syncStart,
      sync_result: syncData,
      post_sync_status: testResult,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, integration }, { status: 500 })
  }
}
