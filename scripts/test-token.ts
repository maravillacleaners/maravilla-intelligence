const PAT_TOKEN = 'pat99rdlH4w13bxyF.6e8425bb8a2cb8f64152ee476c9a8c3cdb66e2ef7c1b78876d79296e52e0fd45'
const BASE_ID = 'appZhXnyFiKbnOZLr'

const headers = {
  Authorization: `Bearer ${PAT_TOKEN}`,
  'Content-Type': 'application/json',
}

async function testToken() {
  console.log('Testing Airtable token...\n')

  // Test 1: Get list of tables (metadata)
  console.log('1️⃣  Checking metadata API access...')
  try {
    const metaResponse = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
      headers,
    })

    console.log(`   Status: ${metaResponse.status}`)
    const metaData = await metaResponse.json()
    if (metaResponse.ok) {
      console.log(`   ✓ Found ${metaData.tables?.length || 0} tables`)
      metaData.tables?.forEach((t: any) => {
        console.log(`     - ${t.name} (${t.id})`)
      })
    } else {
      console.log(`   ❌ Error: ${metaData.error?.message}`)
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`)
  }

  // Test 2: Get list of records (data)
  console.log('\n2️⃣  Checking data API access (Intelligence table)...')
  try {
    const dataResponse = await fetch(`https://api.airtable.com/v0/${BASE_ID}/Intelligence`, {
      headers,
    })

    console.log(`   Status: ${dataResponse.status}`)
    const data = await dataResponse.json()
    if (dataResponse.ok) {
      console.log(`   ✓ Table accessible, ${data.records?.length || 0} records found`)
    } else {
      console.log(`   ℹ️  Info: ${data.error?.message}`)
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`)
  }

  // Test 3: Get list of all records (without table name)
  console.log('\n3️⃣  Testing base access...')
  try {
    const baseResponse = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}`, {
      headers,
    })

    console.log(`   Status: ${baseResponse.status}`)
    const baseData = await baseResponse.json()
    if (baseResponse.ok) {
      console.log(`   ✓ Base accessible`)
      console.log(`   ID: ${baseData.id}`)
      console.log(`   Name: ${baseData.name}`)
    } else {
      console.log(`   ❌ Error: ${baseData.error?.message}`)
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`)
  }
}

testToken().catch(console.error)
