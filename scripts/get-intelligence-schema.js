const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY || 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92';
const baseId = 'appZhXnyFiKbnOZLr';

async function getTableSchema() {
  try {
    const base = new Airtable({ apiKey }).base(baseId);
    const table = base('Intelligence');

    // Get one record to see all field IDs
    const records = await table.select({ maxRecords: 1 }).all();

    if (records.length === 0) {
      console.log('No records found');
      return;
    }

    const record = records[0];
    console.log('\n📋 Intelligence Table Field Mapping:\n');
    console.log('Field ID -> Field Name (Type)\n');

    // Map field IDs to names from the record's fields object
    const fieldNames = Object.keys(record.fields);

    for (const fieldName of fieldNames) {
      const value = record.fields[fieldName];
      const type = typeof value;
      console.log(`${fieldName}`);
    }

    // Now query the metadata API to get field types
    console.log('\n\n📊 Field Types (from metadata API):\n');

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
      console.log(`Metadata API error: ${response.status}`);
      return;
    }

    const data = await response.json();
    const intelligenceTable = data.tables.find(t => t.name === 'Intelligence');

    if (intelligenceTable) {
      intelligenceTable.fields.forEach((field) => {
        console.log(`${field.name} (${field.type})`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

getTableSchema();
