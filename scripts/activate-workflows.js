#!/usr/bin/env node
const https = require('https');

const CONFIG = {
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
║     ACTIVANDO WORKFLOWS DE ENRIQUECIMIENTO                    ║
║     Paso 1: Obtener todos los workflows                       ║
║     Paso 2: Identificar workflows inactivos                   ║
║     Paso 3: Activarlos automáticamente                        ║
╚════════════════════════════════════════════════════════════════╝
`);

  // Paso 1: Obtener workflows
  console.log('\n📋 Paso 1: Obteniendo workflows...');
  let workflowsToActivate = [];

  try {
    const workflowsResp = await request(
      'GET',
      `${CONFIG.N8N_URL}/api/v1/workflows?limit=100`,
      { 'X-N8N-API-KEY': CONFIG.N8N_API_KEY }
    );

    if (workflowsResp.status === 200) {
      const workflows = workflowsResp.data.data || [];

      workflowsToActivate = workflows.filter(w =>
        w.name && !w.active && (
          w.name.toLowerCase().includes('enrichment') ||
          w.name.toLowerCase().includes('sunbiz') ||
          w.name.toLowerCase().includes('google') ||
          w.name.toLowerCase().includes('website') ||
          w.name.toLowerCase().includes('linkedin') ||
          w.name.toLowerCase().includes('tier') ||
          w.name.toLowerCase().includes('state') ||
          w.name.toLowerCase().includes('federal')
        )
      );

      console.log(`✅ ${workflows.length} workflows encontrados`);
      console.log(`⚠️  ${workflowsToActivate.length} workflows inactivos para activar\n`);
    } else {
      console.log(`❌ Error obteniendo workflows: ${workflowsResp.status}`);
      process.exit(1);
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
    process.exit(1);
  }

  // Paso 2 y 3: Activar workflows
  console.log('⚙️  Paso 2-3: Activando workflows...\n');

  let successCount = 0;

  for (let i = 0; i < workflowsToActivate.length; i++) {
    const workflow = workflowsToActivate[i];
    try {
      const activateResp = await request(
        'POST',
        `${CONFIG.N8N_URL}/api/v1/workflows/${workflow.id}/activate`,
        { 'X-N8N-API-KEY': CONFIG.N8N_API_KEY }
      );

      if (activateResp.status === 200) {
        console.log(`✅ [${i + 1}/${workflowsToActivate.length}] ${workflow.name}`);
        successCount++;
      } else {
        console.log(`⚠️  [${i + 1}/${workflowsToActivate.length}] ${workflow.name} - Status ${activateResp.status}`);
      }

      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.log(`❌ [${i + 1}/${workflowsToActivate.length}] ${workflow.name} - Error: ${err.message}`);
    }
  }

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                  RESULTADO DE ACTIVACIÓN                      ║
╚════════════════════════════════════════════════════════════════╝

✅ Workflows activados: ${successCount}/${workflowsToActivate.length}

${successCount > 0 ? `
SIGUIENTE PASO: Probando webhooks activados...
` : `
ERROR: No se pudieron activar los workflows
`}
`);

  // Probar webhooks después de activar
  if (successCount > 0) {
    console.log('🔍 Probando webhooks...\n');

    const webhooksToTest = [
      'website-extraction',
      'google-validation',
      'linkedin-discovery',
      'sunbiz-enrichment',
      'enrichment-fl',
      'enrichment-ca',
      'enrichment-tx',
      'enrichment-ny'
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
          console.log(`✅ /${webhook}`);
          workingWebhooks++;
        } else {
          console.log(`⚠️  /${webhook} - Status ${testResp.status}`);
        }
      } catch (err) {
        console.log(`⚠️  /${webhook} - Error`);
      }
      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`
✅ Webhooks funcionales: ${workingWebhooks}/${webhooksToTest.length}

${workingWebhooks > 0 ? `
✅ SISTEMA LISTO PARA ENRIQUECIMIENTO
   Ejecutar: node scripts/run-all-enrichment.js
` : `
⚠️  Webhooks aún no responden
   Esperar 30 segundos y reintentar
`}
`);
  }
}

main().catch(err => {
  console.error('Error fatal:', err.message);
  process.exit(1);
});
