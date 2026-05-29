#!/usr/bin/env node
/**
 * Add 50 Test Suppliers to Airtable
 * Real company names, diverse states, realistic data
 */

const https = require('https');

const CONFIG = {
  AIRTABLE_BASE_ID: 'appZhXnyFiKbnOZLr',
  AIRTABLE_API_KEY: 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92'
};

const TEST_SUPPLIERS = [
  // Florida (SUNBIZ covered)
  { business_name: 'Miami Cleaning Services LLC', state: 'FL', city: 'Miami', email: 'info@miamicleaning.com', website: 'https://www.miamicleaning.com' },
  { business_name: 'Tampa Bay Construction', state: 'FL', city: 'Tampa', email: 'hello@tampabaycon.com', website: 'https://www.tampabaycon.com' },
  { business_name: 'Fort Myers Facilities Management', state: 'FL', city: 'Fort Myers', email: 'contact@fmfacilities.com', website: 'https://www.fmfacilities.com' },
  { business_name: 'Jacksonville Industrial Services', state: 'FL', city: 'Jacksonville', email: 'sales@jaxindustrial.com', website: 'https://www.jaxindustrial.com' },
  { business_name: 'Orlando Commercial Cleaning Co', state: 'FL', city: 'Orlando', email: 'info@orlandoclean.com', website: 'https://www.orlandoclean.com' },

  // California (SOS covered)
  { business_name: 'Los Angeles Construction Group', state: 'CA', city: 'Los Angeles', email: 'info@laconstruction.com', website: 'https://www.laconstruction.com' },
  { business_name: 'San Francisco Tech Services', state: 'CA', city: 'San Francisco', email: 'hello@sftechservices.com', website: 'https://www.sftechservices.com' },
  { business_name: 'San Diego Building Maintenance', state: 'CA', city: 'San Diego', email: 'contact@sdbuildmaint.com', website: 'https://www.sdbuildmaint.com' },
  { business_name: 'Sacramento Facility Services', state: 'CA', city: 'Sacramento', email: 'info@sacfacility.com', website: 'https://www.sacfacility.com' },
  { business_name: 'Orange County Janitorial Supply', state: 'CA', city: 'Orange County', email: 'sales@ocjanitorial.com', website: 'https://www.ocjanitorial.com' },

  // Texas (SOS covered)
  { business_name: 'Dallas Commercial Services', state: 'TX', city: 'Dallas', email: 'info@dallascommercial.com', website: 'https://www.dallascommercial.com' },
  { business_name: 'Houston Industrial Solutions', state: 'TX', city: 'Houston', email: 'hello@houstonindustrial.com', website: 'https://www.houstonindustrial.com' },
  { business_name: 'Austin Facility Management', state: 'TX', city: 'Austin', email: 'contact@austinfacility.com', website: 'https://www.austinfacility.com' },
  { business_name: 'San Antonio Maintenance Services', state: 'TX', city: 'San Antonio', email: 'info@samaintenance.com', website: 'https://www.samaintenance.com' },
  { business_name: 'Fort Worth Construction LLC', state: 'TX', city: 'Fort Worth', email: 'sales@fwconstruction.com', website: 'https://www.fwconstruction.com' },

  // New York (DOS covered)
  { business_name: 'New York City Cleaning Corp', state: 'NY', city: 'New York', email: 'info@nycleaning.com', website: 'https://www.nycleaning.com' },
  { business_name: 'Buffalo Commercial Services', state: 'NY', city: 'Buffalo', email: 'hello@buffalocommercial.com', website: 'https://www.buffalocommercial.com' },
  { business_name: 'Rochester Facility Services', state: 'NY', city: 'Rochester', email: 'contact@rochesterfacility.com', website: 'https://www.rochesterfacility.com' },
  { business_name: 'Albany Building Maintenance', state: 'NY', city: 'Albany', email: 'info@albanybuilding.com', website: 'https://www.albanybuilding.com' },

  // Pennsylvania (SOS covered)
  { business_name: 'Philadelphia Construction Group', state: 'PA', city: 'Philadelphia', email: 'info@philly-construction.com', website: 'https://www.phillycon.com' },
  { business_name: 'Pittsburgh Cleaning Services', state: 'PA', city: 'Pittsburgh', email: 'hello@pittsburghclean.com', website: 'https://www.pittsburghclean.com' },
  { business_name: 'Allentown Facility Management', state: 'PA', city: 'Allentown', email: 'contact@allentownfacility.com', website: 'https://www.allentownfacility.com' },

  // Illinois (SOS covered)
  { business_name: 'Chicago Commercial Cleaning', state: 'IL', city: 'Chicago', email: 'info@chicagoclean.com', website: 'https://www.chicagoclean.com' },
  { business_name: 'Illinois Industrial Services', state: 'IL', city: 'Chicago', email: 'hello@illinoisindustrial.com', website: 'https://www.illinoisindustrial.com' },

  // Ohio (SOS covered)
  { business_name: 'Columbus Facilities Management', state: 'OH', city: 'Columbus', email: 'info@columbusfacility.com', website: 'https://www.columbusfacility.com' },
  { business_name: 'Cleveland Construction Services', state: 'OH', city: 'Cleveland', email: 'hello@clevelandconstruction.com', website: 'https://www.clevelandconstruction.com' },

  // Georgia (SOS covered)
  { business_name: 'Atlanta Commercial Services', state: 'GA', city: 'Atlanta', email: 'info@atlantacommercial.com', website: 'https://www.atlantacommercial.com' },
  { business_name: 'Georgia Facility Services', state: 'GA', city: 'Atlanta', email: 'hello@gafacility.com', website: 'https://www.gafacility.com' },

  // North Carolina (SOS covered)
  { business_name: 'Charlotte Cleaning Solutions', state: 'NC', city: 'Charlotte', email: 'info@charlotteclean.com', website: 'https://www.charlotteclean.com' },
  { business_name: 'Raleigh Construction Group', state: 'NC', city: 'Raleigh', email: 'hello@raleighconstruction.com', website: 'https://www.raleighconstruction.com' },

  // Michigan (SOS covered)
  { business_name: 'Detroit Facility Management', state: 'MI', city: 'Detroit', email: 'info@detroitfacility.com', website: 'https://www.detroitfacility.com' },
  { business_name: 'Grand Rapids Commercial Services', state: 'MI', city: 'Grand Rapids', email: 'hello@grandrapidscommercial.com', website: 'https://www.grandrapidscommercial.com' },

  // New Jersey (Tier 2 - Scraping)
  { business_name: 'Jersey City Cleaning Services', state: 'NJ', city: 'Jersey City', email: 'info@jerseycommercial.com', website: 'https://www.jerseyclean.com' },
  { business_name: 'Newark Facility Solutions', state: 'NJ', city: 'Newark', email: 'hello@newarkfacility.com', website: 'https://www.newarkfacility.com' },

  // Virginia (Tier 2)
  { business_name: 'Richmond Commercial Cleaning', state: 'VA', city: 'Richmond', email: 'info@richmondclean.com', website: 'https://www.richmondclean.com' },
  { business_name: 'Arlington Facility Services', state: 'VA', city: 'Arlington', email: 'hello@arlingtonfacility.com', website: 'https://www.arlingtonfacility.com' },

  // Washington (Tier 2)
  { business_name: 'Seattle Construction Group', state: 'WA', city: 'Seattle', email: 'info@seattleconstruction.com', website: 'https://www.seattleconstruction.com' },
  { business_name: 'Tacoma Cleaning Services', state: 'WA', city: 'Tacoma', email: 'hello@tacomacleaning.com', website: 'https://www.tacomacleaning.com' },

  // Arizona (Tier 2)
  { business_name: 'Phoenix Commercial Cleaning', state: 'AZ', city: 'Phoenix', email: 'info@phoenixclean.com', website: 'https://www.phoenixclean.com' },
  { business_name: 'Tucson Facility Management', state: 'AZ', city: 'Tucson', email: 'hello@tucsonfacility.com', website: 'https://www.tucsonfacility.com' },

  // Massachusetts (Tier 2)
  { business_name: 'Boston Cleaning Solutions', state: 'MA', city: 'Boston', email: 'info@bostonclean.com', website: 'https://www.bostonclean.com' },
  { business_name: 'Worcester Facility Services', state: 'MA', city: 'Worcester', email: 'hello@worcesterfacility.com', website: 'https://www.worcesterfacility.com' },

  // Tennessee (Tier 2)
  { business_name: 'Nashville Commercial Services', state: 'TN', city: 'Nashville', email: 'info@nashvillecommercial.com', website: 'https://www.nashvillecommercial.com' },
  { business_name: 'Memphis Cleaning Services', state: 'TN', city: 'Memphis', email: 'hello@memphisclean.com', website: 'https://www.memphisclean.com' },

  // Missouri (Tier 2)
  { business_name: 'St. Louis Construction Group', state: 'MO', city: 'St. Louis', email: 'info@stlouisconstruction.com', website: 'https://www.stlouisconstruction.com' },
  { business_name: 'Kansas City Facility Management', state: 'MO', city: 'Kansas City', email: 'hello@kccfacility.com', website: 'https://www.kccfacility.com' },

  // Maryland (Tier 2)
  { business_name: 'Baltimore Commercial Cleaning', state: 'MD', city: 'Baltimore', email: 'info@baltimorecommercial.com', website: 'https://www.baltimorecommercial.com' },
  { business_name: 'Annapolis Facility Services', state: 'MD', city: 'Annapolis', email: 'hello@annapolisfacility.com', website: 'https://www.annapolisfacility.com' },

  // Wisconsin (Tier 2)
  { business_name: 'Milwaukee Cleaning Solutions', state: 'WI', city: 'Milwaukee', email: 'info@milwaukeeclean.com', website: 'https://www.milwaukeeclean.com' },
  { business_name: 'Madison Commercial Services', state: 'WI', city: 'Madison', email: 'hello@madisoncommercial.com', website: 'https://www.madisoncommercial.com' },

  // Colorado (Tier 2)
  { business_name: 'Denver Facility Management', state: 'CO', city: 'Denver', email: 'info@denverfacility.com', website: 'https://www.denverfacility.com' },
  { business_name: 'Colorado Springs Cleaning', state: 'CO', city: 'Colorado Springs', email: 'hello@coloradospringsclean.com', website: 'https://www.coloradospringsclean.com' }
];

function request(method, url, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${CONFIG.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
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

async function addSupplier(supplier) {
  const payload = {
    records: [{
      fields: {
        'business_name': supplier.business_name,
        'state': supplier.state,
        'city': supplier.city,
        'email': supplier.email,
        'website': supplier.website
      }
    }]
  };

  const response = await request(
    'POST',
    `https://api.airtable.com/v0/${CONFIG.AIRTABLE_BASE_ID}/Suppliers`,
    payload
  );

  return response;
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║     Adding 50 Test Suppliers to Airtable                      ║
║     Distribution: All states with deployed workflows           ║
║     Ready for enrichment testing                               ║
╚════════════════════════════════════════════════════════════════╝

Adding suppliers by state:
  • Florida (5)
  • California (5)
  • Texas (5)
  • New York (4)
  • Pennsylvania (3)
  • Illinois (2)
  • Ohio (2)
  • Georgia (2)
  • North Carolina (2)
  • Michigan (2)
  • New Jersey (2) - Tier 2
  • Virginia (2) - Tier 2
  • Washington (2) - Tier 2
  • Arizona (2) - Tier 2
  • Massachusetts (2) - Tier 2
  • Tennessee (2) - Tier 2
  • Missouri (2) - Tier 2
  • Maryland (2) - Tier 2
  • Wisconsin (2) - Tier 2
  • Colorado (2) - Tier 2

Total: 50 suppliers
Cost: $0
Time: ~30-60 seconds

Starting...
`);

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < TEST_SUPPLIERS.length; i++) {
    const supplier = TEST_SUPPLIERS[i];
    try {
      const response = await addSupplier(supplier);

      if (response.status === 200) {
        console.log(`✅ [${i + 1}/50] ${supplier.business_name} (${supplier.state})`);
        successCount++;
      } else {
        console.log(`❌ [${i + 1}/50] ${supplier.business_name} - Error: ${response.status}`);
        failureCount++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err) {
      console.log(`❌ [${i + 1}/50] ${supplier.business_name} - Error: ${err.message}`);
      failureCount++;
    }
  }

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║              SUPPLIERS ADDED TO AIRTABLE                      ║
╚════════════════════════════════════════════════════════════════╝

✅ Added: ${successCount}/50
❌ Failed: ${failureCount}/50

Distribution by Tier:
  ✅ TIER 1 States (State APIs): 30 suppliers
     • FL (5), CA (5), TX (5), NY (4), PA (3), IL (2), OH (2), GA (2), NC (2), MI (2)

  ✅ TIER 2 States (Web Scraping): 20 suppliers
     • NJ (2), VA (2), WA (2), AZ (2), MA (2), TN (2), MO (2), MD (2), WI (2), CO (2)

Ready for enrichment workflows!

Next: Run all enrichment tiers:
  1. TIER 1: State APIs
  2. TIER 2: Web Scraping
  3. TIER 3: Website Extraction (already live)
  4. TIER 4: Google Validation (already live)
  5. TIER 5: LinkedIn Discovery (already live)

Estimated enrichment time: <2 minutes per supplier
Total for 50 suppliers: ~2 hours

Run enrichment with:
  node scripts/run-all-enrichment.js
`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
