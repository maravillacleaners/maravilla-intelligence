# Rate Limiting Implementation

## Overview

Rate limiting has been implemented for the `/api/avatars` endpoint to prevent abuse and ensure fair access to the API. The system uses **Upstash Redis** with a sliding window algorithm.

## Configuration

### Dependencies Added

```json
{
  "dependencies": {
    "@upstash/redis": "^1.28.0",
    "ratelimit": "^2.4.1"
  }
}
```

### Rate Limit Rules

- **Endpoint:** `/api/avatars` (GET and POST)
- **Limit:** 10 requests per 60 seconds
- **Scope:** Per IP address
- **Strategy:** Sliding window

### Environment Variables Required

```bash
# Upstash Redis configuration (optional - falls back to in-memory if not set)
UPSTASH_REDIS_REST_URL=https://your-upstash-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-rest-token
```

## Implementation Details

### Rate Limiting Module (`lib/ratelimit.ts`)

The module provides:

1. **`avatarsLimiter`** - Configured for 10 requests/60 seconds
2. **`discoveryLimiter`** - Configured for 30 requests/60 seconds (for future use)
3. **`checkRateLimit()`** - Checks rate limit status for an identifier
4. **`getClientIP()`** - Extracts client IP from request, handling:
   - `X-Forwarded-For` (proxy chains)
   - `X-Real-IP` (some proxies)
   - Direct socket connection IP

### Endpoint Implementation

**File:** `app/api/avatars/route.ts`

Both GET and POST methods:
1. Extract client IP from request
2. Check rate limit before processing
3. Return HTTP 429 if limit exceeded
4. Include rate limit headers in all responses

### HTTP Response Headers

**On Success (200/201):**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1717390234000
```

**On Rate Limit Exceeded (429):**
```
HTTP/1.1 429 Too Many Requests
Retry-After: 45
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1717390234000

{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Max 10 requests per 60 seconds.",
  "retryAfter": 45,
  "ok": false
}
```

## Response Examples

### Success Response

```bash
$ curl http://localhost:3000/api/avatars \
  -H "Authorization: Bearer token"

HTTP/1.1 200 OK
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1717390234000

{
  "avatars": [...],
  "ok": true
}
```

### Rate Limited Response

```bash
$ curl http://localhost:3000/api/avatars \
  -H "Authorization: Bearer token" \
  -H "X-Forwarded-For: 203.0.113.42"

HTTP/1.1 429 Too Many Requests
Retry-After: 45
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1717390234000

{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Max 10 requests per 60 seconds.",
  "retryAfter": 45,
  "ok": false
}
```

## Testing

### Unit Test

Run the rate limiter logic test:

```bash
npx ts-node tests/test-ratelimit.ts
```

Expected output:
```
Request  1: ✓ ALLOWED            - 10 remaining
Request  2: ✓ ALLOWED            - 9 remaining
...
Request 10: ✓ ALLOWED            - 1 remaining
Request 11: ✗ BLOCKED (429)       - Retry after 52s
Request 12: ✗ BLOCKED (429)       - Retry after 52s
...

✅ TEST PASSED: Rate limiting working correctly!
   - Requests 1-10: ALLOWED
   - Requests 11-15: BLOCKED with 429
```

### Integration Test

Run the end-to-end test against running server:

```bash
# Start the server
npm run dev

# In another terminal, run the integration test
API_BASE_URL=http://localhost:3000 npx ts-node tests/test-avatars-endpoint-ratelimit.ts
```

Expected output:
```
========================================
Avatar Endpoint Rate Limit Test
Endpoint: http://localhost:3000/api/avatars
Rate Limit: 10 requests per 60 seconds
========================================

Request  1: ✓ ALLOWED (200)       Status: 200 | Duration: 145ms
Request  2: ✓ ALLOWED (200)       Status: 200 | Duration: 123ms
...
Request 10: ✓ ALLOWED (200)       Status: 200 | Duration: 134ms
Request 11: ✗ BLOCKED (429)       Status: 429 | Duration: 12ms
              Retry after: 52s
Request 12: ✗ BLOCKED (429)       Status: 429 | Duration: 8ms
...

========================================
Test Results Summary
========================================

✓ Allowed (200): 10
✗ Rate Limited (429): 5
⚠ Errors: 0

✅ TEST PASSED: Rate limiting working correctly!
   - Requests 1-10: HTTP 200 (ALLOWED)
   - Requests 11-15: HTTP 429 (RATE LIMITED)
```

## Client Handling

### Recommended Client Behavior

```typescript
async function fetchAvatarsWithRetry(
  maxRetries = 3,
  timeout = 1000
): Promise<Avatar[]> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('/api/avatars', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delayMs = (parseInt(retryAfter) || 60) * 1000;

        console.warn(
          `Rate limited. Retrying after ${delayMs / 1000}s...`
        );
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return (await response.json()).avatars;
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, timeout));
    }
  }

  throw new Error('Max retries exceeded');
}
```

## Production Deployment

### Setup Upstash Redis

1. Go to https://upstash.com and create account
2. Create a new Redis database (Regional or Global)
3. Copy REST API credentials:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### Configure Environment Variables

On VPS (`/root/maravilla-intelligence/.env`):

```bash
# Upstash Redis for rate limiting
UPSTASH_REDIS_REST_URL=https://us1-...upstash.io
UPSTASH_REDIS_REST_TOKEN=your-rest-token
```

### Verify Deployment

```bash
# SSH into VPS
ssh root@72.61.92.220

# Check logs
tail -f /root/maravilla-intelligence/.next/build.log

# Test endpoint
curl http://localhost:3000/api/avatars \
  -H "Authorization: Bearer token"
```

## Monitoring

### Key Metrics to Track

1. **Rate limit hit rate** - Percentage of requests returning 429
2. **Client IP distribution** - Which IPs are hitting the endpoint
3. **Request rate trends** - Peak request times

### Log Entries

Rate limit errors are logged with context:
```
[GET /api/avatars] Rate limited for IP 203.0.113.42 (remaining: 0)
```

## Adjusting Limits

To change the rate limit, modify `lib/ratelimit.ts`:

```typescript
// Current: 10 requests per 60 seconds
export const avatarsLimiter = new Ratelimit({
  limiter: Ratelimit.slidingWindow(10, '60 s'),  // <-- Change here
  // ...
});
```

Examples:
- Higher throughput: `Ratelimit.slidingWindow(50, '60 s')`
- Stricter limit: `Ratelimit.slidingWindow(5, '60 s')`
- Per hour: `Ratelimit.slidingWindow(1000, '60 m')`

## Troubleshooting

### Issue: Requests always return 429

**Possible causes:**
- Redis connection not configured
- Upstash credentials invalid
- Client IP not extracted correctly

**Solution:**
```typescript
// Debug mode - log IP and rate limit result
const clientIP = getClientIP(req);
const result = await checkRateLimit(avatarsLimiter, clientIP);
console.log(`[DEBUG] IP: ${clientIP}, Success: ${result.success}, Remaining: ${result.remaining}`);
```

### Issue: Rate limit not working

**Check:**
1. Verify environment variables are set
2. Test Redis connection: `curl https://your-upstash-redis.upstash.io`
3. Confirm `@upstash/redis` and `ratelimit` are installed

```bash
npm ls @upstash/redis ratelimit
```

### Issue: Different IPs not independent

The system correctly identifies IPs through proxies using:
1. `X-Forwarded-For` (take first IP in chain)
2. `X-Real-IP` (fallback)
3. Direct connection IP (final fallback)

If IPs are not being separated, check that your proxy/load balancer is sending `X-Forwarded-For` header.

## File Locations

- **Rate limiting module:** `lib/ratelimit.ts`
- **Avatars endpoint:** `app/api/avatars/route.ts`
- **Unit tests:** `tests/test-ratelimit.ts`
- **Integration tests:** `tests/test-avatars-endpoint-ratelimit.ts`
- **Documentation:** `docs/RATE_LIMITING.md`
