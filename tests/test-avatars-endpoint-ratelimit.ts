/**
 * Avatar Endpoint Rate Limiting Integration Test
 * Tests the /api/avatars endpoint with rapid requests
 *
 * This test simulates 15 rapid requests from the same IP
 * and verifies that requests 11-15 return HTTP 429 (Too Many Requests)
 */

async function testAvatarsEndpointRateLimit() {
  const baseURL = process.env.API_BASE_URL || 'http://localhost:3000';
  const endpointURL = `${baseURL}/api/avatars`;

  console.log('========================================');
  console.log('Avatar Endpoint Rate Limit Test');
  console.log(`Endpoint: ${endpointURL}`);
  console.log('Rate Limit: 10 requests per 60 seconds');
  console.log('========================================\n');

  const results: any[] = [];
  const headers = {
    'Content-Type': 'application/json',
    // Simulate same IP address for all requests
    'X-Forwarded-For': '203.0.113.42',
  };

  // Make 15 rapid GET requests
  for (let i = 1; i <= 15; i++) {
    try {
      const startTime = Date.now();
      const response = await fetch(endpointURL, {
        method: 'GET',
        headers,
      });
      const endTime = Date.now();

      const data = await response.json();
      const duration = endTime - startTime;

      const result = {
        request: i,
        status: response.status,
        statusText: response.statusText,
        success: response.ok,
        duration: `${duration}ms`,
        rateLimitRemaining: response.headers.get('x-ratelimit-remaining'),
        retryAfter: response.headers.get('retry-after'),
        error: data.error || undefined,
      };

      results.push(result);

      const statusIcon = response.ok ? '✓' : '✗';
      const statusLabel = response.ok ? 'ALLOWED' : `BLOCKED (${response.status})`;

      console.log(
        `Request ${String(i).padStart(2)}: ${statusIcon} ${statusLabel.padEnd(17)} ` +
          `Status: ${response.status} | Duration: ${duration}ms`
      );

      if (!response.ok && response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        if (retryAfter) {
          console.log(`              Retry after: ${retryAfter}s`);
        }
      }

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 10));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`Request ${i}: ERROR - ${errorMsg}`);
      results.push({
        request: i,
        error: errorMsg,
      });
    }
  }

  console.log('\n========================================');
  console.log('Test Results Summary');
  console.log('========================================\n');

  const allowed = results.filter((r) => r.status === 200).length;
  const blocked = results.filter((r) => r.status === 429).length;
  const errors = results.filter((r) => !r.status).length;

  console.log(`✓ Allowed (200): ${allowed}`);
  console.log(`✗ Rate Limited (429): ${blocked}`);
  console.log(`⚠ Errors: ${errors}`);

  // Verify expected behavior
  console.log('\n========================================');
  if (allowed === 10 && blocked === 5 && errors === 0) {
    console.log('✅ TEST PASSED: Rate limiting working correctly!');
    console.log('   - Requests 1-10: HTTP 200 (ALLOWED)');
    console.log('   - Requests 11-15: HTTP 429 (RATE LIMITED)');
    console.log('========================================\n');
    return true;
  } else {
    console.log('❌ TEST FAILED: Unexpected behavior');
    console.log(`   Expected: 10 allowed (200), 5 blocked (429), 0 errors`);
    console.log(`   Got: ${allowed} allowed, ${blocked} blocked, ${errors} errors`);
    console.log('========================================\n');

    console.log('Detailed Results:');
    results.forEach((r) => {
      console.log(`  Request ${r.request}: ${r.status || 'ERROR'} - ${r.error || r.statusText}`);
    });

    return false;
  }
}

// Run test
testAvatarsEndpointRateLimit()
  .then((passed) => {
    process.exit(passed ? 0 : 1);
  })
  .catch((error) => {
    console.error('Test execution error:', error);
    process.exit(1);
  });
