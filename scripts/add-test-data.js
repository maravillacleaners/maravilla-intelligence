const Airtable = require('airtable');

const base = new Airtable({
  apiKey: 'pat99rdlH4w13bxyF.7426298dd0608eadc534f996839989fcbcea909dc51ed11b500b5ff7e56f6a0f'
}).base('appZhXnyFiKbnOZLr');

const testData = [
  {
    legal_name: 'Tech Startup LLC',
    record_type: 'prospect',
    business_email: 'info@techstartup.com',
    phone: '(305) 555-1234',
    website: 'https://techstartup.com',
    county: 'Miami-Dade',
    score: 85,
    priority: 'High',
    pipeline_status: 'pending_review',
    segment: 'Office',
    icebreaker: 'Congrats on the new startup - looking to scale cleaning?'
  },
  {
    legal_name: 'Medical Clinic',
    record_type: 'prospect',
    business_email: 'admin@clinic.com',
    phone: '(954) 555-5678',
    website: 'https://clinic.com',
    county: 'Broward',
    score: 78,
    priority: 'Med-High',
    pipeline_status: 'pending_review',
    segment: 'Clinic',
    icebreaker: 'Your clinic is growing - need professional cleaning partners?'
  },
  {
    legal_name: 'Office Complex Inc',
    record_type: 'prospect',
    business_email: 'contact@officecomplex.com',
    phone: '(407) 555-9999',
    website: 'https://officecomplex.com',
    county: 'Orange',
    score: 92,
    priority: 'High',
    pipeline_status: 'pending_review',
    segment: 'Office',
    icebreaker: 'Your office space is impressive - we handle cleaning for 50+ similar facilities'
  }
];

async function populate() {
  try {
    for (const record of testData) {
      await base('Intelligence').create([{ fields: record }]);
      console.log('✅ Created: ' + record.legal_name);
    }
    console.log('\n✅ All 3 test records added to Intelligence table!');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

populate();
