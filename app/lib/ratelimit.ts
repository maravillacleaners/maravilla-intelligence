// Rate limiting middleware
import { NextRequest, NextResponse } from 'next/server'

interface RateLimitStore {
  [key: string]: number[]
}

// In-memory store for rate limits per IP
const rateLimitStore: RateLimitStore = {}

// Configuration: 50 requests per 60 seconds per IP
const RATE_LIMIT_MAX_REQUESTS = 50
const RATE_LIMIT_WINDOW_MS = 60000 // 1 minute

export class RateLimiter {
  constructor(
    public name: string,
    public maxRequests: number = RATE_LIMIT_MAX_REQUESTS,
    public windowMs: number = RATE_LIMIT_WINDOW_MS
  ) {}
}

export const avatarsLimiter = new RateLimiter('avatars')
export const opportunitiesLimiter = new RateLimiter('opportunities')
export const leadsLimiter = new RateLimiter('leads')
export const defaultLimiter = new RateLimiter('default')

/**
 * Get client IP from request
 */
export function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return req.headers.get('x-real-ip') || 'unknown'
}

/**
 * Check rate limit for a client
 * Returns { allowed: boolean, remaining: number, resetTime: number }
 */
export async function checkRateLimit(
  limiter: RateLimiter,
  clientIP: string
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const key = `${limiter.name}:${clientIP}`
  const now = Date.now()

  // Initialize or get existing requests
  if (!rateLimitStore[key]) {
    rateLimitStore[key] = []
  }

  // Remove old requests outside the window
  const requests = rateLimitStore[key]
  const validRequests = requests.filter((timestamp) => now - timestamp < limiter.windowMs)
  rateLimitStore[key] = validRequests

  // Check if limit exceeded
  if (validRequests.length >= limiter.maxRequests) {
    const oldestRequest = validRequests[0]
    const resetTime = oldestRequest + limiter.windowMs
    return {
      allowed: false,
      remaining: 0,
      resetTime,
    }
  }

  // Add current request
  validRequests.push(now)
  rateLimitStore[key] = validRequests

  return {
    allowed: true,
    remaining: limiter.maxRequests - validRequests.length,
    resetTime: now + limiter.windowMs,
  }
}

/**
 * Rate limit middleware for API routes
 * Returns null if allowed, NextResponse with 429 if blocked
 */
export async function rateLimitMiddleware(
  req: NextRequest,
  limiter: RateLimiter = defaultLimiter
): Promise<NextResponse | null> {
  const clientIP = getClientIP(req)
  const result = await checkRateLimit(limiter, clientIP)

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: `Rate limit exceeded. Max ${limiter.maxRequests} requests per minute.`,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': limiter.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetTime.toString(),
        },
      }
    )
  }

  // Rate limit is OK - return null and set headers on response later
  return null
}

/**
 * Helper to add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  limiter: RateLimiter,
  remaining: number,
  resetTime: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', limiter.maxRequests.toString())
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', resetTime.toString())
  return response
}
