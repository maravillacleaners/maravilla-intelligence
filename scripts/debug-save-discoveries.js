require('dotenv').config();
const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID || 'appZhXnyFiKbnOZLr';

async function debugSaveDiscoveries() {
  try {
    console.log('\n🔍 DEBUG: SAVE DISCOVERIES FUNCTION\n');

    // Check configuration
    console.log('1️⃣  Configuration Check:\n');
    console.log(`API Key: ${apiKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`Base ID: ${baseId}`);
    console.log(`Base ID source: ${process.env.AIRTABLE_BASE_ID ? 'env var' : 'hardcoded'}\n`);

    const api = new Airtable({ apiKey });
    const base = api.base(baseId);
    const table = base('Intelligence');

    // Test 1: Create a single discovery object
    console.log('2️⃣  Creating test discovery object:\n');
    const testDiscovery = {
      id: 'test-discovery-001',
      usaspendingId: 'test-usaspending-12345',
      title: 'TEST: Commercial Cleaning Services Contract',
      agency: 'Test Agency Department',
      recordType: 'contract',
      source: 'usaspending',
      estimatedValue: 250000,
      description: 'Test contract for commercial cleaning services',
      naicsCode: '561700',
      url: 'https://example.com/test',
      postedDate: new Date().toISOString().split('T')[0]
    };

    console.log(JSON.stringify(testDiscovery, null, 2));

    // Test 2: Build recordData like the real function does
    console.log('\n3️⃣  Building Airtable recordData object:\n');
    const recordData = {
      title: testDiscovery.title,
      record_type: testDiscovery.recordType,
      source: testDiscovery.source,
      deadline: testDiscovery.deadline,
      estimated_value: testDiscovery.estimatedValue,
      description: testDiscovery.description,
      naics_code: testDiscovery.naicsCode,
      url: testDiscovery.url,
      discovery_date: testDiscovery.postedDate
    };

    if (testDiscovery.usaspendingId) {
      recordData.usaspending_id = testDiscovery.usaspendingId;
    }
    if (testDiscovery.samContractId) {
      recordData.sam_contract_id = testDiscovery.samContractId;
    }

    console.log('recordData fields:');
    Object.keys(recordData).forEach(key => {
      console.log(`  ${key}: ${JSON.stringify(recordData[key])}`);
    });

    // Test 3: Try to create the record
    console.log('\n4️⃣  Attempting to create record in Airtable:\n');
    try {
      const result = await table.create(recordData);
      console.log('✅ Record created successfully!');
      console.log(`Record ID: ${result.id}`);
      console.log(`Fields: ${JSON.stringify(result.fields, null, 2)}`);
    } catch (error) {
      console.error('❌ Record creation failed!');
      console.error(`Error message: ${error.message}`);
      if (error.error) {
        console.error(`Error type: ${error.error.type}`);
        console.error(`Error details: ${JSON.stringify(error.error, null, 2)}`);
      }
      console.error(`Full error: ${JSON.stringify(error, null, 2)}`);
      return;
    }

    // Test 4: Verify the record was created
    console.log('\n5️⃣  Verifying record was created:\n');
    const allRecords = await table.select({ pageSize: 1 }).all();
    console.log(`Total records in Intelligence table: ${allRecords.length}`);

    if (allRecords.length > 0) {
      const latestRecord = allRecords[0];
      console.log('\nLatest record in table:');
      console.log(`  Airtable ID: ${latestRecord.id}`);
      console.log(`  usaspending_id: ${latestRecord.fields.usaspending_id || 'NOT SET'}`);
      console.log(`  title: ${latestRecord.fields.title}`);
      console.log(`  status: ${latestRecord.fields.status}`);
    }

    // Test 5: Try batch creation like the real function
    console.log('\n6️⃣  Testing batch creation (10 records):\n');
    const testDiscoveries = [];
    for (let i = 0; i < 10; i++) {
      testDiscoveries.push({
        id: `test-batch-${i}`,
        usaspendingId: `test-usaspending-batch-${i}`,
        title: `TEST BATCH ${i}: Commercial Cleaning Contract`,
        agency: 'Test Agency',
        recordType: 'contract',
        source: 'usaspending',
        estimatedValue: 100000 + (i * 10000),
        description: `Batch test record ${i}`,
        naicsCode: '561700',
        url: 'https://example.com/test',
        postedDate: new Date().toISOString().split('T')[0]
      });
    }

    let successCount = 0;
    let failCount = 0;

    for (const discovery of testDiscoveries) {
      try {
        const batchRecordData = {
          title: discovery.title,
          record_type: discovery.recordType,
          source: discovery.source,
          deadline: discovery.deadline,
          estimated_value: discovery.estimatedValue,
          description: discovery.description,
          naics_code: discovery.naicsCode,
          url: discovery.url,
          discovery_date: discovery.postedDate
        };

        if (discovery.usaspendingId) {
          batchRecordData.usaspending_id = discovery.usaspendingId;
        }

        await table.create(batchRecordData);
        successCount++;
        console.log(`  ✅ Created: ${discovery.usaspendingId}`);
      } catch (error) {
        failCount++;
        console.error(`  ❌ Failed: ${discovery.usaspendingId} - ${error.message}`);
      }
    }

    console.log(`\nBatch Results: ${successCount} success, ${failCount} failed`);

    // Test 6: Final count
    console.log('\n7️⃣  Final record count:\n');
    const finalRecords = await table.select({ pageSize: 100 }).all();
    console.log(`Total records in Intelligence table: ${finalRecords.length}`);

    if (finalRecords.length > 0) {
      console.log('\nFirst 5 records:');
      for (let i = 0; i < Math.min(5, finalRecords.length); i++) {
        const r = finalRecords[i];
        console.log(`  ${i + 1}. usaspending_id=${r.fields.usaspending_id || 'N/A'}, title=${r.fields.title}`);
      }
    }

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error);
  }
}

debugSaveDiscoveries();
