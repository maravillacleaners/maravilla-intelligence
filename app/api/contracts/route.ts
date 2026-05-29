import Airtable from 'airtable'
import { queryUSAspending, queryFedBizOpps, saveDiscoveriesToAirtable } from '@/lib/agent-discovery'
import { scoreAwards, updateAwardsWithScores, getHighScoringAwards } from '@/lib/agent-awards'
import { findMatchingSuppliers, saveSupplierMatches, updateAwardMatchingStatus } from '@/lib/agent-find-subs'

const api = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })

export async function GET(request: Request) {
  try {
    const base = api.base(process.env.AIRTABLE_BASE_ID!)
    const table = base('Intelligence')

    const records = await table
      .select({
        filterByFormula: `{record_type} = 'contract'`,
        sort: [{ field: 'deadline', direction: 'asc' }],
        pageSize: 100,
      })
      .all()

    const contracts = records.map((r: any) => ({
      id: r.id,
      title: r.fields.title,
      agency: r.fields.agency,
      value: r.fields.estimated_value || 0,
      deadline: r.fields.deadline,
      status: r.fields.status || 'open',
    }))

    return Response.json({ contracts, count: contracts.length })
  } catch (error) {
    return Response.json({ error: 'Failed to fetch contracts' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const startTime = Date.now()
  const executionLog = {
    timestamp: new Date().toISOString(),
    stages: [] as any[]
  }

  try {
    console.log('[ContractIntelligence] Starting Phase 5 orchestration')

    // STAGE 1: DISCOVERY (Agent 3)
    console.log('[ContractIntelligence] Stage 1: Discovery from federal sources')
    executionLog.stages.push({ stage: 'discovery', status: 'starting' })

    const [usaSpendingResults, fedBizOppsResults] = await Promise.all([
      queryUSAspending(),
      queryFedBizOpps()
    ])

    const allDiscoveries = [...usaSpendingResults, ...fedBizOppsResults]
    console.log(`[ContractIntelligence] Discovered ${allDiscoveries.length} total records (USASpending: ${usaSpendingResults.length}, SAM.gov: ${fedBizOppsResults.length})`)

    if (allDiscoveries.length > 0) {
      await saveDiscoveriesToAirtable(allDiscoveries)
      executionLog.stages.push({
        stage: 'discovery',
        status: 'completed',
        recordsDiscovered: allDiscoveries.length,
        bySource: {
          usaspending: usaSpendingResults.length,
          'sam-gov': fedBizOppsResults.length
        }
      })
    } else {
      executionLog.stages.push({ stage: 'discovery', status: 'completed', recordsDiscovered: 0 })
    }

    // STAGE 2: SCORING (Agent 4)
    console.log('[ContractIntelligence] Stage 2: Scoring discovered awards')
    executionLog.stages.push({ stage: 'scoring', status: 'starting' })

    const scoredAwards = await scoreAwards(allDiscoveries)
    console.log(`[ContractIntelligence] Scored ${scoredAwards.length} awards`)

    if (scoredAwards.length > 0) {
      await updateAwardsWithScores(scoredAwards)

      const scoreDistribution = {
        veryHigh: scoredAwards.filter((a) => a.totalScore >= 80).length,
        high: scoredAwards.filter((a) => a.totalScore >= 60 && a.totalScore < 80).length,
        medium: scoredAwards.filter((a) => a.totalScore >= 40 && a.totalScore < 60).length,
        low: scoredAwards.filter((a) => a.totalScore < 40).length,
      }

      executionLog.stages.push({
        stage: 'scoring',
        status: 'completed',
        recordsScored: scoredAwards.length,
        scoreDistribution
      })
    } else {
      executionLog.stages.push({ stage: 'scoring', status: 'completed', recordsScored: 0 })
    }

    // STAGE 3: SUPPLIER MATCHING (Agent 5)
    console.log('[ContractIntelligence] Stage 3: Matching suppliers to high-scoring awards')
    executionLog.stages.push({ stage: 'matching', status: 'starting' })

    const highScoringAwards = await getHighScoringAwards(50)
    console.log(`[ContractIntelligence] Retrieved ${highScoringAwards.length} high-scoring awards for matching`)

    if (highScoringAwards.length > 0) {
      const supplierMatches = await findMatchingSuppliers(highScoringAwards, 50)
      console.log(`[ContractIntelligence] Found ${supplierMatches.length} supplier matches`)

      if (supplierMatches.length > 0) {
        await saveSupplierMatches(supplierMatches)

        const matchedAwardIds = Array.from(new Set(supplierMatches.map((m) => m.awardId)))
        await updateAwardMatchingStatus(matchedAwardIds)

        executionLog.stages.push({
          stage: 'matching',
          status: 'completed',
          matchesFound: supplierMatches.length,
          awardsCovered: matchedAwardIds.length,
          matchBreakdown: {
            serviceMatches: supplierMatches.filter((m) => m.serviceMatch).length,
            locationMatches: supplierMatches.filter((m) => m.locationMatch).length,
            capacityMatches: supplierMatches.filter((m) => m.capacityMatch).length,
          }
        })
      } else {
        executionLog.stages.push({ stage: 'matching', status: 'completed', matchesFound: 0 })
      }
    } else {
      executionLog.stages.push({ stage: 'matching', status: 'completed', highScoringAwards: 0 })
    }

    const duration = Date.now() - startTime
    executionLog.stages.push({
      stage: 'orchestration',
      status: 'completed',
      totalDurationMs: duration
    })

    console.log(`[ContractIntelligence] Phase 5 orchestration completed in ${duration}ms`)

    return Response.json({
      success: true,
      execution: executionLog,
      summary: {
        discoveredRecords: allDiscoveries.length,
        scoredAwards: scoredAwards.length,
        highScoringAwards: (await getHighScoringAwards(50)).length,
      }
    })
  } catch (error: any) {
    console.error('[ContractIntelligence] Orchestration error:', error)
    executionLog.stages.push({
      stage: 'error',
      status: 'failed',
      error: error.message
    })

    return Response.json(
      {
        success: false,
        error: error.message,
        execution: executionLog
      },
      { status: 500 }
    )
  }
}
