/**
 * POST /api/sam/run
 * Fetches SAM.gov opportunities for janitorial NAICS codes in target states.
 * Stores opportunities → Intelligence table (tbl3qWHqunA0eERE2)
 * Stores contracting officers → Avatars table (tblrIv6lKjsMeUcyU)
 *
 * REAL DATA ONLY — never invents agencies, contacts, or values.
 * Requires SAM_GOV_API_KEY env var (free key from sam.gov → Profile → API Keys).
 */

import { NextResponse } from 'next/server'
import { fetchSamOpportunities, type SamOpportunity } from '@/lib/scrapers/sam-gov-scraper'

const KEY  = process.env.AIRTABLE_API_KEY!
const BASE = process.env.AIRTABLE_BASE_ID!
const AT   = `https://api.airtable.com/v0/${BASE}`
const HDR  = () => ({ Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' })

const TBL_INTEL   = 'tbl3qWHqunA0eERE2'
const TBL_AVATARS = 'tblrIv6lKjsMeUcyU'

async function atCreate(table: string, fields: Record<string, any>): Promise<any> {
  const res = await fetch(`${AT}/${table}`, {
    method: 'POST', headers: HDR(),
    body: JSON.stringify({ fields, typecast: true }),
  })
  return res.json()
}

async function atList(table: string, formula: string): Promise<any[]> {
  const p = new URLSearchParams({ filterByFormula: formula, maxRecords: '1' })
  const res = await fetch(`${AT}/${table}?${p}`, { headers: HDR() })
  if (!res.ok) return []
  const data = await res.json()
  return data.records || []
}

async function intelExists(noticeId: string): Promise<boolean> {
  const recs = await atList(TBL_INTEL, `{usaspending_id}="${noticeId.replace(/"/g, '\\"')}"`)
  return recs.length > 0
}

async function avatarExists(email: string): Promise<boolean> {
  if (!email) return false
  const recs = await atList(TBL_AVATARS, `{Email}="${email.replace(/"/g, '\\"')}"`)
  return recs.length > 0
}

function scoreOpportunity(opp: SamOpportunity): number {
  let score = 60
  if (opp.state === 'FL') score += 15
  if (opp.setAside.toLowerCase().includes('small business')) score += 10
  if (opp.pointOfContact.some(p => p.email)) score += 10
  if (opp.naicsCode === '561720') score += 5 // Janitorial = perfect fit
  if (opp.responseDeadline) {
    const daysLeft = (new Date(opp.responseDeadline).getTime() - Date.now()) / 86400000
    if (daysLeft > 0 && daysLeft <= 14) score += 5 // urgent
  }
  return Math.min(score, 100)
}

function normalizeEntityKey(name: string): string {
  return 'company:' + name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 120)
}

export async function POST(request: Request) {
  const body       = await request.json().catch(() => ({}))
  const dry_run    = body.dry_run ?? false
  const days_back  = body.days_back ?? 30

  const apiKey = process.env.SAM_GOV_API_KEY
  if (!apiKey || apiKey.length < 8) {
    return NextResponse.json({
      ok: false,
      error: 'SAM_GOV_API_KEY not configured. Get a free key at sam.gov → Sign In → API Keys.',
      configured: false,
    }, { status: 400 })
  }

  let opps_created = 0
  let opps_skipped = 0
  let contacts_created = 0
  let contacts_skipped = 0
  const errors: string[] = []

  try {
    const opportunities = await fetchSamOpportunities({ daysBack: days_back })

    for (const opp of opportunities) {
      // ── Store opportunity in Intelligence table ──
      try {
        const exists = await intelExists(opp.noticeId)
        if (exists) {
          opps_skipped++
        } else if (!dry_run) {
          const score = scoreOpportunity(opp)
          await atCreate(TBL_INTEL, {
            opportunity_title:   opp.title,
            awarding_agency:     opp.agency,
            naics_code:          opp.naicsCode,
            place_of_performance: opp.state,
            usaspending_id:      opp.noticeId,
            score,
            description:         opp.description.slice(0, 500),
            deadline:            opp.responseDeadline?.split('T')[0] || '',
            source:              'sam.gov',
            source_url:          opp.url,
            opportunity_type:    opp.type,
            set_aside:           opp.setAside,
            posted_date:         opp.postedDate?.split('T')[0] || '',
            solicitation_number: opp.solicitationNumber,
            active:              opp.active,
          })
          opps_created++
          await new Promise(r => setTimeout(r, 150))
        } else {
          opps_created++ // dry_run preview count
        }
      } catch (e: any) {
        errors.push(`opp ${opp.noticeId}: ${e.message}`)
      }

      // ── Store contracting officer POCs in Avatars table ──
      for (const poc of opp.pointOfContact) {
        if (!poc.fullName && !poc.email) continue
        try {
          const exists = poc.email ? await avatarExists(poc.email) : false
          if (exists) {
            contacts_skipped++
          } else if (!dry_run) {
            const agencyEntityKey = normalizeEntityKey(opp.agency || opp.title)
            await atCreate(TBL_AVATARS, {
              Name:             poc.fullName || 'Unknown Contact',
              Email:            poc.email || '',
              Phone:            poc.phone || '',
              Organization:     opp.agency || '',
              Title:            'Contracting Officer',
              Avatar_Type:      'contracting_officer',
              Entity_Key:       agencyEntityKey,
              Influence_Score:  75,
              Relevance_Score:  80,
              Source:           'sam.gov',
              Source_URL:       opp.url,
              Notes:            `Solicitation: ${opp.title} | NAICS: ${opp.naicsCode} | State: ${opp.state} | Posted: ${opp.postedDate?.split('T')[0] || ''}`,
              Last_Seen:        new Date().toISOString().split('T')[0],
              Verified:         'verified', // SAM.gov is an authoritative source
            })
            contacts_created++
            await new Promise(r => setTimeout(r, 150))
          } else {
            contacts_created++ // dry_run preview count
          }
        } catch (e: any) {
          errors.push(`poc ${poc.email}: ${e.message}`)
        }
      }
    }
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e.message,
      configured: true,
    }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    dry_run,
    configured: true,
    stats: {
      opportunities_fetched: opps_created + opps_skipped,
      opportunities_created: opps_created,
      opportunities_skipped: opps_skipped,
      contacts_created,
      contacts_skipped,
      errors: errors.length,
    },
    errors: errors.slice(0, 10),
  })
}

export async function GET() {
  const configured = !!((process.env.SAM_GOV_API_KEY?.length ?? 0) >= 8)
  return NextResponse.json({
    description: 'POST /api/sam/run — fetch SAM.gov opportunities into Intelligence + Avatars tables',
    configured,
    params: { dry_run: false, days_back: 30 },
    naics: ['561720 Janitorial', '561710 Exterminating', '561730 Landscaping', '561790 Building Services', '561110 Office Admin', '561210 Facilities Support'],
    states: ['FL', 'TX', 'CA', 'GA', 'NC', 'VA'],
    key_setup: 'sam.gov → Sign In → Profile → API Keys (free, instant)',
  })
}
