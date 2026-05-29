/**
 * Gmail via Google Service Account + Domain-Wide Delegation
 * Requires: GOOGLE_SERVICE_ACCOUNT_B64 in .env
 * Requires: DWD enabled in Google Workspace Admin for this SA + gmail.readonly scope
 */
import crypto from 'crypto'

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'

function base64url(data: string | Buffer): string {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function createJWT(sa: Record<string, string>, subject: string): string {
  const now = Math.floor(Date.now() / 1000)
  const header  = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64url(JSON.stringify({
    iss: sa.client_email,
    sub: subject,
    scope: GMAIL_SCOPE,
    aud: sa.token_uri || 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))
  const unsigned = `${header}.${payload}`
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(unsigned)
  const sig = sign.sign(sa.private_key, 'base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return `${unsigned}.${sig}`
}

export async function getSAGmailToken(subject: string): Promise<string | null> {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64
  if (!b64) return null

  let sa: Record<string, string>
  try {
    sa = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'))
  } catch { return null }

  if (!sa.private_key || !sa.client_email) return null

  const jwt = createJWT(sa, subject)
  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token'

  try {
    const res = await fetch(tokenUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[gmail-sa] token error:', res.status, err.slice(0, 200))
      return null
    }
    const data = await res.json()
    return data.access_token || null
  } catch (e: any) {
    console.error('[gmail-sa] fetch error:', e.message)
    return null
  }
}

export function getSAInfo(): { configured: boolean; client_email: string; project_id: string } {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64
  if (!b64) return { configured: false, client_email: '', project_id: '' }
  try {
    const sa = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'))
    return { configured: true, client_email: sa.client_email || '', project_id: sa.project_id || '' }
  } catch {
    return { configured: false, client_email: '', project_id: '' }
  }
}
