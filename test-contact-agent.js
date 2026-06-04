/**
 * Test script for Contact Discovery Agent
 * Run with: node test-contact-agent.js
 */

const { ContactDiscoveryAgent } = require('./dist/lib/agent-contact-discovery.js')

async function main() {
  console.log('🔍 Testing Contact Discovery Agent...\n')

  try {
    // Check environment variables
    console.log('📋 Environment check:')
    console.log('  AIRTABLE_API_KEY:', process.env.AIRTABLE_API_KEY ? '✓ Set' : '✗ Missing')
    console.log('  AIRTABLE_BASE_ID:', process.env.AIRTABLE_BASE_ID ? '✓ Set' : '✗ Missing')
    console.log('  HUNTER_API_KEY:', process.env.HUNTER_API_KEY ? '✓ Set' : '✗ Missing')
    console.log()

    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      console.error('❌ Missing required environment variables')
      process.exit(1)
    }

    // Create agent instance
    console.log('🚀 Creating agent instance...')
    const agent = new ContactDiscoveryAgent()
    console.log('✓ Agent created')
    console.log()

    // Test domain inference
    console.log('🧪 Testing domain inference:')
    const testCases = [
      { name: 'Acme Corporation', expected: 'acme.com' },
      { name: 'Tech Solutions Inc.', expected: 'techsolutions.com' },
      { name: 'Smith & Associates LLC', expected: 'smithassociates.com' },
    ]

    for (const test of testCases) {
      const domain = agent.inferDomain(test.name)
      console.log(`  "${test.name}" → "${domain}" ${domain === test.expected ? '✓' : '⚠'}`)
    }
    console.log()

    // Test Hunter pattern application
    console.log('🧪 Testing Hunter pattern application:')
    const pattern = '{first}.{last}'
    const name = 'John Smith'
    const email = agent.applyHunterPattern(pattern, name)
    console.log(`  Pattern: "${pattern}" + "${name}" → "${email}"`)
    console.log()

    // Execute discovery
    console.log('⏱️  Executing discovery (this may take a minute)...')
    const results = await agent.execute()

    console.log()
    console.log('✅ Discovery completed!')
    console.log()
    console.log('📊 Results:')
    console.log(JSON.stringify(results, null, 2))

    if (results.length > 0) {
      const summary = {
        companies: results.length,
        totalContactsCreated: results.reduce((sum, r) => sum + r.contacts_created, 0),
        totalContactsFound: results.reduce((sum, r) => sum + r.contacts_found, 0),
      }
      console.log()
      console.log('📈 Summary:')
      console.log(`  Companies processed: ${summary.companies}`)
      console.log(`  Total contacts created: ${summary.totalContactsCreated}`)
      console.log(`  Total contacts found: ${summary.totalContactsFound}`)
    }

    process.exit(0)
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

main()
