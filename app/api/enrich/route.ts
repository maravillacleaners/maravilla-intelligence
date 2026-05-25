import config from '@/config/config'

interface ProspectData {
  legal_name: string
  business_email?: string
  phone?: string
  website?: string
  county?: string
}

interface EnrichedData extends ProspectData {
  employees_estimate?: number
  revenue_estimate?: string
  business_type?: string
  key_signals?: string[]
  data_sources?: string[]
  enriched_at: string
}

async function enrichCompanyData(prospect: ProspectData): Promise<EnrichedData> {
  const enriched: EnrichedData = {
    ...prospect,
    enriched_at: new Date().toISOString(),
    data_sources: [],
    key_signals: [],
  }

  // Mock enrichment - in production, query real APIs (Sunbiz, SAM.gov, Crunchbase, etc.)
  const nameLower = prospect.legal_name.toLowerCase()

  // Estimate business type from name patterns
  if (nameLower.includes('properties') || nameLower.includes('property')) {
    enriched.business_type = 'Property Management'
    enriched.key_signals?.push('property management software', 'multiple locations')
  } else if (nameLower.includes('solutions') || nameLower.includes('services')) {
    enriched.business_type = 'Service Provider'
    enriched.key_signals?.push('service provider', 'scalable operations')
  } else if (nameLower.includes('infrastructure')) {
    enriched.business_type = 'Infrastructure/Construction'
    enriched.key_signals?.push('government contracts', 'infrastructure')
  } else {
    enriched.business_type = 'Facilities'
    enriched.key_signals?.push('facilities management')
  }

  // Revenue estimate (mock data)
  const revenues = ['$1M - $5M', '$5M - $10M', '$10M - $50M', '$50M+']
  enriched.revenue_estimate = revenues[Math.floor(Math.random() * revenues.length)]

  // Employee estimate (mock data)
  enriched.employees_estimate = Math.floor(Math.random() * 500) + 10

  // Data sources
  enriched.data_sources = ['Company Name Pattern Analysis']

  // If website provided, could query for more info (mock)
  if (prospect.website) {
    enriched.data_sources.push('Website Analysis')
    enriched.key_signals?.push('online presence')
  }

  // If email provided, check domain
  if (prospect.business_email) {
    const domain = prospect.business_email.split('@')[1]
    if (domain && !domain.includes('gmail') && !domain.includes('yahoo')) {
      enriched.key_signals?.push('business email')
      enriched.data_sources.push('Email Domain Verification')
    }
  }

  return enriched
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Handle both single prospect and array of prospects
    const prospects = Array.isArray(body) ? body : [body]

    console.log(`[API /enrich] Processing ${prospects.length} prospect(s)`)

    const enrichedProspects = await Promise.all(
      prospects.map((prospect) => enrichCompanyData(prospect))
    )

    return Response.json({
      success: true,
      count: enrichedProspects.length,
      data: Array.isArray(body) ? enrichedProspects : enrichedProspects[0],
    })
  } catch (error) {
    console.error('[API /enrich] Error:', error)
    return Response.json(
      { error: 'Failed to enrich prospect data', details: String(error) },
      { status: 500 }
    )
  }
}
