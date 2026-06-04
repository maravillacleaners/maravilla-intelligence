import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { authMiddleware } from '@/app/lib/auth-middleware'

const csvPath = path.join(process.cwd(), 'data', 'fuentes_datos_eeuu.csv')

interface DataSource {
  category: string
  name: string
  description: string
  url: string
  is_free: boolean
  requires_api_key: boolean
}

function parseCSV(csv: string): DataSource[] {
  const lines = csv.split('\n').filter(line => line.trim())
  const sources: DataSource[] = []

  for (let i = 1; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i])
    if (parts.length < 4) continue

    sources.push({
      category: parts[0],
      name: parts[1],
      description: parts[2],
      url: parts[3],
      is_free: parts[4]?.toLowerCase() === 'si',
      requires_api_key: parts[5]?.toLowerCase() === 'si',
    })
  }

  return sources
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function escapeCSV(value: string | boolean): string {
  const str = String(value || '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

async function handler(request: NextRequest) {
  try {
    // Parse query parameters
    const url = new URL(request.url)
    const category = url.searchParams.get('category')
    const format = url.searchParams.get('format') || 'csv'

    // Read CSV file
    const csv = fs.readFileSync(csvPath, 'utf-8')
    let sources = parseCSV(csv)

    // Filter by category if provided
    if (category) {
      sources = sources.filter(s => s.category === category)
    }

    if (format === 'json') {
      // Export as JSON
      return NextResponse.json(
        {
          total: sources.length,
          sources,
          timestamp: new Date().toISOString(),
        },
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="data-sources-${new Date().toISOString().split('T')[0]}.json"`,
          },
        }
      )
    } else {
      // Export as CSV (default)
      const headers = ['Categoria', 'Nombre', 'Descripcion', 'URL', 'Gratis', 'API Key']
      const rows = sources.map(s => [
        s.category,
        s.name,
        s.description,
        s.url,
        s.is_free ? 'Si' : 'No',
        s.requires_api_key ? 'Si' : 'No',
      ].map(escapeCSV))

      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.join(',')),
      ].join('\n')

      const filename = category
        ? `data-sources-${category}-${new Date().toISOString().split('T')[0]}.csv`
        : `data-sources-${new Date().toISOString().split('T')[0]}.csv`

      const response = new NextResponse(csvContent)
      response.headers.set('Content-Type', 'text/csv; charset=utf-8')
      response.headers.set('Content-Disposition', `attachment; filename="${filename}"`)
      return response
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[API /api/sources/export] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to export data sources',
        details: errorMsg,
      },
      { status: 500 }
    )
  }
}

export const GET = authMiddleware(handler)
