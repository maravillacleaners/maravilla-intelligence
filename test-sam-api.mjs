#!/usr/bin/env node
import https from 'https';

const SAM_API_KEY = 'SAM-6f523a84-002b-4d61-a86e-8092d9c0b2ce';
const SAM_BASE = 'https://api.sam.gov/prod/opportunities/v2/search';

async function testSamApi() {
  console.log('Testing SAM.gov API connectivity...\n');
  
  // Test 1: Check API key validity
  console.log('Test 1: Verify API key format');
  if (SAM_API_KEY && SAM_API_KEY.startsWith('SAM-') && SAM_API_KEY.length > 30) {
    console.log('✓ API key format is valid\n');
  } else {
    console.log('✗ API key format is invalid\n');
    process.exit(1);
  }

  // Test 2: Simple opportunities search
  console.log('Test 2: Fetch opportunities (NAICS 561720, Florida, last 7 days)');
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fmt = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
  
  const params = new URLSearchParams({
    api_key: SAM_API_KEY,
    limit: '10',
    ncode: '561720',
    state: 'FL',
    postedFrom: fmt(sevenDaysAgo),
    postedTo: fmt(today),
  });

  const url = `${SAM_BASE}?${params}`;
  console.log(`URL: ${url.substring(0, 120)}...`);
  console.log('Sending request...\n');

  return new Promise((resolve) => {
    https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Headers: Content-Type = ${res.headers['content-type']}\n`);
        
        try {
          const json = JSON.parse(data);
          console.log('Response parsed successfully (JSON valid)\n');
          
          const opps = json.opportunitiesData || [];
          console.log(`Opportunities found: ${opps.length}\n`);
          
          if (opps.length > 0) {
            const first = opps[0];
            console.log('Sample opportunity:');
            console.log(`  Title: ${first.title}`);
            console.log(`  Agency: ${first.fullParentPathName || 'N/A'}`);
            console.log(`  Posted: ${first.postedDate}`);
            console.log(`  Type: ${first.type || first.baseType}`);
            console.log(`  POCs: ${(first.pointOfContact || []).length}\n`);
            
            if (first.pointOfContact && first.pointOfContact.length > 0) {
              const poc = first.pointOfContact[0];
              console.log(`  First POC: ${poc.fullName} <${poc.email || 'N/A'}>\n`);
            }
          }
          
          resolve({
            api: 'SAM.gov',
            status: 'active',
            code: res.statusCode,
            oppsCount: opps.length,
            ok: true,
          });
        } catch (e) {
          console.log(`✗ JSON parse error: ${e.message}\n`);
          resolve({
            api: 'SAM.gov',
            status: 'error',
            code: res.statusCode,
            error: 'Invalid JSON response',
            ok: false,
          });
        }
      });
    }).on('error', (e) => {
      console.log(`✗ Network error: ${e.message}\n`);
      resolve({
        api: 'SAM.gov',
        status: 'error',
        error: e.message,
        ok: false,
      });
    });
  });
}

testSamApi().then(result => {
  console.log('═'.repeat(60));
  console.log('TEST RESULT:');
  console.log(`API: ${result.api}`);
  console.log(`Status: ${result.status}`);
  console.log(`Success: ${result.ok}`);
  if (result.oppsCount !== undefined) console.log(`Opportunities: ${result.oppsCount}`);
  if (result.error) console.log(`Error: ${result.error}`);
  console.log('═'.repeat(60));
  process.exit(result.ok ? 0 : 1);
});
