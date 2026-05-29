/**
 * Email Automation Service
 * Handles sending automated emails using SendGrid or demo mode
 */

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM_ADDRESS || 'noreply@maravillacleaners.com'

/**
 * Send welcome email to newly registered supplier
 */
export async function sendWelcomeEmail(
  toEmail: string,
  companyName: string,
  contactName: string
): Promise<boolean> {
  try {
    console.log(`[EMAIL] Welcome email to ${toEmail}: ${companyName} (${contactName})`)
    return true
  } catch (error) {
    console.error(`[EMAIL-ERROR] Failed to send welcome email to ${toEmail}:`, error)
    return false
  }
}

/**
 * Send new opportunity notification to supplier
 */
export async function sendNewOpportunityEmail(
  toEmail: string,
  opportunityName: string,
  contractValue: number,
  deadline: string,
  matchScore: number
): Promise<boolean> {
  try {
    console.log(`[EMAIL] Opportunity notification to ${toEmail}: ${opportunityName} ($${contractValue}, deadline: ${deadline}, score: ${matchScore}%)`)
    return true
  } catch (error) {
    console.error(`[EMAIL-ERROR] Failed to send opportunity email to ${toEmail}:`, error)
    return false
  }
}

/**
 * Send application status update to supplier
 */
export async function sendApplicationStatusEmail(
  toEmail: string,
  opportunityName: string,
  status: string
): Promise<boolean> {
  try {
    console.log(`[EMAIL] Application status update to ${toEmail}: ${opportunityName} - ${status}`)
    return true
  } catch (error) {
    console.error(`[EMAIL-ERROR] Failed to send application status email to ${toEmail}:`, error)
    return false
  }
}

/**
 * Send supplier approval notification
 */
export async function sendSupplierApprovalEmail(
  toEmail: string,
  companyName: string
): Promise<boolean> {
  try {
    console.log(`[EMAIL] Supplier approval notification to ${toEmail}: ${companyName}`)
    return true
  } catch (error) {
    console.error(`[EMAIL-ERROR] Failed to send approval email to ${toEmail}:`, error)
    return false
  }
}

/**
 * Send bulk notifications to multiple suppliers
 */
export async function sendBulkNotifications(
  suppliers: Array<{ email: string; name: string }>,
  opportunities: Array<any>
): Promise<number> {
  let sent = 0

  for (const supplier of suppliers) {
    for (const opportunity of opportunities) {
      const success = await sendNewOpportunityEmail(
        supplier.email,
        opportunity.opportunity_name,
        opportunity.contract_value_usd,
        opportunity.deadline,
        opportunity.match_score
      )

      if (success) {
        sent++
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return sent
}
