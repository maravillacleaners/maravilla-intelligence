const PAT_TOKEN = 'pat99rdlH4w13bxyF.c355b3271a8c2596ec4ff7a7095898ec56567ea71bb7981ff96f6d1c0890b920'
const BASE_ID = 'appZhXnyFiKbnOZLr'
const TABLE_ID = 'tbl3qWHqunA0eERE2'

const headers = {
  Authorization: `Bearer ${PAT_TOKEN}`,
  'Content-Type': 'application/json',
}

async function fixFields() {
  console.log('🔧 Fixing remaining fields...\n')

  const fieldsToFix = [
    { name: 'score', type: 'number', options: {} },
    { name: 'service_fit', type: 'percent', options: {} },
    { name: 'ticket_estimate', type: 'currency', options: { symbol: '$' } },
    { name: 'prime_contractor', type: 'checkbox', options: {} },
    { name: 'total_obligated_amount', type: 'currency', options: { symbol: '$' } },
    { name: 'services_offered', type: 'multipleSelect', options: { choices: [{ name: 'Janitorial' }, { name: 'Landscaping' }, { name: 'Security' }, { name: 'Consulting' }] } },
    { name: 'event_date', type: 'date', options: { dateFormat: { name: 'local', format: 'l' } } },
  ]

  for (const field of fieldsToFix) {
    try {
      const response = await fetch(
        `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables/${TABLE_ID}/fields`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(field),
        }
      )

      if (response.ok) {
        console.log(`✓ ${field.name}`)
      } else {
        const errorData = await response.json()
        console.log(`✗ ${field.name}: ${errorData.error?.message}`)
      }
    } catch (error) {
      console.log(`✗ ${field.name}: ${error}`)
    }
  }

  console.log('\n✅ Field creation complete!')
}

fixFields()
