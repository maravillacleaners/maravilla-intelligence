import { NextRequest } from 'next/server'

const AIRTABLE_API_URL = 'https://api.airtable.com/v0'
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appZhXnyFiKbnOZLr'
const AIRTABLE_SEQUENCES_TABLE = 'Sequences'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!AIRTABLE_API_KEY) {
    return Response.json({ error: 'Airtable API key not configured' }, { status: 500 })
  }

  try {
    // Fetch the original sequence
    const getRes = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${AIRTABLE_SEQUENCES_TABLE}/${params.id}`,
      {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      }
    )

    if (!getRes.ok) {
      return Response.json({ error: 'Sequence not found' }, { status: 404 })
    }

    const originalData = await getRes.json()
    const originalFields = originalData.fields

    // Create a new sequence with copied data
    const newName = `${originalFields.Name} (Copy)`

    const createRes = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${AIRTABLE_SEQUENCES_TABLE}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            Name: newName,
            Owner: originalFields.Owner || 'admin',
            Active: false, // New sequences start paused
            CreatedAt: new Date().toISOString(),
            Steps: originalFields.Steps || '[]',
            RulePauseOnReply: originalFields.RulePauseOnReply ?? true,
            RuleSkipWeekends: originalFields.RuleSkipWeekends ?? true,
            RuleBusinessHours: originalFields.RuleBusinessHours ?? true,
            RuleStopOnOptOut: originalFields.RuleStopOnOptOut ?? true,
            StatsEnrolled: 0,
            StatsOpened: 0,
            StatsReplied: 0,
            StatsBooked: 0,
          },
        }),
      }
    )

    if (!createRes.ok) {
      return Response.json({ error: 'Failed to duplicate sequence' }, { status: createRes.status })
    }

    const newSeqData = await createRes.json()

    return Response.json({
      ok: true,
      sequence: {
        id: newSeqData.id,
        name: newSeqData.fields.Name,
        active: false,
        owner: newSeqData.fields.Owner,
        createdAt: newSeqData.fields.CreatedAt,
        enrolledTotal: 0,
        stats: { enrolled: 0, opened: 0, replied: 0, booked: 0 },
        steps: newSeqData.fields.Steps
          ? JSON.parse(newSeqData.fields.Steps)
          : [],
      },
    })
  } catch (err) {
    console.error('Duplicate sequence error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
