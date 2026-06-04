#!/usr/bin/env node

/**
 * Test script to verify Census API configuration and connectivity
 * Run: npx ts-node scripts/test-census-api.ts
 */

import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const CENSUS_API_KEY = process.env.CENSUS_API_KEY
const CENSUS_API_BASE = 'https://api.census.gov/data'

interface TestResult {
  name: string
  passed: boolean
  message: string
  duration: number
}

const results: TestResult[] = []

async function test(
  name: string,
  fn: () => Promise<void>
): Promise<void> {
  const start = Date.now()
  try {
    await fn()
    const duration = Date.now() - start
    results.push({ name, passed: true, message: 'OK', duration })
    console.log(`✓ ${name} (${duration}ms)`)
  } catch (error) {
    const duration = Date.now() - start
    const message = error instanceof Error ? error.message : String(error)
    results.push({ name, passed: false, message, duration })
    console.log(`✗ ${name}`)
    console.log(`  Error: ${message}`)
  }
}

async function main() {
  console.log('\nCensus API Configuration & Connectivity Tests\n')
  console.log('=' .repeat(50))

  // Test 1: API Key configured
  await test('API Key Configured', async () => {
    if (!CENSUS_API_KEY) {
      throw new Error('CENSUS_API_KEY environment variable not set')
    }
    console.log(`  Key: ${CENSUS_API_KEY.substring(0, 10)}...`)
  })

  // Test 2: Query Florida population
  await test('Query Florida Population', async () => {
    const url = `${CENSUS_API_BASE}/2021/acs/acs5?get=NAME,B01003_001E&for=state:12&key=${CENSUS_API_KEY}`
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }

    const data = await response.json()
    if (!Array.isArray(data) || data.length < 2) {
      throw new Error('Invalid response format')
    }

    const headers = data[0]
    const record = data[1]
    const population = record[headers.indexOf('B01003_001E')]

    console.log(`  Florida population: ${population}`)
  })

  // Test 3: Query Lee County (Fort Myers, FL)
  await test('Query Lee County Demographics', async () => {
    const variables = ['B01003_001E', 'B19013_001E', 'B15003_022E']
    const variablesStr = variables.join(',')
    const url = `${CENSUS_API_BASE}/2021/acs/acs5?get=NAME,${variablesStr}&for=county:12,071&key=${CENSUS_API_KEY}`

    const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    if (!Array.isArray(data) || data.length < 2) {
      throw new Error('Invalid response format')
    }

    const headers = data[0]
    const record = data[1]
    const name = record[headers.indexOf('NAME')]
    const population = record[headers.indexOf('B01003_001E')]
    const income = record[headers.indexOf('B19013_001E')]
    const bachelors = record[headers.indexOf('B15003_022E')]

    console.log(`  ${name}`)
    console.log(`    Population: ${population}`)
    console.log(`    Median Income: $${income}`)
    console.log(`    Bachelor's Degrees: ${bachelors}`)
  })

  // Test 4: Query all Florida counties
  await test('Query All Florida Counties', async () => {
    const url = `${CENSUS_API_BASE}/2021/acs/acs5?get=NAME,B01003_001E&for=county:12,*&key=${CENSUS_API_KEY}`
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    if (!Array.isArray(data) || data.length < 2) {
      throw new Error('Invalid response format')
    }

    const countyCount = data.length - 1
    console.log(`  Found ${countyCount} Florida counties`)

    // Show top 3 by population
    const headers = data[0]
    const popIdx = headers.indexOf('B01003_001E')
    const nameIdx = headers.indexOf('NAME')

    const counties = data
      .slice(1)
      .map(row => ({ name: row[nameIdx], pop: parseInt(row[popIdx], 10) }))
      .sort((a, b) => b.pop - a.pop)
      .slice(0, 3)

    console.log(`  Top 3 counties by population:`)
    counties.forEach((county, i) => {
      console.log(`    ${i + 1}. ${county.name}: ${county.pop.toLocaleString()}`)
    })
  })

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log(`\nResults: ${results.filter(r => r.passed).length}/${results.length} passed\n`)

  results.forEach(r => {
    const status = r.passed ? '✓' : '✗'
    console.log(`${status} ${r.name.padEnd(40)} (${r.duration}ms)`)
    if (!r.passed) {
      console.log(`  ${r.message}`)
    }
  })

  const allPassed = results.every(r => r.passed)
  const exitCode = allPassed ? 0 : 1

  console.log(`\n${allPassed ? 'All tests passed!' : 'Some tests failed.'}`)
  console.log('\nSetup Documentation:')
  console.log('  See docs/CENSUS_API_SETUP.md for integration instructions')

  process.exit(exitCode)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
