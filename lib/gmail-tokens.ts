/**
 * lib/gmail-tokens.ts
 * Returns a valid Gmail access token.
 * Priority: 1) Service Account (DWD) if GMAIL_IMPERSONATE_EMAIL set, 2) OAuth tokens
 */

import fs from 'fs'
import path from 'path'
import { getSAGmailToken } from './gmail-sa'

const ENV_PATH = path.join(process.cwd(), '.env')

function updateEnv(updates: Record<string, string>) {
  const current = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf-8') : ''
  const lines = current.split('\n')
  const applied = new Set<string>()

  const updated = lines.map(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return line
    const eq = trimmed.indexOf('=')
    if (eq === -1) return line
    const k = trimmed.slice(0, eq).trim()
    if (k in updates && updates[k] && updates[k].trim()) {
      applied.add(k)
      return `${k}=${updates[k].trim()}`
    }
    return line
  })

  for (const [k, v] of Object.entries(updates)) {
    if (!applied.has(k) && v && v.trim()) {
      updated.push(`${k}=${v.trim()}`)
    }
  }

  fs.writeFileSync(ENV_PATH, updated.join('\n'), 'utf-8')
}

/**
 * Returns a valid Gmail access token.
 * Auto-refreshes if the token is expiring within 5 minutes.
 * Returns null if Gmail is not configured.
 */
export async function getGmailAccessToken(): Promise<string | null> {
  // Try Service Account first (no OAuth needed — requires DWD in Google Workspace Admin)
  const impersonateEmail = process.env.GMAIL_IMPERSONATE_EMAIL
  if (impersonateEmail && process.env.GOOGLE_SERVICE_ACCOUNT_B64) {
    const saToken = await getSAGmailToken(impersonateEmail)
    if (saToken) return saToken
    console.warn('[gmail-tokens] SA auth failed — check DWD is enabled for gmail.readonly scope')
  }

  // Fallback: OAuth tokens
  const accessToken = process.env.GOOGLE_GMAIL_TOKEN
  if (!accessToken) return null

  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  const expiryStr = process.env.GOOGLE_TOKEN_EXPIRY
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  // Check if token is expiring within 5 minutes
  if (refreshToken && expiryStr && clientId && clientSecret) {
    const expiry = new Date(expiryStr).getTime()
    const fiveMinutesMs = 5 * 60 * 1000
    const isExpiringSoon = expiry - Date.now() < fiveMinutesMs

    if (isExpiringSoon) {
      try {
        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
          }),
        })
        const data = await res.json()
        if (data.access_token) {
          const newExpiry = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString()
          updateEnv({
            GOOGLE_GMAIL_TOKEN: data.access_token,
            GOOGLE_TOKEN_EXPIRY: newExpiry,
          })
          // Update in-process env so the rest of this request uses the new token
          process.env.GOOGLE_GMAIL_TOKEN = data.access_token
          process.env.GOOGLE_TOKEN_EXPIRY = newExpiry
          return data.access_token
        }
      } catch {
        // Fall through and return existing token
      }
    }
  }

  return accessToken
}
