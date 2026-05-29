#!/usr/bin/env node
/**
 * Test n8n Connection & Configuration
 * Diagnostica conexión a n8n y verifica credenciales
 */

const https = require('https')

const CONFIG = {
  N8N_URL: 'https://n8n.srv1112587.hstgr.cloud',
  N8N_API_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkNjFkMWZkOC0xNDdmLTQzMWYtOGIzYy00YTJjM2U5OTQzOTQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODRkOWY1ZTQtMmMzYS00ODJkLTgxOGMtMzY2NDBiMGViNWRhIiwiaWF0IjoxNzc5NzM2ODE2fQ.pdifsbn7LFvOB09iPFuZLL41bVvsfQOVxL-ovy8LBKM',
}

function log(type, msg) {
  const icons = { info: 'ℹ️ ', ok: '✅ ', err: '❌ ', warn: '⚠️ ' }
  console.log(`${icons[type] || '•'} ${msg}`)
}

function request(method, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.N8N_URL + path)
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }

    const req = https.request(url, options, (res) => {
      let data = ''
      res.on('data', chunk => (data += chunk))
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers })
        } catch {
          resolve({ status: res.statusCode, data, headers: res.headers })
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           n8n Connection & Configuration Test                  ║
╚════════════════════════════════════════════════════════════════╝
`)

  log('info', `Testing: ${CONFIG.N8N_URL}`)
  console.log('')

  try {
    // Test 1: Basic connectivity
    log('info', 'Test 1: Basic Connectivity...')
    try {
      const healthRes = await request('GET', '/api/v1/health')
      if (healthRes.status === 200 || healthRes.status === 400) {
        log('ok', 'n8n server is reachable')
      } else {
        log('warn', `Unexpected status: ${healthRes.status}`)
      }
    } catch (err) {
      log('err', `Connection failed: ${err.message}`)
      throw err
    }
    console.log('')

    // Test 2: API Key validity
    log('info', 'Test 2: API Key Validation...')
    try {
      const meRes = await request('GET', '/api/v1/me', {
        'X-N8N-API-KEY': CONFIG.N8N_API_KEY,
      })
      if (meRes.status === 200) {
        log('ok', 'API Key is valid')
        if (meRes.data?.user) {
          log('info', `  User: ${meRes.data.user.email || 'Admin'}`)
        }
      } else if (meRes.status === 401) {
        log('err', 'API Key is invalid or expired')
      } else {
        log('warn', `Unexpected status: ${meRes.status}`)
      }
    } catch (err) {
      log('warn', `Could not validate API key: ${err.message}`)
    }
    console.log('')

    // Test 3: List existing workflows
    log('info', 'Test 3: Listing Existing Workflows...')
    try {
      const wfRes = await request('GET', '/api/v1/workflows', {
        'X-N8N-API-KEY': CONFIG.N8N_API_KEY,
      })
      if (wfRes.status === 200 && Array.isArray(wfRes.data)) {
        log('ok', `Found ${wfRes.data.length} workflows`)
        wfRes.data.slice(0, 5).forEach(wf => {
          const status = wf.active ? '🟢' : '🔴'
          log('info', `  ${status} ${wf.name} (ID: ${wf.id})`)
        })
        if (wfRes.data.length > 5) {
          log('info', `  ... and ${wfRes.data.length - 5} more`)
        }
      } else if (wfRes.status === 401) {
        log('err', 'Unauthorized - API key invalid')
      } else {
        log('warn', `Status: ${wfRes.status}`)
      }
    } catch (err) {
      log('warn', `Could not list workflows: ${err.message}`)
    }
    console.log('')

    // Test 4: GET a single workflow (if any exist)
    log('info', 'Test 4: Workflow Details...')
    try {
      const wfRes = await request('GET', '/api/v1/workflows', {
        'X-N8N-API-KEY': CONFIG.N8N_API_KEY,
      })
      if (wfRes.data && wfRes.data.length > 0) {
        const firstWf = wfRes.data[0]
        log('ok', `Fetching details for: ${firstWf.name}`)

        try {
          const detailRes = await request('GET', `/api/v1/workflows/${firstWf.id}`, {
            'X-N8N-API-KEY': CONFIG.N8N_API_KEY,
          })
          if (detailRes.status === 200) {
            log('ok', `  Nodes: ${detailRes.data.nodes?.length || 0}`)
            log('ok', `  Status: ${detailRes.data.active ? 'Active' : 'Inactive'}`)
          } else {
            log('warn', `  Status: ${detailRes.status}`)
          }
        } catch (err) {
          log('warn', `  Could not fetch details: ${err.message}`)
        }
      }
    } catch (err) {
      log('warn', `Could not test workflow details: ${err.message}`)
    }
    console.log('')

    // Test 5: Test webhook creation
    log('info', 'Test 5: Webhook Creation Test...')
    try {
      const testBody = {
        name: 'Test Webhook Workflow',
        active: false,
        nodes: [
          {
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [250, 300],
            parameters: {
              httpMethod: 'POST',
              path: 'test-webhook',
            },
          },
          {
            name: 'Respond',
            type: 'n8n-nodes-base.respondToWebhook',
            typeVersion: 1,
            position: [450, 300],
            parameters: {
              statusCode: 200,
              responseBody: '{"test": true}',
            },
          },
        ],
        connections: {
          Webhook: {
            main: [[{ node: 'Respond', type: 'main', index: 0 }]],
          },
        },
        settings: {},
      }

      const url = new URL(CONFIG.N8N_URL + '/api/v1/workflows')
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': CONFIG.N8N_API_KEY,
        },
      }

      const createRes = await new Promise((resolve, reject) => {
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
        req.write(JSON.stringify(testBody))
        req.end()
      })

      if (createRes.status === 201 || createRes.status === 200) {
        log('ok', `Workflow created successfully (ID: ${createRes.data.id})`)

        // Try to delete it
        try {
          const deleteRes = await request('DELETE', `/api/v1/workflows/${createRes.data.id}`, {
            'X-N8N-API-KEY': CONFIG.N8N_API_KEY,
          })
          log('ok', `Cleanup: Workflow deleted`)
        } catch {
          log('warn', `Could not delete test workflow (manual cleanup needed)`)
        }
      } else if (createRes.status === 400) {
        log('err', `Workflow creation failed: ${createRes.data.message || 'Invalid request'}`)
      } else if (createRes.status === 401) {
        log('err', `Unauthorized: API key may be invalid`)
      } else {
        log('warn', `Status: ${createRes.status}`)
      }
    } catch (err) {
      log('warn', `Webhook test failed: ${err.message}`)
    }
    console.log('')

    // Summary
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    SUMMARY & NEXT STEPS                       ║
╚════════════════════════════════════════════════════════════════╝

n8n Configuration:
  URL: ${CONFIG.N8N_URL}
  API Status: Check tests above

To manually create workflows in n8n:

1. Open: ${CONFIG.N8N_URL}
2. Click "+ New Workflow"
3. Add nodes:
   - Webhook (Path: highergov-scraper)
   - HTTP Request (URL: HigherGov API)
   - Airtable (Save to Intelligence table)
   - Respond to Webhook

4. Configure Scheduling:
   - Click Trigger button
   - Change to "Cron"
   - Enter: 0 */6 * * *

5. Activate the workflow

See: N8N_HIGHERGOV_SETUP_GUIDE.md for detailed instructions

API Key:
${CONFIG.N8N_API_KEY.substring(0, 50)}...

HigherGov Key:
4be72a011d644af8bca9a11f85c90d95

Airtable Base:
appZhXnyFiKbnOZLr
`)
  } catch (err) {
    console.error('\n❌ Fatal error:', err.message)
    process.exit(1)
  }
}

main()
