const PAT_TOKEN = 'pat99rdlH4w13bxyF.7426298dd0608eadc534f996839989fcbcea909dc51ed11b500b5ff7e56f6a0f'
const BASE_ID = 'appZhXnyFiKbnOZLr'

const headers = {
  Authorization: `Bearer ${PAT_TOKEN}`,
  'Content-Type': 'application/json',
}

async function testToken() {
  console.log('Testing ORIGINAL token from .env...\n')

  try {
    const baseResponse = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}`, {
      headers,
    })

    console.log(`Status: ${baseResponse.status}`)
    const baseData = await baseResponse.json()
    if (baseResponse.ok) {
      console.log(`✓ Base accessible: ${baseData.name}`)
      return true
    } else {
      console.log(`❌ Error: ${baseData.error?.message}`)
      return false
    }
  } catch (error) {
    console.log(`❌ Error: ${error}`)
    return false
  }
}

testToken().catch(console.error)
