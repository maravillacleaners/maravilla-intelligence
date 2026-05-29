const apiKey = process.env.AIRTABLE_API_KEY || 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92';
const baseId = 'appZhXnyFiKbnOZLr';
const tableId = 'tbl7NYtv13vA377a1';

async function testField(fieldName, fieldType, options = null) {
  console.log(`\nTesting ${fieldType}: ${fieldName}`);

  const payload = {
    name: fieldName,
    type: fieldType
  };

  if (options) {
    payload.options = options;
  }

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
      console.log(`✅ SUCCESS (ID: ${data.id})`);
      return true;
    } else {
      const error = await response.json();
      console.error(`❌ FAILED:`, error.error?.message || error);
      return false;
    }
  } catch (error) {
    console.error(`❌ Exception:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log('Testing basic field types\n');
  console.log('='.repeat(70));

  // Test simple text field
  await testField('test_simple_text', 'singleLineText');
  await new Promise(resolve => setTimeout(resolve, 300));

  // Test singleSelect (simpler than multipleSelect)
  await testField('test_single_select', 'singleSelect', {
    choices: [
      { name: 'Option1' },
      { name: 'Option2' }
    ]
  });
  await new Promise(resolve => setTimeout(resolve, 300));

  // Test multipleSelect with minimal data
  await testField('test_multiple_select', 'multipleSelect', {
    choices: [
      { name: 'Option1' },
      { name: 'Option2' }
    ]
  });

  console.log('\n' + '='.repeat(70));
  console.log('\n✅ Test complete\n');
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
