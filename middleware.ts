import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, isPublicRoute } from './app/lib/auth-middleware'
import { applySecurityHeaders } from './app/lib/security-headers'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response: NextResponse

  // Handle API routes
  if (pathname.startsWith('/api')) {
    // Allow public routes without authentication
    if (isPublicRoute(pathname)) {
      response = NextResponse.next()
    } else {
      // All other API routes require valid Bearer token
      const authHeader = request.headers.get('authorization') ?? ''
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

      if (!token) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Missing Authorization header' },
          { status: 401 }
        )
      }

      const payload = verifyToken(token)
      if (!payload) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        )
      }

      response = NextResponse.next()
    }
  }
  // Handle admin UI routes
  else if (pathname.startsWith('/admin')) {
    const cookieToken = request.cookies.get('admin_token')?.value ?? ''
    const headerToken = request.headers.get('authorization')?.replace('Bearer ', '') ?? ''

    const token = cookieToken || headerToken

    if (!token || !verifyToken(token)) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }

    response = NextResponse.next()
  } else {
    response = NextResponse.next()
  }

  // Apply security headers to all responses
  response = applySecurityHeaders(response)

  // Add rate limit headers from context if available
  // (rate limiting is applied per-route)

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*', '/:path*'],
}
