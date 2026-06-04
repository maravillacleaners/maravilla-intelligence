import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/app/lib/auth-middleware'
import { runSAMDiscoveryAgent } from '@/lib/agents/sam-discovery-agent'

/**
 * POST /api/agents/sam-discovery
 *
 * Autonomous SAM.gov discovery agent that:
 * 1. Fetches new federal contract opportunities
 * 2. Processes and normalizes the data
 * 3. Stores results in Opportunities table
 *
 * Query params:
 * - daysBack: number of days to look back (default: 7)
 *
 * Returns: AgentResult with processing stats and results
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authError = await authMiddleware(request)
    if (authError) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const daysBack = parseInt(searchParams.get('daysBack') || '7', 10)

    // Validate daysBack
    if (isNaN(daysBack) || daysBack < 1 || daysBack > 90) {
      return NextResponse.json(
        { error: 'daysBack must be between 1 and 90' },
        { status: 400 }
      )
    }

    console.log(`[SAM Discovery API] Starting agent with daysBack=${daysBack}`)

    // Run the discovery agent
    const result = await runSAMDiscoveryAgent(daysBack)

    // Return result
    return NextResponse.json(result, {
      status: result.status === 'error' ? 500 : 200,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[SAM Discovery API] Unexpected error:', errorMessage)

    return NextResponse.json(
      {
        agent: 'SAM Discovery',
        status: 'error',
        endpoint: '/api/agents/sam-discovery',
        timestamp: new Date().toISOString(),
        recordsProcessed: 0,
        recordsSaved: 0,
        errors: [errorMessage],
        message: `API error: ${errorMessage}`,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/agents/sam-discovery
 *
 * Health check and status endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    agent: 'SAM Discovery',
    status: 'deployed',
    endpoint: '/api/agents/sam-discovery',
    description: 'Autonomous SAM.gov federal contract discovery agent',
    schedule: 'every 6 hours',
    lastRun: new Date().toISOString(),
    capabilities: [
      'Fetch federal contract opportunities from SAM.gov',
      'Process and normalize contract data',
      'Store opportunities in Airtable',
      'Automatic duplicate detection',
      'Rate-limited API calls',
    ],
    documentation: {
      method: 'POST',
      endpoint: '/api/agents/sam-discovery',
      params: {
        daysBack: 'Number of days to look back (1-90, default: 7)',
      },
      response: {
        agent: 'string',
        status: 'success | error | partial',
        endpoint: 'string',
        timestamp: 'ISO 8601 timestamp',
        recordsProcessed: 'number',
        recordsSaved: 'number',
        errors: 'string[]',
        nextRun: 'ISO 8601 timestamp',
        message: 'string',
      },
    },
  })
}
