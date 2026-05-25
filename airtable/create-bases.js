/**
 * Create Airtable Bases Script
 * Creates all 4 bases (CLIENTS, CONTRACTS, SUBS_STAGING, PRICE_BENCHMARK) with full schemas
 * Exit code 0 on success, 1 on failure
 */

import Airtable from 'airtable';
import dotenv from 'dotenv';
import { CLIENTS_SCHEMA } from './schema-clients.js';
import { CONTRACTS_SCHEMA } from './schema-contracts.js';
import { SUBS_STAGING_SCHEMA } from './schema-subs-staging.js';
import { PRICE_BENCHMARK_SCHEMA } from './schema-price-benchmark.js';

dotenv.config();

const API_KEY = process.env.AIRTABLE_API_KEY;

if (!API_KEY) {
  console.error('ERROR: AIRTABLE_API_KEY environment variable not set');
  console.error('Set AIRTABLE_API_KEY in .env file with your Airtable API token');
  process.exit(1);
}

console.log(`Using API Key: ${API_KEY.substring(0, 10)}...`);


// Initialize Airtable
Airtable.configure({ apiKey: API_KEY });
const base = Airtable.base('meta');

const SCHEMAS = [
  CLIENTS_SCHEMA,
  CONTRACTS_SCHEMA,
  SUBS_STAGING_SCHEMA,
  PRICE_BENCHMARK_SCHEMA
];

/**
 * Convert schema field types to Airtable API format
 */
function getFieldConfig(field) {
  const config = { name: field.name };

  switch (field.type) {
    case 'singleLineText':
      config.type = 'singleLineText';
      break;
    case 'multilineText':
      config.type = 'multilineText';
      break;
    case 'email':
      config.type = 'email';
      break;
    case 'url':
      config.type = 'url';
      break;
    case 'phoneNumber':
      config.type = 'phoneNumber';
      break;
    case 'number':
      config.type = 'number';
      break;
    case 'currency':
      config.type = 'currency';
      config.options = { precision: 2 };
      break;
    case 'percent':
      config.type = 'percent';
      break;
    case 'date':
      config.type = 'date';
      break;
    case 'createdTime':
      config.type = 'createdTime';
      break;
    case 'lastModifiedTime':
      config.type = 'lastModifiedTime';
      break;
    case 'checkbox':
      config.type = 'checkbox';
      break;
    case 'singleSelect':
      config.type = 'singleSelect';
      config.options = {
        choices: field.options.map(opt => ({ name: opt.name }))
      };
      break;
    case 'multipleSelect':
      config.type = 'multipleSelect';
      config.options = {
        choices: field.options.map(opt => ({ name: opt.name }))
      };
      break;
    default:
      config.type = 'singleLineText';
  }

  return config;
}

/**
 * Create a single base with tables and fields
 */
async function createBase(schema) {
  console.log(`\nCreating base: ${schema.baseName}`);

  try {
    // Create base payload
    const basePayload = {
      name: schema.baseName,
      tables: schema.tables.map(table => ({
        name: table.name,
        fields: table.fields
          .filter(f => f.name !== 'date_added' && f.name !== 'lastModifiedTime') // Skip system fields
          .map(getFieldConfig)
      }))
    };

    console.log(`  Payload size: ${JSON.stringify(basePayload).length} bytes`);

    // Use Airtable REST API directly for base creation
    // The base creation endpoint uses the meta API
    const response = await fetch('https://api.airtable.com/v0/meta/bases', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(basePayload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${JSON.stringify(responseData)}`);
    }

    const result = responseData;
    console.log(`✓ Base "${schema.baseName}" created successfully`);
    console.log(`  Base ID: ${result.id}`);

    // Log table info
    if (result.tables) {
      result.tables.forEach(table => {
        console.log(`  ├ Table: ${table.name}`);
        if (table.fields) {
          table.fields.forEach(field => {
            console.log(`  │ ├ ${field.name} (${field.type})`);
          });
        }
      });
    }

    return { success: true, baseId: result.id, baseName: schema.baseName };
  } catch (error) {
    console.error(`✗ Failed to create base "${schema.baseName}":`, error.message);
    return { success: false, baseName: schema.baseName, error: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('====================================');
  console.log('Airtable Base Creation Script');
  console.log('====================================');
  console.log(`Creating ${SCHEMAS.length} bases...`);

  const results = [];

  for (const schema of SCHEMAS) {
    const result = await createBase(schema);
    results.push(result);
  }

  // Summary
  console.log('\n====================================');
  console.log('Creation Summary');
  console.log('====================================');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  successful.forEach(r => {
    console.log(`✓ ${r.baseName}: ${r.baseId}`);
  });

  failed.forEach(r => {
    console.log(`✗ ${r.baseName}: ${r.error}`);
  });

  console.log(`\nTotal: ${successful.length}/${results.length} successful`);

  if (failed.length > 0) {
    console.error('\nSome bases failed to create. Check errors above.');
    process.exit(1);
  }

  console.log('\nAll bases created successfully!');
  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
