import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { execSync } from 'child_process'

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92'
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID || 'appZhXnyFiKbnOZLr'
const INTEL_TABLE = 'tbl3qWHqunA0eERE2'
const OPPS_TABLE = 'tbldTDb1v79dVNCTQ'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })

interface AwardDetail {
  id: string
  generated_unique_award_id: string
  piid: string
  description: string
  total_obligation: number
  base_and_all_options_value: number
  date_signed: string
  awarding_agency: { toptier_agency: { name: string }; subtier_agency: { name: string } }
  funding_agency: { toptier_agency: { name: string } } | null
  recipient: { recipient_name: string; recipient_unique_id: string; location: { city_name: string; state_code: string; country_code: string } } | null
  period_of_performance: { start_date: string; end_date: string; last_modified_date: string }
  place_of_performance: { city_name: string; state_code: string; state_name: string; country_code: string }
  latest_transaction_contract_data: {
    naics: string
    naics_description: string
    product_or_service_code: string
    product_or_service_description: string
    type_of_contract_pricing: string
    type_of_contract_pricing_description: string
    extent_competed: string
    solicitation_procedures: string
    set_aside_type: string
    set_aside_description: string
  } | null
  subaward_count: number
  total_subaward_amount: number
  executive_details: { officers: Array<{ name: string; amount: number }> } | null
}

interface SearchAward {
  Award_ID: string
  Recipient_Name: string
  Award_Amount: number
  Awarding_Agency: string
  Award_Type: string
  Start_Date: string
  End_Date: string
  generated_internal_id: string
  Description: string
}

interface ContractAI {
  why_matters: string
  opportunity_signals: string[]
  subcontracting_angle: string
  recompete_strategy: string
  recommended_action: string
  next_best_action: string
  teaming_approach: string
}

function usaPost(body: object): unknown {
  const payload = JSON.stringify(body)
  const escaped = payload.replace(/'/g, "'\\''")
  const cmd = `wget -qO- --post-data='${escaped}' --header='Content-Type: application/json' https://api.usaspending.gov/api/v2/search/spending_by_award/`
  try {
    const result = execSync(cmd, { timeout: 15000 }).toString()
    return JSON.parse(result)
  } catch (e) {
    console.log('[contracts] wget error:', String(e).slice(0, 200))
    return null
  }
}

async function fetchDetailByGeneratedId(generatedId: string): Promise<AwardDetail | null> {
  try {
    const res = await fetch(`https://api.usaspending.gov/api/v2/awards/${encodeURIComponent(generatedId)}/`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function searchByAwardId(awardId: string): Promise<SearchAward | null> {
  try {
    const body = {
      filters: {
        keywords: [awardId],
        award_type_codes: ['A', 'B', 'C', 'D'],
        time_period: [{ start_date: '2000-01-01', end_date: '2026-12-31' }]
      },
      fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Awarding Agency', 'Award Type', 'Start Date', 'End Date', 'generated_internal_id', 'Description'],
      limit: 5,
      page: 1,
      sort: 'Award Amount',
      order: 'desc'
    }
    const data = usaPost(body) as { results?: Record<string, unknown>[] } | null
    const results: Record<string, unknown>[] = data?.results || []
    const match = results.find(r => String(r['Award ID']) === awardId) || results[0]
    if (!match) return null
    return {
      Award_ID: String(match['Award ID'] || ''), Recipient_Name: String(match['Recipient Name'] || ''),
      Award_Amount: Number(match['Award Amount'] || 0), Awarding_Agency: String(match['Awarding Agency'] || ''),
      Award_Type: String(match['Award Type'] || ''), Start_Date: String(match['Start Date'] || ''),
      End_Date: String(match['End Date'] || ''), generated_internal_id: String(match['generated_internal_id'] || ''),
      Description: String(match['Description'] || '')
    }
  } catch (err) {
    console.log('[contracts] search error:', String(err))
    return null
  }
}

async function fetchRelatedContracts(recipientName: string, excludeId: string): Promise<SearchAward[]> {
  if (!recipientName) return []
  try {
    const body = {
      filters: {
        recipient_search_text: [recipientName],
        award_type_codes: ['A', 'B', 'C', 'D'],
        time_period: [{ start_date: '2018-01-01', end_date: '2030-12-31' }]
      },
      fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Awarding Agency', 'Award Type', 'Start Date', 'End Date', 'generated_internal_id', 'Description'],
      limit: 6,
      page: 1,
      sort: 'Award Amount',
      order: 'desc'
    }
    const data = usaPost(body) as { results?: Record<string, unknown>[] } | null
    return (data?.results || [])
      .map((r: Record<string, unknown>) => ({
        Award_ID: r['Award ID'], Recipient_Name: r['Recipient Name'], Award_Amount: r['Award Amount'],
        Awarding_Agency: r['Awarding Agency'], Award_Type: r['Award Type'], Start_Date: r['Start Date'],
        End_Date: r['End Date'], generated_internal_id: r['generated_internal_id'], Description: r['Description']
      }))
      .filter((r: SearchAward) => r.generated_internal_id !== excludeId)
      .slice(0, 5)
  } catch { return [] }
}

async function fetchAirtableOpps(query: string) {
  try {
    const formula = encodeURIComponent(`SEARCH("${query.toLowerCase()}", LOWER({Agency}))`)
    const res = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/${OPPS_TABLE}?filterByFormula=${formula}&maxRecords=3`,
      { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.records || []
  } catch { return [] }
}

async function fetchAirtableIntel(query: string) {
  try {
    const formula = encodeURIComponent(`SEARCH("${query.toLowerCase()}", LOWER({Company}))`)
    const res = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/${INTEL_TABLE}?filterByFormula=${formula}&maxRecords=3`,
      { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.records || []
  } catch { return [] }
}

function computeContractScore(detail: AwardDetail | null, search: SearchAward | null): number {
  let score = 40
  const state = detail?.place_of_performance?.state_code || ''
  const naics = detail?.latest_transaction_contract_data?.naics || ''
  const amount = detail?.total_obligation || search?.Award_Amount || 0
  const endDate = detail?.period_of_performance?.end_date || search?.End_Date || ''
  const subawards = detail?.subaward_count || 0

  if (state === 'FL') score += 25
  if (naics.startsWith('561')) score += 30
  if (naics === '561720') score += 10
  if (amount > 5000000) score += 20
  else if (amount > 1000000) score += 12
  else if (amount > 100000) score += 6

  if (endDate) {
    const days = Math.floor((new Date(endDate).getTime() - Date.now()) / 86400000)
    if (days < 0) score += 5
    else if (days < 90) score += 25
    else if (days < 365) score += 15
  }

  if (subawards > 0) score += 10
  return Math.min(100, Math.max(0, score))
}

function recompeteStatus(endDate: string): { days: number; urgency: string; label: string } {
  if (!endDate) return { days: 9999, urgency: 'unknown', label: 'Unknown' }
  const days = Math.floor((new Date(endDate).getTime() - Date.now()) / 86400000)
  if (days < 0) return { days, urgency: 'expired', label: `Expired ${Math.abs(days)}d ago` }
  if (days < 90) return { days, urgency: 'high', label: `${days}d — Recompete Imminent` }
  if (days < 365) return { days, urgency: 'medium', label: `${days}d — Recompete Likely` }
  return { days, urgency: 'low', label: `${days}d remaining` }
}

function subcontractingAngle(naics: string, amount: number, agencyName: string): string {
  if (naics === '561720') return 'DIRECT — Janitorial services match your exact NAICS code'
  if (naics.startsWith('5617')) return 'STRONG — Building services NAICS overlap'
  if (naics.startsWith('561')) return 'LIKELY — Facilities services with potential janitorial component'
  if (naics.startsWith('236') || naics.startsWith('237')) return 'CONSTRUCTION — Post-construction cleaning opportunity'
  const healthAgencies = ['health', 'medical', 'hospital', 'veterans', 'va ', 'hhs', 'cdc']
  if (healthAgencies.some(h => agencyName.toLowerCase().includes(h))) return 'HEALTHCARE — Medical facility cleaning potential'
  if (amount > 5000000) return 'LARGE CONTRACT — Subcontracting clause likely required'
  return 'INDIRECT — Monitor for subcontracting opportunities'
}

async function generateAI(detail: AwardDetail | null, search: SearchAward | null, recompete: { days: number; urgency: string; label: string }, score: number): Promise<ContractAI> {
  const awardId = search?.Award_ID || detail?.piid || 'Unknown'
  const recipient = detail?.recipient?.recipient_name || search?.Recipient_Name || 'Unknown Prime'
  const agency = detail?.awarding_agency?.toptier_agency?.name || search?.Awarding_Agency || 'Unknown Agency'
  const amount = (detail?.total_obligation || search?.Award_Amount || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
  const naics = detail?.latest_transaction_contract_data?.naics || ''
  const naicsDesc = detail?.latest_transaction_contract_data?.naics_description || ''
  const state = detail?.place_of_performance?.state_code || ''
  const description = detail?.description || search?.Description || ''

  const fallback: ContractAI = {
    why_matters: `Contract ${awardId} from ${agency} represents a ${amount} federal award${state === 'FL' ? ' in Florida' : ''}. ${naics.startsWith('561') ? 'The janitorial/facility services NAICS code indicates direct overlap with Maravilla Cleaners capabilities.' : 'Monitor for subcontracting opportunities under the prime contractor.'}`,
    opportunity_signals: [
      naics.startsWith('561') ? 'Facility services NAICS — direct capability match' : 'Federal contract with potential subcontracting clause',
      state === 'FL' ? 'Florida place of performance — local advantage' : `${state} performance location`,
      recompete.urgency === 'high' ? 'Recompete window opening — positioning window critical' : `Contract end: ${recompete.label}`,
      `Prime contractor: ${recipient} — teaming target`
    ],
    subcontracting_angle: naics.startsWith('561720') ? 'Direct janitorial services match. Approach prime for subcontracting introduction before next solicitation.' : 'Identify facilities management component and present Maravilla as qualified local subcontractor.',
    recompete_strategy: recompete.urgency === 'expired' ? 'Contract has expired — search SAM.gov for active recompete solicitation now.' : recompete.urgency === 'high' ? 'Recompete imminent. Register on SAM.gov, identify contracting officer, prepare capability statement immediately.' : 'Begin relationship-building with prime contractor and agency contracting office. Monitor SAM.gov for solicitation.',
    recommended_action: score >= 70 ? 'Add to active pipeline. Schedule outreach to prime contractor within 7 days.' : 'Monitor contract. Set recompete alert on SAM.gov.',
    next_best_action: `Search SAM.gov for ${awardId} solicitation history and identify the contracting officer`,
    teaming_approach: `Contact ${recipient} business development team. Lead with Florida presence, janitorial expertise, and government compliance certifications.`
  }

  if (!process.env.ANTHROPIC_API_KEY) return fallback

  try {
    const prompt = `You are a government contracting intelligence analyst for Maravilla Cleaners, a Florida-based commercial janitorial company seeking federal subcontracting opportunities.

Analyze this federal contract:
- Award ID: ${awardId}
- Description: ${description}
- Agency: ${agency}
- Prime Contractor: ${recipient}
- Value: ${amount}
- NAICS: ${naics} — ${naicsDesc}
- Place of Performance: ${state}
- Recompete Status: ${recompete.urgency} (${recompete.label})
- Relevance Score: ${score}/100

Respond ONLY with valid JSON:
{
  "why_matters": "2-3 sentence strategic assessment for Maravilla Cleaners",
  "opportunity_signals": ["signal 1", "signal 2", "signal 3"],
  "subcontracting_angle": "specific subcontracting approach for this contract",
  "recompete_strategy": "concrete recompete positioning steps",
  "recommended_action": "single most important action to take",
  "next_best_action": "specific tactical next step with timeline",
  "teaming_approach": "how to approach the prime contractor for teaming"
}`

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = (msg.content[0] as { text: string }).text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
    return fallback
  } catch { return fallback }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const awardId = decodeURIComponent(id)

  let detail: AwardDetail | null = null
  let searchResult: SearchAward | null = null

  if (awardId.startsWith('CONT_AWD_') || awardId.startsWith('ASST_')) {
    detail = await fetchDetailByGeneratedId(awardId)
  }

  if (!detail) {
    searchResult = await searchByAwardId(awardId)
    if (searchResult?.generated_internal_id) {
      detail = await fetchDetailByGeneratedId(searchResult.generated_internal_id)
    }
  }

  // If we still can't find it, try some common generated ID patterns for DoD/GSA
  if (!detail && !searchResult) {
    const candidateAgencyCodes = ['9700', '4730', '4732', '1900', '9100', '7000', '8900']
    for (const code of candidateAgencyCodes) {
      const genId = `CONT_AWD_${awardId}_${code}_-NONE-_-NONE-`
      detail = await fetchDetailByGeneratedId(genId)
      if (detail) break
    }
  }

  if (!detail && !searchResult) {
    return NextResponse.json({ error: 'Contract not found', id: awardId, hint: 'Use generated_internal_id format: CONT_AWD_{piid}_{agency_code}_-NONE-_-NONE-' }, { status: 404 })
  }

  const recipientName = detail?.recipient?.recipient_name || searchResult?.Recipient_Name || ''
  const generatedId = detail?.generated_unique_award_id || searchResult?.generated_internal_id || awardId
  const agencyName = detail?.awarding_agency?.toptier_agency?.name || searchResult?.Awarding_Agency || ''
  const endDate = detail?.period_of_performance?.end_date || searchResult?.End_Date || ''
  const naics = detail?.latest_transaction_contract_data?.naics || ''
  const amount = detail?.total_obligation || searchResult?.Award_Amount || 0

  const score = computeContractScore(detail, searchResult)
  const recompete = recompeteStatus(endDate)

  const [related, airtableOpps, airtableIntel] = await Promise.all([
    fetchRelatedContracts(recipientName, generatedId),
    fetchAirtableOpps(agencyName.split(' ').slice(0, 2).join(' ')),
    fetchAirtableIntel(recipientName.split(' ').slice(0, 2).join(' '))
  ])

  const ai = await generateAI(detail, searchResult, recompete, score)
  const angle = subcontractingAngle(naics, amount, agencyName)

  const samUrl = `https://sam.gov/search/?index=opp&q=${encodeURIComponent(awardId)}`
  const usaspendingUrl = `https://www.usaspending.gov/award/${encodeURIComponent(generatedId)}`

  return NextResponse.json({
    contract: {
      award_id: searchResult?.Award_ID || detail?.piid || awardId,
      generated_id: generatedId,
      description: detail?.description || searchResult?.Description || '',
      total_obligation: amount,
      base_and_all_options: detail?.base_and_all_options_value || amount,
      date_signed: detail?.date_signed || searchResult?.Start_Date || '',
      start_date: detail?.period_of_performance?.start_date || searchResult?.Start_Date || '',
      end_date: endDate,
      awarding_agency: agencyName,
      awarding_subtier: detail?.awarding_agency?.subtier_agency?.name || '',
      funding_agency: detail?.funding_agency?.toptier_agency?.name || '',
      recipient_name: recipientName,
      recipient_duns: detail?.recipient?.recipient_unique_id || '',
      recipient_city: detail?.recipient?.location?.city_name || '',
      recipient_state: detail?.recipient?.location?.state_code || '',
      place_city: detail?.place_of_performance?.city_name || '',
      place_state: detail?.place_of_performance?.state_code || '',
      place_state_name: detail?.place_of_performance?.state_name || '',
      naics: naics,
      naics_description: detail?.latest_transaction_contract_data?.naics_description || '',
      psc: detail?.latest_transaction_contract_data?.product_or_service_code || '',
      psc_description: detail?.latest_transaction_contract_data?.product_or_service_description || '',
      pricing_type: detail?.latest_transaction_contract_data?.type_of_contract_pricing_description || '',
      competed: detail?.latest_transaction_contract_data?.extent_competed || '',
      set_aside: detail?.latest_transaction_contract_data?.set_aside_description || '',
      subaward_count: detail?.subaward_count || 0,
      total_subaward_amount: detail?.total_subaward_amount || 0,
      award_type: searchResult?.Award_Type || 'Contract',
      subcontracting_angle: angle
    },
    recompete,
    score,
    ai,
    related_contracts: related,
    airtable_opportunities: airtableOpps.map((r: { id: string; fields: Record<string, unknown> }) => ({ id: r.id, ...r.fields })),
    airtable_intel: airtableIntel.map((r: { id: string; fields: Record<string, unknown> }) => ({ id: r.id, ...r.fields })),
    usaspending_url: usaspendingUrl,
    sam_url: samUrl
  })
}
