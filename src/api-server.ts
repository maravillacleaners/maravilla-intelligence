const express = require('express')
require('dotenv/config')
const { queryUSAspending, queryFedBizOpps, saveDiscoveriesToAirtable } = require('../lib/agent-discovery')
const { updateAwardsWithScores, getHighScoringAwards } = require('../lib/agent-scoring')

const app = express()
const PORT = process.env.API_PORT || 3000

app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/discovery/usaspending', async (req, res) => {
  try {
    console.log('[API] GET /api/discovery/usaspending')
    const discoveries = await queryUSAspending()
    res.json({
      success: true,
      data: discoveries,
      count: discoveries.length,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[API] USA Spending discovery error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    })
  }
})

app.get('/api/discovery/fedbizopps', async (req, res) => {
  try {
    console.log('[API] GET /api/discovery/fedbizopps')
    const discoveries = await queryFedBizOpps()
    res.json({
      success: true,
      data: discoveries,
      count: discoveries.length,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[API] FedBizOpps discovery error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    })
  }
})

app.post('/api/intelligence/save-discoveries', async (req, res) => {
  try {
    const { discoveries } = req.body
    if (!discoveries || !Array.isArray(discoveries)) {
      return res.status(400).json({
        success: false,
        error: 'discoveries array required in request body'
      })
    }

    console.log(`[API] POST /api/intelligence/save-discoveries - saving ${discoveries.length} records`)
    await saveDiscoveriesToAirtable(discoveries)

    res.json({
      success: true,
      savedCount: discoveries.length,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[API] Save discoveries error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

app.post('/api/intelligence/score-awards', async (req, res) => {
  try {
    const { source } = req.body
    const sourceParam = source || 'all'

    console.log(`[API] POST /api/intelligence/score-awards - source: ${sourceParam}`)
    const result = await updateAwardsWithScores(sourceParam)

    res.json({
      success: true,
      source: sourceParam,
      scoredCount: result.scoredCount || 0,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[API] Score awards error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

app.get('/api/intelligence/high-scoring-awards', async (req, res) => {
  try {
    const minScore = parseInt(req.query.minScore as string) || 50

    console.log(`[API] GET /api/intelligence/high-scoring-awards - minScore: ${minScore}`)
    const awards = await getHighScoringAwards(minScore)

    res.json({
      success: true,
      data: awards,
      count: awards.length,
      minScore,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[API] Get high scoring awards error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    })
  }
})

app.listen(PORT, () => {
  console.log(`\n🚀 Phase 5 Contract Intelligence API Server`)
  console.log(`📡 Running on http://localhost:${PORT}`)
  console.log(`\n📋 Available endpoints:`)
  console.log(`  GET  /health`)
  console.log(`  GET  /api/discovery/usaspending`)
  console.log(`  GET  /api/discovery/fedbizopps`)
  console.log(`  POST /api/intelligence/save-discoveries`)
  console.log(`  POST /api/intelligence/score-awards`)
  console.log(`  GET  /api/intelligence/high-scoring-awards`)
  console.log(`\n✅ Ready for n8n workflow orchestration\n`)
})
