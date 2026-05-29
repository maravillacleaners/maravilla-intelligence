/**
 * Government Contract Scoring API — Maravilla Cleaners Edition
 *
 * POST { record_id?: string, record?: object }
 *   → Fetches the Intelligence record from Airtable (if record_id given)
 *   → Scores it using Claude with Maravilla-specific criteria
 *   → Writes award_score + scoring_status back to Airtable
 *   → Returns { score, reasoning, record_id }
 *
 * Scoring criteria for Maravilla Cleaners (NAICS 561720, FL-based):
 *   - NAICS 561720/561700 in Florida     → 80-100 (High)
 *   - NAICS 561720/561700 outside FL     → 50-70  (Medium)
 *   - Award amount $100K-$2M             → preferred subcontracting size
 *   - Set-asides: SB/SDVOSB/WOSB/8(a)  → prefer these
 *   - Recency, performance location      → modifiers
 */

const AIRTABLE_API_URL = 'https://api.airtable.com/v0'

// ── Airtable Helpers ──────────────────────────────────────────────────────────

async function fetchIntelligenceRecord(recordId: string): Promise<any | null> {
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID
  if (!apiKey || !baseId) {
    console.error('[Score] Missing Airtable credentials')
    return null
  }

  try {
    const res = await fetch(
      `${AIRTABLE_API_URL}/${baseId}/Intelligence/${recordId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    )
    if (!res.ok) {
      console.error(`[Score] Airtable fetch error ${res.status} for record ${recordId}`)
      return null
    }
    return await res.json()
  } catch (err) {
    console.error('[Score] Airtable fetch failed:', err)
    return null
  }
}

async function writeScoreToAirtable(
  recordId: string,
  score: number,
  reasoning: string
): Promise<boolean> {
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID
  if (!apiKey || !baseId) return false

  try {
    const res = await fetch(
      `${AIRTABLE_API_URL}/${baseId}/Intelligence/${recordId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            award_score: score,
            scoring_status: 'scored',
            score_reasoning: reasoning.slice(0, 1000), // Airtable long-text limit guard
            scored_at: new Date().toISOString(),
          },
        }),
      }
    )

    if (!res.ok) {
      console.error(`[Score] Airtable write error ${res.status}`)
      return false
    }
    return true
  } catch (err) {
    console.error('[Score] Airtable write failed:', err)
    return false
  }
}

// ── Rule-Based Fallback Scorer ─────────────────────────────────────────────────

interface ScoreResult {
  score: number
  reasoning: string
  priority: 'high' | 'medium' | 'low'
}

function ruleBasedScore(fields: Record<string, any>): ScoreResult {
  let score = 30
  const reasons: string[] = []

  const naics = String(fields.naics_code || '')
  const perfState = String(
    fields.place_of_performance_state ||
    fields.performance_state ||
    fields.state ||
    ''
  ).toUpperCase()
  const setAside = String(
    fields.set_aside_type ||
    fields.set_aside ||
    fields.type_of_set_aside ||
    ''
  ).toLowerCase()
  const amount =
    Number(fields.award_amount || fields.estimated_value || fields.base_and_all_options_value || 0)

  // ── NAICS Scoring ──────────────────────────────────────────────────────────
  const isCleaningNaics =
    naics === '561720' ||
    naics === '561700' ||
    naics.startsWith('5617')

  if (isCleaningNaics && perfState === 'FL') {
    score += 50
    reasons.push(`NAICS ${naics} (janitorial) in Florida = highest relevance (+50)`)
  } else if (isCleaningNaics) {
    score += 25
    reasons.push(`NAICS ${naics} (janitorial) outside Florida = medium relevance (+25)`)
  } else if (naics.startsWith('561') || naics.startsWith('562')) {
    score += 10
    reasons.push(`Related facilities/cleaning NAICS ${naics} (+10)`)
  } else if (naics) {
    reasons.push(`NAICS ${naics} is outside cleaning sector — low match`)
  }

  // ── Geographic Scoring ────────────────────────────────────────────────────
  if (perfState === 'FL') {
    score += 15
    reasons.push('Performance location: Florida (+15)')
  } else if (['GA', 'SC', 'NC', 'AL', 'TN'].includes(perfState)) {
    score += 5
    reasons.push(`Performance location: neighboring state ${perfState} (+5)`)
  } else if (perfState) {
    reasons.push(`Performance location: ${perfState} — outside primary region`)
  }

  // ── Award Amount Scoring ──────────────────────────────────────────────────
  if (amount >= 100_000 && amount <= 2_000_000) {
    score += 15
    reasons.push(`Award $${amount.toLocaleString()} — ideal subcontracting range $100K-$2M (+15)`)
  } else if (amount > 2_000_000 && amount <= 10_000_000) {
    score += 10
    reasons.push(`Award $${amount.toLocaleString()} — large contract, subcontracting possible (+10)`)
  } else if (amount > 10_000_000) {
    score += 5
    reasons.push(`Award $${amount.toLocaleString()} — very large, harder to sub into (+5)`)
  } else if (amount > 0) {
    score += 3
    reasons.push(`Award $${amount.toLocaleString()} — below preferred range (+3)`)
  }

  // ── Set-Aside Scoring ─────────────────────────────────────────────────────
  const preferredSetAsides = [
    'small business',
    'small_business',
    'sba',
    'sdvosb',
    'service-disabled',
    'wosb',
    'women-owned',
    '8(a)',
    'hubzone',
    'total small',
  ]

  const matchedSetAside = preferredSetAsides.find((s) =>
    setAside.includes(s.replace('_', ' ').replace('-', ' '))
  )

  if (matchedSetAside) {
    score += 10
    reasons.push(`Set-aside: ${fields.set_aside_type || fields.set_aside} — preferred program (+10)`)
  } else if (setAside && setAside !== 'none' && setAside !== 'not applicable') {
    score += 3
    reasons.push(`Set-aside: ${setAside} (+3)`)
  }

  // ── Recency Bonus ─────────────────────────────────────────────────────────
  const dateStr =
    fields.action_date ||
    fields.discovery_date ||
    fields.award_date ||
    fields.posted_date ||
    null

  if (dateStr) {
    const postedDate = new Date(dateStr)
    const daysOld = Math.floor(
      (Date.now() - postedDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysOld <= 7) {
      score += 10
      reasons.push(`Posted ${daysOld}d ago — very recent (+10)`)
    } else if (daysOld <= 30) {
      score += 5
      reasons.push(`Posted ${daysOld}d ago — recent (+5)`)
    }
  }

  score = Math.min(100, Math.max(0, score))
  const priority: 'high' | 'medium' | 'low' =
    score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low'

  return {
    score,
    priority,
    reasoning: reasons.join('. ') || 'Insufficient data for detailed scoring.',
  }
}

// ── Claude-Powered Scorer ──────────────────────────────────────────────────────

const MARAVILLA_SYSTEM_PROMPT = `You are a government contract intelligence scoring assistant for Maravilla Cleaners LLC, a commercial cleaning company headquartered in Florida.

COMPANY PROFILE:
- Services: janitorial / commercial cleaning (NAICS 561720, 561710, 561700)
- Primary market: Florida (Lee County, Hillsborough, Pinellas, Duval, Miami-Dade)
- Revenue: ~$1.1M/year, growing
- Goal: find federal/state contracts to subcontract cleaning work under prime contractors
- Preferred contract size for subcontracting: $100K–$2M (manageable scope)
- Preferred set-asides: Small Business, SDVOSB, WOSB, 8(a), HUBZone

SCORING RULES (produce a 0-100 integer):
1. NAICS match:
   - 561720 or 561700 in Florida → base 80-100
   - 561720 or 561700 outside Florida → base 50-70
   - Related facilities NAICS (561xxx, 562xxx) → base 40-55
   - Unrelated NAICS → base 0-30
2. Award amount:
   - $100K–$2M → +15 (ideal subcontracting size)
   - $2M–$10M → +10 (large, possible)
   - >$10M or <$50K → +0 to +5
3. Set-aside programs:
   - Small Business / SDVOSB / WOSB / 8(a) / HUBZone → +10
   - Other set-aside → +3
   - Full and open → +0
4. Performance location:
   - Florida → +15
   - Southeast (GA, SC, NC, AL, TN) → +5
   - Elsewhere → +0
5. Recency: < 7 days old → +10, < 30 days → +5

INSTRUCTIONS:
- Return ONLY a valid JSON object, no markdown, no explanation outside the JSON.
- Be concise in reasoning (2-3 sentences max).
- Format:
{
  "score": <integer 0-100>,
  "priority": "<high|medium|low>",
  "reasoning": "<brief explanation>",
  "subcontracting_note": "<one sentence on how Maravilla could sub into this>"
}`

async function claudeScore(fields: Record<string, any>): Promise<ScoreResult & { subcontracting_note?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
  if (!apiKey) {
    console.warn('[Score] No Claude API key — using rule-based scoring')
    return ruleBasedScore(fields)
  }

  const contractSummary = {
    title: fields.title || fields.award_description || 'Unknown',
    naics_code: fields.naics_code || 'Unknown',
    award_amount: fields.award_amount || fields.estimated_value || 0,
    place_of_performance_state:
      fields.place_of_performance_state ||
      fields.performance_state ||
      fields.state ||
      'Unknown',
    set_aside_type:
      fields.set_aside_type ||
      fields.set_aside ||
      fields.type_of_set_aside ||
      'None',
    recipient_name:
      fields.recipient_name ||
      fields.awardee ||
      fields.contractor_name ||
      'Unknown',
    action_date:
      fields.action_date ||
      fields.award_date ||
      fields.posted_date ||
      null,
    description: fields.description || fields.scope || null,
  }

  const userMessage = `Score this government contract opportunity for Maravilla Cleaners:

${JSON.stringify(contractSummary, null, 2)}

Apply the scoring rules from your instructions and return the JSON object.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        system: MARAVILLA_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
      signal: AbortSignal.timeout(20000),
    })

    if (!res.ok) {
      console.warn(`[Score] Claude API error ${res.status}, falling back to rules`)
      return ruleBasedScore(fields)
    }

    const data = await res.json()
    const text: string = data?.content?.[0]?.text || ''

    // Strip any accidental markdown fences
    const jsonText = text
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '')
      .trim()

    const parsed = JSON.parse(jsonText)

    return {
      score: Math.min(100, Math.max(0, Number(parsed.score) || 0)),
      priority: (['high', 'medium', 'low'].includes(parsed.priority)
        ? parsed.priority
        : 'medium') as 'high' | 'medium' | 'low',
      reasoning: parsed.reasoning || '',
      subcontracting_note: parsed.subcontracting_note,
    }
  } catch (err) {
    console.warn('[Score] Claude scoring failed, using rules:', err)
    return ruleBasedScore(fields)
  }
}

// ── Route Handlers ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      record_id,
      record: inlineRecord,
      use_claude = true,
    } = body as {
      record_id?: string
      record?: Record<string, any>
      use_claude?: boolean
    }

    if (!record_id && !inlineRecord) {
      return Response.json(
        { error: 'Provide record_id (Airtable) or record (inline fields)' },
        { status: 400 }
      )
    }

    // Resolve fields
    let fields: Record<string, any> = {}
    let resolvedRecordId: string | null = record_id || null

    if (record_id) {
      const airtableRecord = await fetchIntelligenceRecord(record_id)
      if (!airtableRecord) {
        return Response.json(
          { error: `Record ${record_id} not found in Airtable Intelligence table` },
          { status: 404 }
        )
      }
      fields = airtableRecord.fields || {}
    } else if (inlineRecord) {
      fields = inlineRecord
    }

    // Score
    const result = use_claude
      ? await claudeScore(fields)
      : ruleBasedScore(fields)

    // Write back to Airtable if we have a record_id
    let wrote = false
    if (resolvedRecordId) {
      wrote = await writeScoreToAirtable(
        resolvedRecordId,
        result.score,
        result.reasoning
      )
    }

    console.log(
      `[API /score] Record ${resolvedRecordId || 'inline'}: score=${result.score} priority=${result.priority} wrote_to_airtable=${wrote}`
    )

    return Response.json({
      success: true,
      score: result.score,
      priority: result.priority,
      reasoning: result.reasoning,
      subcontracting_note: (result as any).subcontracting_note,
      record_id: resolvedRecordId,
      wrote_to_airtable: wrote,
      scored_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[API /score] Error:', error)
    return Response.json(
      { error: 'Scoring failed', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * GET /api/score?record_id=recXXX&use_claude=true
 * Convenience endpoint to score a single record via URL params.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const record_id = searchParams.get('record_id')
  const use_claude = searchParams.get('use_claude') !== 'false'

  if (!record_id) {
    return Response.json(
      { error: 'Provide ?record_id=recXXX' },
      { status: 400 }
    )
  }

  // Delegate to POST logic
  return POST(
    new Request(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record_id, use_claude }),
    })
  )
}
