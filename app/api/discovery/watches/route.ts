import { readAuth } from '@/lib/auth'
import { NextRequest } from 'next/server'

const AIRTABLE_API_URL = 'https://api.airtable.com/v0'
const AIRTABLE_API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY
const AIRTABLE_BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID

interface Watch {
  id?: string
  name: string
  active: boolean
  owner: string
  naics: string[]
  counties: string[]
  zips: string[]
  entityType: string[]
  ageMin: number
  ageMax: number
  enrichWith: string[]
  scoreTemplate: string
  sequence: string
  notifyChannel: string
  autoApproveThreshold: number
  queueThreshold: number
  lastRun?: string
  sourceFreq?: string
  stats?: {
    matched7d: number
    scored7d: number
    autoApproved: number
    queued: number
    dropped: number
    won: number
  }
}

async function getWatches() {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return getMockWatches()
  }

  try {
    const response = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Watches?pageSize=100`,
      {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      }
    )

    if (!response.ok) {
      console.warn('Discovery: Airtable fetch failed')
      return getMockWatches()
    }

    const data = await response.json()
    const records = data.records || []

    return records.map((r: any) => ({
      id: r.id,
      name: r.fields.name,
      active: r.fields.active !== false,
      owner: r.fields.owner || 'unassigned',
      naics: r.fields.naics || [],
      counties: r.fields.counties || [],
      zips: r.fields.zips || [],
      entityType: r.fields.entity_type || [],
      ageMin: r.fields.age_min || 0,
      ageMax: r.fields.age_max || 365,
      enrichWith: r.fields.enrich_with || [],
      scoreTemplate: r.fields.score_template || 'default',
      sequence: r.fields.sequence || 'default',
      notifyChannel: r.fields.notify_channel || '#hot-leads',
      autoApproveThreshold: r.fields.auto_approve_threshold || 75,
      queueThreshold: r.fields.queue_threshold || 55,
      lastRun: r.fields.last_run || new Date().toISOString(),
      sourceFreq: r.fields.source_freq || 'manual',
      stats: r.fields.stats || { matched7d: 0, scored7d: 0, autoApproved: 0, queued: 0, dropped: 0, won: 0 },
    }))
  } catch (error) {
    console.warn('Discovery watches fetch error:', error)
    return getMockWatches()
  }
}

async function createWatch(watch: Watch) {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return { id: Math.random().toString(36).substr(2, 9), ...watch }
  }

  try {
    const response = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Watches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            name: watch.name,
            active: watch.active,
            owner: watch.owner,
            naics: watch.naics,
            counties: watch.counties,
            zips: watch.zips,
            entity_type: watch.entityType,
            age_min: watch.ageMin,
            age_max: watch.ageMax,
            enrich_with: watch.enrichWith,
            score_template: watch.scoreTemplate,
            sequence: watch.sequence,
            notify_channel: watch.notifyChannel,
            auto_approve_threshold: watch.autoApproveThreshold,
            queue_threshold: watch.queueThreshold,
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error('Airtable create failed')
    }

    const data = await response.json()
    return {
      id: data.id,
      ...data.fields,
    }
  } catch (error) {
    console.error('Discovery create watch error:', error)
    throw error
  }
}

function getMockWatches() {
  return [
    {
      id: 'w1',
      name: 'FL Property Managers · 0–30d',
      active: true,
      owner: 'sarah.k',
      naics: ['531311', '531312'],
      counties: ['Miami-Dade', 'Broward'],
      zips: ['33131', '33132'],
      entityType: ['LLC', 'Inc'],
      ageMin: 0,
      ageMax: 30,
      enrichWith: ['Clearbit', 'Apollo'],
      scoreTemplate: 'property-manager-scoring',
      sequence: 'warm-intro-property-mgr',
      notifyChannel: 'Slack #hot-leads',
      autoApproveThreshold: 80,
      queueThreshold: 60,
      lastRun: new Date(Date.now() - 24 * 3600000).toISOString(),
      sourceFreq: 'Sunbiz daily 6am ET',
      stats: { matched7d: 84, scored7d: 81, autoApproved: 32, queued: 38, dropped: 11, won: 9 },
    },
    {
      id: 'w2',
      name: 'Healthcare · Miami-Dade',
      active: true,
      owner: 'marcus.r',
      naics: ['621210', '621498'],
      counties: ['Miami-Dade'],
      zips: [],
      entityType: ['LLC', 'PA', 'PLLC'],
      ageMin: 0,
      ageMax: 60,
      enrichWith: ['Apollo'],
      scoreTemplate: 'healthcare-scoring',
      sequence: 'healthcare-intro',
      notifyChannel: 'Slack #hot-leads',
      autoApproveThreshold: 75,
      queueThreshold: 55,
      lastRun: new Date(Date.now() - 24 * 3600000).toISOString(),
      sourceFreq: 'Sunbiz daily 6am ET',
      stats: { matched7d: 42, scored7d: 40, autoApproved: 15, queued: 20, dropped: 5, won: 4 },
    },
  ]
}

export async function GET(request: NextRequest) {
  try {
    const watches = await getWatches()
    return Response.json({
      success: true,
      data: watches,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[API /discovery/watches] GET error:', error)
    return Response.json(
      { error: 'Failed to fetch watches', details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await readAuth(request)
    if (!auth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const watch: Watch = body

    const created = await createWatch(watch)

    return Response.json({
      success: true,
      data: created,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[API /discovery/watches] POST error:', error)
    return Response.json(
      { error: 'Failed to create watch', details: String(error) },
      { status: 500 }
    )
  }
}

async function updateWatch(id: string, watch: Partial<Watch>) {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return { id, ...watch }
  }

  try {
    const response = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Watches/${id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: Object.fromEntries(
            Object.entries(watch).map(([key, value]) => {
              // Convert camelCase to snake_case
              const snakeKey = key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)
              return [snakeKey, value]
            })
          ),
        }),
      }
    )

    if (!response.ok) {
      throw new Error('Airtable update failed')
    }

    const data = await response.json()
    return {
      id: data.id,
      ...data.fields,
    }
  } catch (error) {
    console.error('Discovery update watch error:', error)
    throw error
  }
}

async function deleteWatch(id: string) {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return { success: true, id }
  }

  try {
    const response = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Watches/${id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      }
    )

    if (!response.ok) {
      throw new Error('Airtable delete failed')
    }

    return { success: true, id }
  } catch (error) {
    console.error('Discovery delete watch error:', error)
    throw error
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await readAuth(request)
    if (!auth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return Response.json({ error: 'Watch ID required' }, { status: 400 })
    }

    const updated = await updateWatch(id, updates)

    return Response.json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[API /discovery/watches] PATCH error:', error)
    return Response.json(
      { error: 'Failed to update watch', details: String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await readAuth(request)
    if (!auth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return Response.json({ error: 'Watch ID required' }, { status: 400 })
    }

    const result = await deleteWatch(id)

    return Response.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[API /discovery/watches] DELETE error:', error)
    return Response.json(
      { error: 'Failed to delete watch', details: String(error) },
      { status: 500 }
    )
  }
}
