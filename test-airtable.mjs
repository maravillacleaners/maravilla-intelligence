import Airtable from 'airtable';

const API_KEY = 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92';
const BASE_ID = 'appZhXnyFiKbnOZLr';
const TABLE_ID = 'tbl7NYtv13vA377a1';

async function test() {
  console.log('🔧 Testing Airtable connection...\n');

  try {
    const base = new Airtable({ apiKey: API_KEY }).base(BASE_ID);
    
    console.log(`Base ID: ${BASE_ID}`);
    console.log(`Table ID: ${TABLE_ID}\n`);

    console.log('1️⃣  Testing table access...');
    const records = await base(TABLE_ID).select({ maxRecords: 1 }).firstPage();
    console.log(`   ✓ Connected. Found ${records.length} records`);

    console.log('\n2️⃣  Testing record creation...');
    const newRecord = await base(TABLE_ID).create({
      legal_name: 'Test Company',
      contact_name: 'Test Person',
      business_email: `test-${Date.now()}@example.com`,
      phone: '(239) 555-0123',
      sub_category: 'Test',
      registration_status: 'Pending Review',
      supplier_id: `sup-test-${Date.now()}`,
      password_hash: 'testhash123',
    });

    console.log(`   ✓ Created record: ${newRecord.id}`);
    console.log(`   Email: ${newRecord.fields.business_email}`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

test();
