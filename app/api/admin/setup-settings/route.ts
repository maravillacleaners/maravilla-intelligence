/**
 * POST /api/admin/setup-settings
 * Creates Settings table in Airtable and populates initial credentials
 * One-time setup endpoint
 */

import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.AIRTABLE_API_KEY
const BASE_ID = process.env.AIRTABLE_BASE_ID

if (!API_KEY || !BASE_ID) {
  throw new Error('Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID')
}

const AT = `https://api.airtable.com/v0`
const HDR = () => ({
  Authorization: `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
})

export async function POST(req: NextRequest) {
  try {
    const settingsTableId = process.env.AIRTABLE_TBL_SETTINGS

    if (!settingsTableId) {
      return NextResponse.json(
        {
          error: 'AIRTABLE_TBL_SETTINGS not set in .env.local',
          instructions: `
1. In Airtable, create a new table called "Settings" with these fields:
   - Key (Text)
   - Value (Long Text)
   - Active (Checkbox)
   - Type (Single Select: "API Key", "Token", "URL", "Config")
   - Description (Long Text, optional)

2. Copy the table ID from the URL (tbl...)

3. Add to .env.local:
   AIRTABLE_TBL_SETTINGS=tblXXXXXXXXXXXXXX

4. Restart the dev server

5. Call this endpoint again
          `.trim(),
        },
        { status: 400 }
      )
    }

    console.log(`[SETUP] Using Settings table ID: ${settingsTableId}`)

    // Step 2: Get current credentials from .env
    const credentialsToAdd = [
      {
        key: 'SAM_GOV_API_KEY',
        value: process.env.SAM_GOV_API_KEY || '',
        type: 'API Key',
      },
      {
        key: 'HUNTER_API_KEY',
        value: process.env.HUNTER_API_KEY || '',
        type: 'API Key',
      },
      {
        key: 'ANTHROPIC_API_KEY',
        value: process.env.ANTHROPIC_API_KEY || '',
        type: 'API Key',
      },
      {
        key: 'N8N_API_KEY',
        value: process.env.N8N_API_KEY || '',
        type: 'API Key',
      },
      {
        key: 'SLACK_WEBHOOK_URL',
        value: process.env.SLACK_WEBHOOK_URL || '',
        type: 'URL',
      },
    ]

    // Step 3: Add records
    console.log('[SETUP] Adding credential records...')
    const records = credentialsToAdd
      .filter((c) => c.value) // Only add if value exists
      .map((c) => ({
        fields: {
          Key: c.key,
          Value: c.value,
          Type: c.type,
          Active: true,
          Description: `Imported from .env.local on ${new Date().toISOString()}`,
        },
      }))

    let createdCount = 0
    if (records.length > 0) {
      const createRes = await fetch(`${AT}/${BASE_ID}/${settingsTableId}`, {
        method: 'POST',
        headers: HDR(),
        body: JSON.stringify({ records }),
      })

      if (!createRes.ok) {
        const err = await createRes.text()
        console.warn(`[SETUP] Warning: Failed to add records: ${createRes.status}`, err)
      } else {
        const data = await createRes.json()
        createdCount = data.records?.length || 0
        console.log(`[SETUP] Added ${createdCount} credential records`)
      }
    }

    return NextResponse.json({
      success: true,
      settingsTableId,
      credentialsAdded: createdCount,
      nextSteps: 'Restart dev server. Credentials now load from Airtable Settings table.',
    })
  } catch (e: any) {
    console.error('[SETUP] Error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
