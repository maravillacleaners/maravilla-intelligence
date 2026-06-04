#!/usr/bin/env node

const API_URL = 'http://localhost:3002/api/sam/run';

async function testSamEndpoint() {
  console.log('Testing /api/sam/run endpoint...\n');
  
  // Check if server is running
  console.log('Checking server availability...');
  try {
    const checkRes = await fetch('http://localhost:3002/api/sam/run', {
      method: 'GET'
    });
    console.log(`Server responding (GET /api/sam/run): ${checkRes.status}\n`);
    
    const getInfo = await checkRes.json();
    console.log('GET Response (API info):');
    console.log(JSON.stringify(getInfo, null, 2));
    console.log('');
  } catch (e) {
    console.log(`⚠ Cannot connect to localhost:3002. Is the app running?`);
    console.log(`Error: ${e.message}\n`);
    return {
      api: 'SAM.gov',
      status: 'pending',
      notes: 'Server not running on localhost:3002. Start with: npm run dev',
      endpoint_tested: false
    };
  }

  // Test dry-run
  console.log('Test 1: Dry-run (no database writes)');
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dry_run: true, days_back: 7 })
    });
    
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');
    
    return {
      api: 'SAM.gov',
      status: data.ok ? 'active' : 'error',
      notes: data.ok ? 'API operational, dry-run successful' : data.error,
      endpoint_tested: true,
      stats: data.stats,
      configured: data.configured
    };
  } catch (e) {
    console.log(`Error: ${e.message}\n`);
    return {
      api: 'SAM.gov',
      status: 'error',
      notes: e.message,
      endpoint_tested: false
    };
  }
}

testSamEndpoint().then(result => {
  console.log('═'.repeat(70));
  console.log('SAM.GOV API ACTIVATION TEST:');
  console.log(`API: ${result.api}`);
  console.log(`Status: ${result.status}`);
  console.log(`Notes: ${result.notes}`);
  if (result.stats) {
    console.log('\nDry-Run Stats:');
    console.log(`  Opportunities fetched: ${result.stats.opportunities_fetched}`);
    console.log(`  Opportunities created: ${result.stats.opportunities_created}`);
    console.log(`  Contacts created: ${result.stats.contacts_created}`);
  }
  console.log('═'.repeat(70));
});
