import { NextRequest } from 'next/server'

interface BulkActionRequest {
  ids: string[]
  action: 'investigate' | 'qualify' | 'monitor' | 'not_a_fit'
}

interface BulkActionResult {
  id: string
  status: 'success' | 'error'
  error?: string
}

const AIRTABLE_API_URL = 'https://api.airtable.com/v0'
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appZhXnyFiKbnOZLr'
const AIRTABLE_LEADS_TABLE = 'tblja2oeA4oNEjioT'
const BEARER_TOKEN = process.env.ADMIN_SECRET || 'maravilla-contractedge-admin-2026'

async function getLeadData(leadId: string) {
  if (!AIRTABLE_API_KEY) return null

  try {
    const res = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${AIRTABLE_LEADS_TABLE}/${leadId}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.fields
  } catch (err) {
    console.error(`Failed to get lead ${leadId}:`, err)
    return null
  }
}

export async function POST(req: NextRequest) {
  const body: BulkActionRequest = await req.json()
  const { ids, action } = body

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return Response.json({ ok: false, error: 'No IDs provided' }, { status: 400 })
  }

  if (!['investigate', 'qualify', 'monitor', 'not_a_fit'].includes(action)) {
    return Response.json({ ok: false, error: 'Invalid action' }, { status: 400 })
  }

  const results: BulkActionResult[] = []

  for (const id of ids) {
    try {
      if (action === 'investigate') {
        const leadData = await getLeadData(id)
        if (!leadData) {
          results.push({ id, status: 'error', error: 'Lead not found' })
          continue
        }

        const entityName = leadData.Entity_Name || ''
        const domain = leadData.Agency || ''

        // Call enrich/profile internally with auth header
        const enrichRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/enrich/profile?id=${encodeURIComponent(id)}&entity_name=${encodeURIComponent(entityName)}&domain=${encodeURIComponent(domain)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${BEARER_TOKEN}`,
          },
        })

        if (!enrichRes.ok) {
          results.push({ id, status: 'error', error: `Enrich failed: ${enrichRes.status}` })
          continue
        }

        // Drain the SSE stream (we're not consuming events, just letting it run)
        const reader = enrichRes.body?.getReader()
        if (reader) {
          try {
            while (true) {
              const { done } = await reader.read()
              if (done) break
            }
          } catch (e) {
            // Stream ended or error, that's ok
          }
        }

        results.push({ id, status: 'success' })
      } else {
        // Other actions: qualify, monitor, not_a_fit
        const actionRes = await fetch(`http://localhost:3000/api/leads/${id}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        })

        if (!actionRes.ok) {
          results.push({ id, status: 'error', error: `Action failed: ${actionRes.status}` })
          continue
        }

        results.push({ id, status: 'success' })
      }
    } catch (err) {
      results.push({ id, status: 'error', error: String(err) })
    }
  }

  const successCount = results.filter((r) => r.status === 'success').length

  return Response.json({
    ok: true,
    processed: successCount,
    results,
  })
}
