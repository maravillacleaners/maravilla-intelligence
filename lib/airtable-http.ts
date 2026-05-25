/**
 * Shared Airtable HTTPS client
 *
 * Provides a reusable HTTP client for authenticated requests to the Airtable API.
 * This eliminates code duplication across verification and setup scripts.
 */

import * as https from 'https'

export interface AirtableRequest {
  endpoint: string
  method?: 'GET' | 'POST'
  body?: Record<string, any>
}

/**
 * Make authenticated HTTPS request to Airtable API.
 * @param endpoint - API endpoint (e.g., '/meta/bases')
 * @param method - HTTP method (default: GET)
 * @param body - Request body (optional)
 * @returns Parsed JSON response
 * @throws Error if API returns 4xx/5xx status or response parsing fails
 */
export async function makeAirtableRequest(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, any>
): Promise<any> {
  const apiKey = process.env.AIRTABLE_API_KEY
  if (!apiKey) {
    throw new Error('AIRTABLE_API_KEY not set in environment')
  }

  return new Promise((resolve, reject) => {
    const url = new URL(`https://api.airtable.com/v0${endpoint}`)
    const payload = body ? JSON.stringify(body) : undefined

    const options = {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(payload && { 'Content-Length': Buffer.byteLength(payload) }),
      },
    }

    const req = https.request(url, options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          let errorMsg = data
          try {
            const parsed = JSON.parse(data)
            errorMsg = parsed.error?.message || data
          } catch (e) {
            // If JSON parsing fails, use raw response
          }
          reject(new Error(`${res.statusCode} ${method} ${endpoint}: ${errorMsg}`))
        } else {
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            reject(new Error(`Failed to parse response from ${endpoint}: ${data}`))
          }
        }
      })
    })

    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}
