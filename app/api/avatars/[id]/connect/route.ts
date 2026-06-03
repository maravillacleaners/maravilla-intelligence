/**
 * POST /api/avatars/[id]/connect
 * Connect two avatars (create a bidirectional relationship)
 * Body: { targetId: string, type: 'same_building' | 'same_zone' | 'partnership' }
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

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await req.json()
    const { targetId, type = 'partnership' } = body

    if (!targetId) {
      return NextResponse.json({ error: 'targetId required' }, { status: 400 })
    }

    const auth = await getAirtableAuth()

    // Get source avatar
    const sourceRes = await fetch(`${AT}/${AVATARS_TABLE_ID}/${id}`, { headers: auth })
    if (!sourceRes.ok) {
      return NextResponse.json({ error: 'Source avatar not found' }, { status: 404 })
    }
    const sourceData = await sourceRes.json()
    const sourceConnections = sourceData.fields?.Connections || []

    // Get target avatar
    const targetRes = await fetch(`${AT}/${AVATARS_TABLE_ID}/${targetId}`, { headers: auth })
    if (!targetRes.ok) {
      return NextResponse.json({ error: 'Target avatar not found' }, { status: 404 })
    }
    const targetData = await targetRes.json()
    const targetConnections = targetData.fields?.Connections || []

    // Add bidirectional connections
    const connection = { avatarId: targetId, type, connectedAt: new Date().toISOString() }
    const reverseConnection = { avatarId: id, type, connectedAt: new Date().toISOString() }

    // Update source
    await fetch(`${AT}/${AVATARS_TABLE_ID}/${id}`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({
        fields: {
          Connections: [...sourceConnections, connection],
        },
      }),
    })

    // Update target
    await fetch(`${AT}/${AVATARS_TABLE_ID}/${targetId}`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({
        fields: {
          Connections: [...targetConnections, reverseConnection],
        },
      }),
    })

    return NextResponse.json({
      ok: true,
      message: `Connected ${id} to ${targetId}`,
      connection,
    })
  } catch (err) {
    console.error('[POST /api/avatars/[id]/connect]', err)
    return NextResponse.json({ error: String(err), ok: false }, { status: 500 })
  }
}
