/**
 * Suppliers Airtable Client
 * Handles all database operations for the supplier portal
 * CRUD operations for suppliers, opportunities, and applications
 */

import Airtable from 'airtable'

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Supplier record interface
 * Represents a registered supplier in the SUBS_STAGING base
 */
export interface Supplier {
  id: string // Airtable record ID
  legal_name: string
  contact_name: string
  business_email: string
  phone: string
  website?: string
  sub_category: string
  services_offered: string[] // multiselect
  preferred_counties: string[] // multiselect
  certification_status?: string
  sam_gov_id?: string
  cage_code?: string
  availability_start_date?: string // YYYY-MM-DD
  estimated_annual_capacity_usd?: number
  insurance_certificate_url?: string
  registration_status: 'Pending Review' | 'Approved' | 'Rejected' | 'Active' | 'Inactive'
  registration_date?: string // YYYY-MM-DD
  last_activity_date?: string // YYYY-MM-DD
  supplier_id: string // Custom field: sup-${timestamp}
  notes?: string
  password_hash?: string
}

/**
 * Supplier Opportunity record interface
 * Represents an opportunity matched to a supplier
 */
export interface SupplierOpportunity {
  id: string // Airtable record ID
  supplier_id: string
  opportunity_id: string
  opportunity_name: string
  agency: string
  contract_value_usd: number
  deadline: string // YYYY-MM-DD
  match_score: number
  match_reason: string
  status: 'Available' | 'Applied' | 'Declined' | 'Selected' | 'Won'
  date_matched: string // YYYY-MM-DD
  date_applied?: string // YYYY-MM-DD
}

/**
 * Supplier Application record interface
 * Represents a supplier's application to an opportunity
 */
export interface SupplierApplication {
  id: string // Airtable record ID
  supplier_id: string
  supplier_name: string
  opportunity_id: string
  opportunity_name: string
  application_status: 'Submitted' | 'Under Review' | 'Accepted' | 'Rejected' | 'Withdrawn'
  application_date: string // YYYY-MM-DD
  response_date?: string // YYYY-MM-DD
  notes?: string
}

// ============================================================================
// AIRTABLE CLIENT INITIALIZATION
// ============================================================================

const getAirtableBase = () => {
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_SUBS_BASE_ID

  if (!apiKey || !baseId) {
    throw new Error(
      'Missing Airtable credentials: AIRTABLE_API_KEY or AIRTABLE_SUBS_BASE_ID not set'
    )
  }

  return new Airtable({ apiKey }).base(baseId)
}

// Table names
const TABLES = {
  SUPPLIERS: 'Suppliers',
  SUPPLIER_OPPORTUNITIES: 'Supplier_Opportunities',
  SUPPLIER_APPLICATIONS: 'Supplier_Applications',
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique supplier ID
 * Format: sup-${timestamp}
 */
function generateSupplierId(): string {
  return `sup-${Date.now()}`
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Map Airtable record to Supplier interface
 */
function mapToSupplier(record: any): Supplier {
  return {
    id: record.id,
    legal_name: record.fields.legal_name || '',
    contact_name: record.fields.contact_name || '',
    business_email: record.fields.business_email || '',
    phone: record.fields.phone || '',
    website: record.fields.website,
    sub_category: record.fields.sub_category || '',
    services_offered: Array.isArray(record.fields.services_offered)
      ? record.fields.services_offered
      : [],
    preferred_counties: Array.isArray(record.fields.preferred_counties)
      ? record.fields.preferred_counties
      : [],
    certification_status: record.fields.certification_status,
    sam_gov_id: record.fields.sam_gov_id,
    cage_code: record.fields.cage_code,
    availability_start_date: record.fields.availability_start_date,
    estimated_annual_capacity_usd: record.fields.estimated_annual_capacity_usd,
    insurance_certificate_url: record.fields.insurance_certificate_url,
    registration_status: record.fields.registration_status || 'Pending Review',
    registration_date: record.fields.registration_date,
    last_activity_date: record.fields.last_activity_date,
    supplier_id: record.fields.supplier_id || '',
    notes: record.fields.notes,
    password_hash: record.fields.password_hash,
  }
}

/**
 * Map Airtable record to SupplierOpportunity interface
 */
function mapToSupplierOpportunity(record: any): SupplierOpportunity {
  return {
    id: record.id,
    supplier_id: record.fields.supplier_id || '',
    opportunity_id: record.fields.opportunity_id || '',
    opportunity_name: record.fields.opportunity_name || '',
    agency: record.fields.agency || '',
    contract_value_usd: record.fields.contract_value_usd || 0,
    deadline: record.fields.deadline || '',
    match_score: record.fields.match_score || 0,
    match_reason: record.fields.match_reason || '',
    status: record.fields.status || 'Available',
    date_matched: record.fields.date_matched || '',
    date_applied: record.fields.date_applied,
  }
}

/**
 * Map Airtable record to SupplierApplication interface
 */
function mapToSupplierApplication(record: any): SupplierApplication {
  return {
    id: record.id,
    supplier_id: record.fields.supplier_id || '',
    supplier_name: record.fields.supplier_name || '',
    opportunity_id: record.fields.opportunity_id || '',
    opportunity_name: record.fields.opportunity_name || '',
    application_status: record.fields.application_status || 'Submitted',
    application_date: record.fields.application_date || '',
    response_date: record.fields.response_date,
    notes: record.fields.notes,
  }
}

// ============================================================================
// SUPPLIERS TABLE FUNCTIONS
// ============================================================================

/**
 * Create a new supplier record
 * Auto-generates supplier_id and sets registration_date to today
 */
export async function createSupplier(
  supplier: Omit<Supplier, 'id'>
): Promise<Supplier> {
  try {
    const base = getAirtableBase()
    const supplierId = generateSupplierId()
    const today = getTodayDateString()

    const record = await base(TABLES.SUPPLIERS).create({
      legal_name: supplier.legal_name,
      contact_name: supplier.contact_name,
      business_email: supplier.business_email,
      phone: supplier.phone,
      website: supplier.website,
      sub_category: supplier.sub_category,
      services_offered: supplier.services_offered,
      preferred_counties: supplier.preferred_counties,
      certification_status: supplier.certification_status,
      sam_gov_id: supplier.sam_gov_id,
      cage_code: supplier.cage_code,
      availability_start_date: supplier.availability_start_date,
      estimated_annual_capacity_usd: supplier.estimated_annual_capacity_usd,
      insurance_certificate_url: supplier.insurance_certificate_url,
      registration_status: supplier.registration_status || 'Pending Review',
      registration_date: today,
      last_activity_date: today,
      supplier_id: supplierId,
      notes: supplier.notes,
      password_hash: supplier.password_hash,
    })

    return mapToSupplier(record)
  } catch (error) {
    console.error('Error creating supplier:', error)
    throw error
  }
}

/**
 * Get a supplier by their supplier_id (custom field, not Airtable record ID)
 * Returns null if not found
 */
export async function getSupplierById(supplierId: string): Promise<Supplier | null> {
  try {
    const base = getAirtableBase()
    const records = await base(TABLES.SUPPLIERS)
      .select({
        filterByFormula: `{supplier_id} = '${supplierId}'`,
        maxRecords: 1,
      })
      .firstPage()

    if (records.length === 0) {
      return null
    }

    return mapToSupplier(records[0])
  } catch (error) {
    console.error('Error fetching supplier by ID:', error)
    throw error
  }
}

/**
 * Get a supplier by their business email
 * Used for login queries
 * Returns null if not found
 */
export async function getSupplierByEmail(email: string): Promise<Supplier | null> {
  try {
    const base = getAirtableBase()
    const records = await base(TABLES.SUPPLIERS)
      .select({
        filterByFormula: `{business_email} = '${email}'`,
        maxRecords: 1,
      })
      .firstPage()

    if (records.length === 0) {
      return null
    }

    return mapToSupplier(records[0])
  } catch (error) {
    console.error('Error fetching supplier by email:', error)
    throw error
  }
}

/**
 * Update a supplier record
 * Auto-sets last_activity_date to today
 */
export async function updateSupplier(
  supplierId: string,
  updates: Partial<Supplier>
): Promise<void> {
  try {
    const base = getAirtableBase()
    const today = getTodayDateString()

    // First, find the Airtable record ID using supplier_id
    const supplier = await getSupplierById(supplierId)
    if (!supplier) {
      throw new Error(`Supplier not found: ${supplierId}`)
    }

    // Prepare update fields
    const updateFields: Record<string, any> = {
      last_activity_date: today,
    }

    // Only include fields that are in the updates object
    if (updates.legal_name) updateFields.legal_name = updates.legal_name
    if (updates.contact_name) updateFields.contact_name = updates.contact_name
    if (updates.business_email) updateFields.business_email = updates.business_email
    if (updates.phone) updateFields.phone = updates.phone
    if (updates.website !== undefined) updateFields.website = updates.website
    if (updates.sub_category) updateFields.sub_category = updates.sub_category
    if (updates.services_offered) updateFields.services_offered = updates.services_offered
    if (updates.preferred_counties) updateFields.preferred_counties = updates.preferred_counties
    if (updates.certification_status !== undefined)
      updateFields.certification_status = updates.certification_status
    if (updates.sam_gov_id !== undefined) updateFields.sam_gov_id = updates.sam_gov_id
    if (updates.cage_code !== undefined) updateFields.cage_code = updates.cage_code
    if (updates.availability_start_date !== undefined)
      updateFields.availability_start_date = updates.availability_start_date
    if (updates.estimated_annual_capacity_usd !== undefined)
      updateFields.estimated_annual_capacity_usd = updates.estimated_annual_capacity_usd
    if (updates.insurance_certificate_url !== undefined)
      updateFields.insurance_certificate_url = updates.insurance_certificate_url
    if (updates.registration_status) updateFields.registration_status = updates.registration_status
    if (updates.notes !== undefined) updateFields.notes = updates.notes
    if (updates.password_hash !== undefined) updateFields.password_hash = updates.password_hash

    await base(TABLES.SUPPLIERS).update(supplier.id, updateFields)
  } catch (error) {
    console.error('Error updating supplier:', error)
    throw error
  }
}

/**
 * List suppliers with optional filters
 */
export async function listSuppliers(filters?: {
  status?: string
  category?: string
}): Promise<Supplier[]> {
  try {
    const base = getAirtableBase()
    let filterFormula = ''

    if (filters?.status || filters?.category) {
      const conditions: string[] = []

      if (filters.status) {
        conditions.push(`{registration_status} = '${filters.status}'`)
      }

      if (filters.category) {
        conditions.push(`{sub_category} = '${filters.category}'`)
      }

      filterFormula = conditions.join(' AND ')
    }

    const query: any = {
      maxRecords: 100,
    }

    if (filterFormula) {
      query.filterByFormula = filterFormula
    }

    const records = await base(TABLES.SUPPLIERS).select(query).firstPage()

    return records.map(mapToSupplier)
  } catch (error) {
    console.error('Error listing suppliers:', error)
    throw error
  }
}

// ============================================================================
// SUPPLIER_OPPORTUNITIES TABLE FUNCTIONS
// ============================================================================

/**
 * Get all opportunities for a supplier, optionally filtered by status
 */
export async function getOpportunitiesForSupplier(
  supplierId: string,
  status?: string
): Promise<SupplierOpportunity[]> {
  try {
    const base = getAirtableBase()
    let filterFormula = `{supplier_id} = '${supplierId}'`

    if (status) {
      filterFormula += ` AND {status} = '${status}'`
    }

    const records = await base(TABLES.SUPPLIER_OPPORTUNITIES)
      .select({
        filterByFormula: filterFormula,
        maxRecords: 100,
      })
      .firstPage()

    return records.map(mapToSupplierOpportunity)
  } catch (error) {
    console.error('Error fetching opportunities for supplier:', error)
    throw error
  }
}

/**
 * Create a new supplier opportunity match
 */
export async function createSupplierOpportunity(
  opp: Omit<SupplierOpportunity, 'id'>
): Promise<SupplierOpportunity> {
  try {
    const base = getAirtableBase()

    const record = await base(TABLES.SUPPLIER_OPPORTUNITIES).create({
      supplier_id: opp.supplier_id,
      opportunity_id: opp.opportunity_id,
      opportunity_name: opp.opportunity_name,
      agency: opp.agency,
      contract_value_usd: opp.contract_value_usd,
      deadline: opp.deadline,
      match_score: opp.match_score,
      match_reason: opp.match_reason,
      status: opp.status || 'Available',
      date_matched: opp.date_matched,
      date_applied: opp.date_applied,
    })

    return mapToSupplierOpportunity(record)
  } catch (error) {
    console.error('Error creating supplier opportunity:', error)
    throw error
  }
}

/**
 * Update a supplier opportunity
 */
export async function updateSupplierOpportunity(
  id: string,
  updates: Partial<SupplierOpportunity>
): Promise<void> {
  try {
    const base = getAirtableBase()

    const updateFields: Record<string, any> = {}

    if (updates.status) updateFields.status = updates.status
    if (updates.match_score !== undefined) updateFields.match_score = updates.match_score
    if (updates.match_reason) updateFields.match_reason = updates.match_reason
    if (updates.date_applied !== undefined) updateFields.date_applied = updates.date_applied
    if (updates.opportunity_name) updateFields.opportunity_name = updates.opportunity_name
    if (updates.agency) updateFields.agency = updates.agency
    if (updates.contract_value_usd !== undefined)
      updateFields.contract_value_usd = updates.contract_value_usd
    if (updates.deadline) updateFields.deadline = updates.deadline

    if (Object.keys(updateFields).length === 0) {
      return // No updates to make
    }

    await base(TABLES.SUPPLIER_OPPORTUNITIES).update(id, updateFields)
  } catch (error) {
    console.error('Error updating supplier opportunity:', error)
    throw error
  }
}

// ============================================================================
// SUPPLIER_APPLICATIONS TABLE FUNCTIONS
// ============================================================================

/**
 * Create a new supplier application
 */
export async function createSupplierApplication(
  app: Omit<SupplierApplication, 'id'>
): Promise<SupplierApplication> {
  try {
    const base = getAirtableBase()

    const record = await base(TABLES.SUPPLIER_APPLICATIONS).create({
      supplier_id: app.supplier_id,
      supplier_name: app.supplier_name,
      opportunity_id: app.opportunity_id,
      opportunity_name: app.opportunity_name,
      application_status: app.application_status || 'Submitted',
      application_date: app.application_date,
      response_date: app.response_date,
      notes: app.notes,
    })

    return mapToSupplierApplication(record)
  } catch (error) {
    console.error('Error creating supplier application:', error)
    throw error
  }
}

/**
 * Get all applications for a supplier
 */
export async function getApplicationsForSupplier(
  supplierId: string
): Promise<SupplierApplication[]> {
  try {
    const base = getAirtableBase()

    const records = await base(TABLES.SUPPLIER_APPLICATIONS)
      .select({
        filterByFormula: `{supplier_id} = '${supplierId}'`,
        maxRecords: 100,
      })
      .firstPage()

    return records.map(mapToSupplierApplication)
  } catch (error) {
    console.error('Error fetching applications for supplier:', error)
    throw error
  }
}

/**
 * Get a specific application by supplier and opportunity
 * Returns null if not found
 */
export async function getApplicationByOpportunity(
  supplierId: string,
  opportunityId: string
): Promise<SupplierApplication | null> {
  try {
    const base = getAirtableBase()

    const records = await base(TABLES.SUPPLIER_APPLICATIONS)
      .select({
        filterByFormula: `AND({supplier_id} = '${supplierId}', {opportunity_id} = '${opportunityId}')`,
        maxRecords: 1,
      })
      .firstPage()

    if (records.length === 0) {
      return null
    }

    return mapToSupplierApplication(records[0])
  } catch (error) {
    console.error('Error fetching application by opportunity:', error)
    throw error
  }
}

/**
 * Update a supplier application
 */
export async function updateSupplierApplication(
  id: string,
  updates: Partial<SupplierApplication>
): Promise<void> {
  try {
    const base = getAirtableBase()

    const updateFields: Record<string, any> = {}

    if (updates.application_status) updateFields.application_status = updates.application_status
    if (updates.response_date !== undefined) updateFields.response_date = updates.response_date
    if (updates.notes !== undefined) updateFields.notes = updates.notes

    if (Object.keys(updateFields).length === 0) {
      return // No updates to make
    }

    await base(TABLES.SUPPLIER_APPLICATIONS).update(id, updateFields)
  } catch (error) {
    console.error('Error updating supplier application:', error)
    throw error
  }
}
