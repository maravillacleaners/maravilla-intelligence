// Security headers middleware
import { NextRequest, NextResponse } from 'next/server'

/**
 * Apply critical security headers to all responses
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  // Strict-Transport-Security: enforce HTTPS
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  )

  // X-Content-Type-Options: prevent MIME sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // X-Frame-Options: prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')

  // Content-Security-Policy: restrict resource origins
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: wss:; frame-ancestors 'none';"
  )

  // Referrer-Policy: control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions-Policy: disable unused features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  )

  // X-XSS-Protection: legacy XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Additional security headers
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')

  return response
}

/**
 * Security headers middleware for Next.js
 * Can be used in middleware.ts or in individual route handlers
 */
export function securityHeadersMiddleware(request: NextRequest) {
  const response = NextResponse.next()
  return applySecurityHeaders(response)
}
