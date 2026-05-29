#!/usr/bin/env node
/**
 * Fetch HigherGov opportunities and insert into Airtable Intelligence table
 * Run immediately to populate Airtable with real data
 */

const https = require('https');
const crypto = require('crypto');

const CONFIG = {
  HIGHERGOV_API_KEY: '4be72a011d644af8bca9a11f85c90d95',
  AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY || 'patJpi4GUzNfnQhuK...',
  AIRTABLE_BASE_ID: 'appZhXnyFiKbnOZLr',
  AIRTABLE_TABLE: 'Intelligence'
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

function createUrlHash(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

async function fetchHigherGovOpportunities() {
  console.log('📥 Fetching opportunities from HigherGov API...\n');

  try {
    const response = await request(
      'GET',
      `https://api.highergov.com/v1/opportunities?api_key=${CONFIG.HIGHERGOV_API_KEY}&status=open&page=1&per_page=100&sort_by=deadline`,
      {}
    );

    if (response.status !== 200) {
      console.error('❌ HigherGov API error:', response.status);
      return [];
    }

    const opportunities = response.data.opportunities || [];
    console.log(`✅ Fetched ${opportunities.length} opportunities from HigherGov\n`);

    // Transform to Airtable format
    const transformed = opportunities.map(opp => ({
      fields: {
        opportunity_id: opp.id,
        title: opp.title,
        agency: opp.agency,
        description: opp.description,
        source: 'highergov',
        deadline: opp.deadline,
        estimated_value: opp.estimated_value || 0,
        url: opp.url,
        naics_codes: (opp.naics_codes || []).join(','),
        place_of_performance: opp.place_of_performance,
        set_asides: (opp.set_asides || []).join(','),
        posted_date: opp.posted_date,
        date_added: new Date().toISOString(),
        record_type: 'Contract',
        url_hash: createUrlHash(opp.url),
        source_data: JSON.stringify(opp),
        matched: false
      }
    }));

    return transformed;
  } catch (err) {
    console.error('❌ Error fetching opportunities:', err.message);
    return [];
  }
}

async function checkDuplicates(urlHash) {
  try {
    const response = await request(
      'GET',
      `https://api.airtable.com/v0/${CONFIG.AIRTABLE_BASE_ID}/${CONFIG.AIRTABLE_TABLE}?filterByFormula={url_hash}="${urlHash}"`,
      {
        'Authorization': `Bearer ${CONFIG.AIRTABLE_API_KEY}`
      }
    );

    return response.data.records && response.data.records.length > 0;
  } catch (err) {
    console.error('⚠️  Error checking duplicates:', err.message);
    return false;
  }
}

async function insertIntoAirtable(records) {
  console.log(`\n📤 Inserting ${records.length} opportunities into Airtable...\n`);

  let inserted = 0;
  let duplicates = 0;
  let errors = 0;

  // Insert in batches of 10 (Airtable API limit)
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10);

    // Filter out duplicates
    const toInsert = [];
    for (const record of batch) {
      const isDuplicate = await checkDuplicates(record.fields.url_hash);
      if (!isDuplicate) {
        toInsert.push(record);
      } else {
        duplicates++;
      }
    }

    if (toInsert.length === 0) {
      continue;
    }

    try {
      const response = await request(
        'POST',
        `https://api.airtable.com/v0/${CONFIG.AIRTABLE_BASE_ID}/${CONFIG.AIRTABLE_TABLE}`,
        {
          'Authorization': `Bearer ${CONFIG.AIRTABLE_API_KEY}`
        },
        { records: toInsert }
      );

      if (response.status === 200) {
        inserted += toInsert.length;
        console.log(`✅ Batch ${Math.floor(i / 10) + 1}: Inserted ${toInsert.length} records`);
      } else {
        errors += toInsert.length;
        console.error(`❌ Batch error (${response.status}):`, response.data.error?.message);
      }
    } catch (err) {
      errors += toInsert.length;
      console.error(`❌ Batch error:`, err.message);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`
Results:
  ✅ Inserted: ${inserted}
  ⏭️  Duplicates (skipped): ${duplicates}
  ❌ Errors: ${errors}
`);

  return { inserted, duplicates, errors };
}

async function displaySample(records) {
  if (records.length === 0) return;

  console.log('\n📋 Sample opportunities:\n');
  records.slice(0, 3).forEach((opp, idx) => {
    const fields = opp.fields;
    console.log(`${idx + 1}. ${fields.title}`);
    console.log(`   Agency: ${fields.agency}`);
    console.log(`   Value: $${fields.estimated_value?.toLocaleString() || 'N/A'}`);
    console.log(`   Deadline: ${fields.deadline}`);
    console.log(`   Location: ${fields.place_of_performance}`);
    console.log(`   NAICS: ${fields.naics_codes}`);
    console.log('');
  });
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║     HigherGov → Airtable Data Ingestion                        ║
║     Fetching real federal opportunities now                    ║
╚════════════════════════════════════════════════════════════════╝
`);

  if (CONFIG.AIRTABLE_API_KEY.includes('...')) {
    console.error(`
❌ AIRTABLE_API_KEY not set!

Set it with:
  export AIRTABLE_API_KEY=patXXX...

Then run again:
  node scripts/fetch-and-insert-opportunities.js
`);
    process.exit(1);
  }

  try {
    // Step 1: Fetch from HigherGov
    const opportunities = await fetchHigherGovOpportunities();

    if (opportunities.length === 0) {
      console.log('⚠️  No opportunities fetched. Check HigherGov API key.');
      process.exit(1);
    }

    // Step 2: Show sample
    await displaySample(opportunities);

    // Step 3: Insert into Airtable
    const results = await insertIntoAirtable(opportunities);

    // Step 4: Summary
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    IMPORT COMPLETE                            ║
╚════════════════════════════════════════════════════════════════╝

✅ Opportunities now in Airtable Intelligence table!

Next steps:

1. Open Airtable: appZhXnyFiKbnOZLr
2. Go to Intelligence table
3. Verify records (should see ~${results.inserted} new opportunities)
4. Run matcher to create supplier matches:

   node scripts/run-matcher.js

5. View results in Airtable Supplier_Opportunities table
`);

  } catch (err) {
    console.error('\n❌ Fatal error:', err.message);
    process.exit(1);
  }
}

main();
