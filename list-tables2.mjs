import https from 'https';

const API_KEY = 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92';
const BASE_ID = 'appZhXnyFiKbnOZLr';

function request(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.airtable.com',
      path: path,
      method: method,
      headers: { 'Authorization': `Bearer ${API_KEY}` },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve(JSON.parse(data));
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function check() {
  const res = await request('GET', `/v0/meta/bases/${BASE_ID}/tables`);
  
  console.log('All tables in base:');
  for (const table of res.tables) {
    if (table.name.includes('Supplier') || table.name.includes('Communications')) {
      console.log(`${table.name}: ${table.id}`);
    }
  }
}

check().catch(console.error);
