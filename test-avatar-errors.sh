#!/bin/bash

# Test script for avatar error handling

API_URL="http://localhost:3002/api/avatars"

echo "=== Avatar Error Handling Tests ==="
echo ""

# Test 1: Malformed JSON (should return 400)
echo "TEST 1: Malformed JSON (missing closing brace)"
echo "Expected: HTTP 400 with 'Invalid JSON' error"
echo "Request: {\"name\": \"Test\", \"zone\": \"FL\""
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "zone": "FL"')
echo "Response:"
echo "$RESPONSE"
echo ""
echo "---"
echo ""

# Test 2: Completely invalid JSON (should return 400)
echo "TEST 2: Completely invalid JSON"
echo "Expected: HTTP 400 with 'Invalid JSON' error"
echo "Request: not json at all"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d 'not json at all')
echo "Response:"
echo "$RESPONSE"
echo ""
echo "---"
echo ""

# Test 3: Missing required fields (should return 400)
echo "TEST 3: Missing required fields (name and zone)"
echo "Expected: HTTP 400 with 'Validation error'"
echo "Request: {\"latitude\": 25.5, \"longitude\": -80.2}"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"latitude": 25.5, "longitude": -80.2}')
echo "Response:"
echo "$RESPONSE"
echo ""
echo "---"
echo ""

# Test 4: Invalid latitude/longitude types (should return 400)
echo "TEST 4: Invalid latitude/longitude types (strings instead of numbers)"
echo "Expected: HTTP 400 with 'Validation error'"
echo "Request: {\"name\": \"Test\", \"zone\": \"FL\", \"latitude\": \"25.5\", \"longitude\": \"-80.2\"}"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "zone": "FL", "latitude": "25.5", "longitude": "-80.2"}')
echo "Response:"
echo "$RESPONSE"
echo ""
echo "---"
echo ""

# Test 5: Valid request (should return 201)
echo "TEST 5: Valid request (should return 201)"
echo "Expected: HTTP 201 with avatar object"
echo "Request: Valid avatar creation"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Avatar", "zone": "Miami", "latitude": 25.7617, "longitude": -80.1918}')
echo "Response:"
echo "$RESPONSE"
echo ""
echo "=== Tests Complete ==="
