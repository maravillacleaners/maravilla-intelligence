import { NextRequest } from 'next/server'

const AIRTABLE_API_URL = 'https://api.airtable.com/v0'
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appZhXnyFiKbnOZLr'
const AIRTABLE_SEQUENCES_TABLE = 'Sequences'
const AIRTABLE_ENROLLMENTS_TABLE = 'Enrollments'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!AIRTABLE_API_KEY) {
    return Response.json({ error: 'Airtable API key not configured' }, { status: 500 })
  }

  const body = await req.json()
  const { prospectIds } = body

  if (!Array.isArray(prospectIds) || prospectIds.length === 0) {
    return Response.json({ error: 'prospectIds array is required' }, { status: 400 })
  }

  try {
    // Create enrollment records for each prospect
    const records = prospectIds.map((prospectId) => ({
      fields: {
        Sequence: [params.id],
        Prospect: [prospectId],
        Status: 'active',
        EnrolledAt: new Date().toISOString(),
      },
    }))

    const res = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${AIRTABLE_ENROLLMENTS_TABLE}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records }),
      }
    )

    if (!res.ok) {
      return Response.json({ error: 'Failed to enroll prospects' }, { status: res.status })
    }

    const data = await res.json()

    // Update the sequence's enrolled total
    const getRes = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${AIRTABLE_SEQUENCES_TABLE}/${params.id}`,
      {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      }
    )

    if (getRes.ok) {
      const seqData = await getRes.json()
      const currentEnrolled = seqData.fields.EnrolledTotal || 0
      const newEnrolled = currentEnrolled + prospectIds.length

      await fetch(
        `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${AIRTABLE_SEQUENCES_TABLE}/${params.id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields: { EnrolledTotal: newEnrolled } }),
        }
      )
    }

    return Response.json({
      ok: true,
      enrolled: data.records.length,
      enrollments: data.records,
    })
  } catch (err) {
    console.error('Enrollment error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
