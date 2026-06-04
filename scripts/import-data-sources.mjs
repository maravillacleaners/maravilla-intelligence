#!/usr/bin/env node

/**
 * Import Data Sources CSV into Airtable
 * Usage: node scripts/import-data-sources.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Airtable from 'airtable'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const csvPath = path.join(__dirname, '../data/fuentes_datos_eeuu.csv')

// Get credentials from env
const apiKey = process.env.AIRTABLE_API_KEY
const baseId = process.env.AIRTABLE_BASE_ID

if (!apiKey || !baseId) {
  console.error('❌ Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID')
  process.exit(1)
}

const base = new Airtable({ apiKey }).base(baseId)

// Map CSV columns
const CSV_HEADERS = {
  0: 'category',
  1: 'name',
  2: 'description',
  3: 'url',
  4: 'is_free',
  5: 'requires_api_key'
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

async function importSources() {
  console.log('📂 Reading CSV file...')

  const csv = fs.readFileSync(csvPath, 'utf-8')
  const lines = csv.split('\n').filter(line => line.trim())

  if (lines.length < 2) {
    console.error('❌ CSV file is empty or invalid')
    process.exit(1)
  }

  // Skip header (line 0)
  const records = []
  let successCount = 0
  let errorCount = 0

  console.log(`📊 Processing ${lines.length - 1} sources...`)

  for (let i = 1; i < lines.length; i++) {
    try {
      const parts = parseCSVLine(lines[i])

      // Skip empty lines
      if (parts.length < 4) continue

      const fields = {
        category: parts[0],
        name: parts[1],
        description: parts[2],
        url: parts[3],
        is_free: parts[4]?.toLowerCase() === 'si',
        requires_api_key: parts[5]?.toLowerCase() === 'si',
        status: 'Inactive',
        data_type: 'Mixed', // Default - will be refined later
        geographic_scope: 'US',
      }

      records.push({ fields })
      console.log(`✓ [${i}] ${fields.name}`)
      successCount++
    } catch (error) {
      console.error(`✗ [${i}] Error parsing line: ${error.message}`)
      errorCount++
    }
  }

  console.log(`\n📤 Uploading ${successCount} sources to Airtable...`)

  // Batch upload to Airtable (max 10 at a time)
  const batchSize = 10
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    try {
      await base('Sources').create(batch)
      console.log(`✓ Uploaded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)}`)
    } catch (error) {
      console.error(`✗ Batch error: ${error.message}`)
      errorCount++
    }
  }

  console.log(`\n✅ Import complete!`)
  console.log(`   Successfully imported: ${successCount}`)
  if (errorCount > 0) {
    console.log(`   Errors: ${errorCount}`)
  }
}

importSources().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
