const apiKey = process.env.AIRTABLE_API_KEY || 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92';
const baseId = 'appZhXnyFiKbnOZLr';

async function findIntelligenceTable() {
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error(`Error: ${response.status}`, await response.text());
      return null;
    }

    const data = await response.json();
    const intelligenceTable = data.tables.find(t => t.name === 'Intelligence');

    if (!intelligenceTable) {
      console.error('Intelligence table not found');
      return null;
    }

    return intelligenceTable.id;
  } catch (error) {
    console.error('Error finding Intelligence table:', error.message);
    return null;
  }
}

async function checkFields(tableId) {
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/meta/bases/${baseId}/tables/${tableId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error(`Error: ${response.status}`, await response.text());
      return;
    }

    const data = await response.json();

    console.log('\n📋 Intelligence Table Fields:\n');
    console.log('All fields:');
    data.fields.forEach((field, idx) => {
      console.log(`${idx + 1}. ${field.name} (${field.type})`);
    });

    // Check for critical fields needed by Phase 5 agents
    const criticalFields = [
      'title', 'agency', 'record_type', 'source', 'deadline', 'estimated_value',
      'description', 'naics_code', 'url', 'discovery_date', 'status',
      'award_score', 'size_score', 'relevance_score', 'margin_score', 'scoring_status',
      'matching_status', 'match_date'
    ];

    console.log('\n\n🔍 Critical Fields Status:\n');
    const existingFieldNames = data.fields.map(f => f.name);
    const missing = [];

    criticalFields.forEach(field => {
      const exists = existingFieldNames.includes(field);
      const status = exists ? '✅' : '❌';
      console.log(`${status} ${field}`);
      if (!exists) missing.push(field);
    });

    if (missing.length > 0) {
      console.log(`\n\n⚠️  Missing fields (${missing.length}):`);
      missing.forEach(f => console.log(`  - ${f}`));
    } else {
      console.log('\n\n✅ All critical fields exist!');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function run() {
  console.log('Finding Intelligence table...');
  const tableId = await findIntelligenceTable();

  if (tableId) {
    console.log(`Found Intelligence table: ${tableId}\n`);
    await checkFields(tableId);
  }
}

run();
