import { NextRequest } from 'next/server'

const AIRTABLE_API_URL = 'https://api.airtable.com/v0'
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appZhXnyFiKbnOZLr'
const AIRTABLE_SEQUENCES_TABLE = 'Sequences'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!AIRTABLE_API_KEY) {
    return Response.json({ error: 'Airtable API key not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${AIRTABLE_SEQUENCES_TABLE}/${params.id}`,
      {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      }
    )

    if (!res.ok) {
      return Response.json({ error: 'Sequence not found' }, { status: 404 })
    }

    const data = await res.json()
    const sequence = {
      id: data.id,
      name: data.fields.Name || '',
      active: data.fields.Active ?? true,
      owner: data.fields.Owner || '',
      createdAt: data.fields.CreatedAt || '',
      enrolledTotal: data.fields.EnrolledTotal || 0,
      stats: {
        enrolled: data.fields.StatsEnrolled || 0,
        opened: data.fields.StatsOpened || 0,
        replied: data.fields.StatsReplied || 0,
        booked: data.fields.StatsBooked || 0,
      },
      steps: data.fields.Steps ? JSON.parse(data.fields.Steps) : [],
      rules: {
        pauseOnReply: data.fields.RulePauseOnReply ?? true,
        skipWeekends: data.fields.RuleSkipWeekends ?? true,
        businessHours: data.fields.RuleBusinessHours ?? true,
        stopOnOptOut: data.fields.RuleStopOnOptOut ?? true,
      },
    }

    return Response.json({ ok: true, sequence })
  } catch (err) {
    console.error('Sequence fetch error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!AIRTABLE_API_KEY) {
    return Response.json({ error: 'Airtable API key not configured' }, { status: 500 })
  }

  const body = await req.json()
  const { active, rules, steps } = body

  const updateFields: Record<string, any> = {}

  if (typeof active === 'boolean') {
    updateFields.Active = active
  }

  if (rules) {
    if (typeof rules.pauseOnReply === 'boolean') updateFields.RulePauseOnReply = rules.pauseOnReply
    if (typeof rules.skipWeekends === 'boolean') updateFields.RuleSkipWeekends = rules.skipWeekends
    if (typeof rules.businessHours === 'boolean') updateFields.RuleBusinessHours = rules.businessHours
    if (typeof rules.stopOnOptOut === 'boolean') updateFields.RuleStopOnOptOut = rules.stopOnOptOut
  }

  if (steps) {
    updateFields.Steps = JSON.stringify(steps)
  }

  try {
    const res = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${AIRTABLE_SEQUENCES_TABLE}/${params.id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields: updateFields }),
      }
    )

    if (!res.ok) {
      return Response.json({ error: 'Failed to update sequence' }, { status: res.status })
    }

    const data = await res.json()
    return Response.json({ ok: true, sequence: data })
  } catch (err) {
    console.error('Sequence update error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
