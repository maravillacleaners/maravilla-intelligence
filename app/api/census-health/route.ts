/**
 * Census API Health Check
 * GET /api/census-health
 *
 * Returns: { api: 'Census', status: 'active'|'pending'|'error', notes: '...' }
 */

import { validateCensusConnection } from '@/lib/census-api'

export async function GET() {
  try {
    const result = await validateCensusConnection()

    // Determine overall status
    const status = result.status === 'active' ? 'active' : result.status === 'error' ? 'error' : 'pending'

    return Response.json({
      api: 'Census',
      status,
      message: result.message,
      timestamp: result.timestamp,
      details: {
        dataset: 'ACS5_2021',
        endpoint: 'https://api.census.gov/data/2021/acs/acs5',
        configured: process.env.CENSUS_API_KEY ? true : false,
      },
    })
  } catch (error) {
    return Response.json(
      {
        api: 'Census',
        status: 'error',
        message: `Health check failed: ${String(error)}`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
