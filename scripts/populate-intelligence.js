const Airtable = require('airtable');

const base = new Airtable({
  apiKey: 'pat99rdlH4w13bxyF.7426298dd0608eadc534f996839989fcbcea909dc51ed11b500b5ff7e56f6a0f'
}).base('appZhXnyFiKbnOZLr');

const testData = [
  {
    record_type: 'prospect',
    legal_name: 'Tech Startup LLC',
    business_email: 'info@techstartup.com',
    phone: '(305) 555-1234',
    website: 'https://techstartup.com',
    county: 'Miami-Dade',
    score: 85,
    priority: 'High',
    pipeline_status: 'pending_review',
    segment: 'Office'
  },
  {
    record_type: 'prospect',
    legal_name: 'Medical Clinic',
    business_email: 'admin@clinic.com',
    phone: '(954) 555-5678',
    website: 'https://clinic.com',
    county: 'Broward',
    score: 78,
    priority: 'Med-High',
    pipeline_status: 'pending_review',
    segment: 'Clinic'
  },
  {
    record_type: 'contract',
    legal_name: 'Federal Facilities GSA',
    prime_contractor: 'ABC Federal Solutions',
    agency: 'GSA',
    total_obligated_amount: 450000,
    pipeline_status: 'pending_review'
  }
];

async function populate() {
  try {
    for (const record of testData) {
      await base('Intelligence').create([{ fields: record }]);
      console.log(`✅ Created: ${record.legal_name}`);
    }
    console.log('\n✅ All records created!');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

populate();
