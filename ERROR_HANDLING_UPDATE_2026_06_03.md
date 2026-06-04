# Avatar API Error Handling Update (2026-06-03)

## Overview
Updated error handling in `/app/api/avatars/route.ts` to properly categorize errors and return appropriate HTTP status codes with descriptive messages.

## Changes Made

### 1. JSON Parsing Error Handling (Lines 128-143)
**Problem:** Malformed JSON returned HTTP 500 (server error) instead of HTTP 400 (client error)
**Solution:** Catch `SyntaxError` explicitly and return HTTP 400

```typescript
let body: any
try {
  body = await req.json()
} catch (parseErr) {
  if (parseErr instanceof SyntaxError) {
    console.warn('[POST /api/avatars] Invalid JSON:', parseErr.message)
    return NextResponse.json(
      {
        error: 'Invalid JSON: ' + parseErr.message,
        ok: false
      },
      { status: 400 }
    )
  }
  throw parseErr
}
```

### 2. Request Validation (Lines 158-170)
**Improvements:**
- Check for missing required fields → HTTP 400
- Validate field types (latitude/longitude must be numbers) → HTTP 400
- Descriptive error messages with 'Validation error:' prefix

```typescript
if (!name || !zone || latitude === null || longitude === null) {
  return NextResponse.json(
    { error: 'Validation error: name, zone, latitude, longitude are required', ok: false },
    { status: 400 }
  )
}

if (typeof latitude !== 'number' || typeof longitude !== 'number') {
  return NextResponse.json(
    { error: 'Validation error: latitude and longitude must be numbers', ok: false },
    { status: 400 }
  )
}
```

### 3. Airtable Error Handling (Lines 201-208)
**Improvements:**
- Capture full error details from Airtable response
- Log error with status code and response body
- Return HTTP 500 with descriptive message

```typescript
if (!createRes.ok) {
  const errDetails = await createRes.text()
  console.error('[POST /api/avatars] Airtable error:', createRes.status, errDetails)
  return NextResponse.json(
    { error: `Airtable error ${createRes.status}: failed to create avatar`, ok: false },
    { status: 500 }
  )
}
```

### 4. Generic Error Handler (Lines 221-228)
**Improvements:**
- Catch all unexpected errors
- Prefix messages with 'Server error:' for clarity
- Return HTTP 500 for unknown issues
- Check if error is Error instance for safer message extraction

```typescript
} catch (err) {
  console.error('[POST /api/avatars] Unexpected error:', err)
  const errorMsg = err instanceof Error ? err.message : String(err)
  return NextResponse.json(
    { error: 'Server error: ' + errorMsg, ok: false },
    { status: 500 }
  )
}
```

### 5. Rate Limiting Module (New: lib/ratelimit.ts)
Created in-memory rate limiter to replace missing Upstash dependency:
- 10 requests per 60 seconds for avatars endpoint
- 30 requests per 60 seconds for discovery endpoints
- Proper IP extraction from proxied requests
- Fail-open behavior (allows requests if limiter fails)

## Test Results

### Test 1: Malformed JSON
```
Request: {"name": "Test"  (missing closing brace)
Response: {
  "error": "Invalid JSON: Expected ',' or '}' after property value in JSON at position 15",
  "ok": false
}
HTTP Status: 400 ✓
```

### Test 2: Missing Required Fields
```
Request: {"latitude": 25.5, "longitude": -80.2}
Response: {
  "error": "Validation error: name, zone, latitude, longitude are required",
  "ok": false
}
HTTP Status: 400 ✓
```

### Test 3: Invalid Field Type
```
Request: {"name": "Test", "zone": "FL", "latitude": "25.5", "longitude": -80.2}
Response: {
  "error": "Validation error: latitude and longitude must be numbers",
  "ok": false
}
HTTP Status: 400 ✓
```

## HTTP Status Code Mapping

| Error Type | Status | Example |
|-----------|--------|---------|
| Malformed JSON | 400 | Invalid JSON: ... |
| Missing fields | 400 | Validation error: ... required |
| Wrong types | 400 | Validation error: ... must be numbers |
| Rate limit exceeded | 429 | Too many requests |
| Airtable error | 500 | Airtable error 400: ... |
| Unexpected error | 500 | Server error: ... |
| Success | 201/200 | Response object |

## Deployment
- Committed to master: `83bcd7b`
- Pushed to GitHub (maravillacleaners/maravilla-intelligence)
- GitHub Actions will auto-deploy to VPS 72.61.92.220

## Files Modified
- `app/api/avatars/route.ts` - Error handling improvements
- `lib/ratelimit.ts` - Created new rate limiting module

## Client Impact
Clients can now properly distinguish between:
- **4xx errors** (client problems) - fix your request
- **5xx errors** (server problems) - retry or escalate

Each error response includes:
- Descriptive `error` message
- `ok: false` flag
- Appropriate HTTP status code
- Optional rate limit headers (for 429 responses)
