const Airtable = require('airtable')

const api = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })

async function updateAwardsWithScores(source: string = 'all'): Promise<{ scoredCount: number }> {
  try {
    const base = api.base(process.env.AIRTABLE_BASE_ID!)
    const table = base('Intelligence')

    let records = []

    if (source === 'all') {
      records = await table.select().all()
    } else {
      records = await table.select({
        filterByFormula: `{source} = '${source}'`
      }).all()
    }

    let scoredCount = 0

    for (const record of records) {
      try {
        const fields = record.fields as any

        let score = 50

        // NAICS match bonus
        if (fields.naics_code === '561700' || (fields.naics_code && fields.naics_code.toString().startsWith('5617'))) {
          score += 30
        }

        // Value range bonus
        const value = fields.estimated_value || 0
        if (value >= 500000) {
          score += 20
        } else if (value >= 100000) {
          score += 10
        }

        // Record type bonus
        if (fields.record_type === 'contract') {
          score += 10
        }

        // Recency bonus
        if (fields.discovery_date) {
          const postedDate = new Date(fields.discovery_date)
          const daysOld = Math.floor((Date.now() - postedDate.getTime()) / (1000 * 60 * 60 * 24))

          if (daysOld <= 7) {
            score += 15
          } else if (daysOld <= 30) {
            score += 5
          }
        }

        // Cap score
        score = Math.min(100, Math.max(0, score))

        const uniqueId = fields.usaspending_id || fields.sam_contract_id || record.id
        console.log(`[Scoring] Scored ${uniqueId}: ${score} points (value=$${value}, naics=${fields.naics_code}, age=${fields.discovery_date})`)

        await table.update(record.id, {
          award_score: score,
          scoring_status: 'scored'
        })

        scoredCount++
      } catch (error: any) {
        const uniqueId = (record.fields as any).usaspending_id || (record.fields as any).sam_contract_id || record.id
        console.error(`[Scoring] Failed to score ${uniqueId}:`, error.message)
      }
    }

    console.log(`[Scoring] Scored ${scoredCount}/${records.length} records (source: ${source})`)
    return { scoredCount }
  } catch (error) {
    console.error('[Scoring] Update scores error:', error)
    return { scoredCount: 0 }
  }
}

async function getHighScoringAwards(minScore: number = 50): Promise<any[]> {
  try {
    const base = api.base(process.env.AIRTABLE_BASE_ID!)
    const table = base('Intelligence')

    const records = await table.select({
      filterByFormula: `{award_score} >= ${minScore}`,
      sort: [{ field: 'award_score', direction: 'desc' }]
    }).all()

    const awards = records.map(record => ({
      id: record.id,
      title: (record.fields as any).title,
      source: (record.fields as any).source,
      award_score: (record.fields as any).award_score,
      estimated_value: (record.fields as any).estimated_value,
      naics_code: (record.fields as any).naics_code,
      url: (record.fields as any).url,
      scoring_status: (record.fields as any).scoring_status
    }))

    console.log(`[Scoring] Retrieved ${awards.length} high-scoring awards (minScore: ${minScore})`)
    return awards
  } catch (error) {
    console.error('[Scoring] Get high-scoring awards error:', error)
    return []
  }
}

module.exports = {
  updateAwardsWithScores,
  getHighScoringAwards
}
