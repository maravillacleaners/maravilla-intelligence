#!/usr/bin/env node
/**
 * Create Settings table in Airtable for dynamic credentials
 * Run: node scripts/create-settings-table.js
 */

// Load .env.local
require('dotenv').config({ path: '.env.local' })

const apiKey = process.env.AIRTABLE_API_KEY
const baseId = process.env.AIRTABLE_BASE_ID

if (!apiKey || !baseId) {
  console.error('❌ Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID')
  process.exit(1)
}

async function createSettingsTable() {
  try {
    const res = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Settings',
        fields: [
          {
            name: 'Key',
            type: 'singleLineText',
          },
          {
            name: 'Value',
            type: 'singleLineText',
          },
          {
            name: 'Type',
            type: 'singleSelect',
            options: {
              choices: [
                { name: 'API Key' },
                { name: 'Token' },
                { name: 'URL' },
                { name: 'Config' },
              ],
            },
          },
          {
            name: 'Active',
            type: 'checkbox',
          },
          {
            name: 'Description',
            type: 'multilineText',
          },
          {
            name: 'Last Updated',
            type: 'lastModifiedTime',
          },
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`❌ Failed to create table: ${res.status}`)
      console.error(err)
      process.exit(1)
    }

    const data = await res.json()
    console.log(`✅ Settings table created: ${data.id}`)
    console.log(`Add these records in Airtable:`)
    console.log(`
  Key: SAM_GOV_API_KEY
  Value: [your-key]
  Type: API Key
  Active: ✓

  Key: HUNTER_API_KEY
  Value: [your-key]
  Type: API Key
  Active: ✓

  Key: ANTHROPIC_API_KEY
  Value: [your-key]
  Type: API Key
  Active: ✓

  Key: N8N_API_KEY
  Value: [your-key]
  Type: API Key
  Active: ✓

  Key: SLACK_WEBHOOK_URL
  Value: [your-url]
  Type: URL
  Active: ✓
    `)
  } catch (e) {
    console.error('❌ Error:', e.message)
    process.exit(1)
  }
}

createSettingsTable()
