import { NextRequest, NextResponse } from 'next/server'

const BASE = 'appZhXnyFiKbnOZLr'
const TBL_AVATARS = 'tblJWKZJKLb5tqGNr'
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY || 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92'

interface AvatarProfile {
  name: string
  entity_type: 'individual' | 'corporation' | 'LLC' | 'trust' | 'other'
  relationship_type: 'primary' | 'associated' | 'linked' | 'related'
  confidence_score: number
  data_sources: string[]
  phone?: string
  email?: string
  linkedin?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  properties: Array<{
    address: string
    county: string
    property_type: string
    market_value: number
  }>
  contacts: Array<{
    name: string
    title: string
    department: string
    email: string
    phone: string
  }>
  relationships: Array<{
    related_avatar: string
    relationship: string
    confidence: number
  }>
  federal_contracts?: Array<{
    recipient: string
    amount: number
    agency: string
    date: string
  }>
  business_registrations: Array<{
    legal_name: string
    status: string
    registration_number: string
    date_formed: string
    county: string
  }>
  risk_flags: string[]
  investigation_score: number
  last_updated: string
}

/**
 * INVESTIGATOR MERGE - Integración investigativa completa
 *
 * Combina datos de MÚLTIPLES FUENTES en UN PERFIL AVATAR:
 * - Registros de corporaciones (Sunbiz)
 * - Propiedades inmuebles (Zillow/Redfin/Records)
 * - Contactos de personas (Hunter/RocketReach/Apollo/Clearbit)
 * - Contratos federales (USASpending)
 * - Relaciones entre entidades
 * - Banderas de riesgo investigativo
 *
 * FUNCIONA COMO UN INVESTIGADOR PRIVADO:
 * 1. Busca persona/empresa
 * 2. Encuentra registros de negocios
 * 3. Identifica propiedades
 * 4. Descubre contactos asociados
 * 5. Mapea relaciones
 * 6. Calcula score de investigación
 * 7. Guarda perfil completo en Airtable
 */

async function fetchAirtableRecords(table: string, formula: string): Promise<Record<string, unknown>[]> {
  try {
    const url = `https://api.airtable.com/v0/${BASE}/${table}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=100`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_KEY}` },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      console.log(`[AIRTABLE] ${table} - HTTP ${res.status}`)
      return []
    }

    const data = await res.json()
    return (data.records || []).map((r: { fields: Record<string, unknown> }) => r.fields)
  } catch (error) {
    console.error(`[AIRTABLE] Error fetching ${table}:`, error)
    return []
  }
}

async function buildAvatarProfile(
  name: string,
  entityType: string,
  county?: string
): Promise<AvatarProfile> {
  console.log(`[INVESTIGATOR] Construyendo perfil para: ${name}`)

  const profile: AvatarProfile = {
    name,
    entity_type: (entityType.toLowerCase().includes('corp') ? 'corporation'
      : entityType.toLowerCase().includes('llc') ? 'LLC'
      : entityType.toLowerCase().includes('trust') ? 'trust'
      : 'individual') as any,
    relationship_type: 'primary',
    confidence_score: 50,
    data_sources: [],
    properties: [],
    contacts: [],
    relationships: [],
    business_registrations: [],
    risk_flags: [],
    investigation_score: 0,
    last_updated: new Date().toISOString(),
  }

  try {
    // 1. Fetch business registrations (Sunbiz)
    const registrations = await fetchAirtableRecords(
      'tblBusinessRegistrations',
      `SEARCH(LOWER("${name.replace(/"/g, '')}"), LOWER({legal_name}))`
    )

    if (registrations.length > 0) {
      profile.business_registrations = registrations.map((r: any) => ({
        legal_name: r.legal_name || name,
        status: r.status || 'Active',
        registration_number: r.registration_number || '',
        date_formed: r.date_formed || '',
        county: r.county || county || '',
      }))
      profile.data_sources.push('Sunbiz')
      profile.confidence_score += 15
    }

    // 2. Fetch properties (Property Records)
    const properties = await fetchAirtableRecords(
      'tblPropertyRecords',
      `OR(SEARCH(LOWER("${name}"), LOWER({owner_name})), SEARCH(LOWER("${county || ''}"), LOWER({county})))`
    )

    if (properties.length > 0) {
      profile.properties = properties.map((p: any) => ({
        address: p.address || '',
        county: p.county || '',
        property_type: p.property_type || 'Unknown',
        market_value: p.market_value || 0,
      }))
      profile.data_sources.push('Property Records')
      profile.confidence_score += 15

      // Risk flag si hay muchas propiedades (potencial patrón)
      if (properties.length > 5) {
        profile.risk_flags.push('High property portfolio')
      }
    }

    // 3. Fetch contacts
    const contacts = await fetchAirtableRecords(
      'tblContacts',
      `SEARCH(LOWER("${name}"), LOWER({company}))`
    )

    if (contacts.length > 0) {
      profile.contacts = contacts.map((c: any) => ({
        name: c.name || '',
        title: c.title || '',
        department: c.department || '',
        email: c.email || '',
        phone: c.phone || '',
      }))
      profile.data_sources.push('Contact Database')
      profile.confidence_score += 10
    }

    // 4. Fetch federal contracts
    const awards = await fetchAirtableRecords(
      'tblAwards',
      `SEARCH(LOWER("${name}"), LOWER({recipient_name}))`
    )

    if (awards.length > 0) {
      profile.federal_contracts = awards.map((a: any) => ({
        recipient: a.recipient_name || name,
        amount: a.award_amount || 0,
        agency: a.agency || '',
        date: a.award_date || '',
      }))
      profile.data_sources.push('USASpending')
      profile.confidence_score += 20

      // Risk flag si hay contratos federales (verificar compliance)
      const totalValue = profile.federal_contracts.reduce((s, c) => s + c.amount, 0)
      if (totalValue > 1_000_000) {
        profile.risk_flags.push(`High federal contract exposure ($${(totalValue / 1_000_000).toFixed(1)}M)`)
      }
    }

    // 5. Buscar relaciones con otros avatares
    const relationships = await fetchAirtableRecords(
      'tblAvatarRelationships',
      `OR(SEARCH(LOWER("${name}"), LOWER({avatar_1})), SEARCH(LOWER("${name}"), LOWER({avatar_2})))`
    )

    if (relationships.length > 0) {
      profile.relationships = relationships.map((r: any) => ({
        related_avatar: r.avatar_1 === name ? r.avatar_2 : r.avatar_1,
        relationship: r.relationship_type || 'related',
        confidence: r.confidence || 50,
      }))
      profile.data_sources.push('Avatar Network')
    }

    // 6. Calcular investigation score
    profile.investigation_score = Math.min(profile.confidence_score + (profile.properties.length * 5) + (profile.contacts.length * 3), 100)

    // 7. Risk assessment
    if (profile.confidence_score < 30) profile.risk_flags.push('Low confidence data')
    if (profile.properties.length === 0 && profile.entity_type === 'corporation') profile.risk_flags.push('No property records found')
    if (profile.contacts.length === 0) profile.risk_flags.push('No contact information discovered')
    if (!profile.data_sources.includes('USASpending') && profile.entity_type === 'corporation') {
      profile.risk_flags.push('No federal contract history')
    }

    // Limitar risk_flags a 5
    if (profile.risk_flags.length > 5) {
      profile.risk_flags = profile.risk_flags.slice(0, 5)
    }

    console.log(`[INVESTIGATOR] Perfil completado: ${profile.investigation_score}/100`)
  } catch (error) {
    console.error(`[INVESTIGATOR] Error construyendo perfil:`, error)
    profile.risk_flags.push('Profile construction error')
  }

  return profile
}

async function saveAvatarProfile(profile: AvatarProfile): Promise<string | null> {
  try {
    const payload = {
      fields: {
        'name': profile.name,
        'entity_type': profile.entity_type,
        'relationship_type': profile.relationship_type,
        'confidence_score': profile.confidence_score,
        'data_sources_json': JSON.stringify(profile.data_sources),
        'properties_count': profile.properties.length,
        'contacts_count': profile.contacts.length,
        'federal_contracts': profile.federal_contracts?.length || 0,
        'federal_contract_value': profile.federal_contracts?.reduce((s, c) => s + c.amount, 0) || 0,
        'investigation_score': profile.investigation_score,
        'risk_flags_json': JSON.stringify(profile.risk_flags),
        'relationships_count': profile.relationships.length,
        'investigator_notes': `Complete profile integrated from ${profile.data_sources.length} sources. Investigation score: ${profile.investigation_score}/100. Updated ${new Date().toISOString()}`,
        'phone': profile.phone || '',
        'email': profile.email || '',
        'address': profile.address || '',
        'city': profile.city || '',
        'state': profile.state || '',
        'zip': profile.zip || '',
      },
    }

    const res = await fetch(`https://api.airtable.com/v0/${BASE}/${TBL_AVATARS}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    })

    if (res.ok) {
      const data = await res.json()
      console.log(`[AIRTABLE] Avatar guardado: ${profile.name} (${data.id})`)
      return data.id
    } else {
      console.error(`[AIRTABLE] Error: ${res.status}`)
      return null
    }
  } catch (error) {
    console.error(`[AIRTABLE] Save error:`, error)
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, entity_type, county } = await req.json()

    if (!name) {
      return NextResponse.json(
        { error: 'name requerido' },
        { status: 400 }
      )
    }

    // Construir perfil investigativo
    const profile = await buildAvatarProfile(name, entity_type || 'Unknown', county)

    // Guardar en Airtable
    const savedId = await saveAvatarProfile(profile)

    return NextResponse.json({
      avatar_profile: profile,
      saved_to_airtable: savedId,
      investigation_complete: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[INVESTIGATOR API] Error:', error)
    return NextResponse.json(
      { error: 'Investigator error', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name')
  const entity_type = searchParams.get('entity_type')
  const county = searchParams.get('county')

  if (!name) {
    return NextResponse.json(
      { error: 'name query param requerido' },
      { status: 400 }
    )
  }

  const profile = await buildAvatarProfile(name, entity_type || 'Unknown', county || undefined)
  const savedId = await saveAvatarProfile(profile)

  return NextResponse.json({
    avatar_profile: profile,
    saved_to_airtable: savedId,
    investigation_complete: true,
  })
}
