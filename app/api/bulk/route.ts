/**
 * POST /api/bulk
 * Batch update multiple records in Airtable
 * Body: { table: 'leads'|'contacts'|'opportunities', ids: string[], action: string, payload: any }
 */

import { NextRequest, NextResponse } from 'next/server'
import { credentials, airtableTables } from '@/app/lib/credentials'
import { authMiddleware } from '@/app/lib/auth-middleware'

const AIRTABLE_API_KEY = credentials.airtableApiKey
const AIRTABLE_BASE_ID = credentials.airtableBaseId
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`

interface BulkRequest {
  table: 'leads' | 'contacts' | 'opportunities'
  ids: string[]
  action: 'updateStage' | 'updateStatus' | 'deleteRecords' | 'updateScore'
  payload: Record<string, unknown>
}

// Map table names to Airtable table IDs
function getTableId(table: string): string {
  const tables: Record<string, string> = {
    leads: airtableTables.leads,
    contacts: airtableTables.contacts,
    opportunities: airtableTables.opportunities,
  }
  return tables[table] || ''
}

// Map action to Airtable field updates
function getFieldUpdates(action: string, payload: Record<string, unknown>): Record<string, unknown> {
  switch (action) {
    case 'updateStage':
      return { Stage: payload.stage }
    case 'updateStatus':
      return { Status: payload.status }
    case 'updateScore':
      return { Priority_Score: payload.score }
    case 'deleteRecords':
      return {} // Special handling below
    default:
      return {}
  }
}

async function batchUpdateAirtable(
  tableId: string,
  ids: string[],
  updates: Record<string, unknown>,
  action: string
): Promise<{ success: number; failed: number; error?: string }> {
  let successCount = 0
  let failedCount = 0

  // Airtable batch update: max 10 records per request
  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10)
    const url = `${AIRTABLE_API_URL}/${tableId}`

    try {
      if (action === 'deleteRecords') {
        // Delete operation
        for (const id of batch) {
          const delRes = await fetch(`${url}/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
            signal: AbortSignal.timeout(10000),
          })
          if (delRes.ok) {
            successCount++
          } else {
            failedCount++
          }
        }
      } else {
        // Update operation
        const records = batch.map((id) => ({
          id,
          fields: updates,
        }))

        const res = await fetch(url, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ records }),
          signal: AbortSignal.timeout(10000),
        })

        if (res.ok) {
          successCount += batch.length
        } else {
          const errText = await res.text()
          failedCount += batch.length
          console.error(`Bulk update failed for batch:`, errText)
        }
      }
    } catch (err) {
      failedCount += batch.length
      console.error(`Bulk operation error:`, err)
    }
  }

  return { success: successCount, failed: failedCount }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Check auth
  const authError = await authMiddleware(req)
  if (authError) {
    return authError
  }

  try {
    const body = (await req.json()) as BulkRequest

    const { table, ids, action, payload } = body

    if (!table || !ids || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: table, ids, action' },
        { status: 400 }
      )
    }

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No IDs provided' },
        { status: 400 }
      )
    }

    const tableId = getTableId(table)
    if (!tableId) {
      return NextResponse.json(
        { success: false, error: `Unknown table: ${table}` },
        { status: 400 }
      )
    }

    const updates = getFieldUpdates(action, payload)

    const result = await batchUpdateAirtable(tableId, ids, updates, action)

    return NextResponse.json({
      success: true,
      message: `${action} completed: ${result.success} succeeded, ${result.failed} failed`,
      result,
    })
  } catch (err) {
    console.error('Bulk POST error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(err) },
      { status: 500 }
    )
  }
}
