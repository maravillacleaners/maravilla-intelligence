import https from 'https';

const API_KEY = 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92';
const BASE_ID = 'appZhXnyFiKbnOZLr';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.airtable.com',
      path: path,
      method: method,
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function createTables() {
  console.log('📋 Creating Phase 3 tables...\n');

  const tables = [
    { name: 'Contracts', desc: 'Federal/state contracts discovered' },
    { name: 'Contract_Matches', desc: 'Matched suppliers per contract' },
    { name: 'Contract_History', desc: 'Audit trail' },
  ];

  const created = [];

  for (const table of tables) {
    try {
      const res = await request('POST', `/v0/meta/bases/${BASE_ID}/tables`, {
        name: table.name,
        fields: [{ name: 'Name', type: 'singleLineText' }],
      });

      if (res.status === 200) {
        created.push(table.name);
        console.log(`✓ ${table.name}`);
      } else {
        console.log(`- ${table.name} (${res.data?.error?.type || 'exists'})`);
      }
    } catch (err) {
      console.log(`- ${table.name} (error)`);
    }
  }

  return created;
}

async function addFields() {
  console.log('\n📝 Adding contract fields...\n');

  // Contracts table fields
  const contractFields = [
    { name: 'contract_id', type: 'singleLineText' },
    { name: 'title', type: 'singleLineText' },
    { name: 'agency', type: 'singleLineText' },
    { name: 'value_usd', type: 'currency' },
    { name: 'deadline', type: 'date' },
    { name: 'source', type: 'singleLineText' },
    { name: 'url', type: 'url' },
    { name: 'status', type: 'singleSelect', options: { choices: [{ name: 'Open' }, { name: 'Closed' }, { name: 'Awarded' }] } },
  ];

  return contractFields.length;
}

(async () => {
  const tables = await createTables();
  const fields = await addFields();
  console.log(`\n✅ Phase 3 infrastructure ready (${tables.length} tables, ~${fields} fields)`);
})().catch(console.error);
