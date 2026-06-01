import { credentials, airtableTables } from '@/app/lib/credentials'

interface Analytics {
  totalLeads: number
  averageScore: number
  scoreDistribution: {
    high: number
    medium: number
    low: number
  }
  byStage: Array<{ stage: string; count: number }>
  bySource: Array<{ source: string; count: number }>
  topOpportunities: Array<{
    name: string
    value: number
    agency?: string
  }>
  pipelineStages?: Array<{
    stage: string
    count: number
    value: number
  }>
  opportunitiesByState?: Array<{ state: string; count: number; totalValue: number }>
  scoreHistogram?: Array<{ bucket: string; count: number }>
  pipelineFunnel?: Array<{ stage: string; count: number; value: number; pct: number }>
  lastSync?: string
  totalRecords?: number
}

async function getAnalytics(): Promise<Analytics> {
  const apiKey = credentials.airtableApiKey
  const baseId = credentials.airtableBaseId

  if (!apiKey || !baseId) {
    return getMockAnalytics()
  }

  try {
    const KEY = apiKey
    const BASE = baseId
    const TBL_LEADS = airtableTables.leads
    const TBL_OPP = airtableTables.opportunities
    const AT = `https://api.airtable.com/v0/${BASE}`
    const HDR = { Authorization: `Bearer ${KEY}` }

    // Fetch Leads table
    const leadsResponse = await fetch(`${AT}/${TBL_LEADS}?pageSize=100`, { headers: HDR })
    // Fetch Opportunities table
    const oppResponse = await fetch(`${AT}/${TBL_OPP}?pageSize=100`, { headers: HDR })

    if (!leadsResponse.ok || !oppResponse.ok) {
      console.warn('Analytics: Airtable fetch failed')
      return getMockAnalytics()
    }

    const leadsData = await leadsResponse.json()
    const oppData = await oppResponse.json()
    const leadsRecords = leadsData.records || []
    const oppRecords = oppData.records || []

    // Calculate lead metrics
    const allScores = leadsRecords
      .map((r: any) => r.fields.Priority_Score || 0)
      .filter((score: number) => score > 0)
    const averageScore =
      allScores.length > 0
        ? Math.round(allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length)
        : 0

    // Score distribution
    const scoreDistribution = {
      high: leadsRecords.filter((r: any) => (r.fields.Priority_Score || 0) >= 75).length,
      medium: leadsRecords.filter(
        (r: any) =>
          (r.fields.Priority_Score || 0) >= 50 && (r.fields.Priority_Score || 0) < 75
      ).length,
      low: leadsRecords.filter((r: any) => (r.fields.Priority_Score || 0) < 50).length,
    }

    // By stage
    const stageMap: { [key: string]: number } = {}
    leadsRecords.forEach((r: any) => {
      const stage = r.fields.Stage || 'Unknown'
      stageMap[stage] = (stageMap[stage] || 0) + 1
    })
    const byStage = Object.entries(stageMap).map(([stage, count]) => ({ stage, count: count as number }))

    // By source
    const sourceMap: { [key: string]: number } = {}
    leadsRecords.forEach((r: any) => {
      const source = r.fields.Source || 'Unknown'
      sourceMap[source] = (sourceMap[source] || 0) + 1
    })
    const bySource = Object.entries(sourceMap).map(([source, count]) => ({ source, count: count as number }))

    // Top opportunities by value
    const topOpportunities = leadsRecords
      .filter((r: any) => r.fields.Value)
      .sort((a: any, b: any) => (b.fields.Value || 0) - (a.fields.Value || 0))
      .slice(0, 5)
      .map((r: any) => ({
        name: r.fields.Entity_Name || 'Unknown',
        value: r.fields.Value || 0,
        agency: r.fields.Agency,
      }))

    // Pipeline stages from Opportunities
    const stageMetrics: {
      [key: string]: { count: number; value: number }
    } = {}
    oppRecords.forEach((r: any) => {
      const stage = r.fields.status || 'Pending'
      const value = r.fields.estimated_value || 0
      if (!stageMetrics[stage]) {
        stageMetrics[stage] = { count: 0, value: 0 }
      }
      stageMetrics[stage].count += 1
      stageMetrics[stage].value += value
    })

    const pipelineStages = Object.entries(stageMetrics).map(([stage, data]) => ({
      stage,
      count: data.count,
      value: data.value,
    }))

    // Opportunities by state
    const stateMap: { [key: string]: { count: number; totalValue: number } } = {}
    oppRecords.forEach((r: any) => {
      const state = r.fields.state || 'Unknown'
      const value = r.fields.estimated_value || 0
      if (!stateMap[state]) {
        stateMap[state] = { count: 0, totalValue: 0 }
      }
      stateMap[state].count += 1
      stateMap[state].totalValue += value
    })
    const opportunitiesByState = Object.entries(stateMap).map(([state, data]) => ({
      state,
      count: data.count,
      totalValue: data.totalValue,
    }))

    // Score histogram
    const scoreHistogramMap: { [key: string]: number } = {}
    leadsRecords.forEach((r: any) => {
      const score = r.fields.Priority_Score || 0
      const bucket = `${Math.floor(score / 10) * 10}-${Math.floor(score / 10) * 10 + 10}`
      scoreHistogramMap[bucket] = (scoreHistogramMap[bucket] || 0) + 1
    })
    const scoreHistogram = Object.entries(scoreHistogramMap).map(([bucket, count]) => ({
      bucket,
      count: count as number,
    }))

    // Pipeline funnel (same as pipelineStages but with percentage)
    const totalPipelineValue = pipelineStages.reduce((sum, s) => sum + s.value, 0)
    const pipelineFunnel = pipelineStages.map((stage) => ({
      ...stage,
      pct: totalPipelineValue > 0 ? Math.round((stage.value / totalPipelineValue) * 100) : 0,
    }))

    const lastSync = leadsRecords.length > 0
      ? new Date(
          Math.max(...leadsRecords.map((r: any) => new Date(r.createdTime).getTime()))
        )
          .toISOString()
          .split('T')[0]
      : 'Never'

    return {
      totalLeads: leadsRecords.length,
      averageScore,
      scoreDistribution,
      byStage,
      bySource,
      topOpportunities,
      pipelineStages,
      opportunitiesByState,
      scoreHistogram,
      pipelineFunnel,
      lastSync,
      totalRecords: leadsRecords.length,
    }
  } catch (error) {
    console.warn('Analytics error:', error)
    return getMockAnalytics()
  }
}

function getMockAnalytics(): Analytics {
  return {
    totalLeads: 50,
    averageScore: 68,
    scoreDistribution: {
      high: 12,
      medium: 22,
      low: 16,
    },
    byStage: [
      { stage: 'New Signal', count: 20 },
      { stage: 'Contact Found', count: 15 },
      { stage: 'Outreach Ready', count: 10 },
      { stage: 'In Conversation', count: 5 },
    ],
    bySource: [
      { source: 'USASpending', count: 25 },
      { source: 'SAM.gov', count: 15 },
      { source: 'Email', count: 10 },
    ],
    topOpportunities: [],
    pipelineStages: [
      { stage: 'New', count: 15, value: 500000 },
      { stage: 'Reviewing', count: 8, value: 350000 },
      { stage: 'Applying', count: 4, value: 250000 },
    ],
  }
}

export async function GET() {
  try {
    const analytics = await getAnalytics()

    return Response.json({
      success: true,
      data: analytics,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[API /analytics] Error:', error)
    return Response.json(
      { error: 'Failed to fetch analytics', details: String(error) },
      { status: 500 }
    )
  }
}
