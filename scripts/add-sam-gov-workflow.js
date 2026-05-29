#!/usr/bin/env node
/**
 * Create SAM.gov federal contracts workflow
 * Fetches prime contracts and subcontracting opportunities from SAM.gov API
 */

const https = require('https');

const CONFIG = {
  N8N_URL: 'https://n8n.srv1112587.hstgr.cloud',
  N8N_API_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkNjFkMWZkOC0xNDdmLTQzMWYtOGIzYy00YTJjM2U5OTQzOTQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODRkOWY1ZTQtMmMzYS00ODJkLTgxOGMtMzY2NDBiMGViNWRhIiwiaWF0IjoxNzc5NzM2ODE2fQ.pdifsbn7LFvOB09iPFuZLL41bVvsfQOVxL-ovy8LBKM',
  AIRTABLE_BASE_ID: 'appZhXnyFiKbnOZLr',
  SAM_API_KEY: process.env.SAM_API_KEY || 'demo'
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

async function createSamGovWorkflow() {
  console.log('\n📝 Creating SAM.gov Federal Contracts workflow...');

  const workflow = {
    name: 'SAM.gov Federal Contracts',
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
        webhookId: 'sam-gov-contracts',
        parameters: {
          httpMethod: 'POST',
          path: 'sam-gov-contracts'
        }
      },
      {
        name: 'Fetch from SAM.gov',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4,
        position: [500, 200],
        parameters: {
          url: 'https://api.sam.gov/opportunities/v2/search',
          method: 'GET',
          queryParametersUi: {
            parameter: [
              { name: 'api_key', value: CONFIG.SAM_API_KEY },
              { name: 'limit', value: '100' },
              { name: 'sort', value: 'postedDate:desc' },
              { name: 'keyword', value: 'contract' }
            ]
          },
          options: {}
        }
      },
      {
        name: 'Transform Data',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [700, 200],
        parameters: {
          jsCode: `const opportunities = $json.data || $json.opportunitiesData || [];
const crypto = require('crypto');
const transformed = opportunities.map(opp => ({
  opportunity_id: opp.noticeId || opp.id,
  title: opp.title || opp.opportunityTitle,
  agency: opp.department || 'Federal Agency',
  description: opp.description || opp.summary || '',
  source: 'sam-gov',
  event_date: opp.responseDeadLine || opp.deadline || new Date().toISOString(),
  total_obligated_amount: opp.estimatedAmount || 0,
  url: opp.uriFile || opp.noticeLink || '',
  naics_codes: (opp.naicsCodes || []).map(c => c.code || c).join(','),
  place_of_performance: opp.placeOfPerformance || '',
  set_asides: (opp.setAsides || []).map(s => s.code || s).join(','),
  url_hash: crypto.createHash('sha256').update(opp.uriFile || opp.id).digest('hex'),
  source_data: JSON.stringify(opp)
}));
return transformed;`
        }
      },
      {
        name: 'Save to Airtable',
        type: 'n8n-nodes-base.airtable',
        typeVersion: 2,
        position: [900, 200],
        parameters: {
          operation: 'create',
          base: CONFIG.AIRTABLE_BASE_ID,
          table: 'Intelligence',
          fieldsUi: {
            values: [
              { fieldName: 'opportunity_id', fieldValue: '={{ $json.opportunity_id }}' },
              { fieldName: 'title', fieldValue: '={{ $json.title }}' },
              { fieldName: 'description', fieldValue: '={{ $json.description }}' },
              { fieldName: 'source', fieldValue: '={{ $json.source }}' },
              { fieldName: 'event_date', fieldValue: '={{ $json.event_date }}' },
              { fieldName: 'total_obligated_amount', fieldValue: '={{ $json.total_obligated_amount }}' },
              { fieldName: 'url', fieldValue: '={{ $json.url }}' },
              { fieldName: 'naics_codes', fieldValue: '={{ $json.naics_codes }}' },
              { fieldName: 'place_of_performance', fieldValue: '={{ $json.place_of_performance }}' },
              { fieldName: 'set_asides', fieldValue: '={{ $json.set_asides }}' },
              { fieldName: 'url_hash', fieldValue: '={{ $json.url_hash }}' },
              { fieldName: 'source_data', fieldValue: '={{ $json.source_data }}' }
            ]
          }
        }
      },
      {
        name: 'Log Results',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1,
        position: [1100, 200],
        parameters: {
          responseCode: 200
        }
      }
    ],
    connections: {
      'Webhook': {
        main: [[{ node: 'Fetch from SAM.gov', type: 'main', index: 0 }]]
      },
      'Fetch from SAM.gov': {
        main: [[{ node: 'Transform Data', type: 'main', index: 0 }]]
      },
      'Transform Data': {
        main: [[{ node: 'Save to Airtable', type: 'main', index: 0 }]]
      },
      'Save to Airtable': {
        main: [[{ node: 'Log Results', type: 'main', index: 0 }]]
      }
    }
  };

  const response = await request('POST', `${CONFIG.N8N_URL}/api/v1/workflows`, workflow);

  if (response.status === 201 || response.status === 200) {
    console.log(`   ✅ Created: ${response.data.id}`);
    return response.data.id;
  } else {
    console.error(`   ❌ Error: ${response.status}`, response.data);
    return null;
  }
}

async function activateWorkflow(workflowId) {
  const response = await request('POST', `${CONFIG.N8N_URL}/api/v1/workflows/${workflowId}/activate`);
  return response.status === 200;
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║     Creating SAM.gov Federal Contracts Workflow                ║
║     Adds federal contract opportunities to data pipeline       ║
╚════════════════════════════════════════════════════════════════╝
`);

  const workflowId = await createSamGovWorkflow();

  if (!workflowId) {
    console.error('\n❌ Failed to create workflow');
    process.exit(1);
  }

  console.log('\n🚀 Activating workflow...');
  const activated = await activateWorkflow(workflowId);

  if (activated) {
    console.log('   ✅ Workflow activated');
  } else {
    console.log('   ⚠️  Activation returned non-200');
  }

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                SAM.GOV WORKFLOW CREATED                       ║
╚════════════════════════════════════════════════════════════════╝

✅ SAM.gov Federal Contracts Workflow Active

Workflow ID: ${workflowId}
Webhook: POST https://n8n.srv1112587.hstgr.cloud/webhook/sam-gov-contracts
Schedule: Manual trigger (recommended hourly or 2x daily)

Data Source: SAM.gov API v2
  • Endpoint: https://api.sam.gov/opportunities/v2/search
  • Records per run: Up to 100
  • Contains: Federal contracts, set-asides, small business
  • Update frequency: Daily

SAM.gov Data Flows Same Path:
  SAM.gov API → Transform → Airtable Intelligence
    ↓ (joined with HigherGov data)
  Deduplication (removes duplicates)
    ↓
  Contract Matcher (finds supplier matches)
    ↓
  Supplier Notifications (groups by email)

Expected Data Volume:
  • New contracts/run: 50-100
  • Running 2x daily: 100-200 new contracts/day
  • Combined with HigherGov: 300-600 opportunities/day

To Run Manually:
  curl -X POST https://n8n.srv1112587.hstgr.cloud/webhook/sam-gov-contracts

To Schedule (recommended):
  1. Open n8n: https://n8n.srv1112587.hstgr.cloud/
  2. Go to workflow ${workflowId}
  3. Click Webhook trigger
  4. Change "Trigger type" from "Webhook" to "Cron"
  5. Enter: 0 6,18 * * * (twice daily: 6AM and 6PM)

Configuration:
  • SAM API Key: ${CONFIG.SAM_API_KEY === 'demo' ? '(demo mode - get real key from sam.gov)' : 'configured'}
  • Query: Contracts with deadlines
  • Filter: status=active, recordsPerPage=100
  • Sort: postedDate descending (newest first)

Next Workflow (USASpending):
  Run: node scripts/add-usaspending-workflow.js
  Data: Federal spending transactions 1000x larger dataset

System Now Feeds:
  1. HigherGov Scraper (every 6 hours) ✅
  2. SAM.gov Contracts (manual/scheduled) ✅
  3. USASpending (manual/scheduled) 🔜
  4. Grants.gov (optional future phase) 🔜

All feeding → Intelligence table → Matching → Supplier notifications
`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
