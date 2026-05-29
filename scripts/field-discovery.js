require('dotenv').config();
const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = 'appZhXnyFiKbnOZLr';

async function fieldDiscovery() {
  try {
    console.log('\n🔍 FIELD DISCOVERY: Testing which fields exist in Intelligence table\n');
    
    const api = new Airtable({ apiKey });
    const base = api.base(baseId);
    const table = base('Intelligence');

    // Test 1: Minimal record
    console.log('Test 1: Creating record with title only');
    try {
      const minimal = await table.create({ title: 'Test minimal' });
      console.log('✅ SUCCESS: title field works');
      console.log(`Created record: ${minimal.id}\n`);
    } catch (e) {
      console.log(`❌ FAILED: ${e.message}\n`);
      return;
    }

    // Test 2: Try each field individually
    const fieldsToTest = [
      { name: 'agency', value: 'Test Agency', type: 'string' },
      { name: 'record_type', value: 'contract', type: 'select' },
      { name: 'source', value: 'usaspending', type: 'select' },
      { name: 'estimated_value', value: 100000, type: 'number' },
      { name: 'description', value: 'Test description', type: 'string' },
      { name: 'naics_code', value: '561700', type: 'string' },
      { name: 'url', value: 'https://example.com', type: 'url' },
      { name: 'discovery_date', value: '2026-05-26', type: 'date' },
      { name: 'deadline', value: '2026-06-01', type: 'date' },
      { name: 'usaspending_id', value: 'test-usa-12345', type: 'string' },
      { name: 'sam_contract_id', value: 'test-sam-67890', type: 'string' },
      { name: 'award_score', value: 75, type: 'number' },
      { name: 'scoring_status', value: 'scored', type: 'select' }
    ];

    console.log('Test 2: Testing individual fields\n');
    const validFields = [];
    const invalidFields = [];

    for (const field of fieldsToTest) {
      try {
        const testData = { 
          title: `Test field: ${field.name}`,
          [field.name]: field.value
        };
        await table.create(testData);
        validFields.push(field.name);
        console.log(`✅ ${field.name}: VALID (${field.type})`);
      } catch (e) {
        invalidFields.push({ name: field.name, error: e.message.substring(0, 80) });
        console.log(`❌ ${field.name}: INVALID - ${e.message.substring(0, 80)}`);
      }
    }

    console.log(`\n📊 SUMMARY:\n`);
    console.log(`Valid fields (${validFields.length}):`);
    validFields.forEach(f => console.log(`  ✅ ${f}`));
    console.log(`\nInvalid fields (${invalidFields.length}):`);
    invalidFields.forEach(f => console.log(`  ❌ ${f.name}: ${f.error}`));

  } catch (error) {
    console.error('Fatal error:', error.message);
  }
}

fieldDiscovery();
