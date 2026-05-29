require('dotenv').config();
const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID || 'appZhXnyFiKbnOZLr';

async function listTables() {
  try {
    const base = new Airtable({ apiKey }).base(baseId);

    console.log('\n📋 BASE CONFIGURATION:\n');
    console.log(`API Key: ${apiKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`Base ID: ${baseId}`);
    console.log(`Base ID env var: ${process.env.AIRTABLE_BASE_ID || '(not set, using hardcoded)'}\n`);

    // Try to fetch from the base (this will list accessible tables indirectly)
    console.log('Attempting to access base...\n');

    // List tables by trying to access them
    const tableNames = ['Intelligence', 'Suppliers', 'Awards', 'Contracts'];

    for (const tableName of tableNames) {
      try {
        const table = base(tableName);
        const records = await table.select({ pageSize: 1 }).all();
        console.log(`✅ Table "${tableName}": ${records.length} total records`);
      } catch (error) {
        if (error.message.includes('NOT_FOUND') || error.message.includes('not found')) {
          console.log(`❌ Table "${tableName}": NOT FOUND`);
        } else {
          console.log(`⚠️  Table "${tableName}": Error - ${error.message}`);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  }
}

listTables();
