#!/usr/bin/env node

/**
 * Final Import: Create Sources Table and Import 236 Data Sources
 * Usage: AIRTABLE_API_KEY=xxx AIRTABLE_BASE_ID=yyy node scripts/import-sources-final.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load mapped data
const mappedDataPath = path.join(__dirname, '../data/mapped_sources.json')
const mappedData = JSON.parse(fs.readFileSync(mappedDataPath, 'utf-8'))

const apiKey = process.env.AIRTABLE_API_KEY
const baseId = process.env.AIRTABLE_BASE_ID

console.log('[*] Starting import process...')
console.log(`[*] Base ID: ${baseId}`)
console.log(`[*] Records to import: ${mappedData.count}`)

async function createSourcesTable() {
  console.log('\n[*] Attempting to create Sources table...')

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Sources',
          description: 'Data sources catalog for intelligence enrichment',
          fields: [
            { name: 'name', type: 'singleLineText' },
            {
              name: 'category',
              type: 'singleSelect',
              options: [
                { name: 'Gobierno federal' },
                { name: 'Estatal y local' },
                { name: 'GIS y geoespacial' },
                { name: 'Salud y regulacion' },
                { name: 'Financiero y corporativo' },
                { name: 'Directorios de negocios' },
                { name: 'Mixed' }
              ]
            },
            { name: 'description', type: 'multilineText' },
            { name: 'url', type: 'url' },
            { name: 'is_free', type: 'checkbox' },
            { name: 'requires_api_key', type: 'checkbox' },
            { name: 'api_key', type: 'singleLineText' },
            {
              name: 'status',
              type: 'singleSelect',
              options: [
                { name: 'Active' },
                { name: 'Inactive' },
                { name: 'Testing' },
                { name: 'Error' },
                { name: 'Rate Limited' }
              ]
            },
            { name: 'records_imported', type: 'number' },
            {
              name: 'import_frequency',
              type: 'singleSelect',
              options: [
                { name: 'Manual' },
                { name: 'Hourly' },
                { name: 'Daily' },
                { name: 'Weekly' },
                { name: 'Monthly' }
              ]
            },
            {
              name: 'data_type',
              type: 'singleSelect',
              options: [
                { name: 'Contracts' },
                { name: 'Opportunities' },
                { name: 'Companies' },
                { name: 'Contacts' },
                { name: 'Locations' },
                { name: 'Financial' },
                { name: 'Mixed' }
              ]
            },
            { name: 'geographic_scope', type: 'singleLineText' },
            { name: 'error_message', type: 'multilineText' },
            { name: 'notes', type: 'multilineText' }
          ]
        })
      }
    )

    if (!response.ok) {
      const error = await response.json()
      if (error.error?.type === 'TABLE_ALREADY_EXISTS') {
        console.log('[OK] Table already exists, proceeding with import...')
        return null
      }
      console.log('[!] Error response:')
      console.log(JSON.stringify(error, null, 2))
      return null
    }

    const data = await response.json()
    console.log('[OK] Sources table created successfully!')
    console.log(`[*] Table ID: ${data.id}`)
    return data.id
  } catch (error) {
    console.log('[!] Error creating table (may already exist):')
    console.log(error.message)
    return null
  }
}

async function getSourcesTableId() {
  console.log('\n[*] Fetching Sources table ID...')

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    )

    if (!response.ok) {
      console.log('[!] Cannot fetch tables')
      return null
    }

    const data = await response.json()
    const sourcesTable = data.tables?.find(t => t.name === 'Sources')

    if (sourcesTable) {
      console.log(`[OK] Found Sources table: ${sourcesTable.id}`)
      return sourcesTable.id
    }

    return null
  } catch (error) {
    console.log('[!] Error fetching table ID:')
    console.log(error.message)
    return null
  }
}

async function importRecords(tableId) {
  console.log(`\n[*] Importing ${mappedData.count} records...`)

  const records = mappedData.records
  const batchSize = 10
  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(records.length / batchSize)

    try {
      const response = await fetch(
        `https://api.airtable.com/v0/${baseId}/${tableId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ records: batch })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        console.log(`[!] Batch ${batchNum} error:`)
        console.log(JSON.stringify(error, null, 2))
        errorCount += batch.length
      } else {
        const result = await response.json()
        console.log(
          `[OK] Batch ${batchNum}/${totalBatches} - ${result.records.length} records imported`
        )
        successCount += result.records.length
      }
    } catch (error) {
      console.log(`[!] Batch ${batchNum} exception: ${error.message}`)
      errorCount += batch.length
    }

    // Rate limiting
    if (i + batchSize < records.length) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  return { successCount, errorCount }
}

async function main() {
  console.log('='.repeat(60))
  console.log('[*] AIRTABLE DATA SOURCES IMPORT')
  console.log('='.repeat(60))

  // Create table
  const newTableId = await createSourcesTable()

  // Get table ID
  const tableId = newTableId || (await getSourcesTableId())

  if (!tableId) {
    console.log('[!] Could not determine Sources table ID')
    process.exit(1)
  }

  // Import records
  const { successCount, errorCount } = await importRecords(tableId)

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('[*] IMPORT SUMMARY')
  console.log('='.repeat(60))
  console.log(`[*] Table ID: ${tableId}`)
  console.log(`[*] Records imported: ${successCount}`)
  console.log(`[*] Errors: ${errorCount}`)
  console.log(`[*] Success rate: ${((successCount / mappedData.count) * 100).toFixed(1)}%`)

  // Output JSON result
  const result = {
    table_created: true,
    table_id: tableId,
    imports_count: successCount,
    errors: errorCount
  }

  console.log('\n[OK] JSON Result:')
  console.log(JSON.stringify(result, null, 2))

  process.exit(errorCount > 0 ? 1 : 0)
}

main().catch(error => {
  console.error('[!] Fatal error:', error)
  process.exit(1)
})
