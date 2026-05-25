const PAT_TOKEN = 'pat99rdlH4w13bxyF.c355b3271a8c2596ec4ff7a7095898ec56567ea71bb7981ff96f6d1c0890b920'
const BASE_ID = 'appZhXnyFiKbnOZLr'
const TABLE_ID = 'tbl3qWHqunA0eERE2'

const headers = {
  Authorization: `Bearer ${PAT_TOKEN}`,
  'Content-Type': 'application/json',
}

async function createFields() {
  console.log('📋 Creating fields in Intelligence table...\n')

  const fields = [
    { name: 'record_type', type: 'singleSelect', options: { choices: [{ name: 'prospect' }, { name: 'contract' }, { name: 'sub' }, { name: 'audit' }] } },
    { name: 'legal_name', type: 'singleLineText' },
    { name: 'business_email', type: 'email' },
    { name: 'phone', type: 'phoneNumber' },
    { name: 'website', type: 'url' },
    { name: 'county', type: 'singleLineText' },
    { name: 'score', type: 'number' },
    { name: 'priority', type: 'singleSelect', options: { choices: [{ name: 'high' }, { name: 'medium' }, { name: 'low' }] } },
    { name: 'pipeline_status', type: 'singleSelect', options: { choices: [{ name: 'pending' }, { name: 'contacted' }, { name: 'interested' }, { name: 'qualified' }, { name: 'approved' }, { name: 'rejected' }] } },
    { name: 'icebreaker', type: 'multilineText' },
    { name: 'segment', type: 'singleSelect', options: { choices: [{ name: 'Federal' }, { name: 'State' }, { name: 'Local' }, { name: 'Tribal' }] } },
    { name: 'service_fit', type: 'percent' },
    { name: 'ticket_estimate', type: 'currency' },
    { name: 'prime_contractor', type: 'checkbox' },
    { name: 'agency', type: 'singleSelect', options: { choices: [{ name: 'federal' }, { name: 'state' }, { name: 'local' }, { name: 'tribal' }] } },
    { name: 'total_obligated_amount', type: 'currency' },
    { name: 'teaming_email_draft', type: 'multilineText' },
    { name: 'foia_draft', type: 'multilineText' },
    { name: 'sub_category', type: 'singleLineText' },
    { name: 'services_offered', type: 'multipleSelect', options: { choices: [{ name: 'Janitorial' }, { name: 'Landscaping' }, { name: 'Security' }, { name: 'Consulting' }] } },
    { name: 'event_type', type: 'singleLineText' },
    { name: 'event_date', type: 'date' },
  ]

  let created = 0
  let failed = 0

  for (const field of fields) {
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
        created++
      } else {
        const errorData = await response.json()
        if (errorData.error?.type === 'DUPLICATE_FIELD_NAME') {
          console.log(`→ ${field.name} (already exists)`)
        } else {
          console.log(`✗ ${field.name}: ${errorData.error?.message}`)
          failed++
        }
      }
    } catch (error) {
      console.log(`✗ ${field.name}: ${error}`)
      failed++
    }
  }

  console.log(`\n✓ Created: ${created}, Skipped/Failed: ${failed}`)
  return failed === 0
}

createFields()
