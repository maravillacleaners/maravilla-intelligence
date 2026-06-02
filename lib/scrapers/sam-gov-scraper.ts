/**
 * SAM.gov Opportunities Scraper
 * API: https://api.sam.gov/prod/opportunities/v2/search
 * Fetches active solicitations for janitorial/facility NAICS codes in target states.
 * Extracts contracting officer POCs → Avatars table.
 * Extracts opportunities → Intelligence table.
 */

import { getCredential } from '@/lib/credentials-dynamic'

const SAM_BASE = 'https://api.sam.gov/prod/opportunities/v2/search'

// NAICS codes for Maravilla's business
const TARGET_NAICS = [
  '561720', // Janitorial Services
  '561710', // Exterminating and Pest Control
  '561730', // Landscaping Services
  '561790', // Other Services to Buildings and Dwellings
  '561110', // Office Administrative Services
  '561210', // Facilities Support Services
]

// States where Maravilla operates or targets
const TARGET_STATES = ['FL', 'TX', 'CA', 'GA', 'NC', 'VA']

export interface SamOpportunity {
  noticeId: string
  title: string
  solicitationNumber: string
  agency: string
  type: string
  postedDate: string
  responseDeadline: string | null
  naicsCode: string
  state: string
  description: string
  setAside: string
  active: boolean
  pointOfContact: SamContact[]
  url: string
}

export interface SamContact {
  fullName: string
  email: string
  phone: string
  type: string // 'primary' | 'secondary'
}

async function fetchPage(apiKey: string, naicsCode: string, state: string, postedFrom: string, postedTo: string): Promise<SamOpportunity[]> {
  const params = new URLSearchParams({
    api_key: apiKey,
    limit: '25',
    postedFrom,
    postedTo,
    ncode: naicsCode,           // SAM API uses ncode, not naicsCode
    state,                      // SAM API uses state, not placeOfPerformanceState
  })

  const res = await fetch(`${SAM_BASE}?${params}`, {
    headers: { 'Accept': 'application/json' },
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`SAM.gov API error ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  const opps: any[] = data.opportunitiesData || []

  return opps.map((o: any) => ({
    noticeId: o.noticeId || '',
    title: o.title || '',
    solicitationNumber: o.solicitationNumber || '',
    agency: o.fullParentPathName || o.organizationHierarchy?.name || '',
    type: o.type || o.baseType || 'Solicitation',
    postedDate: o.postedDate || '',
    responseDeadline: o.responseDeadLine || null,
    naicsCode,
    state,
    description: o.description || '',
    setAside: o.typeOfSetAsideDescription || '',
    active: o.active === 'Yes',
    pointOfContact: (o.pointOfContact || []).map((poc: any) => ({
      fullName: poc.fullName || '',
      email: poc.email || '',
      phone: poc.phone || '',
      type: poc.type || 'primary',
    })).filter((poc: SamContact) => poc.fullName || poc.email),
    url: `https://sam.gov/opp/${o.noticeId}/view`,
  }))
}

export async function fetchSamOpportunities(options: {
  daysBack?: number
  naicsCodes?: string[]
  states?: string[]
} = {}): Promise<SamOpportunity[]> {
  const apiKey = await getCredential('SAM_GOV_API_KEY')
  if (!apiKey || apiKey.length < 8) {
    console.log('[SAM.gov] SAM_GOV_API_KEY not configured — skipping')
    return []
  }

  const naicsCodes = options.naicsCodes || TARGET_NAICS
  const states     = options.states || TARGET_STATES
  const daysBack   = options.daysBack || 30

  const toDate   = new Date()
  const fromDate = new Date(Date.now() - daysBack * 86400000)
  const fmt      = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`

  const postedFrom = fmt(fromDate)
  const postedTo   = fmt(toDate)

  const all: SamOpportunity[] = []
  const seen = new Set<string>()

  for (const naicsCode of naicsCodes) {
    for (const state of states) {
      try {
        const opps = await fetchPage(apiKey, naicsCode, state, postedFrom, postedTo)
        for (const opp of opps) {
          if (!seen.has(opp.noticeId)) {
            seen.add(opp.noticeId)
            all.push(opp)
          }
        }
        await new Promise(r => setTimeout(r, 300)) // rate limit
      } catch (e: any) {
        console.error(`[SAM.gov] NAICS ${naicsCode} / ${state}: ${e.message}`)
      }
    }
  }

  console.log(`[SAM.gov] Fetched ${all.length} unique opportunities`)
  return all
}

// ── SAM.gov Entity API — fetch POC data for a known company ────────────────────
export async function fetchSamEntity(companyName: string): Promise<any | null> {
  const apiKey = await getCredential('SAM_GOV_API_KEY')
  if (!apiKey || apiKey.length < 8) return null

  try {
    const params = new URLSearchParams({ api_key: apiKey, q: companyName, limit: '1' })
    const res = await fetch(`https://api.sam.gov/prod/entity-information/v3/entities?${params}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const data = await res.json()
    const entity = data.entityData?.[0]
    if (!entity) return null
    const poc = entity.pointsOfContact?.governmentBusinessPOC
    return {
      entity_name: entity.entityRegistration?.legalBusinessName || companyName,
      uei: entity.entityRegistration?.ueiSAM || '',
      co_name: poc?.firstName ? `${poc.firstName} ${poc.lastName}`.trim() : '',
      co_email: poc?.electronicBusinessPOC?.email || poc?.email || '',
      co_phone: poc?.phoneNumber || '',
      cage_code: entity.entityRegistration?.cageCode || '',
      naics_code: entity.assertions?.goodsAndServices?.naicsList?.[0]?.naicsCode || '',
    }
  } catch {
    return null
  }
}

// ── Backward-compat aliases for legacy callers ─────────────────────────────────
export const scrapeSamGov = fetchSamOpportunities
export async function saveContractsToAirtable(_contracts: any[]) {
  // Legacy stub — use /api/sam/run endpoint which writes to Intelligence + Avatars directly
  console.warn('[SAM.gov] saveContractsToAirtable is deprecated — use POST /api/sam/run')
}
