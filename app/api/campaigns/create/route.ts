import { Campaign } from '@/lib/email-service'

export interface CreateCampaignRequest {
  name: string
  templateId: string
  recipientRecordIds: string[]
  scheduledFor?: string
}

export async function POST(request: Request) {
  try {
    const body: CreateCampaignRequest = await request.json()

    if (!body.name || !body.templateId || !body.recipientRecordIds?.length) {
      return Response.json(
        {
          error: 'Missing required fields: name, templateId, recipientRecordIds',
        },
        { status: 400 }
      )
    }

    console.log(`[API /campaigns/create] Creating campaign: ${body.name}`)

    // Fetch recipient data from Airtable
    const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY
    const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID

    if (!apiKey || !baseId) {
      return Response.json(
        { error: 'Airtable credentials not configured' },
        { status: 500 }
      )
    }

    // Build filter for specific records
    const recordIds = body.recipientRecordIds.map(id => `'${id}'`).join(',')
    const filterFormula = `OR(${body.recipientRecordIds
      .map(id => `RECORD_ID()='${id}'`)
      .join(',')})`

    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/Intelligence?filterByFormula=${encodeURIComponent(filterFormula)}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    )

    if (!response.ok) {
      return Response.json(
        { error: 'Failed to fetch recipient data from Airtable' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const records = data.records || []

    // Build recipient list with variables
    const recipients = records.map((record: any) => ({
      recordId: record.id,
      email: record.fields.business_email || 'noemail@example.com',
      name: record.fields.legal_name || 'Prospect',
      variables: {
        company_name: record.fields.legal_name || 'Company',
        contact_name: record.fields.legal_name || 'Contact',
        industry: record.fields.segment || 'Industry',
        service_type: record.fields.sub_category || 'Services',
        opportunity_name: record.fields.legal_name || 'Opportunity',
        service_category: record.fields.segment || 'Service Category',
        avg_contract_value: '$2.5M',
        contract_value: `$${(record.fields.total_obligated_amount || 0) / 1000000}M`,
        deadline: record.fields.event_date || 'TBD',
        sub_category: record.fields.sub_category || 'Services',
        opportunity_type: 'Federal Contracts',
      },
    }))

    // Create campaign object
    const campaign: Campaign = {
      id: `camp-${Date.now()}`,
      name: body.name,
      templateId: body.templateId,
      recipients,
      status: body.scheduledFor ? 'scheduled' : 'draft',
      scheduledFor: body.scheduledFor,
      sentCount: 0,
      openCount: 0,
      clickCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    console.log(`[API /campaigns/create] Campaign created: ${campaign.id}`)
    console.log(`[API /campaigns/create] Recipients: ${recipients.length}`)

    return Response.json({
      success: true,
      campaign,
      recipientCount: recipients.length,
    })
  } catch (error) {
    console.error('[API /campaigns/create] Error:', error)
    return Response.json(
      { error: 'Failed to create campaign', details: String(error) },
      { status: 500 }
    )
  }
}
