import { NextRequest } from 'next/server'

const AIRTABLE_API_URL = 'https://api.airtable.com/v0'

function getAirtableCredentials() {
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID
  return { apiKey, baseId }
}

function mapRecord(record: any) {
  const f = record.fields || {}

  const formedDate = f.formed_date || f.date_formed || f.registration_date || null
  let daysSinceFormed = f.days_since_formed || 0
  if (!daysSinceFormed && formedDate) {
    const d = new Date(formedDate)
    if (!isNaN(d.getTime())) {
      daysSinceFormed = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
    }
  }

  const scoreBreakdown = f.score_breakdown
    ? (typeof f.score_breakdown === 'string' ? JSON.parse(f.score_breakdown) : f.score_breakdown)
    : {
        companyAge: 20,
        segment: 25,
        serviceMatch: 30,
        contactQuality: 15,
        intentSignal: 10,
      }

  const timeline = f.timeline
    ? (typeof f.timeline === 'string' ? JSON.parse(f.timeline) : f.timeline)
    : [
        { date: f.created_at || new Date().toISOString(), event: 'Discovered', type: 'system' },
        { date: f.scored_at || new Date().toISOString(), event: 'Scored by Claude', type: 'claude' },
      ]

  const emailVariants = f.email_variants
    ? (typeof f.email_variants === 'string' ? JSON.parse(f.email_variants) : f.email_variants)
    : [
        {
          label: 'Warm',
          subject: `Cleaning solutions for ${f.legal_name || 'your business'}`,
          body: f.email_draft || `Hi,\n\nI came across ${f.legal_name || 'your company'} and wanted to reach out about professional cleaning services.\n\nWe specialize in commercial properties and would love to provide a custom quote.\n\nBest,\nMaravilla Cleaners`,
        },
        {
          label: 'Direct',
          subject: `Commercial cleaning quote for ${f.legal_name || 'your property'}`,
          body: `Hello,\n\nMaravilla Cleaners serves commercial clients across Florida. We offer professional cleaning with satisfaction guaranteed.\n\nInterested in a free estimate?\n\nBest,\nMaravilla Cleaners`,
        },
        {
          label: 'Data',
          subject: `Cleaning ROI for ${f.legal_name || 'businesses like yours'}`,
          body: `Hi,\n\nBusinesses like ${f.legal_name || 'yours'} typically save 20-30% vs in-house cleaning teams. Maravilla Cleaners has served 8,800+ clients across Florida.\n\nCan I send you a comparison?\n\nBest,\nMaravilla Cleaners`,
        },
      ]

  return {
    id: record.id,
    legalName: f.legal_name || 'Unknown Company',
    dba: f.dba || f.doing_business_as || null,
    domain: f.domain || f.website || null,
    naics: f.naics || f.naics_code || null,
    naicsDesc: f.naics_desc || f.naics_description || f.industry || null,
    segment: f.segment || 'Commercial',
    priority: f.priority || 'medium',
    county: f.county || f.location || 'Miami-Dade',
    source: f.source || 'Sunbiz',
    sunbizStatus: f.sunbiz_status || f.status || 'Active',
    entityType: f.entity_type || f.entity || 'LLC',
    daysSinceFormed,
    formedDate,
    address: {
      line: f.address || f.address_line || f.street || '',
      city: f.city || '',
      state: f.state || 'FL',
      zip: f.zip || f.postal_code || '',
    },
    contact: {
      name: f.contact_name || f.officer_name || f.registered_agent || null,
      title: f.contact_title || f.officer_title || 'Registered Agent',
      email: f.contact_email || f.email || null,
      phone: f.contact_phone || f.phone || null,
    },
    intelligence: {
      score: f.score || 0,
      ticketEstimate: f.ticket_estimate || f.estimated_ticket || f.avg_ticket || 0,
      serviceFit: f.service_fit || f.fit_score || 0,
      priorityScore: f.priority_score || f.score || 0,
      rank: f.rank || null,
      icebreaker: f.icebreaker || '',
      intentSignal: f.intent_signal || f.signal || '',
      reasoning: f.reasoning
        ? (typeof f.reasoning === 'string' ? f.reasoning.split('\n').filter(Boolean) : f.reasoning)
        : [],
    },
    pipelineStage: f.pipeline_status || f.pipeline_stage || 'Pending review',
    daysInStage: f.days_in_stage || 0,
    sqft: f.sqft || f.square_feet || null,
    emailDraft: f.email_draft || null,
    emailVariants,
    scoreBreakdown,
    timeline,
    approved: f.pipeline_status === 'approved' || f.approved === true,
    ghlContactId: f.ghl_contact_id || null,
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { apiKey, baseId } = getAirtableCredentials()

  if (!apiKey || !baseId) {
    return Response.json({ error: 'Missing Airtable credentials' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `${AIRTABLE_API_URL}/${baseId}/Intelligence/${id}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        next: { revalidate: 60 },
      }
    )

    if (!response.ok) {
      const text = await response.text()
      console.error(`Airtable error ${response.status}:`, text)
      return Response.json(
        { error: `Airtable error: ${response.status}` },
        { status: response.status }
      )
    }

    const record = await response.json()
    return Response.json(mapRecord(record))
  } catch (error) {
    console.error('[GET /api/prospects/[id]]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { apiKey, baseId } = getAirtableCredentials()

  if (!apiKey || !baseId) {
    return Response.json({ error: 'Missing Airtable credentials' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const fields: Record<string, any> = {}

    if (body.pipelineStage !== undefined) fields.pipeline_status = body.pipelineStage
    if (body.approved !== undefined) fields.approved = body.approved

    const response = await fetch(
      `${AIRTABLE_API_URL}/${baseId}/Intelligence/${id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      }
    )

    if (!response.ok) {
      const text = await response.text()
      console.error(`Airtable PATCH error ${response.status}:`, text)
      return Response.json({ error: `Airtable error: ${response.status}` }, { status: response.status })
    }

    const record = await response.json()
    return Response.json(mapRecord(record))
  } catch (error) {
    console.error('[PATCH /api/prospects/[id]]', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
