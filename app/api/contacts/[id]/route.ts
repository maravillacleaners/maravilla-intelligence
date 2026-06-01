/**
 * GET /api/contacts/[id] — Fetch single contact
 * PATCH /api/contacts/[id] — Update contact fields
 * DELETE /api/contacts/[id] — Delete contact
 * Requires: Valid auth token
 */

import { NextRequest, NextResponse } from 'next/server'
import { credentials, airtableTables } from '@/app/lib/credentials'
import { authMiddleware } from '@/app/lib/auth-middleware'

const KEY  = credentials.airtableApiKey
const BASE = credentials.airtableBaseId
const TBL  = airtableTables.contacts
const AT   = `https://api.airtable.com/v0/${BASE}`
const HDR  = () => ({ Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' })

function mapContact(r: any) {
  const f = r.fields || {}
  return {
    id: r.id,
    name:                  f['Name']                  || f['Full_Name']            || '',
    title:                 f['Title']                 || '',
    email:                 f['Email']                 || '',
    phone:                 f['Phone']                 || '',
    organization:          f['Organization']          || f['Agency']               || '',
    avatar_type:           f['Avatar_Type']           || '',
    decision_role:         f['Decision_Role']         || '',
    influence_score:       f['Influence_Score']       || 0,
    relevance_score:       f['Relevance_Score']       || 0,
    source:                f['Source']                || '',
    status:                f['Status']                || 'Active',
    outreach_status:       f['Outreach_Status']       || '',
    linkedin_url:          f['LinkedIn_URL']          || '',
    entity_key:            f['Entity_Key']            || '',
    entity_name:           f['Entity_Name']           || f['Organization']         || '',
    entity_type:           f['Entity_Type']           || '',
    notes:                 f['Notes']                 || '',
    last_seen:             f['Last_Seen']             || '',
    geographic_jurisdiction: f['Geographic_Jurisdiction'] || '',
    procurement_categories:  f['Procurement_Categories']  || '',
    confidence:            f['Confidence']            || '',
    created_time:          r.createdTime              || '',
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await authMiddleware(req)
  if (authError) return authError

  const { id } = params

  try {
    const res = await fetch(`${AT}/${TBL}/${id}`, { headers: HDR() })
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: res.status }
      )
    }

    const record = await res.json()
    const contact = mapContact(record)

    return NextResponse.json(contact)
  } catch (err) {
    console.error('GET contact error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await authMiddleware(req)
  if (authError) return authError

  const { id } = params

  try {
    const body = await req.json()

    const updatableFields = [
      'Name',
      'Title',
      'Email',
      'Phone',
      'Organization',
      'Avatar_Type',
      'Decision_Role',
      'Status',
      'Outreach_Status',
      'LinkedIn_URL',
      'Notes',
    ]

    const fields: Record<string, any> = {}
    for (const key of updatableFields) {
      const bodyKey = key.replace(/_/g, '_').toLowerCase()
      const bodyKeySnake = Object.keys(body).find(
        (k) => k.replace(/_/g, '_').toLowerCase() === bodyKey
      )
      if (bodyKeySnake && bodyKeySnake in body) {
        fields[key] = body[bodyKeySnake]
      }
    }

    if (Object.keys(fields).length === 0) {
      return NextResponse.json(
        { error: 'No updatable fields provided' },
        { status: 400 }
      )
    }

    const res = await fetch(`${AT}/${TBL}/${id}`, {
      method: 'PATCH',
      headers: HDR(),
      body: JSON.stringify({ fields }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error('Airtable PATCH failed:', errBody)
      return NextResponse.json(
        { error: 'Failed to update contact' },
        { status: res.status }
      )
    }

    const record = await res.json()
    const contact = mapContact(record)

    return NextResponse.json(contact)
  } catch (err) {
    console.error('PATCH contact error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await authMiddleware(req)
  if (authError) return authError

  const { id } = params

  try {
    const res = await fetch(`${AT}/${TBL}/${id}`, {
      method: 'DELETE',
      headers: HDR(),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to delete contact' },
        { status: res.status }
      )
    }

    return NextResponse.json({ success: true, id })
  } catch (err) {
    console.error('DELETE contact error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
