import { NextRequest, NextResponse } from 'next/server'
import { credentials, airtableTables } from '@/app/lib/credentials'
import { authMiddleware } from '@/app/lib/auth-middleware'

const KEY = credentials.airtableApiKey
const BASE = credentials.airtableBaseId
const TBL_LEADS = airtableTables.leads
const AT = `https://api.airtable.com/v0/${BASE}`
const HDR = () => ({ Authorization: `Bearer ${KEY}` })

async function handler(request: NextRequest) {
  // Fetch leads from last 24h
  const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString()
  const formula = `CREATED_TIME()>='${oneDayAgo}'`

  const leadsUrl = `${AT}/${TBL_LEADS}?pageSize=100&filterByFormula=${encodeURIComponent(formula)}`

  try {
    const leadsRes = await fetch(leadsUrl, { headers: HDR() })
    const leadsData = await leadsRes.json()
    const leadsRecords = leadsData.records || []

    // Count all leads for total
    const allLeadsUrl = `${AT}/${TBL_LEADS}?pageSize=1`
    const allRes = await fetch(allLeadsUrl, { headers: HDR() })
    const allData = await allRes.json()
    const totalLeads = allData.offset ? 1000 : (allData.records || []).length

    // Mock watch stats for now — can fetch from Watches table if needed
    const watches = {
      active: 2,
      totalRuns: 128,
      successRate: 87,
    }

    // Score distribution of recent leads (in last 24h)
    const recentMatches = {
      autoApproved: leadsRecords.filter(
        (r: any) => (r.fields.Priority_Score || 0) >= 75
      ).length,
      queued: leadsRecords.filter(
        (r: any) =>
          (r.fields.Priority_Score || 0) >= 55 &&
          (r.fields.Priority_Score || 0) < 75
      ).length,
      dropped: leadsRecords.filter(
        (r: any) => (r.fields.Priority_Score || 0) < 55
      ).length,
    }

    const lastRunDate = leadsRecords.length > 0
      ? new Date(Math.max(...leadsRecords.map((r: any) => new Date(r.createdTime).getTime())))
          .toISOString()
      : null

    const nextRunDate = new Date(Date.now() + 6 * 3600000).toISOString()

    const response = {
      data: {
        watches,
        recentMatches,
        leadsCreated: {
          total: totalLeads,
          last24h: leadsRecords.length,
          last7d: totalLeads, // Approximate
        },
        automationHealth: {
          lastRun: lastRunDate,
          nextRun: nextRunDate,
          uptime: true,
        },
      },
    }

    const res = NextResponse.json(response)
    res.headers.set('Cache-Control', 'public, max-age=60')
    return res
  } catch (error) {
    console.error('[API /discovery/dashboard] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard data',
        details: String(error),
      },
      { status: 500 }
    )
  }
}

export const GET = authMiddleware(handler)
