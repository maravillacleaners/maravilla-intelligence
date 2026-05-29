#!/usr/bin/env node
const https = require('https');

const CONFIG = {
  AIRTABLE_BASE_ID: 'appZhXnyFiKbnOZLr',
  AIRTABLE_API_KEY: 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92',
  N8N_URL: 'https://n8n.srv1112587.hstgr.cloud',
  N8N_API_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkNjFkMWZkOC0xNDdmLTQzMWYtOGIzYy00YTJjM2U5OTQzOTQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODRkOWY1ZTQtMmMzYS00ODJkLTgxOGMtMzY2NDBiMGViNWRhIiwiaWF0IjoxNzc5NzM2ODE2fQ.pdifsbn7LFvOB09iPFuZLL41bVvsfQOVxL-ovy8LBKM'
};

function request(method, url, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const defaultHeaders = { 'Content-Type': 'application/json', ...headers };
    const options = { method, headers: defaultHeaders };
    const req = https.request(urlObj, options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data, text: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║     AUDITORÍA AUTOMÁTICA COMPLETA DEL SISTEMA                ║
║     Airtable + n8n Workflows + Datos                         ║
╚════════════════════════════════════════════════════════════════╝
`);

  // 1. Airtable Suppliers
  console.log('\n🔍 1. VERIFICANDO AIRTABLE - TABLA SUPPLIERS');
  console.log('─────────────────────────────────────────────────────────');

  let supplierCount = 0;
  let suppliersSample = [];

  try {
    const suppliersResp = await request(
      'GET',
      `https://api.airtable.com/v0/${CONFIG.AIRTABLE_BASE_ID}/Suppliers?maxRecords=100`,
      { 'Authorization': `Bearer ${CONFIG.AIRTABLE_API_KEY}` }
    );

    if (suppliersResp.status === 200) {
      const records = suppliersResp.data.records || [];
      supplierCount = records.length;
      suppliersSample = records.slice(0, 5);
      console.log(`✅ Tabla Suppliers accesible`);
      console.log(`✅ Total de suppliers: ${supplierCount}`);
    } else {
      console.log(`❌ Error: Status ${suppliersResp.status}`);
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }

  if (suppliersSample.length > 0) {
    console.log('\nPrimeros 5 suppliers:');
    suppliersSample.forEach((rec, i) => {
      const f = rec.fields;
      console.log(`  ${i + 1}. ${f.Name} (${f.sub_category})`);
    });
  }

  // 2. n8n Workflows
  console.log('\n\n🔍 2. VERIFICANDO N8N - WORKFLOWS DISPONIBLES');
  console.log('─────────────────────────────────────────────────────────');

  let workflowCount = 0;
  let enrichmentWorkflows = [];

  try {
    const workflowsResp = await request(
      'GET',
      `${CONFIG.N8N_URL}/api/v1/workflows?limit=100`,
      { 'X-N8N-API-KEY': CONFIG.N8N_API_KEY }
    );

    if (workflowsResp.status === 200) {
      const workflows = workflowsResp.data.data || [];
      workflowCount = workflows.length;

      enrichmentWorkflows = workflows.filter(w =>
        w.name && (w.name.toLowerCase().includes('enrichment') ||
                   w.name.toLowerCase().includes('sunbiz') ||
                   w.name.toLowerCase().includes('google') ||
                   w.name.toLowerCase().includes('website') ||
                   w.name.toLowerCase().includes('linkedin') ||
                   w.name.toLowerCase().includes('tier'))
      );

      console.log(`✅ Conectado a n8n correctamente`);
      console.log(`✅ Total workflows: ${workflowCount}`);
      console.log(`✅ Workflows de enriquecimiento: ${enrichmentWorkflows.length}`);

      if (enrichmentWorkflows.length > 0) {
        console.log('\nWorkflows encontrados:');
        enrichmentWorkflows.slice(0, 10).forEach((w, i) => {
          console.log(`  ${i + 1}. ${w.name}`);
          console.log(`     ID: ${w.id}`);
          console.log(`     Estado: ${w.active ? '✅ ACTIVO' : '❌ INACTIVO'}`);
        });
      }
    } else {
      console.log(`❌ Error: Status ${workflowsResp.status}`);
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }

  // 3. Prueba de webhooks
  console.log('\n\n🔍 3. PROBANDO WEBHOOKS');
  console.log('─────────────────────────────────────────────────────────');

  const webhooksToTest = [
    'website-extraction',
    'google-validation',
    'linkedin-discovery',
    'sunbiz-enrichment',
    'enrichment-fl',
    'enrichment-ca'
  ];

  let workingWebhooks = 0;

  for (const webhook of webhooksToTest) {
    try {
      const testResp = await request(
        'POST',
        `${CONFIG.N8N_URL}/webhook/${webhook}`,
        { 'Content-Type': 'application/json' },
        {}
      );

      if (testResp.status === 200 || testResp.status === 201 || testResp.status === 204) {
        console.log(`✅ /${webhook} - FUNCIONA`);
        workingWebhooks++;
      } else {
        console.log(`⚠️  /${webhook} - Status ${testResp.status}`);
      }
    } catch (err) {
      console.log(`❌ /${webhook} - NO RESPONDE`);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  // RESUMEN FINAL
  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                  RESUMEN DE AUDITORÍA                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  console.log(`
📊 DATOS EN AIRTABLE:
   ✅ Suppliers agregados: ${supplierCount}/50+
   ${supplierCount >= 50 ? '✅ Estado: LISTO' : '⚠️  Estado: Incompleto'}

📊 WORKFLOWS EN N8N:
   ✅ Total workflows: ${workflowCount}
   ✅ Workflows de enriquecimiento: ${enrichmentWorkflows.length}
   ${enrichmentWorkflows.filter(w => w.active).length > 0 ? '✅ Workflows activos: ' + enrichmentWorkflows.filter(w => w.active).length : '❌ Ningún workflow activo'}

📊 WEBHOOKS:
   ✅ Webhooks funcionales: ${workingWebhooks}/${webhooksToTest.length}
   ${workingWebhooks > 0 ? '✅ Sistema responsivo' : '❌ Webhooks no responden'}

════════════════════════════════════════════════════════════════════

✅ SISTEMA OPERATIVO: ${supplierCount >= 50 && enrichmentWorkflows.length > 0 ? 'SÍ' : 'PARCIALMENTE'}

${workingWebhooks === 0 ? `
ACCIÓN REQUERIDA:
  1. Abrir n8n: ${CONFIG.N8N_URL}
  2. Verificar que workflows estén ACTIVE
  3. Si están inactivos, activarlos manualmente
  4. Luego ejecutar enriquecimiento nuevamente
` : `
SIGUIENTE PASO:
  ✅ Sistema está funcionando
  ✅ Ejecutar workflows de enriquecimiento
  ✅ Verificar datos en Airtable
`}

════════════════════════════════════════════════════════════════════
`);
}

main().catch(err => {
  console.error('Error fatal:', err.message);
  process.exit(1);
});
