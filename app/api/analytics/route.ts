interface Analytics {
  totalProspects: number
  totalContracts: number
  totalSubs: number
  averageScore: number
  scoreDistribution: {
    high: number
    medium: number
    low: number
  }
  bySegment: {
    [key: string]: number
  }
  byStatus: {
    [key: string]: number
  }
  topOpportunities: Array<{
    name: string
    value: number
    agency?: string
  }>
  pipelineStages?: Array<{
    stage: string
    count: number
    mrr: number
  }>
  lastSyncIntel?: string
  lastSyncOpp?: string
  totalIntelRecords?: number
  totalOppRecords?: number
}

async function getAnalytics(): Promise<Analytics> {
  const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID

  if (!apiKey || !baseId) {
    return getMockAnalytics()
  }

  try {
    // Fetch Intelligence table for prospects/contracts/subs
    const intelResponse = await fetch(
      `https://api.airtable.com/v0/${baseId}/Intelligence?pageSize=100`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    )

    // Fetch Opportunities table for pipeline metrics
    const oppResponse = await fetch(
      `https://api.airtable.com/v0/${baseId}/Opportunities?pageSize=100`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    )

    if (!intelResponse.ok || !oppResponse.ok) {
      console.warn('Analytics: Airtable fetch failed')
      return getMockAnalytics()
    }

    const intelData = await intelResponse.json()
    const oppData = await oppResponse.json()
    const intelRecords = intelData.records || []
    const oppRecords = oppData.records || []

    // Process Intelligence records
    const prospects = intelRecords.filter((r: any) => r.fields.record_type === 'prospect')
    const contracts = intelRecords.filter((r: any) => r.fields.record_type === 'contract')
    const subs = intelRecords.filter((r: any) => r.fields.record_type === 'sub')

    const allScores = intelRecords
      .map((r: any) => r.fields.score || 0)
      .filter((score: number) => score > 0)
    const averageScore =
      allScores.length > 0
        ? Math.round(allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length)
        : 0

    // Score distribution
    const scoreDistribution = {
      high: prospects.filter((r: any) => (r.fields.score || 0) >= 75).length,
      medium: prospects.filter((r: any) => (r.fields.score || 0) >= 50 && (r.fields.score || 0) < 75).length,
      low: prospects.filter((r: any) => (r.fields.score || 0) < 50).length,
    }

    // By segment
    const bySegment: { [key: string]: number } = {}
    prospects.forEach((r: any) => {
      const segment = r.fields.segment || 'Unknown'
      bySegment[segment] = (bySegment[segment] || 0) + 1
    })

    // By status
    const byStatus: { [key: string]: number } = {}
    prospects.forEach((r: any) => {
      const status = r.fields.pipeline_status || 'Unknown'
      byStatus[status] = (byStatus[status] || 0) + 1
    })

    // Top opportunities
    const topOpportunities = contracts
      .sort((a: any, b: any) => (b.fields.total_obligated_amount || 0) - (a.fields.total_obligated_amount || 0))
      .slice(0, 5)
      .map((r: any) => ({
        name: r.fields.legal_name || 'Unknown',
        value: r.fields.total_obligated_amount || 0,
        agency: r.fields.agency,
      }))

    // Pipeline stages from Opportunities
    const pipelineStages: { [key: string]: { count: number; mrr: number } } = {}
    oppRecords.forEach((r: any) => {
      const stage = r.fields.stage || 'Pending'
      const amount = r.fields.estimated_amount || 0
      if (!pipelineStages[stage]) {
        pipelineStages[stage] = { count: 0, mrr: 0 }
      }
      pipelineStages[stage].count += 1
      pipelineStages[stage].mrr += amount
    })

    const pipelineArray = Object.entries(pipelineStages).map(([stage, data]) => ({
      stage,
      count: data.count,
      mrr: Math.round(data.mrr / 1000), // Convert to thousands (MRR)
    }))

    // Get last sync times
    const lastSyncIntel = intelRecords.length > 0
      ? new Date(Math.max(...intelRecords.map((r: any) => new Date(r.createdTime).getTime()))).toISOString().split('T')[0]
      : 'Never'

    const lastSyncOpp = oppRecords.length > 0
      ? new Date(Math.max(...oppRecords.map((r: any) => new Date(r.createdTime).getTime()))).toISOString().split('T')[0]
      : 'Never'

    return {
      totalProspects: prospects.length,
      totalContracts: contracts.length,
      totalSubs: subs.length,
      averageScore,
      scoreDistribution,
      bySegment,
      byStatus,
      topOpportunities,
      pipelineStages: pipelineArray,
      lastSyncIntel,
      lastSyncOpp,
      totalIntelRecords: intelRecords.length,
      totalOppRecords: oppRecords.length,
    }
  } catch (error) {
    console.warn('Analytics error:', error)
    return getMockAnalytics()
  }
}

function getMockAnalytics(): Analytics {
  return {
    totalProspects: 3,
    totalContracts: 0,
    totalSubs: 0,
    averageScore: 78,
    scoreDistribution: {
      high: 1,
      medium: 1,
      low: 1,
    },
    bySegment: {
      Federal: 1,
      State: 1,
      Local: 1,
    },
    byStatus: {
      qualified: 1,
      interested: 1,
      pending: 1,
    },
    topOpportunities: [],
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
