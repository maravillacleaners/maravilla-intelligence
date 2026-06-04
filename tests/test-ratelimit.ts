/**
 * Rate Limiting Test Script
 * Tests that 11 rapid requests trigger rate limit (429 response)
 *
 * Run with: npx ts-node tests/test-ratelimit.ts
 */

import { avatarsLimiter, checkRateLimit } from '@/lib/ratelimit';

async function testRateLimiting() {
  const testIP = '192.168.1.100';
  const results: any[] = [];

  console.log('========================================');
  console.log('Rate Limiting Test: Avatars Endpoint');
  console.log('Rate Limit: 10 requests per 60 seconds');
  console.log('Test IP: ' + testIP);
  console.log('========================================\n');

  // Make 15 rapid requests to test the rate limiter
  for (let i = 1; i <= 15; i++) {
    try {
      const result = await checkRateLimit(avatarsLimiter, testIP);

      results.push({
        request: i,
        success: result.success,
        remaining: result.remaining,
        reset: new Date(result.reset).toISOString(),
        retryAfter: result.retryAfter,
      });

      const status = result.success ? '✓ ALLOWED' : '✗ BLOCKED (429)';
      const remaining = result.success
        ? `${result.remaining} remaining`
        : `Retry after ${result.retryAfter}s`;

      console.log(
        `Request ${String(i).padStart(2)}: ${status.padEnd(17)} - ${remaining}`
      );

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 10));
    } catch (error) {
      console.error(`Request ${i}: ERROR -`, error);
      results.push({
        request: i,
        error: String(error),
      });
    }
  }

  console.log('\n========================================');
  console.log('Test Results Summary');
  console.log('========================================\n');

  const allowed = results.filter((r) => r.success).length;
  const blocked = results.filter((r) => !r.success && !r.error).length;
  const errors = results.filter((r) => r.error).length;

  console.log(`Allowed requests: ${allowed}`);
  console.log(`Blocked requests: ${blocked}`);
  console.log(`Error requests: ${errors}`);

  // Verify behavior
  if (allowed === 10 && blocked === 5 && errors === 0) {
    console.log('\n✅ TEST PASSED: Rate limiting working correctly!');
    console.log('   - Requests 1-10: ALLOWED');
    console.log('   - Requests 11-15: BLOCKED with 429');
    return true;
  } else {
    console.log('\n❌ TEST FAILED: Unexpected behavior');
    console.log(`   Expected: 10 allowed, 5 blocked, 0 errors`);
    console.log(`   Got: ${allowed} allowed, ${blocked} blocked, ${errors} errors`);
    return false;
  }
}

// Run the test
testRateLimiting()
  .then((passed) => {
    process.exit(passed ? 0 : 1);
  })
  .catch((error) => {
    console.error('Test error:', error);
    process.exit(1);
  });
