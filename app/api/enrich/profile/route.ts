/**
 * Profile Enrichment API with SSE Streaming
 *
 * POST /api/enrich/profile?id=<leadId>&entity_name=<name>&domain=<domain>
 *
 * Returns SSE stream with real-time enrichment progress from 5 sources:
 * 1. Apollo.io - person/company lookup
 * 2. Hunter.io - email patterns
 * 3. HigherGov - decision makers
 * 4. USASpending - contract history
 * 5. SAM.gov - registration data
 * 6. Claude - profile synthesis
 */

import { NextRequest } from 'next/server'
import { readAuth } from '@/lib/auth'

const AIRTABLE_API_URL = 'https://api.airtable.com/v0'
const APOLLO_API_KEY = process.env.APOLLO_API_KEY
const HUNTER_API_KEY = process.env.HUNTER_API_KEY
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

// ──────────────────────────────────────────────────────────────────────────────
// HELPER: Stream SSE response
// ──────────────────────────────────────────────────────────────────────────────

function sseEvent(source: string, status: string, data?: any) {
  const payload = { source, status, data: data || {} }
  return `data: ${JSON.stringify(payload)}\n\n`
}

// ──────────────────────────────────────────────────────────────────────────────
// SOURCE 1: Apollo.io
// ──────────────────────────────────────────────────────────────────────────────

async function apolloSearch(entity_name: string, domain?: string) {
  if (!APOLLO_API_KEY) return { people: [], organization: null }

  try {
    const res = await fetch('https://api.apollo.io/v1/people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': APOLLO_API_KEY,
      },
      body: JSON.stringify({
        q_organization_domains: domain ? [domain] : [],
        q_keywords: entity_name,
        page: 1,
        per_page: 5,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      console.warn(`[Apollo] Search failed: ${res.status}`)
      return { people: [], organization: null }
    }

    const json = await res.json()
    return {
      people: (json?.people || []).map((p: any) => ({
        name: p.name,
        title: p.title,
        email: p.email,
        phone: p.phone_numbers?.[0],
        linkedin: p.linkedin_url,
        employment_history: p.employment_history || [],
      })),
      organization: json?.organization,
    }
  } catch (err) {
    console.error('[Apollo] Error:', err)
    return { people: [], organization: null }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// SOURCE 2: Hunter.io
// ──────────────────────────────────────────────────────────────────────────────

async function hunterSearch(domain: string) {
  if (!HUNTER_API_KEY || !domain) return { pattern: null, emails: [] }

  try {
    const res = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${HUNTER_API_KEY}&limit=5`,
      { signal: AbortSignal.timeout(10000) }
    )

    if (!res.ok) {
      console.warn(`[Hunter] Search failed: ${res.status}`)
      return { pattern: null, emails: [] }
    }

    const json = await res.json()
    const data = json?.data || {}

    return {
      pattern: data.pattern || null,
      emails: (data.emails || []).map((e: any) => e.value),
      estimated_contacts: data.total || 0,
    }
  } catch (err) {
    console.error('[Hunter] Error:', err)
    return { pattern: null, emails: [] }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// SOURCE 3: HigherGov
// ──────────────────────────────────────────────────────────────────────────────

async function highergovSearch(entity_name: string, location?: string) {
  // This is a stub - HigherGov integration would go here
  // For now, return empty but properly structured
  return {
    decision_makers: [],
    agencies: [],
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// SOURCE 4: USASpending
// ──────────────────────────────────────────────────────────────────────────────

async function usaspendingSearch(entity_name: string) {
  try {
    // Query USASpending API for contracts matching entity name
    const res = await fetch(
      `https://api.usaspending.gov/api/v2/awards/search/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            keyword_search: entity_name,
          },
          page: 1,
          limit: 10,
        }),
        signal: AbortSignal.timeout(10000),
      }
    )

    if (!res.ok) return { contracts: [], total: 0 }

    const json = await res.json()
    return {
      contracts: (json?.results || []).map((c: any) => ({
        id: c.id,
        description: c.description,
        total_obligation: c.total_obligation,
        action_date: c.action_date,
        awarding_agency: c.awarding_agency?.name,
      })),
      total: json?.page_metadata?.total_transactions || 0,
    }
  } catch (err) {
    console.error('[USASpending] Error:', err)
    return { contracts: [], total: 0 }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// SOURCE 5: SAM.gov
// ──────────────────────────────────────────────────────────────────────────────

async function samgovSearch(entity_name: string) {
  try {
    // Query SAM.gov API for entity registration
    const res = await fetch(
      `https://api.sam.gov/entity-information-public-api/v1/entities?name=${encodeURIComponent(entity_name)}&api_key=${process.env.SAM_API_KEY}`,
      { signal: AbortSignal.timeout(10000) }
    )

    if (!res.ok) return { entities: [] }

    const json = await res.json()
    return {
      entities: (json?.entityData || []).map((e: any) => ({
        name: e.entityRegistration?.legalBusinessName,
        duns: e.entityRegistration?.dunsNumber,
        address: e.entityRegistration?.mailingAddress,
        status: e.entityRegistration?.registrationStatus,
      })),
    }
  } catch (err) {
    console.error('[SAM.gov] Error:', err)
    return { entities: [] }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// SOURCE 6: Claude Synthesis
// ──────────────────────────────────────────────────────────────────────────────

async function claudeSynthesis(data: any) {
  if (!ANTHROPIC_API_KEY) {
    return {
      profile: 'Unable to synthesize profile without API key',
      icebreaker: 'Contact for more information',
    }
  }

  try {
    const prompt = `
Based on the following enrichment data, write a concise professional profile (2-3 sentences) and an icebreaker message.

Data:
- People: ${JSON.stringify(data.apollo?.people || [])}
- Email patterns: ${JSON.stringify(data.hunter?.pattern || [])}
- Contracts: ${JSON.stringify(data.usaspending?.contracts?.slice(0, 3) || [])}
- SAM registration: ${JSON.stringify(data.samgov?.entities?.[0] || {})}

Write:
1. A brief professional profile
2. An icebreaker message for cold outreach

Format as JSON with keys: profile, icebreaker
`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-1',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      const err = await res.text()
      console.warn(`[Claude] Synthesis failed: ${err}`)
      return {
        profile: 'Unable to synthesize profile',
        icebreaker: 'Contact for more information',
      }
    }

    const json = await res.json()
    const text = json?.content?.[0]?.text || '{}'

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    return {
      profile: text,
      icebreaker: 'Contact for more information',
    }
  } catch (err) {
    console.error('[Claude] Error:', err)
    return {
      profile: 'Unable to synthesize profile',
      icebreaker: 'Contact for more information',
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Airtable Save
// ──────────────────────────────────────────────────────────────────────────────

async function saveToAirtable(
  leadId: string,
  enrichmentData: any
) {
  if (!AIRTABLE_API_KEY) return

  try {
    const { apollo, hunter, usaspending, samgov, synthesis } = enrichmentData

    // Extract decision maker info
    const person = apollo?.people?.[0]
    const decisionMakerEmail = person?.email || hunter?.emails?.[0]

    const updates = {
      fields: {
        Google_Connected: false, // Will be set by Gmail OAuth
        enrichment_status: 'done',
        enrichment_sources: JSON.stringify(['apollo', 'hunter', 'usaspending', 'samgov', 'claude']),
        decision_maker_name: person?.name,
        decision_maker_email: decisionMakerEmail,
        decision_maker_phone: person?.phone,
        decision_maker_linkedin: person?.linkedin,
        colleagues_json: JSON.stringify(apollo?.people || []),
        contract_history: JSON.stringify(usaspending?.contracts || []),
        enrichment_profile: synthesis?.profile,
        enrichment_icebreaker: synthesis?.icebreaker,
        last_enriched: new Date().toISOString(),
      },
    }

    await fetch(`${AIRTABLE_API_URL}/appTjW3FwMPLQrw2t/Prospects/${leadId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })

    console.log(`[Airtable] Saved enrichment for ${leadId}`)
  } catch (err) {
    console.error('[Airtable] Save failed:', err)
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Endpoint
// ──────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth check
  const auth = await readAuth(req)
  if (!auth?.user_id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const entity_name = searchParams.get('entity_name')
  const domain = searchParams.get('domain')

  if (!id || !entity_name) {
    return new Response('Missing required parameters', { status: 400 })
  }

  // Return SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (source: string, status: string, data?: any) => {
        controller.enqueue(new TextEncoder().encode(sseEvent(source, status, data)))
      }

      try {
        // Emit start
        sendEvent('system', 'start', { entity_name, domain })

        // Run all sources in parallel
        const [apollo, hunter, usaspending, samgov] = await Promise.all([
          apolloSearch(entity_name, domain),
          hunterSearch(domain || ''),
          usaspendingSearch(entity_name),
          samgovSearch(entity_name),
        ])

        // Emit results
        sendEvent('apollo', 'done', apollo)
        sendEvent('hunter', 'done', hunter)
        sendEvent('usaspending', 'done', usaspending)
        sendEvent('samgov', 'done', samgov)

        // Synthesis (uses results from above)
        const synthesis = await claudeSynthesis({
          apollo,
          hunter,
          usaspending,
          samgov,
        })
        sendEvent('synthesis', 'done', synthesis)

        // Save to Airtable
        const enrichmentData = { apollo, hunter, usaspending, samgov, synthesis }
        await saveToAirtable(id, enrichmentData)

        // Emit completion
        sendEvent('system', 'done', enrichmentData)

        controller.close()
      } catch (err) {
        console.error('[Profile Enrichment] Error:', err)
        sendEvent('system', 'error', { message: String(err) })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
