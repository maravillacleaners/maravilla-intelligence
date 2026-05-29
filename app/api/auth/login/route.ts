/**
 * POST /api/auth/login
 * Simple password auth against ADMIN_SECRET env var.
 * Returns a signed session token stored in localStorage.
 */
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}))

  const secret = process.env.ADMIN_SECRET || 'maravilla-contractedge-admin-2026'

  if (!password || password.trim() !== secret) {
    // Throttle brute force
    await new Promise(r => setTimeout(r, 600))
    return NextResponse.json({ ok: false, error: 'Invalid password' }, { status: 401 })
  }

  // Simple HMAC token: expires in 30 days
  const payload = { ts: Date.now(), exp: Date.now() + 30 * 24 * 60 * 60 * 1000 }
  const data    = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig     = crypto.createHmac('sha256', secret).update(data).digest('hex').slice(0, 16)
  const token   = `mi_${data}.${sig}`

  return NextResponse.json({ ok: true, token })
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token') || ''

  if (!token.startsWith('mi_')) return NextResponse.json({ valid: false })

  try {
    const [data, sig] = token.slice(3).split('.')
    const secret = process.env.ADMIN_SECRET || 'maravilla-contractedge-admin-2026'
    const expected = crypto.createHmac('sha256', secret).update(data).digest('hex').slice(0, 16)
    if (sig !== expected) return NextResponse.json({ valid: false })
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString())
    if (payload.exp < Date.now()) return NextResponse.json({ valid: false, expired: true })
    return NextResponse.json({ valid: true })
  } catch {
    return NextResponse.json({ valid: false })
  }
}
