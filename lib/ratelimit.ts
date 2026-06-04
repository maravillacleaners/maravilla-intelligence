/**
 * Rate limiting configuration for API endpoints
 * In-memory implementation (suitable for single-server deployments)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limits (IP -> { count, resetAt })
const rateLimitStore = new Map<string, Map<string, RateLimitEntry>>();

/**
 * Rate limiter for avatars endpoint
 * 10 requests per 60 seconds per IP address
 */
export const avatarsLimiter = {
  name: 'avatars',
  maxRequests: 10,
  windowMs: 60000, // 60 seconds
};

/**
 * Generic rate limiter for discovery endpoints
 * 30 requests per 60 seconds per IP address
 */
export const discoveryLimiter = {
  name: 'discovery',
  maxRequests: 30,
  windowMs: 60000, // 60 seconds
};

/**
 * Apply rate limiting to incoming request
 * Returns success/remaining/reset info
 */
export async function checkRateLimit(
  limiter: typeof avatarsLimiter | typeof discoveryLimiter,
  identifier: string
): Promise<{
  success: boolean;
  remaining: number;
  reset: number;
  retryAfter?: number;
}> {
  try {
    const now = Date.now();

    // Get or create limiter store
    if (!rateLimitStore.has(limiter.name)) {
      rateLimitStore.set(limiter.name, new Map());
    }

    const store = rateLimitStore.get(limiter.name)!;
    const entry = store.get(identifier) || { count: 0, resetAt: now + limiter.windowMs };

    // Reset if window has passed
    if (now >= entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + limiter.windowMs;
    }

    const isAllowed = entry.count < limiter.maxRequests;

    if (isAllowed) {
      entry.count++;
    }

    store.set(identifier, entry);

    const remaining = Math.max(0, limiter.maxRequests - entry.count);
    const retryAfter = !isAllowed ? Math.ceil((entry.resetAt - now) / 1000) : undefined;

    return {
      success: isAllowed,
      remaining,
      reset: entry.resetAt,
      retryAfter,
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // On error, allow request to proceed (fail open)
    return {
      success: true,
      remaining: 10,
      reset: Date.now() + 60000,
    };
  }
}

/**
 * Extract client IP from request
 * Handles proxies and load balancers
 */
export function getClientIP(req: any): string {
  // Check for X-Forwarded-For (proxy chain)
  const forwarded = req.headers?.get?.('x-forwarded-for') || req.headers?.['x-forwarded-for'];
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return (forwarded as string).split(',')[0].trim();
  }

  // Check for X-Real-IP (some proxies)
  const realIp = req.headers?.get?.('x-real-ip') || req.headers?.['x-real-ip'];
  if (realIp) {
    return realIp as string;
  }

  // Fallback to connection remote address
  return req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: any,
  remaining: number,
  reset: number,
  retryAfter?: number
): void {
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(reset / 1000)));
  if (retryAfter) {
    response.headers.set('Retry-After', String(retryAfter));
  }
}
