#!/usr/bin/env node

/**
 * Validate Hunter.io Setup
 * Checks configuration, credentials, and provides setup instructions
 * Usage: node scripts/validate-hunter-setup.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

// Load environment
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const HUNTER_API_KEY = process.env.HUNTER_API_KEY;
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

function printHeader(text) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${text}`);
  console.log('='.repeat(60));
}

function checkmark(condition, label) {
  const icon = condition ? '✓' : '✗';
  const color = condition ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';
  console.log(`${color}${icon}${reset} ${label}`);
}

function printSection(title) {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
}

function main() {
  printHeader('Hunter.io Setup Validation');

  // Check 1: .env file exists
  printSection('1. Configuration Files');
  checkmark(fs.existsSync(envPath), '.env file exists');
  checkmark(fs.existsSync(envExamplePath), '.env.example file exists');

  // Check 2: Environment variables
  printSection('2. Environment Variables');
  checkmark(!!HUNTER_API_KEY, 'HUNTER_API_KEY is set');
  if (HUNTER_API_KEY) {
    const masked = HUNTER_API_KEY.substring(0, 6) + '...' + HUNTER_API_KEY.substring(HUNTER_API_KEY.length - 4);
    console.log(`   Value: ${masked}`);
    console.log(`   Length: ${HUNTER_API_KEY.length} characters`);
  }

  checkmark(!!GOOGLE_PLACES_API_KEY, 'GOOGLE_PLACES_API_KEY is set (optional)');

  // Check 3: Required dependencies
  printSection('3. Required Dependencies');
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  let packageJson = {};
  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  } catch (e) {
    console.log('✗ Could not read package.json');
  }

  checkmark(packageJson.dependencies?.axios, 'axios (HTTP client)');
  checkmark(packageJson.dependencies?.dotenv, 'dotenv (environment loader)');

  // Check 4: API Routes
  printSection('4. API Integration');
  const enrichRouteFile = path.join(__dirname, '..', 'app', 'api', 'enrich', 'route.ts');
  checkmark(fs.existsSync(enrichRouteFile), '/api/enrich route exists');

  const enrichmentStrategyFile = path.join(__dirname, '..', 'lib', 'enrichment-strategy.ts');
  checkmark(fs.existsSync(enrichmentStrategyFile), 'enrichment-strategy.ts exists');

  // Check 5: Test scripts
  printSection('5. Test Scripts');
  const testScript = path.join(__dirname, 'test-hunter-enrichment.js');
  checkmark(fs.existsSync(testScript), 'test-hunter-enrichment.js exists');

  // Check 6: Documentation
  printSection('6. Documentation');
  const docsPath = path.join(__dirname, '..', 'docs', 'HUNTER_IO_SETUP.md');
  checkmark(fs.existsSync(docsPath), 'HUNTER_IO_SETUP.md exists');

  // Summary
  printSection('Summary');

  const allConfigured =
    fs.existsSync(envPath) &&
    !!HUNTER_API_KEY &&
    fs.existsSync(enrichRouteFile) &&
    fs.existsSync(enrichmentStrategyFile);

  if (allConfigured) {
    console.log('\n✓ Hunter.io integration is configured and ready!\n');
    console.log('Next steps:');
    console.log('1. Run the connectivity test:');
    console.log('   node scripts/test-hunter-enrichment.js\n');
    console.log('2. Start the development server:');
    console.log('   npm run dev\n');
    console.log('3. Test the API endpoint:');
    console.log('   curl -X POST http://localhost:3000/api/enrich \\');
    console.log("     -d '{\"companyName\": \"Google\"}'");
  } else if (!!HUNTER_API_KEY) {
    console.log('\n⚠ Hunter.io API key is configured.');
    console.log('The enrichment routes are ready to use.\n');

    if (!HUNTER_API_KEY) {
      console.log('To activate Hunter.io enrichment:');
      console.log('1. Sign up at https://hunter.io');
      console.log('2. Copy your API key');
      console.log('3. Add to .env:');
      console.log('   HUNTER_API_KEY=your-api-key-here\n');
    }
  } else {
    console.log('\n⚠ Hunter.io is not yet activated.\n');
    console.log('To set up Hunter.io enrichment:');
    console.log('1. Sign up at https://hunter.io (free plan = 100 req/month)');
    console.log('2. Go to Settings → API and copy your API key');
    console.log('3. Add to .env file:');
    console.log('   HUNTER_API_KEY=your-api-key-here');
    console.log('4. Save and run: npm run dev');
    console.log('5. Test: node scripts/test-hunter-enrichment.js\n');
  }

  // Links
  printSection('Useful Links');
  console.log('- Hunter.io: https://hunter.io');
  console.log('- API Documentation: https://hunter.io/api-documentation');
  console.log('- API Dashboard: https://hunter.io/account/api');
  console.log('- Pricing: https://hunter.io/pricing');
  console.log('- Status: https://status.hunter.io');

  printHeader('Validation Complete');
}

main();
