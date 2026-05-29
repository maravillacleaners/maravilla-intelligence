/**
 * n8n Integration Client
 * Handles webhook communication with n8n automation workflows
 */

const N8N_BASE_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678'

interface WorkflowTriggerPayload {
  [key: string]: any
}

interface WorkflowResponse {
  success: boolean
  workflowId?: string
  message?: string
  data?: any
}

/**
 * Trigger SAM.gov scraping workflow
 */
export async function triggerSamGovScraping(
  filters?: Record<string, any>
): Promise<WorkflowResponse> {
  try {
    const response = await fetch(`${N8N_BASE_URL}/webhook/sam-gov-scraper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'scrape',
        filters: filters || {},
        timestamp: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      console.error('[n8n] SAM.gov trigger failed:', response.statusText)
      return { success: false, message: 'Failed to trigger workflow' }
    }

    return { success: true, message: 'SAM.gov scraping started' }
  } catch (error) {
    console.error('[n8n] SAM.gov scraping error:', error)
    return { success: false, message: 'Workflow trigger error' }
  }
}

/**
 * Trigger USASpending scraping workflow
 */
export async function triggerUsaSpendingScraping(
  filters?: Record<string, any>
): Promise<WorkflowResponse> {
  try {
    const response = await fetch(`${N8N_BASE_URL}/webhook/usaspending-scraper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'scrape',
        filters: filters || {},
        timestamp: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      return { success: false, message: 'Failed to trigger workflow' }
    }

    return { success: true, message: 'USASpending scraping started' }
  } catch (error) {
    console.error('[n8n] USASpending scraping error:', error)
    return { success: false, message: 'Workflow trigger error' }
  }
}

/**
 * Trigger contract matching workflow
 */
export async function triggerContractMatching(): Promise<WorkflowResponse> {
  try {
    const response = await fetch(`${N8N_BASE_URL}/webhook/contract-matcher`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'match',
        timestamp: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      return { success: false, message: 'Failed to trigger workflow' }
    }

    return { success: true, message: 'Contract matching started' }
  } catch (error) {
    console.error('[n8n] Contract matching error:', error)
    return { success: false, message: 'Workflow trigger error' }
  }
}

/**
 * Trigger notification workflow
 */
export async function triggerNotifications(
  suppliers?: string[]
): Promise<WorkflowResponse> {
  try {
    const response = await fetch(`${N8N_BASE_URL}/webhook/notifier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'notify',
        suppliers: suppliers || [],
        timestamp: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      return { success: false, message: 'Failed to trigger workflow' }
    }

    return { success: true, message: 'Notifications queued' }
  } catch (error) {
    console.error('[n8n] Notification error:', error)
    return { success: false, message: 'Workflow trigger error' }
  }
}

/**
 * Get workflow status (polling)
 */
export async function getWorkflowStatus(
  workflowId: string
): Promise<{ status: string; lastRun?: string; nextRun?: string }> {
  try {
    const response = await fetch(
      `${N8N_BASE_URL}/webhook/workflow-status?id=${workflowId}`,
      { method: 'GET' }
    )

    if (!response.ok) {
      return { status: 'unknown' }
    }

    return await response.json()
  } catch (error) {
    console.error('[n8n] Status check error:', error)
    return { status: 'error' }
  }
}
