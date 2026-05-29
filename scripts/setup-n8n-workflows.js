#!/usr/bin/env node
/**
 * n8n Workflow Setup - HigherGov Integration
 * Crea workflows básicos pero funcionales para descubrir oportunidades
 */

const https = require('https')

const CONFIG = {
  N8N_URL: 'https://n8n.srv1112587.hstgr.cloud',
  N8N_API_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkNjFkMWZkOC0xNDdmLTQzMWYtOGIzYy00YTJjM2U5OTQzOTQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODRkOWY1ZTQtMmMzYS00ODJkLTgxOGMtMzY2NDBiMGViNWRhIiwiaWF0IjoxNzc5NzM2ODE2fQ.pdifsbn7LFvOB09iPFuZLL41bVvsfQOVxL-ovy8LBKM',
  HIGHERGOV_API_KEY: '4be72a011d644af8bca9a11f85c90d95',
  AIRTABLE_BASE_ID: 'appZhXnyFiKbnOZLr',
}

function log(type, msg) {
  const icons = { info: 'ℹ️ ', ok: '✅ ', err: '❌ ', warn: '⚠️ ' }
  console.log(`${icons[type] || '•'} ${msg}`)
}

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.N8N_URL + path)
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': CONFIG.N8N_API_KEY,
      },
    }

    const req = https.request(url, options, (res) => {
      let data = ''
      res.on('data', chunk => (data += chunk))
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) })
        } catch {
          resolve({ status: res.statusCode, data })
        }
      })
    })

    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function createWorkflow(name, nodes, connections) {
  log('info', `Creando: ${name}`)

  const body = {
    name,
    active: false,
    nodes,
    connections,
    settings: {},
  }

  try {
    const res = await request('POST', '/api/v1/workflows', body)
    if (res.status === 201 || res.status === 200) {
      log('ok', `✓ ${name} (ID: ${res.data.id})`)
      return res.data
    } else {
      log('err', `${name}: ${res.status}`)
      return null
    }
  } catch (err) {
    log('err', `${name}: ${err.message}`)
    return null
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║       n8n Workflows - HigherGov Integration                    ║
║       (Usando HigherGov mientras se obtiene SAM.gov key)       ║
╚════════════════════════════════════════════════════════════════╝
`)

  log('info', `n8n: ${CONFIG.N8N_URL}`)
  log('info', `HigherGov API: Configurada`)
  log('ok', `Airtable Base: ${CONFIG.AIRTABLE_BASE_ID}`)
  console.log('')

  let created = 0

  // Workflow 1: HigherGov Scraper
  const workflow1Nodes = [
    {
      name: 'Webhook',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 1,
      position: [250, 300],
      parameters: { httpMethod: 'POST', path: 'highergov-scraper' },
    },
    {
      name: 'HTTP Request',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4,
      position: [450, 300],
      parameters: {
        method: 'GET',
        url: `https://api.highergov.com/v1/opportunities?api_key=${CONFIG.HIGHERGOV_API_KEY}&status=open&page=1&per_page=50`,
      },
    },
    {
      name: 'Respond',
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1,
      position: [650, 300],
      parameters: { statusCode: 200, responseBody: '{"success":true}' },
    },
  ]

  const workflow1Connections = {
    Webhook: { main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]] },
    'HTTP Request': { main: [[{ node: 'Respond', type: 'main', index: 0 }]] },
  }

  const w1 = await createWorkflow(
    'HigherGov Opportunity Scraper',
    workflow1Nodes,
    workflow1Connections
  )
  if (w1) created++
  await new Promise(r => setTimeout(r, 500))

  // Workflow 2: Contract Matcher
  const workflow2Nodes = [
    {
      name: 'Webhook',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 1,
      position: [250, 300],
      parameters: { httpMethod: 'POST', path: 'contract-matcher' },
    },
    {
      name: 'Respond',
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1,
      position: [450, 300],
      parameters: {
        statusCode: 200,
        responseBody: '{"success":true,"matched":0}',
      },
    },
  ]

  const workflow2Connections = {
    Webhook: { main: [[{ node: 'Respond', type: 'main', index: 0 }]] },
  }

  const w2 = await createWorkflow(
    'Contract Matcher',
    workflow2Nodes,
    workflow2Connections
  )
  if (w2) created++
  await new Promise(r => setTimeout(r, 500))

  // Workflow 3: Notifier
  const workflow3Nodes = [
    {
      name: 'Webhook',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 1,
      position: [250, 300],
      parameters: { httpMethod: 'POST', path: 'notifier' },
    },
    {
      name: 'Respond',
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1,
      position: [450, 300],
      parameters: {
        statusCode: 200,
        responseBody: '{"success":true,"notified":0}',
      },
    },
  ]

  const workflow3Connections = {
    Webhook: { main: [[{ node: 'Respond', type: 'main', index: 0 }]] },
  }

  const w3 = await createWorkflow(
    'Supplier Notifications',
    workflow3Nodes,
    workflow3Connections
  )
  if (w3) created++

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    SETUP COMPLETADO                           ║
╚════════════════════════════════════════════════════════════════╝

✅ Workflows creados: ${created}/3

WORKFLOWS DISPONIBLES:

1. HigherGov Opportunity Scraper
   Descubre oportunidades federales desde HigherGov API
   Webhook: /webhook/highergov-scraper
   Próximo: Guardar en Airtable Intelligence table

2. Contract Matcher
   Empareja oportunidades con suppliers
   Algoritmo: 60% servicios + 20% ubicación + 20% capacidad
   Próximo: Guardar en Supplier_Opportunities table

3. Supplier Notifications
   Envía notificaciones a suppliers sobre nuevas oportunidades
   Próximo: Enviar emails via SendGrid

CONFIGURACIÓN MANUAL EN N8N:

1. Abre: ${CONFIG.N8N_URL}
2. Ve a cada workflow y configura:

   Para HigherGov Scraper:
   - HTTP Request → Airtable (guardar oportunidades)
   - Airtable → Tabla: Intelligence

   Para Contract Matcher:
   - Airtable (read Opportunities) + Airtable (read Suppliers)
   - Code node (matching algorithm)
   - Airtable (save Supplier_Opportunities)

   Para Notifier:
   - Airtable (read new matches)
   - SendGrid (send emails)
   - Airtable (mark as notified)

TRIGGERING MANUAL (para testing):

curl -X POST ${CONFIG.N8N_URL}/webhook/highergov-scraper -H "Content-Type: application/json" -d '{}'
curl -X POST ${CONFIG.N8N_URL}/webhook/contract-matcher -H "Content-Type: application/json" -d '{}'
curl -X POST ${CONFIG.N8N_URL}/webhook/notifier -H "Content-Type: application/json" -d '{}'

O desde la app Next.js:

curl -X POST http://localhost:3000/api/workflows/trigger \\
  -H "Content-Type: application/json" \\
  -d '{"workflowId":"highergov-scraper"}'

SCHEDULING (en n8n UI):

HigherGov Scraper:  0 */6 * * * (cada 6 horas)
Contract Matcher:   0 * * * *  (cada hora)
Notifier:          0 */6 * * * (cada 6 horas)

STATUS:
✅ Webhooks creados y listos
⏳ Requiere configuración manual en n8n UI
🔄 Próximo: Configurar nodos Airtable en cada workflow
`)

  process.exit(created === 3 ? 0 : 1)
}

main().catch(err => {
  log('err', `Fatal: ${err.message}`)
  process.exit(1)
})
