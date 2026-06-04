import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface DataSource {
  category: string
  name: string
  description: string
  url: string
  is_free: boolean
  requires_api_key: boolean
}

const csvPath = path.join(process.cwd(), 'data', 'fuentes_datos_eeuu.csv')

function parseCSV(csv: string): DataSource[] {
  const lines = csv.split('\n').filter(line => line.trim())
  const sources: DataSource[] = []

  // Skip header
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

export async function GET(request: NextRequest) {
  try {
    // Read CSV file
    const csv = fs.readFileSync(csvPath, 'utf-8')
    const sources = parseCSV(csv)

    // Filter by category if provided
    const url = new URL(request.url)
    const category = url.searchParams.get('category')

    let filtered = sources
    if (category) {
      filtered = sources.filter(s => s.category === category)
    }

    // Get unique categories
    const categories = [...new Set(sources.map(s => s.category))]

    return NextResponse.json(
      {
        success: true,
        total: sources.length,
        filtered: filtered.length,
        categories,
        sources: filtered,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[API /api/sources/list] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to load data sources',
        details: errorMsg,
      },
      { status: 500 }
    )
  }
}
