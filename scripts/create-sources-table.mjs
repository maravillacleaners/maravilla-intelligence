#!/usr/bin/env node

/**
 * Create Data Sources Table in Airtable
 * Creates the "Sources" table with proper schema
 */

import Airtable from 'airtable'

const apiKey = process.env.AIRTABLE_API_KEY
const baseId = process.env.AIRTABLE_BASE_ID

if (!apiKey || !baseId) {
  console.error('❌ Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID')
  process.exit(1)
}

const base = new Airtable({ apiKey }).base(baseId)

async function createSourcesTable() {
  console.log('📋 Creating Sources table in Airtable...')

  try {
    // Note: Airtable REST API v0 doesn't have table creation
    // We'll create via HTTP directly to the Airtable API
    const response = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Sources',
        description: 'Data sources catalog',
        fields: [
          { name: 'name', type: 'singleLineText' },
          { name: 'category', type: 'singleSelect', options: [
            { name: 'Gobierno federal' },
            { name: 'Estatal y local' },
            { name: 'GIS y geoespacial' },
            { name: 'Salud y regulacion' },
            { name: 'Financiero y corporativo' },
            { name: 'Directorios de negocios' }
          ]},
          { name: 'description', type: 'multilineText' },
          { name: 'url', type: 'url' },
          { name: 'is_free', type: 'checkbox' },
          { name: 'requires_api_key', type: 'checkbox' },
          { name: 'api_key', type: 'singleLineText' },
          { name: 'status', type: 'singleSelect', options: [
            { name: 'Active' },
            { name: 'Inactive' },
            { name: 'Testing' },
            { name: 'Error' },
            { name: 'Rate Limited' }
          ]},
          { name: 'records_imported', type: 'number' },
          { name: 'import_frequency', type: 'singleSelect', options: [
            { name: 'Manual' },
            { name: 'Hourly' },
            { name: 'Daily' },
            { name: 'Weekly' },
            { name: 'Monthly' }
          ]},
          { name: 'data_type', type: 'singleSelect', options: [
            { name: 'Contracts' },
            { name: 'Opportunities' },
            { name: 'Companies' },
            { name: 'Contacts' },
            { name: 'Locations' },
            { name: 'Financial' },
            { name: 'Mixed' }
          ]},
          { name: 'geographic_scope', type: 'singleLineText' },
          { name: 'error_message', type: 'multilineText' },
          { name: 'notes', type: 'multilineText' }
        ]
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.log('Table may already exist or API error:')
      console.log(JSON.stringify(error, null, 2))
      return
    }

    const data = await response.json()
    console.log('✅ Sources table created successfully!')
    console.log('Table ID:', data.id)
  } catch (error) {
    console.error('Error:', error.message)
    console.log('\n💡 The table might already exist. Proceeding with import...')
  }
}

createSourcesTable()
