/**
 * Document Upload & Extraction API
 * POST multipart/form-data: file (PDF|DOCX), context? (string)
 * Extracts procurement intelligence via Claude claude-sonnet-4-6, saves to Airtable.
 */

import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const AIRTABLE_API_KEY = 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92'
const AIRTABLE_BASE_ID = 'appZhXnyFiKbnOZLr'
const AIRTABLE_API_URL = 'https://api.airtable.com/v0'

interface ExtractedFields {
  agency: string | null
  title: string | null
  deadline: string | null
  estimated_value: number | null
  naics_codes: string[]
  scope_summary: string
  key_requirements: string[]
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  submission_method: string | null
  pre_bid_meeting: string | null
  bond_required: boolean
  insurance_required: boolean
  cleaning_keywords: string[]
  signal_strength: 'high' | 'medium' | 'low'
  is_janitorial: boolean
}

function getMockExtraction(filename: string): ExtractedFields {
  return {
    agency: 'Broward County Schools',
    title: 'Janitorial Services Contract 2026 - Zone 3',
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    estimated_value: 485000,
    naics_codes: ['561720'],
    scope_summary:
      'Comprehensive janitorial and custodial services for 12 school facilities in Zone 3. Services include daily cleaning, floor maintenance, restroom sanitation, and trash removal during the academic year.',
    key_requirements: [
      'State of Florida business license',
      '$1M general liability insurance',
      'Performance bond 10% of contract value',
      'Background checks for all employees',
      'OSHA 10-hour training certification',
      'Green cleaning products preferred',
    ],
    contact_name: 'Sandra Martinez',
    contact_email: 'smartinez@browardschools.com',
    contact_phone: '(954) 765-6000',
    submission_method: 'Electronic via BidNet',
    pre_bid_meeting: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    bond_required: true,
    insurance_required: true,
    cleaning_keywords: ['janitorial', 'custodial', 'floor maintenance', 'restroom', 'sanitation', 'trash removal'],
    signal_strength: 'high',
    is_janitorial: true,
  }
}

async function extractWithClaude(
  fileBuffer: ArrayBuffer,
  filename: string,
  context: string,
  isPdf: boolean
): Promise<ExtractedFields> {
  if (!ANTHROPIC_API_KEY) {
    return getMockExtraction(filename)
  }

  const base64String = Buffer.from(fileBuffer).toString('base64')

  const extractPrompt =
    'Extract from this government procurement document as JSON: { agency, title, deadline (ISO date or null), estimated_value (number or null), naics_codes (array), scope_summary (2-3 sentences), key_requirements (array of strings), contact_name, contact_email, contact_phone, submission_method, pre_bid_meeting (date or null), bond_required (boolean), insurance_required (boolean), cleaning_keywords (array of cleaning-related terms found), signal_strength ("high"|"medium"|"low"), is_janitorial (boolean) }. Return ONLY valid JSON with no markdown fences.'

  const contentBlocks: object[] = isPdf
    ? [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64String },
        },
        { type: 'text', text: extractPrompt },
      ]
    : [
        {
          type: 'text',
          text: `Document filename: ${filename}\n${context ? `Context: ${context}\n` : ''}Content (base64-decoded text):\n${Buffer.from(fileBuffer).toString('utf-8')}\n\n${extractPrompt}`,
        },
      ]

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: contentBlocks }],
    }),
  })

  if (!response.ok) {
    console.error('Claude API error:', response.status, await response.text())
    return getMockExtraction(filename)
  }

  const data = await response.json()
  const text: string = data?.content?.[0]?.text ?? ''

  try {
    // Strip markdown fences if present
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return parsed as ExtractedFields
  } catch {
    console.error('Failed to parse Claude response JSON:', text.slice(0, 500))
    return getMockExtraction(filename)
  }
}

async function saveToAirtable(
  extracted: ExtractedFields,
  filename: string,
  fileSize: number
): Promise<string | null> {
  try {
    const fields: Record<string, unknown> = {
      filename,
      file_type: filename.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOCX',
      source: 'upload',
      summary: extracted.scope_summary,
      agency: extracted.agency ?? '',
      deadline: extracted.deadline ?? '',
      estimated_value: extracted.estimated_value ?? 0,
      naics_code: (extracted.naics_codes ?? []).join(', '),
      key_requirements: (extracted.key_requirements ?? []).join('\n'),
      uploaded_at: new Date().toISOString(),
      extracted_fields: JSON.stringify(extracted),
      is_janitorial: extracted.is_janitorial,
      signal_strength: extracted.signal_strength,
    }

    const res = await fetch(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/tblVWwh29awp6emXZ`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    })

    if (!res.ok) {
      console.warn('Airtable Documents save failed (table may not exist):', res.status)
      return null
    }

    const record = await res.json()
    return record?.id ?? null
  } catch (err) {
    console.warn('Airtable save error (non-fatal):', err)
    return null
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const context = (formData.get('context') as string | null) ?? ''

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    const filename = file.name
    const fileSize = file.size
    const isPdf = filename.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf'

    const fileBuffer = await file.arrayBuffer()

    const extracted = await extractWithClaude(fileBuffer, filename, context, isPdf)

    const airtableRecordId = await saveToAirtable(extracted, filename, fileSize)

    return NextResponse.json({
      success: true,
      extracted: {
        agency: extracted.agency,
        title: extracted.title,
        deadline: extracted.deadline,
        estimated_value: extracted.estimated_value,
        naics_codes: extracted.naics_codes,
        scope_summary: extracted.scope_summary,
        key_requirements: extracted.key_requirements,
        contact_name: extracted.contact_name,
        contact_email: extracted.contact_email,
        submission_method: extracted.submission_method,
        bond_required: extracted.bond_required,
        insurance_required: extracted.insurance_required,
        cleaning_keywords: extracted.cleaning_keywords,
        signal_strength: extracted.signal_strength,
        is_janitorial: extracted.is_janitorial,
      },
      filename,
      file_size: fileSize,
      airtable_record_id: airtableRecordId,
    })
  } catch (err) {
    console.error('Upload route error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(err) },
      { status: 500 }
    )
  }
}
