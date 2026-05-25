const BASE_URL = 'http://localhost:3000'
const AIRTABLE_API_KEY = 'pat99rdlH4w13bxyF.c355b3271a8c2596ec4ff7a7095898ec56567ea71bb7981ff96f6d1c0890b920'
const BASE_ID = 'appZhXnyFiKbnOZLr'

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL' | 'WARN'
  message: string
  duration: number
}

const results: TestResult[] = []

async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now()
  try {
    await fn()
    const duration = Date.now() - start
    results.push({ name, status: 'PASS', message: 'OK', duration })
    console.log(`✓ ${name} (${duration}ms)`)
  } catch (error) {
    const duration = Date.now() - start
    results.push({
      name,
      status: 'FAIL',
      message: String(error),
      duration,
    })
    console.log(`✗ ${name}: ${error}`)
  }
}

async function main() {
  console.log('🔍 Maravilla Intelligence System Validation\n')

  // Test 1: Dashboard Accessibility
  await test('Dashboard accessible', async () => {
    const response = await fetch(`${BASE_URL}/prospects`)
    if (!response.ok) throw new Error(`Status ${response.status}`)
  })

  // Test 2: Enrich API
  await test('Enrich API endpoint', async () => {
    const response = await fetch(`${BASE_URL}/api/enrich`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        legal_name: 'Test Company LLC',
        business_email: 'test@example.com',
        website: 'https://example.com',
      }),
    })
    if (!response.ok) throw new Error(`Status ${response.status}`)
    const data = await response.json()
    if (!data.success) throw new Error('Response not successful')
  })

  // Test 3: Score API
  await test('Score API endpoint', async () => {
    const response = await fetch(`${BASE_URL}/api/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        legal_name: 'Test Company LLC',
        business_type: 'Service Provider',
        employees_estimate: 50,
        revenue_estimate: '$1M - $5M',
      }),
    })
    if (!response.ok) throw new Error(`Status ${response.status}`)
    const data = await response.json()
    if (!data.success) throw new Error('Response not successful')
    if (data.data.score < 0 || data.data.score > 100)
      throw new Error('Invalid score range')
  })

  // Test 4: Airtable Connection
  await test('Airtable API access', async () => {
    const response = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    })
    if (!response.ok) throw new Error(`Status ${response.status}`)
  })

  // Test 5: Read Intelligence Table
  await test('Airtable Intelligence table readable', async () => {
    const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/Intelligence`, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    })
    if (!response.ok) throw new Error(`Status ${response.status}`)
    const data = await response.json()
    if (!data.records) throw new Error('No records in response')
    console.log(`    Found ${data.records.length} records in Intelligence table`)
  })

  // Test 6: Check Test Data
  await test('Test prospects exist', async () => {
    const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/Intelligence`, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    })
    const data = await response.json()
    const prospects = data.records.filter(
      (r: any) => r.fields.record_type === 'prospect'
    )
    if (prospects.length < 3) {
      throw new Error(`Expected 3+ test prospects, found ${prospects.length}`)
    }
    console.log(`    ✓ Found ${prospects.length} prospects`)
  })

  // Test 7: Enrich + Score Pipeline
  await test('Full enrichment + scoring pipeline', async () => {
    // Enrich
    const enrichResponse = await fetch(`${BASE_URL}/api/enrich`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        legal_name: 'Pipeline Test Co',
        business_email: 'contact@pipelinetest.com',
        website: 'https://pipelinetest.com',
        county: 'Miami-Dade',
      }),
    })

    const enrichData = await enrichResponse.json()
    if (!enrichData.success) throw new Error('Enrichment failed')

    // Score
    const scoreResponse = await fetch(`${BASE_URL}/api/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        legal_name: enrichData.data.legal_name,
        business_type: enrichData.data.business_type,
        employees_estimate: enrichData.data.employees_estimate,
        revenue_estimate: enrichData.data.revenue_estimate,
      }),
    })

    const scoreData = await scoreResponse.json()
    if (!scoreData.success) throw new Error('Scoring failed')
    if (!scoreData.data.score) throw new Error('No score generated')
  })

  // Test 8: Database Write (create test record)
  await test('Write record to Airtable', async () => {
    const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/Intelligence`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [
          {
            fields: {
              record_type: 'prospect',
              legal_name: `Validation Test ${new Date().getTime()}`,
              business_email: 'validation@test.com',
              county: 'Test County',
              score: 75,
              priority: 'medium',
              pipeline_status: 'pending',
              icebreaker: 'System validation test record',
            },
          },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Status ${response.status}: ${JSON.stringify(error)}`)
    }

    const data = await response.json()
    if (!data.records || data.records.length === 0) {
      throw new Error('No record ID returned')
    }
  })

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 Validation Summary\n')

  const passed = results.filter((r) => r.status === 'PASS').length
  const failed = results.filter((r) => r.status === 'FAIL').length
  const warned = results.filter((r) => r.status === 'WARN').length
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0)

  console.log(`Tests Passed:  ${passed}/${results.length}`)
  console.log(`Tests Failed:  ${failed}/${results.length}`)
  console.log(`Tests Warned:  ${warned}/${results.length}`)
  console.log(`Total Time:    ${totalTime}ms\n`)

  if (failed === 0) {
    console.log('✅ All systems operational!')
    console.log('\n📋 Next Steps:')
    console.log('  1. Deploy n8n workflows')
    console.log('  2. Configure Airtable views (Prospects, Contracts, Subs, Audit)')
    console.log('  3. Test manual data import via Flow 0')
    console.log('  4. Enable scheduled discovery flows (A, B, C)')
    console.log('  5. Set up GHL sync for prospect approvals')
  } else {
    console.log('❌ System issues detected. See failures above.')
    process.exit(1)
  }
}

main().catch(console.error)
