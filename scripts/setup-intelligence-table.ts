const AIRTABLE_API_URL = 'https://api.airtable.com/v0'
const PAT_TOKEN = 'pat99rdlH4w13bxyF.c355b3271a8c2596ec4ff7a7095898ec56567ea71bb7981ff96f6d1c0890b920'
const BASE_ID = 'appZhXnyFiKbnOZLr'
const TABLE_NAME = 'Intelligence'

const headers = {
  Authorization: `Bearer ${PAT_TOKEN}`,
  'Content-Type': 'application/json',
}

async function getTableId(): Promise<string | null> {
  try {
    const response = await fetch(`${AIRTABLE_API_URL}/meta/bases/${BASE_ID}/tables`, {
      headers,
    })

    if (!response.ok) {
      console.error('Error fetching tables')
      return null
    }

    const data = await response.json()
    const table = data.tables.find((t: any) => t.name === TABLE_NAME)
    return table?.id || null
  } catch (error) {
    console.error('Error getting table ID:', error)
    return null
  }
}

async function insertTestData(): Promise<boolean> {
  console.log(`\n📝 Inserting 3 test prospect records...`)
  try {
    const testRecords = [
      {
        fields: {
          'record_type': 'prospect',
          'legal_name': 'Acme Federal Solutions LLC',
          'business_email': 'procurement@acmefederal.com',
          'phone': '(202) 555-0100',
          'website': 'https://acmefederal.com',
          'county': 'District of Columbia',
          'score': 92,
          'priority': 'high',
          'pipeline_status': 'qualified',
          'icebreaker': 'GSA Schedule holder with 15+ years federal contracting experience. Recent wins: VA medical facility cleaning ($2.3M), DOD base maintenance ($5.1M).',
          'segment': 'Federal',
          'service_fit': 0.95,
          'ticket_estimate': 750000,
          'prime_contractor': true,
          'agency': 'federal',
          'total_obligated_amount': 7400000,
          'teaming_email_draft': 'Hello Acme Federal, we saw your success with the VA facility wins and believe our specialized janitorial services could strengthen your federal proposal.',
          'foia_draft': 'Seeking teaming partner for federal janitorial services on Schedule 84-19-01.',
          'sub_category': 'Janitorial Services',
          'event_type': 'Capture Event',
          'event_date': '2026-06-15',
        },
      },
      {
        fields: {
          'record_type': 'prospect',
          'legal_name': 'StateBuilt Infrastructure Partners',
          'business_email': 'bids@statebuilt.com',
          'phone': '(850) 555-0200',
          'website': 'https://statebuilt.com',
          'county': 'Leon',
          'score': 78,
          'priority': 'medium',
          'pipeline_status': 'interested',
          'icebreaker': 'Florida-based, state contract vehicles (FLASBID). Active in HVAC and custodial. Budget allocation $1.8M/quarter across multiple facilities.',
          'segment': 'State',
          'service_fit': 0.87,
          'ticket_estimate': 450000,
          'prime_contractor': false,
          'agency': 'state',
          'total_obligated_amount': 2100000,
          'teaming_email_draft': 'StateBuilt, we noticed your strong FLASBID presence in facilities management and would like to discuss teaming for the upcoming university campus RFP.',
          'foia_draft': 'Seeking to join StateBuilt as teaming partner on state custodial services.',
          'sub_category': 'Facilities Management',
          'event_type': 'Outreach',
          'event_date': '2026-06-10',
        },
      },
      {
        fields: {
          'record_type': 'prospect',
          'legal_name': 'CountyWide Facilities LLC',
          'business_email': 'proposals@countywidefl.com',
          'phone': '(407) 555-0300',
          'website': 'https://countywidefl.com',
          'county': 'Orange',
          'score': 65,
          'priority': 'low',
          'pipeline_status': 'pending',
          'icebreaker': 'Regional county services provider. Limited federal exposure but strong local government relationships. Growing procurement team.',
          'segment': 'Local',
          'service_fit': 0.72,
          'ticket_estimate': 225000,
          'prime_contractor': false,
          'agency': 'local',
          'total_obligated_amount': 850000,
          'teaming_email_draft': 'CountyWide, your growth in local government services aligns with our county-focused expansion. Let\'s discuss teaming opportunities.',
          'foia_draft': 'Partnership inquiry for county facility services.',
          'sub_category': 'County Services',
          'event_type': 'Research',
          'event_date': '2026-06-20',
        },
      },
    ]

    const response = await fetch(`${AIRTABLE_API_URL}/${BASE_ID}/${TABLE_NAME}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ records: testRecords }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Error inserting records:', errorData)
      return false
    }

    const data = await response.json()
    console.log(`✓ Inserted ${data.records.length} test records`)
    data.records.forEach((r: any, i: number) => {
      console.log(`  ${i + 1}. ${r.fields.legal_name} (ID: ${r.id})`)
    })
    return true
  } catch (error) {
    console.error('Error inserting test data:', error)
    return false
  }
}

async function createViews(tableId: string): Promise<boolean> {
  console.log(`\n🔍 Creating filtered views...`)
  try {
    const views = [
      { name: 'Prospects' },
      { name: 'Contracts' },
      { name: 'Subs' },
      { name: 'Audit' },
    ]

    for (const view of views) {
      const viewResponse = await fetch(
        `${AIRTABLE_API_URL}/meta/bases/${BASE_ID}/tables/${tableId}/views`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: view.name,
            type: 'grid',
          }),
        }
      )

      if (!viewResponse.ok) {
        const errorData = await viewResponse.json()
        if (errorData.error?.type === 'DUPLICATE_VIEW_NAME') {
          console.log(`  ✓ View '${view.name}' already exists`)
        } else {
          console.error(`Error creating view ${view.name}:`, errorData)
        }
      } else {
        const viewData = await viewResponse.json()
        console.log(`  ✓ Created view '${view.name}'`)
      }
    }

    return true
  } catch (error) {
    console.error('Error creating views:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Maravilla Intelligence Table Setup\n')
  console.log(`Base: Maravilla Cleaners Base`)
  console.log(`Table: ${TABLE_NAME}`)

  console.log('\n🔍 Checking if Intelligence table exists...')
  const tableId = await getTableId()

  if (!tableId) {
    console.log(`\n❌ Table '${TABLE_NAME}' not found`)
    process.exit(1)
  }

  console.log(`✓ Table found (ID: ${tableId})`)

  const dataInserted = await insertTestData()
  if (!dataInserted) {
    console.log('\n❌ Failed to insert test data')
    process.exit(1)
  }

  const viewsCreated = await createViews(tableId)
  if (!viewsCreated) {
    console.log('\n⚠️  Some views may not have been created')
  }

  console.log('\n✅ Setup complete!')
  console.log('\n📊 Intelligence table now has:')
  console.log('  ✓ 3 test prospect records')
  console.log('  ✓ 4 views (Prospects, Contracts, Subs, Audit)')
  console.log('\n🌐 Visit http://localhost:3000/prospects to see the data')
}

main().catch(console.error)
