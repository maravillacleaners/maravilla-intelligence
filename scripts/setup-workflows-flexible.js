#!/usr/bin/env node
/**
 * n8n Workflow Setup - Flexible Email Service
 * Funciona con cualquier email service (SendGrid, SmartLead, Mailgun, etc)
 *
 * Uso:
 * node scripts/setup-workflows-flexible.js
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const CONFIG = {
  N8N_URL: 'https://n8n.srv1112587.hstgr.cloud',
  N8N_API_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkNjFkMWZkOC0xNDdmLTQzMWYtOGIzYy00YTJjM2U5OTQzOTQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODRkOWY1ZTQtMmMzYS00ODJkLTgxOGMtMzY2NDBiMGViNWRhIiwiaWF0IjoxNzc5NzM2ODE2fQ.pdifsbn7LFvOB09iPFuZLL41bVvsfQOVxL-ovy8LBKM',

  // APIs necesarias
  SAM_GOV_API_KEY: process.env.SAM_GOV_API_KEY || '',

  // Email Service (configurable)
  EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'smartlead', // 'smartlead', 'mailgun', 'sendgrid', etc
  EMAIL_API_KEY: process.env.EMAIL_API_KEY || '',

  // Airtable
  AIRTABLE_TOKEN: process.env.AIRTABLE_TOKEN || 'patJpi4GUzNfnQhuK.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92',
  AIRTABLE_BASE_ID: 'appZhXnyFiKbnOZLr',
}

// ============================================================================
// WORKFLOW DEFINITIONS
// ============================================================================

const WORKFLOWS = {
  'SAM.gov Scraper': {
    path: 'sam-gov-scraper',
    description: 'Descubre oportunidades federales de SAM.gov',
    schedule: '0 */6 * * *', // Cada 6 horas
  },
  'USASpending Scraper': {
    path: 'usaspending-scraper',
    description: 'Obtiene datos de gastos de USASpending',
    schedule: '0 2 * * *', // Diario 2am
  },
  'Contract Matcher': {
    path: 'contract-matcher',
    description: 'Empareja contratos con suppliers',
    schedule: '0 * * * *', // Cada hora
  },
  'Notifier': {
    path: 'notifier',
    description: 'Envía notificaciones a suppliers',
    schedule: '0 */6 * * *', // Cada 6 horas
  },
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

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': CONFIG.N8N_API_KEY,
      },
    }

    const req = https.request(url, options, (res) => {
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
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

// ============================================================================
// CREAR WEBHOOKS EN N8N
// ============================================================================

async function createWebhook(name, path) {
  log('info', `Creando webhook: ${name}`)

  const webhook = {
    name: `${name} Webhook`,
    path,
    method: 'POST',
    active: true,
  }

  try {
    const response = await makeRequest('POST', '/api/v1/webhooks', webhook)

    if (response.status === 201 || response.status === 200) {
      log('success', `Webhook creado: ${name}`)
      return response.data
    } else {
      log('error', `Error creando webhook: ${response.status}`)
      return null
    }
  } catch (err) {
    log('error', `${err.message}`)
    return null
  }
}

async function createWorkflow(name, config) {
  log('info', `Creando workflow: ${name}`)

  const workflow = {
    name,
    active: true,
    nodes: [
      {
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [250, 300],
        parameters: {
          httpMethod: 'POST',
          path: config.path,
        },
      },
      {
        name: 'Respond',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1,
        position: [500, 300],
        parameters: {
          statusCode: 200,
          responseBody: '{"success": true}',
        },
      },
    ],
    connections: {},
  }

  try {
    const response = await makeRequest('POST', '/api/v1/workflows', workflow)

    if (response.status === 201 || response.status === 200) {
      log('success', `Workflow creado: ${name}`)
      return response.data
    } else {
      log('warning', `Status: ${response.status}`)
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
║     n8n Workflow Setup - Flexible Email Service Support        ║
╚════════════════════════════════════════════════════════════════╝
`)

  log('info', `n8n URL: ${CONFIG.N8N_URL}`)
  log('info', `Email Service: ${CONFIG.EMAIL_SERVICE}`)

  // Validar SAM.gov
  if (!CONFIG.SAM_GOV_API_KEY) {
    log('warning', 'SAM_GOV_API_KEY no configurado')
    log('arrow', 'Export: export SAM_GOV_API_KEY="tu_key"')
    return false
  } else {
    log('success', 'SAM_GOV_API_KEY ✓')
  }

  // Validar Airtable
  if (!CONFIG.AIRTABLE_TOKEN) {
    log('warning', 'AIRTABLE_TOKEN no configurado')
    return false
  } else {
    log('success', 'AIRTABLE_TOKEN ✓')
  }

  // Validar Email Service (opcional por ahora)
  if (!CONFIG.EMAIL_API_KEY) {
    log('warning', 'EMAIL_API_KEY no configurado (opcional por ahora)')
    log('arrow', 'Luego: export EMAIL_API_KEY="tu_key"')
  } else {
    log('success', `${CONFIG.EMAIL_SERVICE} API Key ✓`)
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

  const results = {}
  let created = 0

  for (const [name, config] of Object.entries(WORKFLOWS)) {
    const result = await createWorkflow(name, config)
    results[name] = result
    if (result) created++

    // Esperar entre requests
    await new Promise(r => setTimeout(r, 1000))
  }

  // Resumen
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    SETUP COMPLETADO                           ║
╚════════════════════════════════════════════════════════════════╝

✅ Workflows creados: ${created}/4

Próximos pasos:

1️⃣  Abre tu n8n: ${CONFIG.N8N_URL}

2️⃣  Para cada workflow, configura los nodos:
   • Webhook (ya está)
   • HTTP Request (SAM.gov o USASpending API)
   • Airtable (conexión y guardado)
   • Email Service (cuando tengas la key)
   • Respond to Webhook

3️⃣  Agrega Scheduling (Cron):
   • SAM.gov: 0 */6 * * *
   • USASpending: 0 2 * * *
   • Matcher: 0 * * * *
   • Notifier: 0 */6 * * *

4️⃣  Activa los workflows

📝 Configuración actual en .env:
   N8N_WEBHOOK_URL=https://n8n.srv1112587.hstgr.cloud
   SAM_GOV_API_KEY=${CONFIG.SAM_GOV_API_KEY ? '✓' : '❌ Falta'}
   EMAIL_SERVICE=${CONFIG.EMAIL_SERVICE}
   EMAIL_API_KEY=${CONFIG.EMAIL_API_KEY ? '✓' : '⏳ Pendiente'}
   AIRTABLE_TOKEN=✓
`)

  // Actualizar .env si es necesario
  const envPath = path.join(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf-8')

    // Actualizar N8N_WEBHOOK_URL
    if (!envContent.includes('N8N_WEBHOOK_URL')) {
      envContent += `\nN8N_WEBHOOK_URL=${CONFIG.N8N_URL}\n`
      fs.writeFileSync(envPath, envContent)
      log('success', '.env actualizado con N8N_WEBHOOK_URL')
    }
  }

  process.exit(created === 4 ? 0 : 1)
}

// ============================================================================
// EJECUTAR
// ============================================================================

main().catch(err => {
  log('error', `Fatal: ${err.message}`)
  process.exit(1)
})
