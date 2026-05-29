import { NextResponse } from 'next/server'

const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appZhXnyFiKbnOZLr'
const TABLE_ID = 'tblxyHqJihk9cJ0t9'
const API_KEY = process.env.AIRTABLE_API_KEY

function crmStatus(sel: string | null): 'in-crm-active' | 'in-crm-stale' | 'new' {
  if (!sel) return 'new'
  const s = sel.toLowerCase()
  if (s.includes('activ')) return 'in-crm-active'
  if (s.includes('stal') || s.includes('inactiv')) return 'in-crm-stale'
  return 'in-crm-active'
}

function parseTrades(raw: Array<{ name: string }> | null): string[] {
  if (!raw || !Array.isArray(raw)) return ['janitorial']
  return raw.map((r) => r.name?.toLowerCase() || 'janitorial')
}

function parseTags(notes: string | null): string[] {
  if (!notes) return []
  return notes
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 40)
    .slice(0, 4)
}

function parsePlace(city: string | null, state: string | null): string {
  const c = typeof city === 'string' ? city : (city as any)?.name || ''
  const s = typeof state === 'string' ? state : (state as any)?.name || ''
  return [c, s].filter(Boolean).join(', ')
}

export async function GET() {
  try {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?pageSize=100`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      next: { revalidate: 120 },
    })

    if (!res.ok) throw new Error(`Airtable error ${res.status}`)
    const data = await res.json()

    const subs = (data.records || []).map((rec: any, i: number) => {
      const f = rec.fields
      const name = f['Company Name'] || f['Name'] || 'Unknown'
      const county = parsePlace(f['City'], f['State'])
      const location = f['Company Location'] || county

      return {
        id: rec.id,
        name,
        county,
        address: location,
        trades: parseTrades(f['Service Type']),
        yearsActive: 0,
        crews: 0,
        employees: 0,
        email: f['Email'] || '',
        phone: f['Phone'] || '',
        domain: (() => {
          const raw = f['Website'] || ''
          try { return new URL(raw.startsWith('http') ? raw : `https://${raw}`).hostname } catch { return raw.replace(/^https?:\/\//, '').split('/')[0] }
        })(),
        tags: parseTags(f['Notes']),
        crmStatus: crmStatus(f['Seleccionar']?.name || f['Seleccionar'] || null),
        relationshipMonths: 0,
        rating: 0,
        reviews: 0,
        responseTime: '—',
        responseRate: 0,
        pricing: { avg: 0, unit: '$/sqft/mo', confidence: 'No data' },
        availability: 'Contact to confirm',
        compliance: {
          insured: false,
          bonded: false,
          everify: false,
          background: false,
          w9: false,
          coi: false,
        },
        lastQuoteRequested: f['Last Contact Date'] || null,
        lastQuoteBy: f['Owner (Assigned Rep)'] || null,
      }
    })

    return NextResponse.json({ subs })
  } catch (err) {
    console.error('[/api/subs]', err)
    return NextResponse.json({ subs: [] }, { status: 500 })
  }
}
