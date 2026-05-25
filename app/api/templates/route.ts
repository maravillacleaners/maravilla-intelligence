import { DEFAULT_TEMPLATES, EmailTemplate } from '@/lib/email-service'

// Custom templates stored in memory (would be database in production)
const customTemplates: EmailTemplate[] = []

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates]

    if (category) {
      const filtered = allTemplates.filter(t => t.category === category)
      return Response.json({
        success: true,
        templates: filtered,
        count: filtered.length,
      })
    }

    return Response.json({
      success: true,
      templates: allTemplates,
      count: allTemplates.length,
    })
  } catch (error) {
    console.error('[API /templates GET] Error:', error)
    return Response.json(
      { error: 'Failed to fetch templates', details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.name || !body.subject || !body.body || !body.category) {
      return Response.json(
        { error: 'Missing required fields: name, subject, body, category' },
        { status: 400 }
      )
    }

    // Extract variables from template (look for [variable_name] patterns)
    const variableRegex = /\[([a-z_]+)\]/gi
    const variables: string[] = []
    let match

    while ((match = variableRegex.exec(body.body)) !== null) {
      const variable = match[1].toLowerCase()
      if (!variables.includes(variable)) {
        variables.push(variable)
      }
    }

    const template: EmailTemplate = {
      id: `template-${Date.now()}`,
      name: body.name,
      subject: body.subject,
      body: body.body,
      variables,
      category: body.category,
    }

    customTemplates.push(template)

    console.log(`[API /templates] Created template: ${template.id}`)

    return Response.json({
      success: true,
      template,
    })
  } catch (error) {
    console.error('[API /templates POST] Error:', error)
    return Response.json(
      { error: 'Failed to create template', details: String(error) },
      { status: 500 }
    )
  }
}
