import { NextRequest, NextResponse } from 'next/server'
import { airtableTables } from '@/app/lib/credentials'

const AIRTABLE_KEY = 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92'
const BASE = 'appZhXnyFiKbnOZLr'
const TBL_INTEL = 'tbl3qWHqunA0eERE2'
const TBL_OPP = 'tbldTDb1v79dVNCTQ'
const TBL_SUBS = 'tblxyHqJihk9cJ0t9'
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

async function airtableSearch(table: string, formula: string) {
  const url = `https://api.airtable.com/v0/${BASE}/${table}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=50`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_KEY}` },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return []
  const data = await res.json()
  return (data.records || []).map((r: { id: string; fields: Record<string, unknown> }) => ({ id: r.id, ...r.fields }))
}

async function usaSpendingSearch(companyName: string) {
  try {
    const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters: {
          keywords: [companyName],
          award_type_codes: ['A', 'B', 'C', 'D'],
          time_period: [{ start_date: '2020-01-01', end_date: '2026-12-31' }],
        },
        fields: [
          'Award ID', 'Recipient Name', 'Award Amount', 'Awarding Agency',
          'NAICS Code', 'Award Date', 'Description', 'Place of Performance State Code',
        ],
        page: 1,
        limit: 25,
        sort: 'Award Amount',
        order: 'desc',
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.results || []).map((r: Record<string, unknown>) => ({
      award_id: r['Award ID'] || '',
      recipient: r['Recipient Name'] || companyName,
      amount: Number(r['Award Amount']) || 0,
      agency: r['Awarding Agency'] || '',
      naics: r['NAICS Code'] || '',
      date: r['Award Date'] || '',
      description: r['Description'] || '',
      state: r['Place of Performance State Code'] || '',
    }))
  } catch {
    return []
  }
}

function computeScore(
  contracts: { amount: number; agency: string; naics: string; state: string }[],
  totalValue: number,
) {
  let score = 0
  if (totalValue > 1_000_000) score += 30
  else if (totalValue > 500_000) score += 20
  else if (totalValue > 0) score += 10

  const count = contracts.length
  if (count > 5) score += 20
  else if (count >= 2) score += 10

  const hasFL = contracts.some((c) => c.state === 'FL')
  if (hasFL) score += 15

  const agencies = new Set(contracts.map((c) => c.agency).filter(Boolean))
  if (agencies.size > 2) score += 15
  else if (agencies.size > 0) score += 8

  const hasCleaningNaics = contracts.some((c) => String(c.naics).startsWith('561'))
  if (hasCleaningNaics) score += 20

  return Math.min(score, 100)
}

function classify(avgContract: number): 'prime_contractor' | 'competitor' | 'subcontractor_prospect' {
  if (avgContract > 5_000_000) return 'prime_contractor'
  if (avgContract > 200_000) return 'competitor'
  return 'subcontractor_prospect'
}

interface AIAnalysis {
  why_matters: string
  opportunity_signals: string[]
  risks: string[]
  recommended_actions: string[]
  contacts_to_find: {
    name: string
    title: string
    department: string
    confidence: number
    procurement_role: string
    decision_influence: 'high' | 'medium' | 'low'
    likely_buyer: boolean
    linkedin_hint: string
  }[]
  relationship_angle: string
  score_explanation: string
  next_best_action: string
}

async function generateAI(
  name: string,
  classification: string,
  totalValue: number,
  agencies: string[],
  naics: string[],
  score: number,
  contracts: { agency: string; description: string; amount: number; state: string }[],
): Promise<AIAnalysis> {
  const fallback = buildFallback(name, classification, totalValue, agencies, naics, score, contracts)

  if (!ANTHROPIC_KEY) return fallback

  const contractSummary = contracts
    .slice(0, 5)
    .map((c) => `${c.agency}: $${(c.amount / 1000).toFixed(0)}K — ${c.description || 'N/A'} (${c.state})`)
    .join('\n')

  const prompt = `You are a government contract intelligence analyst for Maravilla Cleaners — a Florida-based commercial janitorial/cleaning company pursuing government subcontracts and commercial cleaning contracts.

Company being analyzed: ${name}
Classification: ${classification}
Total federal contract value: $${(totalValue / 1_000_000).toFixed(2)}M across ${contracts.length} awards
Agencies: ${agencies.slice(0, 6).join(', ') || 'Unknown'}
NAICS codes: ${naics.slice(0, 5).join(', ') || 'Unknown'}
Relevance score: ${score}/100
Sample contracts:
${contractSummary || 'No contract details available'}

Return ONLY valid JSON, no markdown:
{
  "why_matters": "2 concise sentences on strategic relevance to Maravilla",
  "opportunity_signals": ["3-5 short signal phrases like 'active federal contractor' or 'FL operations confirmed'"],
  "risks": ["2-3 short risk phrases like 'incumbent relationships unknown' or 'no janitorial NAICS overlap'"],
  "recommended_actions": ["2-3 specific action phrases like 'identify facilities director at [city] office'"],
  "contacts_to_find": [
    {
      "name": "inferred plausible first+last name for this type of company",
      "title": "most likely procurement-relevant title",
      "department": "Facilities Management|Procurement|Operations|Contracts",
      "confidence": 45,
      "procurement_role": "primary_decision_maker|operations_contact|financial_approver|subcontract_coordinator",
      "decision_influence": "high|medium|low",
      "likely_buyer": true,
      "linkedin_hint": "search LinkedIn: [name hint] + ${name} + [city if known]"
    }
  ],
  "relationship_angle": "client_target|competitor|teaming_partner|subcontractor",
  "score_explanation": "${score} because: [2-3 specific factors]",
  "next_best_action": "One specific sentence — the single most impactful action Maravilla should take this week"
}

Generate 2-4 contacts_to_find. Mark confidence 30-55 (AI-inferred, not verified). Contacts must be plausible for a company of this classification and contract size.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return fallback
    const data = await res.json()
    const text: string = data?.content?.[0]?.text ?? ''
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(cleaned) as AIAnalysis
    return parsed
  } catch {
    return fallback
  }
}

function buildFallback(
  name: string,
  classification: string,
  totalValue: number,
  agencies: string[],
  naics: string[],
  score: number,
  contracts: { agency: string; description: string; amount: number; state: string }[],
): AIAnalysis {
  const hasFL = contracts.some((c) => c.state === 'FL')
  const hasCleaningNaics = naics.some((n) => n.startsWith('561'))
  const signals: string[] = []
  const risks: string[] = []

  if (totalValue > 0) signals.push('active federal contractor')
  if (hasFL) signals.push('Florida operations confirmed')
  if (agencies.length > 2) signals.push(`${agencies.length} agency relationships`)
  if (hasCleaningNaics) signals.push('janitorial NAICS overlap')
  if (contracts.length > 5) signals.push('high contract frequency')
  if (signals.length === 0) signals.push('known government market participant')

  if (!hasFL) risks.push('no confirmed Florida operations')
  risks.push('incumbent relationships unknown')
  if (!hasCleaningNaics) risks.push('no janitorial NAICS overlap detected')

  const angle = classification === 'prime_contractor' ? 'client_target'
    : classification === 'competitor' ? 'competitor'
    : 'teaming_partner'

  const actions = classification === 'prime_contractor'
    ? [`Contact ${name}'s facilities director`, 'Introduce Maravilla as certified subcontractor', 'Request subcontracting opportunity meeting']
    : [`Monitor ${name} for recompete opportunities`, 'Identify regional operations contact']

  const contacts = [
    {
      name: 'Facilities Director',
      title: 'Director of Facilities Management',
      department: 'Facilities Management',
      confidence: 40,
      procurement_role: 'primary_decision_maker',
      decision_influence: 'high' as const,
      likely_buyer: true,
      linkedin_hint: `Search LinkedIn: Facilities Director + ${name}`,
    },
    {
      name: 'Procurement Officer',
      title: 'Senior Procurement Officer',
      department: 'Procurement',
      confidence: 35,
      procurement_role: 'financial_approver',
      decision_influence: 'high' as const,
      likely_buyer: false,
      linkedin_hint: `Search LinkedIn: Procurement + ${name}`,
    },
    {
      name: 'Regional Operations Manager',
      title: 'Regional Operations Manager',
      department: 'Operations',
      confidence: 30,
      procurement_role: 'operations_contact',
      decision_influence: 'medium' as const,
      likely_buyer: false,
      linkedin_hint: `Search LinkedIn: Operations Manager + ${name} + Florida`,
    },
  ]

  return {
    why_matters: `${name} has awarded $${(totalValue / 1_000_000).toFixed(1)}M in federal contracts across ${agencies.length} agencies. Their facilities management footprint creates subcontracting opportunities for Maravilla's cleaning services.`,
    opportunity_signals: signals,
    risks,
    recommended_actions: actions,
    contacts_to_find: contacts,
    relationship_angle: angle,
    score_explanation: `${score} because: ${signals.slice(0, 2).join(', ')} and contract volume of $${(totalValue / 1_000_000).toFixed(1)}M`,
    next_best_action: classification === 'prime_contractor'
      ? `Identify the facilities director at ${name} and send a subcontracting capabilities brief this week.`
      : `Monitor ${name} on SAM.gov for active solicitations matching NAICS 561720.`,
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!airtableTables.companies) {
    return NextResponse.json(
      { error: 'Companies table not configured' },
      { status: 501 }
    )
  }

  const name = decodeURIComponent(params.id).replace(/-/g, ' ')
  const nameSafe = name.replace(/"/g, '')

  const [intelRecords, oppRecords, subRecords, contracts] = await Promise.all([
    airtableSearch(TBL_INTEL, `SEARCH(LOWER("${nameSafe}"), LOWER(IFERROR({company},"")))>0`),
    airtableSearch(TBL_OPP, `OR(SEARCH(LOWER("${nameSafe}"), LOWER(IFERROR({title},"")))>0, SEARCH(LOWER("${nameSafe}"), LOWER(IFERROR({agency},"")))>0)`),
    airtableSearch(TBL_SUBS, `SEARCH(LOWER("${nameSafe}"), LOWER(IFERROR({legal_name},"")))>0`),
    usaSpendingSearch(name),
  ])

  const totalValue = contracts.reduce((s: number, c: { amount: number }) => s + c.amount, 0)
  const avgContract = contracts.length > 0 ? totalValue / contracts.length : 0
  const agencies = [...new Set(contracts.map((c: { agency: string }) => c.agency).filter(Boolean))]
  const naicsCodes = [...new Set(contracts.map((c: { naics: string }) => c.naics).filter(Boolean))]
  const lastAward = contracts[0]?.date || ''

  const classification = classify(avgContract)
  const score = computeScore(contracts, totalValue)
  const ai = await generateAI(name, classification, totalValue, agencies, naicsCodes, score, contracts)

  const state =
    contracts.find((c: { state: string }) => c.state)?.state ||
    (intelRecords[0] as Record<string, unknown>)?.state ||
    ''

  // Build timeline from available data
  const timeline: { date: string; event: string; type: string }[] = []
  if (lastAward) timeline.push({ date: lastAward, event: 'Most recent federal contract award', type: 'contract' })
  if (intelRecords.length > 0) timeline.push({ date: String((intelRecords[0] as Record<string, unknown>).created_at || ''), event: 'Captured in intelligence scan', type: 'signal' })
  if (oppRecords.length > 0) timeline.push({ date: '', event: 'Linked to pipeline opportunity', type: 'pipeline' })

  return NextResponse.json({
    company: {
      name,
      slug: params.id,
      state,
      classification,
      total_contract_value: totalValue,
      contract_count: contracts.length,
      avg_contract: avgContract,
      agencies,
      naics_codes: naicsCodes,
      last_award_date: lastAward,
      score,
    },
    ai,
    contracts,
    airtable_intel: intelRecords,
    opportunities: oppRecords,
    contacts: subRecords,
    timeline,
    score,
  })
}
