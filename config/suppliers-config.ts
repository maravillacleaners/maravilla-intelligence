/**
 * Supplier Portal Configuration
 * Centralized settings for authentication, email, and opportunity matching
 */

export const SUPPLIERS_CONFIG = {
  // JWT and Session Configuration
  JWT_EXPIRY: '30d',
  PASSWORD_MIN_LENGTH: 8,
  SESSION_COOKIE_NAME: 'supplier_session',
  SESSION_COOKIE_MAX_AGE: 30 * 24 * 60 * 60, // 30 days in seconds
  VERIFICATION_CODE_EXPIRY: 24 * 60 * 60, // 24 hours in seconds

  // Opportunity Matching Rules
  // These rules determine how opportunities are matched to suppliers
  MATCHING: {
    CATEGORY_REQUIRED: true, // Supplier must have service category matches
    LOCATION_PREFERRED: true, // Supplier location overlap is preferred but not required
    CERTIFICATION_BONUS: 10, // +10 points for relevant certification
    CAPACITY_CHECK: true, // Verify supplier has available capacity
  },

  // Email Settings
  EMAIL: {
    FROM: process.env.EMAIL_FROM || 'suppliers@maravillacleaners.com',
    SEND_OPPORTUNITY_NOTIFICATIONS: true,
    NOTIFICATION_FREQUENCY: 'daily', // Options: 'immediate' | 'daily' | 'weekly'
  },

  // Password Policy
  PASSWORD_POLICY: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: false, // Not required but allowed
  },

  // Rate Limiting (for future implementation)
  RATE_LIMITS: {
    LOGIN_ATTEMPTS: 5,
    LOGIN_WINDOW_MINUTES: 15,
    PASSWORD_RESET_ATTEMPTS: 3,
    PASSWORD_RESET_WINDOW_MINUTES: 60,
  },

  // Token Settings
  TOKEN: {
    ALGORITHM: 'HS256',
    ISSUER: 'maravilla-suppliers',
  },
} as const

export type SuppliersConfig = typeof SUPPLIERS_CONFIG
