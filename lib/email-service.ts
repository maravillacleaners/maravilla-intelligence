/**
 * Email Service — Handles outreach campaigns
 * Supports: SendGrid, Mailgun, or demo mode
 */

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  variables: string[] // [company_name], [contact_name], etc.
  category: 'prospect' | 'contract' | 'sub'
}

export interface Campaign {
  id: string
  name: string
  templateId: string
  recipients: Array<{
    recordId: string
    email: string
    name: string
    variables: { [key: string]: string }
  }>
  status: 'draft' | 'scheduled' | 'running' | 'completed'
  scheduledFor?: string
  sentCount: number
  openCount: number
  clickCount: number
  createdAt: string
  updatedAt: string
}

export interface EmailLog {
  id: string
  campaignId: string
  recordId: string
  email: string
  subject: string
  status: 'pending' | 'sent' | 'bounced' | 'opened' | 'clicked'
  sentAt?: string
  openedAt?: string
  clickedAt?: string
  trackingId?: string
}

// Default templates
export const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'prospect-initial',
    name: 'Initial Prospect Outreach',
    subject: 'Partnership Opportunity with [company_name]',
    body: `Hi [contact_name],

I came across [company_name] and was impressed by your work in [industry].

I believe we can create significant value through a partnership on federal contracting opportunities. Your background in [service_type] aligns perfectly with our capabilities.

Would you be open to a brief conversation next week?

Best regards,
Commercial Intelligence Team`,
    variables: ['company_name', 'contact_name', 'industry', 'service_type'],
    category: 'prospect',
  },
  {
    id: 'contract-teaming',
    name: 'Federal Contract Teaming Offer',
    subject: 'Teaming Partner Opportunity - [opportunity_name]',
    body: `Hello [contact_name],

We identified the "[opportunity_name]" opportunity and believe we can strengthen your proposal through teaming.

Our expertise in [service_category] has delivered results on similar federal contracts, with an average contract value of [avg_contract_value].

Would you like to discuss this opportunity?

Estimated Contract Value: [contract_value]
Deadline: [deadline]

Best regards,
Commercial Intelligence Team`,
    variables: ['contact_name', 'opportunity_name', 'service_category', 'avg_contract_value', 'contract_value', 'deadline'],
    category: 'contract',
  },
  {
    id: 'sub-partnership',
    name: 'Subcontractor Partnership Inquiry',
    subject: 'Partnership Opportunity - [company_name]',
    body: `Hi [contact_name],

We're building a network of qualified subcontractors and came across [company_name].

Your expertise in [sub_category] would be valuable for our federal contracting pipeline. We regularly have [opportunity_type] opportunities available.

Let's connect to discuss potential partnerships.

Best regards,
Commercial Intelligence Team`,
    variables: ['contact_name', 'company_name', 'sub_category', 'opportunity_type'],
    category: 'sub',
  },
]

// Follow-up sequences (auto-triggered)
export const FOLLOWUP_SEQUENCES = {
  prospect: [
    { days: 0, templateId: 'prospect-initial', name: 'Initial Outreach' },
    { days: 3, templateId: 'prospect-followup-1', name: '3-Day Follow-up' },
    { days: 7, templateId: 'prospect-followup-2', name: '1-Week Follow-up' },
  ],
  contract: [
    { days: 0, templateId: 'contract-teaming', name: 'Initial Teaming Offer' },
    { days: 2, templateId: 'contract-followup-1', name: '2-Day Reminder' },
  ],
  sub: [
    { days: 0, templateId: 'sub-partnership', name: 'Initial Partnership Inquiry' },
    { days: 5, templateId: 'sub-followup-1', name: '5-Day Follow-up' },
  ],
}

/**
 * Send email via configured service
 * Supports: SendGrid, Mailgun, or demo mode
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  trackingId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const emailService = process.env.EMAIL_SERVICE || 'demo'
  const apiKey = process.env.EMAIL_API_KEY

  // Demo mode - simulate sending
  if (emailService === 'demo' || !apiKey) {
    console.log(`[EMAIL DEMO] To: ${to}`)
    console.log(`[EMAIL DEMO] Subject: ${subject}`)
    console.log(`[EMAIL DEMO] Tracking: ${trackingId}`)
    return {
      success: true,
      messageId: `demo-${Date.now()}`,
    }
  }

  // SendGrid
  if (emailService === 'sendgrid') {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: process.env.EMAIL_FROM || 'noreply@maravilla.com' },
          subject,
          content: [{ type: 'text/html', value: body }],
          tracking_settings: {
            click_tracking: { enable: true },
            open_tracking: { enable: true },
          },
          custom_args: {
            tracking_id: trackingId,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: JSON.stringify(error) }
      }

      return {
        success: true,
        messageId: response.headers.get('x-message-id') || `sg-${Date.now()}`,
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  // Mailgun
  if (emailService === 'mailgun') {
    const domain = process.env.MAILGUN_DOMAIN
    if (!domain) {
      return { success: false, error: 'MAILGUN_DOMAIN not configured' }
    }

    try {
      const formData = new FormData()
      formData.append('from', process.env.EMAIL_FROM || 'noreply@maravilla.com')
      formData.append('to', to)
      formData.append('subject', subject)
      formData.append('html', body)
      if (trackingId) {
        formData.append('v:tracking_id', trackingId)
      }

      const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: JSON.stringify(error) }
      }

      const data = await response.json()
      return {
        success: true,
        messageId: data.id,
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  return { success: false, error: 'Unknown email service' }
}

/**
 * Replace template variables with actual values
 */
export function interpolateTemplate(
  template: EmailTemplate,
  variables: { [key: string]: string }
): { subject: string; body: string } {
  let subject = template.subject
  let body = template.body

  template.variables.forEach(variable => {
    const value = variables[variable] || `[${variable}]`
    const regex = new RegExp(`\\[${variable}\\]`, 'g')
    subject = subject.replace(regex, value)
    body = body.replace(regex, value)
  })

  return { subject, body }
}

/**
 * Generate tracking pixel HTML
 */
export function generateTrackingPixel(trackingId: string): string {
  return `<img src="https://your-domain.com/api/track?id=${trackingId}" width="1" height="1" alt="" />`
}
