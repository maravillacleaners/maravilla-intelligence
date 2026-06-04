import { NextRequest, NextResponse } from 'next/server'

const BASE = 'appZhXnyFiKbnOZLr'
const TBL_CONTACTS = 'tblContacts'
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY || 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92'

interface Contact {
  name: string
  title: string
  department: string
  company: string
  email?: string
  phone?: string
  phone_mobile?: string
  linkedin_url?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  confidence: number
  source: 'Hunter' | 'RocketReach' | 'Apollo' | 'Clearbit' | 'LinkedIn'
  verified: boolean
  last_verified: string
}

/**
 * CONTACT FINDER SCRAPER - Inteligencia investigativa de personas
 * Busca: nombres, teléfonos, correos, LinkedIn, títulos
 *
 * Utiliza APIs de Hunter.io, RocketReach, Apollo, Clearbit, LinkedIn
 * Integra con Airtable para mapear avatares
 */

async function searchByHunter(company_domain: string): Promise<Contact[]> {
  const hunterKey = process.env.HUNTER_API_KEY
  if (!hunterKey) {
    console.log('[HUNTER] HUNTER_API_KEY no configurada')
    return []
  }

  console.log(`[HUNTER] Buscando en dominio: ${company_domain}`)

  try {
    const url = `https://api.hunter.io/v2/domain-search?domain=${company_domain}&limit=100`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      console.log(`[HUNTER] HTTP ${res.status}`)
      return []
    }

    const data = await res.json()
    const contacts: Contact[] = []

    if (data.data?.emails) {
      for (const email of data.data.emails) {
        contacts.push({
          name: `${email.first_name || ''} ${email.last_name || ''}`.trim(),
          title: email.position || 'Employee',
          department: inferDepartment(email.position || ''),
          company: company_domain,
          email: email.value,
          phone: email.phone_number,
          linkedin_url: email.linkedin_url,
          confidence: email.confidence || 75,
          source: 'Hunter',
          verified: email.verification?.status === 'valid',
          last_verified: new Date().toISOString(),
        })
      }
    }

    console.log(`[HUNTER] Encontrados ${contacts.length} contactos`)
    return contacts
  } catch (error) {
    console.error(`[HUNTER] Error:`, error)
    return []
  }
}

async function searchByRocketReach(company_name: string): Promise<Contact[]> {
  const rocketKey = process.env.ROCKETREACH_API_KEY
  if (!rocketKey) {
    console.log('[ROCKETREACH] API key no configurada')
    return []
  }

  console.log(`[ROCKETREACH] Buscando: ${company_name}`)

  try {
    const url = 'https://api.rocketsourcer.com/v1/rest/companies'
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Api-Key': rocketKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: company_name,
        limit: 50,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) return []

    const data = await res.json()
    const contacts: Contact[] = []

    if (data.data?.[0]?.contacts) {
      for (const contact of data.data[0].contacts) {
        contacts.push({
          name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
          title: contact.title || '',
          department: inferDepartment(contact.title || ''),
          company: company_name,
          email: contact.email,
          phone: contact.phone,
          linkedin_url: contact.linkedin,
          address: contact.address,
          city: contact.city,
          state: contact.state,
          zip: contact.zip,
          confidence: 70,
          source: 'RocketReach',
          verified: !!contact.verified,
          last_verified: new Date().toISOString(),
        })
      }
    }

    console.log(`[ROCKETREACH] Encontrados ${contacts.length} contactos`)
    return contacts
  } catch (error) {
    console.error(`[ROCKETREACH] Error:`, error)
    return []
  }
}

async function searchByApollo(company_name: string): Promise<Contact[]> {
  const apolloKey = process.env.APOLLO_API_KEY
  if (!apolloKey) {
    console.log('[APOLLO] API key no configurada')
    return []
  }

  console.log(`[APOLLO] Buscando: ${company_name}`)

  try {
    const url = 'https://api.apollo.io/v1/mixed_companies/search'
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apolloKey,
      },
      body: JSON.stringify({
        q_organization_name: company_name,
        limit: 100,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) return []

    const data = await res.json()
    const contacts: Contact[] = []

    if (data.contacts) {
      for (const contact of data.contacts) {
        contacts.push({
          name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
          title: contact.title || '',
          department: inferDepartment(contact.title || ''),
          company: company_name,
          email: contact.email,
          phone: contact.phone_numbers?.[0],
          phone_mobile: contact.mobile_numbers?.[0],
          linkedin_url: contact.linkedin_url,
          city: contact.city,
          state: contact.state,
          zip: contact.postal_code,
          confidence: contact.confidence_score || 65,
          source: 'Apollo',
          verified: contact.email_status === 'verified',
          last_verified: new Date().toISOString(),
        })
      }
    }

    console.log(`[APOLLO] Encontrados ${contacts.length} contactos`)
    return contacts
  } catch (error) {
    console.error(`[APOLLO] Error:`, error)
    return []
  }
}

async function searchByClearbit(email: string): Promise<Contact | null> {
  const clearbitKey = process.env.CLEARBIT_API_KEY
  if (!clearbitKey) {
    console.log('[CLEARBIT] API key no configurada')
    return null
  }

  console.log(`[CLEARBIT] Enriqueciendo: ${email}`)

  try {
    const url = `https://person-stream.clearbit.com/v2/combined/find?email=${email}`
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${clearbitKey}`,
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return null

    const data = await res.json()

    if (data.person) {
      const person = data.person
      return {
        name: person.name?.fullName || '',
        title: person.employment?.title || '',
        department: inferDepartment(person.employment?.title || ''),
        company: data.company?.name || '',
        email,
        phone: person.phone,
        linkedin_url: person.linkedin?.handle ? `https://linkedin.com/in/${person.linkedin.handle}` : undefined,
        address: `${person.location?.streetNumber || ''} ${person.location?.streetName || ''}`.trim(),
        city: person.location?.city,
        state: person.location?.state,
        zip: person.location?.postalCode,
        confidence: 90,
        source: 'Clearbit',
        verified: true,
        last_verified: new Date().toISOString(),
      }
    }
  } catch (error) {
    console.error(`[CLEARBIT] Error:`, error)
  }

  return null
}

function inferDepartment(title: string): string {
  const lower = title.toLowerCase()

  if (lower.includes('ceo') || lower.includes('president') || lower.includes('founder')) return 'Executive'
  if (lower.includes('cto') || lower.includes('engineer') || lower.includes('developer')) return 'Technology'
  if (lower.includes('sales') || lower.includes('account executive') || lower.includes('business dev')) return 'Sales'
  if (lower.includes('marketing') || lower.includes('growth')) return 'Marketing'
  if (lower.includes('finance') || lower.includes('controller') || lower.includes('accountant')) return 'Finance'
  if (lower.includes('human') || lower.includes('hr') || lower.includes('recruiter')) return 'HR'
  if (lower.includes('operations') || lower.includes('logistics')) return 'Operations'
  if (lower.includes('procurement') || lower.includes('buyer')) return 'Procurement'
  if (lower.includes('facilities') || lower.includes('facilities management')) return 'Facilities'
  if (lower.includes('general manager') || lower.includes('manager')) return 'Management'

  return 'Unknown'
}

async function saveContactsToAirtable(contacts: Contact[], company_id?: string) {
  const savedIds: string[] = []

  for (const contact of contacts) {
    try {
      const payload = {
        fields: {
          'name': contact.name,
          'title': contact.title,
          'department': contact.department,
          'company': contact.company,
          'email': contact.email || '',
          'phone': contact.phone || '',
          'phone_mobile': contact.phone_mobile || '',
          'linkedin_url': contact.linkedin_url || '',
          'address': contact.address || '',
          'city': contact.city || '',
          'state': contact.state || '',
          'zip': contact.zip || '',
          'confidence': contact.confidence,
          'data_source': contact.source,
          'verified': contact.verified,
          'last_verified': contact.last_verified,
          'company_id': company_id || '',
          'investigator_notes': `Contact discovered via ${contact.source} on ${new Date().toISOString()}`,
        },
      }

      const res = await fetch(`https://api.airtable.com/v0/${BASE}/${TBL_CONTACTS}`, {
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
        console.log(`[AIRTABLE] Contacto guardado: ${contact.name} (${contact.email})`)
      }
    } catch (error) {
      console.error(`[AIRTABLE] Error:`, error)
    }
  }

  return savedIds
}

export async function POST(req: NextRequest) {
  try {
    const { company_name, company_domain, email, company_id } = await req.json()

    if (!company_name && !company_domain && !email) {
      return NextResponse.json(
        { error: 'company_name, company_domain o email requerido' },
        { status: 400 }
      )
    }

    const allContacts: Contact[] = []

    // Multi-fuente búsqueda
    if (company_domain) {
      const hunterResults = await searchByHunter(company_domain)
      allContacts.push(...hunterResults)
    }

    if (company_name) {
      const rocketResults = await searchByRocketReach(company_name)
      const apolloResults = await searchByApollo(company_name)
      allContacts.push(...rocketResults, ...apolloResults)
    }

    if (email) {
      const clearbitResult = await searchByClearbit(email)
      if (clearbitResult) allContacts.push(clearbitResult)
    }

    // Deduplicar por email
    const dedupMap = new Map<string, Contact>()
    for (const contact of allContacts) {
      const key = contact.email || contact.name
      if (!dedupMap.has(key) || (contact.confidence > (dedupMap.get(key)?.confidence || 0))) {
        dedupMap.set(key, contact)
      }
    }

    const uniqueContacts = Array.from(dedupMap.values())
    const savedIds = await saveContactsToAirtable(uniqueContacts, company_id)

    return NextResponse.json({
      contacts: uniqueContacts,
      saved_to_airtable: savedIds,
      count: uniqueContacts.length,
      sources: [...new Set(uniqueContacts.map((c) => c.source))],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[CONTACT-FINDER API] Error:', error)
    return NextResponse.json(
      { error: 'Scraper error', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const company_name = searchParams.get('company_name')
  const company_domain = searchParams.get('company_domain')
  const email = searchParams.get('email')
  const company_id = searchParams.get('company_id')

  if (!company_name && !company_domain && !email) {
    return NextResponse.json(
      { error: 'company_name, company_domain o email query param requerido' },
      { status: 400 }
    )
  }

  const allContacts: Contact[] = []

  if (company_domain) {
    const hunterResults = await searchByHunter(company_domain)
    allContacts.push(...hunterResults)
  }

  if (company_name) {
    const rocketResults = await searchByRocketReach(company_name)
    const apolloResults = await searchByApollo(company_name)
    allContacts.push(...rocketResults, ...apolloResults)
  }

  if (email) {
    const clearbitResult = await searchByClearbit(email)
    if (clearbitResult) allContacts.push(clearbitResult)
  }

  const dedupMap = new Map<string, Contact>()
  for (const contact of allContacts) {
    const key = contact.email || contact.name
    if (!dedupMap.has(key) || (contact.confidence > (dedupMap.get(key)?.confidence || 0))) {
      dedupMap.set(key, contact)
    }
  }

  const uniqueContacts = Array.from(dedupMap.values())
  const savedIds = await saveContactsToAirtable(uniqueContacts, company_id || undefined)

  return NextResponse.json({
    contacts: uniqueContacts,
    saved_to_airtable: savedIds,
    count: uniqueContacts.length,
    sources: [...new Set(uniqueContacts.map((c) => c.source))],
  })
}
