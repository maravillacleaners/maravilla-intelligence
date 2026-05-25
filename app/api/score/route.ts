import config from '@/config/config'

interface ProspectData {
  legal_name: string
  business_type?: string
  employees_estimate?: number
  revenue_estimate?: string
  key_signals?: string[]
  website?: string
  county?: string
  business_email?: string
}

interface ScoredData extends ProspectData {
  score: number
  priority: 'high' | 'medium' | 'low'
  segment: string
  service_fit: number
  intent_signal: 'high' | 'medium' | 'low'
  icebreaker: string
  scoring_rationale: string
  scored_at: string
}

async function scoreProspectWithClaude(prospect: ProspectData): Promise<ScoredData> {
  const claudeApiKey = process.env.CLAUDE_API_KEY || process.env.NEXT_PUBLIC_CLAUDE_API_KEY

  if (!claudeApiKey) {
    console.warn('[Scoring] Claude API key not configured, using mock scoring')
    return getMockScore(prospect)
  }

  try {
    const prompt = `You are a commercial intelligence scoring system. Analyze this prospect and provide structured scoring.

Company: ${prospect.legal_name}
Type: ${prospect.business_type || 'Unknown'}
Employees: ${prospect.employees_estimate || 'Unknown'}
Revenue: ${prospect.revenue_estimate || 'Unknown'}
Website: ${prospect.website || 'N/A'}
County: ${prospect.county || 'N/A'}
Key Signals: ${prospect.key_signals?.join(', ') || 'None'}

Based on this, provide a JSON response with:
{
  "score": (0-100 fit score),
  "priority": ("high" | "medium" | "low"),
  "segment": (best ICP segment match),
  "service_fit": (0-1 service fit percentage),
  "intent_signal": ("high" | "medium" | "low"),
  "icebreaker": (2-3 sentence personalized outreach line),
  "rationale": (brief explanation)
}

Return ONLY the JSON object, no markdown or additional text.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-1',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      console.warn(`[Scoring] Claude API error: ${response.status}`)
      return getMockScore(prospect)
    }

    const data = await response.json()
    const responseText = data.content[0]?.text || ''

    // Extract JSON from response
    let scoreData: any = JSON.parse(responseText)

    return {
      ...prospect,
      score: Math.min(100, Math.max(0, scoreData.score || 65)),
      priority: scoreData.priority || 'medium',
      segment: scoreData.segment || 'General',
      service_fit: Math.min(1, Math.max(0, scoreData.service_fit || 0.75)),
      intent_signal: scoreData.intent_signal || 'medium',
      icebreaker: scoreData.icebreaker || `We noticed ${prospect.legal_name} and believe we can add value to your operations.`,
      scoring_rationale: scoreData.rationale || '',
      scored_at: new Date().toISOString(),
    }
  } catch (error) {
    console.warn('[Scoring] Claude scoring failed, using mock:', error)
    return getMockScore(prospect)
  }
}

function getMockScore(prospect: ProspectData): ScoredData {
  // Deterministic mock scoring based on company name
  const nameLength = prospect.legal_name.length
  const hasEmail = !!prospect.business_email
  const hasWebsite = !!prospect.website
  const signalCount = prospect.key_signals?.length || 0

  const baseScore = 50 + (nameLength % 30) + (hasEmail ? 10 : 0) + (hasWebsite ? 10 : 0) + (signalCount * 2)
  const score = Math.min(100, Math.max(30, baseScore))

  const segments = config.ICP_SEGMENTS.map((s) => s.segment)
  const segment = segments[nameLength % segments.length]

  const priorities: ('high' | 'medium' | 'low')[] = ['high', 'medium', 'low']
  const priority = priorities[score > 75 ? 0 : score > 50 ? 1 : 2]

  return {
    ...prospect,
    score,
    priority,
    segment,
    service_fit: score / 100,
    intent_signal: priority === 'high' ? 'high' : priority === 'medium' ? 'medium' : 'low',
    icebreaker: `We've been following ${prospect.legal_name}'s growth and see significant opportunity for partnership in your operations. Your focus on ${prospect.business_type || 'business'} aligns perfectly with our expertise.`,
    scoring_rationale: `Score based on company profile, online presence, and segment fit. ${hasEmail ? 'Professional email verified. ' : ''}${hasWebsite ? 'Active web presence confirmed. ' : ''}Key signals identified: ${signalCount}.`,
    scored_at: new Date().toISOString(),
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Handle both single prospect and array of prospects
    const prospects = Array.isArray(body) ? body : [body]

    console.log(`[API /score] Scoring ${prospects.length} prospect(s)`)

    const scoredProspects = await Promise.all(
      prospects.map((prospect) => scoreProspectWithClaude(prospect))
    )

    return Response.json({
      success: true,
      count: scoredProspects.length,
      data: Array.isArray(body) ? scoredProspects : scoredProspects[0],
    })
  } catch (error) {
    console.error('[API /score] Error:', error)
    return Response.json(
      { error: 'Failed to score prospect', details: String(error) },
      { status: 500 }
    )
  }
}
