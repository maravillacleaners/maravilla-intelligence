const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_API_KEY || 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92';
const baseId = 'appZhXnyFiKbnOZLr';
const suppliersTableId = 'tbl7NYtv13vA377a1';
const intelligenceTableId = 'tbl3qWHqunA0eERE2';

const base = new Airtable({ apiKey }).base(baseId);

const fieldsToCreate = [
  {
    table: suppliersTableId,
    name: 'services_offered',
    type: 'multipleSelect',
    options: {
      choices: [
        { name: 'Janitorial' },
        { name: 'Landscaping' },
        { name: 'HVAC' },
        { name: 'Painting' },
        { name: 'Construction' },
        { name: 'Plumbing' },
        { name: 'Electrical' }
      ]
    }
  },
  {
    table: intelligenceTableId,
    name: 'agency',
    type: 'singleLineText'
  },
  {
    table: intelligenceTableId,
    name: 'notes',
    type: 'multilineText'
  }
];

async function createFields() {
  console.log('\n📋 Creating remaining 3 Airtable fields');
  console.log('='.repeat(70));

  let successful = 0;
  let failed = 0;

  for (const field of fieldsToCreate) {
    try {
      // Build request body
      const payload = {
        name: field.name,
        type: field.type
      };

      if (field.options) {
        payload.options = field.options;
      }

      console.log(`\nCreating: ${field.name} (${field.type}) in table ${field.table}`);
      console.log('Payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(
        `https://api.airtable.com/v0/meta/bases/${baseId}/tables/${field.table}/fields`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Created: ${field.name} (ID: ${data.id})`);
        successful++;
      } else {
        const error = await response.json();
        console.error(`❌ Failed: ${field.name}`);
        console.error('Error:', error);
        failed++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`❌ Exception creating ${field.name}:`, error.message);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n✅ Complete: ${successful} fields created, ${failed} failed\n`);
}

createFields().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
