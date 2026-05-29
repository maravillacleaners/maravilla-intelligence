#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const N8N_BASE_URL = 'https://n8n.srv1112587.hstgr.cloud/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY;

if (!N8N_API_KEY) {
  console.error('❌ Error: N8N_API_KEY not found in .env');
  process.exit(1);
}

const api = axios.create({
  baseURL: N8N_BASE_URL,
  headers: {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

async function importWorkflow() {
  try {
    console.log('📦 Reading workflow file...');
    const workflowPath = path.join(__dirname, '..', 'workflows', 'phase5-contract-intelligence-daily.json');
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));

    console.log('🚀 Importing workflow to n8n...');
    const response = await api.post('/workflows', {
      name: workflowData.name,
      nodes: workflowData.nodes,
      connections: workflowData.connections,
      settings: {
        timezone: 'America/New_York'
      }
    });

    const workflowId = response.data.id;
    console.log(`✅ Workflow imported successfully. ID: ${workflowId}`);

    return workflowId;
  } catch (error) {
    console.error('❌ Failed to import workflow:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function configureEnvironmentVariables(workflowId) {
  try {
    console.log('⚙️  Configuring environment variables...');

    // Load workflow file to get nodes and connections for the update payload
    const workflowPath = path.join(__dirname, '..', 'workflows', 'phase5-contract-intelligence-daily.json');
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));

    const envVars = {
      API_SERVER_URL: process.env.API_SERVER_URL || 'http://localhost:3000',
      SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
      AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
      AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID
    };

    // Validate required vars
    const required = ['SLACK_WEBHOOK_URL', 'AIRTABLE_API_KEY', 'AIRTABLE_BASE_ID'];
    for (const varName of required) {
      if (!envVars[varName]) {
        console.error(`❌ Error: ${varName} not found in .env`);
        process.exit(1);
      }
    }

    // n8n cloud instances use environment variable configuration via settings
    // Update the workflow to include these as part of its configuration
    const updatePayload = {
      name: 'Phase 5 Contract Intelligence Daily Orchestration',
      nodes: workflowData.nodes,
      connections: workflowData.connections,
      settings: {
        timezone: 'America/New_York'
      }
    };

    // For cloud n8n, environment variables are set at the instance level
    // Log the configuration that should be set manually via n8n UI
    console.log('📋 Environment variables to configure in n8n Dashboard (Settings → Environment):');
    for (const [key, value] of Object.entries(envVars)) {
      console.log(`   ${key}=${value.substring(0, 20)}...`);
    }

    const updateResponse = await api.put(`/workflows/${workflowId}`, updatePayload);
    console.log('✅ Workflow settings configured');

    return true;
  } catch (error) {
    console.error('❌ Failed to configure variables:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function activateWorkflow(workflowId) {
  try {
    console.log('🔄 Activating workflow...');

    const response = await api.post(`/workflows/${workflowId}/activate`);

    if (response.data.active) {
      console.log('✅ Workflow activated successfully');
      console.log(`📅 Scheduled: Daily 7:00 AM EDT (America/New_York timezone)`);
      return true;
    } else {
      console.error('❌ Failed to activate workflow');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to activate workflow:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function deploy() {
  console.log('🎯 Phase 5 Contract Intelligence - n8n Deployment');
  console.log('═══════════════════════════════════════════════\n');

  try {
    // Step 1: Import workflow
    const workflowId = await importWorkflow();

    // Step 2: Configure environment variables
    await configureEnvironmentVariables(workflowId);

    // Step 3: Activate workflow
    await activateWorkflow(workflowId);

    console.log('\n✅ Deployment completed successfully!\n');
    console.log('📌 Next Steps:');
    console.log('   1. Open n8n dashboard: https://n8n.srv1112587.hstgr.cloud');
    console.log('   2. Verify workflow "Phase 5 Contract Intelligence Daily Orchestration" is Active');
    console.log('   3. Check Settings → Environment for variable configuration');
    console.log('   4. Monitor first execution at 7:00 AM EDT\n');

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run deployment
deploy();
