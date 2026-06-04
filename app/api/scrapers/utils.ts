/**
 * SHARED UTILITIES - Maravilla Intelligence Scrapers
 * Funciones compartidas: logging, airtable, requests, parsing
 */

import { ScraperError, Contact, BusinessRegistration } from './types'

const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY || 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92'
const BASE_ID = 'appZhXnyFiKbnOZLr'

export class ScraperLogger {
  private source: string
  private errors: ScraperError[] = []

  constructor(source: string) {
    this.source = source
  }

  log(message: string) {
    console.log(`[${this.source}] ${message}`)
  }

  error(message: string, error?: unknown) {
    console.error(`[${this.source}] ERROR: ${message}`, error)
    this.errors.push({
      code: 'SCRAPER_ERROR',
      message,
      source: this.source,
      recoverable: true,
      timestamp: new Date().toISOString(),
    })
  }

  warn(message: string) {
    console.warn(`[${this.source}] WARN: ${message}`)
  }

  debug(message: string, data?: unknown) {
    if (process.env.DEBUG) {
      console.log(`[${this.source}] DEBUG: ${message}`, data)
    }
  }

  getErrors(): ScraperError[] {
    return this.errors
  }

  clearErrors() {
    this.errors = []
  }
}

export class AirtableClient {
  private baseId: string
  private apiKey: string
  private logger: ScraperLogger

  constructor(baseId: string = BASE_ID, apiKey: string = AIRTABLE_KEY, logger?: ScraperLogger) {
    this.baseId = baseId
    this.apiKey = apiKey
    this.logger = logger || new ScraperLogger('AIRTABLE')
  }

  async createRecord(tableId: string, fields: Record<string, unknown>): Promise<string | null> {
    try {
      const res = await fetch(`https://api.airtable.com/v0/${this.baseId}/${tableId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
        signal: AbortSignal.timeout(8000),
      })

      if (res.ok) {
        const data = await res.json()
        this.logger.log(`Created record in ${tableId}: ${data.id}`)
        return data.id
      } else if (res.status === 429) {
        this.logger.warn(`Rate limited by Airtable, retry after delay`)
        return null
      } else {
        this.logger.error(`Failed to create record: HTTP ${res.status}`)
        return null
      }
    } catch (error) {
      this.logger.error('Create record error:', error)
      return null
    }
  }

  async batchCreateRecords(tableId: string, records: Array<{ fields: Record<string, unknown> }>): Promise<string[]> {
    const ids: string[] = []

    // Airtable batch API supports max 10 records per request
    const chunks = chunks as any
    for (let i = 0; i < records.length; i += 10) {
      const batch = records.slice(i, i + 10)

      try {
        const res = await fetch(`https://api.airtable.com/v0/${this.baseId}/${tableId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ records: batch }),
          signal: AbortSignal.timeout(10000),
        })

        if (res.ok) {
          const data = await res.json()
          ids.push(...data.records.map((r: any) => r.id))
          this.logger.log(`Batch created ${data.records.length} records`)
        } else {
          this.logger.error(`Batch failed: HTTP ${res.status}`)
        }
      } catch (error) {
        this.logger.error('Batch create error:', error)
      }

      // Rate limit delay
      await sleep(100)
    }

    return ids
  }

  async getRecords(tableId: string, formula?: string): Promise<Record<string, unknown>[]> {
    try {
      const params = new URLSearchParams({
        maxRecords: '100',
        ...(formula && { filterByFormula: formula }),
      })

      const res = await fetch(
        `https://api.airtable.com/v0/${this.baseId}/${tableId}?${params}`,
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          signal: AbortSignal.timeout(10000),
        }
      )

      if (res.ok) {
        const data = await res.json()
        return data.records.map((r: any) => ({ id: r.id, ...r.fields }))
      } else {
        this.logger.error(`Failed to fetch records: HTTP ${res.status}`)
        return []
      }
    } catch (error) {
      this.logger.error('Get records error:', error)
      return []
    }
  }
}

export class HTTPClient {
  private logger: ScraperLogger
  private timeout: number = 10000

  constructor(logger?: ScraperLogger, timeout: number = 10000) {
    this.logger = logger || new ScraperLogger('HTTP')
    this.timeout = timeout
  }

  async get(url: string, headers?: Record<string, string>): Promise<string | null> {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ...headers,
        },
        signal: AbortSignal.timeout(this.timeout),
      })

      if (res.ok) {
        return await res.text()
      } else {
        this.logger.warn(`HTTP GET ${url} returned ${res.status}`)
        return null
      }
    } catch (error) {
      this.logger.error(`HTTP GET error for ${url}:`, error)
      return null
    }
  }

  async getJSON<T>(url: string, headers?: Record<string, string>): Promise<T | null> {
    try {
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ...headers,
        },
        signal: AbortSignal.timeout(this.timeout),
      })

      if (res.ok) {
        return await res.json()
      } else {
        this.logger.warn(`HTTP GET JSON ${url} returned ${res.status}`)
        return null
      }
    } catch (error) {
      this.logger.error(`HTTP GET JSON error for ${url}:`, error)
      return null
    }
  }

  async post<T>(
    url: string,
    body: Record<string, unknown>,
    headers?: Record<string, string>
  ): Promise<T | null> {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ...headers,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeout),
      })

      if (res.ok) {
        return await res.json()
      } else {
        this.logger.warn(`HTTP POST ${url} returned ${res.status}`)
        return null
      }
    } catch (error) {
      this.logger.error(`HTTP POST error for ${url}:`, error)
      return null
    }
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function extractDomain(email: string): string {
  const match = email.match(/@(.+)$/)
  return match ? match[1] : ''
}

export function extractPhoneNumbers(text: string): string[] {
  const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g
  const matches = text.matchAll(phoneRegex)
  return Array.from(matches).map((m) => m[0])
}

export function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  return text.match(emailRegex) || []
}

export function deduplicateContacts(contacts: Contact[]): Contact[] {
  const map = new Map<string, Contact>()

  for (const contact of contacts) {
    const key = (contact.email || contact.name).toLowerCase()
    const existing = map.get(key)

    if (!existing || contact.confidence > existing.confidence) {
      map.set(key, contact)
    }
  }

  return Array.from(map.values())
}

export function deduplicateBusinesses(businesses: BusinessRegistration[]): BusinessRegistration[] {
  const map = new Map<string, BusinessRegistration>()

  for (const business of businesses) {
    const key = business.legal_name.toLowerCase()
    const existing = map.get(key)

    if (!existing) {
      map.set(key, business)
    }
  }

  return Array.from(map.values())
}

export function calculateConfidenceScore(factors: { hasEmail: boolean; hasPhone: boolean; hasLinkedIn: boolean; isVerified: boolean; hasManySources: boolean }): number {
  let score = 50 // Base score

  if (factors.hasEmail) score += 15
  if (factors.hasPhone) score += 10
  if (factors.hasLinkedIn) score += 15
  if (factors.isVerified) score += 20
  if (factors.hasManySources) score += 10

  return Math.min(score, 100)
}

export function generateAirtableFormula(field: string, value: string): string {
  const escaped = value.replace(/"/g, '\\"')
  return `SEARCH(LOWER("${escaped}"), LOWER({${field}}))`
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().split('T')[0]
}

export function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  return fn().catch((error) => {
    if (maxRetries > 0) {
      return sleep(delayMs).then(() => retryWithBackoff(fn, maxRetries - 1, delayMs * 2))
    }
    throw error
  })
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}
