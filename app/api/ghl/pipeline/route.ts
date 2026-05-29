/**
 * GHL Pipeline API — ContractEdge Intelligence
 *
 * GET  /api/ghl/pipeline           — Returns pipeline stages from GoHighLevel
 * POST /api/ghl/pipeline           — Moves a contact to a different pipeline stage
 *   Body: { contact_id: string, pipeline_id: string, stage_id: string }
 *
 * GHL Pipeline terminology:
 *   - Pipeline: a named sales pipeline (e.g. "Prime Contractor Outreach")
 *   - Stage: a stage within that pipeline (e.g. "Contacted", "Qualified", "Closed")
 *   - Opportunity: the record linking a contact to a pipeline stage
 */

import { NextResponse } from 'next/server'

const GHL_API_URL = 'https://rest.gohighlevel.com/v1'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns a static mock pipeline structure when GHL credentials are absent.
 * Mirrors a typical contractor-outreach pipeline used in Maravilla Intelligence.
 */
function mockPipelines() {
  return [
    {
      id: 'pipeline_mock_01',
      name: 'Prime Contractor Outreach',
      stages: [
        { id: 'stage_01', name: 'Discovered', order: 1 },
        { id: 'stage_02', name: 'Researching', order: 2 },
        { id: 'stage_03', name: 'Email Sent', order: 3 },
        { id: 'stage_04', name: 'Contacted', order: 4 },
        { id: 'stage_05', name: 'Meeting Scheduled', order: 5 },
        { id: 'stage_06', name: 'Proposal Sent', order: 6 },
        { id: 'stage_07', name: 'Won', order: 7 },
        { id: 'stage_08', name: 'Lost', order: 8 },
      ],
    },
  ]
}

// ── GET handler — fetch pipeline stages ──────────────────────────────────────

export async function GET(req: Request) {
  const ghlApiKey = process.env.GHL_API_KEY
  const ghlLocationId = process.env.GHL_LOCATION_ID || ''

  if (!ghlApiKey) {
    // Return mock data so the UI/n8n can still work during development
    return NextResponse.json({
      pipelines: mockPipelines(),
      source: 'mock',
      note: 'Set GHL_API_KEY and GHL_LOCATION_ID to fetch live pipeline data.',
    })
  }

  try {
    const res = await fetch(
      `${GHL_API_URL}/pipelines/?locationId=${ghlLocationId}`,
      {
        headers: {
          Authorization: `Bearer ${ghlApiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      }
    )

    if (!res.ok) {
      const text = await res.text()
      console.error(`[GHL Pipeline] Fetch error ${res.status}: ${text}`)
      return NextResponse.json(
        { error: `GHL API error ${res.status}`, details: text },
        { status: 502 }
      )
    }

    const data = await res.json()

    // Normalize GHL v1 pipeline response
    const pipelines = (data.pipelines || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      stages: (p.stages || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        order: s.order ?? 0,
      })),
    }))

    return NextResponse.json({ pipelines, source: 'ghl' })
  } catch (err) {
    console.error('[API /ghl/pipeline GET] Error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch GHL pipelines', details: String(err) },
      { status: 500 }
    )
  }
}

// ── POST handler — move contact to a pipeline stage ───────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      contact_id,
      pipeline_id,
      stage_id,
      opportunity_name,
    } = body as {
      contact_id?: string
      pipeline_id?: string
      stage_id?: string
      opportunity_name?: string
    }

    if (!contact_id || !pipeline_id || !stage_id) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['contact_id', 'pipeline_id', 'stage_id'],
        },
        { status: 400 }
      )
    }

    const ghlApiKey = process.env.GHL_API_KEY
    const ghlLocationId = process.env.GHL_LOCATION_ID || ''

    if (!ghlApiKey) {
      // Mock response for dev/staging
      console.log(
        `[GHL Pipeline] Mock: move contact ${contact_id} → pipeline ${pipeline_id} stage ${stage_id}`
      )
      return NextResponse.json({
        success: true,
        contact_id,
        pipeline_id,
        stage_id,
        opportunity_id: `mock_opp_${Date.now()}`,
        source: 'mock',
        note: 'Set GHL_API_KEY to perform real pipeline moves.',
      })
    }

    // GHL v1: create or update an opportunity to place the contact in the stage
    // First, check for existing opportunity for this contact in this pipeline
    const searchRes = await fetch(
      `${GHL_API_URL}/opportunities/?locationId=${ghlLocationId}&contact_id=${contact_id}`,
      {
        headers: {
          Authorization: `Bearer ${ghlApiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      }
    )

    let opportunityId: string | null = null

    if (searchRes.ok) {
      const searchData = await searchRes.json()
      const existing = (searchData.opportunities || []).find(
        (o: any) => o.pipelineId === pipeline_id
      )
      if (existing) {
        opportunityId = existing.id
      }
    }

    const opportunityPayload = {
      pipelineId: pipeline_id,
      pipelineStageId: stage_id,
      contactId: contact_id,
      locationId: ghlLocationId,
      name: opportunity_name || `Intel Sync — ${new Date().toLocaleDateString()}`,
      status: 'open',
    }

    let resultId: string
    let action: 'created' | 'updated'

    if (opportunityId) {
      // Update existing opportunity to new stage
      const updateRes = await fetch(
        `${GHL_API_URL}/opportunities/${opportunityId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${ghlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pipelineStageId: stage_id }),
          signal: AbortSignal.timeout(12000),
        }
      )
      if (!updateRes.ok) {
        const text = await updateRes.text()
        return NextResponse.json(
          { error: `GHL opportunity update failed ${updateRes.status}`, details: text },
          { status: 502 }
        )
      }
      resultId = opportunityId
      action = 'updated'
    } else {
      // Create new opportunity in the target stage
      const createRes = await fetch(`${GHL_API_URL}/opportunities/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ghlApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(opportunityPayload),
        signal: AbortSignal.timeout(12000),
      })
      if (!createRes.ok) {
        const text = await createRes.text()
        return NextResponse.json(
          { error: `GHL opportunity create failed ${createRes.status}`, details: text },
          { status: 502 }
        )
      }
      const createData = await createRes.json()
      resultId = createData.id || createData.opportunity?.id || 'unknown'
      action = 'created'
    }

    console.log(
      `[API /ghl/pipeline] contact=${contact_id} pipeline=${pipeline_id} stage=${stage_id} opp=${resultId} action=${action}`
    )

    return NextResponse.json({
      success: true,
      contact_id,
      pipeline_id,
      stage_id,
      opportunity_id: resultId,
      action,
      moved_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[API /ghl/pipeline POST] Error:', err)
    return NextResponse.json(
      { error: 'Pipeline move failed', details: String(err) },
      { status: 500 }
    )
  }
}
