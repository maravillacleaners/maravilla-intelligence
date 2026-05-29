#!/usr/bin/env node
/**
 * Automatically create missing fields in Airtable tables
 */

const https = require('https');

const CONFIG = {
  AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY || 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92',
  AIRTABLE_BASE_ID: 'appZhXnyFiKbnOZLr'
};

const FIELDS_TO_CREATE = {
  Intelligence: [
    { name: 'opportunity_id', type: 'singleLineText', description: 'Unique ID from source' },
    { name: 'title', type: 'singleLineText', description: 'Opportunity title' },
    { name: 'description', type: 'multilineText', description: 'Full description' },
    { name: 'source', type: 'singleLineText', description: 'Source (highergov, sam-gov, etc)' },
    { name: 'deadline', type: 'date', description: 'Application deadline' },
    { name: 'estimated_value', type: 'currency', description: 'Contract value in USD' },
    { name: 'url', type: 'url', description: 'Link to original posting' },
    { name: 'naics_codes', type: 'singleLineText', description: 'NAICS codes (comma-separated)' },
    { name: 'place_of_performance', type: 'singleLineText', description: 'Work location' },
    { name: 'set_asides', type: 'singleLineText', description: 'Set-asides (8(a), HUBZone, etc)' },
    { name: 'posted_date', type: 'date', description: 'Posted date' },
    { name: 'url_hash', type: 'singleLineText', description: 'SHA256 hash for deduplication' },
    { name: 'source_data', type: 'multilineText', description: 'Raw JSON from source' },
    { name: 'matched', type: 'checkbox', description: 'Whether matched to suppliers' },
    { name: 'date_added', type: 'lastModifiedTime', description: 'When added to table' }
  ],
  Supplier_Opportunities: [
    { name: 'deadline', type: 'date', description: 'Application deadline' },
    { name: 'date_matched', type: 'createdTime', description: 'When match was created' },
    { name: 'notified', type: 'checkbox', description: 'Supplier was notified' },
    { name: 'notification_date', type: 'date', description: 'When notified' },
    { name: 'supplier_email', type: 'email', description: 'Supplier email' },
    { name: 'source', type: 'singleLineText', description: 'Opportunity source' }
  ],
  Suppliers: [
    { name: 'naics_codes', type: 'singleLineText', description: 'NAICS services' },
    { name: 'preferred_counties', type: 'singleLineText', description: 'Geographic focus' },
    { name: 'date_registered', type: 'createdTime', description: 'Registration date' }
  ]
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

async function getTableId(tableName) {
  const response = await request(
    'GET',
    `https://api.airtable.com/v0/meta/bases/${CONFIG.AIRTABLE_BASE_ID}/tables`,
    {
      'Authorization': `Bearer ${CONFIG.AIRTABLE_API_KEY}`
    }
  );

  if (response.status !== 200) {
    throw new Error(`Cannot fetch tables: ${response.status}`);
  }

  const table = response.data.tables.find(t => t.name === tableName);
  if (!table) {
    throw new Error(`Table ${tableName} not found`);
  }

  return table.id;
}

async function createField(tableId, fieldName, fieldType) {
  const fieldConfig = {
    singleLineText: { type: 'singleLineText' },
    multilineText: { type: 'multilineText' },
    date: { type: 'date' },
    currency: { type: 'currency', options: { precision: 0 } },
    url: { type: 'url' },
    email: { type: 'email' },
    checkbox: { type: 'checkbox' },
    number: { type: 'number' },
    createdTime: { type: 'createdTime', options: { timeFormat: { name: 'local' }, dateFormat: { name: 'l' } } },
    lastModifiedTime: { type: 'lastModifiedTime', options: { timeFormat: { name: 'local' }, dateFormat: { name: 'l' } } }
  };

  const typeConfig = fieldConfig[fieldType] || { type: fieldType };

  const response = await request(
    'POST',
    `https://api.airtable.com/v0/meta/bases/${CONFIG.AIRTABLE_BASE_ID}/tables/${tableId}/fields`,
    {
      'Authorization': `Bearer ${CONFIG.AIRTABLE_API_KEY}`
    },
    {
      name: fieldName,
      ...typeConfig
    }
  );

  return response;
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║     Creating Missing Fields in Airtable Tables                 ║
║     This will add all required fields automatically            ║
╚════════════════════════════════════════════════════════════════╝
`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const [tableName, fields] of Object.entries(FIELDS_TO_CREATE)) {
    console.log(`\n📋 Table: ${tableName}`);

    try {
      const tableId = await getTableId(tableName);

      for (const field of fields) {
        try {
          const response = await createField(tableId, field.name, field.type);

          if (response.status === 201) {
            console.log(`  ✅ Created: ${field.name} (${field.type})`);
            created++;
          } else if (response.status === 422 && response.data?.error?.type === 'DUPLICATE_REQUEST') {
            console.log(`  ⏭️  Already exists: ${field.name}`);
            skipped++;
          } else {
            console.log(`  ❌ Error: ${field.name} - ${response.data?.error?.message || response.status}`);
            errors++;
          }

          // Rate limiting - 5 per second
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (err) {
          console.log(`  ❌ Error creating ${field.name}: ${err.message}`);
          errors++;
        }
      }
    } catch (err) {
      console.error(`  ❌ Table error: ${err.message}`);
      errors++;
    }
  }

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    FIELD CREATION COMPLETE                    ║
╚════════════════════════════════════════════════════════════════╝

✅ Created: ${created}
⏭️  Already existed: ${skipped}
❌ Errors: ${errors}

Next steps:

1. Verify fields were created:
   export AIRTABLE_API_KEY=pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92
   node scripts/validate-airtable-schema.js

2. Insert data:
   node scripts/insert-sample-data.js
   node scripts/create-test-suppliers.js
   node scripts/run-matcher.js
`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
