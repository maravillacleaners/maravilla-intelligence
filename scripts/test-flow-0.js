/**
 * Test Flow 0 - Local CSV Migration Testing Script
 * Tests: Read CSV → Enrich → Score → Save to Airtable
 * Usage: node scripts/test-flow-0.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Airtable from 'airtable';
import EnrichmentClient from '../lib/enrichment.js';
import ScoringEngine from '../lib/scoring.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const csvPath = path.join(__dirname, '../migration/existing-leads.csv');
const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });
const baseId = process.env.AIRTABLE_BASE_ID;

// Utility: Parse CSV
function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });
    records.push(record);
  }

  return records;
}

// Main test function
async function testFlow0() {
  console.log('=== Flow 0 Migration Test ===\n');

  try {
    // Step 1: Read CSV
    console.log('Step 1: Reading CSV...');
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const csvRecords = parseCSV(csvContent);
    console.log(`✓ Read ${csvRecords.length} records from CSV\n`);

    // Step 2: Enrich
    console.log('Step 2: Enriching prospect data...');
    const enrichmentClient = new EnrichmentClient();
    const enrichedRecords = await enrichmentClient.enrichBatch(csvRecords);
    console.log(`✓ Enriched ${enrichedRecords.length} records\n`);

    // Step 3: Score
    console.log('Step 3: Scoring prospects via Claude API...');
    const scoringEngine = new ScoringEngine();
    const scoredResults = await scoringEngine.scoreBatch(enrichedRecords);

    // Check for successful scores
    const successfulScores = scoredResults.filter(r => r.success);
    console.log(`✓ Successfully scored ${successfulScores.length}/${scoredResults.length} records\n`);

    // Show scoring details
    successfulScores.forEach((result, idx) => {
      const { prospect, score } = result;
      console.log(`  Record ${idx + 1}: ${prospect.legal_name}`);
      console.log(`    Score: ${score.score}/100`);
      console.log(`    Segment: ${score.segment}`);
      console.log(`    Intent: ${score.intent_signal}\n`);
    });

    // Step 4: Save to Airtable
    console.log('Step 4: Saving to Airtable...');
    const base = airtable.base(baseId);
    const airtableRecords = [];

    for (const result of successfulScores) {
      const { prospect, score } = result;

      try {
        const created = await base('Prospects').create({
          fields: {
            legal_name: prospect.legal_name,
            business_email: prospect.business_email,
            phone: prospect.phone,
            website: prospect.website,
            county: prospect.county,
            employees_estimate: parseInt(prospect.employees_estimate) || 0,
            score: score.score,
            service_fit: score.service_fit,
            segment: score.segment,
            priority: score.priority,
            intent_signal: score.intent_signal,
            icebreaker: score.icebreaker,
            pipeline_status: 'pending_review',
            source: 'CSV Migration',
            created_at: new Date().toISOString(),
          },
        });

        airtableRecords.push(created);
        console.log(`✓ Created prospect: ${prospect.legal_name} (ID: ${created.id})`);

        // Create audit log for created event
        await base('Audit Log').create({
          fields: {
            event_type: 'created',
            prospect_id: created.id,
            email: prospect.business_email,
            legal_name: prospect.legal_name,
            segment: score.segment,
            timestamp: new Date().toISOString(),
            details: 'Lead imported from CSV migration',
          },
        });

        // Create audit log for scored event
        await base('Audit Log').create({
          fields: {
            event_type: 'scored',
            prospect_id: created.id,
            email: prospect.business_email,
            legal_name: prospect.legal_name,
            score: score.score,
            segment: score.segment,
            priority: score.priority,
            timestamp: new Date().toISOString(),
            details: `Lead scored via Claude API (service_fit=${score.service_fit}, intent=${score.intent_signal})`,
          },
        });

        console.log(`  ✓ Logged created + scored events for ${prospect.legal_name}\n`);
      } catch (error) {
        console.error(`✗ Failed to save ${prospect.legal_name}:`, error.message);
      }
    }

    // Summary
    console.log('\n=== Test Summary ===');
    console.log(`CSV Records: ${csvRecords.length}`);
    console.log(`Enriched: ${enrichedRecords.length}`);
    console.log(`Successfully Scored: ${successfulScores.length}`);
    console.log(`Saved to Airtable: ${airtableRecords.length}`);
    console.log(`Audit Log Entries Created: ${airtableRecords.length * 2}`);
    console.log('\n✓ Flow 0 test completed successfully');
  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    process.exit(1);
  }
}

// Run test
testFlow0();
