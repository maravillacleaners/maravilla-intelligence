require('dotenv').config();
const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = 'appZhXnyFiKbnOZLr';

async function debugScoringMismatch() {
  try {
    const base = new Airtable({ apiKey }).base(baseId);
    const table = base('Intelligence');

    console.log('\n🔍 DEBUGGING SCORING MISMATCH\n');

    // Get ALL records to see what we have
    console.log('1️⃣  Fetching all Intelligence records...\n');
    const allRecords = await table.select({
      pageSize: 100
    }).all();

    console.log(`Total records in table: ${allRecords.length}\n`);

    // Sample first 5 records
    console.log('📋 Sample of first 5 records:\n');
    for (let i = 0; i < Math.min(5, allRecords.length); i++) {
      const r = allRecords[i];
      console.log(`Record ${i + 1}:`);
      console.log(`  Airtable ID: ${r.id}`);
      console.log(`  Title: ${r.fields.title}`);
      console.log(`  usaspending_id: ${r.fields.usaspending_id || 'N/A'}`);
      console.log(`  sam_contract_id: ${r.fields.sam_contract_id || 'N/A'}`);
      console.log(`  award_score: ${r.fields.award_score || 'N/A'}`);
      console.log(`  scoring_status: ${r.fields.scoring_status || 'N/A'}`);
      console.log('');
    }

    // Check for records with scores
    console.log('2️⃣  Checking records WITH award_score set:\n');
    const scoredRecords = allRecords.filter(r => r.fields.award_score !== undefined && r.fields.award_score !== null);
    console.log(`Records with award_score: ${scoredRecords.length}`);

    if (scoredRecords.length > 0) {
      console.log('\nFirst scored record:');
      const first = scoredRecords[0];
      console.log(`  Airtable ID: ${first.id}`);
      console.log(`  usaspending_id: ${first.fields.usaspending_id}`);
      console.log(`  sam_contract_id: ${first.fields.sam_contract_id}`);
      console.log(`  award_score: ${first.fields.award_score}`);
      console.log(`  scoring_status: ${first.fields.scoring_status}`);
    }

    // Test the filterByFormula directly
    console.log('\n3️⃣  Testing filterByFormula for high-scoring awards (>= 50):\n');
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
        console.log(`  Record ${i + 1}: score=${r.fields.award_score}, status=${r.fields.scoring_status}`);
      }
    }

    // Check for records with usaspending_id but no score
    console.log('\n4️⃣  Records with usaspending_id but NO award_score:\n');
    const unscored = allRecords.filter(r =>
      r.fields.usaspending_id &&
      (r.fields.award_score === undefined || r.fields.award_score === null)
    );
    console.log(`Count: ${unscored.length}`);

    if (unscored.length > 0 && unscored.length <= 5) {
      console.log('\nThese unscored records:');
      for (const r of unscored) {
        console.log(`  usaspending_id=${r.fields.usaspending_id}, title=${r.fields.title}`);
      }
    }

    // Show distribution of scores
    console.log('\n5️⃣  Score distribution:\n');
    const distribution = {
      veryHigh: allRecords.filter(r => (r.fields.award_score || 0) >= 80).length,
      high: allRecords.filter(r => (r.fields.award_score || 0) >= 60 && (r.fields.award_score || 0) < 80).length,
      medium: allRecords.filter(r => (r.fields.award_score || 0) >= 40 && (r.fields.award_score || 0) < 60).length,
      low: allRecords.filter(r => (r.fields.award_score || 0) > 0 && (r.fields.award_score || 0) < 40).length,
      unscored: allRecords.filter(r => !r.fields.award_score).length
    };

    console.log(`  >=80 (veryHigh): ${distribution.veryHigh}`);
    console.log(`  60-79 (high): ${distribution.high}`);
    console.log(`  40-59 (medium): ${distribution.medium}`);
    console.log(`  1-39 (low): ${distribution.low}`);
    console.log(`  unscored: ${distribution.unscored}`);
    console.log(`  Total: ${Object.values(distribution).reduce((a,b) => a+b, 0)}`);

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  }
}

debugScoringMismatch();
