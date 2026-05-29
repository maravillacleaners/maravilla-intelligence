/**
 * POST /api/leads/intake
 * Ingests new leads from Intelligence and Avatars tables into the Leads table.
 * Called by /api/daily-run Step 1. Returns stats object consumed by daily-run.
 *
 * REAL DATA RULES: Never invent names, emails, values, NAICS, or agencies.
 * Only classifies, scores, and deduplicates data from source tables.
 */

import { NextResponse } from 'next/server'
import { fetchSamOpportunities } from '@/lib/scrapers/sam-gov-scraper'

const KEY  = process.env.AIRTABLE_API_KEY!
const BASE = process.env.AIRTABLE_BASE_ID!
const TBL_LEADS   = 'tblja2oeA4oNEjioT'
const TBL_AVATARS = 'tblrIv6lKjsMeUcyU'
const TBL_EVENTS  = 'tbl84x3ZGOIGf8bDA'
const TBL_TASKS   = 'tblrB7Cj84vLwI8tD'
const TBL_INTEL   = 'tbl3qWHqunA0eERE2'
const TBL_OPPS    = 'tbldTDb1v79dVNCTQ'

const AT  = `https://api.airtable.com/v0/${BASE}`
const HDR = () => ({ Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' })
const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

function normalizeEntityKey(name: string): string {
  return 'company:' + name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 120)
}

async function atList(table: string, formula: string, maxRecords = 100): Promise<any[]> {
  const p = new URLSearchParams({ filterByFormula: formula, maxRecords: String(maxRecords) })
  const res = await fetch(`${AT}/${table}?${p}`, { headers: HDR() })
  if (!res.ok) return []
  const data = await res.json()
  return data.records || []
}

async function atListAll(table: string, extraParts: string[] = [], maxRecords = 100): Promise<any[]> {
  const parts = [`maxRecords=${maxRecords}`, ...extraParts]
  const res = await fetch(`${AT}/${table}?${parts.join('&')}`, { headers: HDR() })
  if (!res.ok) return []
  const data = await res.json()
  return data.records || []
}

async function atCreate(table: string, fields: Record<string, any>): Promise<any> {
  const res = await fetch(`${AT}/${table}`, {
    method: 'POST', headers: HDR(),
    body: JSON.stringify({ fields, typecast: true }),
  })
  return res.json()
}

async function atPatch(table: string, id: string, fields: Record<string, any>): Promise<any> {
  const res = await fetch(`${AT}/${table}/${id}`, {
    method: 'PATCH', headers: HDR(),
    body: JSON.stringify({ fields, typecast: true }),
  })
  return res.json()
}

async function leadExists(entity_key: string): Promise<{ exists: boolean; id: string; score: number }> {
  const safe = entity_key.replace(/"/g, '\\"')
  const recs = await atList(TBL_LEADS, `{Entity_Key}="${safe}"`, 1)
  if (recs.length > 0) {
    return { exists: true, id: recs[0].id, score: recs[0].fields?.Priority_Score || 0 }
  }
  return { exists: false, id: '', score: 0 }
}

// ── Source: Intelligence table ─────────────────────────────────────────────────
async function ingestIntelligence(dry_run: boolean): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
  const stats = { created: 0, updated: 0, skipped: 0, errors: [] as string[] }

  const records = await atListAll(TBL_INTEL, [
    'sort[0][field]=score',
    'sort[0][direction]=desc',
  ], 50)

  for (const rec of records) {
    const f = rec.fields || {}

    // Require a real company/org name — skip if none
    const rawName = (f.awarded_contractor || f.legal_name || f.opportunity_title || '').trim()
    if (!rawName || rawName.length < 3) { stats.skipped++; continue }

    const entity_key = normalizeEntityKey(rawName)
    const score = Number(f.score || f.Priority_Score || 60)

    const existing = await leadExists(entity_key)

    if (existing.exists) {
      if (!dry_run && score > existing.score) {
        await atPatch(TBL_LEADS, existing.id, {
          Priority_Score: score,
          Signal_Date: new Date().toISOString().split('T')[0],
          Source_Record_ID: f.usaspending_id || f.id || rec.id,
        })
        stats.updated++
      } else {
        stats.skipped++
      }
    } else {
      const signals: string[] = []
      if (f.score >= 80) signals.push(`High score ${f.score}`)
      if (f.naics_code?.startsWith('5617') || f.naics_code?.startsWith('5616')) signals.push('Janitorial NAICS')
      if ((f.place_of_performance || '').includes('FL')) signals.push('Florida')
      if (Number(f.award_amount) > 500000) signals.push(`$${(Number(f.award_amount)/1e6).toFixed(1)}M contract`)

      if (!dry_run) {
        await atCreate(TBL_LEADS, {
          Entity_Key:        entity_key,
          Entity_Name:       rawName,
          Lead_Type:         'GovCon Prospect',
          Stage:             'New Signal',
          Priority_Score:    score,
          GovCon_Fit:        score >= 70 ? score : 0,
          Commercial_Fit:    0,
          Score_Signals:     signals.join('\n') || 'USASpending award record',
          Source:            'intelligence',
          Source_Record_ID:  f.usaspending_id || rec.id,
          Value:             Number(f.award_amount) || 0,
          NAICS:             String(f.naics_code || ''),
          Agency:            String(f.awarding_agency || ''),
          Location:          String(f.place_of_performance || ''),
          Description:       String(f.description || f.opportunity_title || '').slice(0, 500),
          Enrichment_Needed: true,
          Contactable:       false,
          Signal_Date:       new Date().toISOString().split('T')[0],
        })

        // Event for high-value new leads
        if (score >= 70) {
          await atCreate(TBL_EVENTS, {
            Entity_Key:  entity_key,
            Entity_Type: 'lead',
            Entity_Name: rawName,
            Event_Type:  'signal_detected',
            Description: `New high-value lead ingested. Score: ${score}. Agency: ${f.awarding_agency || 'unknown'}. Value: $${((Number(f.award_amount)||0)/1e6).toFixed(1)}M. Source: USASpending.`,
            Actor:       'intake_pipeline',
            Source:      'daily_intake',
            Timestamp:   new Date().toISOString(),
          })
        }

        stats.created++
        await delay(120)
      } else {
        stats.created++ // dry_run preview count
      }
    }
  }

  return stats
}

// ── Source: Avatars table ──────────────────────────────────────────────────────
async function ingestAvatars(dry_run: boolean): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
  const stats = { created: 0, updated: 0, skipped: 0, errors: [] as string[] }

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const records = await atListAll(TBL_AVATARS, [
    `filterByFormula=${encodeURIComponent(`{Last_Seen}>="${sevenDaysAgo}"`)}`,
    'sort[0][field]=Influence_Score',
    'sort[0][direction]=desc',
  ], 30)

  for (const rec of records) {
    const f = rec.fields || {}
    // Derive org name: Organization field → Entity_Key strip prefix → Name fallback
    const ekName = (f.Entity_Key || '').replace(/^company:/i, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())
    const org = (f.Organization || ekName || '').trim()
    if (!org || org.length < 3) { stats.skipped++; continue }

    const entity_key = f.Entity_Key || normalizeEntityKey(org)
    const score = Math.round(((Number(f.Influence_Score) || 50) + (Number(f.Relevance_Score) || 50)) / 2)

    const existing = await leadExists(entity_key)

    if (existing.exists) {
      if (!dry_run && score > existing.score) {
        await atPatch(TBL_LEADS, existing.id, {
          Priority_Score:    Math.max(score, existing.score),
          Avatar_Count:      (existing.score > 0 ? 1 : 0) + 1,
          Has_Decision_Maker: !!(f.Email),
          Decision_Maker_Name:  f.Name || '',
          Decision_Maker_Email: f.Email || '',
          Decision_Maker_Phone: f.Phone || '',
          Contactable:       !!(f.Email),
          Signal_Date:       new Date().toISOString().split('T')[0],
        })
        stats.updated++
      } else {
        stats.skipped++
      }
    } else {
      if (!dry_run) {
        await atCreate(TBL_LEADS, {
          Entity_Key:           entity_key,
          Entity_Name:          org,
          Lead_Type:            f.Avatar_Type === 'contracting_officer' ? 'GovCon Prospect' : 'Commercial Prospect',
          Stage:                'New Signal',
          Priority_Score:       score,
          GovCon_Fit:           f.Avatar_Type === 'contracting_officer' ? score : 0,
          Commercial_Fit:       f.Avatar_Type === 'prime_bd' ? score : 0,
          Score_Signals:        `Avatar match: ${f.Name || 'Contact'} (${f.Avatar_Type || 'contact'})\nInfluence: ${f.Influence_Score || 0}\nRelevance: ${f.Relevance_Score || 0}`,
          Source:               'avatars',
          Source_Record_ID:     rec.id,
          Has_Decision_Maker:   !!(f.Email),
          Decision_Maker_Name:  f.Name || '',
          Decision_Maker_Email: f.Email || '',
          Decision_Maker_Phone: f.Phone || '',
          Contactable:          !!(f.Email),
          Enrichment_Needed:    !(f.Email),
          Avatar_Count:         1,
          Signal_Date:          new Date().toISOString().split('T')[0],
        })

        // Create outreach task if we have a contactable lead
        if (f.Email && score >= 70) {
          await atCreate(TBL_TASKS, {
            Entity_Key:  entity_key,
            Entity_Name: org,
            Entity_Type: 'lead',
            Task:        `Outreach: Send capabilities statement to ${f.Name || 'contact'} at ${org}`,
            Notes:       `Email: ${f.Email} | Role: ${f.Title || f.Avatar_Type || 'unknown'} | Score: ${score} | Source: Avatar intelligence`,
            Status:      'Open',
            Priority:    score >= 80 ? 'High' : 'Medium',
            Owner:       'Sales',
            Due_Date:    (() => { const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString().split('T')[0] })(),
            Created_At:  new Date().toISOString(),
          })
        }

        stats.created++
        await delay(120)
      } else {
        stats.created++
      }
    }
  }

  return stats
}

// ── Source: SAM.gov ────────────────────────────────────────────────────────────
async function ingestSam(dry_run: boolean): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
  const stats = { created: 0, updated: 0, skipped: 0, errors: [] as string[] }

  if (!process.env.SAM_GOV_API_KEY || process.env.SAM_GOV_API_KEY.length < 8) {
    return stats // key not set — skip silently
  }

  const opportunities = await fetchSamOpportunities({ daysBack: 30 })

  for (const opp of opportunities) {
    const rawName = opp.agency.trim()
    if (!rawName || rawName.length < 3) { stats.skipped++; continue }

    const entity_key = normalizeEntityKey(rawName)

    // Score based on relevance signals
    let score = 65
    if (opp.state === 'FL') score += 15
    if (opp.naicsCode === '561720') score += 10
    if (opp.pointOfContact.some(p => p.email)) score += 10
    score = Math.min(score, 100)

    const existing = await leadExists(entity_key)

    if (existing.exists) {
      if (!dry_run && score > existing.score) {
        await atPatch(TBL_LEADS, existing.id, {
          Priority_Score:   score,
          Signal_Date:      new Date().toISOString().split('T')[0],
          Source_Record_ID: opp.noticeId,
        })
        stats.updated++
      } else {
        stats.skipped++
      }
    } else {
      const signals: string[] = []
      if (opp.state === 'FL') signals.push('Florida')
      if (opp.naicsCode === '561720') signals.push('Janitorial NAICS')
      if (opp.setAside) signals.push(opp.setAside)
      if (opp.responseDeadline) signals.push(`Deadline: ${opp.responseDeadline.split('T')[0]}`)
      const primaryPoc = opp.pointOfContact.find(p => p.type === 'primary') || opp.pointOfContact[0]

      if (!dry_run) {
        await atCreate(TBL_LEADS, {
          Entity_Key:           entity_key,
          Entity_Name:          rawName,
          Lead_Type:            'GovCon Prospect',
          Stage:                'New Signal',
          Priority_Score:       score,
          GovCon_Fit:           score,
          Commercial_Fit:       0,
          Score_Signals:        signals.join('\n') || 'SAM.gov solicitation',
          Source:               'sam.gov',
          Source_Record_ID:     opp.noticeId,
          NAICS:                opp.naicsCode,
          Agency:               rawName,
          Location:             opp.state,
          Description:          opp.title.slice(0, 500),
          Has_Decision_Maker:   !!(primaryPoc?.email),
          Decision_Maker_Name:  primaryPoc?.fullName || '',
          Decision_Maker_Email: primaryPoc?.email || '',
          Decision_Maker_Phone: primaryPoc?.phone || '',
          Contactable:          !!(primaryPoc?.email),
          Enrichment_Needed:    !(primaryPoc?.email),
          Signal_Date:          new Date().toISOString().split('T')[0],
        })

        if (score >= 70) {
          await atCreate(TBL_EVENTS, {
            Entity_Key:  entity_key,
            Entity_Type: 'lead',
            Entity_Name: rawName,
            Event_Type:  'signal_detected',
            Description: `SAM.gov solicitation: ${opp.title}. NAICS: ${opp.naicsCode}. State: ${opp.state}. Score: ${score}. CO: ${primaryPoc?.email || 'none'}.`,
            Actor:       'intake_pipeline',
            Source:      'sam.gov',
            Timestamp:   new Date().toISOString(),
          })
        }

        // Auto-create outreach task if we have a CO email
        if (primaryPoc?.email && score >= 65) {
          const dueDate = (() => { const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString().split('T')[0] })()
          await atCreate(TBL_TASKS, {
            Entity_Key:  entity_key,
            Entity_Name: rawName,
            Entity_Type: 'lead',
            Task:        `Outreach: Send capabilities statement to ${primaryPoc.fullName || 'CO'} at ${rawName}`,
            Notes:       `Email: ${primaryPoc.email} | Phone: ${primaryPoc.phone || 'N/A'} | Role: Contracting Officer | Solicitation: ${opp.title} | NAICS: ${opp.naicsCode} | Deadline: ${opp.responseDeadline?.split('T')[0] || 'N/A'}`,
            Status:      'Open',
            Priority:    score >= 80 ? 'High' : 'Medium',
            Owner:       'Sales',
            Due_Date:    dueDate,
            Created_At:  new Date().toISOString(),
          })
        }

        stats.created++
        await delay(120)
      } else {
        stats.created++
      }
    }
  }

  return stats
}

// ── Source: USASpending ────────────────────────────────────────────────────────
async function ingestUSASpending(dry_run: boolean): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${base}/api/sources/usaspending`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dry_run }),
    })
    if (!res.ok) {
      return { created: 0, updated: 0, skipped: 0, errors: [`USASpending error: ${res.status}`] }
    }
    const data = await res.json()
    return {
      created: data.leads_created || 0,
      updated: 0,
      skipped: data.leads_skipped || 0,
      errors: data.errors || [],
    }
  } catch (err: any) {
    return { created: 0, updated: 0, skipped: 0, errors: [`USASpending fetch failed: ${err.message}`] }
  }
}

// ── POST handler ───────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const { dry_run = false, sources = ['intelligence', 'avatars', 'sam', 'usaspending'] } = body

  const today = new Date().toISOString().split('T')[0]
  let total_created = 0
  let total_updated = 0
  let total_skipped = 0
  const errors: string[] = []
  const source_summary: Record<string, number> = {}

  if (sources.includes('intelligence')) {
    const s = await ingestIntelligence(dry_run).catch(e => {
      errors.push(`intelligence: ${e.message}`)
      return { created: 0, updated: 0, skipped: 0, errors: [] }
    })
    total_created += s.created
    total_updated += s.updated
    total_skipped += s.skipped
    source_summary.intelligence = s.created
    errors.push(...s.errors)
  }

  if (sources.includes('avatars')) {
    const s = await ingestAvatars(dry_run).catch(e => {
      errors.push(`avatars: ${e.message}`)
      return { created: 0, updated: 0, skipped: 0, errors: [] }
    })
    total_created += s.created
    total_updated += s.updated
    total_skipped += s.skipped
    source_summary.avatars = s.created
    errors.push(...s.errors)
  }

  if (sources.includes('sam')) {
    const s = await ingestSam(dry_run).catch(e => {
      errors.push(`sam: ${e.message}`)
      return { created: 0, updated: 0, skipped: 0, errors: [] }
    })
    total_created += s.created
    total_updated += s.updated
    total_skipped += s.skipped
    source_summary.sam = s.created
    errors.push(...s.errors)
  }

  if (sources.includes('usaspending')) {
    const s = await ingestUSASpending(dry_run).catch(e => {
      errors.push(`usaspending: ${e.message}`)
      return { created: 0, updated: 0, skipped: 0, errors: [] }
    })
    total_created += s.created
    total_updated += s.updated
    total_skipped += s.skipped
    source_summary.usaspending = s.created
    errors.push(...s.errors)
  }

  return NextResponse.json({
    ok: true,
    dry_run,
    run_date: today,
    // Format consumed by /api/daily-run
    stats: {
      created: total_created,
      updated: total_updated,
      skipped: total_skipped,
      errors: errors.length,
    },
    // Extended format for direct callers
    created_count:   total_created,
    updated_count:   total_updated,
    duplicate_count: total_skipped,
    source_summary,
    errors: errors.slice(0, 20),
  })
}

export async function GET() {
  return NextResponse.json({
    description: 'POST /api/leads/intake — ingest leads from Intelligence + Avatars + SAM.gov + USASpending',
    params: { sources: ['intelligence', 'avatars', 'sam', 'usaspending'], dry_run: false },
    sam_configured: !!((process.env.SAM_GOV_API_KEY?.length ?? 0) >= 8),
    usaspending_configured: true,
    tables: { reads: [TBL_INTEL, TBL_AVATARS], writes: [TBL_LEADS, TBL_EVENTS, TBL_TASKS] },
  })
}
