// Auth middleware - validates JWT token on protected routes
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { credentials } from './credentials'

interface TokenPayload {
  ts: number
  exp: number
}

// List of public routes that don't require auth
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/health',
]

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    if (!token.startsWith('mi_')) {
      return null
    }

    const [data, sig] = token.slice(3).split('.')
    if (!data || !sig) return null

    // Verify signature
    const expectedSig = crypto
      .createHmac('sha256', credentials.adminSecret)
      .update(data)
      .digest('hex')
      .slice(0, 16)

    if (sig !== expectedSig) {
      return null
    }

    // Verify expiry
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'))
    if (payload.exp < Date.now()) {
      return null
    }

    return payload
  } catch (e) {
    return null
  }
}

export async function authMiddleware(request: NextRequest) {
  const pathname = new URL(request.url).pathname

  // Skip auth for public routes
  if (isPublicRoute(pathname)) {
    return null
  }

  // Get token from Authorization header or query param (for GET requests)
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '') || new URL(request.url).searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  return null // Auth passed
}

export function withAuth(handler: Function) {
  return async (request: NextRequest, context?: any) => {
    const authError = await authMiddleware(request)
    if (authError) {
      return authError
    }
    return handler(request, context)
  }
}
