#!/usr/bin/env node

/**
 * Automated field creation for SUBS_STAGING base
 *
 * This script creates all required fields in the SUBS_STAGING base tables.
 *
 * Prerequisites:
 * 1. Create SUBS_STAGING base in Airtable manually
 * 2. Create 4 empty tables: Suppliers, Supplier_Opportunities, Supplier_Applications, Communications
 * 3. Get the Base ID from the URL
 *
 * Usage:
 *    npx ts-node scripts/auto-setup-subs-staging.ts appXXXXXXXXXXXXXX
 *    or
 *    npx ts-node scripts/auto-setup-subs-staging.ts (will prompt for Base ID)
 *
 * The script will add all required fields to each table automatically via the Airtable API.
 */

import Airtable from 'airtable'
import * as readline from 'readline'
import { makeAirtableRequest } from '../lib/airtable-http'

const API_KEY = process.env.AIRTABLE_API_KEY

interface FieldPayload {
  name: string
  type: string
  options?: Record<string, any>
}

const FIELD_DEFINITIONS: Record<string, FieldPayload[]> = {
  Suppliers: [
    { name: 'supplier_id', type: 'singleLineText' },
    { name: 'legal_name', type: 'singleLineText' },
    { name: 'contact_name', type: 'singleLineText' },
    { name: 'business_email', type: 'email' },
    { name: 'phone', type: 'phoneNumber' },
    { name: 'website', type: 'url' },
    {
      name: 'sub_category',
      type: 'singleSelect',
      options: {
        choices: [
          { name: 'Janitorial Services' },
          { name: 'HVAC' },
          { name: 'Plumbing' },
          { name: 'Electrical' },
          { name: 'Construction' },
          { name: 'Landscaping' },
          { name: 'Security' },
          { name: 'Other' },
        ],
      },
    },
    {
      name: 'services_offered',
      type: 'multipleSelect',
      options: {
        choices: [
          { name: 'Deep Cleaning' },
          { name: 'Routine Cleaning' },
          { name: 'Commercial Cleaning' },
          { name: 'Post-Construction' },
          { name: 'Maintenance' },
          { name: 'Specialty Services' },
        ],
      },
    },
    {
      name: 'preferred_counties',
      type: 'multipleSelect',
      options: {
        choices: [
          { name: 'Lee' },
          { name: 'Hillsborough' },
          { name: 'Pinellas' },
          { name: 'Duval' },
          { name: 'Miami-Dade' },
          { name: 'Polk' },
          { name: 'St. Lucie' },
          { name: 'Collier' },
        ],
      },
    },
    {
      name: 'certification_status',
      type: 'singleSelect',
      options: {
        choices: [
          { name: 'Not Certified' },
          { name: 'MBE' },
          { name: 'WBE' },
          { name: 'VOSB' },
          { name: 'HUBZone' },
          { name: 'GSA Schedule' },
          { name: 'State Contract' },
          { name: 'Multiple' },
        ],
      },
    },
    { name: 'sam_gov_id', type: 'singleLineText' },
    { name: 'cage_code', type: 'singleLineText' },
    { name: 'availability_start_date', type: 'date' },
    { name: 'estimated_annual_capacity_usd', type: 'number' },
    { name: 'insurance_certificate_url', type: 'url' },
    {
      name: 'registration_status',
      type: 'singleSelect',
      options: {
        choices: [
          { name: 'Pending' },
          { name: 'Active' },
          { name: 'Inactive' },
          { name: 'Suspended' },
          { name: 'Approved' },
        ],
      },
    },
    { name: 'registration_date', type: 'date' },
    { name: 'last_activity_date', type: 'date' },
    { name: 'password_hash', type: 'singleLineText' },
    { name: 'notes', type: 'multilineText' },
  ],

  Supplier_Opportunities: [
    { name: 'supplier_id', type: 'singleLineText' },
    { name: 'opportunity_id', type: 'singleLineText' },
    { name: 'opportunity_name', type: 'singleLineText' },
    { name: 'agency', type: 'singleLineText' },
    { name: 'contract_value_usd', type: 'number' },
    { name: 'deadline', type: 'date' },
    { name: 'match_score', type: 'number' },
    { name: 'match_reason', type: 'multilineText' },
    {
      name: 'status',
      type: 'singleSelect',
      options: {
        choices: [
          { name: 'New' },
          { name: 'Matched' },
          { name: 'Applied' },
          { name: 'Won' },
          { name: 'Lost' },
          { name: 'Archived' },
        ],
      },
    },
    { name: 'date_matched', type: 'date' },
    { name: 'date_applied', type: 'date' },
  ],

  Supplier_Applications: [
    { name: 'supplier_id', type: 'singleLineText' },
    { name: 'supplier_name', type: 'singleLineText' },
    { name: 'opportunity_id', type: 'singleLineText' },
    { name: 'opportunity_name', type: 'singleLineText' },
    {
      name: 'application_status',
      type: 'singleSelect',
      options: {
        choices: [
          { name: 'Draft' },
          { name: 'Submitted' },
          { name: 'Under Review' },
          { name: 'Accepted' },
          { name: 'Rejected' },
          { name: 'Withdrawn' },
        ],
      },
    },
    { name: 'application_date', type: 'date' },
    { name: 'response_date', type: 'date' },
    { name: 'notes', type: 'multilineText' },
  ],

  Communications: [
    { name: 'supplier_id', type: 'singleLineText' },
    { name: 'supplier_email', type: 'email' },
    {
      name: 'email_type',
      type: 'singleSelect',
      options: {
        choices: [
          { name: 'Opportunity Notification' },
          { name: 'Application Reminder' },
          { name: 'Feedback' },
          { name: 'Onboarding' },
          { name: 'Follow-up' },
          { name: 'System Alert' },
        ],
      },
    },
    { name: 'email_subject', type: 'singleLineText' },
    { name: 'sent_date', type: 'date' },
    {
      name: 'open_status',
      type: 'singleSelect',
      options: {
        choices: [
          { name: 'Sent' },
          { name: 'Delivered' },
          { name: 'Opened' },
          { name: 'Clicked' },
          { name: 'Bounced' },
        ],
      },
    },
  ],
}

/**
 * Get the ID for a table by name from base metadata.
 * @param baseId - The Airtable base ID
 * @param tableName - The name of the table to find
 * @returns The table ID
 * @throws Error if table not found
 */
async function getTableId(baseId: string, tableName: string): Promise<string> {
  const response = await makeAirtableRequest(`/meta/bases/${baseId}/tables`)
  const table = response.tables.find((t: any) => t.name === tableName)
  if (table) {
    return table.id
  } else {
    throw new Error(`Table ${tableName} not found`)
  }
}

/**
 * Create a field in an Airtable table.
 * @param baseId - The Airtable base ID
 * @param tableId - The table ID
 * @param field - The field definition
 * @throws Error on API failure
 */
async function createField(baseId: string, tableId: string, field: FieldPayload): Promise<void> {
  await makeAirtableRequest(`/meta/bases/${baseId}/tables/${tableId}/fields`, 'POST', field)
}

async function createFieldsForTable(baseId: string, tableName: string): Promise<void> {
  const fields = FIELD_DEFINITIONS[tableName]

  if (!fields) {
    console.warn(`⚠️  Unknown table: ${tableName}`)
    return
  }

  console.log(`\n📋 Setting up "${tableName}" table...`)

  try {
    const tableId = await getTableId(baseId, tableName)
    console.log(`  ✓ Found table (ID: ${tableId})`)

    console.log(`  Adding ${fields.length} fields...`)
    let created = 0
    let skipped = 0

    for (const field of fields) {
      try {
        // Rate limiting: Airtable API allows 5 requests/sec = 200ms minimum between requests.
        // Using 100ms to allow some parallelism while staying within limits.
        await new Promise((resolve) => setTimeout(resolve, 100))

        await createField(baseId, tableId, field)
        console.log(`    ✓ ${field.name}`)
        created++
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        if (errorMsg.includes('already exists')) {
          console.log(`    ⊘ ${field.name} (already exists)`)
          skipped++
        } else {
          console.error(`    ✗ ${field.name}: ${errorMsg}`)
        }
      }
    }

    console.log(`  ✅ ${tableName}: ${created} created, ${skipped} skipped`)
  } catch (error) {
    console.error(`  ❌ Failed to set up ${tableName}:`, error)
    throw error
  }
}

async function promptForBaseId(): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    rl.question(
      '\nEnter SUBS_STAGING Base ID (format: appXXXXXXXXXXXXXX): ',
      (answer) => {
        rl.close()
        resolve(answer.trim())
      }
    )
  })
}

async function main() {
  console.log('\n════════════════════════════════════════════════════════════════')
  console.log('SUBS_STAGING Automated Field Creation')
  console.log('════════════════════════════════════════════════════════════════')

  if (!API_KEY) {
    console.error('\n❌ AIRTABLE_API_KEY not set in environment')
    process.exit(1)
  }

  let baseId = process.argv[2]

  if (!baseId) {
    baseId = await promptForBaseId()
  }

  if (!baseId.startsWith('app')) {
    console.error('❌ Invalid Base ID. Must start with "app"')
    process.exit(1)
  }

  console.log(`\n🚀 Base ID: ${baseId}`)
  console.log('Tables: Suppliers, Supplier_Opportunities, Supplier_Applications, Communications')
  console.log('Fields: 45 total\n')

  try {
    await createFieldsForTable(baseId, 'Suppliers')
    await createFieldsForTable(baseId, 'Supplier_Opportunities')
    await createFieldsForTable(baseId, 'Supplier_Applications')
    await createFieldsForTable(baseId, 'Communications')

    console.log('\n════════════════════════════════════════════════════════════════')
    console.log('✅ Setup Complete!')
    console.log('════════════════════════════════════════════════════════════════')
    console.log('\n📝 Next steps:')
    console.log(`1. Update .env with: AIRTABLE_SUBS_BASE_ID=${baseId}`)
    console.log('2. Verify setup: npx ts-node scripts/verify-subs-staging.ts')
    console.log('3. Start development: npm run dev')
    console.log('4. Visit: http://localhost:3000/suppliers/register\n')
  } catch (error) {
    console.error('\n❌ Setup failed:', error)
    process.exit(1)
  }
}

main()
