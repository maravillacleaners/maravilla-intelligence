const apiKey = 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92';
const baseId = 'appZhXnyFiKbnOZLr';
const tableId = 'tbl7NYtv13vA377a1';

async function checkFields() {
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

    console.log('\n📋 Fields in Suppliers table:\n');
    console.log('Type Distribution:');
    const typeCount = {};

    data.fields.forEach(field => {
      if (!typeCount[field.type]) {
        typeCount[field.type] = 0;
      }
      typeCount[field.type]++;
    });

    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    console.log('\n\nAll fields:');
    data.fields.forEach((field, idx) => {
      console.log(`${idx + 1}. ${field.name} (${field.type})`);
    });

    // Check for any select fields
    console.log('\n\nSelect-type fields:');
    const selectFields = data.fields.filter(f => f.type.includes('Select'));
    if (selectFields.length === 0) {
      console.log('  None found');
    } else {
      selectFields.forEach(field => {
        console.log(`  - ${field.name} (${field.type})`);
        if (field.options && field.options.choices) {
          console.log(`    Choices: ${field.options.choices.map(c => c.name).join(', ')}`);
        }
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkFields();
