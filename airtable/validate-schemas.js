/**
 * Validate All Airtable Schemas
 * Ensures all schema files are properly formatted and complete
 */

import { CLIENTS_SCHEMA } from './schema-clients.js';
import { CONTRACTS_SCHEMA } from './schema-contracts.js';
import { SUBS_STAGING_SCHEMA } from './schema-subs-staging.js';
import { PRICE_BENCHMARK_SCHEMA } from './schema-price-benchmark.js';

const SCHEMAS = [
  CLIENTS_SCHEMA,
  CONTRACTS_SCHEMA,
  SUBS_STAGING_SCHEMA,
  PRICE_BENCHMARK_SCHEMA
];

function validateSchema(schema) {
  const errors = [];

  if (!schema.baseName) {
    errors.push('Missing baseName');
  }

  if (!Array.isArray(schema.tables)) {
    errors.push('tables must be an array');
    return errors;
  }

  schema.tables.forEach((table, tableIdx) => {
    if (!table.name) {
      errors.push(`Table ${tableIdx}: missing name`);
    }

    if (!Array.isArray(table.fields)) {
      errors.push(`Table ${tableIdx} (${table.name}): fields must be an array`);
      return;
    }

    table.fields.forEach((field, fieldIdx) => {
      if (!field.name) {
        errors.push(`Table ${tableIdx}.${fieldIdx}: missing name`);
      }

      if (!field.type) {
        errors.push(`Table ${tableIdx}.${fieldIdx} (${field.name}): missing type`);
      }

      // Validate select fields have options
      if ((field.type === 'singleSelect' || field.type === 'multipleSelect') && !field.options) {
        errors.push(
          `Table ${tableIdx}.${fieldIdx} (${field.name}): ${field.type} requires options`
        );
      }
    });
  });

  return errors;
}

function main() {
  console.log('====================================');
  console.log('Airtable Schema Validation');
  console.log('====================================\n');

  let totalErrors = 0;
  let totalValid = 0;

  SCHEMAS.forEach(schema => {
    console.log(`Validating: ${schema.baseName}`);
    const errors = validateSchema(schema);

    if (errors.length === 0) {
      console.log(`  ✓ Valid`);
      console.log(`  ├ Tables: ${schema.tables.length}`);
      schema.tables.forEach(table => {
        console.log(`  │ ├ ${table.name}: ${table.fields.length} fields`);
      });
      totalValid++;
    } else {
      console.log(`  ✗ ${errors.length} error(s):`);
      errors.forEach(err => {
        console.log(`  │ - ${err}`);
      });
      totalErrors += errors.length;
    }

    console.log();
  });

  console.log('====================================');
  console.log('Summary');
  console.log('====================================');
  console.log(`Valid schemas: ${totalValid}/${SCHEMAS.length}`);

  if (totalErrors > 0) {
    console.log(`Validation errors: ${totalErrors}`);
    process.exit(1);
  }

  console.log('All schemas valid!');
  process.exit(0);
}

main();
