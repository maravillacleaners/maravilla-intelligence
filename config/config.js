/**
 * Maravilla Intelligence System - Config Scaffold
 * Single source of truth for all swappable parameters
 * PRIMARY_NAICS: 561720 (janitorial services) - swappable
 * Counties: Florida-focused, extensible
 */

const config = {
  // System Identity
  SYSTEM_NAME: 'Maravilla Intelligence',
  VERSION: '1.0.0',
  ENVIRONMENT: process.env.NODE_ENV || 'development',

  // Industry Classification (SWAPPABLE)
  PRIMARY_NAICS: process.env.PRIMARY_NAICS || '561720', // Janitorial services
  NAICS_NAME: 'Janitorial Services',

  // Geographic Configuration - Florida Counties (EXTENSIBLE)
  FLORIDA_COUNTIES: [
    { name: 'Miami-Dade', code: 'FL-MD', metro: 'Miami' },
    { name: 'Broward', code: 'FL-BW', metro: 'Miami' },
    { name: 'Palm Beach', code: 'FL-PB', metro: 'Miami' },
    { name: 'Orange', code: 'FL-OR', metro: 'Orlando' },
    { name: 'Hillsborough', code: 'FL-HB', metro: 'Tampa' },
    { name: 'Pinellas', code: 'FL-PN', metro: 'Tampa' },
    { name: 'Duval', code: 'FL-DV', metro: 'Jacksonville' },
    { name: 'Seminole', code: 'FL-SM', metro: 'Orlando' },
  ],

  // ICP (Ideal Customer Profile) Segments - PRIORITY ORDER
  ICP_SEGMENTS: [
    {
      segment: 'Property Manager',
      priority: 1,
      fit_score: 0.95,
      description: 'Commercial property management companies (high contract value)',
      key_signals: ['property management software', 'multiple locations', 'vendor management'],
    },
    {
      segment: 'Clinic/Medical',
      priority: 2,
      fit_score: 0.90,
      description: 'Medical facilities requiring compliance & infection control',
      key_signals: ['healthcare', 'HIPAA', 'infection control', 'staff welfare'],
    },
    {
      segment: 'Office Complex',
      priority: 3,
      fit_score: 0.88,
      description: 'Large office buildings (100+ employees)',
      key_signals: ['office space', 'corporate tenant', 'shared workspace'],
    },
    {
      segment: 'Government/GovCon',
      priority: 4,
      fit_score: 0.85,
      description: 'Government agencies & government contractors',
      key_signals: ['government contract', 'compliance', 'federal/state building'],
    },
    {
      segment: 'Newly Formed',
      priority: 5,
      fit_score: 0.80,
      description: 'Companies registered <12 months (growth mindset, flexible vendors)',
      key_signals: ['new registration', 'startup', 'recent funding'],
    },
  ],

  // Airtable Integration
  AIRTABLE: {
    API_KEY_ENV_VAR: 'AIRTABLE_API_KEY',
    BASE_ID_ENV_VAR: 'AIRTABLE_BASE_ID',
    // Table names (will map to actual tables in config setup)
    TABLES: {
      PROSPECTS: 'Prospects',
      COMPANIES: 'Companies',
      OUTREACH: 'Outreach',
      PIPELINE: 'Pipeline',
    },
  },

  // n8n Integration
  N8N: {
    API_URL_ENV_VAR: 'N8N_WEBHOOK_URL',
    TIMEOUT_MS: 30000,
  },

  // Claude API Integration
  CLAUDE_API: {
    API_KEY_ENV_VAR: 'CLAUDE_API_KEY',
    MODEL: 'claude-opus-4-1',
    MAX_TOKENS: 4096,
    TEMPERATURE: 0.7,
  },

  // Lead Scoring Configuration
  LEAD_SCORING: {
    HIGH_SCORE_THRESHOLD: 75,
    MEDIUM_SCORE_THRESHOLD: 50,
    LOW_SCORE_THRESHOLD: 25,
    RECENCY_WEIGHT: 0.3,
    ENGAGEMENT_WEIGHT: 0.4,
    FIT_WEIGHT: 0.3,
  },

  // Outreach Configuration
  OUTREACH: {
    MAX_CONCURRENT_THREADS: 5,
    DAILY_RATE_LIMIT: 100,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 2000,
  },

  // System Health Checks
  HEALTH: {
    CHECK_INTERVAL_MS: 300000, // 5 minutes
    AIRTABLE_TIMEOUT_MS: 10000,
    N8N_TIMEOUT_MS: 15000,
    CLAUDE_TIMEOUT_MS: 30000,
  },

  // Validation
  validate: function () {
    if (!this.PRIMARY_NAICS || this.PRIMARY_NAICS.length === 0) {
      throw new Error('PRIMARY_NAICS is required');
    }
    if (!Array.isArray(this.FLORIDA_COUNTIES) || this.FLORIDA_COUNTIES.length === 0) {
      throw new Error('FLORIDA_COUNTIES must be non-empty array');
    }
    if (!Array.isArray(this.ICP_SEGMENTS) || this.ICP_SEGMENTS.length === 0) {
      throw new Error('ICP_SEGMENTS must be non-empty array');
    }
    return true;
  },

  // Get config summary
  getSummary: function () {
    return {
      system: this.SYSTEM_NAME,
      version: this.VERSION,
      environment: this.ENVIRONMENT,
      primary_naics: this.PRIMARY_NAICS,
      counties_count: this.FLORIDA_COUNTIES.length,
      icp_segments: this.ICP_SEGMENTS.length,
      validation: this.validate(),
    };
  },
};

export default config;
