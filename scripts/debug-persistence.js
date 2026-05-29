require('dotenv').config();
const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = 'appZhXnyFiKbnOZLr';

async function debugPersistence() {
  try {
    const base = new Airtable({ apiKey }).base(baseId);
    const table = base('Intelligence');

    console.log('\n🔍 DEBUG: DATA PERSISTENCE\n');

    // Get ALL records
    console.log('1️⃣  Fetching all Intelligence records...\n');
    const allRecords = await table.select({
      pageSize: 100
    }).all();

    console.log(`Total records in table: ${allRecords.length}\n`);

    // Check which records have usaspending_id (from USA Spending)
    console.log('2️⃣  USA Spending records (have usaspending_id):\n');
    const usaSpendingRecords = allRecords.filter(r => r.fields.usaspending_id);
    console.log(`Found: ${usaSpendingRecords.length} records\n`);

    if (usaSpendingRecords.length > 0) {
      console.log('Sample of first 5 USA Spending records:');
      for (let i = 0; i < Math.min(5, usaSpendingRecords.length); i++) {
        const r = usaSpendingRecords[i];
        console.log(`  Record ${i + 1}:`);
        console.log(`    Airtable ID: ${r.id}`);
        console.log(`    usaspending_id: ${r.fields.usaspending_id}`);
        console.log(`    title: ${r.fields.title}`);
        console.log(`    award_score: ${r.fields.award_score || 'NOT SET'}`);
        console.log(`    scoring_status: ${r.fields.scoring_status || 'NOT SET'}`);
        console.log('');
      }
    }

    // Check which records have award_score
    console.log('3️⃣  Records with award_score SET:\n');
    const scoredRecords = allRecords.filter(r => r.fields.award_score !== undefined && r.fields.award_score !== null);
    console.log(`Found: ${scoredRecords.length} records\n`);

    if (scoredRecords.length > 0) {
      console.log('First 5 scored records:');
      for (let i = 0; i < Math.min(5, scoredRecords.length); i++) {
        const r = scoredRecords[i];
        console.log(`  Record ${i + 1}:`);
        console.log(`    Airtable ID: ${r.id}`);
        console.log(`    usaspending_id: ${r.fields.usaspending_id || 'N/A'}`);
        console.log(`    sam_contract_id: ${r.fields.sam_contract_id || 'N/A'}`);
        console.log(`    award_score: ${r.fields.award_score}`);
        console.log(`    scoring_status: ${r.fields.scoring_status || 'NOT SET'}`);
        console.log('');
      }
    }

    // Critical: Check for records with usaspending_id BUT NO award_score
    console.log('4️⃣  CRITICAL - USA Spending records WITHOUT award_score:\n');
    const unscored = usaSpendingRecords.filter(r =>
      !r.fields.award_score && r.fields.award_score !== 0
    );
    console.log(`Found: ${unscored.length} unscored USA Spending records\n`);

    if (unscored.length > 0 && unscored.length <= 10) {
      console.log('These unscored USA Spending records:');
      for (const r of unscored) {
        console.log(`  usaspending_id=${r.fields.usaspending_id}, title=${r.fields.title}`);
      }
    } else if (unscored.length > 10) {
      console.log(`(showing first 10 of ${unscored.length})`);
      for (let i = 0; i < 10; i++) {
        const r = unscored[i];
        console.log(`  usaspending_id=${r.fields.usaspending_id}, title=${r.fields.title}`);
      }
    }

    // Test the exact filterByFormula from getHighScoringAwards
    console.log('\n5️⃣  Testing getHighScoringAwards filterByFormula (minScore=50):\n');
    const formula = `AND({award_score} >= 50, {scoring_status} = 'scored')`;
    console.log(`Formula: ${formula}\n`);

    const filtered = await table.select({
      filterByFormula: formula
    }).all();

    console.log(`Records matching formula: ${filtered.length}\n`);

    if (filtered.length > 0) {
      console.log('First 3 matching records:');
      for (let i = 0; i < Math.min(3, filtered.length); i++) {
        const r = filtered[i];
        console.log(`  Record ${i + 1}: score=${r.fields.award_score}, status=${r.fields.scoring_status}, usaspending_id=${r.fields.usaspending_id || 'N/A'}`);
      }
    }

    // Check field names - maybe they're different in Airtable
    console.log('\n6️⃣  Field name audit (from first scored record):\n');
    if (scoredRecords.length > 0) {
      const r = scoredRecords[0];
      const fields = r.fields;
      console.log('All fields in first scored record:');
      Object.keys(fields).forEach(key => {
        console.log(`  ${key}: ${typeof fields[key]} = ${JSON.stringify(fields[key]).substring(0, 50)}`);
      });
    }

    // Summary
    console.log('\n7️⃣  SUMMARY:\n');
    console.log(`✅ Total Intelligence records: ${allRecords.length}`);
    console.log(`✅ USA Spending records (have usaspending_id): ${usaSpendingRecords.length}`);
    console.log(`✅ Records with award_score: ${scoredRecords.length}`);
    console.log(`❌ Unscored USA Spending records: ${unscored.length}`);
    console.log(`❌ Records matching getHighScoringAwards formula: ${filtered.length}`);
    console.log(`⚠️  Expected: 100 scored records, found: ${scoredRecords.length}`);

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  }
}

debugPersistence();
