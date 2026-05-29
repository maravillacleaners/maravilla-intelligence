#!/usr/bin/env node
/**
 * Enable real HigherGov API connection in the Scraper workflow
 * Replace sample data with live federal opportunity feed
 */

const https = require('https');

const CONFIG = {
  N8N_URL: 'https://n8n.srv1112587.hstgr.cloud',
  N8N_API_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkNjFkMWZkOC0xNDdmLTQzMWYtOGIzYy00YTJjM2U5OTQzOTQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODRkOWY1ZTQtMmMzYS00ODJkLTgxOGMtMzY2NDBiMGViNWRhIiwiaWF0IjoxNzc5NzM2ODE2fQ.pdifsbn7LFvOB09iPFuZLL41bVvsfQOVxL-ovy8LBKM',
  HIGHERGOV_API_KEY: '4be72a011d644af8bca9a11f85c90d95'
};

const WORKFLOW_ID = 'g44UMWxyKBGboLhd';

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

async function getWorkflow(workflowId) {
  const response = await request('GET', `${CONFIG.N8N_URL}/api/v1/workflows/${workflowId}`);
  if (response.status === 200) {
    return response.data;
  }
  throw new Error(`Cannot fetch workflow: ${response.status}`);
}

async function updateHttpNode(workflow) {
  const httpNode = workflow.nodes.find(n => n.name === 'Fetch from HigherGov');

  if (!httpNode) {
    throw new Error('HTTP Request node not found');
  }

  // Update with real HigherGov API endpoint and authentication
  httpNode.parameters = {
    url: 'https://api.highergov.com/v1/opportunities',
    method: 'GET',
    authentication: 'apiKey',
    apiKey: CONFIG.HIGHERGOV_API_KEY,
    queryParametersUi: {
      parameter: [
        { name: 'status', value: 'open' },
        { name: 'page', value: '1' },
        { name: 'per_page', value: '100' },
        { name: 'sort_by', value: 'deadline' },
        { name: 'days_remaining_min', value: '7' }
      ]
    },
    options: {
      followRedirects: true,
      returnFullResponse: false
    }
  };

  return workflow;
}

async function updateWorkflow(workflowId, workflow) {
  const cleanUpdates = {
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings || {},
    name: workflow.name
  };

  const response = await request('PUT', `${CONFIG.N8N_URL}/api/v1/workflows/${workflowId}`, cleanUpdates);
  if (response.status !== 200) {
    throw new Error(`Cannot update workflow: ${response.status} - ${response.data?.message}`);
  }
  return response.data;
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║     Enabling Real HigherGov API Connection                    ║
║     Switching from sample data to live federal opportunities   ║
╚════════════════════════════════════════════════════════════════╝
`);

  try {
    console.log('\n📥 Fetching HigherGov Scraper workflow...');
    let workflow = await getWorkflow(WORKFLOW_ID);
    console.log('   ✅ Fetched');

    console.log('\n🔧 Updating HTTP Request node...');
    workflow = await updateHttpNode(workflow);
    console.log('   ✅ Configured with HigherGov API endpoint');
    console.log('   ✅ Added API key authentication');
    console.log('   ✅ Set query parameters (status=open, per_page=100)');

    console.log('\n📤 Saving workflow...');
    await updateWorkflow(WORKFLOW_ID, workflow);
    console.log('   ✅ Workflow updated');

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║              API CONNECTION ENABLED                           ║
╚════════════════════════════════════════════════════════════════╝

✅ HigherGov API Integration Active

Configuration:
  • Endpoint: https://api.highergov.com/v1/opportunities
  • Authentication: API Key (${CONFIG.HIGHERGOV_API_KEY.substring(0, 8)}...)
  • Query: status=open, per_page=100, sort_by=deadline
  • Minimum days remaining: 7
  • Frequency: Every 6 hours (cron: 0 */6 * * *)

Next Run: Automatic at next 6-hour interval (0:00, 6:00, 12:00, 18:00 UTC)

To test immediately:
  curl -X POST https://n8n.srv1112587.hstgr.cloud/webhook/highergov-scraper

Expected Behavior:
  1. Workflow fetches from HigherGov API
  2. Transforms data to standard format
  3. Saves new opportunities to Airtable Intelligence
  4. Deduplication removes any duplicates (1-2 hour delay)
  5. Contract Matcher finds supplier matches
  6. Supplier Notifications groups by email

Data Flow:
  HigherGov API (live)
    ↓
  Transform & Normalize
    ↓
  Airtable Intelligence (grows by 50-100/6h)
    ↓
  Deduplication (hourly)
    ↓
  Contract Matcher (hourly @:05)
    ↓
  Supplier Notifications (6-hourly @:30)

Quality Metrics:
  • Expected opportunities/day: 200-400
  • Expected matches/day: 50-200
  • Expected unique suppliers notified/day: 20-50

Monitor Progress:
  • Airtable Intelligence: Should grow by ~75 records every 6 hours
  • Last update time: Check \`date_added\` field
  • New sources: Will show "highergov" in \`source\` field

Manual Test:
  1. Open Airtable: https://airtable.com/appZhXnyFiKbnOZLr
  2. Go to Intelligence table
  3. Wait for next scheduled run (or trigger manually)
  4. Check for new records with source="highergov"
  5. Verify \`date_added\` is recent

If API Key Expires:
  • Update HIGHERGOV_API_KEY in this script
  • Re-run this script to update the workflow
  • No manual workflow editing needed

Troubleshooting:
  • No new records after 1 hour? Check n8n Executions tab
  • API error? Verify API key with HigherGov support
  • Wrong data format? Review transformation code in Code node

Next Phase (This Week):
  [ ] Monitor HigherGov data quality
  [ ] Add SAM.gov federal contracts (script: enable-sam-api.js)
  [ ] Add USASpending transaction data
  [ ] Verify match quality with real suppliers
`);

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

main();
