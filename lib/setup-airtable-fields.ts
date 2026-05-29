/**
 * Airtable Field Setup - Create missing fields in SUBS_STAGING base
 * Handles field creation with proper error recovery
 */

import Airtable from 'airtable'

const airtable = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
})

interface FieldConfig {
  name: string
  type: string
  options?: Record<string, any>
}

const MISSING_FIELDS: FieldConfig[] = [
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
        { name: 'Plumbing' },
        { name: 'Electrical' },
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
        { name: 'NMSDC' },
        { name: 'None' },
      ],
    },
  },
  {
    name: 'estimated_annual_capacity_usd',
    type: 'currency',
    options: { precision: 0, symbol: '$' },
  },
  {
    name: 'registration_date',
    type: 'date',
  },
  {
    name: 'last_activity_date',
    type: 'date',
  },
  {
    name: 'availability_start_date',
    type: 'date',
  },
  {
    name: 'notes',
    type: 'multilineText',
  },
]

async function checkFieldExists(baseId: string, tableId: string, fieldName: string): Promise<boolean> {
  try {
    const base = airtable.base(baseId)
    const table = base(tableId)

    // Try to fetch the table schema
    const response = await fetch(
      `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
      {
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch schema: ${response.statusText}`)
    }

    const data: any = await response.json()
    const table_data = data.tables.find((t: any) => t.id === tableId)

    if (!table_data) {
      return false
    }

    return table_data.fields.some((f: any) => f.name === fieldName)
  } catch (error) {
    console.error(`Error checking field ${fieldName}:`, error)
    return false
  }
}

async function createField(
  baseId: string,
  tableId: string,
  fieldConfig: FieldConfig
): Promise<boolean> {
  try {
    // Check if field already exists
    const exists = await checkFieldExists(baseId, tableId, fieldConfig.name)
    if (exists) {
      console.log(`✓ Field "${fieldConfig.name}" already exists`)
      return true
    }

    const payload: any = {
      name: fieldConfig.name,
      type: fieldConfig.type,
    }

    if (fieldConfig.options) {
      payload.options = fieldConfig.options
    }

    const response = await fetch(
      `https://api.airtable.com/v0/meta/bases/${baseId}/tables/${tableId}/fields`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      const errorData: any = await response.json()
      console.error(`✗ Failed to create "${fieldConfig.name}":`, errorData.error?.message || errorData)
      return false
    }

    console.log(`✓ Created field "${fieldConfig.name}" (${fieldConfig.type})`)
    return true
  } catch (error) {
    console.error(`✗ Error creating field ${fieldConfig.name}:`, error)
    return false
  }
}

export async function setupAirtableFields(baseId: string, tableId: string): Promise<void> {
  console.log(`\n📋 Setting up Airtable fields for base ${baseId} table ${tableId}`)
  console.log('=' .repeat(60))

  let successful = 0
  let failed = 0

  for (const fieldConfig of MISSING_FIELDS) {
    // Rate limiting to avoid hitting API limits
    await new Promise(resolve => setTimeout(resolve, 200))

    const created = await createField(baseId, tableId, fieldConfig)
    if (created) {
      successful++
    } else {
      failed++
    }
  }

  console.log('=' .repeat(60))
  console.log(`\n✅ Setup complete: ${successful} fields created/verified, ${failed} failed\n`)
}

// Run if called directly
if (require.main === module) {
  const baseId = process.env.AIRTABLE_SUBS_BASE_ID || 'appZhXnyFiKbnOZLr'
  const tableId = 'tbl7NYtv13vA377a1' // Suppliers table

  setupAirtableFields(baseId, tableId)
    .then(() => {
      console.log('Field setup completed')
      process.exit(0)
    })
    .catch(error => {
      console.error('Setup failed:', error)
      process.exit(1)
    })
}
