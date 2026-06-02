/**
 * Hunter.io Combined API
 * https://hunter.io/api-documentation#combined-api
 * Single endpoint: person + company + email patterns in one call
 */

import { getCredential } from '@/lib/credentials-dynamic'

export interface CombinedResult {
  person: {
    firstName?: string
    lastName?: string
    email?: string
    emails?: Array<{ email: string; confidence: number }>
    position?: string
    confidence?: number
  } | null
  company: {
    name?: string
    domain?: string
    size?: string
    industry?: string
    founded?: number
    location?: string
  } | null
  emails?: Array<{ email: string; pattern: string; confidence: number }>
  email_pattern?: string
  confidence?: number
}

export async function searchCombined(
  domain: string,
  firstName?: string,
  lastName?: string
): Promise<CombinedResult | null> {
  const apiKey = await getCredential('HUNTER_API_KEY')
  if (!apiKey) return null

  try {
    const params = new URLSearchParams({
      domain,
      api_key: apiKey,
    })

    if (firstName) params.append('first_name', firstName)
    if (lastName) params.append('last_name', lastName)

    const url = `https://api.hunter.io/v2/combined?${params}`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      console.warn(`[Hunter Combined] API error ${res.status} for ${domain}`)
      return null
    }

    const data = await res.json()

    // Return structured result combining person, company, and emails
    return {
      person: data.data?.person || null,
      company: data.data?.company || null,
      emails: data.data?.emails || [],
      email_pattern: data.data?.pattern || '',
      confidence: data.data?.confidence || 0,
    }
  } catch (err) {
    console.warn(`[Hunter Combined] Query failed for ${domain}:`, err)
    return null
  }
}

/**
 * Verify a specific email address
 * https://hunter.io/api-documentation#email-verifier
 */
export async function verifyEmail(email: string): Promise<{
  valid: boolean
  confidence: 'high' | 'medium' | 'low'
  result: 'deliverable' | 'undeliverable' | 'unknown'
} | null> {
  const apiKey = await getCredential('HUNTER_API_KEY')
  if (!apiKey) return null

  try {
    const params = new URLSearchParams({
      email,
      api_key: apiKey,
    })

    const url = `https://api.hunter.io/v2/email-verifier?${params}`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) return null

    const data = await res.json()
    return {
      valid: data.data?.result !== 'undeliverable',
      confidence: data.data?.confidence || 'low',
      result: data.data?.result || 'unknown',
    }
  } catch {
    return null
  }
}

/**
 * Find emails for a person by first + last name + domain
 * https://hunter.io/api-documentation#find-email
 */
export async function findEmail(
  firstName: string,
  lastName: string,
  domain: string
): Promise<{
  email?: string
  confidence?: number
  pattern?: string
} | null> {
  const apiKey = await getCredential('HUNTER_API_KEY')
  if (!apiKey) return null

  try {
    const params = new URLSearchParams({
      first_name: firstName,
      last_name: lastName,
      domain,
      api_key: apiKey,
    })

    const url = `https://api.hunter.io/v2/email-finder?${params}`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) return null

    const data = await res.json()
    return {
      email: data.data?.email,
      confidence: data.data?.confidence,
      pattern: data.data?.pattern,
    }
  } catch {
    return null
  }
}
