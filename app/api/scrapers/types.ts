/**
 * SHARED TYPES - Maravilla Intelligence Scrapers
 * Define interfaces usadas en todos los scrapers
 */

export interface ScraperResponse<T> {
  data: T[]
  saved_to_airtable: string[]
  count: number
  source: string
  timestamp: string
  errors?: string[]
}

export interface BusinessRegistration {
  legal_name: string
  dba: string[]
  date_formed: string
  status: 'Active' | 'Inactive' | 'Dissolved' | 'Unknown'
  registration_number: string
  county: string
  officers: Officer[]
  principal_address: string
  phone?: string
  email?: string
  entity_type: 'Corporation' | 'LLC' | 'Partnership' | 'Sole Proprietor' | 'Trust' | 'Other'
  source: 'Sunbiz' | 'OpenCorporates' | 'PublicRecords'
}

export interface Officer {
  name: string
  title: string
  address?: string
}

export interface PropertyRecord {
  address: string
  county: string
  parcel_id: string
  owner_name: string
  owner_type: 'individual' | 'corporation' | 'trust' | 'other'
  property_type: 'Residential' | 'Commercial' | 'Mixed-Use' | 'Industrial' | 'Unknown'
  square_feet: number
  lot_size: number
  year_built: number
  appraised_value: number
  market_value: number
  tax_amount: number
  beds: number
  baths: number
  garage: number
  pool: boolean
  commercial: boolean
  vacant: boolean
  zoning: string
  legal_description: string
  deed_date: string
  sale_price: number
  source: 'Zillow' | 'Redfin' | 'PublicRecords' | 'CountyAssessor'
  phone?: string
  email?: string
}

export interface Contact {
  name: string
  title: string
  department: string
  company: string
  email?: string
  phone?: string
  phone_mobile?: string
  linkedin_url?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  country?: string
  confidence: number // 0-100
  source: 'Hunter' | 'RocketReach' | 'Apollo' | 'Clearbit' | 'LinkedIn'
  verified: boolean
  last_verified: string
}

export interface FederalAward {
  award_id: string
  recipient: string
  amount: number
  agency: string
  award_type: 'contract' | 'grant' | 'loan' | 'other'
  award_date: string
  description: string
  naics_code?: string
  place_of_performance_state?: string
  source: 'USASpending' | 'SAM.gov' | 'GrantsGov'
}

export interface AvatarProfile {
  id?: string // Airtable record ID
  name: string
  entity_type: 'individual' | 'corporation' | 'LLC' | 'trust' | 'other'
  relationship_type: 'primary' | 'associated' | 'linked' | 'related' | 'competitor' | 'partner'
  confidence_score: number // 0-100
  investigation_score: number // 0-100
  data_sources: string[] // Sources used

  // Contact info
  phone?: string
  email?: string
  linkedin?: string
  address?: string
  city?: string
  state?: string
  zip?: string

  // Linked data
  properties: PropertyRecord[]
  contacts: Contact[]
  relationships: AvatarRelationship[]
  business_registrations: BusinessRegistration[]
  federal_contracts?: FederalAward[]

  // Risk assessment
  risk_flags: string[]
  risk_level: 'low' | 'medium' | 'high' | 'critical'

  // Metadata
  created_at?: string
  last_updated: string
  tags?: string[]
}

export interface AvatarRelationship {
  avatar_1: string
  avatar_2: string
  relationship_type: 'competitor' | 'partner' | 'owner' | 'officer' | 'family' | 'business' | 'other'
  confidence: number // 0-100
  evidence: string[]
  source: string
}

export interface ScraperConfig {
  // API Keys
  airtable_key: string
  hunter_key?: string
  rocketreach_key?: string
  apollo_key?: string
  clearbit_key?: string
  zillow_key?: string
  anthropic_key?: string

  // Settings
  base_id: string
  timeout_ms: number
  max_retries: number
  rate_limit_delay_ms: number

  // Feature flags
  save_to_airtable: boolean
  use_ai_enrichment: boolean
  calculate_risk_flags: boolean
  deduplicate_contacts: boolean
}

export interface ScraperError {
  code: string
  message: string
  source: string
  recoverable: boolean
  timestamp: string
}

export interface ScraperStats {
  total_requests: number
  successful_requests: number
  failed_requests: number
  records_scraped: number
  records_saved: number
  errors: ScraperError[]
  last_run: string
}

// Helper functions
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length >= 10 && cleaned.length <= 15
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`
  }
  return phone
}

export function sanitizeInput(input: string): string {
  return input.replace(/['"]/g, '').trim()
}

export function calculateRiskLevel(flags: string[]): 'low' | 'medium' | 'high' | 'critical' {
  if (flags.length === 0) return 'low'
  if (flags.length >= 5) return 'critical'
  if (flags.length >= 3) return 'high'
  if (flags.length >= 1) return 'medium'
  return 'low'
}

export function mergeDuplicateContacts(contacts: Contact[]): Contact[] {
  const map = new Map<string, Contact>()

  for (const contact of contacts) {
    const key = (contact.email || contact.name).toLowerCase()
    const existing = map.get(key)

    if (!existing || contact.confidence > existing.confidence) {
      map.set(key, contact)
    }
  }

  return Array.from(map.values())
}

export function calculateInvestigationScore(
  confidenceScore: number,
  propertiesCount: number,
  contactsCount: number,
  hasFederalContracts: boolean,
  dataSourceCount: number
): number {
  let score = confidenceScore
  score += propertiesCount * 5
  score += contactsCount * 3
  if (hasFederalContracts) score += 20
  score += dataSourceCount * 2
  return Math.min(score, 100)
}
