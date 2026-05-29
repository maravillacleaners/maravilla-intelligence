require('dotenv').config();
const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = 'appZhXnyFiKbnOZLr';

async function auditFieldNames() {
  try {
    console.log('\n🔍 AUDIT: INTELLIGENCE TABLE FIELD NAMES\n');

    const base = new Airtable({ apiKey }).base(baseId);
    const table = base('Intelligence');

    // Get all records (paginated)
    console.log('1️⃣  Fetching records to inspect field names...\n');
    const allRecords = await table.select({ pageSize: 100 }).all();
    console.log(`Total records: ${allRecords.length}`);

    if (allRecords.length === 0) {
      console.log('\n⚠️  No records in table. Using Suppliers table as reference...\n');

      const suppliersTable = base('Suppliers');
      const suppliers = await suppliersTable.select({ pageSize: 1 }).all();
      if (suppliers.length > 0) {
        const r = suppliers[0];
        console.log('Sample Suppliers record fields:');
        Object.keys(r.fields).forEach(key => {
          console.log(`  "${key}": ${typeof r.fields[key]}`);
        });
      }
    } else {
      console.log('\n2️⃣  Field names from first record:\n');
      const firstRecord = allRecords[0];
      const fieldNames = Object.keys(firstRecord.fields);
      fieldNames.sort();

      fieldNames.forEach(name => {
        console.log(`  "${name}": ${typeof firstRecord.fields[name]}`);
      });

      console.log('\n3️⃣  Full first record:\n');
      console.log(JSON.stringify(firstRecord.fields, null, 2));
    }

    // Check if we can see field names through the API
    console.log('\n4️⃣  Checking table metadata...\n');
    try {
      // Try to get table info
      const tableInfo = await table.select({ pageSize: 1 }).first();
      if (tableInfo) {
        console.log('Table info retrieved successfully');
        console.log('Fields in first record:');
        Object.keys(tableInfo.fields).forEach(key => {
          console.log(`  "${key}"`);
        });
      }
    } catch (error) {
      console.log('Could not retrieve table metadata directly');
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  }
}

auditFieldNames();
