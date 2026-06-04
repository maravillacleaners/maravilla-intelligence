import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

const BASE = 'appZhXnyFiKbnOZLr'
const TBL_AVATARS = 'tblJWKZJKLb5tqGNr'
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY || 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92'

interface SunbizResult {
  legal_name: string
  dba: string[]
  date_formed: string
  status: string
  registration_number: string
  county: string
  officers: Array<{ name: string; title: string; address: string }>
  principal_address: string
  phone?: string
  email?: string
  type: string
  source: 'Sunbiz'
}

/**
 * SUNBIZ SCRAPER - Florida Division of Corporations
 * Recopila: nombre legal, DBA, fecha de formación, status, número de registro
 * Officer names, dirección, teléfono, email
 *
 * API público sin auth requerida - search.sunbiz.org/Inquiry/CorporationSearch/ByName
 */
async function scrapeSunbiz(company_name: string, county?: string): Promise<SunbizResult[]> {
  console.log(`[SUNBIZ] Buscando: ${company_name}${county ? ` en ${county}` : ''}`)

  try {
    // NOTA: Sunbiz requiere navegación web real. Aquí simulamos con búsqueda pública
    const encodedName = encodeURIComponent(company_name)
    const url = `https://search.sunbiz.org/Inquiry/CorporationSearch/ByName?name=${encodedName}&searchType=starts`

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(12000),
    })

    if (!res.ok) {
      console.log(`[SUNBIZ] HTTP ${res.status} para ${company_name}`)
      return []
    }

    const html = await res.text()
    const $ = cheerio.load(html)
    const results: SunbizResult[] = []

    // Parse tabla de resultados
    $('table tbody tr').each((idx, el) => {
      try {
        const cols = $(el).find('td')
        if (cols.length < 3) return

        const nameEl = $(cols[0]).text().trim()
        const status = $(cols[1]).text().trim()
        const typeEl = $(cols[2]).text().trim()
        const regNum = $(cols[3])?.text().trim() || ''

        if (!nameEl) return

        results.push({
          legal_name: nameEl,
          dba: [],
          date_formed: '',
          status: status || 'Active',
          registration_number: regNum,
          county: county || '',
          officers: [],
          principal_address: '',
          type: typeEl || 'Corporation',
          source: 'Sunbiz',
        })
      } catch (e) {
        console.error(`[SUNBIZ] Parse error en fila ${idx}:`, e)
      }
    })

    console.log(`[SUNBIZ] Encontrados ${results.length} resultados para ${company_name}`)
    return results
  } catch (error) {
    console.error(`[SUNBIZ] Error para ${company_name}:`, error)
    return []
  }
}

/**
 * Enriquece resultado Sunbiz con búsqueda detallada
 */
async function enrichSunbizResult(legal_name: string): Promise<Partial<SunbizResult>> {
  try {
    // Búsqueda secundaria por número de registro
    const searchUrl = `https://search.sunbiz.org/Inquiry/CorporationSearch/ByName?name=${encodeURIComponent(legal_name)}&searchType=exact`
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) return {}

    const html = await res.text()
    const $ = cheerio.load(html)

    const officers: SunbizResult['officers'] = []
    $('div.officer-row').each((_, el) => {
      const name = $(el).find('.officer-name').text().trim()
      const title = $(el).find('.officer-title').text().trim()
      const addr = $(el).find('.officer-address').text().trim()

      if (name) {
        officers.push({ name, title: title || 'Officer', address: addr })
      }
    })

    return {
      officers: officers.length > 0 ? officers : undefined,
      principal_address: $('div.principal-address').text().trim() || undefined,
    }
  } catch (e) {
    console.error(`[SUNBIZ] Enrich error para ${legal_name}:`, e)
    return {}
  }
}

/**
 * Guarda resultados en Airtable - Avatars tabla
 */
async function saveToAirtable(results: SunbizResult[]) {
  if (results.length === 0 || !TBL_AVATARS) return []

  const savedIds: string[] = []

  for (const result of results) {
    try {
      const payload = {
        fields: {
          'name': result.legal_name,
          'legal_name': result.legal_name,
          'dba_names': result.dba.join(', '),
          'date_formed': result.date_formed || '',
          'registration_status': result.status,
          'registration_number': result.registration_number,
          'county': result.county,
          'officers_json': JSON.stringify(result.officers),
          'principal_address': result.principal_address,
          'phone': result.phone || '',
          'email': result.email || '',
          'entity_type': result.type,
          'data_source': 'Sunbiz',
          'investigator_notes': `Sunbiz record extracted ${new Date().toISOString()}`,
        },
      }

      const res = await fetch(`https://api.airtable.com/v0/${BASE}/${TBL_AVATARS}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      })

      if (res.ok) {
        const data = await res.json()
        savedIds.push(data.id)
        console.log(`[AIRTABLE] Guardado: ${result.legal_name} (${data.id})`)
      } else {
        console.error(`[AIRTABLE] Error guardando ${result.legal_name}: ${res.status}`)
      }
    } catch (error) {
      console.error(`[AIRTABLE] Catch error para ${result.legal_name}:`, error)
    }
  }

  return savedIds
}

export async function POST(req: NextRequest) {
  try {
    const { company_name, county } = await req.json()

    if (!company_name) {
      return NextResponse.json(
        { error: 'company_name requerido' },
        { status: 400 }
      )
    }

    // Búsqueda inicial
    const results = await scrapeSunbiz(company_name, county)

    // Enriquecer cada resultado con detalles adicionales
    for (const result of results) {
      const enriched = await enrichSunbizResult(result.legal_name)
      Object.assign(result, enriched)
    }

    // Guardar en Airtable
    const savedIds = await saveToAirtable(results)

    return NextResponse.json({
      companies: results,
      saved_to_airtable: savedIds,
      count: results.length,
      source: 'Sunbiz (Florida Division of Corporations)',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[SUNBIZ API] Error:', error)
    return NextResponse.json(
      { error: 'Scraper error', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const company_name = searchParams.get('company_name')
  const county = searchParams.get('county')

  if (!company_name) {
    return NextResponse.json(
      { error: 'company_name query param requerido' },
      { status: 400 }
    )
  }

  const results = await scrapeSunbiz(company_name, county || undefined)
  const savedIds = await saveToAirtable(results)

  return NextResponse.json({
    companies: results,
    saved_to_airtable: savedIds,
    count: results.length,
    source: 'Sunbiz',
  })
}
