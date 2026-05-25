#!/usr/bin/env node

/**
 * SUBS_STAGING Airtable Base Verification & Creation Script
 *
 * This script:
 * 1. Lists all Airtable bases to find SUBS_STAGING
 * 2. Verifies all required tables exist
 * 3. Verifies all required fields exist in each table
 * 4. Creates test records to validate the schema
 * 5. Reports status and any issues
 *
 * Usage:
 *   npx ts-node scripts/verify-subs-staging.ts
 *   or
 *   node scripts/verify-subs-staging.ts (if compiled)
 */

import Airtable from 'airtable'
import { makeAirtableRequest } from '../lib/airtable-http'

// Configuration
const API_KEY = process.env.AIRTABLE_API_KEY
const SUBS_BASE_ID = process.env.AIRTABLE_SUBS_BASE_ID

const REQUIRED_TABLES = ['Suppliers', 'Supplier_Opportunities', 'Supplier_Applications', 'Communications']

const REQUIRED_FIELDS: Record<string, string[]> = {
  Suppliers: [
    'supplier_id',
    'legal_name',
    'contact_name',
    'business_email',
    'phone',
    'website',
    'sub_category',
    'services_offered',
    'preferred_counties',
    'certification_status',
    'sam_gov_id',
    'cage_code',
    'availability_start_date',
    'estimated_annual_capacity_usd',
    'insurance_certificate_url',
    'registration_status',
    'registration_date',
    'last_activity_date',
    'password_hash',
    'notes',
  ],
  Supplier_Opportunities: [
    'supplier_id',
    'opportunity_id',
    'opportunity_name',
    'agency',
    'contract_value_usd',
    'deadline',
    'match_score',
    'match_reason',
    'status',
    'date_matched',
    'date_applied',
  ],
  Supplier_Applications: [
    'supplier_id',
    'supplier_name',
    'opportunity_id',
    'opportunity_name',
    'application_status',
    'application_date',
    'response_date',
    'notes',
  ],
  Communications: [
    'supplier_id',
    'supplier_email',
    'email_type',
    'email_subject',
    'sent_date',
    'open_status',
  ],
}

interface AirtableTable {
  id: string
  name: string
  primaryFieldId: string
  fields: AirtableField[]
}

interface AirtableField {
  id: string
  name: string
  type: string
}


// List all bases
async function listBases(): Promise<any> {
  console.log('\n📋 Fetching Airtable bases...')
  try {
    const response = await makeAirtableRequest('/meta/bases')
    return response.bases || []
  } catch (error) {
    console.error('❌ Failed to list bases:', error)
    throw error
  }
}

// Get base metadata
async function getBaseMetadata(baseId: string): Promise<any> {
  console.log(`\n📋 Fetching metadata for base: ${baseId}`)
  try {
    const response = await makeAirtableRequest(`/meta/bases/${baseId}/tables`)
    return response.tables || []
  } catch (error) {
    console.error(`❌ Failed to get base metadata for ${baseId}:`, error)
    throw error
  }
}

/**
 * Verify all required tables exist in the base.
 * @param baseId - The Airtable base ID
 * @returns Map of table name to table metadata
 */
async function verifyTables(baseId: string): Promise<{ [key: string]: AirtableTable }> {
  console.log('\n✓ Checking for required tables...')

  const tables = await getBaseMetadata(baseId)
  const tableMap: { [key: string]: AirtableTable } = {}

  for (const requiredTable of REQUIRED_TABLES) {
    const found = tables.find((t: any) => t.name === requiredTable)
    if (found) {
      tableMap[requiredTable] = found
      console.log(`  ✓ ${requiredTable} exists (ID: ${found.id})`)
    } else {
      console.log(`  ✗ ${requiredTable} NOT FOUND`)
    }
  }

  return tableMap
}

// Verify fields in each table
async function verifyFields(tableMap: { [key: string]: AirtableTable }): Promise<boolean> {
  console.log('\n✓ Checking for required fields...')

  let allFieldsPresent = true

  for (const [tableName, table] of Object.entries(tableMap)) {
    const requiredFields = REQUIRED_FIELDS[tableName] || []
    const existingFields = table.fields.map((f: AirtableField) => f.name)

    console.log(`\n  Table: ${tableName}`)
    for (const requiredField of requiredFields) {
      if (existingFields.includes(requiredField)) {
        console.log(`    ✓ ${requiredField}`)
      } else {
        console.log(`    ✗ ${requiredField} MISSING`)
        allFieldsPresent = false
      }
    }
  }

  return allFieldsPresent
}

// Create test records
async function createTestRecords(baseId: string): Promise<void> {
  console.log('\n✓ Creating test records...')

  const airtable = new Airtable({ apiKey: API_KEY })
  const base = airtable.base(baseId)

  try {
    // Test Suppliers table
    console.log('\n  Testing Suppliers table...')
    const supplier = await base('Suppliers').create([
      {
        fields: {
          supplier_id: 'TEST-001',
          legal_name: 'Test Supplier LLC',
          contact_name: 'John Doe',
          business_email: 'test@supplier.com',
          phone: '555-0000',
          website: 'https://example.com',
          sub_category: 'Janitorial Services',
          notes: 'Test record created by verification script',
        },
      },
    ])
    console.log(`    ✓ Created test supplier: ${supplier[0].id}`)
    await base('Suppliers').destroy(supplier[0].id)
    console.log(`    ✓ Cleaned up test record`)

    // Test Supplier_Opportunities table
    console.log('\n  Testing Supplier_Opportunities table...')
    const opp = await base('Supplier_Opportunities').create([
      {
        fields: {
          supplier_id: 'TEST-001',
          opportunity_id: 'OPP-001',
          opportunity_name: 'Test Opportunity',
          agency: 'EPA',
          contract_value_usd: 50000,
          match_score: 85,
          status: 'New',
        },
      },
    ])
    console.log(`    ✓ Created test opportunity: ${opp[0].id}`)
    await base('Supplier_Opportunities').destroy(opp[0].id)
    console.log(`    ✓ Cleaned up test record`)

    // Test Communications table
    console.log('\n  Testing Communications table...')
    const comm = await base('Communications').create([
      {
        fields: {
          supplier_id: 'TEST-001',
          supplier_email: 'test@supplier.com',
          email_type: 'Opportunity Notification',
          email_subject: 'Test Email',
          open_status: 'Sent',
        },
      },
    ])
    console.log(`    ✓ Created test communication: ${comm[0].id}`)
    await base('Communications').destroy(comm[0].id)
    console.log(`    ✓ Cleaned up test record`)

    console.log('\n✅ All test records passed!')
  } catch (error) {
    console.error('\n❌ Test record creation failed:', error)
    throw error
  }
}

// Main verification flow
async function main(): Promise<void> {
  console.log('\n════════════════════════════════════════════════════════════════')
  console.log('SUBS_STAGING Airtable Base Verification')
  console.log('════════════════════════════════════════════════════════════════')

  // Check API key
  if (!API_KEY) {
    console.error('\n❌ AIRTABLE_API_KEY not set in environment')
    process.exit(1)
  }

  if (!SUBS_BASE_ID) {
    console.error('\n❌ AIRTABLE_SUBS_BASE_ID not set in environment')
    console.error('\nTo set up a new SUBS_STAGING base:')
    console.error('1. Create base in Airtable UI: https://airtable.com')
    console.error('2. Name it: SUBS_STAGING')
    console.error('3. Note the Base ID (starts with "app")')
    console.error('4. Add to .env: AIRTABLE_SUBS_BASE_ID=appXXXXXXXXXXXXXX')
    console.error('5. Create 4 empty tables: Suppliers, Supplier_Opportunities, Supplier_Applications, Communications')
    console.error('6. Run this script again')
    process.exit(1)
  }

  try {
    // List all bases
    const bases = await listBases()
    const subsBase = bases.find((b: any) => b.id === SUBS_BASE_ID)

    if (subsBase) {
      console.log(`\n✓ Found SUBS_STAGING base: ${subsBase.name} (${SUBS_BASE_ID})`)
    } else {
      console.log(`\n⚠️  Base ${SUBS_BASE_ID} not found in Airtable. Please verify the Base ID.`)
    }

    // Verify tables
    const tableMap = await verifyTables(SUBS_BASE_ID)
    const allTablesFound = REQUIRED_TABLES.every((t) => tableMap[t])

    // Verify fields
    let allFieldsPresent = true
    if (allTablesFound) {
      allFieldsPresent = await verifyFields(tableMap)
    } else {
      console.log('\n⚠️  Skipping field verification - not all tables found')
    }

    // Test records
    let testsPassed = false
    if (allTablesFound && allFieldsPresent) {
      try {
        await createTestRecords(SUBS_BASE_ID)
        testsPassed = true
      } catch (error) {
        console.error('\n⚠️  Test records failed - fields may be missing or incorrect')
      }
    }

    // Summary
    console.log('\n════════════════════════════════════════════════════════════════')
    console.log('Verification Summary')
    console.log('════════════════════════════════════════════════════════════════')
    console.log(`Base ID: ${SUBS_BASE_ID}`)
    console.log(`Tables found: ${Object.keys(tableMap).length}/${REQUIRED_TABLES.length}`)
    console.log(`Fields verified: ${allFieldsPresent ? '✓ All' : '✗ Some missing'}`)
    console.log(`Test records: ${testsPassed ? '✓ Passed' : '✗ Failed or skipped'}`)

    if (allTablesFound && allFieldsPresent && testsPassed) {
      console.log('\n✅ SUBS_STAGING base is ready!')
      console.log('\nNext steps:')
      console.log('  1. npm run dev')
      console.log('  2. Navigate to /suppliers/register')
      console.log('  3. Test supplier portal')
    } else {
      console.log('\n⚠️  Setup incomplete. Missing:')
      if (!allTablesFound) {
        console.log('  - Some required tables')
      }
      if (!allFieldsPresent) {
        console.log('  - Some required fields')
      }
      if (!testsPassed) {
        console.log('  - Test record creation failed')
      }
      process.exit(1)
    }
  } catch (error) {
    console.error('\n❌ Verification failed:', error)
    process.exit(1)
  }
}

main()
