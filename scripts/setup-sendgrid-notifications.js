#!/usr/bin/env node
/**
 * Configure SendGrid email notifications for supplier matches
 * Creates automated email alerts when suppliers have new matches
 */

const https = require('https');

const CONFIG = {
  N8N_URL: 'https://n8n.srv1112587.hstgr.cloud',
  N8N_API_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkNjFkMWZkOC0xNDdmLTQzMWYtOGIzYy00YTJjM2U5OTQzOTQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODRkOWY1ZTQtMmMzYS00ODJkLTgxOGMtMzY2NDBiMGViNWRhIiwiaWF0IjoxNzc5NzM2ODE2fQ.pdifsbn7LFvOB09iPFuZLL41bVvsfQOVxL-ovy8LBKM',
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || ''
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

async function createEmailNotificationWorkflow() {
  console.log('\n📝 Creating Email Notification workflow...');

  const workflow = {
    name: 'Email Notifications (SendGrid)',
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
        webhookId: 'email-notifications',
        parameters: {
          httpMethod: 'POST',
          path: 'email-notifications'
        }
      },
      {
        name: 'Read Pending Matches',
        type: 'n8n-nodes-base.airtable',
        typeVersion: 2,
        position: [500, 200],
        parameters: {
          operation: 'readRecords',
          base: 'appZhXnyFiKbnOZLr',
          table: 'Supplier_Opportunities',
          limit: 100,
          filterByFormula: 'AND({status}="Pending", {notified}=FALSE())'
        }
      },
      {
        name: 'Group by Email',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [700, 200],
        parameters: {
          jsCode: `const matches = $input.all();
const grouped = {};

matches.forEach(m => {
  const email = m.json.supplier_email;
  if (!grouped[email]) {
    grouped[email] = {
      supplier_email: email,
      opportunities: [],
      total_value: 0,
      match_ids: []
    };
  }
  grouped[email].opportunities.push({
    name: m.json.opportunity_name,
    value: m.json.contract_value_usd,
    score: m.json.match_score,
    source: m.json.source,
    id: m.id
  });
  grouped[email].total_value += m.json.contract_value_usd || 0;
  grouped[email].match_ids.push(m.id);
});

return Object.values(grouped);`
        }
      },
      {
        name: 'Send Email (SendGrid)',
        type: 'n8n-nodes-base.sendGrid',
        typeVersion: 2,
        position: [900, 200],
        parameters: {
          fromEmail: 'opportunities@maravilla-intelligence.com',
          toEmail: '={{ $json.supplier_email }}',
          subject: '🎯 New Contract Opportunities Matching Your Profile',
          html: `<html>
<head><style>
  body { font-family: Arial, sans-serif; }
  .header { background: #3222F4; color: white; padding: 20px; }
  .opportunity { border: 1px solid #ddd; margin: 10px 0; padding: 15px; }
  .score { background: #f0f000; padding: 5px 10px; border-radius: 3px; }
  .value { color: #3222F4; font-weight: bold; }
  .footer { font-size: 12px; color: #999; margin-top: 20px; }
</style></head>
<body>
  <div class="header">
    <h2>New Contract Opportunities</h2>
    <p>We found {{ $json.opportunities.length }} matching opportunities for you!</p>
  </div>

  <p>Total value: <span class="value">\${{ $json.total_value.toLocaleString() }}</span></p>

  {{ $json.opportunities.map(opp => \`
    <div class="opportunity">
      <h3>\${opp.name}</h3>
      <p><strong>Value:</strong> <span class="value">\$\${opp.value?.toLocaleString()}</span></p>
      <p><strong>Match Score:</strong> <span class="score">\${opp.score}%</span></p>
      <p><strong>Source:</strong> \${opp.source}</p>
    </div>
  \`).join('') }}

  <div class="footer">
    <p>Login to your supplier portal to view full details and submit proposals.</p>
    <p>Portal: http://localhost:3000</p>
  </div>
</body>
</html>`
        }
      },
      {
        name: 'Mark as Notified',
        type: 'n8n-nodes-base.airtable',
        typeVersion: 2,
        position: [1100, 200],
        parameters: {
          operation: 'updateRecords',
          base: 'appZhXnyFiKbnOZLr',
          table: 'Supplier_Opportunities',
          fieldsUi: {
            values: [
              { fieldName: 'notified', fieldValue: 'true' },
              { fieldName: 'notification_date', fieldValue: '={{ new Date().toISOString() }}' }
            ]
          }
        }
      },
      {
        name: 'Log Results',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1,
        position: [1300, 200],
        parameters: {
          responseCode: 200
        }
      }
    ],
    connections: {
      'Webhook': {
        main: [[{ node: 'Read Pending Matches', type: 'main', index: 0 }]]
      },
      'Read Pending Matches': {
        main: [[{ node: 'Group by Email', type: 'main', index: 0 }]]
      },
      'Group by Email': {
        main: [[{ node: 'Send Email (SendGrid)', type: 'main', index: 0 }]]
      },
      'Send Email (SendGrid)': {
        main: [[{ node: 'Mark as Notified', type: 'main', index: 0 }]]
      },
      'Mark as Notified': {
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

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║     Setting Up SendGrid Email Notifications                   ║
║     Automated supplier alerts for new matches                  ║
╚════════════════════════════════════════════════════════════════╝
`);

  if (!CONFIG.SENDGRID_API_KEY) {
    console.log(`
⚠️  SendGrid API Key not configured

To enable email notifications:

1. Get SendGrid API Key:
   • Go to: https://app.sendgrid.com/settings/api_keys
   • Click "Create API Key"
   • Copy the key (starts with "SG.")

2. Export the key:
   export SENDGRID_API_KEY=SG.xxxxxxxxxxxxx...

3. Create SendGrid Credential in n8n:
   • Dashboard: https://n8n.srv1112587.hstgr.cloud/
   • Settings → Credentials
   • Create new "SendGrid" credential
   • Paste API key

4. Re-run this script:
   node scripts/setup-sendgrid-notifications.js

For now, matches are saved to Airtable and suppliers can:
  • Check Portal at http://localhost:3000
  • View Airtable directly (manual process)
  • Export matches from Supplier_Opportunities table
`);
    process.exit(0);
  }

  const workflowId = await createEmailNotificationWorkflow();

  if (!workflowId) {
    console.error('\n❌ Failed to create workflow');
    process.exit(1);
  }

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║            EMAIL NOTIFICATION WORKFLOW CREATED                ║
╚════════════════════════════════════════════════════════════════╝

✅ Email Notification Workflow Ready

Workflow ID: ${workflowId}
Webhook: POST https://n8n.srv1112587.hstgr.cloud/webhook/email-notifications

Email Flow:
  1. Supplier Notifications workflow finds pending matches
  2. Groups matches by supplier email
  3. Generates HTML email with opportunity details
  4. Sends via SendGrid
  5. Marks records as notified in Airtable

Email Template Includes:
  ✓ Opportunity name & value
  ✓ Match score (% fit)
  ✓ Source (HigherGov, SAM, USASpending)
  ✓ Portal login link
  ✓ Professional branding

Automatic Triggering:
  • Supplier Notifications workflow runs every 6 hours at :30
  • Creates Email Notification workflow execution
  • Sends to all suppliers with pending matches
  • Marks matches as notified (no duplicate emails)

Manual Testing:
  curl -X POST https://n8n.srv1112587.hstgr.cloud/webhook/email-notifications

Configuration Required:
  1. SendGrid API Key in n8n credentials
  2. From email address configured (in workflow)
  3. HTML email template (configured above)

If Emails Don't Send:
  1. Check n8n Executions tab for errors
  2. Verify SendGrid API key is valid
  3. Check email addresses in Supplier_Opportunities table
  4. Verify email not in spam folder

Next: Create Supplier Portal Authentication
  Run: node scripts/setup-supplier-auth.js
`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
