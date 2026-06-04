/**
 * GET /api/avatars/[id]
 * Get a single avatar with all connections and relationships
 * PATCH /api/avatars/[id]
 * Update avatar (pipeline_status, approach_mode, notes, etc.)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCredential } from '@/lib/credentials-dynamic'

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID
const AVATARS_TABLE_ID = process.env.AVATARS_TABLE_ID || 'tblrIv6lKjsMeUcyU'
const AT = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`

async function getAirtableAuth() {
  const key = await getCredential('AIRTABLE_API_KEY')
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

function mapAvatar(record: any) {
  const f = record.fields || {}
  return {
    id: record.id,
    name: f.Name || f.Full_Name || '',
    type: f.Avatar_Type || 'contact',
    pipeline_status: f.Pipeline_Status || 'prospect',
    approach_mode: f.Approach_Mode || 'cold_knock',
    zone: f.Zone || '',
    latitude: f.Latitude || null,
    longitude: f.Longitude || null,
    building_address: f.Building_Address || '',
    organization: f.Organization || '',
    decision_maker: f.Decision_Maker || '',
    connections: f.Connections || [],
    relationships: f.Relationships || [],
    notes: f.Notes || '',
    created_time: record.createdTime,
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const auth = await getAirtableAuth()
    const url = `${AT}/${AVATARS_TABLE_ID}/${id}`
    const res = await fetch(url, { headers: auth })

    if (!res.ok) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 })
    }

    const data = await res.json()
    const avatar = mapAvatar(data)

    return NextResponse.json({ avatar, ok: true })
  } catch (err) {
    console.error('[GET /api/avatars/[id]]', err)
    // Don't expose error details to client (FIX #5: Error Handling)
    return NextResponse.json({ error: 'Internal server error', ok: false }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await req.json()

    const auth = await getAirtableAuth()
    const url = `${AT}/${AVATARS_TABLE_ID}/${id}`

    const updateRes = await fetch(url, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({
        fields: {
          ...(body.pipeline_status && { Pipeline_Status: body.pipeline_status }),
          ...(body.approach_mode && { Approach_Mode: body.approach_mode }),
          ...(body.notes !== undefined && { Notes: body.notes }),
          ...(body.connections && { Connections: body.connections }),
          ...(body.relationships && { Relationships: body.relationships }),
        },
      }),
    })

    if (!updateRes.ok) {
      throw new Error(`Failed to update: ${updateRes.status}`)
    }

    const result = await updateRes.json()
    const avatar = mapAvatar(result)

    return NextResponse.json({ avatar, ok: true })
  } catch (err) {
    console.error('[PATCH /api/avatars/[id]]', err)
    // Don't expose error details to client (FIX #5: Error Handling)
    return NextResponse.json({ error: 'Internal server error', ok: false }, { status: 500 })
  }
}
