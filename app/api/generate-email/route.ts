import Anthropic from '@anthropic-sdk/sdk'

interface EmailRequest {
  companyName: string
  agency?: string
  opportunityTitle?: string
  role: 'prime' | 'sub'
  tone?: 'formal' | 'friendly'
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

    const claudeApiKey = process.env.CLAUDE_API_KEY || process.env.NEXT_PUBLIC_CLAUDE_API_KEY
    const tone = body.tone || 'formal'
    const role = body.role || 'sub'

    if (!claudeApiKey) {
      // Return mock email
      const mockEmail =
        role === 'prime'
          ? `Subject: Partnership Opportunity with ${body.companyName}\n\nDear ${body.agency || 'Decision Maker'},\n\nWe are reaching out to express our interest in partnering with you on federal contracting opportunities${body.opportunityTitle ? ` such as ${body.opportunityTitle}` : ''}. Our company brings specialized expertise and a proven track record of success.\n\nWe would welcome the opportunity to discuss how we can add value to your initiatives.\n\nBest regards,\n${body.companyName} Team`
          : `Subject: Teaming Opportunity - ${body.companyName}\n\nDear ${body.agency || 'Prime Contractor'},\n\nWe are interested in supporting your federal contracting efforts as a teaming partner${body.opportunityTitle ? ` on ${body.opportunityTitle}` : ''}. Our capabilities complement your offerings and we have a strong track record of subcontractor performance.\n\nPlease let us know if you would like to discuss teaming arrangements.\n\nBest regards,\n${body.companyName} Team`

      return Response.json({
        success: true,
        email: mockEmail,
      })
    }

    const client = new Anthropic({
      apiKey: claudeApiKey,
    })

    const roleDescription =
      role === 'prime'
        ? 'as a prime contractor interested in federal contracts'
        : 'as a subcontractor looking to team on federal opportunities'

    const message = await client.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `Write a ${tone} outreach email from ${body.companyName} ${roleDescription}${body.agency ? ` to ${body.agency}` : ''}${body.opportunityTitle ? ` regarding ${body.opportunityTitle}` : ''}. Keep it to 100-150 words. Include: greeting, brief value proposition, specific interest, and call to action.`,
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
