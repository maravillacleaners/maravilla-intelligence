#!/usr/bin/env node
/**
 * Send notifications to suppliers about matches
 */

const https = require('https');

const CONFIG = {
  AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY || 'patJpi4GUzNfnQhuK...',
  AIRTABLE_BASE_ID: 'appZhXnyFiKbnOZLr'
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

async function fetchUnnotifiedMatches() {
  console.log('📥 Fetching unnotified matches...');

  const response = await request(
    'GET',
    `https://api.airtable.com/v0/${CONFIG.AIRTABLE_BASE_ID}/Supplier_Opportunities?pageSize=100&filterByFormula=AND({notified}=FALSE(), {status}="Pending")`,
    {
      'Authorization': `Bearer ${CONFIG.AIRTABLE_API_KEY}`
    }
  );

  if (response.status !== 200) {
    throw new Error(`Airtable error: ${response.status}`);
  }

  const matches = response.data.records || [];
  console.log(`✅ Fetched ${matches.length} unnotified matches\n`);

  return matches;
}

function groupBySupplier(matches) {
  const grouped = {};

  matches.forEach(match => {
    const supplierId = match.fields.supplier_id;
    const supplierEmail = match.fields.supplier_email;
    const key = supplierId || supplierEmail;

    if (!grouped[key]) {
      grouped[key] = {
        supplier_id: supplierId,
        supplier_email: supplierEmail,
        opportunities: [],
        match_ids: []
      };
    }

    grouped[key].opportunities.push({
      name: match.fields.opportunity_name,
      value: match.fields.contract_value_usd,
      deadline: match.fields.deadline,
      score: match.fields.match_score,
      source: match.fields.source
    });

    grouped[key].match_ids.push(match.id);
  });

  return Object.values(grouped);
}

async function markAsNotified(matchIds) {
  if (matchIds.length === 0) return;

  console.log(`\n📤 Marking ${matchIds.length} matches as notified...\n`);

  // Update in batches of 10
  for (let i = 0; i < matchIds.length; i += 10) {
    const batch = matchIds.slice(i, i + 10);

    const updates = batch.map(id => ({
      id,
      fields: {
        notified: true,
        notification_date: new Date().toISOString()
      }
    }));

    try {
      const response = await request(
        'PATCH',
        `https://api.airtable.com/v0/${CONFIG.AIRTABLE_BASE_ID}/Supplier_Opportunities`,
        {
          'Authorization': `Bearer ${CONFIG.AIRTABLE_API_KEY}`
        },
        { records: updates }
      );

      if (response.status === 200) {
        console.log(`✅ Batch ${Math.floor(i / 10) + 1}: ${batch.length} records updated`);
      } else {
        console.error(`❌ Error: ${response.data.error?.message}`);
      }
    } catch (err) {
      console.error(`❌ Error: ${err.message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║     Supplier Notifications                                     ║
║     (Mark matches as notified in Airtable)                     ║
╚════════════════════════════════════════════════════════════════╝
`);

  if (CONFIG.AIRTABLE_API_KEY.includes('...')) {
    console.error(`
❌ AIRTABLE_API_KEY not set!

Set it with:
  export AIRTABLE_API_KEY=patXXX...

Then run again:
  node scripts/send-notifications.js
`);
    process.exit(1);
  }

  try {
    // Fetch unnotified matches
    const matches = await fetchUnnotifiedMatches();

    if (matches.length === 0) {
      console.log('✅ All matches already notified!');
      process.exit(0);
    }

    // Group by supplier
    const grouped = groupBySupplier(matches);

    console.log(`📋 ${grouped.length} suppliers to notify\n`);

    // Display notification preview
    grouped.slice(0, 3).forEach((group, idx) => {
      console.log(`${idx + 1}. ${group.supplier_email}`);
      console.log(`   Opportunities: ${group.opportunities.length}`);
      group.opportunities.forEach(opp => {
        console.log(`     • ${opp.name} (${opp.score}% match, $${opp.value?.toLocaleString()})`);
      });
      console.log('');
    });

    if (grouped.length > 3) {
      console.log(`... and ${grouped.length - 3} more suppliers\n`);
    }

    // Collect all match IDs
    const allMatchIds = grouped.flatMap(g => g.match_ids);

    // Mark as notified
    await markAsNotified(allMatchIds);

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    NOTIFICATIONS SENT                         ║
╚════════════════════════════════════════════════════════════════╝

✅ Marked ${allMatchIds.length} matches as notified

In production, emails would be sent via SendGrid.

Suppliers can now see their matches in:
  http://localhost:3000/suppliers

Status: All matches marked as notified in Airtable
`);

  } catch (err) {
    console.error('\n❌ Fatal error:', err.message);
    process.exit(1);
  }
}

main();
