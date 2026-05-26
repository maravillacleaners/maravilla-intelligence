import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return Response.json(
      {
        content:
          "The Copilot is not configured yet. Please add ANTHROPIC_API_KEY to your environment variables and restart the server.",
      },
      { status: 200 }
    )
  }

  try {
    const { message, context } = await request.json()

    const systemPrompt = `You are a CRM assistant for Maravilla Cleaners, a commercial cleaning company in Florida.
You help the sales team analyze prospects, draft outreach, and make decisions.
Current prospect context: ${JSON.stringify(context || {})}
Be concise, specific, and actionable. Use data when available.`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    })

    return Response.json({
      content:
        response.content[0].type === 'text' ? response.content[0].text : '',
    })
  } catch (error: unknown) {
    console.error('[API /copilot] Error:', error)
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred.'
    return Response.json(
      { content: `Copilot encountered an error: ${message}` },
      { status: 200 }
    )
  }
}
