import { NextResponse } from 'next/server'
import { readAllSyncLogs, SyncEntry } from '@/lib/sync-log'

/**
 * GET /api/settings/status
 * Returns operational status for all integrations.
 */

const NEXT_RUN: Record<string, string> = {
  sam:          'Daily at 6:00 AM',
  gmail:        'Every 2 hours (when connected)',
  usaspending:  'Daily at 6:30 AM',
  sunbiz:       'Weekly on Monday',
  highergov:    'Daily at 7:00 AM (when configured)',
  hunter:       'On demand',
  apollo:       'On demand',
}

function ageMinutes(timestamp: string | null | undefined): number | null {
  if (!timestamp) return null
  const diff = Date.now() - new Date(timestamp).getTime()
  return Math.round(diff / 60000)
}

function buildIntegrationStatus(
  name: string,
  configured: boolean,
  connected: boolean,
  lastSync: SyncEntry | null
) {
  const age = lastSync ? ageMinutes(lastSync.timestamp) : null
  const base: Record<string, any> = {
    configured,
    connected,
    last_sync: lastSync?.timestamp ?? null,
    last_sync_age_minutes: age,
    next_run: NEXT_RUN[name] ?? null,
  }
  if (lastSync) {
    base.records_created = lastSync.records_created
    base.records_updated = lastSync.records_updated
    base.errors = lastSync.errors
    if (lastSync.error_messages?.length) {
      base.error_messages = lastSync.error_messages
    }
    if (lastSync.metadata) {
      base.metadata = lastSync.metadata
    }
  }
  if (!configured) {
    base.error = `Not configured — add API key in Settings`
  }
  return base
}

async function checkSam(apiKey: string | undefined): Promise<boolean> {
  if (!apiKey) return false
  try {
    const res = await fetch(
      `https://api.sam.gov/prod/opportunities/v2/search?limit=1&api_key=${apiKey}&postedFrom=01/01/2026`,
      { signal: AbortSignal.timeout(8000) }
    )
    // 200 = good, 400 = key valid but bad params, both mean the key works
    return res.status === 200 || res.status === 400
  } catch {
    return false
  }
}

async function checkAirtable(apiKey: string | undefined): Promise<boolean> {
  if (!apiKey) return false
  try {
    const res = await fetch('https://api.airtable.com/v0/meta/bases', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(6000),
    })
    return res.status === 200
  } catch {
    return false
  }
}

export async function GET() {
  const logs = readAllSyncLogs()

  const samKey       = process.env.SAM_GOV_API_KEY
  const gmailToken   = process.env.GOOGLE_GMAIL_TOKEN
  const airtableKey  = process.env.AIRTABLE_API_KEY
  const highergovKey = process.env.HIGHERGOV_API_KEY
  const hunterKey    = process.env.HUNTER_API_KEY
  const apolloKey    = process.env.APOLLO_API_KEY

  // Run live connectivity checks in parallel where appropriate
  const [samConnected, airtableConnected] = await Promise.all([
    checkSam(samKey),
    checkAirtable(airtableKey),
  ])

  const gmailConfigured   = Boolean(gmailToken && gmailToken.length > 10)
  const highergovConfigured = Boolean(highergovKey && highergovKey.length >= 8)
  const hunterConfigured  = Boolean(hunterKey && hunterKey.length > 4)
  const apolloConfigured  = Boolean(apolloKey && apolloKey.length > 4)

  const integrations = {
    sam: buildIntegrationStatus('sam', Boolean(samKey), samConnected, logs.sam ?? null),

    gmail: {
      ...buildIntegrationStatus('gmail', gmailConfigured, gmailConfigured, logs.gmail ?? null),
      ...(gmailConfigured ? {} : { error: 'Not connected — click Connect Gmail in Settings' }),
    },

    airtable: buildIntegrationStatus(
      'airtable',
      Boolean(airtableKey),
      airtableConnected,
      logs.airtable ?? null
    ),

    highergov: buildIntegrationStatus(
      'highergov',
      highergovConfigured,
      highergovConfigured,
      logs.highergov ?? null
    ),

    hunter: buildIntegrationStatus(
      'hunter',
      hunterConfigured,
      hunterConfigured,
      logs.hunter ?? null
    ),

    apollo: buildIntegrationStatus(
      'apollo',
      apolloConfigured,
      apolloConfigured,
      logs.apollo ?? null
    ),

    usaspending: buildIntegrationStatus(
      'usaspending',
      true, // public API, no key needed
      true,
      logs.usaspending ?? null
    ),

    sunbiz: buildIntegrationStatus(
      'sunbiz',
      true, // public API
      true,
      logs.sunbiz ?? null
    ),
  }

  return NextResponse.json({ integrations })
}
