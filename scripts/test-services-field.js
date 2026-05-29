const apiKey = process.env.AIRTABLE_API_KEY || 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92';
const baseId = 'appZhXnyFiKbnOZLr';
const tableId = 'tbl7NYtv13vA377a1';

async function testPayload(label, payload) {
  console.log(`\n🧪 Testing: ${label}`);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/meta/bases/${baseId}/tables/${tableId}/fields`,
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
      console.log(`✅ SUCCESS: Created field (ID: ${data.id})`);
      return true;
    } else {
      const error = await response.json();
      console.error(`❌ FAILED:`, error);
      return false;
    }
  } catch (error) {
    console.error(`❌ Exception:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log('Testing different payload structures for services_offered field\n');
  console.log('='.repeat(70));

  // Variation 1: Original structure (with choices as objects)
  await testPayload(
    'Variation 1: Original with choice objects',
    {
      name: 'services_offered_test1',
      type: 'multipleSelect',
      options: {
        choices: [
          { name: 'Janitorial' },
          { name: 'Landscaping' },
          { name: 'HVAC' },
          { name: 'Painting' }
        ]
      }
    }
  );

  await new Promise(resolve => setTimeout(resolve, 300));

  // Variation 2: With color property for choices
  await testPayload(
    'Variation 2: With color property for choices',
    {
      name: 'services_offered_test2',
      type: 'multipleSelect',
      options: {
        choices: [
          { name: 'Janitorial', color: 'blueLight2' },
          { name: 'Landscaping', color: 'greenLight2' },
          { name: 'HVAC', color: 'cyanLight2' },
          { name: 'Painting', color: 'yellowLight2' }
        ]
      }
    }
  );

  await new Promise(resolve => setTimeout(resolve, 300));

  // Variation 3: Minimal payload (empty choices)
  await testPayload(
    'Variation 3: Empty choices array',
    {
      name: 'services_offered_test3',
      type: 'multipleSelect',
      options: {
        choices: []
      }
    }
  );

  await new Promise(resolve => setTimeout(resolve, 300));

  // Variation 4: Without options (just type)
  await testPayload(
    'Variation 4: Without options parameter',
    {
      name: 'services_offered_test4',
      type: 'multipleSelect'
    }
  );

  console.log('\n' + '='.repeat(70));
  console.log('\n✅ Test suite complete. Check results above.\n');
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
