#!/usr/bin/env node

const VPS_URL = 'http://72.61.92.220:3002/api/sam/run';

async function testVpsEndpoint() {
  console.log('Testing SAM.gov API on VPS (72.61.92.220:3002)...\n');
  
  // Test GET info endpoint
  console.log('GET /api/sam/run (API info):');
  try {
    const getRes = await fetch(`${VPS_URL}`, { method: 'GET', timeout: 5000 });
    const getInfo = await getRes.json();
    console.log(`Status: ${getRes.status}`);
    console.log(JSON.stringify(getInfo, null, 2));
    console.log('');
  } catch (e) {
    console.log(`  Error: ${e.message} (API may not be deployed yet)\n`);
    return { status: 'pending', notes: 'Server not responding - may need redeployment' };
  }
  
  // Test POST with dry_run
  console.log('POST /api/sam/run (dry-run test):');
  try {
    const postRes = await fetch(VPS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dry_run: true, days_back: 7 }),
      timeout: 10000
    });
    
    const data = await postRes.json();
    console.log(`Status: ${postRes.status}`);
    if (data.ok) {
      console.log('✓ Dry-run successful');
      console.log(`  Opportunities: ${data.stats?.opportunities_fetched || 0}`);
      console.log(`  Contacts: ${data.stats?.contacts_created || 0}`);
    } else {
      console.log(`✗ Error: ${data.error}`);
    }
    
    return { status: data.ok ? 'active' : 'error', data };
  } catch (e) {
    console.log(`  Error: ${e.message}\n`);
    return { status: 'pending', notes: 'Server may be starting up' };
  }
}

testVpsEndpoint().then(result => {
  console.log('═'.repeat(60));
  console.log(`VPS API Status: ${result.status}`);
  console.log('═'.repeat(60));
});
