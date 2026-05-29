#!/usr/bin/env node
/**
 * Insert sample federal opportunities into Airtable
 * (For demonstration when HigherGov API not accessible)
 */

const https = require('https');
const crypto = require('crypto');

const CONFIG = {
  AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY || 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92',
  AIRTABLE_BASE_ID: 'appZhXnyFiKbnOZLr',
  AIRTABLE_TABLE: 'Intelligence'
};

const SAMPLE_OPPORTUNITIES = [
  {
    id: 'SAM-2026-05-001',
    title: 'Florida Highway Bridge Construction and Repairs',
    agency: 'Department of Transportation',
    description: 'Seeking qualified contractors for highway bridge construction, inspection, and repair work in Florida. Must have experience with federal infrastructure projects.',
    deadline: '2026-07-15',
    estimated_value: 8500000,
    naics_codes: ['236200', '236210'],
    place_of_performance: 'Broward County',
    set_asides: ['8(a)', 'Woman-owned'],
    posted_date: '2026-05-20',
    url: 'https://sam.gov/opp/12345-construction-bridges'
  },
  {
    id: 'SAM-2026-05-002',
    title: 'IT Systems Integration and Support Services',
    agency: 'Department of Homeland Security',
    description: 'Integrated IT services including system design, implementation, and ongoing support for federal network infrastructure.',
    deadline: '2026-08-01',
    estimated_value: 3200000,
    naics_codes: ['541511', '541512'],
    place_of_performance: 'Miami-Dade County',
    set_asides: ['HUBZone'],
    posted_date: '2026-05-18',
    url: 'https://sam.gov/opp/12346-it-systems'
  },
  {
    id: 'SAM-2026-05-003',
    title: 'Environmental Compliance and Remediation Services',
    agency: 'Environmental Protection Agency',
    description: 'Environmental site assessments, remediation planning, and implementation services for federal facilities in Southeast region.',
    deadline: '2026-06-30',
    estimated_value: 2100000,
    naics_codes: ['541620', '541710'],
    place_of_performance: 'Hillsborough County',
    set_asides: ['Veteran-owned'],
    posted_date: '2026-05-19',
    url: 'https://sam.gov/opp/12347-environmental'
  },
  {
    id: 'SAM-2026-05-004',
    title: 'Engineering and Design Services for Water Treatment',
    agency: 'Army Corps of Engineers',
    description: 'Professional engineering services for design and planning of water treatment facilities across Florida region.',
    deadline: '2026-07-31',
    estimated_value: 1850000,
    naics_codes: ['541330', '541340'],
    place_of_performance: 'Pinellas County',
    set_asides: [],
    posted_date: '2026-05-17',
    url: 'https://sam.gov/opp/12348-water-engineering'
  },
  {
    id: 'SAM-2026-05-005',
    title: 'Security Services and Personnel',
    agency: 'Department of Justice',
    description: 'Facility security services including personnel, equipment, and technology solutions for federal courthouse in Jacksonville area.',
    deadline: '2026-09-15',
    estimated_value: 4500000,
    naics_codes: ['561612', '561613'],
    place_of_performance: 'Duval County',
    set_asides: ['Woman-owned', 'Small Business'],
    posted_date: '2026-05-16',
    url: 'https://sam.gov/opp/12349-security-services'
  },
  {
    id: 'SAM-2026-05-006',
    title: 'Office Supply and Equipment Delivery',
    agency: 'General Services Administration',
    description: 'Bulk office supplies, furniture, and equipment delivery and installation services for federal offices throughout South Florida.',
    deadline: '2026-06-15',
    estimated_value: 950000,
    naics_codes: ['423420', '421400'],
    place_of_performance: 'Broward County',
    set_asides: [],
    posted_date: '2026-05-14',
    url: 'https://sam.gov/opp/12350-office-supplies'
  },
  {
    id: 'SAM-2026-05-007',
    title: 'Building Maintenance and Janitorial Services',
    agency: 'Department of Interior',
    description: 'Comprehensive building maintenance including janitorial, HVAC, and routine repairs for federal facility in Orlando area.',
    deadline: '2026-10-01',
    estimated_value: 1200000,
    naics_codes: ['561710', '561720'],
    place_of_performance: 'Orange County',
    set_asides: ['8(a)', 'HUBZone'],
    posted_date: '2026-05-15',
    url: 'https://sam.gov/opp/12351-maintenance-janitorial'
  },
  {
    id: 'SAM-2026-05-008',
    title: 'Management Consulting for Operations Improvement',
    agency: 'Department of Labor',
    description: 'Strategic consulting services for operational efficiency improvements and process optimization in regional federal offices.',
    deadline: '2026-08-20',
    estimated_value: 680000,
    naics_codes: ['541618', '541690'],
    place_of_performance: 'Hillsborough County',
    set_asides: ['Veteran-owned'],
    posted_date: '2026-05-13',
    url: 'https://sam.gov/opp/12352-management-consulting'
  },
  {
    id: 'SAM-2026-05-009',
    title: 'Telecommunications Infrastructure Upgrade',
    agency: 'Department of Commerce',
    description: 'Telecommunications system upgrades, network installation, and connectivity improvements for federal agencies.',
    deadline: '2026-07-20',
    estimated_value: 5200000,
    naics_codes: ['541512', '517311'],
    place_of_performance: 'Miami-Dade County',
    set_asides: ['Woman-owned'],
    posted_date: '2026-05-12',
    url: 'https://sam.gov/opp/12353-telecom-infrastructure'
  },
  {
    id: 'SAM-2026-05-010',
    title: 'Facilities Logistics and Supply Chain Management',
    agency: 'Department of Defense',
    description: 'Logistics coordination, inventory management, and supply chain services for military installation support.',
    deadline: '2026-06-25',
    estimated_value: 3800000,
    naics_codes: ['424690', '541512'],
    place_of_performance: 'Polk County',
    set_asides: [],
    posted_date: '2026-05-11',
    url: 'https://sam.gov/opp/12354-facilities-logistics'
  }
];

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

function createUrlHash(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

async function insertIntoAirtable(records) {
  console.log(`\n📤 Inserting ${records.length} sample opportunities into Airtable...\n`);

  let inserted = 0;
  let errors = 0;

  // Insert in batches of 10
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10);

    try {
      const response = await request(
        'POST',
        `https://api.airtable.com/v0/${CONFIG.AIRTABLE_BASE_ID}/${CONFIG.AIRTABLE_TABLE}`,
        {
          'Authorization': `Bearer ${CONFIG.AIRTABLE_API_KEY}`
        },
        { records: batch }
      );

      if (response.status === 200) {
        inserted += batch.length;
        console.log(`✅ Batch ${Math.floor(i / 10) + 1}: Inserted ${batch.length} records`);
      } else {
        errors += batch.length;
        console.error(`❌ Batch error (${response.status}):`, response.data.error?.message);
      }
    } catch (err) {
      errors += batch.length;
      console.error(`❌ Batch error:`, err.message);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return { inserted, errors };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║     Insert Sample Federal Opportunities into Airtable          ║
║     (10 realistic federal contracting opportunities)           ║
╚════════════════════════════════════════════════════════════════╝
`);

  try {
    // Transform sample data (using actual Airtable field names)
    const records = SAMPLE_OPPORTUNITIES.map(opp => ({
      fields: {
        opportunity_id: opp.id,
        title: opp.title,
        agency: opp.agency,
        description: opp.description,
        source: 'sample-data',
        event_date: opp.deadline,  // Using event_date instead of deadline
        total_obligated_amount: opp.estimated_value,  // Using total_obligated_amount instead of estimated_value
        url: opp.url,
        naics_codes: opp.naics_codes.join(','),
        place_of_performance: opp.place_of_performance,
        set_asides: opp.set_asides.join(','),
        record_type: 'Contract',
        url_hash: createUrlHash(opp.url),
        source_data: JSON.stringify(opp),
        prime_contractor: false  // Using prime_contractor checkbox instead of matched
      }
    }));

    // Show sample
    console.log('\n📋 Sample opportunities:\n');
    SAMPLE_OPPORTUNITIES.slice(0, 3).forEach((opp, idx) => {
      console.log(`${idx + 1}. ${opp.title}`);
      console.log(`   Agency: ${opp.agency}`);
      console.log(`   Value: $${opp.estimated_value.toLocaleString()}`);
      console.log(`   Deadline: ${opp.deadline}`);
      console.log(`   Location: ${opp.place_of_performance}`);
      console.log(`   NAICS: ${opp.naics_codes.join(', ')}`);
      console.log('');
    });

    console.log(`... and ${SAMPLE_OPPORTUNITIES.length - 3} more opportunities\n`);

    // Insert
    const results = await insertIntoAirtable(records);

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    DATA INSERTION COMPLETE                    ║
╚════════════════════════════════════════════════════════════════╝

✅ Inserted: ${results.inserted}
❌ Errors: ${results.errors}

All ${results.inserted} opportunities are now in Airtable Intelligence table!

Next: Create suppliers and run matching algorithm
  node scripts/create-test-suppliers.js
  node scripts/run-matcher.js
`);

  } catch (err) {
    console.error('\n❌ Fatal error:', err.message);
    process.exit(1);
  }
}

main();
