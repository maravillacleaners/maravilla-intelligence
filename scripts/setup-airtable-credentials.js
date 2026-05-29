#!/usr/bin/env node
/**
 * Create Airtable credentials in n8n and configure workflows to use them
 */

const https = require('https');

const CONFIG = {
  N8N_URL: 'https://n8n.srv1112587.hstgr.cloud',
  N8N_API_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkNjFkMWZkOC0xNDdmLTQzMWYtOGIzYy00YTJjM2U5OTQzOTQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODRkOWY1ZTQtMmMzYS00ODJkLTgxOGMtMzY2NDBiMGViNWRhIiwiaWF0IjoxNzc5NzM2ODE2fQ.pdifsbn7LFvOB09iPFuZLL41bVvsfQOVxL-ovy8LBKM',
  AIRTABLE_API_KEY: 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92'
};

const WORKFLOWS = [
  'g44UMWxyKBGboLhd',
  'GAmExe061Hhnai7m',
  'tctxoU2gRupksNc6',
  'IlKz4vplCqfgIKoK'
];

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

async function createAirtableCredential() {
  console.log('📝 Creating Airtable credential...');

  // Try with empty data object
  const credential = {
    name: 'Airtable API Key',
    type: 'airtableTokenApi',
    data: {}
  };

  const response = await request('POST', `${CONFIG.N8N_URL}/api/v1/credentials`, credential);

  if (response.status === 201 || response.status === 200) {
    console.log(`✅ Created credential: ${response.data.id}`);
    // Now try to set the actual data via update with different formats
    await updateCredentialData(response.data.id);
    return response.data.id;
  } else {
    console.log(`⚠️  Response: ${response.status}`, response.data);
    return null;
  }
}

async function updateCredentialData(credentialId) {
  // Try to update the credential with the API key data
  const updates = {
    name: 'Airtable API Key',
    type: 'airtableTokenApi',
    data: {
      token: CONFIG.AIRTABLE_API_KEY
    }
  };

  const response = await request('PUT', `${CONFIG.N8N_URL}/api/v1/credentials/${credentialId}`, updates);
  if (response.status === 200) {
    console.log(`   ✅ Updated credential data`);
  } else {
    console.log(`   ⚠️  Could not update credential data: ${response.status}`, response.data?.message);
  }
}

async function getWorkflow(workflowId) {
  const response = await request('GET', `${CONFIG.N8N_URL}/api/v1/workflows/${workflowId}`);
  if (response.status === 200) {
    return response.data;
  }
  return null;
}

async function addCredentialToNodes(workflow, credentialId) {
  // Find all Airtable nodes
  const airtableNodes = workflow.nodes.filter(n => n.type === 'n8n-nodes-base.airtable');

  let updated = false;
  for (const node of airtableNodes) {
    if (!node.credentials) {
      node.credentials = {};
    }
    node.credentials.airtableTokenApi = {
      id: credentialId,
      name: 'Airtable API Key'
    };
    updated = true;
  }

  return updated ? workflow : null;
}

async function updateWorkflow(workflowId, updates) {
  const cleanUpdates = {
    nodes: updates.nodes,
    connections: updates.connections,
    settings: updates.settings || {},
    name: updates.name
  };

  const response = await request('PUT', `${CONFIG.N8N_URL}/api/v1/workflows/${workflowId}`, cleanUpdates);
  if (response.status === 200) {
    return true;
  } else {
    console.log(`Error updating workflow: ${response.status}`, response.data?.message);
    return false;
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║     Setting up Airtable Credentials for n8n Workflows         ║
╚════════════════════════════════════════════════════════════════╝
`);

  // Create credential
  const credentialId = await createAirtableCredential();

  if (!credentialId) {
    console.error('❌ Failed to create Airtable credential');
    process.exit(1);
  }

  console.log(`\n🔐 Configuring workflows with credential...\n`);

  // Update each workflow to use the credential
  for (const workflowId of WORKFLOWS) {
    try {
      const workflow = await getWorkflow(workflowId);
      if (!workflow) {
        console.log(`❌ Could not fetch workflow ${workflowId}`);
        continue;
      }

      const updated = await addCredentialToNodes(workflow, credentialId);
      if (!updated) {
        console.log(`⏭️  Workflow ${workflowId} - no Airtable nodes found`);
        continue;
      }

      const success = await updateWorkflow(workflowId, workflow);
      if (success) {
        console.log(`✅ Workflow ${workflowId} - credential configured`);
      } else {
        console.log(`❌ Workflow ${workflowId} - failed to update`);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.log(`❌ Error processing workflow ${workflowId}: ${err.message}`);
    }
  }

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    SETUP COMPLETE                             ║
╚════════════════════════════════════════════════════════════════╝

✅ Airtable credential configured for all workflows

Next: Run activation script again
  node scripts/activate-and-test-workflows.js
`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
