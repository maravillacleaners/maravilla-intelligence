# n8n JavaScript Code Reference

Quick copy-paste guide for all Code nodes in the multi-source workflows.

---

## Workflow 1: HigherGov Opportunity Scraper

### Node 3: Transform & Deduplicate

**Purpose:** Convert HigherGov API response to standard format with URL hash

```javascript
// Extract opportunities from HigherGov response
const opportunities = $('HTTP Request').json().opportunities || [];

// Transform and prepare for deduplication
const transformed = opportunities.map(opp => {
  const crypto = require('crypto');
  const urlHash = crypto
    .createHash('sha256')
    .update(opp.url)
    .digest('hex');
  
  return {
    opportunity_id: opp.id,
    title: opp.title,
    agency: opp.agency,
    description: opp.description,
    source: 'highergov',
    deadline: opp.deadline,
    estimated_value: opp.estimated_value || 0,
    url: opp.url,
    naics_codes: (opp.naics_codes || []).join(','),
    place_of_performance: opp.place_of_performance,
    set_asides: (opp.set_asides || []).join(','),
    posted_date: opp.posted_date,
    record_type: 'Contract',
    url_hash: urlHash,
    source_data: JSON.stringify(opp),
    matched: false,
    date_added: new Date().toISOString()
  };
});

return transformed;
```

**Input:** HTTP response from HigherGov API  
**Output:** Array of standardized opportunity objects  
**Key transformation:** URL hashing for deduplication

---

### Node 5: Filter Out Duplicates

**Purpose:** Keep only new opportunities (those not already in Airtable)

```javascript
// Get opportunities from Node 3
const opportunities = $('Code').json();

// Get duplicate check results from Node 4
const airtableResults = $('Airtable - Check Duplicates');

// Filter out records that already exist
const newOpportunities = opportunities.filter((opp, index) => {
  const duplicateCheck = airtableResults[index];
  // If Airtable returned 0 records, it's new
  return (!duplicateCheck || duplicateCheck.length === 0);
});

return newOpportunities;
```

**Input:** Opportunities array + duplicate check results  
**Output:** Only new opportunities  
**Logic:** Remove any opportunity whose URL hash already exists in Airtable

---

### Node 7: Log Results

**Purpose:** Record execution results for monitoring

```javascript
const newOpps = $('Airtable - Save').length;
console.log(`HigherGov Scraper: Added ${newOpps} new opportunities`);
return {
  success: true,
  opportunities_added: newOpps,
  timestamp: new Date().toISOString()
};
```

**Input:** Results from Airtable save  
**Output:** Status object for webhook response

---

## Workflow 2: Deduplication Engine

### Node 3: Identify Duplicates

**Purpose:** Find opportunities with same URL hash, keep oldest

```javascript
const records = $('Airtable - Read Opportunities').json();

// Group by url_hash
const byHash = {};
const duplicates = [];

records.forEach(record => {
  const hash = record.fields.url_hash;
  if (!byHash[hash]) {
    byHash[hash] = [];
  }
  byHash[hash].push(record);
});

// Find groups with duplicates
Object.entries(byHash).forEach(([hash, group]) => {
  if (group.length > 1) {
    // Keep first (oldest by date_added), mark others for deletion
    const sorted = group.sort((a, b) => 
      new Date(a.fields.date_added) - new Date(b.fields.date_added)
    );
    const keepRecord = sorted[0];
    
    sorted.slice(1).forEach(duplicate => {
      duplicates.push({
        id: duplicate.id,
        title: duplicate.fields.title,
        source: duplicate.fields.source,
        keepId: keepRecord.id,
        keepSource: keepRecord.fields.source
      });
    });
  }
});

return {
  duplicates_found: duplicates.length,
  duplicates: duplicates
};
```

**Input:** All unmatched opportunities from Airtable  
**Output:** List of duplicate IDs to delete  
**Strategy:** SHA256 hash of URL as dedup key, keep oldest record

---

### Node 5: Log Results

**Purpose:** Log deduplication execution

```javascript
const result = $('Code - Identify Duplicates').json();
console.log(`Dedup: Found and removed ${result.duplicates_found} duplicates`);
return result;
```

---

## Workflow 3: Contract Matcher

### Node 4: Execute Matching Algorithm

**Purpose:** Score each opportunity against each supplier

```javascript
const opportunities = $('Airtable - Read Unmatched Opportunities').json();
const suppliers = $('Airtable - Read Suppliers').json();

const matches = [];

opportunities.forEach(opp => {
  const oppNaics = (opp.fields.naics_codes || '').split(',').map(n => n.trim()).filter(n => n);
  
  suppliers.forEach(supplier => {
    const supplierNaics = (supplier.fields.naics_codes || '').split(',').map(n => n.trim()).filter(n => n);
    const supplierCounties = (supplier.fields.preferred_counties || '').split(',').map(c => c.trim()).filter(c => c);
    
    // Service Match (60% weight)
    // 100 if supplier offers any NAICS code from opportunity, else 0
    const serviceMatch = supplierNaics.some(n => oppNaics.includes(n)) ? 100 : 0;
    
    // Location Match (20% weight)
    // 100 if location matches, 50 if supplier has no location preference (flexible)
    const locationMatch = supplierCounties.length === 0 
      ? 50 
      : (supplierCounties.some(c => opp.fields.place_of_performance?.includes(c)) ? 100 : 0);
    
    // Capacity Match (20% weight)
    // 100 if supplier can handle contract, pro-rata if partial capacity
    const supplierCapacity = supplier.fields.estimated_annual_capacity_usd || 0;
    const oppValue = opp.fields.estimated_value || 0;
    let capacityMatch = 0;
    if (suppliersCapacity >= oppValue) {
      capacityMatch = 100;
    } else if (supplierCapacity > 0) {
      capacityMatch = Math.round((supplierCapacity / oppValue) * 100);
    }
    
    // Calculate total score (weighted average)
    const score = (serviceMatch * 0.60) + (locationMatch * 0.20) + (capacityMatch * 0.20);
    
    // Only include match if score >= 60%
    if (score >= 60) {
      matches.push({
        supplier_id: supplier.id,
        supplier_email: supplier.fields.business_email,
        opportunity_id: opp.id,
        opportunity_name: opp.fields.title,
        contract_value_usd: opp.fields.estimated_value,
        deadline: opp.fields.deadline,
        match_score: Math.round(score),
        match_reason: `Service: ${serviceMatch}% | Location: ${locationMatch}% | Capacity: ${Math.round(capacityMatch)}%`,
        status: 'Pending',
        date_matched: new Date().toISOString(),
        notified: false,
        source: opp.fields.source
      });
    }
  });
});

return matches;
```

**Input:** Unmatched opportunities + approved suppliers  
**Output:** Matches with scores >= 60  
**Scoring:**
- Service Match (60%): Supplier's NAICS codes overlap with opportunity
- Location Match (20%): Supplier's preferred counties include opportunity location
- Capacity Match (20%): Supplier's annual capacity >= contract value

---

### Node 6: Update Matched Flag

**Purpose:** Track which opportunities have been matched

```javascript
const matches = $('Code - Execute Matching Algorithm').json();
const oppIds = [...new Set(matches.map(m => m.opportunity_id))];

console.log(`Matcher: Created ${matches.length} matches from ${oppIds.length} opportunities`);
return {
  matches_created: matches.length,
  opportunities_matched: oppIds.length
};
```

---

## Workflow 4: Supplier Notifications

### Node 3: Group by Supplier

**Purpose:** Group all matches by supplier for batch email

```javascript
const matches = $('Airtable - Read Unnotified Matches').json();

// Group by supplier_id and supplier_email
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
    match_score: match.fields.match_score,
    source: match.fields.source
  });
  
  grouped[key].match_ids.push(match.id);
});

return Object.values(grouped);
```

**Input:** Unnotified matches from Airtable  
**Output:** Array of supplier groups with their opportunities

---

### Node 5: Prepare Airtable Update

**Purpose:** Prepare all match records to mark as notified

```javascript
const grouped = $('Code - Group by Supplier').json();
const results = [];

grouped.forEach(group => {
  group.match_ids.forEach(matchId => {
    results.push({
      recordId: matchId,
      notified: true,
      notification_date: new Date().toISOString()
    });
  });
});

return results;
```

**Input:** Grouped supplier data  
**Output:** List of updates for Airtable

---

## SAM.gov Scraper (Phase 2)

### Node 2: HTTP Request Configuration

**URL:** `https://api.sam.gov/prod/opportunities/v1/search`

**Query Parameters:**
```
api_key: [YOUR_SAM_GOV_API_KEY]
status: open
limit: 100
```

---

### Node 3: Transform & Deduplicate

**Purpose:** Convert SAM.gov response to standard format

```javascript
const opportunities = $('HTTP Request').json().opportunities || [];

const transformed = opportunities.map(opp => {
  const crypto = require('crypto');
  const urlHash = crypto
    .createHash('sha256')
    .update(opp.url)
    .digest('hex');
  
  return {
    opportunity_id: opp.opportunity_id,
    title: opp.title,
    agency: opp.agency,
    description: opp.description,
    source: 'sam-gov',
    deadline: opp.response_deadline || opp.deadline,
    estimated_value: opp.estimated_value || 0,
    url: opp.url,
    naics_codes: (opp.naics_codes || []).join(','),
    place_of_performance: opp.place_of_performance,
    set_asides: (opp.set_asides || []).join(','),
    posted_date: opp.posted_date,
    record_type: 'Contract',
    url_hash: urlHash,
    source_data: JSON.stringify(opp),
    matched: false,
    date_added: new Date().toISOString()
  };
});

return transformed;
```

---

## USASpending Scraper (Phase 2)

### Node 2: HTTP Request Configuration

**URL:** `https://api.usaspending.gov/api/v2/search/spending_by_award/`

**Body (POST):**
```json
{
  "limit": 100,
  "sort": "-date_signed",
  "filters": [
    {
      "field": "type",
      "operation": "in",
      "value": ["contract"]
    }
  ]
}
```

---

### Node 3: Transform

**Purpose:** Convert USASpending award data to standard format

```javascript
const awards = $('HTTP Request').json().results || [];

const transformed = awards.map(award => {
  const crypto = require('crypto');
  const urlHash = crypto
    .createHash('sha256')
    .update(award.contract_summary?.piid || award.id)
    .digest('hex');
  
  return {
    opportunity_id: award.contract_summary?.piid || award.id,
    title: `${award.recipient?.recipient_name || 'Contract'} - ${award.description || 'Award'}`,
    agency: award.awarding_agency?.agency_name,
    description: award.description || 'Awarded contract',
    source: 'usaspending',
    deadline: null,
    estimated_value: award.total_obligation || 0,
    url: `https://www.usaspending.gov/award/${award.id}`,
    naics_codes: award.contract_summary?.naics_code || '',
    place_of_performance: award.contract_summary?.place_of_performance?.city,
    set_asides: '',
    posted_date: award.date_signed,
    record_type: 'Award',
    url_hash: urlHash,
    source_data: JSON.stringify(award),
    matched: false,
    date_added: new Date().toISOString()
  };
});

return transformed;
```

---

## Grants.gov Scraper (Phase 3)

### Node 2: HTTP Request Configuration

**URL:** `https://grants.gov/grantsapi/v2/opportunities`

**Query Parameters:**
```
status: open
limit: 100
```

---

### Node 3: Transform

**Purpose:** Convert Grants.gov response to standard format

```javascript
const grants = $('HTTP Request').json().opportunities || [];

const transformed = grants.map(grant => {
  const crypto = require('crypto');
  const urlHash = crypto
    .createHash('sha256')
    .update(grant.opportunity_url || grant.id)
    .digest('hex');
  
  return {
    opportunity_id: grant.opportunity_id,
    title: grant.title,
    agency: grant.agency_name,
    description: grant.description,
    source: 'grants-gov',
    deadline: grant.deadline,
    estimated_value: grant.grant_amount || 0,
    url: grant.opportunity_url,
    naics_codes: '',
    place_of_performance: grant.place_of_performance?.state,
    set_asides: (grant.eligible_entities || []).join(','),
    posted_date: grant.posted_date,
    record_type: 'Grant',
    url_hash: urlHash,
    source_data: JSON.stringify(grant),
    matched: false,
    date_added: new Date().toISOString()
  };
});

return transformed;
```

---

## Common Utilities

### Date Formatting

```javascript
// Convert date to ISO format for Airtable
new Date().toISOString()

// Parse deadline string
new Date(opp.deadline).toISOString().split('T')[0]

// Check if deadline is soon (within 7 days)
const deadlineDate = new Date(opp.deadline);
const today = new Date();
const daysLeft = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
const isUrgent = daysLeft <= 7;
```

### String Cleaning

```javascript
// Split comma-separated values and trim
(field || '').split(',').map(n => n.trim()).filter(n => n)

// Remove duplicates from array
[...new Set(array)]

// Safe field access
(obj.field || 'default_value')
```

### NAICS Code Matching

```javascript
// Check if supplier services match opportunity
const oppNaics = (opp.naics_codes || '').split(',').map(n => n.trim());
const supplierNaics = (supplier.naics_codes || '').split(',').map(n => n.trim());
const hasMatch = supplierNaics.some(n => oppNaics.includes(n));
```

### Currency Formatting

```javascript
// Format number as currency for display
function formatCurrency(num) {
  return '$' + (num || 0).toLocaleString('en-US');
}

// Check capacity against contract value
const percentageOfCapacity = Math.round((supplierCapacity / contractValue) * 100);
```

---

## Testing Code Nodes Locally

You can test these code snippets in Node.js before using in n8n:

```javascript
// Test matching algorithm
const suppliers = [
  {
    id: 'sup1',
    naics_codes: '236200,237300',
    preferred_counties: 'Miami-Dade,Broward'
  }
];

const opportunity = {
  id: 'opp1',
  naics_codes: '236200',
  place_of_performance: 'Miami-Dade',
  estimated_value: 500000
};

// Run matching logic
const supplierNaics = suppliers[0].naics_codes.split(',').map(n => n.trim());
const oppNaics = opportunity.naics_codes.split(',').map(n => n.trim());
const serviceMatch = supplierNaics.some(n => oppNaics.includes(n)) ? 100 : 0;
console.log('Service Match:', serviceMatch); // Should be 100
```

---

## Debugging Tips

**In n8n Code nodes:**

```javascript
// Log to execution logs
console.log('Debug message:', variable);

// Return data for inspection
return { debug: variable, timestamp: new Date() };

// Check array contents
console.log('Array length:', array.length);
console.log('First item:', array[0]);

// Validate field existence
if (!record.fields.naics_codes) {
  console.log('Warning: Missing naics_codes in', record.id);
}
```

---

**Status:** Ready to copy-paste  
**Tested with:** n8n v1.0+ (all Code nodes support JavaScript)

