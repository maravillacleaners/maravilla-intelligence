import { DEFAULT_TEMPLATES, sendEmail, interpolateTemplate } from '@/lib/email-service'

export interface SendCampaignRequest {
  campaignId: string
  templateId: string
  recipients: Array<{
    recordId: string
    email: string
    name: string
    variables: { [key: string]: string }
  }>
}

export async function POST(request: Request) {
  try {
    const body: SendCampaignRequest = await request.json()

    if (!body.campaignId || !body.templateId || !body.recipients?.length) {
      return Response.json(
        { error: 'Missing required fields: campaignId, templateId, recipients' },
        { status: 400 }
      )
    }

    console.log(
      `[API /campaigns/send] Sending campaign ${body.campaignId} to ${body.recipients.length} recipients`
    )

    // Get template
    const template = DEFAULT_TEMPLATES.find(t => t.id === body.templateId)
    if (!template) {
      return Response.json(
        { error: `Template not found: ${body.templateId}` },
        { status: 404 }
      )
    }

    // Send emails
    const results: Array<{
      recordId: string
      email: string
      status: 'sent' | 'failed'
      messageId?: string
      error?: string
    }> = []

    for (const recipient of body.recipients) {
      try {
        // Interpolate template
        const { subject, body: htmlBody } = interpolateTemplate(template, recipient.variables)

        // Generate tracking ID
        const trackingId = `${body.campaignId}-${recipient.recordId}-${Date.now()}`

        // Add tracking pixel (commented for demo)
        // const bodyWithTracking = htmlBody + generateTrackingPixel(trackingId)

        // Send email
        const result = await sendEmail(recipient.email, subject, htmlBody, trackingId)

        results.push({
          recordId: recipient.recordId,
          email: recipient.email,
          status: result.success ? 'sent' : 'failed',
          messageId: result.messageId,
          error: result.error,
        })

        console.log(`[API /campaigns/send] Email sent to ${recipient.email}: ${result.success}`)
      } catch (error) {
        results.push({
          recordId: recipient.recordId,
          email: recipient.email,
          status: 'failed',
          error: String(error),
        })
        console.error(`[API /campaigns/send] Error sending to ${recipient.email}:`, error)
      }

      // Rate limiting - wait 500ms between emails
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    const successCount = results.filter(r => r.status === 'sent').length
    const failureCount = results.filter(r => r.status === 'failed').length

    console.log(
      `[API /campaigns/send] Campaign sent: ${successCount} success, ${failureCount} failed`
    )

    return Response.json({
      success: true,
      campaignId: body.campaignId,
      sent: successCount,
      failed: failureCount,
      results,
    })
  } catch (error) {
    console.error('[API /campaigns/send] Error:', error)
    return Response.json(
      { error: 'Failed to send campaign', details: String(error) },
      { status: 500 }
    )
  }
}
