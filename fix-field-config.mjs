import https from 'https';

const API_KEY = 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92';
const BASE_ID = 'appZhXnyFiKbnOZLr';
const TABLE_ID = 'tbl7NYtv13vA377a1';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.airtable.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Simple fields - just basic types, no options
const simpleFields = [
  { name: 'sam_gov_id', type: 'singleLineText' },
  { name: 'cage_code', type: 'singleLineText' },
  { name: 'notes', type: 'multilineText' },
  { name: 'insurance_certificate_url', type: 'url' },
  { name: 'availability_start_date', type: 'date' },
  { name: 'registration_date', type: 'date' },
  { name: 'last_activity_date', type: 'date' },
  { name: 'estimated_annual_capacity_usd', type: 'currency' },
];

// Select fields with simple choice format
const selectFields = [
  {
    name: 'certification_status',
    type: 'singleSelect',
    options: {
      choices: [
        { name: 'MBE' },
        { name: 'WBE' },
        { name: '8(a)' },
        { name: 'HUBZone' },
        { name: 'None' }
      ]
    }
  },
  {
    name: 'preferred_counties',
    type: 'multipleSelect',
    options: {
      choices: [
        { name: 'Lee' },
        { name: 'Collier' },
        { name: 'Hillsborough' },
        { name: 'Polk' },
        { name: 'Pinellas' },
        { name: 'Duval' },
        { name: 'Miami-Dade' }
      ]
    }
  },
  {
    name: 'services_offered',
    type: 'multipleSelect',
    options: {
      choices: [
        { name: 'Janitorial' },
        { name: 'Landscaping' },
        { name: 'HVAC' },
        { name: 'Painting' },
        { name: 'Construction' }
      ]
    }
  }
];

async function createFields() {
  console.log(`\n🔧 Creating fields (simplified format)...\n`);

  // Try simple fields first
  console.log('Simple fields:');
  for (const field of simpleFields) {
    try {
      await new Promise(r => setTimeout(r, 400));
      
      const res = await request('POST', `/v0/meta/bases/${BASE_ID}/tables/${TABLE_ID}/fields`, {
        name: field.name,
        type: field.type
      });
      
      if (res.status === 200 || res.status === 201) {
        console.log(`  ✓ ${field.name}`);
      } else {
        const error = res.data?.error?.type || 'unknown error';
        console.log(`  - ${field.name} (${error})`);
      }
    } catch (err) {
      console.log(`  - ${field.name} (error)`);
    }
  }

  // Try select fields
  console.log('\nSelect fields:');
  for (const field of selectFields) {
    try {
      await new Promise(r => setTimeout(r, 400));
      
      const res = await request('POST', `/v0/meta/bases/${BASE_ID}/tables/${TABLE_ID}/fields`, {
        name: field.name,
        type: field.type,
        options: field.options
      });
      
      if (res.status === 200 || res.status === 201) {
        console.log(`  ✓ ${field.name}`);
      } else {
        console.log(`  - ${field.name} (already exists or invalid)`);
      }
    } catch (err) {
      console.log(`  - ${field.name} (error)`);
    }
  }

  console.log('\n✅ Field creation attempt complete!');
}

createFields().catch(console.error);
