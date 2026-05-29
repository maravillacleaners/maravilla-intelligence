#!/bin/bash
# Test all 4 n8n workflows to verify they execute successfully

N8N_URL="https://n8n.srv1112587.hstgr.cloud"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     Testing All n8n Workflows                                 ║"
echo "║     Federal Opportunity Discovery System                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Test 1: HigherGov Scraper
echo "🧪 Test 1: HigherGov Scraper"
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${N8N_URL}/webhook/highergov-scraper")
if [ "$response" = "200" ]; then
    echo "✅ PASSED (Status: $response)"
else
    echo "❌ FAILED (Status: $response)"
fi
sleep 2

# Test 2: Deduplication Engine
echo ""
echo "🧪 Test 2: Deduplication Engine"
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${N8N_URL}/webhook/deduplication-engine")
if [ "$response" = "200" ]; then
    echo "✅ PASSED (Status: $response)"
else
    echo "❌ FAILED (Status: $response)"
fi
sleep 2

# Test 3: Contract Matcher
echo ""
echo "🧪 Test 3: Contract Matcher"
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${N8N_URL}/webhook/contract-matcher")
if [ "$response" = "200" ]; then
    echo "✅ PASSED (Status: $response)"
else
    echo "❌ FAILED (Status: $response)"
fi
sleep 2

# Test 4: Supplier Notifications
echo ""
echo "🧪 Test 4: Supplier Notifications"
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${N8N_URL}/webhook/supplier-notifications")
if [ "$response" = "200" ]; then
    echo "✅ PASSED (Status: $response)"
else
    echo "❌ FAILED (Status: $response)"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    TEST SUMMARY                               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ All 4 workflows tested"
echo ""
echo "Next steps:"
echo "1. Monitor Airtable Intelligence table for new opportunities"
echo "2. Check Supplier_Opportunities for new matches"
echo "3. Review n8n execution logs for any errors"
echo ""
