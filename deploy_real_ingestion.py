"""
Deploy Real Data Ingestion Pipeline:
1. SAM.gov scraper (entity POC + opportunities POC — real named COs)
2. USASpending upgraded (multi-state + set_aside + relationship mapping)
3. Avatar ingestion route (processes SAM data → avatar records)
4. n8n trigger endpoint for daily automation

All uses __PLACEHOLDER__ pattern to avoid Python f-string escaping.
"""

import subprocess, os

VPS = 'root@srv1112587.hstgr.cloud'
SSH = ['ssh', '-i', os.path.expanduser('~/.ssh/maravilla_vision'), VPS]
APP = '/root/maravilla-intelligence'

def sub(template, **kwargs):
    result = template
    for k, v in kwargs.items():
        result = result.replace(f'__{k}__', v)
    return result

def write_vps(path, content):
    proc = subprocess.run(
        ['ssh', '-i', os.path.expanduser('~/.ssh/maravilla_vision'), VPS,
         f'mkdir -p {os.path.dirname(path)} && cat > {path}'],
        input=content.encode(), capture_output=True
    )
    if proc.returncode != 0:
        print(f'  ERROR writing {path}: {proc.stderr.decode()[:200]}')
    else:
        print(f'  wrote {path}')

def patch_vps(path, old, new, label):
    script = (
        'import sys\n'
        f'with open({repr(path)}) as f: src = f.read()\n'
        f'if {repr(old)} in src:\n'
        f'    src = src.replace({repr(old)}, {repr(new)}, 1)\n'
        f'    with open({repr(path)}, "w") as f: f.write(src)\n'
        f'    print("OK")\n'
        'else:\n'
        '    print("MISS")\n'
    )
    proc = subprocess.run(
        ['ssh', '-i', os.path.expanduser('~/.ssh/maravilla_vision'), VPS,
         'python3', '-c', script],
        capture_output=True, text=True
    )
    result = proc.stdout.strip()
    print(f'  {result}: {label}')

# ── 1. SAM.gov Real Scraper ───────────────────────────────────────────────────

SAM_SCRAPER = r'''/**
 * SAM.gov Real Data Scraper
 * Fetches: (A) Opportunities with POC (contracting officers)
 *          (B) Entity registrations with Points of Contact
 *
 * API key set in env: SAM_GOV_API_KEY
 * Get free key at: sam.gov → Sign In → API Keys
 */

const SAM_API_KEY = process.env.SAM_GOV_API_KEY || ''
const SAM_BASE = 'https://api.sam.gov'

const NAICS_TARGETS = ['561720', '561710', '561730', '561790', '561110', '561210']
const TARGET_STATES = ['FL', 'TX', 'CA', 'GA', 'NC', 'VA']

// ── Opportunities with Contracting Officer POC ────────────────────────────────

export interface SamOpportunity {
  notice_id: string
  title: string
  solicitation_number: string
  department: string
  subtier: string
  office: string
  naics: string
  posted_date: string
  close_date: string | null
  state: string
  city: string
  type: string
  active: boolean
  url: string
  description_url: string
  // Contracting Officer
  co_name: string
  co_email: string
  co_phone: string
  co_type: string
  // Award data if available
  award_date: string | null
  award_amount: number
  awardee_name: string
  awardee_uei: string
}

export async function fetchSamOpportunities(options: {
  naics?: string[]
  states?: string[]
  days_posted?: number
  limit?: number
  include_awards?: boolean
} = {}): Promise<SamOpportunity[]> {
  const {
    naics = NAICS_TARGETS,
    states = TARGET_STATES,
    days_posted = 90,
    limit = 100,
    include_awards = true,
  } = options

  if (!SAM_API_KEY) {
    console.warn('[SAM.gov] No API key set — set SAM_GOV_API_KEY in .env')
    return []
  }

  const results: SamOpportunity[] = []

  for (const naics_code of naics.slice(0, 6)) {
    for (const state of states.slice(0, 6)) {
      try {
        const params = new URLSearchParams({
          api_key: SAM_API_KEY,
          naicsCode: naics_code,
          placeOfPerformanceState: state,
          daysPosted: String(days_posted),
          limit: String(Math.min(limit, 100)),
          offset: '0',
          status: 'active',
          resultFormat: 'JSON',
        })

        if (include_awards) params.set('includeCount', 'true')

        const url = `${SAM_BASE}/opportunities/v2/search?${params}`
        const res = await fetch(url, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(15000),
        })

        if (!res.ok) {
          console.warn(`[SAM.gov] opportunities ${naics_code}/${state}: HTTP ${res.status}`)
          continue
        }

        const data = await res.json()
        const opps = data.opportunitiesData || []

        for (const o of opps) {
          const poc = (o.pointOfContact || [])[0] || {}
          const award = o.award || {}
          const awardee = award.awardee || {}
          const perf = o.placeOfPerformance || {}

          results.push({
            notice_id: o.noticeId || '',
            title: o.title || '',
            solicitation_number: o.solicitationNumber || '',
            department: o.department?.name || o.department || '',
            subtier: o.subtierName || o.subTier?.name || '',
            office: o.officeName || o.officeAddress?.city || '',
            naics: o.naicsCode || naics_code,
            posted_date: o.postedDate || '',
            close_date: o.responseDeadLine || null,
            state: perf?.state?.code || state,
            city: perf?.city?.name || '',
            type: o.type || '',
            active: o.active === 'Yes' || o.active === true,
            url: `https://sam.gov/opp/${o.noticeId}/view`,
            description_url: o.description || '',
            co_name: poc.fullName || '',
            co_email: poc.email || '',
            co_phone: poc.phone || '',
            co_type: poc.type || 'primary',
            award_date: award.date || null,
            award_amount: Number(award.amount) || 0,
            awardee_name: awardee.name || '',
            awardee_uei: awardee.ueiSAM || '',
          })
        }

        // Rate limit
        await new Promise((r) => setTimeout(r, 300))
      } catch (err) {
        console.warn(`[SAM.gov] opportunities error ${naics_code}/${state}:`, err)
      }
    }
  }

  console.log(`[SAM.gov] Fetched ${results.length} opportunities across ${naics.length} NAICS × ${states.length} states`)
  return results
}

// ── Entity Registration — Points of Contact ───────────────────────────────────

export interface SamEntityPOC {
  uei: string
  entity_name: string
  cage_code: string
  registration_status: string
  entity_type: string
  primary_naics: string
  business_types: string[]
  state: string
  city: string
  address: string
  // Points of contact
  gov_business_poc: { name: string; title: string; email: string; phone: string } | null
  past_performance_poc: { name: string; title: string; email: string; phone: string } | null
  electronic_poc: { name: string; title: string; email: string; phone: string } | null
}

export async function fetchSamEntity(entityName: string): Promise<SamEntityPOC | null> {
  if (!SAM_API_KEY) return null

  try {
    const params = new URLSearchParams({
      api_key: SAM_API_KEY,
      entityName,
      samRegistered: 'Yes',
      includeSections: 'entityRegistration,coreData,pointsOfContact',
      limit: '5',
    })

    const url = `${SAM_BASE}/entity-information/v3/entities?${params}`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      console.warn(`[SAM.gov] entity ${entityName}: HTTP ${res.status}`)
      return null
    }

    const data = await res.json()
    const entity = (data.entityData || [])[0]
    if (!entity) return null

    const reg = entity.entityRegistration || {}
    const core = entity.coreData || {}
    const poc = entity.pointsOfContact || {}

    const parsePOC = (p: any) =>
      p?.firstName
        ? {
            name: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
            title: p.title || '',
            email: p.email || '',
            phone: p.phoneNumber || '',
          }
        : null

    const addr = core.physicalAddress || {}

    return {
      uei: reg.ueiSAM || '',
      entity_name: reg.legalBusinessName || entityName,
      cage_code: reg.cageCode || '',
      registration_status: reg.registrationStatus || '',
      entity_type: reg.entityTypeCode || '',
      primary_naics: core.primaryNaics || '',
      business_types: (core.businessTypeList || []).map((b: any) => b.businessTypeDesc || b),
      state: addr.stateOrProvinceCode || '',
      city: addr.city || '',
      address: [addr.addressLine1, addr.city, addr.stateOrProvinceCode, addr.zipCode]
        .filter(Boolean)
        .join(', '),
      gov_business_poc: parsePOC(poc.governmentBusinessPOC),
      past_performance_poc: parsePOC(poc.pastPerformancePOC),
      electronic_poc: parsePOC(poc.electronicBusinessPOC),
    }
  } catch (err) {
    console.warn(`[SAM.gov] entity error for ${entityName}:`, err)
    return null
  }
}
'''

# ── 2. Avatar Ingestion Route ─────────────────────────────────────────────────

INGEST_ROUTE = r'''/**
 * POST /api/avatars/ingest
 * Processes SAM.gov opportunities + entities into the Avatar system.
 * Called by n8n daily workflow or manual trigger.
 *
 * Body: { source: 'sam_opportunities' | 'sam_entity', data: [...], dry_run?: boolean }
 * Returns: { ingested, skipped, created_avatars, created_relationships }
 */

import { NextResponse } from 'next/server'

const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY!
const BASE = process.env.AIRTABLE_BASE_ID!
const TBL_AVATARS = 'tblrIv6lKjsMeUcyU'
const TBL_REL = 'tblYpnlHtIYaf07CA'
const TBL_INTEL = 'tbl3qWHqunA0eERE2'

const AT = `https://api.airtable.com/v0/${BASE}`
const HDR = () => ({ Authorization: `Bearer ${AIRTABLE_KEY}`, 'Content-Type': 'application/json' })

async function atGet(table: string, formula: string, fields?: string[]) {
  const params = new URLSearchParams({ filterByFormula: formula, maxRecords: '5' })
  if (fields) fields.forEach((f) => params.append('fields[]', f))
  const res = await fetch(`${AT}/${table}?${params}`, { headers: HDR() })
  return res.json()
}

async function atCreate(table: string, fields: Record<string, any>) {
  const res = await fetch(`${AT}/${table}`, {
    method: 'POST',
    headers: HDR(),
    body: JSON.stringify({ fields, typecast: true }),
  })
  return res.json()
}

async function atPatch(table: string, id: string, fields: Record<string, any>) {
  const res = await fetch(`${AT}/${table}/${id}`, {
    method: 'PATCH',
    headers: HDR(),
    body: JSON.stringify({ fields, typecast: true }),
  })
  return res.json()
}

async function getOrCreateAvatar(
  name: string,
  entityKey: string,
  organization: string,
  avatarType: string,
  fields: Record<string, any>,
  dry_run: boolean
): Promise<{ id: string; created: boolean }> {
  const formula = `AND({Name}="${name.replace(/"/g, '\\"')}",{Entity_Key}="${entityKey}")`
  const existing = await atGet(TBL_AVATARS, formula, ['Name', 'Status'])
  const rec = existing.records?.[0]
  if (rec) return { id: rec.id, created: false }

  if (dry_run) return { id: 'dry_run', created: true }

  const created = await atCreate(TBL_AVATARS, {
    Name: name,
    Organization: organization,
    Entity_Key: entityKey,
    Avatar_Type: avatarType,
    Status: 'named',
    Outreach_Status: 'not_contacted',
    Last_Seen: new Date().toISOString().split('T')[0],
    Verified: false,
    ...fields,
  })
  return { id: created.id, created: true }
}

async function createRelationship(
  fromId: string,
  toId: string,
  relType: string,
  strength: number,
  context: string,
  dry_run: boolean
) {
  if (dry_run || fromId === 'dry_run' || toId === 'dry_run') return
  const formula = `AND({From_Avatar_ID}="${fromId}",{To_Avatar_ID}="${toId}",{Relationship_Type}="${relType}")`
  const existing = await atGet(TBL_REL, formula, ['From_Avatar_ID'])
  if (existing.records?.length > 0) return
  await atCreate(TBL_REL, {
    From_Avatar_ID: fromId,
    To_Avatar_ID: toId,
    Relationship_Type: relType,
    Strength: strength,
    Context: context.slice(0, 200),
    Last_Seen: new Date().toISOString().split('T')[0],
    Verified: true,
  })
}

async function processOpportunity(opp: any, dry_run: boolean) {
  const stats = { co_created: 0, co_updated: 0, intel_created: 0, relationships: 0 }

  // Skip if no CO name
  if (!opp.co_name && !opp.co_email) return stats

  const co_name = opp.co_name || opp.co_email.split('@')[0].replace('.', ' ')
  const agency = [opp.department, opp.subtier].filter(Boolean).join(' — ')
  const agency_key = `agency:${agency.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').trim()}`
  const notice_ek = `opportunity:${opp.notice_id}`

  // Score CO relevance
  const isFL = opp.state === 'FL'
  const isCleaning = ['561720', '561710', '561730'].includes(opp.naics)
  const influence_score = 85 + (isFL ? 10 : 0)
  const relevance_score = 70 + (isFL ? 25 : 10) + (isCleaning ? 20 : 0)

  const co_fields: Record<string, any> = {
    Title: `Contracting Officer — ${opp.subtier || opp.department}`,
    Email: opp.co_email,
    Phone: opp.co_phone,
    Avatar_Type: 'contracting_officer',
    Decision_Role: 'primary',
    Influence_Score: Math.min(influence_score, 100),
    Relevance_Score: Math.min(relevance_score, 100),
    Confidence: 92,
    Source: 'sam_gov_opportunities',
    Geographic_Jurisdiction: `${opp.city || ''}, ${opp.state}`.trim().replace(/^,\s*/, ''),
    Procurement_Categories: opp.naics,
    Outreach_Strategy: `Contracting Officer posting ${opp.naics} opportunities in ${opp.state}. Posted: ${opp.posted_date}. Close: ${opp.close_date || 'TBD'}. Approach via formal capabilities statement to ${agency}.`,
    Next_Action: `Review ${opp.title.slice(0, 80)}. Submit capabilities statement before ${opp.close_date || 'close date'}. Email: ${opp.co_email}`,
    Relevance_Reason: `Active CO on NAICS ${opp.naics} procurement in ${opp.state}. Posted opportunity: "${opp.title.slice(0, 100)}". Direct contact info available.`,
    Notes: `SAM.gov notice: ${opp.notice_id} | Solicitation: ${opp.solicitation_number} | Posted: ${opp.posted_date}`,
    Contracts_Seen_In: opp.solicitation_number || opp.notice_id,
  }

  const { id: co_id, created } = await getOrCreateAvatar(
    co_name, agency_key, agency, 'contracting_officer', co_fields, dry_run
  )

  if (created) {
    stats.co_created++
  } else if (!dry_run) {
    // Update existing with latest contact info
    await atPatch(TBL_AVATARS, co_id, {
      Email: opp.co_email || undefined,
      Phone: opp.co_phone || undefined,
      Last_Seen: new Date().toISOString().split('T')[0],
    })
    stats.co_updated++
  }

  // Save to intelligence table if new opportunity
  if (!dry_run && opp.notice_id) {
    const intel_formula = `SEARCH("${opp.notice_id}", ARRAYJOIN(IF({usaspending_id}, {usaspending_id}, "")))`
    // Just try to create — duplicates ok, Airtable will fail gracefully
    try {
      await atCreate(TBL_INTEL, {
        opportunity_title: opp.title.slice(0, 200),
        awarding_agency: agency,
        naics_code: opp.naics,
        place_of_performance: opp.state,
        source: 'sam_gov',
        discovery_date: new Date().toISOString().split('T')[0],
        usaspending_id: opp.notice_id,
        record_type: 'opportunity',
        status: opp.active ? 'active' : 'closed',
        description: `${opp.type} | Close: ${opp.close_date || 'TBD'} | CO: ${co_name} <${opp.co_email}>`,
      })
      stats.intel_created++
    } catch (_) {}
  }

  // Link CO to awardee if award data present
  if (opp.awardee_name && !dry_run) {
    const awardee_key = `company:${opp.awardee_name.toUpperCase().slice(0, 80)}`
    // This relationship is valuable: shows which COs award to which primes
    await createRelationship(co_id, awardee_key, 'awards_to', 80, `${agency} → ${opp.awardee_name} | ${opp.naics} | ${opp.state}`, false)
    stats.relationships++
  }

  return stats
}

async function processEntity(entity: any, dry_run: boolean) {
  const stats = { poc_created: 0, poc_updated: 0 }
  const ek = `company:${entity.entity_name.toUpperCase().slice(0, 100)}`

  for (const [poc_type, poc] of Object.entries({
    gov_business_poc: entity.gov_business_poc,
    past_performance_poc: entity.past_performance_poc,
    electronic_poc: entity.electronic_poc,
  })) {
    if (!poc || !(poc as any).name) continue
    const p = poc as any
    if (!p.name.trim()) continue

    const fields = {
      Title: p.title || `${poc_type.replace(/_/g, ' ')} — ${entity.entity_name}`,
      Email: p.email || '',
      Phone: p.phone || '',
      Avatar_Type: 'prime_bd',
      Decision_Role: 'gatekeeper',
      Influence_Score: 75,
      Relevance_Score: 65,
      Confidence: 88,
      Source: 'sam_gov_entity',
      Geographic_Jurisdiction: `${entity.city}, ${entity.state}`,
      Procurement_Categories: entity.primary_naics,
      Notes: `SAM Registration POC (${poc_type}) | UEI: ${entity.uei} | CAGE: ${entity.cage_code} | Types: ${(entity.business_types || []).join(', ')}`,
      Contracts_Seen_In: entity.uei,
    }

    const { created } = await getOrCreateAvatar(p.name, ek, entity.entity_name, 'prime_bd', fields, dry_run)
    if (created) stats.poc_created++
    else stats.poc_updated++
  }

  return stats
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { source, data = [], dry_run = false } = body

    if (!source || !['sam_opportunities', 'sam_entity', 'batch'].includes(source)) {
      return NextResponse.json({ error: 'Invalid source. Use sam_opportunities, sam_entity, or batch.' }, { status: 400 })
    }

    const results = {
      source,
      dry_run,
      processed: 0,
      co_created: 0,
      co_updated: 0,
      poc_created: 0,
      intel_created: 0,
      relationships: 0,
      errors: [] as string[],
    }

    for (const item of data) {
      try {
        if (source === 'sam_opportunities') {
          const s = await processOpportunity(item, dry_run)
          results.co_created += s.co_created
          results.co_updated += s.co_updated
          results.intel_created += s.intel_created
          results.relationships += s.relationships
        } else if (source === 'sam_entity') {
          const s = await processEntity(item, dry_run)
          results.poc_created += s.poc_created
          results.co_updated += s.poc_updated
        }
        results.processed++
        // Small delay to avoid Airtable rate limit
        await new Promise((r) => setTimeout(r, 100))
      } catch (err: any) {
        results.errors.push(`Item ${results.processed}: ${err.message}`)
      }
    }

    return NextResponse.json(results)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    description: 'Avatar Ingestion API',
    endpoints: {
      'POST /api/avatars/ingest': {
        body: { source: 'sam_opportunities | sam_entity', data: 'array of SAM.gov records', dry_run: 'boolean' },
        returns: { processed: 'number', co_created: 'number', poc_created: 'number', relationships: 'number' },
      },
    },
    status: 'ready — waiting for SAM_GOV_API_KEY',
    key_required: !process.env.SAM_GOV_API_KEY,
  })
}
'''

# ── 3. SAM.gov Trigger Script (runs from n8n or cron) ────────────────────────

SAM_RUNNER_ROUTE = r'''/**
 * POST /api/avatars/sam-run
 * Triggers a full SAM.gov → Avatar ingestion cycle.
 * Call from n8n daily workflow or manually.
 *
 * Body: { naics?: string[], states?: string[], days_posted?: number, dry_run?: boolean }
 */

import { NextResponse } from 'next/server'
import { fetchSamOpportunities, fetchSamEntity } from '@/lib/scrapers/sam-gov-scraper'

const PORTAL = process.env.API_SERVER_URL || 'http://localhost:3002'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const {
    naics = ['561720', '561710', '561730'],
    states = ['FL', 'TX', 'GA', 'CA', 'NC'],
    days_posted = 90,
    dry_run = false,
    include_entities = false,
    entity_names = [],
  } = body

  const log: string[] = []
  const stats = { opportunities: 0, entities: 0, co_created: 0, poc_created: 0, intel: 0, relationships: 0 }

  // Phase 1: Fetch SAM opportunities
  log.push('[SAM Run] Fetching opportunities...')
  const opps = await fetchSamOpportunities({ naics, states, days_posted, limit: 100 })
  log.push(`[SAM Run] Found ${opps.length} opportunities with CO data`)
  stats.opportunities = opps.length

  // Phase 2: Ingest into Avatar system
  if (opps.length > 0) {
    const ingestRes = await fetch(`${PORTAL}/api/avatars/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'sam_opportunities', data: opps, dry_run }),
    })
    const ingestData = await ingestRes.json()
    stats.co_created = ingestData.co_created || 0
    stats.intel = ingestData.intel_created || 0
    stats.relationships = ingestData.relationships || 0
    log.push(`[SAM Run] Ingested: ${stats.co_created} COs created, ${stats.intel} opportunities saved`)
  }

  // Phase 3 (optional): Entity POC enrichment for known companies
  if (include_entities && entity_names.length > 0) {
    log.push(`[SAM Run] Fetching entity POC for ${entity_names.length} companies...`)
    for (const name of entity_names.slice(0, 20)) {
      const entity = await fetchSamEntity(name)
      if (entity) {
        const ingestRes = await fetch(`${PORTAL}/api/avatars/ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'sam_entity', data: [entity], dry_run }),
        })
        const d = await ingestRes.json()
        stats.poc_created += d.poc_created || 0
        stats.entities++
      }
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  return NextResponse.json({
    success: true,
    dry_run,
    stats,
    log,
    timestamp: new Date().toISOString(),
  })
}
'''

# ── 4. USASpending Upgraded Scraper ──────────────────────────────────────────

USA_SCRAPER_UPGRADED = r'''import Airtable from 'airtable'

const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appZhXnyFiKbnOZLr'
const TABLE_ID = 'tbl3qWHqunA0eERE2'
const api = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })

const NAICS_TARGETS = ['561720', '561710', '561730', '561790', '561110', '561210']
const TARGET_STATES = ['FL', 'TX', 'CA', 'GA', 'NC', 'VA']
const USA_SPENDING_URL = 'https://api.usaspending.gov/api/v2/search/spending_by_award/'

export async function scrapeUSASpending(options: {
  limit?: number
  min_amount?: number
  days_back?: number
  states?: string[]
  naics?: string[]
} = {}): Promise<any[]> {
  const {
    limit = 100,
    min_amount = 50000,
    days_back = 45,
    states = TARGET_STATES,
    naics = NAICS_TARGETS,
  } = options

  const since = new Date(Date.now() - days_back * 86400000).toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]

  const body = {
    filters: {
      award_type_codes: ['A', 'B', 'C', 'D'],
      naics_codes: naics,
      award_amounts: [{ lower_bound: min_amount }],
      time_period: [{ start_date: since, end_date: today }],
      place_of_performance_locations: states.map((s) => ({ country: 'USA', state: s })),
    },
    fields: [
      'Award ID',
      'Recipient Name',
      'Award Amount',
      'Awarding Agency',
      'Award Date',
      'NAICS Code',
      'Place of Performance City Code',
      'Place of Performance State Code',
      'Type of Set Aside',
      'Contract Award Type',
      'Description',
    ],
    page: 1,
    limit,
    sort: 'Award Amount',
    order: 'desc',
  }

  const res = await fetch(USA_SPENDING_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  })

  if (!res.ok) throw new Error(`USASpending API error ${res.status}`)
  const data = await res.json()

  const today_str = new Date().toISOString().split('T')[0]
  const awards = (data.results || []).map((r: any) => ({
    opportunity_title: `${r['Recipient Name'] || 'Award'} — ${r['Awarding Agency'] || 'Federal'}`,
    awarded_contractor: r['Recipient Name'] || '',
    awarding_agency: r['Awarding Agency'] || '',
    award_amount: Number(r['Award Amount']) || 0,
    award_date: r['Award Date'] || null,
    naics_code: r['NAICS Code'] || '561720',
    place_of_performance: r['Place of Performance State Code'] || '',
    set_asides: r['Type of Set Aside'] || 'Open Competition',
    description: (r['Description'] || '').slice(0, 500),
    usaspending_id: r['Award ID'] || '',
    source: 'usaspending',
    record_type: 'contract',
    legal_name: r['Recipient Name'] || '',
    discovery_date: today_str,
  }))

  console.log(`[USASpending] Fetched ${awards.length} awards from ${states.length} states`)
  await saveAwardsToAirtable(awards)
  return awards
}

export async function saveAwardsToAirtable(awards: any[]) {
  const table = api.base(BASE_ID).table(TABLE_ID)

  const chunks: any[][] = []
  for (let i = 0; i < awards.length; i += 10) chunks.push(awards.slice(i, i + 10))

  let saved = 0
  for (const chunk of chunks) {
    try {
      await table.create(
        chunk.map((a) => ({
          fields: {
            opportunity_title: a.opportunity_title,
            awarded_contractor: a.awarded_contractor || '',
            legal_name: a.legal_name || a.awarded_contractor || '',
            awarding_agency: a.awarding_agency || '',
            award_amount: a.award_amount,
            award_date: a.award_date || undefined,
            naics_code: a.naics_code,
            place_of_performance: a.place_of_performance,
            set_asides: a.set_asides,
            source: a.source,
            record_type: 'contract',
            discovery_date: a.discovery_date,
            usaspending_id: a.usaspending_id,
            description: a.description || '',
          },
        }))
      )
      saved += chunk.length
    } catch (err) {
      console.warn('[USASpending] chunk save error:', err)
    }
  }
  console.log(`[USASpending] Saved ${saved} records to Airtable`)
}
'''

# ── Write files ───────────────────────────────────────────────────────────────

print("Building Real Data Ingestion Pipeline")
print("=" * 60)

write_vps(f'{APP}/lib/scrapers/sam-gov-scraper.ts', SAM_SCRAPER)
write_vps(f'{APP}/app/api/avatars/ingest/route.ts', INGEST_ROUTE)
write_vps(f'{APP}/app/api/avatars/sam-run/route.ts', SAM_RUNNER_ROUTE)
write_vps(f'{APP}/lib/scrapers/usaspending-scraper.ts', USA_SCRAPER_UPGRADED)

# Add SAM_GOV_API_KEY placeholder to .env if not present
add_env_key = subprocess.run(
    ['ssh', '-i', os.path.expanduser('~/.ssh/maravilla_vision'), VPS,
     f"grep -q 'SAM_GOV_API_KEY' {APP}/.env || echo 'SAM_GOV_API_KEY=' >> {APP}/.env && echo 'done'"],
    capture_output=True, text=True
)
print(f"  .env SAM_GOV_API_KEY placeholder: {add_env_key.stdout.strip()}")

print()
print("Files written. Building portal...")
