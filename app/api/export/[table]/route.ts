import { NextRequest, NextResponse } from 'next/server'
import { credentials, airtableTables } from '@/app/lib/credentials'
import { authMiddleware } from '@/app/lib/auth-middleware'

async function handler(request: NextRequest) {
  const url = new URL(request.url)
  const tableParam = url.pathname.split('/').pop()

  if (!tableParam || !['leads', 'contacts', 'opportunities'].includes(tableParam)) {
    return NextResponse.json(
      { error: 'Invalid table. Supported: leads, contacts, opportunities' },
      { status: 400 }
    )
  }

  const apiKey = credentials.airtableApiKey
  const baseId = credentials.airtableBaseId

  if (!apiKey || !baseId) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 500 })
  }

  try {
    const KEY = apiKey
    const BASE = baseId
    const tableId = tableParam === 'leads' ? airtableTables.leads
      : tableParam === 'contacts' ? airtableTables.contacts
      : airtableTables.opportunities

    const AT = `https://api.airtable.com/v0/${BASE}`
    const HDR = { Authorization: `Bearer ${KEY}` }

    // Fetch all records with pagination
    const records: any[] = []
    let offset: string | undefined
    let pageCount = 0
    const maxPages = 10 // Limit to ~1000 records (100 per page * 10)

    while (pageCount < maxPages) {
      const pageUrl = offset
        ? `${AT}/${tableId}?pageSize=100&offset=${offset}`
        : `${AT}/${tableId}?pageSize=100`

      const res = await fetch(pageUrl, { headers: HDR })
      if (!res.ok) break

      const data = await res.json()
      records.push(...(data.records || []))

      offset = data.offset
      pageCount++

      if (!offset) break
    }

    // Build CSV based on table type
    let csv = ''

    if (tableParam === 'leads') {
      csv = buildLeadsCSV(records)
    } else if (tableParam === 'contacts') {
      csv = buildContactsCSV(records)
    } else {
      csv = buildOpportunitiesCSV(records)
    }

    const filename = `${tableParam}-${new Date().toISOString().split('T')[0]}.csv`

    const response = new NextResponse(csv)
    response.headers.set('Content-Type', 'text/csv; charset=utf-8')
    response.headers.set('Content-Disposition', `attachment; filename="${filename}"`)
    return response
  } catch (error) {
    console.error(`[API /export/${tableParam}] Error:`, error)
    return NextResponse.json(
      { error: 'Failed to generate export', details: String(error) },
      { status: 500 }
    )
  }
}

function buildLeadsCSV(records: any[]): string {
  const headers = [
    'Entity Name',
    'Stage',
    'Priority Score',
    'GovCon Fit',
    'Commercial Fit',
    'Source',
    'Agency',
    'NAICS',
    'Location',
    'Value',
    'Has Decision Maker',
    'Decision Maker Name',
    'Decision Maker Email',
    'Signal Date',
  ]

  const rows = records.map((r) => {
    const fields = r.fields || {}
    return [
      fields.Entity_Name || '',
      fields.Stage || '',
      fields.Priority_Score || '',
      fields.GovCon_Fit || '',
      fields.Commercial_Fit || '',
      fields.Source || '',
      fields.Agency || '',
      fields.NAICS || '',
      fields.Location || '',
      fields.Value || '',
      fields.Has_Decision_Maker ? 'Yes' : 'No',
      fields.Decision_Maker_Name || '',
      fields.Decision_Maker_Email || '',
      fields.Signal_Date || '',
    ].map(escapeCSV)
  })

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

function buildContactsCSV(records: any[]): string {
  const headers = [
    'Name',
    'Title',
    'Email',
    'Phone',
    'Organization',
    'Avatar Type',
    'Decision Role',
    'Influence Score',
    'Relevance Score',
    'Source',
    'Status',
    'Outreach Status',
    'Entity Name',
    'Geographic Jurisdiction',
  ]

  const rows = records.map((r) => {
    const fields = r.fields || {}
    return [
      fields.Name || '',
      fields.Title || '',
      fields.Email || '',
      fields.Phone || '',
      fields.Organization || '',
      fields.Avatar_Type || '',
      fields.Decision_Role || '',
      fields.Influence_Score || '',
      fields.Relevance_Score || '',
      fields.Source || '',
      fields.Status || '',
      fields.Outreach_Status || '',
      fields.Entity_Name || '',
      fields.Geographic_Jurisdiction || '',
    ].map(escapeCSV)
  })

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

function buildOpportunitiesCSV(records: any[]): string {
  const headers = [
    'Bid ID',
    'Title',
    'Agency',
    'State',
    'Deadline',
    'Estimated Value',
    'Source',
    'Status',
    'Score',
    'Signal Strength',
    'Cleaning Keywords',
    'NAICS Codes',
    'Days Until Deadline',
  ]

  const rows = records.map((r) => {
    const fields = r.fields || {}
    return [
      fields.Bid_ID || '',
      fields.Title || '',
      fields.Agency || '',
      fields.State || '',
      fields.Deadline || '',
      fields.Estimated_Value || '',
      fields.Source || '',
      fields.Status || '',
      fields.Score || '',
      fields.Signal_Strength || '',
      fields.Cleaning_Keywords || '',
      fields.NAICS_Codes || '',
      fields.Days_Until_Deadline || '',
    ].map(escapeCSV)
  })

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

function escapeCSV(value: string | number | boolean): string {
  const str = String(value || '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"` // Escape quotes by doubling them
  }
  return str
}

export const GET = authMiddleware(handler)
