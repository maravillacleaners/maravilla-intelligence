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

const fieldsToCreate = [
  { name: 'sam_gov_id', type: 'singleLineText' },
  { name: 'cage_code', type: 'singleLineText' },
  { name: 'notes', type: 'multilineText' },
  { name: 'insurance_certificate_url', type: 'url' },
  { name: 'availability_start_date', type: 'date' },
  { name: 'registration_date', type: 'date' },
  { name: 'last_activity_date', type: 'date' },
  { name: 'estimated_annual_capacity_usd', type: 'currency', options: { precision: 0, symbol: '$' } },
  { name: 'certification_status', type: 'singleSelect', options: { choices: [{ name: 'MBE' }, { name: 'WBE' }, { name: '8(a)' }, { name: 'HUBZone' }, { name: 'None' }] } },
  { name: 'preferred_counties', type: 'multipleSelect', options: { choices: [{ name: 'Lee' }, { name: 'Collier' }, { name: 'Hillsborough' }, { name: 'Polk' }, { name: 'Pinellas' }, { name: 'Duval' }, { name: 'Miami-Dade' }] } },
  { name: 'services_offered', type: 'multipleSelect', options: { choices: [{ name: 'Janitorial' }, { name: 'Landscaping' }, { name: 'HVAC' }, { name: 'Painting' }, { name: 'Construction' }] } },
];

async function createFields() {
  console.log(`\n🔧 Creating ${fieldsToCreate.length} missing fields in Suppliers table...\n`);

  let successCount = 0;
  let failCount = 0;

  for (const field of fieldsToCreate) {
    try {
      await new Promise(r => setTimeout(r, 600)); // Rate limiting
      
      const payload = { name: field.name, type: field.type };
      if (field.options) payload.options = field.options;

      const res = await request('POST', `/v0/meta/bases/${BASE_ID}/tables/${TABLE_ID}/fields`, payload);
      
      if (res.status === 200 || res.status === 201) {
        console.log(`✓ ${field.name.padEnd(30)} [${field.type}]`);
        successCount++;
      } else {
        const error = res.data?.error?.message || res.data?.message || JSON.stringify(res.data).substring(0, 60);
        console.log(`✗ ${field.name.padEnd(30)} [${error}]`);
        failCount++;
      }
    } catch (err) {
      console.log(`✗ ${field.name.padEnd(30)} [${err.message.substring(0, 60)}]`);
      failCount++;
    }
  }

  console.log(`\n📊 Results: ${successCount} created, ${failCount} failed\n`);

  if (successCount > 0) {
    console.log('✅ Missing fields are now available in Airtable!');
    console.log('📝 Next: Update suppliers-client.ts to use all fields');
    console.log('   Then test: npm run dev');
  }
}

createFields().catch(console.error);
