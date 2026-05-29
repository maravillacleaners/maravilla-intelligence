require('dotenv').config();
const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = 'appZhXnyFiKbnOZLr';

async function deleteOrphanedRecords() {
  try {
    const base = new Airtable({ apiKey }).base(baseId);
    const table = base('Intelligence');

    console.log('\n🗑️  DELETING ORPHANED RECORDS\n');

    // Get all records
    const allRecords = await table.select({
      pageSize: 100
    }).all();

    console.log(`Found ${allRecords.length} records total\n`);

    // Records without usaspending_id AND sam_contract_id are orphaned
    const orphanedRecords = allRecords.filter(r =>
      !r.fields.usaspending_id && !r.fields.sam_contract_id
    );

    console.log(`Orphaned records (no IDs): ${orphanedRecords.length}\n`);

    if (orphanedRecords.length === 0) {
      console.log('✅ No orphaned records found');
      return;
    }

    // Delete in batches of 10
    for (let i = 0; i < orphanedRecords.length; i += 10) {
      const batch = orphanedRecords.slice(i, i + 10);
      const ids = batch.map(r => r.id);

      console.log(`Deleting batch ${Math.floor(i/10) + 1} (${ids.length} records)...`);

      await Promise.all(
        ids.map(id => table.destroy(id))
      );

      console.log(`✅ Deleted ${ids.length} records`);
    }

    console.log(`\n✅ All ${orphanedRecords.length} orphaned records deleted`);

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  }
}

deleteOrphanedRecords();
