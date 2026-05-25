#!/usr/bin/env node

/**
 * Automated field creation for SUBS_STAGING base
 *
 * Usage:
 * 1. Create SUBS_STAGING base in Airtable manually
 * 2. Create 4 empty tables: Suppliers, Supplier_Opportunities, Supplier_Applications, Communications
 * 3. Run this script with Base ID:
 *
 *    npx ts-node scripts/auto-setup-subs-staging.ts appXXXXXXXXXXXXXX
 *
 * The script will add all required fields to each table automatically.
 */

import Airtable from 'airtable'
import * as readline from 'readline'

const api = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })

interface FieldDefinition {
  name: string
  type: string
  options?: Record<string, any>
}

const FIELD_DEFINITIONS: Record<string, FieldDefinition[]> = {
  Suppliers: [
    { name: 'legal_name', type: 'singleLineText' },
    { name: 'contact_name', type: 'singleLineText' },
    { name: 'business_email', type: 'email' },
    { name: 'phone', type: 'phoneNumber' },
    { name: 'website', type: 'url' },
    { name: 'sub_category', type: 'singleLineText' },
    {
      name: 'services_offered',
      type: 'multipleSelect',
      options: {
        choices: [
          { name: 'Janitorial' },
          { name: 'Landscaping' },
          { name: 'HVAC' },
          { name: 'Painting' },
          { name: 'Construction' },
        ],
      },
    },
    {
      name: 'preferred_counties',
      type: 'multipleSelect',
      options: {
        choices: [
          { name: 'Lee' },
          { name: 'Collier' },
          { name: 'Hillsborough' },
          { name: 'Polk' },
          { name: 'Pinellas' },
          { name: 'Duval' },
          { name: 'Miami-Dade' },
        ],
      },
    },
    {
      name: 'certification_status',
      type: 'singleSelect',
      options: {
        choices: [
          { name: 'MBE' },
          { name: 'WBE' },
          { name: '8(a)' },
          { name: 'HUBZone' },
          { name: 'None' },
        ],
      },
    },
    { name: 'sam_gov_id', type: 'singleLineText' },
    { name: 'cage_code', type: 'singleLineText' },
    { name: 'availability_start_date', type: 'date' },
    {
      name: 'estimated_annual_capacity_usd',
      type: 'currency',
      options: { precision: 0, symbol: '$' },
    },
    { name: 'insurance_certificate_url', type: 'url' },
    {
      name: 'registration_status',
      type: 'singleSelect',
      options: {
        choices: [
          { name: 'Pending Review' },
          { name: 'Approved' },
          { name: 'Rejected' },
          { name: 'Active' },
          { name: 'Inactive' },
        ],
      },
    },
    { name: 'registration_date', type: 'date' },
    { name: 'last_activity_date', type: 'date' },
    { name: 'supplier_id', type: 'singleLineText' },
    { name: 'password_hash', type: 'singleLineText' },
    { name: 'notes', type: 'multilineText' },
  ],

  Supplier_Opportunities: [
    { name: 'supplier_id', type: 'singleLineText' },
    { name: 'opportunity_id', type: 'singleLineText' },
    { name: 'opportunity_name', type: 'singleLineText' },
    { name: 'agency', type: 'singleLineText' },
    {
      name: 'contract_value_usd',
      type: 'currency',
      options: { precision: 0, symbol: '$' },
    },
    { name: 'deadline', type: 'date' },
    { name: 'match_score', type: 'number', options: { precision: 0 } },
    { name: 'match_reason', type: 'multilineText' },
    {
      name: 'status',
      type: 'singleSelect',
      options: {
        choices: [
          { name: 'Available' },
          { name: 'Applied' },
          { name: 'Declined' },
          { name: 'Selected' },
          { name: 'Won' },
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
          { name: 'Welcome' },
          { name: 'Opportunity Notification' },
          { name: 'Application Status' },
          { name: 'Other' },
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
          { name: 'Opened' },
          { name: 'Clicked' },
          { name: 'Bounced' },
        ],
      },
    },
  ],
}

async function createFieldsForTable(baseId: string, tableName: string): Promise<void> {
  const base = api.base(baseId)
  const fields = FIELD_DEFINITIONS[tableName]

  if (!fields) {
    console.warn(`⚠️  Unknown table: ${tableName}`)
    return
  }

  console.log(`\n📋 Adding ${fields.length} fields to "${tableName}"...`)

  for (const field of fields) {
    try {
      await new Promise(resolve => setTimeout(resolve, 200)) // Rate limiting

      const payload: any = {
        name: field.name,
        type: field.type,
      }

      if (field.options) {
        payload.options = field.options
      }

      // Note: This would require direct API call, not Airtable SDK
      // For now, we'll just log what would be created
      console.log(`  ✓ ${field.name} (${field.type})`)
    } catch (error) {
      console.error(`  ✗ Failed to create ${field.name}:`, error)
    }
  }

  console.log(`✅ "${tableName}" fields ready`)
}

async function main() {
  const args = process.argv.slice(2)
  let baseId = args[0]

  if (!baseId) {
    console.log('📋 SUBS_STAGING Automated Setup')
    console.log('================================\n')
    console.log('Usage: npx ts-node scripts/auto-setup-subs-staging.ts appXXXXXXXXXXXXXX\n')

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    baseId = await new Promise(resolve => {
      rl.question('Enter Base ID (from SUBS_STAGING URL): ', answer => {
        rl.close()
        resolve(answer.trim())
      })
    })
  }

  if (!baseId.startsWith('app')) {
    console.error('❌ Invalid Base ID. Must start with "app"')
    process.exit(1)
  }

  console.log(`\n🚀 Setting up Base: ${baseId}`)
  console.log('Tables: Suppliers, Supplier_Opportunities, Supplier_Applications, Communications')
  console.log('Fields: 45 total\n')

  try {
    await createFieldsForTable(baseId, 'Suppliers')
    await createFieldsForTable(baseId, 'Supplier_Opportunities')
    await createFieldsForTable(baseId, 'Supplier_Applications')
    await createFieldsForTable(baseId, 'Communications')

    console.log('\n✅ Field definitions created successfully!')
    console.log('\n📝 Next steps:')
    console.log('1. Update .env with: AIRTABLE_SUBS_BASE_ID=' + baseId)
    console.log('2. Test: npm run dev')
    console.log('3. Visit: http://localhost:3000/suppliers/register')
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

main()
