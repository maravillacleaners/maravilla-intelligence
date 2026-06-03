/**
 * GET /api/avatars
 * Lists all avatars (contacts with location/relationship data) for map visualization
 * POST /api/avatars
 * Creates a new avatar with building location and approach mode
 */
import { NextRequest, NextResponse } from 'next/server'
import { avatarsLimiter, getClientIP, checkRateLimit } from '@/lib/ratelimit'

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID
const AVATARS_TABLE_ID = process.env.AVATARS_TABLE_ID || 'tblrIv6lKjsMeUcyU'
const AT = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`

function getAirtableAuth() {
  if (!AIRTABLE_API_KEY) {
    throw new Error('AIRTABLE_API_KEY not configured. Set environment variable or create .env file.')
  }
  return {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
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
    // Apply rate limiting
    const clientIP = getClientIP(req)
    const rateLimitResult = await checkRateLimit(avatarsLimiter, clientIP)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Max 10 requests per 60 seconds.`,
          retryAfter: rateLimitResult.retryAfter,
          ok: false,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': String(Math.max(0, rateLimitResult.remaining)),
            'X-RateLimit-Reset': String(rateLimitResult.reset),
          },
        }
      )
    }

    const auth = getAirtableAuth()

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

    return NextResponse.json({ avatars, ok: true }, {
      headers: {
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': String(Math.max(0, rateLimitResult.remaining - 1)),
        'X-RateLimit-Reset': String(rateLimitResult.reset),
      },
    })
  } catch (err) {
    console.error('[GET /api/avatars]', err)
    return NextResponse.json({ error: String(err), ok: false }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const clientIP = getClientIP(req)
    const rateLimitResult = await checkRateLimit(avatarsLimiter, clientIP)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Max 10 requests per 60 seconds.`,
          retryAfter: rateLimitResult.retryAfter,
          ok: false,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': String(Math.max(0, rateLimitResult.remaining)),
            'X-RateLimit-Reset': String(rateLimitResult.reset),
          },
        }
      )
    }

    let body: any
    try {
      body = await req.json()
    } catch (parseErr) {
      if (parseErr instanceof SyntaxError) {
        console.warn('[POST /api/avatars] Invalid JSON:', parseErr.message)
        return NextResponse.json(
          {
            error: 'Invalid JSON: ' + parseErr.message,
            ok: false
          },
          { status: 400 }
        )
      }
      throw parseErr
    }

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
        { error: 'Validation error: name, zone, latitude, longitude are required', ok: false },
        { status: 400 }
      )
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'Validation error: latitude and longitude must be numbers', ok: false },
        { status: 400 }
      )
    }

    const auth = getAirtableAuth()
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
      const errDetails = await createRes.text()
      console.error('[POST /api/avatars] Airtable error:', createRes.status, errDetails)
      return NextResponse.json(
        { error: `Airtable error ${createRes.status}: failed to create avatar`, ok: false },
        { status: 500 }
      )
    }

    const result = await createRes.json()
    const avatar = mapAvatar(result.records[0])

    return NextResponse.json({ avatar, ok: true }, {
      status: 201,
      headers: {
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': String(Math.max(0, rateLimitResult.remaining - 1)),
        'X-RateLimit-Reset': String(rateLimitResult.reset),
      },
    })
  } catch (err) {
    console.error('[POST /api/avatars] Unexpected error:', err)
    const errorMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: 'Server error: ' + errorMsg, ok: false },
      { status: 500 }
    )
  }
}
