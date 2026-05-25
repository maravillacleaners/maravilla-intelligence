#!/usr/bin/env node

/**
 * Test script for Flow D opt-out webhook
 * Simulates GHL opt-out webhook payload
 * Usage: node scripts/test-optout-webhook.js
 */

import ComplianceManager from '../lib/compliance.js';

async function testOptOutWebhook() {
  console.log('🔍 Testing Flow D Opt-Out Webhook Handler...\n');

  const manager = new ComplianceManager({});

  // Simulate webhook payload from GHL
  const webhookPayload = {
    email: 'test-contact@example.com',
    ghl_contact_id: 'contact_abc123xyz',
    timestamp: new Date().toISOString(),
  };

  console.log('📥 Webhook Payload:');
  console.log(JSON.stringify(webhookPayload, null, 2));
  console.log();

  try {
    console.log('⚙️  Processing opt-out...');
    const result = await manager.handleOptOut(webhookPayload);

    console.log('\n✅ Opt-Out Processed Successfully!');
    console.log('\n📊 Result:');
    console.log(JSON.stringify(result, null, 2));

    // Test validation
    console.log('\n🔐 Testing outreach validation...');
    const validation = await manager.validateOutreach({
      email: webhookPayload.email,
      prospect_id: result.prospectId,
      message: 'This is a business outreach',
      channel: 'email'
    });

    console.log('\n❌ Outreach Validation (should reject):');
    console.log(JSON.stringify(validation, null, 2));

    if (!validation.allowed && validation.reason.includes('suppression')) {
      console.log('\n✅ PASS: Email correctly marked as opted-out');
    } else {
      console.log('\n❌ FAIL: Email should be on suppression list');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

testOptOutWebhook();
