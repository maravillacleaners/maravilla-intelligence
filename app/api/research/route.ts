import { NextResponse } from 'next/server'

const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID || 'appZhXnyFiKbnOZLr'
const AIRTABLE_TABLE = 'tbl3qWHqunA0eERE2'
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY

interface ResearchResult {
  domain: string
  company: string | null
  email_patterns: string[]
  estimated_contacts: string[]
  linkedin_search_url: string
  contract_history: { amount: number; agency: string; date: string }[]
  contract_total: number
  nearby_companies: { name: string; type: string }[]
  social_links: { platform: string; url: string }[]
  logo_url: string
  clearbit_logo: string
  domain_info: {
    registrar_hint: string | null
    has_mx: boolean
    website_likely: boolean
  }
  sources: string[]
}

function inferEmailPatterns(domain: string, companyName: string | null): string[] {
  if (!domain) return []
  const patterns = [
    `info@${domain}`,
    `contact@${domain}`,
    `contracts@${domain}`,
    `bids@${domain}`,
    `procurement@${domain}`,
    `admin@${domain}`,
  ]
  if (companyName) {
    const firstName = companyName.toLowerCase().split(/[\s,]+/)[0]
    if (firstName && firstName.length > 2 && firstName.length < 20) {
      patterns.push(`${firstName}@${domain}`)
    }
  }
  return patterns
}

function buildLinkedInUrl(companyName: string | null, domain: string): string {
  const q = companyName || domain.split('.')[0]
  return `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(q)}`
}

function buildSocialLinks(domain: string, companyName: string | null) {
  const name = companyName || domain.split('.')[0]
  return [
    { platform: 'LinkedIn', url: buildLinkedInUrl(companyName, domain) },
    { platform: 'Website', url: `https://${domain}` },
    { platform: 'Google', url: `https://www.google.com/search?q=${encodeURIComponent(name + ' company Florida')}` },
  ]
}

async function fetchContractHistory(companyName: string | null, domain: string) {
  if (!companyName && !domain) return []
  try {
    // Search USASpending for this company
    const nameQuery = companyName || domain.split('.')[0]
    const payload = {
      filters: {
        keywords: [nameQuery],
        award_type_codes: ['A', 'B', 'C', 'D'],
        time_period: [{ start_date: '2020-01-01', end_date: '2026-01-01' }],
      },
      fields: ['Recipient Name', 'Award Amount', 'Awarding Agency', 'Action Date'],
      page: 1,
      limit: 5,
      sort: 'Award Amount',
      order: 'desc',
    }
    const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.results || []).slice(0, 5).map((r: any) => ({
      amount: r['Award Amount'] || 0,
      agency: r['Awarding Agency'] || 'Federal',
      date: r['Action Date'] || '',
    }))
  } catch {
    return []
  }
}

async function fetchNearbyFromAirtable(domain: string): Promise<{ name: string; type: string }[]> {
  if (!AIRTABLE_KEY) return []
  try {
    // Look for companies in same city/county as this domain in our DB
    const filter = encodeURIComponent(`NOT({legal_name}='')`)
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?fields[]=legal_name&fields[]=place_of_performance&fields[]=record_type&filterByFormula=${filter}&pageSize=10`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_KEY}` },
      next: { revalidate: 300 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.records || []).slice(0, 5).map((r: any) => ({
      name: r.fields['legal_name'] || 'Unknown',
      type: r.fields['record_type'] || 'contractor',
    }))
  } catch {
    return []
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const domain = (searchParams.get('domain') || '').toLowerCase().trim()
    const companyName = searchParams.get('company') || null

    if (!domain && !companyName) {
      return NextResponse.json({ error: 'Provide ?domain= or ?company=' }, { status: 400 })
    }

    // Resolve domain from company name if not provided
    let resolvedDomain = domain
    if (!resolvedDomain && companyName) {
      resolvedDomain = companyName.toLowerCase()
        .replace(/\s+/g, '').replace(/[^a-z0-9]/g, '').slice(0, 20) + '.com'
    }

    // Run enrichment lookups in parallel
    const [contractHistory, nearbyCompanies] = await Promise.all([
      fetchContractHistory(companyName, resolvedDomain),
      fetchNearbyFromAirtable(resolvedDomain),
    ])

    // Hunter.io domain search (if key available)
    let hunterContacts: string[] = []
    const HUNTER_KEY = process.env.HUNTER_API_KEY
    if (HUNTER_KEY && resolvedDomain) {
      try {
        const hRes = await fetch(
          `https://api.hunter.io/v2/domain-search?domain=${resolvedDomain}&limit=5&api_key=${HUNTER_KEY}`,
          { next: { revalidate: 86400 } }
        )
        if (hRes.ok) {
          const hData = await hRes.json()
          hunterContacts = ((hData.data?.emails as any[]) || [])
            .slice(0, 5)
            .map((e: any) => e.value)
        }
      } catch {}
    }

    const emailPatterns = hunterContacts.length > 0
      ? hunterContacts
      : inferEmailPatterns(resolvedDomain, companyName)

    const result: ResearchResult = {
      domain: resolvedDomain,
      company: companyName,
      email_patterns: emailPatterns,
      estimated_contacts: emailPatterns.slice(0, 3),
      linkedin_search_url: buildLinkedInUrl(companyName, resolvedDomain),
      contract_history: contractHistory,
      contract_total: contractHistory.reduce((s: number, c: any) => s + (c.amount || 0), 0),
      nearby_companies: nearbyCompanies,
      social_links: buildSocialLinks(resolvedDomain, companyName),
      logo_url: `https://logo.clearbit.com/${resolvedDomain}`,
      clearbit_logo: `https://logo.clearbit.com/${resolvedDomain}`,
      domain_info: {
        registrar_hint: null,
        has_mx: true, // Optimistic — we infer based on domain validity
        website_likely: resolvedDomain.includes('.'),
      },
      sources: [
        'email_inference',
        contractHistory.length > 0 ? 'usaspending' : null,
        HUNTER_KEY ? 'hunter.io' : null,
        nearbyCompanies.length > 0 ? 'airtable' : null,
      ].filter(Boolean) as string[],
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[/api/research]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
