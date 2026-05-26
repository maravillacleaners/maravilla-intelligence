import Anthropic from '@anthropic-ai/sdk'

interface FOIARequest {
  companyName: string
  agency: string
  opportunityId?: string
  contractValue?: number
}

export async function POST(request: Request) {
  try {
    const body: FOIARequest = await request.json()

    if (!body.companyName || !body.agency) {
      return Response.json(
        { error: 'Missing required fields: companyName, agency' },
        { status: 400 }
      )
    }

    const claudeApiKey = process.env.CLAUDE_API_KEY || process.env.NEXT_PUBLIC_CLAUDE_API_KEY

    if (!claudeApiKey) {
      // Return mock FOIA draft
      return Response.json({
        success: true,
        foia_draft: `REQUEST FOR INFORMATION\n\nTo: ${body.agency}\nFrom: ${body.companyName}\nRE: Federal Information Request\n\nPursuant to the Freedom of Information Act (FOIA), 5 U.S.C. § 552, we are requesting the following information:\n\n1. All contract awards to ${body.companyName} in the past 5 years\n2. Current contract performance evaluations\n3. Agency contact information for future opportunities\n\nPlease provide this information within 20 business days as required by law.\n\nRespectfully,\n${body.companyName}`,
      })
    }

    const client = new Anthropic({
      apiKey: claudeApiKey,
    })

    const message = await client.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `You are a FOIA request writer for government contracting. Write a professional FOIA request from "${body.companyName}" to "${body.agency}" seeking information about federal contracting opportunities and past awards. Keep it to 150-200 words. Use standard FOIA language.`,
        },
      ],
    })

    const foia_draft = message.content[0].type === 'text' ? message.content[0].text : ''

    return Response.json({
      success: true,
      foia_draft,
    })
  } catch (error) {
    console.error('[API /generate-foia] Error:', error)
    return Response.json(
      { error: 'Failed to generate FOIA request', details: String(error) },
      { status: 500 }
    )
  }
}
