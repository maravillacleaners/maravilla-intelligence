# Security Fixes Verification Plan — Maravilla Intelligence Portal

**Objective:** Validate all 6 critical fixes (Auth, Rate Limiting, HTTPS, Security Headers, Error Handling, Detail Endpoints)

## Files Modified

### FIX #1: API Authentication
- **File:** `app/lib/auth-middleware.ts`
- **Changes:** Updated `verifyToken()` to support both Bearer tokens and ADMIN_SECRET
- **Exports:** `verifyToken()`, `isPublicRoute()`, `authMiddleware()`, `withAuth()`

### FIX #2: Rate Limiting  
- **File:** `app/lib/ratelimit.ts` (NEW)
- **Classes:** `RateLimiter`
- **Exports:** `avatarsLimiter`, `getClientIP()`, `checkRateLimit()`, `addRateLimitHeaders()`, `rateLimitMiddleware()`
- **Limits:** 50 requests/minute per IP, returns 429 when exceeded

### FIX #3: HTTPS/TLS
- **Location:** VPS Nginx configuration
- **Action Required:** `certbot certonly --nginx -d 72.61.92.220`
- **Test Command:** `curl https://72.61.92.220:3002/api/health`

### FIX #4: Security Headers
- **File:** `app/lib/security-headers.ts` (NEW)
- **Headers Applied:**
  - Strict-Transport-Security: max-age=31536000
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - Content-Security-Policy: default-src 'self'
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy: camera/microphone/geolocation disabled
  - X-XSS-Protection: 1; mode=block

### FIX #5: Error Handling
- **File:** `app/lib/error-handler.ts` (NEW)
- **Changes:**
  - `app/api/avatars/route.ts` - Error messages: "Internal server error" only
  - `app/api/avatars/[id]/route.ts` - Error messages: "Internal server error" only
- **No stack traces exposed to client**
- **Errors logged server-side only**

### FIX #6: Detail Endpoints
- **Verified Working:**
  - `GET /api/avatars/[id]` ✓
  - Other detail endpoints follow same pattern

### FIX #1 Middleware Application
- **File:** `middleware.ts` (updated)
- **Applies to:** ALL /api/* routes except:
  - `/api/auth/login`
  - `/api/auth/register`
  - `/api/auth/google`
  - `/api/health`
- **All other routes require valid Authorization header**

---

## Test Plan

### Phase 1: Authentication Tests (FIX #1)

```bash
# TEST 1.1: No token = 401
curl http://localhost:3002/api/avatars
# Expected: 401 Unauthorized

# TEST 1.2: Invalid token = 401
curl -H "Authorization: Bearer invalid-token" http://localhost:3002/api/avatars
# Expected: 401 Invalid or expired token

# TEST 1.3: Valid token = 200
# First, get a valid token (from login endpoint or use ADMIN_SECRET)
ADMIN_SECRET=$(grep ADMIN_SECRET .env | cut -d= -f2)
curl -H "Authorization: Bearer $ADMIN_SECRET" http://localhost:3002/api/avatars
# Expected: 200 with avatars list

# TEST 1.4: Public endpoint (no auth needed)
curl http://localhost:3002/api/auth/login
# Expected: 200 (or relevant auth response)

# TEST 1.5: Public health check
curl http://localhost:3002/api/health
# Expected: 200 with health status
```

### Phase 2: Rate Limiting Tests (FIX #2)

```bash
# TEST 2.1: 50 requests should succeed
ADMIN_SECRET=$(grep ADMIN_SECRET .env | cut -d= -f2)
for i in {1..50}; do
  curl -s -H "Authorization: Bearer $ADMIN_SECRET" \
    http://localhost:3002/api/avatars > /dev/null
  echo "Request $i: OK"
done

# TEST 2.2: Request 51+ should return 429
curl -H "Authorization: Bearer $ADMIN_SECRET" http://localhost:3002/api/avatars
# Expected: 429 Too many requests

# TEST 2.3: Check rate limit headers
curl -I -H "Authorization: Bearer $ADMIN_SECRET" http://localhost:3002/api/avatars | grep X-RateLimit
# Expected:
# X-RateLimit-Limit: 50
# X-RateLimit-Remaining: <number>
# X-RateLimit-Reset: <timestamp>

# TEST 2.4: After 1 minute, requests should work again
# (Wait 61 seconds, then retry from TEST 2.1)
sleep 61
curl -H "Authorization: Bearer $ADMIN_SECRET" http://localhost:3002/api/avatars
# Expected: 200
```

### Phase 3: HTTPS Tests (FIX #3)

```bash
# TEST 3.1: HTTP redirect to HTTPS
curl -I http://72.61.92.220:3002/
# Expected: 301 or 302 redirect to https://...

# TEST 3.2: HTTPS works
curl -I https://72.61.92.220:3002/
# Expected: 200

# TEST 3.3: Certificate valid
openssl s_client -connect 72.61.92.220:3002 -servername 72.61.92.220
# Expected: certificate details, "Verify return code: 0 (ok)"

# TEST 3.4: HSTS header present
curl -I https://72.61.92.220:3002/api/health | grep Strict-Transport
# Expected: Strict-Transport-Security: max-age=31536000...
```

### Phase 4: Security Headers Tests (FIX #4)

```bash
# TEST 4.1: All security headers present
curl -I https://72.61.92.220:3002/api/health

# Expected headers:
# Strict-Transport-Security: max-age=31536000
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Content-Security-Policy: default-src 'self'
# Referrer-Policy: strict-origin-when-cross-origin
# Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
# X-XSS-Protection: 1; mode=block

# TEST 4.2: Verify on authenticated endpoint
curl -I -H "Authorization: Bearer $ADMIN_SECRET" \
  https://72.61.92.220:3002/api/avatars | grep -E "Strict-Transport|X-Content|X-Frame|CSP"
# All headers should be present
```

### Phase 5: Error Handling Tests (FIX #5)

```bash
# TEST 5.1: 500 error does not leak details
curl -X POST \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}' \
  http://localhost:3002/api/avatars
# Expected: {"error": "Internal server error", "ok": false}
# NOT: {"error": "TypeError: xyz", "stack": "..."}

# TEST 5.2: 404 error
curl http://localhost:3002/api/avatars/nonexistent-id
# Expected: {"error": "Avatar not found"} (generic message)
```

### Phase 6: Detail Endpoint Tests (FIX #6)

```bash
# TEST 6.1: Get avatar by ID
curl -H "Authorization: Bearer $ADMIN_SECRET" \
  http://localhost:3002/api/avatars/rec123456789
# Expected: 200 with avatar data

# TEST 6.2: Get opportunities by ID
curl -H "Authorization: Bearer $ADMIN_SECRET" \
  http://localhost:3002/api/opportunities/rec123456789
# Expected: 200 with opportunity data

# TEST 6.3: Get leads by ID
curl -H "Authorization: Bearer $ADMIN_SECRET" \
  http://localhost:3002/api/leads/rec123456789
# Expected: 200 with lead data

# TEST 6.4: Detail endpoint requires auth
curl http://localhost:3002/api/avatars/rec123456789
# Expected: 401 Unauthorized
```

---

## VPS Deployment Steps

### Step 1: Deploy Code with Security Fixes

```bash
cd /root/maravilla-intelligence
git pull origin master
npm install
npm run build
docker build -t maravilla-intelligence:secure .
docker stop maravilla-intelligence || true
docker rm maravilla-intelligence || true
docker run -d \
  --name maravilla-intelligence \
  -p 3002:3000 \
  -e NODE_ENV=production \
  -e ADMIN_SECRET=maravilla-admin-2026 \
  -e JWT_SECRET=maravilla-jwt-secret-min32chars \
  -e AIRTABLE_API_KEY=$(grep AIRTABLE_API_KEY .env | cut -d= -f2) \
  -e AIRTABLE_BASE_ID=$(grep AIRTABLE_BASE_ID .env | cut -d= -f2) \
  maravilla-intelligence:secure
```

### Step 2: Install HTTPS Certificate

```bash
ssh root@72.61.92.220 << 'EOF'
apt-get update
apt-get install -y certbot python3-certbot-nginx
certbot certonly --standalone -d 72.61.92.220 -n --agree-tos --register-unsafely-without-email

# Copy certificate to Nginx config location
cp /etc/letsencrypt/live/72.61.92.220/fullchain.pem /etc/nginx/ssl/
cp /etc/letsencrypt/live/72.61.92.220/privkey.pem /etc/nginx/ssl/

# Restart Nginx
systemctl restart nginx
EOF
```

### Step 3: Update Nginx Configuration

```nginx
# /etc/nginx/sites-enabled/default (or relevant config)

server {
    listen 80;
    server_name 72.61.92.220;
    return 301 https://$host$request_uri;  # Redirect HTTP → HTTPS
}

server {
    listen 443 ssl http2;
    server_name 72.61.92.220;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Authorization $http_authorization;
    }
}
```

---

## Success Criteria

✅ All Authentication Tests pass (6/6)
✅ All Rate Limiting Tests pass (4/4)
✅ All HTTPS Tests pass (4/4)
✅ All Security Headers Tests pass (2/2)
✅ All Error Handling Tests pass (2/2)
✅ All Detail Endpoint Tests pass (4/4)
✅ No stack traces visible to clients
✅ No rate-limited requests in production
✅ Certificate valid for 90+ days
✅ All 113 APIs protected with JWT/ADMIN_SECRET

---

## Scoring Rubric

- **9.5/10:** All 6 fixes working, all tests pass, zero security issues, production-ready
- **9.0/10:** All fixes working, minor header configuration issue
- **8.5/10:** 5/6 fixes working, rate limiting partially working
- **< 8.0:** Multiple fixes missing or not working

---

## Troubleshooting

### Build Error: "Export addRateLimitHeaders doesn't exist"
**Solution:** Clear .next cache: `rm -rf .next && npm run build`

### Build Error: "Module not found: leaflet"
**Solution:** Install leaflet: `npm install leaflet`

### 401 Errors on API calls
**Solution:** Ensure `Authorization: Bearer <ADMIN_SECRET>` header is present

### 429 Errors (rate limit)
**Solution:** Wait 60 seconds or use different IP address for testing

### HTTPS Certificate Errors
**Solution:** Verify certificate is valid: `certbot certificates`

---

## Notes

- ADMIN_SECRET from `.env` acts as Bearer token for development
- Production should use proper JWT tokens
- Rate limiting resets every 60 seconds per IP
- Error logs available in Docker logs: `docker logs maravilla-intelligence`
- Security headers applied to ALL responses via middleware.ts
