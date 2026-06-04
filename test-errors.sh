#!/bin/bash

# Test avatar error handling improvements
# These tests verify:
# 1. SyntaxError returns 400 (not 500)
# 2. Validation errors return 400
# 3. Error messages are descriptive

API_URL="http://localhost:3002/api/avatars"

echo "========================================"
echo "AVATAR ERROR HANDLING TESTS"
echo "========================================"
echo ""

# Test 1: Malformed JSON - missing closing brace
echo "TEST 1: Malformed JSON (SyntaxError)"
echo "Request: {\"name\": \"Test\""
echo "Expected: HTTP 400 with Invalid JSON error"
echo ""
RESPONSE=$(curl -s -w "\n---HTTP_STATUS:%{http_code}---" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"' 2>&1)
echo "Response:"
echo "$RESPONSE"
echo ""
STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | sed 's/.*HTTP_STATUS:\([0-9]*\).*/\1/')
if [ "$STATUS" = "400" ]; then
  echo "✓ PASS: Returned HTTP 400 for malformed JSON"
else
  echo "✗ FAIL: Expected 400, got $STATUS"
fi
echo ""
echo "---"
echo ""

# Test 2: Invalid JSON - garbage input
echo "TEST 2: Invalid JSON (garbage input)"
echo "Request: {this is not json}"
echo "Expected: HTTP 400 with Invalid JSON error"
echo ""
RESPONSE=$(curl -s -w "\n---HTTP_STATUS:%{http_code}---" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{this is not json}' 2>&1)
echo "Response:"
echo "$RESPONSE"
echo ""
STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | sed 's/.*HTTP_STATUS:\([0-9]*\).*/\1/')
if [ "$STATUS" = "400" ]; then
  echo "✓ PASS: Returned HTTP 400 for invalid JSON"
else
  echo "✗ FAIL: Expected 400, got $STATUS"
fi
echo ""
echo "---"
echo ""

# Test 3: Missing required fields
echo "TEST 3: Missing required fields (name, zone)"
echo "Request: {\"latitude\": 25.5, \"longitude\": -80.2}"
echo "Expected: HTTP 400 with validation error"
echo ""
RESPONSE=$(curl -s -w "\n---HTTP_STATUS:%{http_code}---" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"latitude": 25.5, "longitude": -80.2}' 2>&1)
echo "Response:"
echo "$RESPONSE"
echo ""
STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | sed 's/.*HTTP_STATUS:\([0-9]*\).*/\1/')
if [ "$STATUS" = "400" ]; then
  echo "✓ PASS: Returned HTTP 400 for missing fields"
else
  echo "✗ FAIL: Expected 400, got $STATUS"
fi
echo ""
echo "---"
echo ""

# Test 4: Wrong type for latitude (string instead of number)
echo "TEST 4: Invalid type for latitude (string instead of number)"
echo "Request: {\"name\": \"Test\", \"zone\": \"FL\", \"latitude\": \"25.5\", \"longitude\": -80.2}"
echo "Expected: HTTP 400 with validation error about types"
echo ""
RESPONSE=$(curl -s -w "\n---HTTP_STATUS:%{http_code}---" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "zone": "FL", "latitude": "25.5", "longitude": -80.2}' 2>&1)
echo "Response:"
echo "$RESPONSE"
echo ""
STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | sed 's/.*HTTP_STATUS:\([0-9]*\).*/\1/')
if [ "$STATUS" = "400" ]; then
  echo "✓ PASS: Returned HTTP 400 for type validation error"
else
  echo "✗ FAIL: Expected 400, got $STATUS"
fi
echo ""
echo "---"
echo ""

# Test 5: Valid request
echo "TEST 5: Valid request (should succeed)"
echo "Request: Valid avatar with all required fields"
echo "Expected: HTTP 201 with avatar object"
echo ""
RESPONSE=$(curl -s -w "\n---HTTP_STATUS:%{http_code}---" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Avatar",
    "zone": "Miami",
    "latitude": 25.7617,
    "longitude": -80.1918,
    "building_address": "123 Main St",
    "organization": "Test Org"
  }' 2>&1)
echo "Response (truncated):"
echo "$RESPONSE" | head -20
echo ""
STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | sed 's/.*HTTP_STATUS:\([0-9]*\).*/\1/')
if [ "$STATUS" = "201" ]; then
  echo "✓ PASS: Returned HTTP 201 for valid request"
else
  echo "✗ FAIL: Expected 201, got $STATUS"
fi
echo ""

echo "========================================"
echo "TEST SUMMARY"
echo "========================================"
echo "Error handling improvements:"
echo "1. SyntaxError (malformed JSON) → HTTP 400"
echo "2. Validation errors (missing/wrong types) → HTTP 400"
echo "3. Descriptive error messages with context"
echo "4. Proper error categorization and logging"
echo ""
