/**
 * Workflow Trigger API
 * POST /api/workflows/trigger
 * Triggers n8n workflows
 */

import {
  triggerSamGovScraping,
  triggerUsaSpendingScraping,
  triggerContractMatching,
  triggerNotifications,
} from '@/lib/n8n-client'

export async function POST(request: Request) {
  try {
    const { workflowId } = await request.json()

    if (!workflowId) {
      return Response.json(
        { error: 'Missing workflowId' },
        { status: 400 }
      )
    }

    let result

    switch (workflowId) {
      case 'sam-gov-scraper':
        result = await triggerSamGovScraping()
        break
      case 'usaspending-scraper':
        result = await triggerUsaSpendingScraping()
        break
      case 'contract-matcher':
        result = await triggerContractMatching()
        break
      case 'notifier':
        result = await triggerNotifications()
        break
      default:
        return Response.json(
          { error: 'Unknown workflow' },
          { status: 400 }
        )
    }

    return Response.json(
      {
        success: result.success,
        message: result.message,
        workflowId,
        timestamp: new Date().toISOString(),
      },
      { status: result.success ? 200 : 500 }
    )
  } catch (error) {
    console.error('[API /api/workflows/trigger] Error:', error)
    return Response.json(
      {
        error: 'Failed to trigger workflow',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
