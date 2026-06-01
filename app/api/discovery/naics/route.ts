import { NextRequest } from 'next/server'
import naicsDatabase from './naics-database.json'

interface NAICSCode {
  code: string
  title: string
  description: string
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')?.toLowerCase() || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    let results: NAICSCode[] = naicsDatabase

    // Filter by query if provided
    if (query) {
      results = naicsDatabase.filter((code) => {
        const codeMatch = code.code.includes(query)
        const titleMatch = code.title.toLowerCase().includes(query)
        const descMatch = code.description.toLowerCase().includes(query)
        return codeMatch || titleMatch || descMatch
      })
    }

    // Sort by relevance
    results.sort((a, b) => {
      const aCodeMatch = a.code.startsWith(query) ? 0 : 1
      const bCodeMatch = b.code.startsWith(query) ? 0 : 1
      if (aCodeMatch !== bCodeMatch) return aCodeMatch - bCodeMatch

      const aTitleMatch = a.title.toLowerCase().startsWith(query) ? 0 : 1
      const bTitleMatch = b.title.toLowerCase().startsWith(query) ? 0 : 1
      if (aTitleMatch !== bTitleMatch) return aTitleMatch - bTitleMatch

      return a.code.localeCompare(b.code)
    })

    // Apply limit
    const limitedResults = results.slice(0, limit)

    return Response.json({
      success: true,
      data: limitedResults,
      total: results.length,
      returned: limitedResults.length,
      query,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[API /discovery/naics] GET error:', error)
    return Response.json(
      { error: 'Failed to search NAICS codes', details: String(error) },
      { status: 500 }
    )
  }
}
