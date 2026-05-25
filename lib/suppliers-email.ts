/**
 * Supplier Email Templates Library
 * HTML-formatted email templates for supplier communication
 */

export interface EmailTemplate {
  subject: string
  html: string
}

/**
 * Welcome email sent upon supplier registration
 * Informs new supplier their account is under review
 */
export function buildWelcomeEmail(
  companyName: string,
  contactName: string
): EmailTemplate {
  return {
    subject: `Welcome to Maravilla Intelligence, ${companyName}!`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3222F4 0%, #612BF2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none; }
    .content h2 { color: #3222F4; margin-top: 0; }
    .content p { margin: 15px 0; }
    .content ul { margin: 15px 0; padding-left: 20px; }
    .content li { margin: 8px 0; }
    .cta-button {
      display: inline-block;
      background: #3222F4;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .cta-button:hover { background: #2414c7; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Maravilla Intelligence</h1>
    </div>
    <div class="content">
      <h2>Hello ${contactName}!</h2>
      <p>Thank you for registering <strong>${companyName}</strong> with Maravilla Intelligence.</p>
      <p>Your account is currently under review. We'll notify you within 24 hours once it's approved.</p>

      <p><strong>In the meantime, you can:</strong></p>
      <ul>
        <li>Complete your profile with certifications and documents</li>
        <li>Update your preferred service categories and locations</li>
        <li>Review our platform features and capabilities</li>
      </ul>

      <p>
        <a href="https://suppliers.maravillacleaners.com/suppliers/profile" class="cta-button">Visit Your Profile</a>
      </p>

      <p>If you have any questions, please don't hesitate to reach out to our support team.</p>

      <div class="footer">
        <p>Best regards,<br><strong>Maravilla Intelligence Team</strong></p>
      </div>
    </div>
  </div>
</body>
</html>`,
  }
}

/**
 * Account approved email
 * Notifies supplier their account has been activated and they can start applying
 */
export function buildApprovedEmail(
  companyName: string,
  contactName: string
): EmailTemplate {
  return {
    subject: `Your Account is Approved! 🎉`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #00C7DE 0%, #3222F4 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none; }
    .content h2 { color: #3222F4; margin-top: 0; }
    .content p { margin: 15px 0; }
    .content ul { margin: 15px 0; padding-left: 20px; }
    .content li { margin: 8px 0; }
    .success-box { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .cta-button {
      display: inline-block;
      background: #4caf50;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .cta-button:hover { background: #45a049; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Account Approved! ✅</h1>
    </div>
    <div class="content">
      <h2>Great news, ${contactName}!</h2>
      <p>Your <strong>${companyName}</strong> account has been approved and is now active!</p>

      <div class="success-box">
        <p><strong>You can now:</strong></p>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>✅ Browse all available opportunities</li>
          <li>✅ Submit applications to opportunities that match your services</li>
          <li>✅ Track your applications in real-time</li>
          <li>✅ Receive email notifications for new opportunities</li>
        </ul>
      </div>

      <p>
        <a href="https://suppliers.maravillacleaners.com/suppliers/opportunities" class="cta-button">View Opportunities</a>
      </p>

      <p>Welcome aboard! We're excited to work with you.</p>

      <div class="footer">
        <p>Best regards,<br><strong>Maravilla Intelligence Team</strong></p>
      </div>
    </div>
  </div>
</body>
</html>`,
  }
}

/**
 * Account rejected email
 * Informs supplier their application was not approved at this time
 */
export function buildRejectedEmail(
  companyName: string,
  contactName: string
): EmailTemplate {
  return {
    subject: `Account Application Status`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #FF9800 0%, #F0F000 100%); color: #333; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none; }
    .content h2 { color: #FF9800; margin-top: 0; }
    .content p { margin: 15px 0; }
    .content ul { margin: 15px 0; padding-left: 20px; }
    .content li { margin: 8px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Application Status Update</h1>
    </div>
    <div class="content">
      <h2>Hello ${contactName},</h2>
      <p>Thank you for your interest in joining Maravilla Intelligence.</p>
      <p>Unfortunately, we are unable to approve your account at this time. This may be due to:</p>

      <ul>
        <li>Incomplete information in your profile</li>
        <li>Service categories that don't currently match our needs</li>
        <li>Geographic coverage area limitations</li>
      </ul>

      <p>We encourage you to reapply in the future as our needs and coverage areas expand. Feel free to contact us with questions about your application.</p>

      <p>Thank you for your interest in working with Maravilla Intelligence.</p>

      <div class="footer">
        <p>Best regards,<br><strong>Maravilla Intelligence Team</strong></p>
      </div>
    </div>
  </div>
</body>
</html>`,
  }
}

/**
 * New opportunity notification email
 * Alerts supplier of a new matched opportunity with details
 */
export function buildOpportunityNotificationEmail(
  contactName: string,
  opportunityName: string,
  agency: string,
  deadline: string,
  contractValue: number,
  matchScore: number,
  matchReason: string
): EmailTemplate {
  return {
    subject: `New Opportunity: ${opportunityName}`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3222F4 0%, #00C7DE 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none; }
    .content h2 { color: #3222F4; margin-top: 0; }
    .opportunity-box { background: white; border: 2px solid #DBEAEE; padding: 20px; margin: 20px 0; border-radius: 6px; }
    .opportunity-box p { margin: 10px 0; }
    .opportunity-label { font-weight: 600; color: #3222F4; display: inline-block; min-width: 120px; }
    .match-score {
      background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
      color: white;
      padding: 8px 12px;
      border-radius: 20px;
      display: inline-block;
      font-weight: 600;
    }
    .cta-button {
      display: inline-block;
      background: #3222F4;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .cta-button:hover { background: #2414c7; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 New Opportunity Found</h1>
    </div>
    <div class="content">
      <h2>Hi ${contactName},</h2>
      <p>We found a new opportunity that matches your services and capabilities!</p>

      <div class="opportunity-box">
        <p><span class="opportunity-label">Opportunity:</span> <strong>${opportunityName}</strong></p>
        <p><span class="opportunity-label">Agency:</span> ${agency}</p>
        <p><span class="opportunity-label">Deadline:</span> ${deadline}</p>
        <p><span class="opportunity-label">Estimated Value:</span> <strong>$${contractValue.toLocaleString()}</strong></p>
        <p><span class="opportunity-label">Match Score:</span> <span class="match-score">${matchScore}%</span></p>
        <p><span class="opportunity-label">Why matched:</span> ${matchReason}</p>
      </div>

      <p>
        <a href="https://suppliers.maravillacleaners.com/suppliers/opportunities" class="cta-button">View & Apply Now</a>
      </p>

      <p>This is a time-sensitive opportunity. Review the details and submit your application before the deadline.</p>
      <p>Questions? Reply to this email and our team will be happy to help.</p>

      <div class="footer">
        <p>Best regards,<br><strong>Maravilla Intelligence Team</strong></p>
      </div>
    </div>
  </div>
</body>
</html>`,
  }
}

/**
 * Application submission confirmation email
 * Confirms supplier's application has been successfully submitted
 */
export function buildApplicationConfirmationEmail(
  contactName: string,
  opportunityName: string
): EmailTemplate {
  return {
    subject: `Application Submitted: ${opportunityName}`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none; }
    .content h2 { color: #4caf50; margin-top: 0; }
    .confirmation-box { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .cta-button {
      display: inline-block;
      background: #3222F4;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .cta-button:hover { background: #2414c7; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Application Submitted ✅</h1>
    </div>
    <div class="content">
      <h2>Application Successfully Submitted</h2>

      <div class="confirmation-box">
        <p>Hi ${contactName},</p>
        <p>Your application for <strong>${opportunityName}</strong> has been submitted successfully.</p>
      </div>

      <p>You'll be notified of any updates to your application status. Check your dashboard anytime for the latest information.</p>

      <p>
        <a href="https://suppliers.maravillacleaners.com/suppliers/applications" class="cta-button">View Your Applications</a>
      </p>

      <p>Thank you for your interest. We'll be in touch soon!</p>

      <div class="footer">
        <p>Best regards,<br><strong>Maravilla Intelligence Team</strong></p>
      </div>
    </div>
  </div>
</body>
</html>`,
  }
}

/**
 * Application status update email
 * Notifies supplier of status change (Under Review, Accepted, Rejected, Withdrawn)
 */
export function buildApplicationStatusUpdateEmail(
  contactName: string,
  opportunityName: string,
  newStatus: string
): EmailTemplate {
  const statusMessages: Record<string, string> = {
    'Under Review': 'Your application is now under review. We\'ll update you soon with a decision.',
    'Accepted': '🎉 Congratulations! Your application has been accepted!',
    'Rejected':
      'Unfortunately, your application was not selected at this time. We encourage you to apply for other opportunities.',
    'Withdrawn': 'Your application has been withdrawn.',
  }

  const statusColors: Record<string, string> = {
    'Under Review': '#FF9800',
    'Accepted': '#4caf50',
    'Rejected': '#f44336',
    'Withdrawn': '#9E9E9E',
  }

  const statusColor = statusColors[newStatus] || '#3222F4'

  return {
    subject: `Application Update: ${opportunityName}`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none; }
    .content h2 { color: ${statusColor}; margin-top: 0; }
    .status-box { background: white; border-left: 4px solid ${statusColor}; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .opportunity-name { font-weight: 600; color: #333; font-size: 16px; }
    .status-badge {
      background: ${statusColor};
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      display: inline-block;
      font-weight: 600;
      margin: 10px 0;
    }
    .cta-button {
      display: inline-block;
      background: #3222F4;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .cta-button:hover { background: #2414c7; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Application Status Update</h1>
    </div>
    <div class="content">
      <h2>Your Application Status Has Changed</h2>

      <div class="status-box">
        <p class="opportunity-name">${opportunityName}</p>
        <p class="status-badge">${newStatus}</p>
        <p>${statusMessages[newStatus] || 'Your application status has been updated.'}</p>
      </div>

      <p>
        <a href="https://suppliers.maravillacleaners.com/suppliers/applications" class="cta-button">View Details</a>
      </p>

      <p>If you have any questions about your application, please don't hesitate to reach out.</p>

      <div class="footer">
        <p>Best regards,<br><strong>Maravilla Intelligence Team</strong></p>
      </div>
    </div>
  </div>
</body>
</html>`,
  }
}

/**
 * Account reactivation email
 * Notifies supplier their suspended account has been reactivated
 */
export function buildReactivationEmail(
  companyName: string,
  contactName: string
): EmailTemplate {
  return {
    subject: `Your Account Has Been Reactivated`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3222F4 0%, #612BF2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none; }
    .content h2 { color: #3222F4; margin-top: 0; }
    .content p { margin: 15px 0; }
    .reactivation-box { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .cta-button {
      display: inline-block;
      background: #3222F4;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .cta-button:hover { background: #2414c7; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Account Reactivated ✅</h1>
    </div>
    <div class="content">
      <h2>Welcome back, ${contactName}!</h2>

      <div class="reactivation-box">
        <p>Your <strong>${companyName}</strong> account has been reactivated and is now fully active.</p>
        <p>You can now browse opportunities and submit applications again.</p>
      </div>

      <p>
        <a href="https://suppliers.maravillacleaners.com/suppliers/opportunities" class="cta-button">View Opportunities</a>
      </p>

      <p>We're glad to have you back! If you have any questions, please reach out to our support team.</p>

      <div class="footer">
        <p>Best regards,<br><strong>Maravilla Intelligence Team</strong></p>
      </div>
    </div>
  </div>
</body>
</html>`,
  }
}
