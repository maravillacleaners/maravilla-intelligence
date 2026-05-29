import Anthropic from '@anthropic-ai/sdk'

interface EmailRequest {
  companyName: string
  agency?: string
  opportunityTitle?: string
  role: 'prime' | 'sub'
  tone?: 'formal' | 'friendly'
  purpose?: 'quote_request' | 'partnership' | 'followup'
}

export async function POST(request: Request) {
  try {
    const body: EmailRequest = await request.json()

    if (!body.companyName) {
      return Response.json(
        { error: 'Missing required field: companyName' },
        { status: 400 }
      )
    }

    const claudeApiKey = process.env.ANTHROPIC_API_KEY
    const tone = body.tone || 'formal'
    const role = body.role || 'sub'
    const purpose = body.purpose || (role === 'sub' ? 'quote_request' : 'partnership')

    // Build purpose-specific prompt context
    const purposeContext: Record<string, string> = {
      quote_request: `You are ${body.companyName}, a commercial cleaning company in Florida that holds federal janitorial contracts. You are emailing ${body.agency || 'a cleaning/facilities company'} to REQUEST a price quote from them — you want to potentially subcontract work to them. Ask for their rates per square foot, minimum contract size, and availability in Florida. Be direct and professional. Subject line should mention "Quote Request."`,
      partnership: `You are ${body.companyName}, reaching out to ${body.agency || 'a contractor'} about a potential teaming partnership on federal janitorial contracts in Florida. Express interest in working together on upcoming bids.`,
      followup: `You are ${body.companyName} following up with ${body.agency || 'a company'} on a previous conversation about subcontracting opportunities in Florida. Be friendly and concise.`,
    }

    const additionalContext = body.opportunityTitle ? `\n\nContext: ${body.opportunityTitle}` : ''

    if (!claudeApiKey) {
      const mockEmail = purpose === 'quote_request'
        ? `Subject: Quote Request — Janitorial Subcontract Opportunity\n\nDear ${body.agency || 'Operations Manager'},\n\nMy name is [Your Name] from Maravilla Cleaners. We are a commercial cleaning company currently managing federal janitorial contracts across Florida and are looking to expand our subcontractor network.\n\nWe'd love to get a quote from your team for the following:\n- Janitorial / commercial cleaning services\n- Location(s): Florida (multiple counties)\n- Frequency: recurring weekly/bi-weekly\n\nCould you share:\n1. Your rates per square foot (or per visit)\n2. Minimum contract size you typically work with\n3. Your availability for new work starting in the next 30–60 days\n\nWe pay net-15 and are a reliable partner. Looking forward to connecting.\n\nBest regards,\n[Your Name]\nMaravilla Cleaners\nhello@maravillacleaners.com`
        : `Subject: Partnership Opportunity — ${body.companyName}\n\nDear ${body.agency || 'Decision Maker'},\n\nWe are interested in exploring a teaming partnership for federal janitorial contracts in Florida. Our company has a strong track record and we believe there is good synergy between our capabilities.\n\nWould you be open to a 15-minute call this week?\n\nBest regards,\n${body.companyName} Team`

      return Response.json({ success: true, email: mockEmail })
    }

    const client = new Anthropic({
      apiKey: claudeApiKey,
    })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 450,
      messages: [
        {
          role: 'user',
          content: `${purposeContext[purpose] || purposeContext.partnership}${additionalContext}\n\nWrite a ${tone} outreach email in 120–160 words. Include a clear subject line (start with "Subject:"), greeting, the main ask, and a call to action. Do not use placeholders like [Your Name] — use "The Maravilla Cleaners Team" for sign-off.`,
        },
      ],
    })

    const email = message.content[0].type === 'text' ? message.content[0].text : ''

    return Response.json({
      success: true,
      email,
    })
  } catch (error) {
    console.error('[API /generate-email] Error:', error)
    return Response.json(
      { error: 'Failed to generate email', details: String(error) },
      { status: 500 }
    )
  }
}
