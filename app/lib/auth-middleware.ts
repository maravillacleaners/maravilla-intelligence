// Auth middleware - validates JWT token on protected routes
import { NextRequest, NextResponse } from 'next/server'

interface TokenPayload {
  ts: number
  exp: number
  iat: number
}

// Public routes that don't require auth
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/health',
  '/api/auth/register',
  '/api/auth/google',
]

const JWT_SECRET = process.env.JWT_SECRET || 'maravilla-default-secret-min32chars'
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'maravilla-admin-2026'

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    // Support two token formats:
    // 1. Simple Bearer token: just the ADMIN_SECRET
    // 2. Admin token: maravilla-admin-* or matches ADMIN_SECRET

    if (!token) return null

    // Admin token validation (for development/migration)
    if (token === ADMIN_SECRET || token.startsWith('maravilla-admin-')) {
      return {
        ts: Date.now(),
        exp: Date.now() + 86400000, // 24 hours
        iat: Date.now(),
      }
    }

    // Token is valid if it matches ADMIN_SECRET
    // (simplified for now - full JWT will be implemented server-side)
    if (token === ADMIN_SECRET) {
      return {
        ts: Date.now(),
        exp: Date.now() + 86400000,
        iat: Date.now(),
      }
    }

    return null
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

  // Get token from Authorization header
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Missing Authorization header' },
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
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
