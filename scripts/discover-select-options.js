require('dotenv').config();
const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = 'appZhXnyFiKbnOZLr';

async function discoverSelectOptions() {
  try {
    console.log('\n🔍 DISCOVERING SELECT OPTIONS\n');
    
    const api = new Airtable({ apiKey });
    const base = api.base(baseId);
    const table = base('Intelligence');

    // Test record_type select options
    console.log('1️⃣  Testing record_type options:\n');
    const recordTypeOptions = ['contract', 'award', 'opportunity', 'project', 'tender', 'bid'];
    const validRecordTypes = [];

    for (const option of recordTypeOptions) {
      try {
        await table.create({ 
          title: `Test record_type: ${option}`,
          record_type: option
        });
        validRecordTypes.push(option);
        console.log(`  ✅ record_type="${option}" VALID`);
      } catch (e) {
        console.log(`  ❌ record_type="${option}" invalid`);
      }
    }

    // Test source select options
    console.log('\n2️⃣  Testing source options:\n');
    const sourceOptions = ['usaspending', 'sam-gov', 'sam.gov', 'fedbizopps', 'api.data.gov'];
    const validSources = [];

    for (const option of sourceOptions) {
      try {
        await table.create({ 
          title: `Test source: ${option}`,
          source: option
        });
        validSources.push(option);
        console.log(`  ✅ source="${option}" VALID`);
      } catch (e) {
        console.log(`  ❌ source="${option}" invalid`);
      }
    }

    // Test agency select options - first, we know it has restrictions
    console.log('\n3️⃣  Testing agency (select field):\n');
    console.log('  ⚠️  Agency field does not allow new options to be created');
    console.log('  Need to use predefined values only');

    // Fetch a record with agency to see what's valid
    console.log('\n4️⃣  Fetching existing records to find valid agency values:\n');
    const allRecords = await table.select({ pageSize: 100 }).all();
    const agenciesInTable = new Set();
    
    for (const record of allRecords) {
      if (record.fields.agency) {
        if (Array.isArray(record.fields.agency)) {
          record.fields.agency.forEach(a => agenciesInTable.add(a));
        } else {
          agenciesInTable.add(record.fields.agency);
        }
      }
    }

    if (agenciesInTable.size > 0) {
      console.log('  Valid agency values from existing records:');
      Array.from(agenciesInTable).forEach(a => console.log(`    ✅ "${a}"`));
    } else {
      console.log('  No agency values found in existing records');
      console.log('  (Agency field may need to be checked in Airtable UI directly)');
    }

    console.log('\n📊 SUMMARY:\n');
    console.log(`Valid record_type options: ${validRecordTypes.length > 0 ? validRecordTypes.join(', ') : 'NONE FOUND'}`);
    console.log(`Valid source options: ${validSources.length > 0 ? validSources.join(', ') : 'NONE FOUND'}`);
    console.log(`Agency options: (restricted, must use predefined values)`);

  } catch (error) {
    console.error('Fatal error:', error.message);
  }
}

discoverSelectOptions();
