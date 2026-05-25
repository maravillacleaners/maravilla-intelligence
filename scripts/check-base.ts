// Try to access the base directly without full permissions
const BASE_ID = 'appZhXnyFiKbnOZLr'
const PAT_TOKEN = 'pat99rdlH4w13bxyF.6e8425bb8a2cb8f64152ee476c9a8c3cdb66e2ef7c1b78876d79296e52e0fd45'

async function checkTableAccess() {
  console.log('Checking what tables we can access...\n')
  
  // Try Intelligence table
  const tables = ['Intelligence', 'Prospects', 'Clients', 'Contracts', 'Subs']
  
  for (const tableName of tables) {
    try {
      const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${tableName}?maxRecords=1`, {
        headers: {
          Authorization: `Bearer ${PAT_TOKEN}`,
        },
      })
      
      console.log(`${tableName}: ${response.status}`)
      const data = await response.json()
      if (response.ok) {
        console.log(`  ✓ Table exists, ${data.records?.length || 0} records visible`)
      } else {
        console.log(`  ${data.error?.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.log(`${tableName}: Network error`)
    }
  }
}

checkTableAccess()
