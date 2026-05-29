#!/usr/bin/env node
/**
 * n8n Workflow Setup Script - Hostinger Automation
 * Crea los 4 workflows automáticamente usando la n8n API
 */

const http = require('http')
const https = require('https')

// Configuración
const N8N_URL = 'https://n8n.srv1112587.hstgr.cloud'
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkNjFkMWZkOC0xNDdmLTQzMWYtOGIzYy00YTJjM2U5OTQzOTQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODRkOWY1ZTQtMmMzYS00ODJkLTgxOGMtMzY2NDBiMGViNWRhIiwiaWF0IjoxNzc5NzM2ODE2fQ.pdifsbn7LFvOB09iPFuZLL41bVvsfQOVxL-ovy8LBKM'

// Estos datos el usuario debe proporcionar
const SAM_GOV_API_KEY = process.env.SAM_GOV_API_KEY || ''
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || ''
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN || ''

console.log(`
╔════════════════════════════════════════════════════════════════╗
║           n8n Workflow Setup - Hostinger Automation            ║
║                                                                ║
║  URL: ${N8N_URL}                        ║
╚════════════════════════════════════════════════════════════════╝
`)

// Validar que tenemos los datos necesarios
if (!SAM_GOV_API_KEY || !SENDGRID_API_KEY || !AIRTABLE_TOKEN) {
  console.error(`
❌ ERROR: Faltan API Keys

Necesito que proporciones:
1. SAM_GOV_API_KEY
2. SENDGRID_API_KEY
3. AIRTABLE_TOKEN

Opción 1 - Variables de entorno:
export SAM_GOV_API_KEY="tu_key"
export SENDGRID_API_KEY="tu_key"
export AIRTABLE_TOKEN="tu_token"
node scripts/setup-n8n-hostinger.js

Opción 2 - Parámetros:
node scripts/setup-n8n-hostinger.js SAM_GOV_KEY SENDGRID_KEY AIRTABLE_TOKEN

Opción 3 - Archivo .env:
SAM_GOV_API_KEY=tu_key
SENDGRID_API_KEY=tu_key
AIRTABLE_TOKEN=tu_token
`)
  process.exit(1)
}

// Función para hacer requests a n8n API
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(N8N_URL + path)
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': N8N_API_KEY,
      },
    }

    const protocol = url.protocol === 'https:' ? https : http
    const req = protocol.request(url, options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
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

    if (body) {
      req.write(JSON.stringify(body))
    }
    req.end()
  })
}

// Crear workflow
async function createWorkflow(name, nodes) {
  console.log(`\n📝 Creando workflow: ${name}`)

  const workflow = {
    name,
    nodes,
    connections: {},
  }

  try {
    const response = await makeRequest('POST', '/api/v1/workflows', workflow)
    if (response.status === 201 || response.status === 200) {
      console.log(`✅ Workflow creado: ${response.data.id}`)
      return response.data
    } else {
      console.log(`⚠️ Status: ${response.status}`)
      console.log(`Response:`, response.data)
      return null
    }
  } catch (err) {
    console.error(`❌ Error:`, err.message)
    return null
  }
}

// Workflow 1: SAM.gov Scraper
async function setupSamGovWorkflow() {
  const nodes = [
    {
      id: 'webhook',
      name: 'Webhook',
      type: 'n8n-nodes-base.webhook',
      position: [250, 300],
      parameters: {
        httpMethod: 'POST',
        path: 'sam-gov-scraper',
      },
    },
    {
      id: 'http',
      name: 'HTTP Request',
      type: 'n8n-nodes-base.httpRequest',
      position: [450, 300],
      parameters: {
        method: 'GET',
        url: `https://api.sam.gov/prod/opportunities/v1/search?api_key=${SAM_GOV_API_KEY}&limit=100`,
      },
    },
    {
      id: 'respond',
      name: 'Respond to Webhook',
      type: 'n8n-nodes-base.respondToWebhook',
      position: [650, 300],
      parameters: {
        statusCode: 200,
        responseBody: '{"success": true}',
      },
    },
  ]

  return await createWorkflow('SAM.gov Scraper', nodes)
}

// Workflow 2: USASpending Scraper
async function setupUSASpendingWorkflow() {
  const nodes = [
    {
      id: 'webhook',
      name: 'Webhook',
      type: 'n8n-nodes-base.webhook',
      position: [250, 300],
      parameters: {
        httpMethod: 'POST',
        path: 'usaspending-scraper',
      },
    },
    {
      id: 'http',
      name: 'HTTP Request',
      type: 'n8n-nodes-base.httpRequest',
      position: [450, 300],
      parameters: {
        method: 'GET',
        url: 'https://api.usaspending.gov/api/v2/search/spending_by_award/',
      },
    },
    {
      id: 'respond',
      name: 'Respond to Webhook',
      type: 'n8n-nodes-base.respondToWebhook',
      position: [650, 300],
      parameters: {
        statusCode: 200,
        responseBody: '{"success": true}',
      },
    },
  ]

  return await createWorkflow('USASpending Scraper', nodes)
}

// Workflow 3: Contract Matcher
async function setupContractMatcherWorkflow() {
  const nodes = [
    {
      id: 'webhook',
      name: 'Webhook',
      type: 'n8n-nodes-base.webhook',
      position: [250, 300],
      parameters: {
        httpMethod: 'POST',
        path: 'contract-matcher',
      },
    },
    {
      id: 'respond',
      name: 'Respond to Webhook',
      type: 'n8n-nodes-base.respondToWebhook',
      position: [450, 300],
      parameters: {
        statusCode: 200,
        responseBody: '{"success": true, "matched": 0}',
      },
    },
  ]

  return await createWorkflow('Contract Matcher', nodes)
}

// Workflow 4: Notifier
async function setupNotifierWorkflow() {
  const nodes = [
    {
      id: 'webhook',
      name: 'Webhook',
      type: 'n8n-nodes-base.webhook',
      position: [250, 300],
      parameters: {
        httpMethod: 'POST',
        path: 'notifier',
      },
    },
    {
      id: 'respond',
      name: 'Respond to Webhook',
      type: 'n8n-nodes-base.respondToWebhook',
      position: [450, 300],
      parameters: {
        statusCode: 200,
        responseBody: '{"success": true, "notified": 0}',
      },
    },
  ]

  return await createWorkflow('Supplier Notifications', nodes)
}

// Main execution
async function main() {
  console.log('\n🚀 Iniciando setup de workflows...\n')

  const workflows = []

  // Crear los 4 workflows
  workflows.push(await setupSamGovWorkflow())
  await new Promise(r => setTimeout(r, 1000))

  workflows.push(await setupUSASpendingWorkflow())
  await new Promise(r => setTimeout(r, 1000))

  workflows.push(await setupContractMatcherWorkflow())
  await new Promise(r => setTimeout(r, 1000))

  workflows.push(await setupNotifierWorkflow())

  // Resumen
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    ✅ SETUP COMPLETADO                        ║
╚════════════════════════════════════════════════════════════════╝

Workflows creados: ${workflows.filter(Boolean).length}/4

Próximos pasos:
1. Ve a: ${N8N_URL}
2. Configura los nodos de cada workflow
3. Agrega Airtable connection
4. Configura Cron scheduling
5. Activa los workflows

Airtable Base ID: appZhXnyFiKbnOZLr
`)

  const successCount = workflows.filter(Boolean).length
  process.exit(successCount === 4 ? 0 : 1)
}

main().catch(err => {
  console.error('❌ Error fatal:', err)
  process.exit(1)
})
