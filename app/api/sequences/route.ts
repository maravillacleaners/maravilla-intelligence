import { NextRequest } from 'next/server'

const AIRTABLE_API_URL = 'https://api.airtable.com/v0'
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appZhXnyFiKbnOZLr'
const AIRTABLE_SEQUENCES_TABLE = 'Sequences'

export async function GET(req: NextRequest) {
  if (!AIRTABLE_API_KEY) {
    return Response.json({ error: 'Airtable API key not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${AIRTABLE_SEQUENCES_TABLE}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    })

    if (!res.ok) {
      return Response.json({ error: 'Failed to fetch sequences' }, { status: res.status })
    }

    const data = await res.json()
    const sequences = (data.records || []).map((record: any) => ({
      id: record.id,
      name: record.fields.Name || '',
      active: record.fields.Active ?? true,
      owner: record.fields.Owner || '',
      createdAt: record.fields.CreatedAt || '',
      enrolledTotal: record.fields.EnrolledTotal || 0,
      stats: {
        enrolled: record.fields.StatsEnrolled || 0,
        opened: record.fields.StatsOpened || 0,
        replied: record.fields.StatsReplied || 0,
        booked: record.fields.StatsBooked || 0,
      },
      steps: record.fields.Steps ? JSON.parse(record.fields.Steps) : [],
    }))

    return Response.json({ ok: true, sequences })
  } catch (err) {
    console.error('Sequences fetch error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!AIRTABLE_API_KEY) {
    return Response.json({ error: 'Airtable API key not configured' }, { status: 500 })
  }

  const body = await req.json()
  const { name, steps } = body

  if (!name) {
    return Response.json({ error: 'Sequence name is required' }, { status: 400 })
  }

  try {
    const res = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${AIRTABLE_SEQUENCES_TABLE}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          Name: name,
          Owner: 'admin',
          Active: true,
          CreatedAt: new Date().toISOString(),
          Steps: JSON.stringify(steps || []),
          StatsEnrolled: 0,
          StatsOpened: 0,
          StatsReplied: 0,
          StatsBooked: 0,
        },
      }),
    })

    if (!res.ok) {
      return Response.json({ error: 'Failed to create sequence' }, { status: res.status })
    }

    const data = await res.json()
    return Response.json({
      ok: true,
      sequence: {
        id: data.id,
        name: data.fields.Name,
        active: true,
        owner: 'admin',
        createdAt: new Date().toISOString(),
        enrolledTotal: 0,
        stats: { enrolled: 0, opened: 0, replied: 0, booked: 0 },
        steps: steps || [],
      },
    })
  } catch (err) {
    console.error('Sequence creation error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
