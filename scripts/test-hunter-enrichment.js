#!/usr/bin/env node

/**
 * Hunter.io Enrichment Connectivity Test
 * Tests connection, rate limits, and data quality
 * Usage: node scripts/test-hunter-enrichment.js [domain]
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const HUNTER_API_KEY = process.env.HUNTER_API_KEY;
const HUNTER_API_URL = 'https://api.hunter.io/v2';

const TEST_DOMAINS = [
  'google.com',
  'microsoft.com',
  'example.com',
  'nasa.gov',
];

/**
 * Test Hunter.io API connectivity and authentication
 */
async function testConnectivity() {
  console.log('\n[TEST] Hunter.io API Connectivity\n');

  if (!HUNTER_API_KEY) {
    console.error('ERROR: HUNTER_API_KEY not configured in .env');
    return {
      status: 'error',
      message: 'HUNTER_API_KEY missing',
      configured: false,
    };
  }

  console.log('✓ HUNTER_API_KEY configured');

  try {
    // Test basic connectivity with a simple domain search
    const testDomain = TEST_DOMAINS[0];
    const url = `${HUNTER_API_URL}/domain-search?domain=${testDomain}&api_key=${HUNTER_API_KEY}&limit=3`;

    console.log(`\nTesting connectivity with domain: ${testDomain}\n`);

    const response = await axios.get(url, { timeout: 8000 });

    if (response.status === 200) {
      console.log('✓ API Connection: Success');
      console.log(`✓ Status Code: ${response.status}`);
      return {
        status: 'active',
        message: 'Hunter.io API is reachable and authenticated',
        configured: true,
        responseTime: response.headers['x-ratelimit-remaining'],
      };
    }
  } catch (error) {
    if (error.response?.status === 401) {
      console.error('ERROR: Authentication failed - invalid API key');
      return {
        status: 'error',
        message: 'Invalid API key',
        configured: true,
        authenticated: false,
      };
    } else if (error.response?.status === 429) {
      console.error('ERROR: Rate limit exceeded');
      return {
        status: 'error',
        message: 'Rate limit exceeded',
        configured: true,
        authenticated: true,
      };
    } else {
      console.error(`ERROR: ${error.message}`);
      return {
        status: 'error',
        message: error.message,
        configured: true,
      };
    }
  }
}

/**
 * Test email finding and pattern extraction
 */
async function testEmailEnrichment() {
  console.log('\n[TEST] Email Enrichment Quality\n');

  if (!HUNTER_API_KEY) {
    console.log('⊘ Skipped: HUNTER_API_KEY not configured');
    return { skipped: true };
  }

  const results = [];

  for (const domain of TEST_DOMAINS.slice(0, 2)) {
    try {
      const url = `${HUNTER_API_URL}/domain-search?domain=${domain}&api_key=${HUNTER_API_KEY}&limit=5`;
      const response = await axios.get(url, { timeout: 8000 });

      const data = response.data?.data;
      if (data) {
        results.push({
          domain,
          pattern: data.pattern,
          emailCount: data.emails?.length || 0,
          organization: data.organization,
          status: 'found',
        });
        console.log(`✓ ${domain}`);
        console.log(`  Pattern: ${data.pattern}`);
        console.log(`  Emails found: ${data.emails?.length || 0}`);
        console.log(`  Organization: ${data.organization}`);
      } else {
        results.push({ domain, status: 'no_data' });
        console.log(`⊘ ${domain} - No data returned`);
      }
    } catch (error) {
      results.push({
        domain,
        status: 'error',
        error: error.message,
      });
      console.log(`✗ ${domain} - ${error.message}`);
    }

    // Rate limit delay
    await new Promise(r => setTimeout(r, 500));
  }

  return { results };
}

/**
 * Test rate limit headers
 */
async function testRateLimits() {
  console.log('\n[TEST] Rate Limit Headers\n');

  if (!HUNTER_API_KEY) {
    console.log('⊘ Skipped: HUNTER_API_KEY not configured');
    return { skipped: true };
  }

  try {
    const url = `${HUNTER_API_URL}/domain-search?domain=example.com&api_key=${HUNTER_API_KEY}&limit=1`;
    const response = await axios.get(url, { timeout: 8000 });

    const remaining = response.headers['x-ratelimit-remaining'];
    const reset = response.headers['x-ratelimit-reset'];
    const limit = response.headers['x-ratelimit-limit'];

    console.log(`✓ Rate Limit Limit: ${limit || 'unknown'} requests`);
    console.log(`✓ Rate Limit Remaining: ${remaining || 'unknown'} requests`);
    console.log(`✓ Rate Limit Reset: ${reset || 'unknown'}`);

    return {
      limit,
      remaining,
      reset,
    };
  } catch (error) {
    console.error(`✗ Rate limit test failed: ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n========================================');
  console.log('   Hunter.io Enrichment Connectivity');
  console.log('========================================');

  const results = {
    timestamp: new Date().toISOString(),
    connectivity: await testConnectivity(),
    enrichment: await testEmailEnrichment(),
    rateLimits: await testRateLimits(),
  };

  console.log('\n========================================');
  console.log('   Test Summary');
  console.log('========================================\n');

  console.log(`Status: ${results.connectivity.status}`);
  console.log(`Message: ${results.connectivity.message}`);

  if (results.connectivity.status === 'active') {
    console.log(`\nHunter.io is ${results.connectivity.status.toUpperCase()}`);
    console.log(`- Configured: ${results.connectivity.configured}`);
    console.log(`- API responding: Yes`);
    console.log(`- Rate limits available: ${results.rateLimits.remaining || 'Unknown'}`);
  } else {
    console.log(`\nHunter.io status: ${results.connectivity.status}`);
  }

  console.log('\nNote: Ensure HUNTER_API_KEY is set in .env before production use.');

  return results;
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { testConnectivity, testEmailEnrichment, testRateLimits };
