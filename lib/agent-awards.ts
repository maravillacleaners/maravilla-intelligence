import Airtable from 'airtable'
import { DiscoveryResult } from './agent-discovery'

const api = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })

export interface ScoredAward extends DiscoveryResult {
  sizeScore: number
  relevanceScore: number
  marginScore: number
  totalScore: number
}

function calculateSizeScore(estimatedValue: number): number {
  if (estimatedValue >= 1000000) return 40
  if (estimatedValue >= 500000) return 35
  if (estimatedValue >= 250000) return 30
  if (estimatedValue >= 100000) return 20
  return 10
}

function calculateRelevanceScore(
  naicsCode: string | undefined,
  description: string | undefined,
  recordType: 'contract' | 'award'
): number {
  let score = 0

  const cleaningCodes = ['561700', '561710', '561711', '561720', '561730', '561740', '561790']
  const buildingCodes = ['232', '233', '234', '235', '236', '237']
  const constructionCodes = ['233', '234']

  if (naicsCode) {
    if (cleaningCodes.some(code => naicsCode.includes(code))) {
      score += 30
    } else if (buildingCodes.some(code => naicsCode.startsWith(code))) {
      score += 15
    } else if (constructionCodes.some(code => naicsCode.startsWith(code))) {
      score += 10
    }
  }

  if (description) {
    const descLower = description.toLowerCase()
    const relevantKeywords = [
      'cleaning', 'janitorial', 'custodial', 'maintenance',
      'facilities', 'office', 'commercial', 'post-construction',
      'debris', 'renovation', 'construction cleanup', 'hvac'
    ]

    const keywordMatches = relevantKeywords.filter(keyword =>
      descLower.includes(keyword)
    ).length

    score += Math.min(keywordMatches * 5, 10)
  }

  if (recordType === 'contract') {
    score = Math.min(score, 40)
  } else {
    score = Math.min(score, 35)
  }

  return score
}

function calculateMarginScore(
  estimatedValue: number,
  recordType: 'contract' | 'award',
  source: 'sam-gov' | 'usaspending' | 'fedbizopps'
): number {
  let baseScore = 0

  if (source === 'sam-gov') {
    baseScore = 12
  } else if (source === 'usaspending') {
    baseScore = 10
  } else {
    baseScore = 8
  }

  if (estimatedValue >= 500000) {
    baseScore = Math.min(baseScore + 8, 20)
  } else if (estimatedValue >= 250000) {
    baseScore = Math.min(baseScore + 4, 20)
  }

  if (recordType === 'award') {
    baseScore = Math.min(baseScore + 3, 20)
  }

  return Math.min(baseScore, 20)
}

export async function scoreAwards(discoveries: DiscoveryResult[]): Promise<ScoredAward[]> {
  const scoredAwards: ScoredAward[] = discoveries.map((discovery) => {
    const sizeScore = calculateSizeScore(discovery.estimatedValue)
    const relevanceScore = calculateRelevanceScore(
      discovery.naicsCode,
      discovery.description,
      discovery.recordType
    )
    const marginScore = calculateMarginScore(
      discovery.estimatedValue,
      discovery.recordType,
      discovery.source
    )

    const totalScore = sizeScore + relevanceScore + marginScore

    return {
      ...discovery,
      sizeScore,
      relevanceScore,
      marginScore,
      totalScore
    }
  })

  return scoredAwards
}

export async function updateAwardsWithScores(scoredAwards: ScoredAward[]): Promise<void> {
  try {
    const base = api.base(process.env.AIRTABLE_BASE_ID!)
    const table = base('Intelligence')

    for (const award of scoredAwards) {
      try {
        let filterFormula = ''
        const uniqueId = award.usaspendingId || award.samContractId

        if (award.usaspendingId) {
          filterFormula = `{usaspending_id} = '${award.usaspendingId}'`
        } else if (award.samContractId) {
          filterFormula = `{sam_contract_id} = '${award.samContractId}'`
        } else {
          console.warn(`[Awards] No unique identifier for award ${award.id}`)
          continue
        }

        const existingRecords = await table.select({
          filterByFormula
        }).firstPage()

        if (existingRecords.length > 0) {
          const recordId = existingRecords[0].id
          await table.update(recordId, {
            award_score: award.totalScore,
            size_score: award.sizeScore,
            relevance_score: award.relevanceScore,
            margin_score: award.marginScore,
            scoring_status: 'scored'
          })
          console.log(`[Awards] Updated scores for ${uniqueId}: total=${award.totalScore}`)
        } else {
          console.warn(`[Awards] No record found for ${uniqueId}`)
        }
      } catch (error: any) {
        const uniqueId = award.usaspendingId || award.samContractId
        console.error(`[Awards] Failed to update scores for ${uniqueId}:`, error)
      }
    }

    console.log(`[Awards] Scored and updated ${scoredAwards.length} awards`)
  } catch (error) {
    console.error('[Awards] Update error:', error)
  }
}

export async function getHighScoringAwards(minScore: number = 50): Promise<ScoredAward[]> {
  try {
    const base = api.base(process.env.AIRTABLE_BASE_ID!)
    const table = base('Intelligence')

    const records = await table.select({
      filterByFormula: `AND({award_score} >= ${minScore}, {scoring_status} = 'scored')`
    }).all()

    return records.map((record: any) => ({
      id: record.fields.id,
      title: record.fields.title,
      agency: record.fields.agency,
      recordType: record.fields.record_type,
      source: record.fields.source,
      deadline: record.fields.deadline,
      estimatedValue: record.fields.estimated_value,
      description: record.fields.description,
      naicsCode: record.fields.naics_code,
      url: record.fields.url,
      postedDate: record.fields.discovery_date,
      sizeScore: record.fields.size_score || 0,
      relevanceScore: record.fields.relevance_score || 0,
      marginScore: record.fields.margin_score || 0,
      totalScore: record.fields.award_score || 0
    }))
  } catch (error) {
    console.error('[Awards] Fetch high-scoring error:', error)
    return []
  }
}
