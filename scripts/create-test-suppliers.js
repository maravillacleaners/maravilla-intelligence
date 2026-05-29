#!/usr/bin/env node
/**
 * Create test suppliers in Airtable for matching
 */

const https = require('https');

const CONFIG = {
  AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY || 'patJpi4GUzNfnQhuK...',
  AIRTABLE_BASE_ID: 'appZhXnyFiKbnOZLr',
  AIRTABLE_TABLE: 'Suppliers'
};

function request(method, url, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = https.request(urlObj, options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch {
          resolve({
            status: res.statusCode,
            data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const TEST_SUPPLIERS = [
  {
    legal_name: 'Federal Construction Services LLC',
    contact_name: 'Maria Rodriguez',
    business_email: 'maria@fedconstruct.com',
    phone: '(305) 555-1234',
    naics_codes: '236200,236210,237310',
    preferred_counties: 'Miami-Dade,Broward,Palm Beach',
    estimated_annual_capacity_usd: 5000000,
    registration_status: 'Approved',
    website: 'https://fedconstruct.example.com',
    sub_category: 'General Contractor'
  },
  {
    legal_name: 'Advanced Engineering Solutions Inc',
    contact_name: 'James Chen',
    business_email: 'james@adveng.com',
    phone: '(813) 555-2345',
    naics_codes: '541330,541340,541360',
    preferred_counties: 'Hillsborough,Pinellas,Polk',
    estimated_annual_capacity_usd: 3000000,
    registration_status: 'Approved',
    website: 'https://adveng.example.com',
    sub_category: 'Engineering Firm'
  },
  {
    legal_name: 'Technology Staffing Partners',
    contact_name: 'Sarah Johnson',
    business_email: 'sarah@techstaff.com',
    phone: '(904) 555-3456',
    naics_codes: '541511,541512,541519',
    preferred_counties: 'Duval,Clay,Nassau',
    estimated_annual_capacity_usd: 2000000,
    registration_status: 'Approved',
    website: 'https://techstaff.example.com',
    sub_category: 'IT Services'
  },
  {
    legal_name: 'Women-Owned Supply Chain Services',
    contact_name: 'Patricia Williams',
    business_email: 'patricia@womenowned.com',
    phone: '(407) 555-4567',
    naics_codes: '424990,541500,423900',
    preferred_counties: 'Orange,Osceola,Seminole',
    estimated_annual_capacity_usd: 1500000,
    registration_status: 'Approved',
    website: 'https://womenowned.example.com',
    sub_category: 'Supply Chain Management'
  },
  {
    legal_name: 'Veteran-Owned Consulting Group',
    contact_name: 'Michael Thompson',
    business_email: 'michael@vetconsult.com',
    phone: '(239) 555-5678',
    naics_codes: '541618,541690,541990',
    preferred_counties: 'Lee,Collier,Charlotte',
    estimated_annual_capacity_usd: 2500000,
    registration_status: 'Approved',
    website: 'https://vetconsult.example.com',
    sub_category: 'Management Consulting'
  }
];

async function createSuppliers() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║     Creating Test Suppliers in Airtable                        ║
║     (for matching with opportunities)                          ║
╚════════════════════════════════════════════════════════════════╝
`);

  if (CONFIG.AIRTABLE_API_KEY.includes('...')) {
    console.error(`
❌ AIRTABLE_API_KEY not set!

Set it with:
  export AIRTABLE_API_KEY=patXXX...

Then run again:
  node scripts/create-test-suppliers.js
`);
    process.exit(1);
  }

  console.log(`\n📤 Creating ${TEST_SUPPLIERS.length} test suppliers...\n`);

  let created = 0;
  let errors = 0;

  // Create each supplier
  for (const supplier of TEST_SUPPLIERS) {
    try {
      const response = await request(
        'POST',
        `https://api.airtable.com/v0/${CONFIG.AIRTABLE_BASE_ID}/${CONFIG.AIRTABLE_TABLE}`,
        {
          'Authorization': `Bearer ${CONFIG.AIRTABLE_API_KEY}`
        },
        {
          records: [
            {
              fields: {
                ...supplier,
                date_registered: new Date().toISOString()
              }
            }
          ]
        }
      );

      if (response.status === 200) {
        created++;
        console.log(`✅ ${supplier.legal_name}`);
      } else {
        errors++;
        console.error(`❌ ${supplier.legal_name}: ${response.data.error?.message}`);
      }
    } catch (err) {
      errors++;
      console.error(`❌ ${supplier.legal_name}: ${err.message}`);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    SUPPLIERS CREATED                          ║
╚════════════════════════════════════════════════════════════════╝

✅ Created: ${created}
❌ Errors: ${errors}

Test suppliers with various:
  • NAICS codes (construction, engineering, IT, supply chain)
  • Geographic preferences (Miami, Tampa, Jacksonville, Orlando, Fort Myers)
  • Capacity levels ($1.5M - $5M annually)
  • Business types (contractor, engineer, IT, women-owned, veteran-owned)

Next step - run the matcher:

  node scripts/run-matcher.js

This will match opportunities to these suppliers and show you results.
`);
}

createSuppliers().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
