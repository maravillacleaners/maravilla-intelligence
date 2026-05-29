/**
 * Admin Setup API Route
 * POST /api/admin/setup/fields
 * GET /api/admin/setup/status
 *
 * Manages Airtable base setup and field configuration
 */

import { setupAirtableFields } from '@/lib/setup-airtable-fields'

export async function POST(request: Request) {
  try {
    const { action } = await request.json()

    if (!action) {
      return Response.json({ error: 'Missing action parameter' }, { status: 400 })
    }

    if (action === 'setup-fields') {
      const baseId = process.env.AIRTABLE_SUBS_BASE_ID || 'appZhXnyFiKbnOZLr'
      const tableId = 'tbl7NYtv13vA377a1'

      await setupAirtableFields(baseId, tableId)

      return Response.json(
        {
          success: true,
          message: 'Airtable fields setup completed',
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      )
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[API /api/admin/setup] Error:', error)
    return Response.json(
      {
        error: 'Setup failed',
        details: errorMsg,
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return Response.json(
    {
      status: 'ready',
      availableActions: ['setup-fields'],
      documentation: {
        setupFields: 'POST with {"action": "setup-fields"}',
      },
    },
    { status: 200 }
  )
}
