import { NextRequest, NextResponse } from 'next/server'

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'maravilla-admin-2026'

// Public API routes that do NOT require JWT authentication
const PUBLIC_API_ROUTES = [
  '/api/auth/login',
  '/api/auth/google',
  '/api/suppliers/login',
  '/api/suppliers/register',
]

function verifyAdminToken(token: string): boolean {
  return token === ADMIN_SECRET
}

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect ALL /api/* routes except public auth endpoints — require Authorization: Bearer <ADMIN_TOKEN>
  if (pathname.startsWith('/api')) {
    // Allow public routes without authentication
    if (isPublicApiRoute(pathname)) {
      return NextResponse.next()
    }

    // All other API routes require valid Bearer token
    const authHeader = request.headers.get('authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing or invalid Authorization header' },
        { status: 401 }
      )
    }

    return NextResponse.next()
  }

  // Protect admin UI routes — redirect to /login if no valid admin_token cookie
  if (pathname.startsWith('/admin')) {
    const cookieToken = request.cookies.get('admin_token')?.value ?? ''

    if (!cookieToken || !verifyAdminToken(cookieToken)) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
}
