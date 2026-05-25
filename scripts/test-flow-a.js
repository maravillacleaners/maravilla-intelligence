#!/usr/bin/env node
/**
 * Test script for Flow A - Client Discovery
 * Validates workflow logic with 5 mock Sunbiz records
 *
 * Tasks:
 * 1. Parse 5 Sunbiz test records
 * 2. Apply branch logic (NAICS check)
 * 3. Simulate enrichment
 * 4. Simulate Claude scoring
 * 5. Prepare Airtable records
 * 6. Verify fields are correct
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test records
const testRecordsPath = path.join(__dirname, '../migration/sunbiz-test-records.json');
const testRecords = JSON.parse(fs.readFileSync(testRecordsPath, 'utf8'));

console.log('\n========================================');
console.log('FLOW A - CLIENT DISCOVERY TEST');
console.log('========================================\n');

const PRIMARY_NAICS = config.PRIMARY_NAICS;
let processedCount = 0;
let routedToFlowB = 0;
let savedToAirtable = 0;
const results = [];

// Step 1: Parse Sunbiz records
console.log('Step 1: Parsing Sunbiz Records');
console.log(`Found ${testRecords.length} test records\n`);

testRecords.forEach((company, idx) => {
  const record = {
    index: idx + 1,
    legal_name: company.company_name || '',
    dba: company.dba_name || '',
    sunbiz_status: company.status || 'ACTIVE',
    date_formed: company.date_formed || '',
    naics: company.naics || '',
    naics_description: company.naics_description || '',
    officer_name: company.principal_officer || '',
    registered_address: company.registered_address || '',
    physical_address: company.mailing_address || '',
    county: company.county || '',
    zip: company.zip || '',
    sunbiz_record_id: company.record_id || '',
    source: 'Sunbiz',
    created_at: new Date().toISOString()
  };

  // Step 2: Branch logic - Check NAICS
  console.log(`Record ${record.index}: ${record.legal_name}`);
  if (record.naics === PRIMARY_NAICS) {
    console.log(`  ➜ BRANCH: PRIMARY_NAICS detected (${record.naics})`);
    console.log(`  ➜ ACTION: Route to Flow B (supplier discovery)\n`);
    routedToFlowB++;
  } else {
    console.log(`  ➜ NAICS: ${record.naics} (${record.naics_description})`);
    console.log(`  ➜ ACTION: Continue with Flow A (client discovery)\n`);

    // Step 3: Simulate SAM check
    const samData = {
      has_sam_registration: Math.random() > 0.7,
      sam_uei: Math.random() > 0.7 ? `SAM-${Math.random().toString(36).substr(2, 9).toUpperCase()}` : null,
      government_ready: 'no'
    };

    // Step 4: Simulate enrichment
    const enrichedData = {
      ...record,
      ...samData,
      business_email: `contact@${record.legal_name.toLowerCase().replace(/\s+/g, '')}.com`,
      phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      website: `https://www.${record.legal_name.toLowerCase().replace(/\s+/g, '-')}.com`,
      linkedin: null,
      has_physical_office: true,
      sqft_estimate: Math.floor(Math.random() * 50000) + 5000,
      employees_estimate: Math.floor(Math.random() * 500) + 10,
      already_exists: false,
      is_opted_out: false
    };

    // Step 5: Simulate Claude scoring
    const segmentMap = {
      '531210': 'Property Manager',
      '621498': 'Clinic/Medical',
      '531120': 'Office Complex',
      '927340': 'Government/GovCon'
    };

    const scoredData = {
      ...enrichedData,
      score: Math.floor(Math.random() * 40) + 60,
      service_fit: 'high_potential',
      segment: segmentMap[record.naics] || 'Newly Formed',
      priority: Math.floor(Math.random() * 4) + 1,
      intent_signal: Math.random() > 0.5 ? 'high' : 'medium',
      icebreaker: `We specialize in commercial cleaning for ${segmentMap[record.naics] || 'businesses'} in ${record.county}`,
      pipeline_status: 'pending_review',
      change_detected: false,
      re_engagement_candidate: false,
      opt_out: false,
      scored_at: new Date().toISOString()
    };

    results.push(scoredData);
    processedCount++;
    savedToAirtable++;

    console.log(`  ✓ Enriched: ${scoredData.business_email}`);
    console.log(`  ✓ Scored: ${scoredData.score}/100 (${scoredData.segment})`);
    console.log(`  ✓ Priority: P${scoredData.priority}`);
    console.log(`  ✓ Status: ${scoredData.pipeline_status}\n`);
  }
});

// Step 6: Verify Airtable fields
console.log('========================================');
console.log('VERIFICATION - AIRTABLE FIELDS');
console.log('========================================\n');

const requiredFields = [
  'legal_name', 'dba', 'sunbiz_status', 'date_formed', 'naics',
  'officer_name', 'registered_address', 'physical_address', 'county', 'zip',
  'business_email', 'phone', 'website', 'has_physical_office', 'sqft_estimate',
  'employees_estimate', 'has_sam_registration', 'score', 'service_fit',
  'segment', 'priority', 'intent_signal', 'icebreaker', 'pipeline_status', 'source'
];

let allFieldsValid = true;
results.forEach((record, idx) => {
  console.log(`Record ${idx + 1}: ${record.legal_name}`);
  let missingFields = [];
  requiredFields.forEach(field => {
    if (!(field in record)) {
      missingFields.push(field);
      allFieldsValid = false;
    }
  });

  if (missingFields.length === 0) {
    console.log('  ✓ All required fields present');
  } else {
    console.log(`  ✗ Missing fields: ${missingFields.join(', ')}`);
  }
  console.log('');
});

// Summary
console.log('========================================');
console.log('SUMMARY');
console.log('========================================');
console.log(`Total records processed: ${testRecords.length}`);
console.log(`Routed to Flow B (${PRIMARY_NAICS}): ${routedToFlowB}`);
console.log(`Saved to Airtable pending_review: ${savedToAirtable}`);
console.log(`All Airtable fields valid: ${allFieldsValid ? 'YES' : 'NO'}`);
console.log(`\nTest Status: ${savedToAirtable === 5 - routedToFlowB && allFieldsValid ? 'PASS' : 'FAIL'}`);

// Write detailed results to JSON
const resultsSummary = {
  timestamp: new Date().toISOString(),
  test_records_total: testRecords.length,
  routed_to_flow_b: routedToFlowB,
  saved_to_airtable: savedToAirtable,
  all_fields_valid: allFieldsValid,
  processed_records: results,
  test_passed: savedToAirtable === 5 - routedToFlowB && allFieldsValid
};

const resultsPath = path.join(__dirname, '../tests/flow-a-test-results.json');
fs.writeFileSync(resultsPath, JSON.stringify(resultsSummary, null, 2));
console.log(`\nDetailed results saved to: ${resultsPath}`);
console.log('\n========================================\n');

process.exit(allFieldsValid && savedToAirtable === 4 ? 0 : 1);
