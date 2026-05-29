require('dotenv').config();
const fetch = require('node-fetch');

async function debugUSAspendingExtraction() {
  console.log('\n🔍 DEBUG: USA SPENDING EXTRACTION\n');

  try {
    const url = 'https://api.usaspending.gov/api/v2/search/spending_by_award/';

    const payload = {
      filters: {
        award_type_codes: ['A', 'B', 'C', 'D'],
        award_amounts: [
          { lower_bound: 100000 }
        ],
        naics_codes: ['561700', '561710', '561711', '561720', '561730', '561740', '561790']
      },
      fields: [
        'Award ID',
        'Description',
        'Awarding Agency',
        'Award Amount',
        'naics_code',
        'Base Obligation Date'
      ],
      limit: 5,
      offset: 0
    };

    console.log('📤 Fetching from USA Spending API...\n');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 10000
    });

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return;
    }

    const data = await response.json();
    const awards = data.results || [];

    console.log(`✅ Received ${awards.length} records from API\n`);

    if (awards.length === 0) {
      console.log('❌ No awards returned');
      return;
    }

    // Show the raw structure
    console.log('📋 First award RAW STRUCTURE:\n');
    console.log(JSON.stringify(awards[0], null, 2));

    // Log all keys in the first award
    console.log('\n🔑 ALL KEYS in first award:\n');
    const keys = Object.keys(awards[0]);
    keys.forEach(key => {
      console.log(`  ${key}: ${typeof awards[0][key]}`);
    });

    // Try to extract what the code expects
    console.log('\n🔎 EXTRACTION ATTEMPT:\n');
    const award = awards[0];

    console.log(`award.generated_internal_id: ${award.generated_internal_id} (${typeof award.generated_internal_id})`);
    console.log(`award.Award ID: ${award['Award ID']} (${typeof award['Award ID']})`);
    console.log(`award.award_id: ${award.award_id} (${typeof award.award_id})`);
    console.log(`award.id: ${award.id} (${typeof award.id})`);

    // Show what the discovery object would look like
    console.log('\n📦 RESULTING DISCOVERY OBJECT:\n');
    const discovery = {
      id: `usaspending-${award.generated_internal_id}`,
      usaspendingId: award.generated_internal_id,
      title: award.description || 'Unnamed Award',
      agency: award.awarding_agency?.name || 'Unknown Agency',
      recordType: 'award',
      source: 'usaspending',
      naicsCode: award.naics_code || award['naics_code'] || '',
    };

    console.log(JSON.stringify(discovery, null, 2));

    // Check if usaspendingId was populated
    console.log(`\n⚠️  usaspendingId populated? ${discovery.usaspendingId ? '✅ YES' : '❌ NO'}`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugUSAspendingExtraction();
