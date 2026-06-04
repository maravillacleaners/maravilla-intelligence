/**
 * SAM Discovery Agent - Integration Examples
 *
 * Shows various ways to use the SAM Discovery Agent
 * in your application and workflows.
 */

import { runSAMDiscoveryAgent } from '@/lib/agents/sam-discovery-agent'
import { SAMDiscoveryScheduler, initializeSAMScheduler } from '@/lib/agents/sam-discovery-scheduler'

/**
 * Example 1: Simple Usage - Run Discovery Once
 */
export async function example1_runOnce() {
  console.log('Example 1: Run SAM Discovery Once')

  try {
    const result = await runSAMDiscoveryAgent(7) // 7 days back
    console.log('Discovery completed:', result)

    if (result.status === 'success') {
      console.log(`✅ Saved ${result.recordsSaved} new opportunities`)
    } else {
      console.log(`⚠️ Partial completion: ${result.errors.length} errors`)
    }
  } catch (error) {
    console.error('❌ Discovery failed:', error)
  }
}

/**
 * Example 2: Scheduled Runs - Start Continuous Monitoring
 */
export function example2_startScheduler() {
  console.log('Example 2: Start Scheduled Discovery')

  const scheduler = initializeSAMScheduler({
    interval: 6 * 60 * 60 * 1000, // 6 hours
    daysBack: 7,
    maxRetries: 3,
    enabled: true,
  })

  // Start the scheduler
  scheduler.start()

  // Later, check status
  const status = scheduler.getStatus()
  console.log('Scheduler status:', status)

  // Stop when needed
  // scheduler.stop()
}

/**
 * Example 3: API Integration - Trigger from HTTP Endpoint
 */
export async function example3_apiEndpoint(request: Request) {
  console.log('Example 3: API Endpoint Integration')

  // This would be your /api/agents/sam-discovery handler
  const url = new URL(request.url)
  const daysBack = parseInt(url.searchParams.get('daysBack') || '7')

  try {
    const result = await runSAMDiscoveryAgent(daysBack)
    return new Response(JSON.stringify(result), {
      status: result.status === 'error' ? 500 : 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * Example 4: Integration with Lead Processing
 */
export async function example4_leadEnrichment() {
  console.log('Example 4: Discover Opportunities then Enrich Leads')

  try {
    // Step 1: Discover new opportunities
    const result = await runSAMDiscoveryAgent(7)

    if (result.recordsSaved === 0) {
      console.log('No new opportunities found')
      return
    }

    // Step 2: Trigger lead enrichment for the new opportunities
    // This would integrate with your existing enrichment workflow
    console.log(`🔍 Discovered ${result.recordsSaved} opportunities, enriching...`)

    // Example: Call your enrichment API
    // const enrichResult = await fetch('/api/discovery/enrich', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     recordsCreated: result.recordsSaved,
    //     source: 'sam-gov',
    //   }),
    // })

    console.log('✅ Enrichment triggered')
  } catch (error) {
    console.error('❌ Enrichment failed:', error)
  }
}

/**
 * Example 5: Slack Notifications
 */
export async function example5_slackNotification() {
  console.log('Example 5: Post Discovery Results to Slack')

  try {
    const result = await runSAMDiscoveryAgent(7)

    // Build Slack message
    const color = result.status === 'success' ? '#36a64f' : '#ff9900'
    const statusEmoji = result.status === 'success' ? '✅' : '⚠️'

    const slackMessage = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${statusEmoji} SAM Discovery Agent Results`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Status*\n${result.status.toUpperCase()}`,
            },
            {
              type: 'mrkdwn',
              text: `*Records Processed*\n${result.recordsProcessed}`,
            },
            {
              type: 'mrkdwn',
              text: `*Records Saved*\n${result.recordsSaved}`,
            },
            {
              type: 'mrkdwn',
              text: `*Errors*\n${result.errors.length > 0 ? result.errors.length : 'None'}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Message*\n${result.message}`,
          },
        },
      ],
    }

    // Post to Slack
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage),
      })
      console.log('✅ Slack notification sent')
    }
  } catch (error) {
    console.error('❌ Notification failed:', error)
  }
}

/**
 * Example 6: Watch Automation - Auto-Create Watches for High-Value Opps
 */
export async function example6_watchAutomation() {
  console.log('Example 6: Auto-Create Watches for High-Value Opportunities')

  try {
    const result = await runSAMDiscoveryAgent(7)

    // In a real scenario, you'd fetch the newly created opportunities
    // and analyze their estimated values
    console.log(`Found ${result.recordsSaved} new opportunities`)

    // Example logic:
    // for (const opp of newOpportunities) {
    //   if (opp.estimatedValue > 500000 && opp.agency.includes('Federal')) {
    //     // Auto-create a watch for high-value federal contracts
    //     await fetch('/api/discovery/watches', {
    //       method: 'POST',
    //       headers: { 'Content-Type': 'application/json' },
    //       body: JSON.stringify({
    //         title: opp.title,
    //         agency: opp.agency,
    //         naicsCode: opp.naicsCode,
    //         minValue: 500000,
    //         source: 'sam-gov',
    //       }),
    //     })
    //   }
    // }

    console.log('✅ Watch automation complete')
  } catch (error) {
    console.error('❌ Watch automation failed:', error)
  }
}

/**
 * Example 7: Batch Processing with Retry Logic
 */
export async function example7_batchWithRetry() {
  console.log('Example 7: Batch Processing with Retry')

  const maxRetries = 3
  let attempt = 1

  while (attempt <= maxRetries) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}...`)
      const result = await runSAMDiscoveryAgent(7)

      if (result.status === 'success') {
        console.log(`✅ Success on attempt ${attempt}`)
        return result
      }

      // Partial success - continue
      if (result.status === 'partial') {
        console.log(`⚠️ Partial success on attempt ${attempt}`)
        return result
      }

      throw new Error(result.errors?.[0] || 'Unknown error')
    } catch (error) {
      if (attempt < maxRetries) {
        console.log(`Retrying in 5 seconds...`)
        await new Promise((resolve) => setTimeout(resolve, 5000))
        attempt++
      } else {
        console.error(`❌ Failed after ${maxRetries} attempts:`, error)
        throw error
      }
    }
  }
}

/**
 * Example 8: Monitoring and Analytics
 */
export async function example8_monitoring() {
  console.log('Example 8: Discovery Analytics')

  const runs: Array<{
    timestamp: string
    recordsProcessed: number
    recordsSaved: number
    duration: number
  }> = []

  // Simulate multiple runs
  for (let i = 0; i < 3; i++) {
    const start = Date.now()
    const result = await runSAMDiscoveryAgent(7)
    const duration = Date.now() - start

    runs.push({
      timestamp: result.timestamp,
      recordsProcessed: result.recordsProcessed,
      recordsSaved: result.recordsSaved,
      duration,
    })

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  // Calculate statistics
  const totalRecords = runs.reduce((sum, r) => sum + r.recordsSaved, 0)
  const avgDuration = runs.reduce((sum, r) => sum + r.duration, 0) / runs.length
  const successRate = (runs.filter((r) => r.recordsSaved > 0).length / runs.length) * 100

  console.log('📊 Analytics Summary:')
  console.log(`- Total Records Saved: ${totalRecords}`)
  console.log(`- Average Duration: ${avgDuration.toFixed(0)}ms`)
  console.log(`- Success Rate: ${successRate.toFixed(1)}%`)
}

/**
 * Example 9: Custom Filtering
 */
export async function example9_customFiltering() {
  console.log('Example 9: Custom Filtering by Agency')

  // Run discovery
  const result = await runSAMDiscoveryAgent(7)

  // In a real scenario, you'd filter the Airtable records by agency
  // This is just a demonstration of the concept
  const targetAgencies = ['Department of Health', 'Department of Education', 'EPA']

  console.log(`Filtering ${result.recordsProcessed} opportunities for target agencies...`)

  // Example:
  // const filteredUrl = `${AT}/Opportunities?filterByFormula=${encodeURIComponent(
  //   `OR(${targetAgencies.map((a) => `{Agency}="${a}"`).join(',')})`
  // )}`

  console.log(`✅ Filtered ${targetAgencies.length} target agencies`)
}

/**
 * Example 10: Integration with Existing Workflows
 */
export async function example10_fullWorkflow() {
  console.log('Example 10: Full Integration Workflow')

  try {
    // 1. Discover new opportunities
    console.log('📡 Discovering new federal opportunities...')
    const discovery = await runSAMDiscoveryAgent(7)

    if (discovery.status === 'error') {
      throw new Error(`Discovery failed: ${discovery.message}`)
    }

    console.log(`✅ Discovered ${discovery.recordsSaved} new opportunities`)

    // 2. Enrich the opportunities
    console.log('🔍 Enriching opportunity data...')
    // await enrichOpportunities(discovery.recordsSaved)

    // 3. Create watches for high-priority opportunities
    console.log('👁️ Creating watches for high-priority opportunities...')
    // await createWatchesForHighPriority()

    // 4. Notify stakeholders
    console.log('📬 Notifying stakeholders...')
    // await notifySlack(discovery)

    // 5. Log metrics
    console.log('📊 Logging metrics...')
    // await logMetrics(discovery)

    console.log('✨ Full workflow completed successfully!')

    return {
      discovery: discovery.recordsSaved,
      enriched: 'pending',
      watches: 'pending',
      notifications: 'sent',
    }
  } catch (error) {
    console.error('❌ Workflow failed:', error)
    throw error
  }
}

// Main - Demonstrate all examples
if (require.main === module) {
  (async () => {
    console.log('='.repeat(60))
    console.log('SAM Discovery Agent - Integration Examples')
    console.log('='.repeat(60))
    console.log()

    // Run examples
    // Uncomment to run specific examples:

    // await example1_runOnce()
    // example2_startScheduler()
    // await example4_leadEnrichment()
    // await example5_slackNotification()
    // await example8_monitoring()

    console.log()
    console.log('Examples complete! See source code for more usage patterns.')
  })()
}
