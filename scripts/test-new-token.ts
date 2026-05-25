const PAT_TOKEN = 'pat99rdlH4w13bxyF.c355b3271a8c2596ec4ff7a7095898ec56567ea71bb7981ff96f6d1c0890b920'
const BASE_ID = 'appZhXnyFiKbnOZLr'

const headers = {
  Authorization: `Bearer ${PAT_TOKEN}`,
  'Content-Type': 'application/json',
}

async function testNewToken() {
  console.log('Testing new token...\n')

  // Test base access
  console.log('1️⃣  Checking base access...')
  try {
    const baseResponse = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}`, {
      headers,
    })

    console.log(`   Status: ${baseResponse.status}`)
    const baseData = await baseResponse.json()
    if (baseResponse.ok) {
      console.log(`   ✓ Base accessible: ${baseData.name}`)
    } else {
      console.log(`   ❌ Error: ${baseData.error?.message}`)
      return false
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`)
    return false
  }

  // Test table listing
  console.log('\n2️⃣  Listing tables...')
  try {
    const tablesResponse = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
      headers,
    })

    console.log(`   Status: ${tablesResponse.status}`)
    const tablesData = await tablesResponse.json()
    if (tablesResponse.ok) {
      console.log(`   ✓ Found ${tablesData.tables?.length || 0} tables:`)
      tablesData.tables?.forEach((t: any) => {
        console.log(`     - ${t.name}`)
      })
      return true
    } else {
      console.log(`   ❌ Error: ${tablesData.error?.message}`)
      return false
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`)
    return false
  }
}

testNewToken()
