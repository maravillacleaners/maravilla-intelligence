#!/usr/bin/env node
/**
 * n8n Workflow Setup - HigherGov Integration
 * Configura los 4 workflows automáticamente usando HigherGov API
 *
 * Usa HigherGov en lugar de SAM.gov mientras se obtiene la key de SAM
 * HigherGov proporciona datos federales consolidados en tiempo real
 */

const https = require('https')
const http = require('http')

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const CONFIG = {
  N8N_URL: 'https://n8n.srv1112587.hstgr.cloud',
  N8N_API_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkNjFkMWZkOC0xNDdmLTQzMWYtOGIzYy00YTJjM2U5OTQzOTQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODRkOWY1ZTQtMmMzYS00ODJkLTgxOGMtMzY2NDBiMGViNWRhIiwiaWF0IjoxNzc5NzM2ODE2fQ.pdifsbn7LFvOB09iPFuZLL41bVvsfQOVxL-ovy8LBKM',

  // HigherGov API
  HIGHERGOV_API_KEY: process.env.HIGHERGOV_API_KEY || '4be72a011d644af8bca9a11f85c90d95',

  // Airtable
  AIRTABLE_TOKEN: process.env.AIRTABLE_TOKEN || 'patJpi4GUzNfnQhuK.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92',
  AIRTABLE_BASE_ID: 'appZhXnyFiKbnOZLr',

  // Email Service
  EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'sendgrid',
  EMAIL_API_KEY: process.env.EMAIL_API_KEY || '',
}

// ============================================================================
// FUNCIONES UTILITARIAS
// ============================================================================

function log(type, message) {
  const icons = {
    info: 'ℹ️ ',
    success: '✅ ',
    error: '❌ ',
    warning: '⚠️ ',
    arrow: '➜ ',
  }
  console.log(`${icons[type] || '•'} ${message}`)
}

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.N8N_URL + path)
    const protocol = url.protocol === 'https:' ? https : http

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': CONFIG.N8N_API_KEY,
      },
    }

    const req = protocol.request(url, options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : null,
          })
        } catch (err) {
          resolve({
            status: res.statusCode,
            data,
          })
        }
      })
    })

    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

// ============================================================================
// CREAR WORKFLOWS EN N8N
// ============================================================================

/**
 * Workflow 1: HigherGov Opportunity Scraper
 * Descubre oportunidades federales usando HigherGov API
 */
async function createHigherGovScraperWorkflow() {
  log('info', 'Creando workflow: HigherGov Opportunity Scraper')

  const workflow = {
    name: 'HigherGov Opportunity Scraper',
    active: true,
    nodes: [
      {
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [250, 300],
        parameters: {
          httpMethod: 'POST',
          path: 'highergov-scraper',
        },
      },
      {
        name: 'HigherGov HTTP Request',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4,
        position: [450, 300],
        parameters: {
          method: 'GET',
          url: `https://api.highergov.com/v1/opportunities?api_key=${CONFIG.HIGHERGOV_API_KEY}&status=open&page=1&per_page=100`,
          responseFormat: 'json',
        },
      },
      {
        name: 'Parse Opportunities',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [650, 300],
        parameters: {
          jsCode: `
// Transformar respuesta de HigherGov al formato esperado
const items = $input.all();
const opportunities = [];

if (items[0].json.opportunities) {
  items[0].json.opportunities.forEach(opp => {
    opportunities.push({
      title: opp.title || opp.name,
      agency: opp.agency || opp.department,
      record_type: 'opportunity',
      source: 'highergov',
      deadline: opp.deadline,
      estimated_value: opp.estimated_value || opp.budget,
      url: opp.url || opp.link,
      description: opp.description || opp.summary,
      naics_codes: opp.naics_codes || [],
      set_asides: opp.set_asides || [],
      place_of_performance: opp.place_of_performance,
      date_posted: opp.posted_date || new Date().toISOString(),
    });
  });
}

return opportunities.map(opp => ({ json: opp }));
          `,
        },
      },
      {
        name: 'Save to Airtable',
        type: 'n8n-nodes-base.airtable',
        typeVersion: 2,
        position: [850, 300],
        parameters: {
          operation: 'create',
          baseId: CONFIG.AIRTABLE_BASE_ID,
          table: 'Intelligence',
          typecastFieldMappings: {
            title: 'fldTitle',
            agency: 'fldAgency',
            record_type: 'fldType',
            source: 'fldSource',
            deadline: 'fldDeadline',
            estimated_value: 'fldValue',
            url: 'fldURL',
            description: 'fldDescription',
          },
        },
      },
      {
        name: 'Respond',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1,
        position: [1050, 300],
        parameters: {
          statusCode: 200,
          responseBody: '{"success": true, "message": "Opportunities saved to Airtable"}',
        },
      },
    ],
    connections: {
      Webhook: {
        main: [
          [
            {
              node: 'HigherGov HTTP Request',
              type: 'main',
              index: 0,
            },
          ],
        ],
      },
      'HigherGov HTTP Request': {
        main: [
          [
            {
              node: 'Parse Opportunities',
              type: 'main',
              index: 0,
            },
          ],
        ],
      },
      'Parse Opportunities': {
        main: [
          [
            {
              node: 'Save to Airtable',
              type: 'main',
              index: 0,
            },
          ],
        ],
      },
      'Save to Airtable': {
        main: [
          [
            {
              node: 'Respond',
              type: 'main',
              index: 0,
            },
          ],
        ],
      },
    },
  }

  try {
    const response = await makeRequest('POST', '/api/v1/workflows', workflow)

    if (response.status === 201 || response.status === 200) {
      log('success', `Workflow creado: ${response.data.name} (ID: ${response.data.id})`)
      return response.data
    } else {
      log('error', `Error: ${response.status}`)
      log('warning', JSON.stringify(response.data))
      return null
    }
  } catch (err) {
    log('error', `${err.message}`)
    return null
  }
}

/**
 * Workflow 2: Contract Matcher
 * Empareja oportunidades con suppliers basado en criterios
 */
async function createContractMatcherWorkflow() {
  log('info', 'Creando workflow: Contract Matcher')

  const workflow = {
    name: 'Contract Matcher',
    active: true,
    nodes: [
      {
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [250, 300],
        parameters: {
          httpMethod: 'POST',
          path: 'contract-matcher',
        },
      },
      {
        name: 'Fetch Opportunities',
        type: 'n8n-nodes-base.airtable',
        typeVersion: 2,
        position: [450, 300],
        parameters: {
          operation: 'read',
          baseId: CONFIG.AIRTABLE_BASE_ID,
          table: 'Intelligence',
          options: {
            filterByFormula: "NOT({matched} = TRUE())",
          },
        },
      },
      {
        name: 'Fetch Suppliers',
        type: 'n8n-nodes-base.airtable',
        typeVersion: 2,
        position: [450, 450],
        parameters: {
          operation: 'read',
          baseId: CONFIG.AIRTABLE_BASE_ID,
          table: 'Suppliers',
          options: {
            filterByFormula: "{registration_status} = 'Approved'",
          },
        },
      },
      {
        name: 'Match Algorithm',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [650, 375],
        parameters: {
          jsCode: `
// Algoritmo de matching de contratos
// Score = (60% servicios) + (20% ubicación) + (20% capacidad)

const opportunities = $input.getInputData();
const suppliers = $input.getInputData(1);

const matches = [];

opportunities.forEach(opp => {
  const oppData = opp.json;

  suppliers.forEach(sup => {
    const supData = sup.json;

    // 60% - Service Match
    let serviceScore = 0;
    if (oppData.naics_codes && supData.naics_codes) {
      const matchingCodes = oppData.naics_codes.filter(code =>
        supData.naics_codes.includes(code)
      ).length;
      serviceScore = (matchingCodes / oppData.naics_codes.length) * 100;
    }

    // 20% - Location Match
    let locationScore = 0;
    if (oppData.place_of_performance && supData.preferred_counties) {
      locationScore = supData.preferred_counties.includes(
        oppData.place_of_performance
      ) ? 100 : 50;
    }

    // 20% - Capacity Match
    let capacityScore = 0;
    if (supData.estimated_annual_capacity_usd && oppData.estimated_value) {
      const ratio = oppData.estimated_value / supData.estimated_annual_capacity_usd;
      capacityScore = ratio <= 0.5 ? 100 : ratio <= 1 ? 75 : 50;
    }

    // Calculate weighted score
    const totalScore = Math.round(
      (serviceScore * 0.6) +
      (locationScore * 0.2) +
      (capacityScore * 0.2)
    );

    // Only include if score >= 60
    if (totalScore >= 60) {
      matches.push({
        supplier_id: supData.supplier_id,
        opportunity_id: oppData.id,
        opportunity_name: oppData.title,
        agency: oppData.agency,
        contract_value_usd: oppData.estimated_value,
        deadline: oppData.deadline,
        match_score: totalScore,
        match_reason: \`Services: \${Math.round(serviceScore)}%, Location: \${Math.round(locationScore)}%, Capacity: \${Math.round(capacityScore)}%\`,
        status: 'Available',
        date_matched: new Date().toISOString(),
      });
    }
  });
});

return matches.map(m => ({ json: m }));
          `,
        },
      },
      {
        name: 'Save Matches',
        type: 'n8n-nodes-base.airtable',
        typeVersion: 2,
        position: [850, 375],
        parameters: {
          operation: 'create',
          baseId: CONFIG.AIRTABLE_BASE_ID,
          table: 'Supplier_Opportunities',
        },
      },
      {
        name: 'Respond',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1,
        position: [1050, 375],
        parameters: {
          statusCode: 200,
          responseBody: '{"success": true, "message": "Matching completed"}',
        },
      },
    ],
    connections: {
      Webhook: {
        main: [
          [
            {
              node: 'Fetch Opportunities',
              type: 'main',
              index: 0,
            },
            {
              node: 'Fetch Suppliers',
              type: 'main',
              index: 0,
            },
          ],
        ],
      },
      'Fetch Opportunities': {
        main: [
          [
            {
              node: 'Match Algorithm',
              type: 'main',
              index: 0,
            },
          ],
        ],
      },
      'Fetch Suppliers': {
        main: [
          [
            {
              node: 'Match Algorithm',
              type: 'main',
              index: 1,
            },
          ],
        ],
      },
      'Match Algorithm': {
        main: [
          [
            {
              node: 'Save Matches',
              type: 'main',
              index: 0,
            },
          ],
        ],
      },
      'Save Matches': {
        main: [
          [
            {
              node: 'Respond',
              type: 'main',
              index: 0,
            },
          ],
        ],
      },
    },
  }

  try {
    const response = await makeRequest('POST', '/api/v1/workflows', workflow)

    if (response.status === 201 || response.status === 200) {
      log('success', `Workflow creado: ${response.data.name} (ID: ${response.data.id})`)
      return response.data
    } else {
      log('error', `Error: ${response.status}`)
      return null
    }
  } catch (err) {
    log('error', `${err.message}`)
    return null
  }
}

/**
 * Workflow 3: Supplier Notifications
 * Envía notificaciones a suppliers sobre nuevas oportunidades
 */
async function createNotifierWorkflow() {
  log('info', 'Creando workflow: Supplier Notifications')

  const workflow = {
    name: 'Supplier Notifications',
    active: true,
    nodes: [
      {
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [250, 300],
        parameters: {
          httpMethod: 'POST',
          path: 'notifier',
        },
      },
      {
        name: 'Fetch New Matches',
        type: 'n8n-nodes-base.airtable',
        typeVersion: 2,
        position: [450, 300],
        parameters: {
          operation: 'read',
          baseId: CONFIG.AIRTABLE_BASE_ID,
          table: 'Supplier_Opportunities',
          options: {
            filterByFormula: "{notified} != TRUE()",
            maxRecords: 100,
          },
        },
      },
      {
        name: 'Group by Supplier',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [650, 300],
        parameters: {
          jsCode: `
// Agrupar oportunidades por supplier para enviar email único
const items = $input.all();
const grouped = {};

items.forEach(item => {
  const supplierId = item.json.supplier_id;
  if (!grouped[supplierId]) {
    grouped[supplierId] = {
      supplier_id: supplierId,
      opportunities: [],
    };
  }
  grouped[supplierId].opportunities.push({
    name: item.json.opportunity_name,
    agency: item.json.agency,
    value: item.json.contract_value_usd,
    deadline: item.json.deadline,
    match_score: item.json.match_score,
  });
});

return Object.values(grouped).map(g => ({ json: g }));
          `,
        },
      },
      {
        name: 'Send Email Notification',
        type: 'n8n-nodes-base.sendGrid',
        typeVersion: 1,
        position: [850, 300],
        parameters: {
          fromEmail: 'opportunities@maravilla.example.com',
          toEmail: '={{$json.supplier_email}}',
          subject: 'New Opportunities Matching Your Profile',
          htmlBody: 'We found new federal opportunities matching your business profile.',
        },
      },
      {
        name: 'Mark as Notified',
        type: 'n8n-nodes-base.airtable',
        typeVersion: 2,
        position: [1050, 300],
        parameters: {
          operation: 'update',
          baseId: CONFIG.AIRTABLE_BASE_ID,
          table: 'Supplier_Opportunities',
          idFieldName: 'id',
          updateFields: {
            notified: true,
            notification_date: '={{now()}}',
          },
        },
      },
      {
        name: 'Respond',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1,
        position: [1250, 300],
        parameters: {
          statusCode: 200,
          responseBody: '{"success": true, "message": "Notifications sent"}',
        },
      },
    ],
    connections: {
      Webhook: {
        main: [
          [
            {
              node: 'Fetch New Matches',
              type: 'main',
              index: 0,
            },
          ],
        ],
      },
      'Fetch New Matches': {
        main: [
          [
            {
              node: 'Group by Supplier',
              type: 'main',
              index: 0,
            },
          ],
        ],
      },
      'Group by Supplier': {
        main: [
          [
            {
              node: 'Send Email Notification',
              type: 'main',
              index: 0,
            },
          ],
        ],
      },
      'Send Email Notification': {
        main: [
          [
            {
              node: 'Mark as Notified',
              type: 'main',
              index: 0,
            },
          ],
        ],
      },
      'Mark as Notified': {
        main: [
          [
            {
              node: 'Respond',
              type: 'main',
              index: 0,
            },
          ],
        ],
      },
    },
  }

  try {
    const response = await makeRequest('POST', '/api/v1/workflows', workflow)

    if (response.status === 201 || response.status === 200) {
      log('success', `Workflow creado: ${response.data.name} (ID: ${response.data.id})`)
      return response.data
    } else {
      log('error', `Error: ${response.status}`)
      return null
    }
  } catch (err) {
    log('error', `${err.message}`)
    return null
  }
}

// ============================================================================
// VALIDAR CONFIGURACIÓN
// ============================================================================

function validateConfig() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║     n8n Workflow Setup - HigherGov API Integration             ║
╚════════════════════════════════════════════════════════════════╝
`)

  log('info', `n8n URL: ${CONFIG.N8N_URL}`)
  log('info', `HigherGov API: Configurada`)
  log('info', `Airtable Base: ${CONFIG.AIRTABLE_BASE_ID}`)

  // Validar HigherGov
  if (!CONFIG.HIGHERGOV_API_KEY) {
    log('error', 'HIGHERGOV_API_KEY no configurado')
    return false
  } else {
    log('success', 'HIGHERGOV_API_KEY ✓')
  }

  // Validar Airtable
  if (!CONFIG.AIRTABLE_TOKEN) {
    log('error', 'AIRTABLE_TOKEN no configurado')
    return false
  } else {
    log('success', 'AIRTABLE_TOKEN ✓')
  }

  console.log('')
  return true
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  if (!validateConfig()) {
    log('error', 'Configuración incompleta')
    process.exit(1)
  }

  log('info', 'Iniciando creación de workflows...\n')

  const workflows = []
  let created = 0

  // Crear workflows
  const highergov = await createHigherGovScraperWorkflow()
  workflows.push(highergov)
  if (highergov) created++
  await new Promise(r => setTimeout(r, 1000))

  const matcher = await createContractMatcherWorkflow()
  workflows.push(matcher)
  if (matcher) created++
  await new Promise(r => setTimeout(r, 1000))

  const notifier = await createNotifierWorkflow()
  workflows.push(notifier)
  if (notifier) created++

  // Resumen
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    SETUP COMPLETADO                           ║
╚════════════════════════════════════════════════════════════════╝

✅ Workflows creados: ${created}/3

Workflows Configurados:
1. HigherGov Opportunity Scraper
   - Descubre oportunidades federales desde HigherGov
   - Guarda en tabla Intelligence de Airtable
   - Ejecutar: curl -X POST http://localhost:3000/api/workflows/trigger \\
       -H "Content-Type: application/json" \\
       -d '{"workflowId":"highergov-scraper"}'

2. Contract Matcher
   - Empareja oportunidades con suppliers
   - Algoritmo: 60% servicios + 20% ubicación + 20% capacidad
   - Threshold mínimo: 60%
   - Guarda en tabla Supplier_Opportunities

3. Supplier Notifications
   - Envía notificaciones por email a suppliers
   - Agrupa oportunidades por supplier
   - Marca como enviadas en Airtable

Próximos pasos:

1️⃣  Abre tu n8n: ${CONFIG.N8N_URL}

2️⃣  Configura Scheduling (Cron):
   • HigherGov Scraper: 0 */6 * * * (cada 6 horas)
   • Contract Matcher: 0 * * * * (cada hora)
   • Notifier: 0 */6 * * * (cada 6 horas)

3️⃣  Configura SendGrid (si quieres emails):
   • SENDGRID_API_KEY en .env
   • Sender email verificado

4️⃣  Prueba los workflows manualmente

📝 Configuración actual en .env:
   N8N_URL=${CONFIG.N8N_URL}
   HIGHERGOV_API_KEY=✓ Configurada
   AIRTABLE_TOKEN=✓ Configurada
   AIRTABLE_BASE_ID=${CONFIG.AIRTABLE_BASE_ID}
   EMAIL_SERVICE=${CONFIG.EMAIL_SERVICE}
`)

  process.exit(created === 3 ? 0 : 1)
}

// ============================================================================
// EJECUTAR
// ============================================================================

main().catch(err => {
  log('error', `Fatal: ${err.message}`)
  process.exit(1)
})
