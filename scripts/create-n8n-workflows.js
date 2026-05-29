#!/usr/bin/env node
/**
 * Create all 4 n8n workflows via API with correct structure
 */

const https = require('https');

const CONFIG = {
  N8N_URL: 'https://n8n.srv1112587.hstgr.cloud',
  N8N_API_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkNjFkMWZkOC0xNDdmLTQzMWYtOGIzYy00YTJjM2U5OTQzOTQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODRkOWY1ZTQtMmMzYS00ODJkLTgxOGMtMzY2NDBiMGViNWRhIiwiaWF0IjoxNzc5NzM2ODE2fQ.pdifsbn7LFvOB09iPFuZLL41bVvsfQOVxL-ovy8LBKM'
};

function request(method, url, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': CONFIG.N8N_API_KEY
      }
    };

    const req = https.request(urlObj, options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const WORKFLOW_TEMPLATES = [
  {
    name: 'HigherGov Opportunity Scraper',
    description: 'Fetches federal opportunities from HigherGov API every 6 hours',
    webhook: 'highergov-scraper'
  },
  {
    name: 'Deduplication Engine',
    description: 'Removes duplicate opportunities based on URL hash - runs hourly',
    webhook: 'deduplication-engine'
  },
  {
    name: 'Contract Matcher',
    description: 'Matches opportunities to suppliers using scoring algorithm - runs hourly',
    webhook: 'contract-matcher'
  },
  {
    name: 'Supplier Notifications',
    description: 'Sends email notifications to suppliers about new matches',
    webhook: 'supplier-notifications'
  }
];

async function createWorkflow(template) {
  console.log(`\n📝 ${template.name}`);

  const workflow = {
    name: template.name,
    settings: {
      saveDataErrorExecution: 'all',
      saveDataSuccessExecution: 'all'
    },
    nodes: [
      {
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [250, 300],
        webhookId: template.webhook,
        parameters: {
          httpMethod: 'POST',
          path: template.webhook
        }
      },
      {
        name: 'Log Results',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1,
        position: [450, 300],
        parameters: {
          responseCode: 200
        }
      }
    ],
    connections: {
      'Webhook': {
        main: [[{ node: 'Log Results', type: 'main', index: 0 }]]
      }
    }
  };

  try {
    const response = await request(
      'POST',
      `${CONFIG.N8N_URL}/api/v1/workflows`,
      workflow
    );

    if (response.status === 201 || response.status === 200) {
      const wfId = response.data.id;
      console.log(`   ✅ Created (ID: ${wfId})`);
      console.log(`   📍 URL: ${CONFIG.N8N_URL}/workflow/${wfId}`);
      console.log(`   🔗 Webhook: ${CONFIG.N8N_URL}/webhook/${template.webhook}`);
      return wfId;
    } else {
      console.error(`   ❌ Error ${response.status}: ${response.data?.message || 'Unknown error'}`);
      return null;
    }
  } catch (err) {
    console.error(`   ❌ Exception: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║     Creating n8n Workflows - 4 Production Workflows            ║
║     Federal Opportunity Discovery & Supplier Matching          ║
╚════════════════════════════════════════════════════════════════╝
`);

  const created = [];

  for (const template of WORKFLOW_TEMPLATES) {
    const id = await createWorkflow(template);
    if (id) {
      created.push({ name: template.name, id, webhook: template.webhook });
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    WORKFLOW CREATION COMPLETE                 ║
╚════════════════════════════════════════════════════════════════╝

✅ Created: ${created.length}/${WORKFLOW_TEMPLATES.length}

Created Workflows:`);

  created.forEach((wf, i) => {
    console.log(`\n${i + 1}. ${wf.name}`);
    console.log(`   Workflow ID: ${wf.id}`);
    console.log(`   Webhook: ${wf.webhook}`);
  });

  console.log(`

📋 NEXT STEPS:

1. ✅ Workflows created with basic webhook structure
2. 🔧 Now you need to add nodes to each workflow in n8n UI

   Go to: ${CONFIG.N8N_URL}/workflow/<id>

   For each workflow, click "+ Add Node" and add:

   Workflow 1 - HigherGov Scraper:
   ├─ HTTP Request (GET HigherGov API)
   ├─ Code (Transform data)
   ├─ Airtable (Save to Intelligence)
   └─ Respond to Webhook

   Workflow 2 - Deduplication Engine:
   ├─ Airtable (Read All)
   ├─ Code (Identify duplicates)
   └─ Respond to Webhook

   Workflow 3 - Contract Matcher:
   ├─ Airtable (Read Opportunities)
   ├─ Airtable (Read Suppliers)
   ├─ Code (Matching Algorithm)
   ├─ Airtable (Save Matches)
   └─ Respond to Webhook

   Workflow 4 - Supplier Notifications:
   ├─ Airtable (Read Unnotified)
   ├─ Code (Group by Supplier)
   └─ Respond to Webhook

3. 📅 Add Cron scheduling to each:
   HigherGov: 0 */6 * * * (every 6 hours)
   Dedup: 0 * * * * (every hour)
   Matcher: 5 * * * * (every hour at :05)
   Notifier: 30 */6 * * * (every 6 hours at :30)

4. 🧪 Test each workflow by triggering its webhook:
   curl -X POST ${CONFIG.N8N_URL}/webhook/highergov-scraper

5. 🟢 Activate workflows (toggle "Active" in UI)

📖 Reference:
   → N8N_MULTISOURCE_SETUP_PLAYBOOK.md (detailed node config)
   → N8N_JAVASCRIPT_CODE_REFERENCE.md (code snippets for Code nodes)
`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
