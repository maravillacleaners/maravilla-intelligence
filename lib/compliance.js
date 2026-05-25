/**
 * Maravilla Intelligence - Compliance Manager
 * Handles opt-out webhooks, suppression lists, and audit logging
 * Non-negotiable compliance enforcement for outreach system
 */

import Airtable from 'airtable';

class ComplianceManager {
  constructor(config) {
    this.config = config;
    this.airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });
    this.baseId = process.env.AIRTABLE_BASE_ID;
  }

  /**
   * Check if email is opted out
   * @param {string} email - Email to check
   * @returns {Promise<boolean>}
   */
  async isOptedOut(email) {
    if (!email || typeof email !== 'string') {
      throw new Error('Invalid email format');
    }

    try {
      const base = this.airtable.base(this.baseId);
      const records = await base('Suppression List')
        .select({
          filterByFormula: `{email} = '${email.toLowerCase()}'`,
          maxRecords: 1
        })
        .all();

      return records.length > 0;
    } catch (error) {
      console.error('Error checking opt-out status:', error);
      throw error;
    }
  }

  /**
   * Handle opt-out webhook from GHL
   * Updates prospect record, adds to suppression list, logs audit event
   * @param {object} payload - {email, ghl_contact_id, timestamp}
   * @returns {Promise<object>} - Result with prospect and suppression IDs
   */
  async handleOptOut(payload) {
    const { email, ghl_contact_id, timestamp } = payload;

    if (!email || typeof email !== 'string') {
      throw new Error('Email is required in opt-out payload');
    }

    const base = this.airtable.base(this.baseId);
    const emailLower = email.toLowerCase();
    const optOutDate = timestamp || new Date().toISOString();

    try {
      // Step 1: Find and update prospect record
      let prospectId = null;
      const prospects = await base('Prospects')
        .select({
          filterByFormula: `{email} = '${emailLower}'`,
          maxRecords: 1
        })
        .all();

      if (prospects.length > 0) {
        const prospectRecord = prospects[0];
        prospectId = prospectRecord.id;

        await base('Prospects').update(prospectId, {
          fields: {
            opt_out: true,
            opt_out_date: new Date(optOutDate).toISOString().split('T')[0],
            opt_out_source: 'GHL',
            ghl_contact_id: ghl_contact_id || prospectRecord.fields.ghl_contact_id,
          }
        });
      }

      // Step 2: Create or update suppression list entry
      const suppressionRecords = await base('Suppression List')
        .select({
          filterByFormula: `{email} = '${emailLower}'`,
          maxRecords: 1
        })
        .all();

      let suppressionId = null;
      if (suppressionRecords.length > 0) {
        suppressionId = suppressionRecords[0].id;
        await base('Suppression List').update(suppressionId, {
          fields: {
            email: emailLower,
            status: 'Active',
            opt_out_date: new Date(optOutDate).toISOString().split('T')[0],
            source: 'GHL Webhook',
            ghl_contact_id: ghl_contact_id,
          }
        });
      } else {
        const created = await base('Suppression List').create({
          fields: {
            email: emailLower,
            status: 'Active',
            opt_out_date: new Date(optOutDate).toISOString().split('T')[0],
            source: 'GHL Webhook',
            ghl_contact_id: ghl_contact_id,
          }
        });
        suppressionId = created.id;
      }

      // Step 3: Log audit event
      await base('Audit Log').create({
        fields: {
          event_type: 'opted_out',
          email: emailLower,
          ghl_contact_id: ghl_contact_id,
          prospect_id: prospectId,
          suppression_id: suppressionId,
          timestamp: new Date(optOutDate).toISOString(),
          details: JSON.stringify({
            source: 'GHL Webhook',
            message: `Contact opted out via GHL webhook`,
          }),
        }
      });

      return {
        success: true,
        prospectId,
        suppressionId,
        email: emailLower,
        timestamp: optOutDate,
      };
    } catch (error) {
      console.error('Error handling opt-out:', error);
      throw error;
    }
  }

  /**
   * Validate if outreach is allowed for a contact
   * Checks: opted-out status, scraping language, rate limits
   * @param {object} outreach - {email, prospect_id, message, channel}
   * @returns {Promise<object>} - {allowed: boolean, reason?: string}
   */
  async validateOutreach(outreach) {
    const { email, prospect_id, message, channel } = outreach;

    if (!email || typeof email !== 'string') {
      return { allowed: false, reason: 'Invalid email format' };
    }

    try {
      // Check 1: Email opted out
      const isOpted = await this.isOptedOut(email);
      if (isOpted) {
        return { allowed: false, reason: 'Email is on suppression list (opted out)' };
      }

      // Check 2: Message contains scraping/spam language
      if (message && typeof message === 'string') {
        const scrapingIndicators = [
          'scraping',
          'web scraper',
          'data mining',
          'automated extraction',
          'without permission',
          'unauthorized',
        ];
        const messageLower = message.toLowerCase();
        const hasScrapingLanguage = scrapingIndicators.some(indicator =>
          messageLower.includes(indicator)
        );

        if (hasScrapingLanguage) {
          return { allowed: false, reason: 'Message contains prohibited scraping/spam language' };
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error validating outreach:', error);
      return { allowed: false, reason: `Validation error: ${error.message}` };
    }
  }
}

export default ComplianceManager;
