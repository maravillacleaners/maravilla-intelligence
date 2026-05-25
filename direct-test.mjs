process.env.AIRTABLE_API_KEY = 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92';
process.env.AIRTABLE_SUBS_BASE_ID = 'appZhXnyFiKbnOZLr';

import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_SUBS_BASE_ID);

async function test() {
  console.log('Testing direct Airtable creation...');
  
  try {
    const record = await base('tbl7NYtv13vA377a1').create({
      legal_name: 'Direct Test',
      contact_name: 'Test',
      business_email: `direct-${Date.now()}@test.com`,
      phone: '(239) 555-0100',
      sub_category: 'Services',
      registration_status: 'Pending Review',
      supplier_id: `sup-${Date.now()}`,
      password_hash: 'hash123',
    });

    console.log('✓ Success! Record ID:', record.id);
    console.log('Fields:', JSON.stringify(record.fields, null, 2));
  } catch (err) {
    console.error('✗ Error:', err.message);
    console.error('Full error:', err);
  }
}

test();
