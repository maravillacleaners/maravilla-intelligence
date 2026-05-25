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

// Most critical missing fields for supplier portal
const criticalFields = [
  { name: 'availability_start_date', type: 'date' },
  { name: 'registration_date', type: 'date' },
  { name: 'last_activity_date', type: 'date' },
  { name: 'estimated_annual_capacity_usd', type: 'currency' },
];

async function createFields() {
  console.log('Creating critical date/currency fields...\n');

  for (const field of criticalFields) {
    try {
      await new Promise(r => setTimeout(r, 800));
      
      console.log(`Creating ${field.name}...`);
      const res = await request('POST', `/v0/meta/bases/${BASE_ID}/tables/${TABLE_ID}/fields`, {
        name: field.name,
        type: field.type
      });
      
      console.log(`  Status: ${res.status}`);
      if (res.status === 200 || res.status === 201) {
        console.log(`  ✅ Created!\n`);
      } else {
        console.log(`  Error: ${JSON.stringify(res.data).substring(0, 100)}\n`);
      }
    } catch (err) {
      console.log(`  ❌ Exception: ${err.message}\n`);
    }
  }

  console.log('\n✅ Attempt complete. Testing if fields now work...\n');

  // Test if fields work now
  const Airtable = (await import('airtable')).default;
  const base = new Airtable({ apiKey: API_KEY }).base(BASE_ID);

  try {
    const record = await base(TABLE_ID).create({
      legal_name: 'Final Field Test',
      contact_name: 'Test',
      business_email: `field-test-${Date.now()}@example.com`,
      phone: '(239) 555-0100',
      sub_category: 'Test',
      registration_status: 'Pending Review',
      supplier_id: `sup-field-test-${Date.now()}`,
      password_hash: 'hash',
      registration_date: '2026-05-25',
      last_activity_date: '2026-05-25',
      availability_start_date: '2026-06-01',
      estimated_annual_capacity_usd: 50000,
    });

    console.log('✅ All date/currency fields working!');
    console.log('Record:', record.id);
  } catch (err) {
    const match = err.message.match(/Unknown field name: "([^"]+)"/);
    if (match) {
      console.log(`❌ Still missing: ${match[1]}`);
    } else {
      console.log('Error:', err.message.substring(0, 150));
    }
  }
}

createFields().catch(console.error);
