/**
 * Public API Discovery — ContractEdge Intelligence
 *
 * GET /api/v1
 *
 * Returns an OpenAPI-like specification of all public endpoints available
 * for consumption by n8n, external tools, or partner integrations.
 * No authentication required on this endpoint itself.
 */

import { NextResponse } from 'next/server'

const SPEC = {
  version: '1.0',
  platform: 'ContractEdge Intelligence',
  company: 'Maravilla Cleaners LLC',
  base_url: 'https://suppliers.maravillacleaners.com/api',
  description:
    'Federal contract intelligence and CRM sync API for identifying subcontracting opportunities in the cleaning and facilities sector.',
  authentication: {
    note: 'Most write endpoints require no auth in internal mode. The /api/v1/awards endpoint requires X-API-Key header for external access.',
    header: 'X-API-Key',
  },
  endpoints: [
    {
      method: 'GET',
      path: '/api/awards',
      description: 'Federal contract awards from the Intelligence table',
      params: [
        { name: 'range', type: 'string', description: 'Time window: 7d | 30d | 90d | 1y (default: 90d)' },
        { name: 'type', type: 'string', description: 'Award type filter: prime | sub | all (default: all)' },
      ],
      returns: 'Array of award objects with contractor, agency, amount, NAICS, place, CRM status',
      auth: false,
    },
    {
      method: 'GET',
      path: '/api/v1/awards',
      description: 'Public alias for /api/awards — requires API key for external/n8n access',
      params: [
        { name: 'range', type: 'string', description: 'Time window: 7d | 30d | 90d | 1y' },
        { name: 'type', type: 'string', description: 'prime | sub | all' },
      ],
      returns: 'Same as /api/awards',
      auth: true,
      auth_header: 'X-API-Key',
    },
    {
      method: 'GET',
      path: '/api/discovery/matches',
      description: 'Discovery intelligence feed — all records with a discovery_date, sorted newest first',
      params: [],
      returns: 'Array of match objects: legalName, naics, county, predictedScore, pipeline status',
      auth: false,
    },
    {
      method: 'POST',
      path: '/api/enrich',
      description: 'Enrich a company with email patterns and domain intelligence',
      body: [
        { name: 'companyName', type: 'string', description: 'Company name to enrich', required: true },
        { name: 'domain', type: 'string', description: 'Known domain (optional)', required: false },
        { name: 'email', type: 'string', description: 'Known email (optional)', required: false },
        { name: 'record_id', type: 'string', description: 'Airtable record ID to auto-resolve name', required: false },
      ],
      returns: 'email_patterns, domain, estimated_contacts, estimated_size, source',
      auth: false,
    },
    {
      method: 'POST',
      path: '/api/score',
      description: 'Score a contract record using Maravilla-specific criteria (Claude + rule-based fallback)',
      body: [
        { name: 'record_id', type: 'string', description: 'Airtable record ID to score', required: false },
        { name: 'record', type: 'object', description: 'Inline contract fields (if no record_id)', required: false },
        { name: 'use_claude', type: 'boolean', description: 'Use Claude scoring (default: true)', required: false },
      ],
      returns: 'score (0-100), priority, reasoning, subcontracting_note, wrote_to_airtable',
      auth: false,
    },
    {
      method: 'GET',
      path: '/api/price-intel',
      description: 'Price triangulation — calculates median/percentile prime values and sub-estimate ranges for a NAICS + market',
      params: [
        { name: 'naics', type: 'string', description: 'NAICS code (e.g. 561720)', required: true },
        { name: 'state', type: 'string', description: 'State abbreviation (e.g. FL)', required: false },
        { name: 'county', type: 'string', description: 'County name (e.g. Miami-Dade)', required: false },
      ],
      returns: 'sample_size, prime_contract stats (median/min/max/p25/p75), sub_estimate (low/mid/high), market_insight',
      auth: false,
    },
    {
      method: 'POST',
      path: '/api/ghl/sync',
      description: 'Sync an Intelligence record to GoHighLevel CRM as a contact. Sets pipeline_status = Discovered in Airtable.',
      body: [
        { name: 'record_id', type: 'string', description: 'Airtable record ID from Intelligence table', required: true },
      ],
      returns: 'ghl_contact_id, ghl_action (created|updated|mock), pipeline_status, tags',
      auth: false,
      env_required: ['GHL_API_KEY', 'GHL_LOCATION_ID'],
    },
    {
      method: 'GET',
      path: '/api/ghl/pipeline',
      description: 'Returns pipeline stages from GoHighLevel. Falls back to mock stages when GHL_API_KEY is not set.',
      params: [],
      returns: 'Array of pipelines with id, name, and stages (id, name, order)',
      auth: false,
    },
    {
      method: 'POST',
      path: '/api/ghl/pipeline',
      description: 'Move a GHL contact to a specific pipeline stage (creates or updates an opportunity)',
      body: [
        { name: 'contact_id', type: 'string', description: 'GHL contact ID', required: true },
        { name: 'pipeline_id', type: 'string', description: 'GHL pipeline ID', required: true },
        { name: 'stage_id', type: 'string', description: 'GHL stage ID to move contact into', required: true },
        { name: 'opportunity_name', type: 'string', description: 'Optional opportunity label', required: false },
      ],
      returns: 'opportunity_id, action (created|updated|mock), contact_id, stage_id',
      auth: false,
    },
    {
      method: 'POST',
      path: '/api/contracts',
      description: 'Orchestrates the full Phase 5 pipeline: discovery → scoring → supplier matching',
      body: [],
      returns: 'Execution log with stage results: discovered, scored, matched supplier counts',
      auth: false,
    },
  ],
  n8n_quickstart: {
    note: 'All GET endpoints can be polled with HTTP Request node. POST endpoints accept JSON body.',
    example_workflow: [
      { step: 1, action: 'GET /api/awards?range=7d', node: 'HTTP Request', output: 'New award records' },
      { step: 2, action: 'POST /api/score', node: 'HTTP Request', output: 'Scored record' },
      { step: 3, action: 'POST /api/ghl/sync', node: 'HTTP Request', output: 'GHL contact created' },
      { step: 4, action: 'POST /api/ghl/pipeline', node: 'HTTP Request', output: 'Contact moved to Discovered stage' },
    ],
  },
  generated_at: new Date().toISOString(),
}

export async function GET() {
  return NextResponse.json(SPEC, {
    headers: {
      // Cache for 5 minutes — spec rarely changes
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
    },
  })
}
