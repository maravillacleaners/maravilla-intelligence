/**
 * Test script for middleware JWT protection
 * Tests that:
 * 1. Public routes (/api/auth/login, /api/suppliers/login) return 200 without token
 * 2. Protected routes (/api/avatars, /api/opportunities) return 401 without token
 * 3. Protected routes return 200 with valid token
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3002';
const ADMIN_TOKEN = 'maravilla-admin-2026';

// Test cases
const TEST_CASES = [
  {
    name: 'Public: /api/auth/login without token',
    method: 'POST',
    path: '/api/auth/login',
    headers: { 'Content-Type': 'application/json' },
    expectedStatus: [200, 400, 401], // 400 is OK if body validation fails, 401 means auth failed (bad)
    shouldPass: true,
    skipAuthCheck: true, // This endpoint might need credentials in body
  },
  {
    name: 'Public: /api/suppliers/login without token',
    method: 'POST',
    path: '/api/suppliers/login',
    headers: { 'Content-Type': 'application/json' },
    expectedStatus: [200, 400, 401],
    shouldPass: true,
    skipAuthCheck: true,
  },
  {
    name: 'Public: /api/suppliers/register without token',
    method: 'POST',
    path: '/api/suppliers/register',
    headers: { 'Content-Type': 'application/json' },
    expectedStatus: [200, 400, 201],
    shouldPass: true,
    skipAuthCheck: true,
  },
  {
    name: 'Protected: /api/avatars without token',
    method: 'GET',
    path: '/api/avatars',
    headers: {},
    expectedStatus: 401,
    shouldPass: false,
  },
  {
    name: 'Protected: /api/avatars with valid token',
    method: 'GET',
    path: '/api/avatars',
    headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` },
    expectedStatus: [200, 400, 404],
    shouldPass: true,
  },
  {
    name: 'Protected: /api/opportunities without token',
    method: 'GET',
    path: '/api/opportunities',
    headers: {},
    expectedStatus: 401,
    shouldPass: false,
  },
  {
    name: 'Protected: /api/opportunities with valid token',
    method: 'GET',
    path: '/api/opportunities',
    headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` },
    expectedStatus: [200, 400, 404],
    shouldPass: true,
  },
  {
    name: 'Protected: /api/contacts with invalid token',
    method: 'GET',
    path: '/api/contacts',
    headers: { 'Authorization': 'Bearer invalid-token' },
    expectedStatus: 401,
    shouldPass: false,
  },
];

async function testEndpoint(testCase) {
  return new Promise((resolve) => {
    const url = new URL(testCase.path, BASE_URL);
    const protocol = url.protocol === 'https:' ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: testCase.method,
      headers: {
        'User-Agent': 'Middleware-Test',
        ...testCase.headers,
      },
    };

    const request = protocol.request(options, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        const passed =
          (Array.isArray(testCase.expectedStatus)
            ? testCase.expectedStatus.includes(response.statusCode)
            : response.statusCode === testCase.expectedStatus) &&
          testCase.shouldPass === (response.statusCode !== 401);

        resolve({
          name: testCase.name,
          status: response.statusCode,
          expectedStatus: testCase.expectedStatus,
          passed,
          data: data.substring(0, 200),
        });
      });
    });

    request.on('error', (error) => {
      resolve({
        name: testCase.name,
        status: 'ERROR',
        expectedStatus: testCase.expectedStatus,
        passed: false,
        data: error.message,
      });
    });

    if (testCase.method === 'POST') {
      request.write(JSON.stringify({}));
    }

    request.end();
  });
}

async function runTests() {
  console.log(`\nTesting middleware JWT protection`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`=`.repeat(80));

  const results = [];
  for (const testCase of TEST_CASES) {
    const result = await testEndpoint(testCase);
    results.push(result);

    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} | ${result.name}`);
    console.log(`     Status: ${result.status} (expected: ${JSON.stringify(result.expectedStatus)})`);
    if (result.data && result.data !== '{}') {
      console.log(`     Response: ${result.data}`);
    }
    console.log();
  }

  // Summary
  const passCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`=`.repeat(80));
  console.log(`\nResults: ${passCount}/${totalCount} tests passed`);

  if (passCount === totalCount) {
    console.log('✅ All middleware security tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Review the results above.');
    process.exit(1);
  }
}

// Start tests
runTests().catch((error) => {
  console.error('Test error:', error);
  process.exit(1);
});
