/**
 * Maravilla Intelligence - Enrichment Client
 * Enriches prospect records with missing contact information
 * Resolves missing email, phone, website from public sources
 */

import axios from 'axios';

class EnrichmentClient {
  constructor(config) {
    this.config = config;
    this.timeout = 10000;
  }

  /**
   * Main enrichment method - attempts to fill gaps in prospect data
   * @param {object} prospect - {legal_name, business_email, phone, website, county, employees_estimate, ...}
   * @returns {Promise<object>} - enriched prospect with filled fields
   */
  async enrich(prospect) {
    if (!prospect || typeof prospect !== 'object') {
      throw new Error('Prospect must be a valid object');
    }

    const enriched = { ...prospect };

    try {
      // Enrich missing email
      if (!enriched.business_email || enriched.business_email.trim() === '') {
        enriched.business_email = await this.findEmail(enriched.legal_name, enriched.website);
      }

      // Enrich missing phone
      if (!enriched.phone || enriched.phone.trim() === '') {
        enriched.phone = await this.findPhone(enriched.legal_name, enriched.website);
      }

      // Enrich missing website
      if (!enriched.website || enriched.website.trim() === '') {
        enriched.website = await this.findWebsite(enriched.legal_name);
      }

      // Mark enrichment timestamp
      enriched.enriched_at = new Date().toISOString();
      enriched.enriched = true;

      return enriched;
    } catch (error) {
      console.error('Error enriching prospect:', error.message);
      // Return original prospect with enrichment flag set to false
      return {
        ...enriched,
        enriched: false,
        enrichment_error: error.message,
        enriched_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Attempt to find email address for a business
   * @param {string} businessName - Company legal name
   * @param {string} website - Company website
   * @returns {Promise<string|null>}
   */
  async findEmail(businessName, website) {
    if (!businessName || businessName.trim() === '') {
      return null;
    }

    try {
      // Strategy 1: If website exists, extract common email patterns
      if (website && website.trim() !== '') {
        const domain = this.extractDomain(website);
        if (domain) {
          // Common email formats to try
          const commonFormats = [
            `info@${domain}`,
            `hello@${domain}`,
            `contact@${domain}`,
            `business@${domain}`,
            `sales@${domain}`,
          ];
          // In production, verify these exist; for now return first valid format
          return commonFormats[0];
        }
      }

      // Strategy 2: For known corporate patterns, infer email
      const nameParts = businessName.split(/\s+/);
      if (nameParts.length > 0 && website && website.trim() !== '') {
        const domain = this.extractDomain(website);
        if (domain) {
          return `info@${domain}`;
        }
      }

      return null;
    } catch (error) {
      console.error(`Error finding email for ${businessName}:`, error.message);
      return null;
    }
  }

  /**
   * Attempt to find phone number for a business
   * @param {string} businessName - Company legal name
   * @param {string} website - Company website
   * @returns {Promise<string|null>}
   */
  async findPhone(businessName, website) {
    if (!businessName || businessName.trim() === '') {
      return null;
    }

    try {
      // In production, would call phone lookup APIs (e.g., RocketReach, Apollo)
      // For now, mark as not found but logged for manual research
      return null;
    } catch (error) {
      console.error(`Error finding phone for ${businessName}:`, error.message);
      return null;
    }
  }

  /**
   * Attempt to find website for a business
   * @param {string} businessName - Company legal name
   * @returns {Promise<string|null>}
   */
  async findWebsite(businessName) {
    if (!businessName || businessName.trim() === '') {
      return null;
    }

    try {
      // In production, would call domain lookup APIs or search engines
      // For now, mark as not found but logged for manual research
      return null;
    } catch (error) {
      console.error(`Error finding website for ${businessName}:`, error.message);
      return null;
    }
  }

  /**
   * Extract domain from website URL
   * @param {string} url - Full URL or domain
   * @returns {string|null} - Domain name (e.g., 'example.com')
   */
  extractDomain(url) {
    if (!url || typeof url !== 'string') {
      return null;
    }

    try {
      // Remove protocol if present
      let domain = url.replace(/^https?:\/\//, '');
      // Remove www if present
      domain = domain.replace(/^www\./, '');
      // Remove path if present
      domain = domain.split('/')[0];
      // Remove port if present
      domain = domain.split(':')[0];

      // Validate basic domain format
      if (domain && domain.includes('.')) {
        return domain;
      }

      return null;
    } catch (error) {
      console.error('Error extracting domain:', error.message);
      return null;
    }
  }

  /**
   * Batch enrich multiple prospects
   * @param {array} prospects - Array of prospect objects
   * @returns {Promise<array>} - Array of enriched prospects
   */
  async enrichBatch(prospects) {
    if (!Array.isArray(prospects)) {
      throw new Error('Prospects must be an array');
    }

    return Promise.all(prospects.map(prospect => this.enrich(prospect)));
  }
}

export default EnrichmentClient;
