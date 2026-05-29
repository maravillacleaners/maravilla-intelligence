/**
 * Onboarding API
 * POST – Save/update company onboarding step data to Airtable Subcontractors table
 * GET  – Return onboarding status and links
 */

import { NextRequest, NextResponse } from 'next/server'

const AIRTABLE_API_KEY = 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92'
const AIRTABLE_BASE_ID = 'appZhXnyFiKbnOZLr'
const AIRTABLE_SUBCONTRACTORS_TABLE = 'tblxyHqJihk9cJ0t9'
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_SUBCONTRACTORS_TABLE}`

const TOTAL_STEPS = 6

// ── Types ─────────────────────────────────────────────────────────────────────

interface OnboardingBody {
  step: number
  record_id?: string // Airtable record ID for updating existing record

  // Step 1 – Company
  company_name?: string
  dba_name?: string
  ein?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  phone?: string
  email?: string
  website?: string

  // Step 2 – Services & Certs
  naics_codes?: string[]
  services?: string[]
  certifications?: string[]
  states_covered?: string[]

  // Step 3 – Capacity
  employee_count?: number
  annual_revenue?: number
  bonding_limit?: number
  years_in_business?: number

  // Step 4 – Contracts
  contracts_uploaded?: string[]

  // Step 5 – Email
  gmail_connected?: boolean
  email_address?: string
}

// ── Field Mapping ─────────────────────────────────────────────────────────────

function buildAirtableFields(body: OnboardingBody): Record<string, unknown> {
  const fields: Record<string, unknown> = {}

  // Step 1 – Company identity
  if (body.company_name !== undefined) fields['legal_name'] = body.company_name
  if (body.dba_name !== undefined) fields['dba_name'] = body.dba_name
  if (body.ein !== undefined) fields['ein'] = body.ein
  if (body.phone !== undefined) fields['phone'] = body.phone
  if (body.website !== undefined) fields['Website'] = body.website

  // Compose full address
  const addressParts = [body.address, body.city, body.state, body.zip].filter(Boolean)
  if (addressParts.length > 0) {
    fields['address_full'] = addressParts.join(', ')
  }

  if (body.email !== undefined) fields['Business Email'] = body.email
  if (body.state !== undefined) fields['state_of_inc'] = body.state

  // Step 2 – Services & Certs
  if (body.naics_codes !== undefined && body.naics_codes.length > 0) {
    fields['naics_code'] = body.naics_codes[0]
  }
  if (body.certifications !== undefined) {
    fields['certifications'] = body.certifications.join(', ')
  }
  if (body.services !== undefined) {
    fields['services'] = body.services.join(', ')
  }
  if (body.states_covered !== undefined) {
    fields['states_covered'] = body.states_covered.join(', ')
  }

  // Step 3 – Capacity
  if (body.employee_count !== undefined) fields['employee_count'] = body.employee_count
  if (body.annual_revenue !== undefined) fields['annual_revenue'] = body.annual_revenue
  if (body.bonding_limit !== undefined) fields['bonding_limit'] = body.bonding_limit
  if (body.years_in_business !== undefined) fields['years_in_business'] = body.years_in_business

  // Step 4 – Contracts
  if (body.contracts_uploaded !== undefined && body.contracts_uploaded.length > 0) {
    fields['contracts_uploaded'] = body.contracts_uploaded.join(', ')
  }

  // Step 5 – Email
  if (body.gmail_connected !== undefined) fields['gmail_connected'] = body.gmail_connected
  if (body.email_address !== undefined) fields['email_address'] = body.email_address

  // Step 6 – Final
  if (body.step === TOTAL_STEPS) {
    fields['onboarding_complete'] = true
    fields['last_enriched'] = new Date().toISOString().split('T')[0]
    fields['notes'] = 'Onboarded via portal'
  }

  return fields
}

function getNextStep(step: number): number | null {
  if (step >= TOTAL_STEPS) return null
  return step + 1
}

function getStepMessage(step: number): string {
  const messages: Record<number, string> = {
    1: 'Company information saved. Next: services and certifications.',
    2: 'Services and certifications saved. Next: capacity details.',
    3: 'Capacity information saved. Next: upload your contracts.',
    4: 'Contracts recorded. Next: connect your email.',
    5: 'Email settings saved. Next: finalize onboarding.',
    6: 'Onboarding complete! Your profile is now active.',
  }
  return messages[step] ?? 'Step saved.'
}

// ── POST Handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: OnboardingBody = await req.json()

    const { step, record_id } = body

    if (!step || step < 1 || step > TOTAL_STEPS) {
      return NextResponse.json(
        { success: false, error: `step must be between 1 and ${TOTAL_STEPS}` },
        { status: 400 }
      )
    }

    const fields = buildAirtableFields(body)

    if (Object.keys(fields).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to save for this step' },
        { status: 400 }
      )
    }

    let airtableResponse: Response

    if (record_id) {
      // Update existing record
      airtableResponse = await fetch(`${AIRTABLE_API_URL}/${record_id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      })
    } else {
      // Create new record
      airtableResponse = await fetch(AIRTABLE_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      })
    }

    if (!airtableResponse.ok) {
      const errText = await airtableResponse.text()
      console.error('Airtable onboarding save failed:', airtableResponse.status, errText)
      return NextResponse.json(
        { success: false, error: 'Failed to save onboarding data', details: errText },
        { status: 500 }
      )
    }

    const record = await airtableResponse.json()
    const savedRecordId: string = record?.id ?? record_id ?? ''
    const nextStep = getNextStep(step)

    return NextResponse.json({
      success: true,
      record_id: savedRecordId,
      step_completed: step,
      next_step: nextStep,
      is_complete: step === TOTAL_STEPS,
      message: getStepMessage(step),
    })
  } catch (err) {
    console.error('Onboarding POST error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(err) },
      { status: 500 }
    )
  }
}

// ── GET Handler ───────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest): Promise<NextResponse> {
  return NextResponse.json({
    steps_total: TOTAL_STEPS,
    steps_completed: 0,
    onboarding_url: '/onboarding',
    api_docs: '/api/v1',
    steps: [
      { step: 1, label: 'Company Information', required_fields: ['company_name', 'ein', 'address', 'phone', 'email'] },
      { step: 2, label: 'Services & Certifications', required_fields: ['naics_codes', 'services'] },
      { step: 3, label: 'Capacity', required_fields: ['employee_count', 'years_in_business'] },
      { step: 4, label: 'Contract Upload', required_fields: ['contracts_uploaded'] },
      { step: 5, label: 'Email Connection', required_fields: ['gmail_connected'] },
      { step: 6, label: 'Finalize', required_fields: [] },
    ],
  })
}
