#!/usr/bin/env node
/**
 * Run matching algorithm
 * Scores opportunities against suppliers and creates matches
 */

const https = require('https');

const CONFIG = {
  AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY || 'patJpi4GUzNfnQhuK...',
  AIRTABLE_BASE_ID: 'appZhXnyFiKbnOZLr',
  MIN_MATCH_SCORE: 60
};

function request(method, url, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = https.request(urlObj, options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch {
          resolve({
            status: res.statusCode,
            data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function fetchOpportunities() {
  console.log('📥 Fetching unmatched opportunities...');

  const response = await request(
    'GET',
    `https://api.airtable.com/v0/${CONFIG.AIRTABLE_BASE_ID}/Intelligence?pageSize=100`,
    {
      'Authorization': `Bearer ${CONFIG.AIRTABLE_API_KEY}`
    }
  );

  if (response.status !== 200) {
    throw new Error(`Airtable error: ${response.status}`);
  }

  const opportunities = response.data.records || [];
  console.log(`✅ Fetched ${opportunities.length} opportunities\n`);

  return opportunities;
}

async function fetchSuppliers() {
  console.log('📥 Fetching approved suppliers...');

  const response = await request(
    'GET',
    `https://api.airtable.com/v0/${CONFIG.AIRTABLE_BASE_ID}/Suppliers?pageSize=100&filterByFormula=OR({registration_status}="Approved", {registration_status}="Active")`,
    {
      'Authorization': `Bearer ${CONFIG.AIRTABLE_API_KEY}`
    }
  );

  if (response.status !== 200) {
    throw new Error(`Airtable error: ${response.status}`);
  }

  const suppliers = response.data.records || [];
  console.log(`✅ Fetched ${suppliers.length} suppliers\n`);

  return suppliers;
}

function calculateMatch(opportunity, supplier) {
  const oppNaics = (opportunity.fields.naics_codes || '')
    .split(',')
    .map(n => n.trim())
    .filter(n => n);

  const supplierNaics = (supplier.fields.naics_codes || '')
    .split(',')
    .map(n => n.trim())
    .filter(n => n);

  const supplierCounties = (supplier.fields.preferred_counties || '')
    .split(',')
    .map(c => c.trim())
    .filter(c => c);

  // Service Match (60% weight)
  const serviceMatch = supplierNaics.some(n => oppNaics.includes(n)) ? 100 : 0;

  // Location Match (20% weight)
  const locationMatch = supplierCounties.length === 0
    ? 50
    : (supplierCounties.some(c =>
        (opportunity.fields.place_of_performance || '').includes(c)) ? 100 : 0);

  // Capacity Match (20% weight)
  const supplierCapacity = supplier.fields.estimated_annual_capacity_usd || 0;
  const oppValue = opportunity.fields.estimated_value || 0;

  let capacityMatch = 0;
  if (supplierCapacity >= oppValue) {
    capacityMatch = 100;
  } else if (supplierCapacity > 0) {
    capacityMatch = Math.round((supplierCapacity / oppValue) * 100);
  }

  // Calculate total score
  const score = (serviceMatch * 0.60) + (locationMatch * 0.20) + (capacityMatch * 0.20);

  return {
    score: Math.round(score),
    reason: `Services: ${serviceMatch}% | Location: ${locationMatch}% | Capacity: ${Math.round(capacityMatch)}%`,
    details: { serviceMatch, locationMatch, capacityMatch }
  };
}

async function createMatches(matches) {
  if (matches.length === 0) {
    console.log('⚠️  No matches created (all scores below 60%)');
    return 0;
  }

  console.log(`\n📤 Saving ${matches.length} matches to Airtable...\n`);

  let created = 0;

  // Insert in batches of 10
  for (let i = 0; i < matches.length; i += 10) {
    const batch = matches.slice(i, i + 10);

    try {
      const response = await request(
        'POST',
        `https://api.airtable.com/v0/${CONFIG.AIRTABLE_BASE_ID}/Supplier_Opportunities`,
        {
          'Authorization': `Bearer ${CONFIG.AIRTABLE_API_KEY}`
        },
        { records: batch }
      );

      if (response.status === 200) {
        created += batch.length;
        console.log(`✅ Batch ${Math.floor(i / 10) + 1}: ${batch.length} matches saved`);
      } else {
        console.error(`❌ Batch error: ${response.data.error?.message}`);
      }
    } catch (err) {
      console.error(`❌ Batch error: ${err.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return created;
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║     Contract Matching Algorithm                                ║
║     Scoring opportunities against suppliers                    ║
║     Minimum score: ${CONFIG.MIN_MATCH_SCORE}%                                        ║
╚════════════════════════════════════════════════════════════════╝
`);

  if (CONFIG.AIRTABLE_API_KEY.includes('...')) {
    console.error(`
❌ AIRTABLE_API_KEY not set!

Set it with:
  export AIRTABLE_API_KEY=patXXX...

Then run again:
  node scripts/run-matcher.js
`);
    process.exit(1);
  }

  try {
    // Fetch data
    const opportunities = await fetchOpportunities();
    const suppliers = await fetchSuppliers();

    if (opportunities.length === 0) {
      console.log('⚠️  No opportunities to match. Run fetch-and-insert-opportunities.js first.');
      process.exit(0);
    }

    if (suppliers.length === 0) {
      console.log('⚠️  No suppliers to match. Run create-test-suppliers.js first.');
      process.exit(0);
    }

    // Run matching algorithm
    console.log(`\n🔄 Matching ${opportunities.length} opportunities × ${suppliers.length} suppliers...\n`);

    const matches = [];
    const topMatches = [];

    opportunities.forEach(opp => {
      suppliers.forEach(supplier => {
        const match = calculateMatch(opp, supplier);

        if (match.score >= CONFIG.MIN_MATCH_SCORE) {
          const record = {
            fields: {
              supplier_id: supplier.id,
              opportunity_id: opp.id,
              opportunity_name: opp.fields.title,
              contract_value_usd: opp.fields.estimated_value,
              deadline: opp.fields.deadline,
              match_score: match.score,
              match_reason: match.reason,
              status: 'Pending',
              date_matched: new Date().toISOString(),
              notified: false,
              supplier_email: supplier.fields.business_email,
              source: opp.fields.source
            }
          };

          matches.push(record);

          // Track top matches for display
          topMatches.push({
            supplier: supplier.fields.legal_name,
            opportunity: opp.fields.title,
            score: match.score,
            reason: match.reason,
            agency: opp.fields.agency
          });
        }
      });
    });

    console.log(`✅ Found ${matches.length} matches with score >= ${CONFIG.MIN_MATCH_SCORE}%\n`);

    // Save to Airtable
    const created = await createMatches(matches);

    // Display top 10 matches
    console.log('\n📊 TOP MATCHES:\n');
    const sorted = topMatches.sort((a, b) => b.score - a.score).slice(0, 10);

    sorted.forEach((match, idx) => {
      console.log(`${idx + 1}. ${match.opportunity}`);
      console.log(`   Supplier: ${match.supplier}`);
      console.log(`   Agency: ${match.agency}`);
      console.log(`   Score: ${match.score}% (${match.reason})`);
      console.log('');
    });

    // Summary
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    MATCHING COMPLETE                          ║
╚════════════════════════════════════════════════════════════════╝

✅ Matches created: ${created}
📊 Score distribution:
   ${topMatches.filter(m => m.score >= 80).length} excellent (80-100%)
   ${topMatches.filter(m => m.score >= 70 && m.score < 80).length} good (70-79%)
   ${topMatches.filter(m => m.score >= 60 && m.score < 70).length} acceptable (60-69%)

Next steps:

1. View results in Airtable:
   - Base: appZhXnyFiKbnOZLr
   - Table: Supplier_Opportunities
   - Should see ${created} new matches

2. Send notifications to suppliers:
   node scripts/send-notifications.js

3. Monitor in Supplier Portal:
   http://localhost:3000/suppliers
`);

  } catch (err) {
    console.error('\n❌ Fatal error:', err.message);
    process.exit(1);
  }
}

main();
