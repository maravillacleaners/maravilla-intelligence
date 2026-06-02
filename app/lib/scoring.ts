// Lead scoring algorithm
// Components: GovCon Fit (0-30), Commercial Fit (0-30), Signal Recency (0-20), Contact Completeness (0-20)

export interface ScoreBreakdown {
  govconFit: number
  commercialFit: number
  signalRecency: number
  contactCompleteness: number
  total: number
}

const CLEANING_KEYWORDS = [
  'cleaning',
  'janitorial',
  'housekeeping',
  'sanitation',
  'custodial',
  'maintenance',
  'disinfect',
  'sanitiz',
  'sweep',
  'mop',
  'scrub',
]

export function computeLeadScore(lead: Record<string, any>): ScoreBreakdown {
  const breakdown: ScoreBreakdown = {
    govconFit: 0,
    commercialFit: 0,
    signalRecency: 0,
    contactCompleteness: 0,
    total: 0,
  }

  // GovCon Fit: if NAICS matches government contracts (e.g., cleaning/janitorial 561720)
  const naicsCodes = lead.NAICS_Codes || ''
  const govconNaics = ['561720', '561721', '561722'] // Janitorial services NAICS codes
  if (naicsCodes && govconNaics.some((code) => naicsCodes.toString().includes(code))) {
    breakdown.govconFit = 30
  } else if (naicsCodes) {
    // Partial credit for any NAICS code provided
    breakdown.govconFit = 10
  }

  // Commercial Fit: if cleaning keywords match AND agency type is commercial/federal
  const agencyType = lead.Agency_Type || ''
  const agencyName = (lead.Agency_Name || '').toLowerCase()
  const description = (lead.Description || '').toLowerCase()
  const hasCleaningKeywords =
    CLEANING_KEYWORDS.some((kw) => agencyName.includes(kw)) ||
    CLEANING_KEYWORDS.some((kw) => description.includes(kw))

  if (hasCleaningKeywords && (agencyType.includes('Commercial') || agencyType.includes('Federal'))) {
    breakdown.commercialFit = 30
  } else if (hasCleaningKeywords) {
    breakdown.commercialFit = 20
  }

  // Signal Recency: days since signal
  const signalDate = lead.Signal_Date ? new Date(lead.Signal_Date) : null
  if (signalDate) {
    const now = new Date()
    const daysSince = Math.floor((now.getTime() - signalDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysSince < 7) {
      breakdown.signalRecency = 20
    } else if (daysSince < 30) {
      breakdown.signalRecency = 15
    } else if (daysSince < 90) {
      breakdown.signalRecency = 10
    }
  }

  // Contact Completeness: has decision_maker, email, phone
  const hasDecisionMaker = lead.Has_Decision_Maker || false
  const decisionMakerName = lead.Decision_Maker_Name || ''
  const decisionMakerEmail = lead.Decision_Maker_Email || ''
  const decisionMakerPhone = lead.Decision_Maker_Phone || ''

  const contactFields = [!!decisionMakerName, !!decisionMakerEmail, !!decisionMakerPhone].filter(
    Boolean
  ).length

  if (hasDecisionMaker && contactFields === 3) {
    breakdown.contactCompleteness = 20
  } else if (hasDecisionMaker || contactFields >= 2) {
    breakdown.contactCompleteness = 10
  }

  breakdown.total =
    breakdown.govconFit + breakdown.commercialFit + breakdown.signalRecency + breakdown.contactCompleteness

  return breakdown
}

export function recomputeAllLeadScores(leads: Record<string, any>[]): Array<{
  id: string
  updates: { Priority_Score: number }
}> {
  return leads.map((lead) => ({
    id: lead.id,
    updates: {
      Priority_Score: computeLeadScore(lead).total,
    },
  }))
}
