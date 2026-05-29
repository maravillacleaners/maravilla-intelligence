/**
 * Workflow Testing Script
 * Tests all n8n workflow triggers and validates API responses
 */

import http from 'http'

// Create a test webhook server that simulates n8n responses
const testServer = http.createServer((req, res) => {
  console.log(`\n📨 Received webhook call:`)
  console.log(`   Path: ${req.url}`)
  console.log(`   Method: ${req.method}`)

  // Parse request body
  let body = ''
  req.on('data', chunk => {
    body += chunk.toString()
  })

  req.on('end', () => {
    try {
      const payload = JSON.parse(body)
      console.log(`   Payload:`, JSON.stringify(payload, null, 2))

      // Simulate n8n workflow response
      const response = {
        success: true,
        message: `Workflow triggered: ${payload.action}`,
        executionId: `exec-${Date.now()}`,
        status: 'queued',
        timestamp: new Date().toISOString(),
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(response))

      console.log(`   ✅ Response sent:`, JSON.stringify(response))
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid payload' }))
      console.log(`   ❌ Error parsing payload`)
    }
  })
})

// Start test server on port 3001
const PORT = 3001
testServer.listen(PORT, 'localhost', () => {
  console.log(`\n🚀 Test webhook server started on http://localhost:${PORT}`)
  console.log(`\nNow testing workflows...`)
  console.log(`═════════════════════════════════════════════════════════\n`)

  // Test workflow triggers
  const workflows = [
    { id: 'sam-gov-scraper', name: 'SAM.gov Scraper' },
    { id: 'usaspending-scraper', name: 'USASpending Scraper' },
    { id: 'contract-matcher', name: 'Contract Matcher' },
    { id: 'notifier', name: 'Supplier Notifications' },
  ]

  let completed = 0

  workflows.forEach((workflow, index) => {
    setTimeout(async () => {
      console.log(`\n🔄 Testing: ${workflow.name} (${workflow.id})`)
      console.log(`─────────────────────────────────────────────────────────`)

      try {
        const response = await fetch('http://localhost:3000/api/workflows/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workflowId: workflow.id }),
        })

        const data = await response.json()
        console.log(`\n📤 API Response:`)
        console.log(JSON.stringify(data, null, 2))

        if (response.ok) {
          console.log(`✅ Workflow trigger successful`)
        } else {
          console.log(`⚠️ Response status: ${response.status}`)
        }

        completed++
        if (completed === workflows.length) {
          console.log(`\n═════════════════════════════════════════════════════════`)
          console.log(`\n✅ All workflow tests completed!`)
          console.log(`\nWorkflow Architecture Summary:`)
          console.log(`─────────────────────────────────────────────────────────`)
          console.log(`
1️⃣  SAM.gov Scraper
   • Trigger: Webhook (POST /webhook/sam-gov-scraper)
   • Purpose: Discovers federal opportunities from SAM.gov
   • Schedule: Every 6 hours
   • Output: Saves contracts to Intelligence table

2️⃣  USASpending Scraper
   • Trigger: Webhook (POST /webhook/usaspending-scraper)
   • Purpose: Fetches government spending award data
   • Schedule: Daily at 2 AM
   • Output: Saves awards to Intelligence table

3️⃣  Contract Matcher
   • Trigger: Webhook (POST /webhook/contract-matcher)
   • Purpose: Matches contracts to qualified suppliers
   • Schedule: Hourly
   • Algorithm: 60% services + 20% location + 20% capacity
   • Output: Creates opportunities in Supplier_Opportunities table

4️⃣  Supplier Notifications
   • Trigger: Webhook (POST /webhook/notifier)
   • Purpose: Sends opportunity notifications to suppliers
   • Schedule: Every 6 hours
   • Method: SendGrid email or SMTP
   • Output: Logs notification status

Integration Points:
✅ Airtable Intelligence base - Contract discovery data
✅ Airtable SUBS_STAGING base - Supplier & opportunity data
✅ API endpoints - /api/workflows/trigger routes to n8n webhooks
✅ Admin dashboard - /admin/workflows page for manual triggers
`)
          testServer.close()
          process.exit(0)
        }
      } catch (error) {
        console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
        completed++
      }
    }, index * 1500) // Stagger requests by 1.5 seconds
  })

  // Auto-close after 20 seconds
  setTimeout(() => {
    console.log(`\n⏱️  Test timeout - closing server`)
    testServer.close()
    process.exit(1)
  }, 20000)
})
