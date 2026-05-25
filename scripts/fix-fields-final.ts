const PAT_TOKEN = 'pat99rdlH4w13bxyF.c355b3271a8c2596ec4ff7a7095898ec56567ea71bb7981ff96f6d1c0890b920'
const BASE_ID = 'appZhXnyFiKbnOZLr'
const TABLE_ID = 'tbl3qWHqunA0eERE2'

const headers = {
  Authorization: `Bearer ${PAT_TOKEN}`,
  'Content-Type': 'application/json',
}

async function createField(field: any) {
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
      return true
    } else {
      const errorData = await response.json()
      console.log(`✗ ${field.name}: ${errorData.error?.message}`)
      return false
    }
  } catch (error) {
    console.log(`✗ ${field.name}: ${error}`)
    return false
  }
}

async function fixFields() {
  console.log('🔧 Creating fields with proper options...\n')

  await createField({ name: 'score', type: 'number', options: { precision: 0 } })
  await createField({ name: 'service_fit', type: 'percent', options: { precision: 0 } })
  await createField({ name: 'ticket_estimate', type: 'currency', options: { precision: 0, symbol: '$' } })
  await createField({ name: 'prime_contractor', type: 'checkbox', options: { color: 'greenBright', icon: 'check' } })
  await createField({ name: 'total_obligated_amount', type: 'currency', options: { precision: 0, symbol: '$' } })
  
  // For multipleSelect, use simpler approach
  await createField({
    name: 'services_offered',
    type: 'multipleSelect',
    options: {
      choices: [
        { name: 'Janitorial' },
        { name: 'Landscaping' },
        { name: 'Security' },
        { name: 'Consulting' }
      ]
    }
  })

  console.log('\n✅ All fields ready! Now inserting test data...\n')
}

fixFields()
