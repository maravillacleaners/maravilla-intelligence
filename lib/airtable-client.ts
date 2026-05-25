export interface Prospect {
  id: string
  legal_name: string
  score: number
  priority: 'high' | 'medium' | 'low'
  icebreaker: string
  pipeline_status?: string
  ghl_contact_id?: string
}

const AIRTABLE_API_URL = 'https://api.airtable.com/v0'

export async function getProspects(): Promise<Prospect[]> {
  const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY || process.env.AIRTABLE_API_KEY
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID
  const tableId = 'CLIENTS'

  if (!apiKey || !baseId) {
    console.error('Missing Airtable credentials')
    return []
  }

  try {
    const response = await fetch(
      `${AIRTABLE_API_URL}/${baseId}/${tableId}?view=Prospects`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    )

    if (!response.ok) {
      console.error(`Airtable error: ${response.status}`, await response.text())
      return []
    }

    const data = await response.json()

    return (data.records || []).map((record: any) => ({
      id: record.id,
      legal_name: record.fields.legal_name || 'Unknown',
      score: record.fields.score || 0,
      priority: record.fields.priority || 'low',
      icebreaker: record.fields.icebreaker || '',
      pipeline_status: record.fields.pipeline_status || 'pending',
      ghl_contact_id: record.fields.ghl_contact_id,
    }))
  } catch (error) {
    console.error('Error fetching prospects from Airtable:', error)
    return []
  }
}

export async function updateProspectStatus(
  recordId: string,
  status: string
): Promise<boolean> {
  const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY || process.env.AIRTABLE_API_KEY
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID
  const tableId = 'CLIENTS'

  if (!apiKey || !baseId) {
    console.error('Missing Airtable credentials')
    return false
  }

  try {
    const response = await fetch(
      `${AIRTABLE_API_URL}/${baseId}/${tableId}/${recordId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            pipeline_status: status,
          },
        }),
      }
    )

    if (!response.ok) {
      console.error(`Airtable update error: ${response.status}`, await response.text())
      return false
    }

    console.log(`Updated prospect ${recordId} status to ${status}`)
    return true
  } catch (error) {
    console.error('Error updating prospect status:', error)
    return false
  }
}
