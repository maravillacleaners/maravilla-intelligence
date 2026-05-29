const Airtable = require('airtable');

const apiKey = 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92';
const baseId = 'appZhXnyFiKbnOZLr';

const api = new Airtable({ apiKey });

async function checkFields() {
  try {
    const base = api.base(baseId);
    const table = base('Intelligence');
    
    // Try to fetch one record to see what fields are available
    const records = await table.select({ maxRecords: 1 }).all();
    
    if (records.length > 0) {
      const fields = Object.keys(records[0].fields);
      console.log('Available fields in Intelligence table:');
      fields.sort().forEach(f => console.log(`  - ${f}`));
      
      // Check for critical fields
      const criticalFields = [
        'title', 'agency', 'record_type', 'source', 'deadline', 'estimated_value',
        'description', 'naics_code', 'url', 'discovery_date', 'status',
        'award_score', 'size_score', 'relevance_score', 'margin_score', 'scoring_status',
        'matching_status', 'match_date'
      ];
      
      console.log('\nCritical Fields Status:');
      const missing = [];
      criticalFields.forEach(field => {
        const exists = fields.includes(field);
        const status = exists ? '✅' : '❌';
        console.log(`${status} ${field}`);
        if (!exists) missing.push(field);
      });
      
      if (missing.length > 0) {
        console.log(`\nMissing fields (${missing.length}):`);
        missing.forEach(f => console.log(`  - ${f}`));
      } else {
        console.log('\n✅ All critical fields exist!');
      }
    } else {
      console.log('No records found - creating test record to verify fields...');
      // Fields that discovery agent tries to create
      const testRecord = await table.create({
        title: 'Test Contract',
        agency: 'Test Agency',
        record_type: 'contract',
        source: 'usaspending',
        estimated_value: 100000,
        discovery_date: new Date().toISOString().split('T')[0],
        status: 'open'
      });
      console.log('Test record created:', testRecord.id);
      
      // Now fetch it to see what fields are stored
      const created = await table.find(testRecord.id);
      const fields = Object.keys(created.fields);
      console.log('\nFields in Intelligence table:');
      fields.sort().forEach(f => console.log(`  - ${f}`));
      
      // Delete the test record
      await table.destroy(testRecord.id);
      console.log('Test record deleted');
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.error) {
      console.error('Airtable error:', error.error);
    }
  }
}

checkFields();
