/**
 * SAM.gov Scraper API Route
 * GET/POST /api/scrapers/sam-gov
 *
 * Enhanced SAM.gov contract discovery with:
 * - Florida county location filtering
 * - NAICS code filtering (561720 Janitorial + related)
 * - Opportunity scoring by cleaning relevance
 * - Direct Airtable storage in Opportunities table
 * - POC contact info extraction
 *
 * Response: { opportunities_found, stored, errors, timestamp, sample }
 */

import { fetchSamOpportunities, SamOpportunity, SamContact } from '@/lib/scrapers/sam-gov-scraper'
import { credentials, airtableTables } from '@/app/lib/credentials'

// Florida counties for geo-filtering
const FLORIDA_COUNTIES: Record<string, string> = {
  'MIAMI-DADE': 'Miami-Dade',
  'HILLSBOROUGH': 'Hillsborough',
  'DUVAL': 'Duval',
  'LEE': 'Lee',
  'POLK': 'Polk',
  'ST LUCIE': 'St Lucie',
  'COLLIER': 'Collier',
  'BROWARD': 'Broward',
  'ORANGE': 'Orange',
  'PALM BEACH': 'Palm Beach',
}

// Cleaning industry keywords for scoring
const CLEANING_KEYWORDS = [
  'janitorial',
  'cleaning',
  'custodian',
  'housekeeping',
  'sanitation',
  'facility',
  'maintenance',
  'disinfect',
  'sanitiz',
  'hygiene',
]

const EXCLUDE_KEYWORDS = [
  'asbestos',
  'hazmat',
  'remediation',
  'abatement',
  'waste disposal',
  'landfill',
]

interface OpportunityRecord {
  bid_id: string
  title: string
  agency: string
  state: string
  deadline: string | null
  estimated_value: number | null
  source: string
  status: string
  score: number
  signal_strength: 'high' | 'medium' | 'low'
  scope_summary: string
  cleaning_keywords: string
  naics_codes: string
  source_url?: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
}

interface ScrapeResult {
  opportunities_found: number
  stored: number
  errors: number
  skipped: number
  timestamp: string
  sample?: any[]
  errors_list?: string[]
}

/**
 * Score opportunity by cleaning industry relevance (1-100)
 */
function scoreOpportunitity(opp: SamOpportunity): number {
  const text = `${opp.title} ${opp.description}`.toLowerCase()

  // Quick exclusions
  for (const exclude of EXCLUDE_KEYWORDS) {
    if (text.includes(exclude)) return 0
  }

  let score = 0

  // NAICS 561720 is Janitorial Services (highest priority)
  if (opp.naicsCode === '561720') {
    score += 50
  } else if (['561710', '561730', '561790', '561110', '561210'].includes(opp.naicsCode)) {
    score += 30
  }

  // Keyword matching
  for (const keyword of CLEANING_KEYWORDS) {
    if (text.includes(keyword)) {
      score += 10
    }
  }

  // Set aside scoring (small business = easier to win)
  if (opp.setAside && opp.setAside.toLowerCase().includes('small')) {
    score += 15
  }

  // Deadline proximity (more urgent = higher priority)
  if (opp.responseDeadline) {
    const daysUntil = (new Date(opp.responseDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    if (daysUntil < 7) score += 20
    else if (daysUntil < 14) score += 10
  }

  return Math.min(100, Math.max(0, score))
}

/**
 * Extract primary contact POC
 */
function extractPrimaryContact(contacts: SamContact[]): { name?: string; email?: string; phone?: string } {
  const primary = contacts.find((c) => c.type === 'primary')
  const fallback = contacts[0]
  const contact = primary || fallback

  return {
    name: contact?.fullName || undefined,
    email: contact?.email || undefined,
    phone: contact?.phone || undefined,
  }
}

/**
 * Filter opportunities for Florida and cleaning relevance
 */
function filterAndScoreOpportunities(opportunities: SamOpportunity[]): Array<SamOpportunity & { score: number }> {
  return opportunities
    .filter((opp) => {
      // Must be in Florida
      if (opp.state !== 'FL') return false
      // Must be active
      if (!opp.active) return false
      // Sanity checks
      if (!opp.title || !opp.agency) return false
      return true
    })
    .map((opp) => ({
      ...opp,
      score: scoreOpportunitity(opp),
    }))
    .filter((opp) => opp.score > 0) // Only keep scored opportunities
    .sort((a, b) => b.score - a.score)
}

/**
 * Write opportunity to Airtable
 */
async function writeToAirtable(
  opportunity: SamOpportunity & { score: number }
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  const apiKey = credentials.airtableApiKey
  const baseId = credentials.airtableBaseId
  const tableId = airtableTables.opportunities

  if (!apiKey || !baseId || !tableId) {
    return { success: false, error: 'Missing Airtable credentials' }
  }

  try {
    const contact = extractPrimaryContact(opportunity.pointOfContact)
    const signalStrength: 'high' | 'medium' | 'low' =
      opportunity.score >= 70 ? 'high' : opportunity.score >= 50 ? 'medium' : 'low'

    const record: OpportunityRecord = {
      bid_id: opportunity.noticeId,
      title: opportunity.title.substring(0, 200),
      agency: opportunity.agency.substring(0, 100),
      state: 'FL',
      deadline: opportunity.responseDeadline || null,
      estimated_value: null, // SAM.gov API doesn't always provide this
      source: 'SAM.gov',
      status: 'new',
      score: opportunity.score,
      signal_strength: signalStrength,
      scope_summary: opportunity.description.substring(0, 500),
      cleaning_keywords: CLEANING_KEYWORDS.join(', '),
      naics_codes: opportunity.naicsCode,
      source_url: opportunity.url,
      contact_name: contact.name,
      contact_email: contact.email,
      contact_phone: contact.phone,
    }

    const res = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: record }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error(`[SAM.gov] Airtable write failed for ${opportunity.noticeId}:`, errText)
      return { success: false, error: `${res.status}: ${errText.substring(0, 100)}` }
    }

    const data = await res.json()
    return { success: true, recordId: data.id }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[SAM.gov] Write error for ${opportunity.noticeId}:`, msg)
    return { success: false, error: msg }
  }
}

/**
 * Main scrape handler
 */
async function scrapeHandler(daysBack: number = 30): Promise<ScrapeResult> {
  const startTime = Date.now()
  const errors: string[] = []
  let stored = 0
  let skipped = 0

  try {
    console.log(`[SAM.gov] Fetching opportunities from last ${daysBack} days...`)
    const allOpps = await fetchSamOpportunities({ daysBack })
    console.log(`[SAM.gov] Found ${allOpps.length} opportunities in target states`)

    const filtered = filterAndScoreOpportunities(allOpps)
    console.log(`[SAM.gov] Filtered to ${filtered.length} Florida cleaning-related opportunities`)

    const sample: any[] = []

    for (const opp of filtered) {
      try {
        const result = await writeToAirtable(opp)
        if (result.success) {
          stored++
          if (sample.length < 3) {
            sample.push({
              notice_id: opp.noticeId,
              title: opp.title,
              score: opp.score,
              agency: opp.agency,
              deadline: opp.responseDeadline,
            })
          }
        } else {
          skipped++
          errors.push(`${opp.noticeId}: ${result.error}`)
        }
      } catch (e) {
        skipped++
        const msg = e instanceof Error ? e.message : String(e)
        errors.push(`${opp.noticeId}: ${msg}`)
      }

      // Rate limit: 100ms between writes
      await new Promise((r) => setTimeout(r, 100))
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(
      `[SAM.gov] Scrape complete: ${stored} stored, ${skipped} skipped in ${duration}s`
    )

    return {
      opportunities_found: filtered.length,
      stored,
      errors: errors.length,
      skipped,
      timestamp: new Date().toISOString(),
      sample,
      errors_list: errors.slice(0, 10), // Return first 10 errors
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[SAM.gov] Scrape error:', error)
    errors.push(`Fatal: ${msg}`)

    return {
      opportunities_found: 0,
      stored: 0,
      errors: errors.length,
      skipped: 0,
      timestamp: new Date().toISOString(),
      errors_list: errors,
    }
  }
}

// ── HTTP Handlers ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const daysBack = Math.min(parseInt(searchParams.get('daysBack') || '30', 10), 90) // Max 90 days

  console.log('[API /api/scrapers/sam-gov] GET request')
  const result = await scrapeHandler(daysBack)

  return Response.json(result, { status: 200 })
}

export async function POST(request: Request) {
  try {
    const { daysBack = 30 } = await request.json().catch(() => ({}))

    console.log('[API /api/scrapers/sam-gov] POST request - starting enhanced SAM.gov scrape')

    const result = await scrapeHandler(Math.min(daysBack, 90))

    return Response.json(result, { status: 200 })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[API /api/scrapers/sam-gov] Request error:', error)
    return Response.json(
      {
        opportunities_found: 0,
        stored: 0,
        errors: 1,
        skipped: 0,
        timestamp: new Date().toISOString(),
        errors_list: [errorMsg],
      },
      { status: 400 }
    )
  }
}
