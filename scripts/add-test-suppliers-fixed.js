#!/usr/bin/env node
/**
 * Add 50 Test Suppliers to Airtable (Fixed)
 * Uses only basic fields that match Airtable schema
 */

const https = require('https');

const CONFIG = {
  AIRTABLE_BASE_ID: 'appZhXnyFiKbnOZLr',
  AIRTABLE_API_KEY: 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92'
};

const TEST_SUPPLIERS = [
  // Florida (SUNBIZ covered)
  { business_name: 'Miami Cleaning Services LLC', state: 'FL', email: 'info@miamicleaning.com', website: 'https://www.miamicleaning.com' },
  { business_name: 'Tampa Bay Construction', state: 'FL', email: 'hello@tampabaycon.com', website: 'https://www.tampabaycon.com' },
  { business_name: 'Fort Myers Facilities Management', state: 'FL', email: 'contact@fmfacilities.com', website: 'https://www.fmfacilities.com' },
  { business_name: 'Jacksonville Industrial Services', state: 'FL', email: 'sales@jaxindustrial.com', website: 'https://www.jaxindustrial.com' },
  { business_name: 'Orlando Commercial Cleaning Co', state: 'FL', email: 'info@orlandoclean.com', website: 'https://www.orlandoclean.com' },

  // California (SOS covered)
  { business_name: 'Los Angeles Construction Group', state: 'CA', email: 'info@laconstruction.com', website: 'https://www.laconstruction.com' },
  { business_name: 'San Francisco Tech Services', state: 'CA', email: 'hello@sftechservices.com', website: 'https://www.sftechservices.com' },
  { business_name: 'San Diego Building Maintenance', state: 'CA', email: 'contact@sdbuildmaint.com', website: 'https://www.sdbuildmaint.com' },
  { business_name: 'Sacramento Facility Services', state: 'CA', email: 'info@sacfacility.com', website: 'https://www.sacfacility.com' },
  { business_name: 'Orange County Janitorial Supply', state: 'CA', email: 'sales@ocjanitorial.com', website: 'https://www.ocjanitorial.com' },

  // Texas (SOS covered)
  { business_name: 'Dallas Commercial Services', state: 'TX', email: 'info@dallascommercial.com', website: 'https://www.dallascommercial.com' },
  { business_name: 'Houston Industrial Solutions', state: 'TX', email: 'hello@houstonindustrial.com', website: 'https://www.houstonindustrial.com' },
  { business_name: 'Austin Facility Management', state: 'TX', email: 'contact@austinfacility.com', website: 'https://www.austinfacility.com' },
  { business_name: 'San Antonio Maintenance Services', state: 'TX', email: 'info@samaintenance.com', website: 'https://www.samaintenance.com' },
  { business_name: 'Fort Worth Construction LLC', state: 'TX', email: 'sales@fwconstruction.com', website: 'https://www.fwconstruction.com' },

  // New York (DOS covered)
  { business_name: 'New York City Cleaning Corp', state: 'NY', email: 'info@nycleaning.com', website: 'https://www.nycleaning.com' },
  { business_name: 'Buffalo Commercial Services', state: 'NY', email: 'hello@buffalocommercial.com', website: 'https://www.buffalocommercial.com' },
  { business_name: 'Rochester Facility Services', state: 'NY', email: 'contact@rochesterfacility.com', website: 'https://www.rochesterfacility.com' },
  { business_name: 'Albany Building Maintenance', state: 'NY', email: 'info@albanybuilding.com', website: 'https://www.albanybuilding.com' },

  // Pennsylvania (SOS covered)
  { business_name: 'Philadelphia Construction Group', state: 'PA', email: 'info@philly-construction.com', website: 'https://www.phillycon.com' },
  { business_name: 'Pittsburgh Cleaning Services', state: 'PA', email: 'hello@pittsburghclean.com', website: 'https://www.pittsburghclean.com' },
  { business_name: 'Allentown Facility Management', state: 'PA', email: 'contact@allentownfacility.com', website: 'https://www.allentownfacility.com' },

  // Illinois (SOS covered)
  { business_name: 'Chicago Commercial Cleaning', state: 'IL', email: 'info@chicagoclean.com', website: 'https://www.chicagoclean.com' },
  { business_name: 'Illinois Industrial Services', state: 'IL', email: 'hello@illinoisindustrial.com', website: 'https://www.illinoisindustrial.com' },

  // Ohio (SOS covered)
  { business_name: 'Columbus Facilities Management', state: 'OH', email: 'info@columbusfacility.com', website: 'https://www.columbusfacility.com' },
  { business_name: 'Cleveland Construction Services', state: 'OH', email: 'hello@clevelandconstruction.com', website: 'https://www.clevelandconstruction.com' },

  // Georgia (SOS covered)
  { business_name: 'Atlanta Commercial Services', state: 'GA', email: 'info@atlantacommercial.com', website: 'https://www.atlantacommercial.com' },
  { business_name: 'Georgia Facility Services', state: 'GA', email: 'hello@gafacility.com', website: 'https://www.gafacility.com' },

  // North Carolina (SOS covered)
  { business_name: 'Charlotte Cleaning Solutions', state: 'NC', email: 'info@charlotteclean.com', website: 'https://www.charlotteclean.com' },
  { business_name: 'Raleigh Construction Group', state: 'NC', email: 'hello@raleighconstruction.com', website: 'https://www.raleighconstruction.com' },

  // Michigan (SOS covered)
  { business_name: 'Detroit Facility Management', state: 'MI', email: 'info@detroitfacility.com', website: 'https://www.detroitfacility.com' },
  { business_name: 'Grand Rapids Commercial Services', state: 'MI', email: 'hello@grandrapidscommercial.com', website: 'https://www.grandrapidscommercial.com' },

  // New Jersey (Tier 2 - Scraping)
  { business_name: 'Jersey City Cleaning Services', state: 'NJ', email: 'info@jerseycommercial.com', website: 'https://www.jerseyclean.com' },
  { business_name: 'Newark Facility Solutions', state: 'NJ', email: 'hello@newarkfacility.com', website: 'https://www.newarkfacility.com' },

  // Virginia (Tier 2)
  { business_name: 'Richmond Commercial Cleaning', state: 'VA', email: 'info@richmondclean.com', website: 'https://www.richmondclean.com' },
  { business_name: 'Arlington Facility Services', state: 'VA', email: 'hello@arlingtonfacility.com', website: 'https://www.arlingtonfacility.com' },

  // Washington (Tier 2)
  { business_name: 'Seattle Construction Group', state: 'WA', email: 'info@seattleconstruction.com', website: 'https://www.seattleconstruction.com' },
  { business_name: 'Tacoma Cleaning Services', state: 'WA', email: 'hello@tacomacleaning.com', website: 'https://www.tacomacleaning.com' },

  // Arizona (Tier 2)
  { business_name: 'Phoenix Commercial Cleaning', state: 'AZ', email: 'info@phoenixclean.com', website: 'https://www.phoenixclean.com' },
  { business_name: 'Tucson Facility Management', state: 'AZ', email: 'hello@tucsonfacility.com', website: 'https://www.tucsonfacility.com' },

  // Massachusetts (Tier 2)
  { business_name: 'Boston Cleaning Solutions', state: 'MA', email: 'info@bostonclean.com', website: 'https://www.bostonclean.com' },
  { business_name: 'Worcester Facility Services', state: 'MA', email: 'hello@worcesterfacility.com', website: 'https://www.worcesterfacility.com' },

  // Tennessee (Tier 2)
  { business_name: 'Nashville Commercial Services', state: 'TN', email: 'info@nashvillecommercial.com', website: 'https://www.nashvillecommercial.com' },
  { business_name: 'Memphis Cleaning Services', state: 'TN', email: 'hello@memphisclean.com', website: 'https://www.memphisclean.com' },

  // Missouri (Tier 2)
  { business_name: 'St. Louis Construction Group', state: 'MO', email: 'info@stlouisconstruction.com', website: 'https://www.stlouisconstruction.com' },
  { business_name: 'Kansas City Facility Management', state: 'MO', email: 'hello@kccfacility.com', website: 'https://www.kccfacility.com' },

  // Maryland (Tier 2)
  { business_name: 'Baltimore Commercial Cleaning', state: 'MD', email: 'info@baltimorecommercial.com', website: 'https://www.baltimorecommercial.com' },
  { business_name: 'Annapolis Facility Services', state: 'MD', email: 'hello@annapolisfacility.com', website: 'https://www.annapolisfacility.com' },

  // Wisconsin (Tier 2)
  { business_name: 'Milwaukee Cleaning Solutions', state: 'WI', email: 'info@milwaukeeclean.com', website: 'https://www.milwaukeeclean.com' },
  { business_name: 'Madison Commercial Services', state: 'WI', email: 'hello@madisoncommercial.com', website: 'https://www.madisoncommercial.com' },

  // Colorado (Tier 2)
  { business_name: 'Denver Facility Management', state: 'CO', email: 'info@denverfacility.com', website: 'https://www.denverfacility.com' },
  { business_name: 'Colorado Springs Cleaning', state: 'CO', email: 'hello@coloradospringsclean.com', website: 'https://www.coloradospringsclean.com' }
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
          resolve({ status: res.statusCode, data, text: data });
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
║     Adding 50 Test Suppliers to Airtable (Fixed)              ║
║     Using only schema-verified fields                         ║
╚════════════════════════════════════════════════════════════════╝

Fields being added:
  • business_name (required)
  • state (required)
  • email (optional)
  • website (optional)

Total: 50 suppliers across 20 states
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
        console.log(`❌ [${i + 1}/50] ${supplier.business_name} - Status: ${response.status}`);
        if (response.data?.error) {
          console.log(`   Error: ${JSON.stringify(response.data.error)}`);
        }
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

✅ Successfully added: ${successCount}/50
❌ Failed: ${failureCount}/50

Next: Run enrichment workflows
  node scripts/run-all-enrichment.js
`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
