/**
 * Notifications API Route
 * POST /api/notifications/send
 *
 * Sends notifications to suppliers about new opportunities
 */

import { sendNewOpportunityEmail, sendBulkNotifications } from '@/lib/email-automation'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, opportunities, suppliers } = body

    if (!type) {
      return Response.json({ error: 'Missing notification type' }, { status: 400 })
    }

    let sent = 0

    if (type === 'new_opportunity' && opportunities && Array.isArray(opportunities)) {
      for (const opportunity of opportunities) {
        try {
          await sendNewOpportunityEmail(
            opportunity.supplier_email,
            opportunity.opportunity_name,
            opportunity.contract_value_usd,
            opportunity.deadline,
            opportunity.match_score
          )
          sent++
        } catch (error) {
          console.error(
            `[API /api/notifications/send] Failed to send to ${opportunity.supplier_email}:`,
            error
          )
        }
      }
    } else if (type === 'bulk' && suppliers && Array.isArray(suppliers)) {
      sent = await sendBulkNotifications(suppliers, opportunities || [])
    }

    return Response.json(
      {
        success: true,
        notificationsSent: sent,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[API /api/notifications/send] Error:', error)
    return Response.json(
      {
        error: 'Failed to send notifications',
        details: errorMsg,
      },
      { status: 500 }
    )
  }
}
