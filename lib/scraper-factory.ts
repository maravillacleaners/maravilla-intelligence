/**
 * GENERIC SCRAPER FRAMEWORK
 * Handles 236+ different data sources with unified interface
 */

import { getCredential } from '@/lib/credentials-dynamic'

export type AuthType = 'none' | 'api_key' | 'bearer' | 'basic' | 'oauth' | 'custom'
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type ParserType = 'json' | 'xml' | 'html' | 'csv' | 'custom'
export type TargetTable = 'Intelligence' | 'Avatars' | 'Prospects' | 'Contacts' | 'Opportunities' | 'Custom'

export interface FieldMapping {
  airtableField: string
  sourceField: string
  transform?: (value: any) => any
  required?: boolean
}

export interface OutputSchema {
  targetTable: TargetTable
  identifierField: string
  fieldMappings: FieldMapping[]
  batchSize?: number
}

export interface RateLimitConfig {
  requestsPerMinute: number
  requestsPerHour?: number
  burstSize?: number
  delayMs?: number
}

export interface AuthConfig {
  type: AuthType
  credentialKey?: string
  headerName?: string
  bearerFormat?: string
}

export interface ScraperConfig {
  id: string
  name: string
  description?: string
  url: string
  method: HttpMethod
  parserType: ParserType
  auth?: AuthConfig
  rateLimit: RateLimitConfig
  outputSchema: OutputSchema
  defaultQuery?: Record<string, any>
  headers?: Record<string, string>
  retryConfig?: {
    maxRetries: number
    delayMs: number
    backoffMultiplier: number
  }
  timeout?: number
  enabled?: boolean
  category?: string
  tags?: string[]
}

export interface ScraperResult {
  source: string
  records: any[]
  rawData?: any
  count: number
  storedToAirtable: boolean
  errors?: string[]
  timestamp: string
  durationMs: number
}

class RateLimiter {
  private config: RateLimitConfig
  private requestTimestamps: number[] = []
  private lastRequestMs: number = 0

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  async wait(): Promise<void> {
    const now = Date.now()
    const windowMs = 60000

    this.requestTimestamps = this.requestTimestamps.filter(ts => now - ts < windowMs)

    if (this.requestTimestamps.length >= this.config.requestsPerMinute) {
      const oldestRequest = this.requestTimestamps[0]
      const waitMs = Math.max(0, windowMs - (now - oldestRequest) + 100)
      if (waitMs > 0) {
        await new Promise(resolve => setTimeout(resolve, waitMs))
      }
    }

    if (this.config.requestsPerHour) {
      const hourMs = 3600000
      const hourRequests = this.requestTimestamps.filter(ts => now - ts < hourMs)
      if (hourRequests.length >= this.config.requestsPerHour) {
        const oldestHourRequest = hourRequests[0]
        const waitMs = Math.max(0, hourMs - (now - oldestHourRequest) + 100)
        if (waitMs > 0) {
          await new Promise(resolve => setTimeout(resolve, waitMs))
        }
      }
    }

    if (this.config.delayMs && now - this.lastRequestMs < this.config.delayMs) {
      const waitMs = this.config.delayMs - (now - this.lastRequestMs)
      if (waitMs > 0) {
        await new Promise(resolve => setTimeout(resolve, waitMs))
      }
    }

    this.requestTimestamps.push(Date.now())
    this.lastRequestMs = Date.now()
  }
}

export class GenericScraperFactory {
  config: ScraperConfig
  private rateLimiter: RateLimiter
  private logs: Array<{ level: string; message: string; data?: any; timestamp: string }> = []
  private airtableKey: string = ''
  private airtableBaseId: string = ''

  constructor(config: ScraperConfig) {
    if (!config.id || !config.name || !config.url || !config.outputSchema) {
      throw new Error('ScraperConfig missing required fields: id, name, url, outputSchema')
    }
    this.config = config
    this.rateLimiter = new RateLimiter(config.rateLimit)
    this.airtableKey = process.env.AIRTABLE_API_KEY || ''
    this.airtableBaseId = process.env.AIRTABLE_BASE_ID || ''
  }

  log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const entry = {
      level,
      message: `[${this.config.id}] ${message}`,
      data,
      timestamp: new Date().toISOString(),
    }
    this.logs.push(entry)
    console.log(`${entry.timestamp} ${entry.level.toUpperCase()} ${entry.message}`, data || '')
  }

  async buildRequest(query?: Record<string, any>): Promise<RequestInit & { url: string }> {
    const merged = { ...this.config.defaultQuery, ...query }
    let url = this.config.url

    if (this.config.method === 'GET' && Object.keys(merged).length > 0) {
      const params = new URLSearchParams()
      Object.entries(merged).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          params.append(k, String(v))
        }
      })
      url = `${url}?${params.toString()}`
    }

    const headers: HeadersInit = {
      'Accept': 'application/json',
      'User-Agent': 'Maravilla-Intelligence-Scraper/1.0',
      ...this.config.headers,
    }

    if (this.config.auth) {
      const authHeader = await this.buildAuthHeader()
      if (authHeader) {
        headers['Authorization'] = authHeader
      }
    }

    const init: RequestInit = {
      method: this.config.method,
      headers,
      timeout: this.config.timeout || 30000,
    }

    if (this.config.method !== 'GET' && Object.keys(merged).length > 0) {
      init.body = JSON.stringify(merged)
    }

    return { url, ...init }
  }

  private async buildAuthHeader(): Promise<string | null> {
    if (!this.config.auth) return null

    const { type, credentialKey } = this.config.auth

    try {
      switch (type) {
        case 'none':
          return null
        case 'api_key':
          if (credentialKey) {
            const key = await getCredential(credentialKey)
            if (key) return `ApiKey ${key}`
          }
          return null
        case 'bearer':
          if (credentialKey) {
            const token = await getCredential(credentialKey)
            if (token) return `Bearer ${token}`
          }
          return null
        case 'basic':
          if (credentialKey) {
            const cred = await getCredential(credentialKey)
            if (cred) {
              const encoded = Buffer.from(cred).toString('base64')
              return `Basic ${encoded}`
            }
          }
          return null
        case 'custom':
          if (credentialKey) {
            const value = await getCredential(credentialKey)
            if (value) return value
          }
          return null
        default:
          return null
      }
    } catch (err) {
      this.log('warn', `Auth header build failed: ${(err as Error).message}`)
      return null
    }
  }

  async parseResponse(response: Response, data: any): Promise<any[]> {
    try {
      switch (this.config.parserType) {
        case 'json':
          return this.parseJson(data)
        case 'xml':
          return this.parseXml(data)
        case 'html':
          return this.parseHtml(data)
        case 'csv':
          return this.parseCsv(data)
        case 'custom':
          return this.parseCustom(data)
        default:
          this.log('warn', `Unknown parser type: ${this.config.parserType}`)
          return []
      }
    } catch (err) {
      this.log('error', `Parse error: ${(err as Error).message}`)
      throw err
    }
  }

  private parseJson(data: any): any[] {
    if (Array.isArray(data)) return data
    if (data && typeof data === 'object') {
      for (const key of ['records', 'data', 'items', 'results', 'rows', 'entries']) {
        if (Array.isArray(data[key])) return data[key]
      }
      return [data]
    }
    return []
  }

  private parseXml(data: string): any[] {
    this.log('warn', 'XML parsing not yet implemented')
    return []
  }

  private parseHtml(data: string): any[] {
    this.log('warn', 'HTML parsing not yet implemented')
    return []
  }

  private parseCsv(data: string): any[] {
    try {
      const lines = data.split('\n').filter(l => l.trim())
      if (lines.length === 0) return []

      const headers = lines[0].split(',').map(h => h.trim())
      const records = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const record: Record<string, string> = {}
        headers.forEach((h, i) => {
          record[h] = values[i] || ''
        })
        return record
      })
      return records
    } catch {
      return []
    }
  }

  private parseCustom(data: any): any[] {
    return Array.isArray(data) ? data : []
  }

  async transformRecords(records: any[]): Promise<Record<string, any>[]> {
    const transformed: Record<string, any>[] = []

    for (const record of records) {
      try {
        const transformed_record: Record<string, any> = {}

        for (const mapping of this.config.outputSchema.fieldMappings) {
          const value = this.getNestedValue(record, mapping.sourceField)

          if (value === undefined && mapping.required) {
            this.log('warn', `Missing required field: ${mapping.sourceField}`)
            continue
          }

          const transformedValue = mapping.transform ? mapping.transform(value) : value

          if (transformedValue !== undefined && transformedValue !== null) {
            transformed_record[mapping.airtableField] = transformedValue
          }
        }

        if (Object.keys(transformed_record).length > 0) {
          transformed.push(transformed_record)
        }
      } catch (err) {
        this.log('warn', `Transform error: ${(err as Error).message}`)
      }
    }

    return transformed
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  validateRecord(record: any): boolean {
    const idField = this.config.outputSchema.identifierField
    const idValue = record[idField]
    return idValue !== undefined && idValue !== null && String(idValue).trim().length > 0
  }

  async saveToAirtable(records: Record<string, any>[]): Promise<boolean> {
    if (!this.airtableKey || !this.airtableBaseId) {
      this.log('warn', 'Airtable credentials missing')
      return false
    }

    if (records.length === 0) {
      this.log('info', 'No records to save')
      return true
    }

    const table = this.config.outputSchema.targetTable
    const url = `https://api.airtable.com/v0/${this.airtableBaseId}/${encodeURIComponent(table)}`
    const batchSize = this.config.outputSchema.batchSize || 10

    try {
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize)
        const payload = {
          records: batch.map(fields => ({ fields })),
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.airtableKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          this.log('error', `Airtable save failed: ${response.status}`)
          return false
        }

        this.log('info', `Saved batch`)
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      this.log('info', `Saved ${records.length} records`)
      return true
    } catch (err) {
      this.log('error', `Airtable save error: ${(err as Error).message}`)
      return false
    }
  }

  async scrape(query?: Record<string, any>): Promise<ScraperResult> {
    const startMs = Date.now()
    const result: ScraperResult = {
      source: this.config.id,
      records: [],
      count: 0,
      storedToAirtable: false,
      errors: [],
      timestamp: new Date().toISOString(),
      durationMs: 0,
    }

    try {
      await this.rateLimiter.wait()

      const request = await this.buildRequest(query)
      this.log('info', `Scraping: ${request.method} ${request.url.split('?')[0]}`)

      let response: Response | null = null
      let lastError: Error | null = null
      const retryConfig = this.config.retryConfig || { maxRetries: 3, delayMs: 1000, backoffMultiplier: 2 }

      for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
        try {
          response = await fetch(request.url, request as RequestInit)
          if (response.ok) break
          if (response.status >= 500) throw new Error(`Server error: ${response.status}`)
          lastError = new Error(`HTTP ${response.status}`)
        } catch (err) {
          lastError = err as Error
          if (attempt < retryConfig.maxRetries) {
            const delay = retryConfig.delayMs * Math.pow(retryConfig.backoffMultiplier, attempt)
            this.log('warn', `Retry ${attempt + 1}/${retryConfig.maxRetries}`)
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }
      }

      if (!response || !response.ok) {
        throw lastError || new Error('Failed to fetch data')
      }

      const contentType = response.headers.get('content-type') || ''
      let rawData: any
      if (contentType.includes('json')) {
        rawData = await response.json()
      } else {
        rawData = await response.text()
      }

      result.rawData = rawData

      const parsedRecords = await this.parseResponse(response, rawData)
      this.log('info', `Parsed ${parsedRecords.length} records`)

      const transformed = await this.transformRecords(parsedRecords)
      const validRecords = transformed.filter(r => this.validateRecord(r))
      this.log('info', `Validated ${validRecords.length}/${transformed.length} records`)

      result.storedToAirtable = await this.saveToAirtable(validRecords)
      result.records = validRecords
      result.count = validRecords.length
    } catch (err) {
      const message = (err as Error).message
      result.errors = [message]
      this.log('error', `Scrape failed: ${message}`)
    }

    result.durationMs = Date.now() - startMs
    this.log('info', `Completed in ${result.durationMs}ms: ${result.count} records`)
    return result
  }
}

const scraperRegistry = new Map<string, ScraperConfig>()

export function registerScraper(config: ScraperConfig): void {
  if (scraperRegistry.has(config.id)) {
    console.warn(`Scraper ${config.id} already registered`)
  }
  scraperRegistry.set(config.id, config)
}

export function getScraper(sourceId: string): GenericScraperFactory | null {
  const config = scraperRegistry.get(sourceId)
  if (!config) return null
  return new GenericScraperFactory(config)
}

export function listScrapers(): ScraperConfig[] {
  return Array.from(scraperRegistry.values())
}

export function getScraperConfig(sourceId: string): ScraperConfig | null {
  return scraperRegistry.get(sourceId) || null
}

export function registerScrapers(configs: ScraperConfig[]): void {
  for (const config of configs) {
    registerScraper(config)
  }
}

export function getRegistrySize(): number {
  return scraperRegistry.size
}
