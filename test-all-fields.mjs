import Airtable from 'airtable';

const base = new Airtable({ 
  apiKey: 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92' 
}).base('appZhXnyFiKbnOZLr');

async function test() {
  console.log('Testing field availability...\n');

  const testData = {
    legal_name: 'Field Test Company',
    contact_name: 'Tester',
    business_email: `test-fields-${Date.now()}@example.com`,
    phone: '(239) 555-0100',
    sub_category: 'Testing',
    registration_status: 'Pending Review',
    supplier_id: `sup-test-${Date.now()}`,
    password_hash: 'hash',
    // Optional fields to test
    website: 'https://example.com',
    notes: 'Test notes',
    sam_gov_id: 'SAM123',
    cage_code: 'CAGE456',
    insurance_certificate_url: 'https://example.com/cert.pdf',
    availability_start_date: '2026-06-01',
    registration_date: '2026-05-25',
    last_activity_date: '2026-05-25',
    estimated_annual_capacity_usd: 100000,
    certification_status: 'MBE',
    preferred_counties: ['Lee', 'Collier'],
    services_offered: ['HVAC', 'Janitorial'],
  };

  try {
    const record = await base('tbl7NYtv13vA377a1').create(testData);
    
    console.log('✅ SUCCESS! All fields accepted!\n');
    console.log('Record created:', record.id);
    console.log('\nFields that worked:');
    for (const [key, value] of Object.entries(record.fields)) {
      console.log(`  ✓ ${key}: ${Array.isArray(value) ? JSON.stringify(value) : value}`);
    }
  } catch (err) {
    const msg = err.message;
    const match = msg.match(/Unknown field name: "([^"]+)"/);
    
    if (match) {
      const badField = match[1];
      console.log(`❌ Field not found: "${badField}"`);
      console.log('\nRemoving problematic field and retrying...\n');
      
      const retryData = { ...testData };
      delete retryData[badField];
      
      try {
        const record = await base('tbl7NYtv13vA377a1').create(retryData);
        console.log('✅ Retry successful!\n');
        console.log('Working fields:');
        for (const key of Object.keys(retryData)) {
          if (record.fields.hasOwnProperty(key)) {
            console.log(`  ✓ ${key}`);
          }
        }
        console.log('\nMissing fields:');
        for (const key of Object.keys(testData)) {
          if (!record.fields.hasOwnProperty(key) && key !== badField) {
            console.log(`  ✗ ${key}`);
          }
        }
      } catch (retryErr) {
        console.log('Retry failed:', retryErr.message);
      }
    } else {
      console.log('Error:', msg);
    }
  }
}

test();
