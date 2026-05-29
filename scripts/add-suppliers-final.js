#!/usr/bin/env node
const https = require('https');

const CONFIG = {
  AIRTABLE_BASE_ID: 'appZhXnyFiKbnOZLr',
  AIRTABLE_API_KEY: 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92'
};

const SUPPLIERS = [
  { Name: 'Miami Cleaning Services LLC', sub_category: 'FL', business_email: 'info@miamicleaning.com', website: 'https://www.miamicleaning.com' },
  { Name: 'Tampa Bay Construction', sub_category: 'FL', business_email: 'hello@tampabaycon.com', website: 'https://www.tampabaycon.com' },
  { Name: 'Fort Myers Facilities Management', sub_category: 'FL', business_email: 'contact@fmfacilities.com', website: 'https://www.fmfacilities.com' },
  { Name: 'Jacksonville Industrial Services', sub_category: 'FL', business_email: 'sales@jaxindustrial.com', website: 'https://www.jaxindustrial.com' },
  { Name: 'Orlando Commercial Cleaning Co', sub_category: 'FL', business_email: 'info@orlandoclean.com', website: 'https://www.orlandoclean.com' },
  { Name: 'Los Angeles Construction Group', sub_category: 'CA', business_email: 'info@laconstruction.com', website: 'https://www.laconstruction.com' },
  { Name: 'San Francisco Tech Services', sub_category: 'CA', business_email: 'hello@sftechservices.com', website: 'https://www.sftechservices.com' },
  { Name: 'San Diego Building Maintenance', sub_category: 'CA', business_email: 'contact@sdbuildmaint.com', website: 'https://www.sdbuildmaint.com' },
  { Name: 'Sacramento Facility Services', sub_category: 'CA', business_email: 'info@sacfacility.com', website: 'https://www.sacfacility.com' },
  { Name: 'Orange County Janitorial Supply', sub_category: 'CA', business_email: 'sales@ocjanitorial.com', website: 'https://www.ocjanitorial.com' },
  { Name: 'Dallas Commercial Services', sub_category: 'TX', business_email: 'info@dallascommercial.com', website: 'https://www.dallascommercial.com' },
  { Name: 'Houston Industrial Solutions', sub_category: 'TX', business_email: 'hello@houstonindustrial.com', website: 'https://www.houstonindustrial.com' },
  { Name: 'Austin Facility Management', sub_category: 'TX', business_email: 'contact@austinfacility.com', website: 'https://www.austinfacility.com' },
  { Name: 'San Antonio Maintenance Services', sub_category: 'TX', business_email: 'info@samaintenance.com', website: 'https://www.samaintenance.com' },
  { Name: 'Fort Worth Construction LLC', sub_category: 'TX', business_email: 'sales@fwconstruction.com', website: 'https://www.fwconstruction.com' },
  { Name: 'New York City Cleaning Corp', sub_category: 'NY', business_email: 'info@nycleaning.com', website: 'https://www.nycleaning.com' },
  { Name: 'Buffalo Commercial Services', sub_category: 'NY', business_email: 'hello@buffalocommercial.com', website: 'https://www.buffalocommercial.com' },
  { Name: 'Rochester Facility Services', sub_category: 'NY', business_email: 'contact@rochesterfacility.com', website: 'https://www.rochesterfacility.com' },
  { Name: 'Albany Building Maintenance', sub_category: 'NY', business_email: 'info@albanybuilding.com', website: 'https://www.albanybuilding.com' },
  { Name: 'Philadelphia Construction Group', sub_category: 'PA', business_email: 'info@philly-construction.com', website: 'https://www.phillycon.com' },
  { Name: 'Pittsburgh Cleaning Services', sub_category: 'PA', business_email: 'hello@pittsburghclean.com', website: 'https://www.pittsburghclean.com' },
  { Name: 'Allentown Facility Management', sub_category: 'PA', business_email: 'contact@allentownfacility.com', website: 'https://www.allentownfacility.com' },
  { Name: 'Chicago Commercial Cleaning', sub_category: 'IL', business_email: 'info@chicagoclean.com', website: 'https://www.chicagoclean.com' },
  { Name: 'Illinois Industrial Services', sub_category: 'IL', business_email: 'hello@illinoisindustrial.com', website: 'https://www.illinoisindustrial.com' },
  { Name: 'Columbus Facilities Management', sub_category: 'OH', business_email: 'info@columbusfacility.com', website: 'https://www.columbusfacility.com' },
  { Name: 'Cleveland Construction Services', sub_category: 'OH', business_email: 'hello@clevelandconstruction.com', website: 'https://www.clevelandconstruction.com' },
  { Name: 'Atlanta Commercial Services', sub_category: 'GA', business_email: 'info@atlantacommercial.com', website: 'https://www.atlantacommercial.com' },
  { Name: 'Georgia Facility Services', sub_category: 'GA', business_email: 'hello@gafacility.com', website: 'https://www.gafacility.com' },
  { Name: 'Charlotte Cleaning Solutions', sub_category: 'NC', business_email: 'info@charlotteclean.com', website: 'https://www.charlotteclean.com' },
  { Name: 'Raleigh Construction Group', sub_category: 'NC', business_email: 'hello@raleighconstruction.com', website: 'https://www.raleighconstruction.com' },
  { Name: 'Detroit Facility Management', sub_category: 'MI', business_email: 'info@detroitfacility.com', website: 'https://www.detroitfacility.com' },
  { Name: 'Grand Rapids Commercial Services', sub_category: 'MI', business_email: 'hello@grandrapidscommercial.com', website: 'https://www.grandrapidscommercial.com' },
  { Name: 'Jersey City Cleaning Services', sub_category: 'NJ', business_email: 'info@jerseycommercial.com', website: 'https://www.jerseyclean.com' },
  { Name: 'Newark Facility Solutions', sub_category: 'NJ', business_email: 'hello@newarkfacility.com', website: 'https://www.newarkfacility.com' },
  { Name: 'Richmond Commercial Cleaning', sub_category: 'VA', business_email: 'info@richmondclean.com', website: 'https://www.richmondclean.com' },
  { Name: 'Arlington Facility Services', sub_category: 'VA', business_email: 'hello@arlingtonfacility.com', website: 'https://www.arlingtonfacility.com' },
  { Name: 'Seattle Construction Group', sub_category: 'WA', business_email: 'info@seattleconstruction.com', website: 'https://www.seattleconstruction.com' },
  { Name: 'Tacoma Cleaning Services', sub_category: 'WA', business_email: 'hello@tacomacleaning.com', website: 'https://www.tacomacleaning.com' },
  { Name: 'Phoenix Commercial Cleaning', sub_category: 'AZ', business_email: 'info@phoenixclean.com', website: 'https://www.phoenixclean.com' },
  { Name: 'Tucson Facility Management', sub_category: 'AZ', business_email: 'hello@tucsonfacility.com', website: 'https://www.tucsonfacility.com' },
  { Name: 'Boston Cleaning Solutions', sub_category: 'MA', business_email: 'info@bostonclean.com', website: 'https://www.bostonclean.com' },
  { Name: 'Worcester Facility Services', sub_category: 'MA', business_email: 'hello@worcesterfacility.com', website: 'https://www.worcesterfacility.com' },
  { Name: 'Nashville Commercial Services', sub_category: 'TN', business_email: 'info@nashvillecommercial.com', website: 'https://www.nashvillecommercial.com' },
  { Name: 'Memphis Cleaning Services', sub_category: 'TN', business_email: 'hello@memphisclean.com', website: 'https://www.memphisclean.com' },
  { Name: 'St. Louis Construction Group', sub_category: 'MO', business_email: 'info@stlouisconstruction.com', website: 'https://www.stlouisconstruction.com' },
  { Name: 'Kansas City Facility Management', sub_category: 'MO', business_email: 'hello@kccfacility.com', website: 'https://www.kccfacility.com' },
  { Name: 'Baltimore Commercial Cleaning', sub_category: 'MD', business_email: 'info@baltimorecommercial.com', website: 'https://www.baltimorecommercial.com' },
  { Name: 'Annapolis Facility Services', sub_category: 'MD', business_email: 'hello@annapolisfacility.com', website: 'https://www.annapolisfacility.com' },
  { Name: 'Milwaukee Cleaning Solutions', sub_category: 'WI', business_email: 'info@milwaukeeclean.com', website: 'https://www.milwaukeeclean.com' },
  { Name: 'Madison Commercial Services', sub_category: 'WI', business_email: 'hello@madisoncommercial.com', website: 'https://www.madisoncommercial.com' },
  { Name: 'Denver Facility Management', sub_category: 'CO', business_email: 'info@denverfacility.com', website: 'https://www.denverfacility.com' },
  { Name: 'Colorado Springs Cleaning', sub_category: 'CO', business_email: 'hello@coloradospringsclean.com', website: 'https://www.coloradospringsclean.com' }
];

function request(method, url, body) {
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

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║     Adding 50 Suppliers to Airtable                           ║
╚════════════════════════════════════════════════════════════════╝
`);

  let successCount = 0;

  for (let i = 0; i < SUPPLIERS.length; i++) {
    const supplier = SUPPLIERS[i];
    const payload = {
      records: [{
        fields: {
          'Name': supplier.Name,
          'sub_category': supplier.sub_category,
          'business_email': supplier.business_email,
          'website': supplier.website
        }
      }]
    };

    try {
      const response = await request(
        'POST',
        `https://api.airtable.com/v0/${CONFIG.AIRTABLE_BASE_ID}/Suppliers`,
        payload
      );

      if (response.status === 200) {
        console.log(`✅ [${i + 1}/${SUPPLIERS.length}] ${supplier.Name}`);
        successCount++;
      } else {
        console.log(`⚠️  [${i + 1}/${SUPPLIERS.length}] ${supplier.Name} - Status ${response.status}`);
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (err) {
      console.log(`❌ [${i + 1}/${SUPPLIERS.length}] Error: ${err.message}`);
    }
  }

  console.log(`\n✅ Successfully added: ${successCount}/50 suppliers\n`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
