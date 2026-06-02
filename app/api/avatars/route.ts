/**
 * GET /api/avatars
 * Lists all avatars (contacts with location/relationship data) for map visualization
 * POST /api/avatars
 * Creates a new avatar with building location and approach mode
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCredential } from '@/lib/credentials-dynamic'

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID
const AVATARS_TABLE_ID = 'tblAvatars' // Will be created if needed
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

export async function GET(req: NextRequest) {
  try {
    const auth = await getAirtableAuth()

    // Fetch all avatars from the base
    const url = `${AT}/${AVATARS_TABLE_ID}`
    const res = await fetch(url, { headers: auth })

    if (!res.ok) {
      if (res.status === 404) {
        // Table doesn't exist yet, return empty
        return NextResponse.json({ avatars: [], ok: true })
      }
      throw new Error(`Airtable error ${res.status}`)
    }

    const data = await res.json()
    const avatars = (data.records || []).map(mapAvatar)

    return NextResponse.json({ avatars, ok: true })
  } catch (err) {
    console.error('[GET /api/avatars]', err)
    return NextResponse.json({ error: String(err), ok: false }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      type = 'contact',
      zone,
      latitude,
      longitude,
      building_address,
      organization,
      decision_maker,
      approach_mode = 'cold_knock',
      notes = '',
    } = body

    if (!name || !zone || latitude === null || longitude === null) {
      return NextResponse.json(
        { error: 'name, zone, latitude, longitude required' },
        { status: 400 }
      )
    }

    const auth = await getAirtableAuth()
    const url = `${AT}/${AVATARS_TABLE_ID}`

    const createRes = await fetch(url, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        records: [
          {
            fields: {
              Name: name,
              Avatar_Type: type,
              Zone: zone,
              Latitude: latitude,
              Longitude: longitude,
              Building_Address: building_address,
              Organization: organization,
              Decision_Maker: decision_maker,
              Approach_Mode: approach_mode,
              Pipeline_Status: 'prospect',
              Notes: notes,
              Connections: [],
              Relationships: [],
            },
          },
        ],
      }),
    })

    if (!createRes.ok) {
      throw new Error(`Failed to create avatar: ${createRes.status}`)
    }

    const result = await createRes.json()
    const avatar = mapAvatar(result.records[0])

    return NextResponse.json({ avatar, ok: true }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/avatars]', err)
    return NextResponse.json({ error: String(err), ok: false }, { status: 500 })
  }
}
