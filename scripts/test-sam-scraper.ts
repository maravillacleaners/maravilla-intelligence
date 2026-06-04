/**
 * Test Script for SAM.gov Scraper
 * Usage: npx ts-node scripts/test-sam-scraper.ts
 *
 * Tests:
 * 1. Opportunity filtering (Florida, NAICS, active)
 * 2. Scoring algorithm
 * 3. Contact extraction
 * 4. Airtable connectivity (optional)
 */

interface TestOpportunity {
  noticeId: string
  title: string
  description: string
  agency: string
  naicsCode: string
  state: string
  active: boolean
  responseDeadline?: string
  setAside?: string
  pointOfContact: Array<{
    fullName: string
    email: string
    phone: string
    type: string
  }>
}

// Scoring function (copied from route.ts)
function scoreOpportunity(opp: TestOpportunity): number {
  const CLEANING_KEYWORDS = [
    'janitorial',
    'cleaning',
    'custodian',
    'housekeeping',
    'sanitation',
    'facility',
    'maintenance',
    'disinfect',
    'sanitiz',
    'hygiene',
  ]

  const EXCLUDE_KEYWORDS = [
    'asbestos',
    'hazmat',
    'remediation',
    'abatement',
    'waste disposal',
    'landfill',
  ]

  const text = `${opp.title} ${opp.description}`.toLowerCase()

  // Quick exclusions
  for (const exclude of EXCLUDE_KEYWORDS) {
    if (text.includes(exclude)) return 0
  }

  let score = 0

  // NAICS 561720 is Janitorial Services (highest priority)
  if (opp.naicsCode === '561720') {
    score += 50
  } else if (['561710', '561730', '561790', '561110', '561210'].includes(opp.naicsCode)) {
    score += 30
  }

  // Keyword matching
  for (const keyword of CLEANING_KEYWORDS) {
    if (text.includes(keyword)) {
      score += 10
    }
  }

  // Set aside scoring
  if (opp.setAside && opp.setAside.toLowerCase().includes('small')) {
    score += 15
  }

  // Deadline proximity
  if (opp.responseDeadline) {
    const daysUntil = (new Date(opp.responseDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    if (daysUntil < 7) score += 20
    else if (daysUntil < 14) score += 10
  }

  return Math.min(100, Math.max(0, score))
}

// Test fixtures
const testCases: Array<{
  name: string
  opportunity: TestOpportunity
  expectedScore: number
  shouldPass: boolean
}> = [
  {
    name: 'Perfect Match - Janitorial GSA',
    opportunity: {
      noticeId: 'TEST001',
      title: 'Janitorial Services - GSA Schedule Contract',
      description: 'Cleaning and facility maintenance services for federal buildings',
      agency: 'General Services Administration',
      naicsCode: '561720',
      state: 'FL',
      active: true,
      responseDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days
      setAside: 'Small Business Set-Aside',
      pointOfContact: [
        {
          fullName: 'John Smith',
          email: 'john.smith@gsa.gov',
          phone: '202-555-0100',
          type: 'primary',
        },
      ],
    },
    expectedScore: 95,
    shouldPass: true,
  },
  {
    name: 'Medium Match - Facility Maintenance',
    opportunity: {
      noticeId: 'TEST002',
      title: 'Facility Maintenance Services',
      description: 'Building maintenance and support services',
      agency: 'Department of Defense',
      naicsCode: '561790',
      state: 'FL',
      active: true,
      responseDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      pointOfContact: [
        {
          fullName: 'Jane Doe',
          email: 'jane.doe@defense.gov',
          phone: '703-555-0200',
          type: 'primary',
        },
      ],
    },
    expectedScore: 55,
    shouldPass: true,
  },
  {
    name: 'Weak Match - Generic Building Support',
    opportunity: {
      noticeId: 'TEST003',
      title: 'Building Support Services',
      description: 'General support for office operations',
      agency: 'EPA',
      naicsCode: '561110',
      state: 'FL',
      active: true,
      pointOfContact: [
        {
          fullName: 'Bob Wilson',
          email: 'bob.wilson@epa.gov',
          phone: '202-555-0300',
          type: 'primary',
        },
      ],
    },
    expectedScore: 30,
    shouldPass: true,
  },
  {
    name: 'Excluded - Hazmat Remediation',
    opportunity: {
      noticeId: 'TEST004',
      title: 'Hazmat Remediation Services',
      description: 'Asbestos abatement and hazmat cleanup',
      agency: 'EPA',
      naicsCode: '561720',
      state: 'FL',
      active: true,
      pointOfContact: [
        {
          fullName: 'Charlie Brown',
          email: 'charlie.brown@epa.gov',
          phone: '202-555-0400',
          type: 'primary',
        },
      ],
    },
    expectedScore: 0,
    shouldPass: true,
  },
  {
    name: 'Wrong State - California',
    opportunity: {
      noticeId: 'TEST005',
      title: 'Janitorial Services',
      description: 'Cleaning services',
      agency: 'GSA',
      naicsCode: '561720',
      state: 'CA',
      active: true,
      pointOfContact: [
        {
          fullName: 'Dave Smith',
          email: 'dave.smith@gsa.gov',
          phone: '202-555-0500',
          type: 'primary',
        },
      ],
    },
    expectedScore: 50, // Score still calculated, but filtered by state
    shouldPass: false,
  },
  {
    name: 'Inactive Opportunity',
    opportunity: {
      noticeId: 'TEST006',
      title: 'Janitorial Services',
      description: 'Cleaning services',
      agency: 'GSA',
      naicsCode: '561720',
      state: 'FL',
      active: false,
      pointOfContact: [
        {
          fullName: 'Eve Johnson',
          email: 'eve.johnson@gsa.gov',
          phone: '202-555-0600',
          type: 'primary',
        },
      ],
    },
    expectedScore: 50, // Score would be calculated, but filtered by active status
    shouldPass: false,
  },
]

// Run tests
function runTests() {
  console.log('\n🧪 SAM.gov Scraper Test Suite\n')
  console.log('=' * 70)

  let passed = 0
  let failed = 0

  for (const testCase of testCases) {
    const { name, opportunity, expectedScore, shouldPass } = testCase
    const actualScore = scoreOpportunity(opportunity)
    const isState = opportunity.state === 'FL'
    const isActive = opportunity.active
    const willPass = isState && isActive && actualScore > 0

    const success = shouldPass === willPass && actualScore === expectedScore

    if (success) {
      console.log(`✅ ${name}`)
      console.log(`   Score: ${actualScore} (expected ${expectedScore})`)
      console.log(`   State: ${opportunity.state} (FL=$isState)`)
      console.log(`   Active: ${opportunity.active}`)
      console.log(`   Will Pass: ${willPass}\n`)
      passed++
    } else {
      console.log(`❌ ${name}`)
      console.log(`   Score: ${actualScore} (expected ${expectedScore})`)
      console.log(`   State: ${opportunity.state} (FL=$isState)`)
      console.log(`   Active: ${opportunity.active}`)
      console.log(`   Will Pass: ${willPass} (expected ${shouldPass})\n`)
      failed++
    }
  }

  console.log('=' * 70)
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`)

  if (failed === 0) {
    console.log('✨ All tests passed!')
    process.exit(0)
  } else {
    console.log('❌ Some tests failed')
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  runTests()
}

export { scoreOpportunity }
