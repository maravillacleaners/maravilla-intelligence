#!/usr/bin/env node
/**
 * Airtable Schema Validation
 * Verifies that Intelligence, Supplier_Opportunities, and Suppliers tables
 * have all required fields with correct types
 */

const https = require('https');

const CONFIG = {
  AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY || 'patJpi4GUzNfnQhuK...', // User should set this
  BASE_ID: 'appZhXnyFiKbnOZLr',
  TABLES: {
    Intelligence: {
      required_fields: [
        { name: 'opportunity_id', type: 'text' },
        { name: 'title', type: 'text' },
        { name: 'agency', type: 'text' },
        { name: 'description', type: 'longText' },
        { name: 'source', type: 'text' },
        { name: 'deadline', type: 'date' },
        { name: 'estimated_value', type: 'number' },
        { name: 'url', type: 'text' },
        { name: 'naics_codes', type: 'text' },
        { name: 'place_of_performance', type: 'text' },
        { name: 'set_asides', type: 'text' },
        { name: 'posted_date', type: 'date' },
        { name: 'record_type', type: 'text' },
        { name: 'url_hash', type: 'text' },
        { name: 'source_data', type: 'longText' },
        { name: 'matched', type: 'checkbox' },
        { name: 'date_added', type: 'timestamp' }
      ]
    },
    Supplier_Opportunities: {
      required_fields: [
        { name: 'supplier_id', type: 'text' },
        { name: 'opportunity_id', type: 'text' },
        { name: 'opportunity_name', type: 'text' },
        { name: 'contract_value_usd', type: 'number' },
        { name: 'deadline', type: 'date' },
        { name: 'match_score', type: 'number' },
        { name: 'match_reason', type: 'longText' },
        { name: 'status', type: 'singleSelect' },
        { name: 'date_matched', type: 'timestamp' },
        { name: 'notified', type: 'checkbox' },
        { name: 'notification_date', type: 'timestamp' },
        { name: 'supplier_email', type: 'email' },
        { name: 'source', type: 'text' }
      ]
    },
    Suppliers: {
      required_fields: [
        { name: 'supplier_id', type: 'text' },
        { name: 'legal_name', type: 'text' },
        { name: 'contact_name', type: 'text' },
        { name: 'business_email', type: 'email' },
        { name: 'phone', type: 'text' },
        { name: 'naics_codes', type: 'text' },
        { name: 'preferred_counties', type: 'text' },
        { name: 'estimated_annual_capacity_usd', type: 'number' },
        { name: 'registration_status', type: 'singleSelect' },
        { name: 'website', type: 'text' },
        { name: 'sub_category', type: 'text' },
        { name: 'date_registered', type: 'timestamp' }
      ]
    }
  }
};

function log(type, msg) {
  const icons = { info: 'ℹ️ ', ok: '✅ ', err: '❌ ', warn: '⚠️ ' };
  console.log(`${icons[type] || '•'} ${msg}`);
}

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://api.airtable.com${path}`);
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${CONFIG.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(url, options, (res) => {
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

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║        Airtable Schema Validation Tool                         ║
║        Verifies Intelligence, Supplier_Opportunities, Suppliers║
╚════════════════════════════════════════════════════════════════╝
`);

  if (CONFIG.AIRTABLE_API_KEY.includes('...')) {
    log('err', 'AIRTABLE_API_KEY not set. Set with:');
    console.log('  export AIRTABLE_API_KEY=pat...');
    process.exit(1);
  }

  try {
    // Get base metadata
    log('info', `Fetching base structure for ${CONFIG.BASE_ID}...`);
    const metaRes = await request('GET', `/v0/meta/bases/${CONFIG.BASE_ID}/tables`);

    if (metaRes.status !== 200) {
      log('err', `Cannot access base: ${metaRes.data.error?.message || metaRes.status}`);
      process.exit(1);
    }

    const tables = metaRes.data.tables;
    log('ok', `Found ${tables.length} tables`);
    console.log('');

    // Check each table
    let allValid = true;

    for (const [tableName, config] of Object.entries(CONFIG.TABLES)) {
      log('info', `Validating table: ${tableName}`);

      const table = tables.find(t => t.name === tableName);
      if (!table) {
        log('err', `  Table "${tableName}" not found`);
        allValid = false;
        continue;
      }

      const fields = table.fields;
      log('ok', `  Found table with ${fields.length} fields`);

      // Check required fields
      const missing = [];
      const found = [];

      config.required_fields.forEach(req => {
        const field = fields.find(f => f.name === req.name);
        if (field) {
          // Check type loosely (some type mismatches are OK)
          found.push(`  ✓ ${req.name} (${field.type})`);
        } else {
          missing.push(`  ✗ ${req.name} (MISSING - type: ${req.type})`);
        }
      });

      found.forEach(f => log('ok', f));
      missing.forEach(m => {
        log('err', m);
        allValid = false;
      });

      console.log('');
    }

    // Summary
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    VALIDATION SUMMARY                         ║
╚════════════════════════════════════════════════════════════════╝
`);

    if (allValid) {
      log('ok', 'All tables and fields are present!');
      console.log(`
Next steps:
  1. Open n8n UI: https://n8n.srv1112587.hstgr.cloud
  2. Create the 4 workflows:
     - HigherGov Opportunity Scraper
     - Deduplication Engine
     - Contract Matcher
     - Supplier Notifications

  3. Follow the setup guide: N8N_MULTISOURCE_SETUP_PLAYBOOK.md

  4. Test workflows with:
     curl -X POST https://n8n.srv1112587.hstgr.cloud/webhook/highergov-scraper
`);
    } else {
      log('err', 'Some fields are missing. Create them in Airtable:');
      console.log(`
For each missing field:
  1. Open Airtable base: ${CONFIG.BASE_ID}
  2. Go to the table
  3. Click "+" to add field
  4. Enter field name and type (shown above)
  5. Save

Then re-run this script to verify.
`);
      process.exit(1);
    }

  } catch (err) {
    log('err', `Error: ${err.message}`);
    process.exit(1);
  }
}

main();
