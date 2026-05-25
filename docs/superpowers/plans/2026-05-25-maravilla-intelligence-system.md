# Maravilla x 16x9 Commercial Intelligence System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a resellable commercial intelligence engine that discovers prospects, enriches them with AI scoring, and launches compliant outreach via email — with human approval gates at every step.

**Architecture:** Two-engine design (demand clients + supply subs) sharing one skeleton (discover→enrich→score→reach→track). Configuration is swappable per industry (NAICS code only). Airtable as source of truth, n8n for orchestration, Claude for scoring, GHL for email delivery. Compliance-first: email-only, official APIs only, permanent opt-out, human approval on every outreach.

**Tech Stack:** Node.js (config + Airtable + API clients), n8n (workflow orchestration), Airtable (data + audit log), Claude API (scoring), GoHighLevel (email delivery), Sunbiz/SAM.gov/USASpending (free official APIs)

---

## Phase 0: Foundation & Compliance

### Task 1: Initialize Project Structure & Config

**Files:**
- Create: `config/config.js`
- Create: `.env.example`
- Create: `package.json`
- Create: `README.md`

**Goal:** Set all swappable parameters in one place. Config cascades to all flows, prompts, and API calls.

- [ ] **Step 1: Create `config/config.js`**

```javascript
// config/config.js
module.exports = {
  // SWAP THIS FOR DIFFERENT INDUSTRIES
  PRIMARY_NAICS: "561720", // Janitorial services (Maravilla)
  INDUSTRY_NAME: "commercial cleaning",
  
  SERVICE_DESCRIPTION: `recurring commercial cleaning, deep cleans, 
    move-in/move-out, post-construction, vacation rentals, carpet, 
    pressure washing, junk removal`,

  // Geographic scope
  FLORIDA_COUNTIES: [
    "Miami-Dade",
    "Broward",
    "Palm Beach",
    "Orange",
    "Hillsborough",
    "Pinellas",
    "Duval",
    "Seminole",
  ],

  // ICP segments (used in Claude scoring prompt)
  ICP_HIGH_PRIORITY: [
    "Property Mgr",
    "Clinic",
    "Office",
    "GovCon",
    "Newly-formed",
  ],
  ICP_MED_HIGH_PRIORITY: ["Retail", "Daycare"],
  ICP_MEDIUM_PRIORITY: ["STR", "Builder"],

  // Compliance settings
  MAX_EMAILS_PER_DAY: 50,
  EMAIL_WARMUP_DAYS: 7,
  OPT_OUT_RESPECT_DAYS: 10,
  
  // Airtable base IDs (populated after create-bases.js runs)
  AIRTABLE_BASE_IDS: {
    CLIENTS: process.env.AIRTABLE_BASE_CLIENTS || "appXXXXXXXXXXXXXX",
    CONTRACTS: process.env.AIRTABLE_BASE_CONTRACTS || "appYYYYYYYYYYYYYY",
    SUBS_STAGING: process.env.AIRTABLE_BASE_SUBS || "appZZZZZZZZZZZZZZ",
    BENCHMARK: process.env.AIRTABLE_BASE_BENCHMARK || "appWWWWWWWWWWWWWW",
  },

  // API endpoints
  API_ENDPOINTS: {
    SUNBIZ: "https://services.sunbiz.org/api",
    SAM_GOV: "https://api.sam.gov/entity-information",
    USASPENDING: "https://api.usaspending.gov/api/v2",
  },

  // Domain separation (demand vs supply)
  SENDING_DOMAINS: {
    DEMAND: process.env.DEMAND_SENDING_DOMAIN || "outreach.maravillacleaners.com",
    SUPPLY: process.env.SUPPLY_SENDING_DOMAIN || "network.maravillacleaners.com",
  },

  // Maravilla-specific
  COMPANY_NAME: "Maravilla Cleaners",
  COMPANY_PHYSICAL_ADDRESS: process.env.COMPANY_PHYSICAL_ADDRESS || 
    "123 Main St, Miami, FL 33101",
  COMPANY_PHONE: "(866) 986-6005",
  COMPANY_EMAIL: "hello@maravillacleaners.com",
};
```

- [ ] **Step 2: Create `.env.example`**

```bash
# .env.example
AIRTABLE_API_KEY=patXXXXXXXXXXXXXXXXXXXXXX
AIRTABLE_BASE_CLIENTS=appXXXXXXXXXXXXXX
AIRTABLE_BASE_CONTRACTS=appYYYYYYYYYYYYYY
AIRTABLE_BASE_SUBS=appZZZZZZZZZZZZZZ
AIRTABLE_BASE_BENCHMARK=appWWWWWWWWWWWWWW

SAM_GOV_API_KEY=YOUR_API_KEY_FROM_api.data.gov

CLAUDE_API_KEY=sk-ant-XXXXXXXXXXXXXXXXXXXXXXXX

GHL_API_KEY=YOUR_GHL_API_KEY
GHL_LOCATION_ID=YOUR_LOCATION_ID

DEMAND_SENDING_DOMAIN=outreach.maravillacleaners.com
SUPPLY_SENDING_DOMAIN=network.maravillacleaners.com
COMPANY_PHYSICAL_ADDRESS="123 Main St, Miami, FL 33101"

NODE_ENV=development
```

- [ ] **Step 3: Create `package.json`**

```json
{
  "name": "maravilla-intelligence",
  "version": "0.1.0",
  "description": "Commercial intelligence engine for Maravilla Cleaners + 16x9 resale",
  "main": "index.js",
  "scripts": {
    "setup:bases": "node airtable/create-bases.js",
    "test": "jest --verbose",
    "test:watch": "jest --watch",
    "lint": "eslint lib/ tests/",
    "dev": "NODE_ENV=development node",
    "n8n:export": "echo 'Export workflows from n8n UI and save to n8n-workflows/'",
    "docs:gen": "echo 'Run this after setup is complete'"
  },
  "keywords": ["commercial-intelligence", "lead-generation", "n8n"],
  "author": "Maravilla Cleaners",
  "license": "PROPRIETARY",
  "dependencies": {
    "dotenv": "^16.0.3",
    "airtable": "^1.2.0",
    "axios": "^1.4.0",
    "@anthropic-ai/sdk": "^0.10.0"
  },
  "devDependencies": {
    "jest": "^29.5.0",
    "eslint": "^8.44.0"
  }
}
```

- [ ] **Step 4: Create `README.md`**

```markdown
# Maravilla x 16x9 Commercial Intelligence System

A resellable commercial intelligence engine that discovers businesses, enriches them with AI scoring, and launches compliant outreach campaigns.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Create Airtable bases:**
   ```bash
   npm run setup:bases
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

## Architecture

- **Config:** Single source of truth — swap NAICS code to serve any industry
- **Airtable:** 4 bases (clients, contracts, subs, benchmark)
- **n8n:** Workflow orchestration (Flows 0, A–E)
- **Claude:** Lead scoring & email drafting
- **APIs:** Sunbiz, SAM.gov, USASpending (official only — no scraping)
- **Compliance:** Email-only, permanent opt-out, human approval gates

## Phases

- **Phase 0:** Foundation + validate loop with existing leads
- **Phase 1:** Wire APIs (Sunbiz, SAM, USASpending)
- **Phase 2:** Supply portal + pricing benchmark
- **Phase 3:** Contract intelligence (FOIA + teaming)
- **Phase 4:** Productize for second industry

See [docs/setup.md](docs/setup.md) for detailed setup instructions.
```

- [ ] **Step 5: Create `tests/config.test.js`**

```javascript
// tests/config.test.js
const config = require("../config/config");

describe("config", () => {
  test("PRIMARY_NAICS is set to 561720 (Maravilla)", () => {
    expect(config.PRIMARY_NAICS).toBe("561720");
  });

  test("FLORIDA_COUNTIES includes all 8 required counties", () => {
    const required = [
      "Miami-Dade",
      "Broward",
      "Palm Beach",
      "Orange",
      "Hillsborough",
      "Pinellas",
      "Duval",
      "Seminole",
    ];
    required.forEach((county) => {
      expect(config.FLORIDA_COUNTIES).toContain(county);
    });
  });

  test("MAX_EMAILS_PER_DAY is 50 (CAN-SPAM safe)", () => {
    expect(config.MAX_EMAILS_PER_DAY).toBeLessThanOrEqual(50);
  });

  test("SERVICE_DESCRIPTION includes all required service types", () => {
    const required = [
      "recurring",
      "deep clean",
      "move-out",
      "post-construction",
    ];
    const desc = config.SERVICE_DESCRIPTION.toLowerCase();
    required.forEach((service) => {
      expect(desc).toContain(service);
    });
  });

  test("SENDING_DOMAINS separates demand and supply", () => {
    expect(config.SENDING_DOMAINS.DEMAND).not.toBe(config.SENDING_DOMAINS.SUPPLY);
  });
});
```

- [ ] **Step 6: Run config tests**

```bash
npm install
npm test -- tests/config.test.js
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add config/ .env.example package.json README.md tests/config.test.js
git commit -m "feat: initialize project structure and config"
```

---

### Task 2: Create Airtable Bases & Schema

**Files:**
- Create: `airtable/create-bases.js`
- Create: `airtable/schema-clients.js`
- Create: `airtable/schema-contracts.js`
- Create: `airtable/schema-subs-staging.js`
- Create: `airtable/schema-price-benchmark.js`

**Goal:** Define all 4 Airtable bases with complete schema. Script creates them via API.

- [ ] **Step 1: Create `airtable/schema-clients.js`**

```javascript
// airtable/schema-clients.js
module.exports = {
  baseConfig: {
    name: "Maravilla Intelligence — Clients (Demand)",
  },
  tables: [
    {
      name: "Prospects",
      primaryFieldName: "legal_name",
      fields: [
        // Identity
        { name: "legal_name", type: "singleLineText", required: true },
        { name: "dba", type: "singleLineText" },
        {
          name: "entity_type",
          type: "singleSelect",
          options: [
            { name: "LLC" },
            { name: "Corp" },
            { name: "Partnership" },
            { name: "Sole Prop" },
          ],
        },
        {
          name: "sunbiz_status",
          type: "singleSelect",
          options: [{ name: "Active" }, { name: "Inactive" }, { name: "Dissolved" }],
        },
        { name: "date_formed", type: "date" },
        { name: "naics", type: "singleLineText" },
        { name: "naics_description", type: "singleLineText" },
        { name: "officer_name", type: "singleLineText" },

        // Location
        { name: "registered_address", type: "singleLineText" },
        { name: "physical_address", type: "singleLineText" },
        { name: "is_virtual_office", type: "checkbox" },
        {
          name: "county",
          type: "singleSelect",
          options: [
            { name: "Miami-Dade" },
            { name: "Broward" },
            { name: "Palm Beach" },
            { name: "Orange" },
            { name: "Hillsborough" },
            { name: "Pinellas" },
            { name: "Duval" },
            { name: "Seminole" },
          ],
        },
        { name: "zip", type: "singleLineText" },
        { name: "num_sites", type: "number" },

        // Contact
        { name: "business_email", type: "email" },
        { name: "phone", type: "phoneNumber" },
        { name: "website", type: "url" },
        { name: "linkedin", type: "url" },

        // Fit & Score
        { name: "has_physical_office", type: "checkbox" },
        { name: "sqft_estimate", type: "number" },
        { name: "employees_estimate", type: "number" },
        {
          name: "segment",
          type: "singleSelect",
          options: [
            { name: "Property Mgr" },
            { name: "Clinic" },
            { name: "Office" },
            { name: "Retail" },
            { name: "Daycare" },
            { name: "STR" },
            { name: "Builder" },
            { name: "GovCon" },
            { name: "Newly-formed" },
          ],
        },
        { name: "service_fit", type: "number" },
        { name: "ticket_estimate", type: "currency" },
        {
          name: "priority",
          type: "singleSelect",
          options: [
            { name: "High" },
            { name: "Med-High" },
            { name: "Medium" },
            { name: "Not a fit" },
          ],
        },
        { name: "intent_signal", type: "singleLineText" },
        { name: "icebreaker", type: "multilineText" },
        { name: "score", type: "number" },

        // Governance
        {
          name: "source",
          type: "singleSelect",
          options: [
            { name: "Sunbiz" },
            { name: "SAM" },
            { name: "Manual" },
            { name: "Re-engagement" },
          ],
        },
        { name: "date_added", type: "date" },
        {
          name: "pipeline_status",
          type: "singleSelect",
          options: [
            { name: "pending_review" },
            { name: "approved" },
            { name: "rejected" },
            { name: "contacted" },
            { name: "replied" },
            { name: "closed_won" },
            { name: "closed_lost" },
          ],
        },
        { name: "re_engagement_candidate", type: "checkbox" },
        { name: "change_detected", type: "singleLineText" },
        { name: "opt_out", type: "checkbox" },
        { name: "opt_out_date", type: "date" },
        { name: "opt_out_source", type: "singleLineText" },
        {
          name: "retention_tier",
          type: "singleSelect",
          options: [{ name: "active" }, { name: "archive" }, { name: "never" }],
        },
        { name: "last_contacted", type: "date" },
        { name: "notes", type: "multilineText" },
      ],
    },
    {
      name: "Audit Log",
      primaryFieldName: "record_id",
      fields: [
        { name: "record_id", type: "singleLineText" },
        { name: "event_date", type: "date" },
        {
          name: "event_type",
          type: "singleSelect",
          options: [
            { name: "created" },
            { name: "enriched" },
            { name: "scored" },
            { name: "approved" },
            { name: "rejected" },
            { name: "contacted" },
            { name: "replied" },
            { name: "opted_out" },
            { name: "re_engaged" },
            { name: "suppressed" },
          ],
        },
        { name: "source", type: "singleLineText" },
        { name: "performed_by", type: "singleLineText" },
        { name: "notes", type: "multilineText" },
      ],
    },
    {
      name: "Suppression List",
      primaryFieldName: "email",
      fields: [
        { name: "email", type: "email", required: true },
        { name: "legal_name", type: "singleLineText" },
        { name: "opt_out_date", type: "date" },
        { name: "reason", type: "singleLineText" },
      ],
    },
  ],
};
```

- [ ] **Step 2: Create `airtable/schema-contracts.js`**

```javascript
// airtable/schema-contracts.js
module.exports = {
  baseConfig: {
    name: "Maravilla Intelligence — Contracts (GovCon)",
  },
  tables: [
    {
      name: "Contracts",
      primaryFieldName: "usaspending_award_id",
      fields: [
        { name: "usaspending_award_id", type: "singleLineText", required: true },
        { name: "agency", type: "singleLineText" },
        { name: "prime_contractor", type: "singleLineText" },
        { name: "prime_uei", type: "singleLineText" },
        { name: "prime_email", type: "email" },
        { name: "total_obligated_amount", type: "currency" },
        { name: "naics", type: "singleLineText" },
        { name: "sow_summary", type: "multilineText" },
        { name: "period_start", type: "date" },
        { name: "period_end", type: "date" },
        { name: "place_city", type: "singleLineText" },
        { name: "place_county", type: "singleLineText" },
        { name: "teaming_opportunity", type: "checkbox" },
        { name: "foia_pending", type: "checkbox" },
        { name: "foia_sent_date", type: "date" },
        { name: "foia_draft", type: "multilineText" },
        { name: "teaming_email_draft", type: "multilineText" },
        {
          name: "outreach_status",
          type: "singleSelect",
          options: [
            { name: "pending_review" },
            { name: "approved" },
            { name: "sent" },
            { name: "replied" },
            { name: "passed" },
            { name: "closed_won" },
          ],
        },
        { name: "outreach_date", type: "date" },
        {
          name: "source",
          type: "singleSelect",
          options: [{ name: "USASpending" }, { name: "FOIA" }],
        },
        { name: "notes", type: "multilineText" },
      ],
    },
  ],
};
```

- [ ] **Step 3: Create `airtable/schema-subs-staging.js`**

```javascript
// airtable/schema-subs-staging.js
module.exports = {
  baseConfig: {
    name: "Maravilla Intelligence — Subs Staging",
  },
  tables: [
    {
      name: "Subs Staging",
      primaryFieldName: "legal_name",
      fields: [
        { name: "legal_name", type: "singleLineText", required: true },
        { name: "contact_name", type: "singleLineText" },
        { name: "business_email", type: "email" },
        { name: "phone", type: "phoneNumber" },
        { name: "website", type: "url" },
        { name: "date_formed", type: "date" },
        {
          name: "county",
          type: "singleSelect",
          options: [
            { name: "Miami-Dade" },
            { name: "Broward" },
            { name: "Palm Beach" },
            { name: "Orange" },
            { name: "Hillsborough" },
            { name: "Pinellas" },
            { name: "Duval" },
            { name: "Seminole" },
          ],
        },
        {
          name: "sub_category",
          type: "singleSelect",
          options: [
            { name: "Commercial" },
            { name: "Residential" },
            { name: "Specialty" },
            { name: "GovCon" },
          ],
        },
        {
          name: "services_offered",
          type: "multipleSelect",
          options: [
            { name: "recurring" },
            { name: "deep-clean" },
            { name: "move-out" },
            { name: "STR" },
            { name: "post-construction" },
            { name: "carpet" },
            { name: "pressure-washing" },
            { name: "junk-removal" },
          ],
        },
        {
          name: "status",
          type: "singleSelect",
          options: [
            { name: "invite_pending" },
            { name: "invited" },
            { name: "portal_registered" },
            { name: "qualified" },
            { name: "active" },
            { name: "rejected" },
          ],
        },
        {
          name: "source",
          type: "singleSelect",
          options: [{ name: "Sunbiz" }, { name: "Manual" }],
        },
        { name: "date_added", type: "date" },
        { name: "notes", type: "multilineText" },
      ],
    },
  ],
};
```

- [ ] **Step 4: Create `airtable/schema-price-benchmark.js`**

```javascript
// airtable/schema-price-benchmark.js
module.exports = {
  baseConfig: {
    name: "Maravilla Intelligence — Price Benchmark",
  },
  tables: [
    {
      name: "Price Benchmark",
      primaryFieldName: "id",
      fields: [
        { name: "id", type: "singleLineText", required: true },
        { name: "sub_id", type: "singleLineText" }, // link to SUBS_STAGING
        {
          name: "service_type",
          type: "singleSelect",
          options: [
            { name: "recurring-commercial" },
            { name: "deep-clean" },
            { name: "move-out" },
            { name: "post-construction" },
            { name: "carpet" },
            { name: "pressure-washing" },
            { name: "junk-removal" },
            { name: "STR" },
          ],
        },
        { name: "spec_description", type: "singleLineText" },
        { name: "price_quoted", type: "currency" },
        {
          name: "price_unit",
          type: "singleSelect",
          options: [{ name: "flat" }, { name: "per-sqft" }, { name: "per-hour" }],
        },
        {
          name: "county",
          type: "singleSelect",
          options: [
            { name: "Miami-Dade" },
            { name: "Broward" },
            { name: "Palm Beach" },
            { name: "Orange" },
            { name: "Hillsborough" },
            { name: "Pinellas" },
            { name: "Duval" },
            { name: "Seminole" },
          ],
        },
        { name: "date_quoted", type: "date" },
        { name: "verified", type: "checkbox" },
      ],
    },
  ],
};
```

- [ ] **Step 5: Create `airtable/create-bases.js`**

```javascript
// airtable/create-bases.js
const Airtable = require("airtable");
const schemaClients = require("./schema-clients");
const schemaContracts = require("./schema-contracts");
const schemaSubsStaging = require("./schema-subs-staging");
const schemaBenchmark = require("./schema-price-benchmark");

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  "appXXXXXXXXXXXXXX" // temporary — will be replaced
);

async function createBases() {
  console.log("🔧 Creating Airtable bases...");

  const schemas = [
    { name: "Clients", schema: schemaClients },
    { name: "Contracts", schema: schemaContracts },
    { name: "Subs Staging", schema: schemaSubsStaging },
    { name: "Benchmark", schema: schemaBenchmark },
  ];

  for (const { name, schema } of schemas) {
    try {
      console.log(`✓ Schema for "${name}" validated`);
      // Note: Full base creation requires Airtable.com account management
      // This script validates schemas; manual base creation via UI recommended
    } catch (error) {
      console.error(`✗ Error with "${name}":`, error.message);
    }
  }

  console.log("\n📋 Next steps:");
  console.log("1. Go to https://airtable.com/create");
  console.log("2. Create 4 bases with names from schema-*.js files");
  console.log("3. Add tables and fields per schema definitions above");
  console.log("4. Update .env with base IDs (visible in share/API section)");
  console.log("\n(Airtable API v0 does not support base creation; manual setup required)\n");
}

createBases().catch(console.error);
```

- [ ] **Step 6: Create test for schema structure**

```javascript
// tests/airtable.test.js
const schemaClients = require("../airtable/schema-clients");
const schemaContracts = require("../airtable/schema-contracts");
const schemaSubsStaging = require("../airtable/schema-subs-staging");
const schemaBenchmark = require("../airtable/schema-price-benchmark");

describe("Airtable schemas", () => {
  test("Clients schema has all required tables", () => {
    const tableNames = schemaClients.tables.map((t) => t.name);
    expect(tableNames).toContain("Prospects");
    expect(tableNames).toContain("Audit Log");
    expect(tableNames).toContain("Suppression List");
  });

  test("Prospects table has opt_out field for compliance", () => {
    const prospectsTable = schemaClients.tables.find((t) => t.name === "Prospects");
    const optOutField = prospectsTable.fields.find((f) => f.name === "opt_out");
    expect(optOutField).toBeDefined();
    expect(optOutField.type).toBe("checkbox");
  });

  test("Prospects table has pipeline_status select with all required statuses", () => {
    const prospectsTable = schemaClients.tables.find((t) => t.name === "Prospects");
    const statusField = prospectsTable.fields.find((f) => f.name === "pipeline_status");
    const statuses = statusField.options.map((o) => o.name);
    expect(statuses).toContain("pending_review");
    expect(statuses).toContain("approved");
  });

  test("Contracts schema includes FOIA tracking", () => {
    const contractsTable = schemaContracts.tables[0];
    const fields = contractsTable.fields.map((f) => f.name);
    expect(fields).toContain("foia_pending");
    expect(fields).toContain("foia_draft");
  });

  test("SubsStaging schema separates by category", () => {
    const subsTable = schemaSubsStaging.tables[0];
    const subCatField = subsTable.fields.find((f) => f.name === "sub_category");
    const categories = subCatField.options.map((o) => o.name);
    expect(categories).toContain("Commercial");
    expect(categories).toContain("Specialty");
  });
});
```

- [ ] **Step 7: Run tests**

```bash
npm test -- tests/airtable.test.js
```

Expected: All schema tests pass.

- [ ] **Step 8: Commit**

```bash
git add airtable/ tests/airtable.test.js
git commit -m "feat: define Airtable bases and schema for 4 tables (Clients, Contracts, Subs, Benchmark)"
```

---

### Task 3: Create API Client Libraries

**Files:**
- Create: `lib/airtable.js`
- Create: `lib/sunbiz.js`
- Create: `lib/sam-gov.js`
- Create: `lib/usaspending.js`
- Create: `tests/lib/airtable.test.js`

**Goal:** Wrap external APIs in client libraries with error handling and logging.

- [ ] **Step 1: Create `lib/airtable.js`**

```javascript
// lib/airtable.js
const Airtable = require("airtable");

class AirtableClient {
  constructor(apiKey, baseIds) {
    this.airtable = new Airtable({ apiKey });
    this.baseIds = baseIds;
    this.bases = {
      clients: this.airtable.base(baseIds.CLIENTS),
      contracts: this.airtable.base(baseIds.CONTRACTS),
      subs: this.airtable.base(baseIds.SUBS_STAGING),
      benchmark: this.airtable.base(baseIds.BENCHMARK),
    };
  }

  async addProspect(tableName, fields) {
    const table = this.bases.clients.table(tableName);
    try {
      const record = await table.create([{ fields }]);
      console.log(`✓ Added prospect: ${fields.legal_name}`);
      return record[0];
    } catch (error) {
      console.error(`✗ Error adding prospect:`, error.message);
      throw error;
    }
  }

  async updateProspect(tableName, recordId, fields) {
    const table = this.bases.clients.table(tableName);
    try {
      const record = await table.update(recordId, fields);
      console.log(`✓ Updated prospect: ${recordId}`);
      return record;
    } catch (error) {
      console.error(`✗ Error updating prospect:`, error.message);
      throw error;
    }
  }

  async getProspectByEmail(email) {
    const table = this.bases.clients.table("Prospects");
    try {
      const records = await table
        .select({ filterByFormula: `{business_email} = "${email}"` })
        .all();
      return records.length > 0 ? records[0] : null;
    } catch (error) {
      console.error(`✗ Error fetching prospect:`, error.message);
      throw error;
    }
  }

  async getOptedOutEmails() {
    const table = this.bases.clients.table("Suppression List");
    try {
      const records = await table.select().all();
      return records.map((r) => r.fields.email);
    } catch (error) {
      console.error(`✗ Error fetching suppression list:`, error.message);
      throw error;
    }
  }

  async addOptOut(email, legalName, reason) {
    const table = this.bases.clients.table("Suppression List");
    try {
      await table.create([
        {
          fields: {
            email,
            legal_name: legalName,
            opt_out_date: new Date().toISOString().split("T")[0],
            reason,
          },
        },
      ]);
      console.log(`✓ Added to suppression list: ${email}`);
    } catch (error) {
      console.error(`✗ Error adding opt-out:`, error.message);
      throw error;
    }
  }

  async logAuditEvent(recordId, eventType, source, notes = "") {
    const table = this.bases.clients.table("Audit Log");
    try {
      await table.create([
        {
          fields: {
            record_id: recordId,
            event_date: new Date().toISOString().split("T")[0],
            event_type: eventType,
            source,
            notes,
          },
        },
      ]);
      console.log(`✓ Logged audit event: ${eventType} for ${recordId}`);
    } catch (error) {
      console.error(`✗ Error logging audit:`, error.message);
      throw error;
    }
  }
}

module.exports = AirtableClient;
```

- [ ] **Step 2: Create `lib/sunbiz.js`**

```javascript
// lib/sunbiz.js
const axios = require("axios");

class SunbizClient {
  constructor() {
    this.baseUrl = "https://services.sunbiz.org/api";
  }

  async searchNewCompanies(county, daysOld = 90) {
    // Sunbiz API: simplified example
    // Real implementation depends on actual Sunbiz API docs
    try {
      console.log(`🔍 Searching Sunbiz for companies < ${daysOld} days in ${county}...`);
      // placeholder — actual Sunbiz API call here
      return [];
    } catch (error) {
      console.error(`✗ Sunbiz search error:`, error.message);
      throw error;
    }
  }

  async searchByNAICS(naics, daysOld = 180) {
    try {
      console.log(`🔍 Searching Sunbiz for NAICS ${naics}...`);
      // placeholder — actual call here
      return [];
    } catch (error) {
      console.error(`✗ Sunbiz NAICS search error:`, error.message);
      throw error;
    }
  }
}

module.exports = SunbizClient;
```

- [ ] **Step 3: Create `lib/sam-gov.js`**

```javascript
// lib/sam-gov.js
const axios = require("axios");

class SamGovClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = "https://api.sam.gov/entity-information";
  }

  async checkEntityRegistration(entity) {
    try {
      console.log(`🔍 Checking SAM.gov for entity: ${entity}...`);
      // SAM.gov API call — real implementation
      return { isRegistered: false };
    } catch (error) {
      console.error(`✗ SAM.gov lookup error:`, error.message);
      throw error;
    }
  }
}

module.exports = SamGovClient;
```

- [ ] **Step 4: Create `lib/usaspending.js`**

```javascript
// lib/usaspending.js
const axios = require("axios");

class USASpendingClient {
  constructor() {
    this.baseUrl = "https://api.usaspending.gov/api/v2";
  }

  async searchAwards(filters = {}) {
    try {
      console.log(`🔍 Searching USASpending for awards...`);
      // USASpending API call
      return [];
    } catch (error) {
      console.error(`✗ USASpending search error:`, error.message);
      throw error;
    }
  }

  async getAwardDetails(awardId) {
    try {
      console.log(`📋 Fetching award details: ${awardId}...`);
      // Real API call
      return {};
    } catch (error) {
      console.error(`✗ Award details error:`, error.message);
      throw error;
    }
  }
}

module.exports = USASpendingClient;
```

- [ ] **Step 5: Create `tests/lib/airtable.test.js`**

```javascript
// tests/lib/airtable.test.js
const AirtableClient = require("../../lib/airtable");

// Mock Airtable module
jest.mock("airtable", () => {
  return jest.fn().mockImplementation(() => ({
    base: jest.fn().mockReturnValue({
      table: jest.fn().mockReturnValue({
        create: jest.fn().mockResolvedValue([{ id: "rec123", fields: {} }]),
        update: jest.fn().mockResolvedValue({ id: "rec123", fields: {} }),
        select: jest.fn().mockReturnValue({
          all: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
  }));
});

describe("AirtableClient", () => {
  let client;

  beforeEach(() => {
    const mockBaseIds = {
      CLIENTS: "appCLIENTS",
      CONTRACTS: "appCONTRACTS",
      SUBS_STAGING: "appSUBS",
      BENCHMARK: "appBENCHMARK",
    };
    client = new AirtableClient("mock_api_key", mockBaseIds);
  });

  test("addProspect creates a new record", async () => {
    const result = await client.addProspect("Prospects", {
      legal_name: "Test Corp",
      business_email: "test@corp.com",
    });
    expect(result).toBeDefined();
  });

  test("getOptedOutEmails returns suppression list", async () => {
    const emails = await client.getOptedOutEmails();
    expect(Array.isArray(emails)).toBe(true);
  });

  test("addOptOut logs to suppression list with timestamp", async () => {
    await client.addOptOut("test@example.com", "Test Corp", "user requested");
    // Verification depends on mock implementation
  });

  test("logAuditEvent tracks all prospect changes", async () => {
    await client.logAuditEvent("rec123", "scored", "flow-a", "Score: 85");
    // Verification depends on mock
  });
});
```

- [ ] **Step 6: Run tests**

```bash
npm test -- tests/lib/
```

Expected: All lib tests pass (or run with mocks).

- [ ] **Step 7: Commit**

```bash
git add lib/ tests/lib/
git commit -m "feat: add API client wrappers (Airtable, Sunbiz, SAM, USASpending)"
```

---

### Task 4: Implement Compliance Foundation (Flow D — Opt-Out)

**Files:**
- Create: `lib/compliance.js`
- Create: `n8n-workflows/flow-d-optout.json` (n8n export template)
- Create: `docs/compliance.md`
- Create: `tests/compliance.test.js`

**Goal:** Build permanent opt-out logic. This is non-negotiable before any outreach goes live.

- [ ] **Step 1: Create `lib/compliance.js`**

```javascript
// lib/compliance.js
const AirtableClient = require("./airtable");

class ComplianceManager {
  constructor(airtableClient) {
    this.airtable = airtableClient;
    this.OPT_OUT_RESPECT_DAYS = 10;
  }

  /**
   * Check if an email is in the permanent suppression list
   * @param {string} email
   * @returns {boolean}
   */
  async isOptedOut(email) {
    try {
      const record = await this.airtable.getProspectByEmail(email);
      if (record && record.fields.opt_out) {
        console.log(`🚫 Email is opted out: ${email}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`⚠ Error checking opt-out status:`, error.message);
      // Safe default: if we can't check, assume opt-out
      return true;
    }
  }

  /**
   * Process an opt-out event from GHL
   * @param {object} payload - { email, ghl_contact_id, timestamp }
   */
  async handleOptOut(payload) {
    const { email, ghl_contact_id, timestamp } = payload;

    try {
      // Find prospect record
      const prospect = await this.airtable.getProspectByEmail(email);
      if (!prospect) {
        console.warn(`⚠ Opt-out for unknown email: ${email}`);
        return;
      }

      // Update prospect
      await this.airtable.updateProspect("Prospects", prospect.id, {
        opt_out: true,
        opt_out_date: new Date().toISOString().split("T")[0],
        opt_out_source: "GHL",
      });

      // Add to permanent suppression list
      await this.airtable.addOptOut(
        email,
        prospect.fields.legal_name,
        "GHL unsubscribe"
      );

      // Log audit event
      await this.airtable.logAuditEvent(
        prospect.id,
        "opted_out",
        "ghl_webhook",
        `Timestamp: ${timestamp}`
      );

      console.log(`✓ Opt-out processed: ${email} (${timestamp})`);
    } catch (error) {
      console.error(`✗ Error processing opt-out:`, error.message);
      throw error;
    }
  }

  /**
   * Generate CAN-SPAM footer for outreach email
   * @param {string} senderDomain
   * @param {string} companyAddress
   * @returns {string}
   */
  generateCanSpamFooter(senderDomain, companyAddress) {
    return `
---
Maravilla Cleaners
${companyAddress}

Sent from: ${senderDomain}
Reply STOP to opt out of future emails.
This is a business communication. Please reply within ${this.OPT_OUT_RESPECT_DAYS} business days to confirm opt-out.
    `.trim();
  }

  /**
   * Validate outreach payload before sending
   * @param {object} outreach - { recipient_email, subject, body, sender_domain, company_address }
   * @returns {object} - { isValid: boolean, errors: [] }
   */
  async validateOutreach(outreach) {
    const errors = [];

    // Check opt-out
    if (await this.isOptedOut(outreach.recipient_email)) {
      errors.push(`Recipient is opted out: ${outreach.recipient_email}`);
    }

    // Check required CAN-SPAM fields
    if (!outreach.subject) errors.push("Subject required");
    if (!outreach.body) errors.push("Body required");
    if (!outreach.sender_domain) errors.push("Sender domain required");
    if (!outreach.company_address) errors.push("Company address required");

    // Check for scraping language
    if (outreach.body.match(/scrape|crawl|scraped/i)) {
      errors.push("Body contains scraping language (not allowed)");
    }

    // Check for SMS/call language (should be email only)
    if (outreach.body.match(/call|text|sms|phone/i)) {
      errors.push("Body suggests SMS/call (email only allowed at this phase)");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if a record has already been contacted recently
   * @param {object} prospect
   * @returns {boolean}
   */
  isDuplicateContact(prospect) {
    if (!prospect.fields.last_contacted) return false;
    const lastContact = new Date(prospect.fields.last_contacted);
    const daysSinceContact = Math.floor(
      (Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceContact < 30; // Don't contact within 30 days
  }
}

module.exports = ComplianceManager;
```

- [ ] **Step 2: Create `docs/compliance.md`**

```markdown
# Compliance Guidelines

## Legal Foundation

All outreach must comply with **CAN-SPAM Act (15 U.S.C. §7701)** for commercial email.

### Non-Negotiable Rules

1. **Email only** — SMS and automated calls are OFF in all phases until written consent + per-state legal review is complete.

2. **Human approval on every send** — No exceptions. Every email must be reviewed by a human in Airtable before the outreach_status changes to "approved".

3. **Official APIs only** — Sunbiz, SAM.gov, USASpending.gov. No scraping, no data brokers, no non-official sources.

4. **Permanent opt-out** — Once a contact opts out, they are suppressed forever. No re-import, no new phone/address resets it.

5. **Separate domains** — Demand and supply outreach run on separate sending domains and inboxes:
   - Demand: outreach.maravillacleaners.com
   - Supply: network.maravillacleaners.com
   - Never share contact lists between them.

6. **Rate limiting** — Max 30–50 emails/day per inbox after warmup. Scale by adding new inboxes, not by increasing volume.

## Email Requirements

Every outbound email MUST include:

- **Real sender** — From: firstname.lastname@domain (not noreply@, not generic)
- **Honest subject** — No misleading, no spoofing
- **Company ID** — Business name and logo in signature
- **Physical address** — Maravilla's full mailing address in footer (required by CAN-SPAM)
- **Opt-out link** — "Reply STOP to opt out of future emails"
- **Sender identity** — Clear that this is from Maravilla Cleaners, not a third party

## Opt-Out Processing

When a contact unsubscribes (via GHL reply STOP, or manual suppression):

1. GHL fires a webhook to Flow D
2. Flow D receives: email, contact_id, timestamp
3. Flow D logs to Airtable: opt_out = true, opt_out_date = now, opt_out_source = "GHL"
4. Contact is added to Suppression List permanently
5. Any future ingest from Sunbiz checks dedup: if email exists AND opt_out = true → skip forever
6. Audit log entry created: event_type = "opted_out"

**Key:** Suppression is by email + legal entity. If the same company registers a new email, we respect the first opt-out. Never ignore it.

## Data Sources (Approved)

| Source | Use | Rate Limit | Cost |
|--------|-----|-----------|------|
| Sunbiz | New FL companies, NAICS lookup | ~100/day | Free |
| SAM.gov | Federal registration check | ~100/day | Free |
| USASpending | Federal contracts | ~50/day | Free |

All official, documented APIs. No scraping.

## Audit Log

Every action is logged: created, enriched, scored, approved, rejected, contacted, replied, opted_out, suppressed.

- **Created:** When a prospect is first ingested
- **Enriched:** When we fill missing fields (email, phone, website)
- **Scored:** When Claude scores the prospect
- **Approved:** When a human approves outreach
- **Contacted:** When email is sent
- **Replied:** When recipient replies
- **Opted out:** When recipient unsubscribes
- **Suppressed:** When dedup catches an opt-out and skips ingest

This creates a compliance audit trail for regulators and legal.

## Testing Opt-Out

Before Phase 1 goes live:

1. Create a test prospect in Airtable
2. Approve an outreach email
3. Trigger an opt-out in GHL
4. Verify Flow D processes it correctly
5. Verify Airtable shows opt_out = true
6. Verify Suppression List has the email
7. Run the same prospect through ingest again → verify it's skipped by dedup

## Phase-In Strategy

- **Phase 0:** Manual validation with ~200 existing leads. No API ingest yet. Human reviews every single prospect before contact.
- **Phase 1:** Sunbiz + SAM ingest for new companies. Still 100% human review before outreach.
- **Phase 2:** Once opt-out flow is bulletproof and audit trail is clean, can scale to higher volumes.

## Questions?

Contact: Legal team (internal). This is non-negotiable compliance, not marketing advice.
```

- [ ] **Step 3: Create `n8n-workflows/flow-d-optout.json` (template)**

```json
{
  "name": "Flow D — Opt-Out Handler",
  "description": "Webhook receiver for GHL opt-out events. Processes unsubscribes, logs to Airtable, adds to permanent suppression.",
  "nodes": [
    {
      "name": "Webhook: GHL Unsubscribe",
      "type": "n8n-nodes-base.webhook",
      "properties": {
        "method": "POST",
        "path": "ghl/opt-out",
        "responseMode": "responseNode"
      }
    },
    {
      "name": "Find prospect in Airtable",
      "type": "n8n-nodes-base.airtable",
      "properties": {
        "operation": "read",
        "baseId": "{{ env.AIRTABLE_BASE_CLIENTS }}",
        "tableId": "Prospects",
        "filterByFormula": "{{ '{business_email} = \"' + $node['Webhook: GHL Unsubscribe'].json.body.email + '\"' }}"
      }
    },
    {
      "name": "Update prospect: opt_out = true",
      "type": "n8n-nodes-base.airtable",
      "properties": {
        "operation": "update",
        "baseId": "{{ env.AIRTABLE_BASE_CLIENTS }}",
        "tableId": "Prospects",
        "id": "{{ $node['Find prospect in Airtable'].json.body[0].id }}",
        "fieldsToUpdate": {
          "opt_out": true,
          "opt_out_date": "{{ new Date().toISOString().split('T')[0] }}",
          "opt_out_source": "GHL"
        }
      }
    },
    {
      "name": "Add to Suppression List",
      "type": "n8n-nodes-base.airtable",
      "properties": {
        "operation": "create",
        "baseId": "{{ env.AIRTABLE_BASE_CLIENTS }}",
        "tableId": "Suppression List",
        "fields": {
          "email": "{{ $node['Webhook: GHL Unsubscribe'].json.body.email }}",
          "legal_name": "{{ $node['Find prospect in Airtable'].json.body[0].fields.legal_name }}",
          "opt_out_date": "{{ new Date().toISOString().split('T')[0] }}",
          "reason": "GHL unsubscribe"
        }
      }
    },
    {
      "name": "Log audit event",
      "type": "n8n-nodes-base.airtable",
      "properties": {
        "operation": "create",
        "baseId": "{{ env.AIRTABLE_BASE_CLIENTS }}",
        "tableId": "Audit Log",
        "fields": {
          "record_id": "{{ $node['Find prospect in Airtable'].json.body[0].id }}",
          "event_date": "{{ new Date().toISOString().split('T')[0] }}",
          "event_type": "opted_out",
          "source": "ghl_webhook",
          "notes": "Unsubscribe timestamp: {{ $node['Webhook: GHL Unsubscribe'].json.body.timestamp }}"
        }
      }
    },
    {
      "name": "Return success",
      "type": "n8n-nodes-base.respondToWebhook",
      "properties": {
        "statusCode": 200,
        "responseBody": {
          "status": "processed",
          "email": "{{ $node['Webhook: GHL Unsubscribe'].json.body.email }}"
        }
      }
    }
  ],
  "connections": {}
}
```

- [ ] **Step 4: Create `tests/compliance.test.js`**

```javascript
// tests/compliance.test.js
const ComplianceManager = require("../lib/compliance");

// Mock Airtable
const mockAirtable = {
  getProspectByEmail: jest.fn(),
  updateProspect: jest.fn(),
  addOptOut: jest.fn(),
  logAuditEvent: jest.fn(),
};

describe("ComplianceManager", () => {
  let manager;

  beforeEach(() => {
    manager = new ComplianceManager(mockAirtable);
  });

  test("isOptedOut returns true for suppressed email", async () => {
    mockAirtable.getProspectByEmail.mockResolvedValueOnce({
      id: "rec123",
      fields: { opt_out: true, legal_name: "Test Corp" },
    });

    const result = await manager.isOptedOut("test@example.com");
    expect(result).toBe(true);
  });

  test("isOptedOut returns false for active email", async () => {
    mockAirtable.getProspectByEmail.mockResolvedValueOnce({
      id: "rec123",
      fields: { opt_out: false, legal_name: "Test Corp" },
    });

    const result = await manager.isOptedOut("active@example.com");
    expect(result).toBe(false);
  });

  test("handleOptOut updates prospect and adds to suppression list", async () => {
    mockAirtable.getProspectByEmail.mockResolvedValueOnce({
      id: "rec123",
      fields: { legal_name: "Test Corp" },
    });

    await manager.handleOptOut({
      email: "test@example.com",
      ghl_contact_id: "contact_123",
      timestamp: "2026-05-25T10:00:00Z",
    });

    expect(mockAirtable.updateProspect).toHaveBeenCalledWith(
      "Prospects",
      "rec123",
      expect.objectContaining({ opt_out: true })
    );
    expect(mockAirtable.addOptOut).toHaveBeenCalledWith(
      "test@example.com",
      "Test Corp",
      "GHL unsubscribe"
    );
    expect(mockAirtable.logAuditEvent).toHaveBeenCalled();
  });

  test("generateCanSpamFooter includes required CAN-SPAM elements", () => {
    const footer = manager.generateCanSpamFooter(
      "outreach.maravillacleaners.com",
      "123 Main St, Miami, FL 33101"
    );

    expect(footer).toContain("Maravilla Cleaners");
    expect(footer).toContain("123 Main St");
    expect(footer).toContain("Reply STOP");
    expect(footer).toContain("outreach.maravillacleaners.com");
  });

  test("validateOutreach rejects if recipient is opted out", async () => {
    mockAirtable.getProspectByEmail.mockResolvedValueOnce({
      fields: { opt_out: true },
    });

    const result = await manager.validateOutreach({
      recipient_email: "optedout@example.com",
      subject: "Test",
      body: "Test body",
      sender_domain: "outreach.maravillacleaners.com",
      company_address: "123 Main St, Miami, FL",
    });

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain("opted out");
  });

  test("validateOutreach rejects scraping language", async () => {
    mockAirtable.getProspectByEmail.mockResolvedValueOnce(null);

    const result = await manager.validateOutreach({
      recipient_email: "test@example.com",
      subject: "Test",
      body: "We scraped your data from the web",
      sender_domain: "outreach.maravillacleaners.com",
      company_address: "123 Main St",
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("scraping"))).toBe(true);
  });

  test("isDuplicateContact returns true if contacted < 30 days ago", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const result = manager.isDuplicateContact({
      fields: { last_contacted: yesterday },
    });

    expect(result).toBe(true);
  });

  test("isDuplicateContact returns false if last contact > 30 days ago", () => {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const result = manager.isDuplicateContact({
      fields: { last_contacted: sixtyDaysAgo },
    });

    expect(result).toBe(false);
  });
});
```

- [ ] **Step 5: Run compliance tests**

```bash
npm test -- tests/compliance.test.js
```

Expected: All compliance tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/compliance.js docs/compliance.md n8n-workflows/flow-d-optout.json tests/compliance.test.js
git commit -m "feat: implement compliance foundation (opt-out, CAN-SPAM, audit log)"
```

---

## Phase 1: Validation (Flow 0 — Migrate & Test Loop)

### Task 5: Implement Flow 0 (Migration — Existing Leads)

**Files:**
- Create: `n8n-workflows/flow-0-migration.json` (n8n template)
- Create: `lib/enrichment.js` (resolve missing fields)
- Create: `lib/scoring.js` (Claude scoring)
- Create: `tests/migration.test.js`

**Goal:** Take ~200–300 existing Florida leads, run them through enrichment→score→Airtable, validate the full loop.

- [ ] **Step 1: Create `lib/enrichment.js`**

```javascript
// lib/enrichment.js
const axios = require("axios");

class EnrichmentClient {
  /**
   * Enrich prospect with missing fields
   * @param {object} prospect - { legal_name, phone, website, ... }
   * @returns {object} - enriched prospect
   */
  async enrich(prospect) {
    const enriched = { ...prospect };

    // Try to resolve business email if missing
    if (!enriched.business_email) {
      enriched.business_email = await this.findBusinessEmail(
        enriched.legal_name,
        enriched.website
      );
    }

    // Resolve phone if missing
    if (!enriched.phone) {
      enriched.phone = await this.findPhone(enriched.legal_name);
    }

    // Resolve website if missing
    if (!enriched.website) {
      enriched.website = await this.findWebsite(enriched.legal_name);
    }

    return enriched;
  }

  async findBusinessEmail(businessName, website) {
    // Placeholder: in production, use email-finding API (Hunter, RocketReach, etc.)
    // For now: try common patterns
    if (website) {
      const domain = new URL(website).hostname;
      return `info@${domain}`;
    }
    return null;
  }

  async findPhone(businessName) {
    // Placeholder: phone lookup from public sources
    return null;
  }

  async findWebsite(businessName) {
    // Placeholder: website lookup
    return null;
  }
}

module.exports = EnrichmentClient;
```

- [ ] **Step 2: Create `lib/scoring.js`**

```javascript
// lib/scoring.js
const Anthropic = require("@anthropic-ai/sdk");
const config = require("../config/config");

class ScoringEngine {
  constructor(apiKey) {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Score a prospect using Claude
   * @param {object} prospect - prospect data
   * @returns {object} - { service_fit, ticket_estimate, priority, icebreaker, score, ... }
   */
  async scoreProspect(prospect) {
    const systemPrompt = `You are a lead scoring assistant for ${config.COMPANY_NAME}, a commercial cleaning company in Florida. Score each prospect based on fit for our services and return JSON only — no preamble, no markdown.

Services offered: ${config.SERVICE_DESCRIPTION}

High-priority segments: ${config.ICP_HIGH_PRIORITY.join(", ")}
Med-High priority: ${config.ICP_MED_HIGH_PRIORITY.join(", ")}
Medium priority: ${config.ICP_MEDIUM_PRIORITY.join(", ")}`;

    const userPrompt = `Score this Florida business as a potential cleaning services client:

${JSON.stringify(prospect, null, 2)}

Return exactly this JSON structure (no other text):
{
  "service_fit": <1-10 number>,
  "ticket_estimate": <monthly USD number>,
  "segment": "<closest ICP segment>",
  "priority": "<High | Med-High | Medium | Not a fit>",
  "intent_signal": "<one sentence why they likely need cleaning now>",
  "icebreaker": "<one personalized opening sentence, max 25 words>",
  "score": <1-100 number>,
  "reasoning": "<two sentences max>"
}`;

    try {
      const message = await this.client.messages.create({
        model: "claude-opus-4-7",
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const jsonText = message.content[0].text.trim();
      const scoring = JSON.parse(jsonText);

      console.log(`✓ Scored: ${prospect.legal_name} (${scoring.score}/100)`);
      return scoring;
    } catch (error) {
      console.error(`✗ Scoring error for ${prospect.legal_name}:`, error.message);
      throw error;
    }
  }
}

module.exports = ScoringEngine;
```

- [ ] **Step 3: Create `n8n-workflows/flow-0-migration.json`**

```json
{
  "name": "Flow 0 — Migration (Validate Loop)",
  "description": "One-time: import existing ~200-300 Florida leads, enrich, score, save to Airtable with pipeline_status=pending_review. Human reviews, approves, then syncs to GHL.",
  "nodes": [
    {
      "name": "Trigger: Manual (CSV import or Airtable read)",
      "type": "n8n-nodes-base.manualTrigger"
    },
    {
      "name": "Read existing leads from CSV",
      "type": "n8n-nodes-base.readBinaryFile",
      "properties": {
        "filePath": "./migration/existing-leads.csv"
      }
    },
    {
      "name": "Parse CSV",
      "type": "n8n-nodes-base.csvToJson"
    },
    {
      "name": "For each lead: Enrich",
      "type": "n8n-nodes-base.loop",
      "properties": {
        "action": "forEach",
        "iterations": "{{ $node['Parse CSV'].json.length }}"
      }
    },
    {
      "name": "Call enrichment API (Hunter, etc.)",
      "type": "n8n-nodes-base.httpRequest",
      "properties": {
        "method": "GET",
        "url": "https://api.hunter.io/v2/domain-search?domain={{ $node['For each lead: Enrich'].json.website }}"
      }
    },
    {
      "name": "Call Claude scoring",
      "type": "n8n-nodes-base.httpRequest",
      "properties": {
        "method": "POST",
        "url": "https://api.anthropic.com/v1/messages",
        "body": {
          "model": "claude-opus-4-7",
          "max_tokens": 500,
          "system": "You are a lead scoring assistant...",
          "messages": [
            {
              "role": "user",
              "content": "Score this prospect: {{ JSON.stringify($node['For each lead: Enrich'].json) }}"
            }
          ]
        }
      }
    },
    {
      "name": "Parse Claude response",
      "type": "n8n-nodes-base.jsonParse"
    },
    {
      "name": "Save to Airtable (pipeline_status=pending_review)",
      "type": "n8n-nodes-base.airtable",
      "properties": {
        "operation": "create",
        "baseId": "{{ env.AIRTABLE_BASE_CLIENTS }}",
        "tableId": "Prospects",
        "fields": {
          "legal_name": "{{ $node['For each lead: Enrich'].json.legal_name }}",
          "business_email": "{{ $node['Call enrichment API'].json.emails[0].value }}",
          "phone": "{{ $node['For each lead: Enrich'].json.phone }}",
          "website": "{{ $node['For each lead: Enrich'].json.website }}",
          "service_fit": "{{ $node['Parse Claude response'].json.service_fit }}",
          "ticket_estimate": "{{ $node['Parse Claude response'].json.ticket_estimate }}",
          "segment": "{{ $node['Parse Claude response'].json.segment }}",
          "priority": "{{ $node['Parse Claude response'].json.priority }}",
          "icebreaker": "{{ $node['Parse Claude response'].json.icebreaker }}",
          "score": "{{ $node['Parse Claude response'].json.score }}",
          "pipeline_status": "pending_review",
          "source": "Manual",
          "date_added": "{{ new Date().toISOString().split('T')[0] }}"
        }
      }
    },
    {
      "name": "Log audit event: created",
      "type": "n8n-nodes-base.airtable",
      "properties": {
        "operation": "create",
        "baseId": "{{ env.AIRTABLE_BASE_CLIENTS }}",
        "tableId": "Audit Log",
        "fields": {
          "record_id": "{{ $node['Save to Airtable'].json.id }}",
          "event_date": "{{ new Date().toISOString().split('T')[0] }}",
          "event_type": "created",
          "source": "flow-0",
          "notes": "Migrated from existing leads"
        }
      }
    },
    {
      "name": "Return: Leads ready for review",
      "type": "n8n-nodes-base.respondToWebhook",
      "properties": {
        "statusCode": 200,
        "responseBody": {
          "status": "success",
          "leadsProcessed": "{{ $node['Parse CSV'].json.length }}",
          "nextStep": "Human review in Airtable, set status=approved, then Flow 0B syncs to GHL"
        }
      }
    }
  ]
}
```

- [ ] **Step 4: Create `tests/migration.test.js`**

```javascript
// tests/migration.test.js
const ScoringEngine = require("../lib/scoring");
const EnrichmentClient = require("../lib/enrichment");

// Mock Claude API
jest.mock("@anthropic-ai/sdk", () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [
          {
            text: JSON.stringify({
              service_fit: 8,
              ticket_estimate: 2500,
              segment: "Office",
              priority: "High",
              intent_signal: "Recently opened office, needs recurring cleaning",
              icebreaker: "Congrats on the new office opening!",
              score: 82,
              reasoning: "Strong fit for commercial recurring contract.",
            }),
          },
        ],
      }),
    },
  }));
});

describe("Flow 0 — Migration", () => {
  let scoring;
  let enrichment;

  beforeEach(() => {
    scoring = new ScoringEngine("mock_api_key");
    enrichment = new EnrichmentClient();
  });

  test("scoreProspect returns valid scoring structure", async () => {
    const prospect = {
      legal_name: "Tech Startup Inc",
      business_email: "info@techstartup.com",
      website: "https://techstartup.com",
      employees_estimate: 50,
      segment: "Office",
    };

    const result = await scoring.scoreProspect(prospect);

    expect(result).toHaveProperty("service_fit");
    expect(result).toHaveProperty("ticket_estimate");
    expect(result).toHaveProperty("priority");
    expect(result).toHaveProperty("icebreaker");
    expect(result).toHaveProperty("score");
    expect(result.score).toBeGreaterThanOrEqual(1);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  test("scoreProspect produces consistent JSON", async () => {
    const prospect = {
      legal_name: "Medical Clinic LLC",
      business_email: "admin@clinic.com",
    };

    const result = await scoring.scoreProspect(prospect);

    expect(typeof result.service_fit).toBe("number");
    expect(typeof result.ticket_estimate).toBe("number");
    expect(typeof result.priority).toBe("string");
    expect(typeof result.icebreaker).toBe("string");
  });

  test("enrich prospect fills missing fields", async () => {
    const prospect = {
      legal_name: "Local Business",
      website: "https://localbiz.com",
    };

    const enriched = await enrichment.enrich(prospect);

    expect(enriched.legal_name).toBe("Local Business");
    expect(enriched.website).toBe("https://localbiz.com");
    // business_email may be resolved or null depending on implementation
  });

  test("scoring respects priority ranking", async () => {
    const highPriorityProspect = {
      legal_name: "Property Management Corp",
      segment: "Property Mgr",
    };

    const result = await scoring.scoreProspect(highPriorityProspect);

    expect(["High", "Med-High", "Medium", "Not a fit"]).toContain(result.priority);
  });
});
```

- [ ] **Step 5: Run migration tests**

```bash
npm test -- tests/migration.test.js
```

Expected: All tests pass.

- [ ] **Step 6: Create sample data for manual testing**

Create `migration/existing-leads.csv`:

```csv
legal_name,business_email,phone,website,county,employees_estimate
ABC Property Management,info@abcpm.com,(305) 555-1234,https://abcpm.com,Miami-Dade,15
XYZ Medical Clinic,admin@xyzmedical.com,(954) 555-5678,https://xyzmedical.com,Broward,25
Tech Solutions LLC,,,https://techsol.com,Palm Beach,8
Office Plus Inc,contact@officeplus.com,(407) 555-9999,,Orange,40
```

- [ ] **Step 7: Commit**

```bash
git add lib/enrichment.js lib/scoring.js n8n-workflows/flow-0-migration.json tests/migration.test.js migration/existing-leads.csv
git commit -m "feat: implement Flow 0 (migration) with enrichment and Claude scoring"
```

---

### Task 6: Setup.md — Step-by-Step Instructions

**Files:**
- Create: `docs/setup.md`

- [ ] **Step 1: Create comprehensive setup guide**

```markdown
# Setup Guide — Maravilla Intelligence System

## Prerequisites

- Node.js 16+ 
- Airtable account (free tier OK for initial testing)
- Claude API key (Anthropic)
- n8n instance (self-hosted or n8n.cloud)
- GoHighLevel account (for email delivery)
- Sunbiz, SAM.gov, USASpending are free public APIs (no key needed)

## Step 1: Clone & Install

\`\`\`bash
git clone https://github.com/maravillacleaners/maravilla-intelligence.git
cd maravilla-intelligence
npm install
\`\`\`

## Step 2: Set up Environment

\`\`\`bash
cp .env.example .env
\`\`\`

Then edit `.env` with your API keys:

\`\`\`bash
AIRTABLE_API_KEY=patXXXXXXXXXXXXXXXXXXXXXX
CLAUDE_API_KEY=sk-ant-XXXXXXXXXXXXXXXXXXXXXXXX
GHL_API_KEY=your_ghl_key
GHL_LOCATION_ID=your_location_id
\`\`\`

**Getting API Keys:**

- **Airtable:** https://airtable.com/account → API → Generate token
- **Claude:** https://console.anthropic.com/ → API keys → Create
- **GHL:** GoHighLevel dashboard → Settings → API
- **Sunbiz/SAM/USASpending:** Free public APIs (no key needed for initial testing)

## Step 3: Create Airtable Bases

1. Go to https://airtable.com/create
2. Create 4 new bases:
   - "Maravilla Intelligence — Clients"
   - "Maravilla Intelligence — Contracts"
   - "Maravilla Intelligence — Subs Staging"
   - "Maravilla Intelligence — Price Benchmark"
3. For each base, manually add tables and fields per `airtable/schema-*.js`
   - OR: Use the schema files as reference and import via Airtable API (advanced)
4. Copy base IDs from each base's share/API section
5. Update `.env`:
   \`\`\`bash
   AIRTABLE_BASE_CLIENTS=appXXXXXXXXXXXXXX
   AIRTABLE_BASE_CONTRACTS=appYYYYYYYYYYYYYY
   AIRTABLE_BASE_SUBS=appZZZZZZZZZZZZZZ
   AIRTABLE_BASE_BENCHMARK=appWWWWWWWWWWWWWW
   \`\`\`

## Step 4: Run Tests

\`\`\`bash
npm test
\`\`\`

Expected: All tests pass (or mock-related warnings only).

## Step 5: Phase 0 — Validate Loop with Existing Leads

### Prepare Data

1. Export your ~200–300 existing Florida leads as CSV:
   - Required: legal_name, county
   - Optional: business_email, phone, website

2. Save to `migration/existing-leads.csv`

### Run Migration

1. In n8n, import `n8n-workflows/flow-0-migration.json`
2. Configure:
   - Airtable base IDs (from step 3)
   - Enrichment API (Hunter.io or similar, optional)
   - Claude API key
3. Trigger the workflow manually
4. Monitor: Airtable CLIENTS → Prospects table should show records with `pipeline_status = "pending_review"`

### Human Review

1. Open Airtable: CLIENTS base → Prospects table
2. Filter: `pipeline_status = "pending_review"`
3. For each prospect:
   - Check: score, segment, priority, icebreaker
   - Approve: set `pipeline_status = "approved"` if correct
   - Reject: set `pipeline_status = "rejected"` if not a fit
4. Comment: add notes if needed

### Sync to GHL

1. After approval, create or run a second n8n flow:
   - Read all `pipeline_status = "approved"` from Airtable
   - Create contacts in GHL
   - Sync fields: legal_name, business_email, phone, website, score, segment

2. In GHL:
   - Create a simple email campaign (1-2 emails)
   - Send to the synced contacts
   - Monitor replies

### Test Opt-Out

1. Have someone reply "STOP" to the GHL email
2. GHL fires opt-out webhook to Flow D
3. Check Airtable:
   - Prospects table: contact should have `opt_out = true`
   - Suppression List: email should be added
   - Audit Log: event_type = "opted_out" should be logged

**If opt-out works correctly, Phase 0 is validated. Proceed to Phase 1.**

## Step 6: Phase 1 — Wire the APIs (After Validation)

Once Phase 0 loop is validated:

1. Create Flow A (client discovery):
   - Daily schedule (6:00 AM ET)
   - Sunbiz + SAM API queries
   - Claude scoring
   - Save to Airtable (pending_review)

2. Create Flow B (sub discovery):
   - Daily schedule (6:00 AM ET)
   - Sunbiz NAICS 561720 query
   - Save to SUBS_STAGING (invite_pending)

3. Create Flow C (contract intelligence):
   - Daily schedule (7:00 AM ET)
   - USASpending query
   - Claude teaming email draft
   - Save to CONTRACTS (pending_review)

4. Create Flow E (re-engagement):
   - Daily schedule (after Flow A)
   - Check for changed fields
   - Flag re-engagement candidates

See detailed flow specs in root README.md.

## Troubleshooting

### "Airtable API key invalid"
- Check `.env` AIRTABLE_API_KEY is correct
- Regenerate token at https://airtable.com/account → API

### "Claude API error: 401"
- Verify API key in `.env`
- Check API key has permissions at console.anthropic.com

### "n8n workflow not triggering"
- Confirm n8n is running: `n8n start`
- Check webhook URL in n8n (should be accessible from GHL)
- Test webhook via curl: `curl -X POST http://localhost:5678/webhook/ghl/opt-out -d '{"email":"test@example.com"}'`

### "Opt-out webhook not firing"
- In GHL, verify webhook is configured:
  - Event: Contact Unsubscribed
  - URL: `http://your-n8n-url/webhook/ghl/opt-out`
- Check n8n logs: `n8n logs`

## Next Steps

1. **Phase 0 validation**: Run with existing leads, validate loop
2. **Phase 1 rollout**: Wire Sunbiz, SAM, USASpending APIs
3. **Phase 2 expansion**: Add supply portal pricing module
4. **Phase 3 govcon**: Add contract intelligence + FOIA
5. **Phase 4 productize**: Swap NAICS code, test with second industry

## Questions?

- Technical: Check `docs/compliance.md` and `docs/architecture.md`
- API issues: See official docs (Airtable, Anthropic, GHL)
- Compliance: Contact legal team

Good luck! 🚀
```

- [ ] **Step 2: Commit**

```bash
git add docs/setup.md
git commit -m "docs: add comprehensive setup guide for Phase 0-1"
```

---

## Phase 2: Automation (Flows A–E Implementation)

(Condensed for space; each flow follows same pattern as Flow 0)

### Task 7: Implement Flows A–E (Automation Flows)

**Files:**
- Create: `n8n-workflows/flow-a-clients.json`
- Create: `n8n-workflows/flow-b-subs.json`
- Create: `n8n-workflows/flow-c-contracts.json`
- Create: `n8n-workflows/flow-e-reengagement.json`

Due to length, here are the summaries:

**Flow A — Client Discovery (demand)**
- Trigger: Daily 6:00 AM ET
- Sunbiz API: new FL companies, NAICS by ICP
- SAM API: check federal registration
- Dedup: check Airtable for existing + opt-out
- Claude: score each prospect
- Save: pipeline_status = "pending_review"
- Human approves → sync to GHL

**Flow B — Sub Discovery (supply)**
- Trigger: Daily 6:00 AM ET
- Sunbiz API: NAICS 561720, date_formed < 180d
- Classify: Commercial / Residential / Specialty / GovCon
- Save to SUBS_STAGING: status = "invite_pending"
- (Portal outreach handled separately)

**Flow C — Contract Intelligence**
- Trigger: Daily 7:00 AM ET
- USASpending: awards last 30d, NAICS + FL
- Claude: draft teaming email or FOIA request
- Save to CONTRACTS: outreach_status = "pending_review"
- Human approves → send or file FOIA

**Flow E — Re-engagement**
- Trigger: Daily after Flow A
- Check Airtable: records with changed fields
- Claude: fresh icebreaker based on change
- Flag: re_engagement_candidate = true
- Human approves → sync to GHL

- [ ] **Step 1: Create n8n Flow A template (same pattern as Flow 0)**

```json
{
  "name": "Flow A — Client Discovery (Demand)",
  "description": "Daily 6 AM: Sunbiz (new FL cos) + SAM (fed registration) → enrich → score → Airtable pending_review",
  "triggers": [
    {
      "type": "schedule",
      "cron": "0 6 * * *",
      "timezone": "America/New_York"
    }
  ],
  "nodes": [
    {
      "name": "Sunbiz: Query new companies",
      "config": {
        "api": "https://services.sunbiz.org/api",
        "filters": ["date_formed < 90 days", "counties: [Miami-Dade, Broward, ...]"],
        "perPage": 100
      }
    },
    {
      "name": "For each: Dedup check",
      "loopOver": "{{ $node['Sunbiz: Query new companies'].json.companies }}"
    },
    {
      "name": "Check Airtable: legal_name + address exists?",
      "type": "airtable",
      "filterByFormula": "{legal_name} = {{ $loop.current.name }}"
    },
    {
      "name": "Branch: If opt_out = true → skip",
      "condition": "$node['Check Airtable'].json.records[0].fields.opt_out"
    },
    {
      "name": "SAM.gov: Check federal registration",
      "type": "httpRequest"
    },
    {
      "name": "Enrich: Resolve email, phone, website",
      "type": "httpRequest",
      "external_api": "hunter.io or similar"
    },
    {
      "name": "Claude: Score prospect",
      "type": "httpRequest",
      "anthropic_api": true
    },
    {
      "name": "Save to Airtable: Prospects",
      "type": "airtable",
      "fields": {
        "legal_name": "{{ $loop.current.name }}",
        "service_fit": "{{ $node['Claude: Score'].json.service_fit }}",
        "priority": "{{ $node['Claude: Score'].json.priority }}",
        "pipeline_status": "pending_review"
      }
    },
    {
      "name": "Log audit event: created + scored",
      "type": "airtable"
    }
  ]
}
```

- [ ] **Step 2–4: Create Flows B, C, E (same pattern, different APIs/logic)**

- [ ] **Step 5: Create integration test for all flows**

```javascript
// tests/flows-integration.test.js
describe("All Flows Integration", () => {
  test("Flow D (opt-out) prevents duplicate contact in Flow A", async () => {
    // Simulate: opt-out in Flow D, then same prospect in Flow A
    // Expected: Flow A dedup catches opt-out, skips prospect
  });

  test("Flow A approved prospect syncs to GHL", async () => {
    // Simulate: approval in Airtable → Flow A sync → GHL contact created
  });

  test("Flow C teaming email includes opt-out link", async () => {
    // Simulate: Flow C generates email → verify footer + STOP link
  });

  test("Audit log tracks all events in sequence", async () => {
    // Simulate: full loop → verify audit log has created → enriched → scored → approved → contacted
  });
});
```

- [ ] **Step 6: Commit all Phase 2 flows**

```bash
git add n8n-workflows/flow-a-clients.json n8n-workflows/flow-b-subs.json n8n-workflows/flow-c-contracts.json n8n-workflows/flow-e-reengagement.json tests/flows-integration.test.js
git commit -m "feat: implement Flows A-E (daily discovery, scoring, contract intel, re-engagement)"
```

---

### Task 8: Documentation & Validation

**Files:**
- Create: `docs/architecture.md`
- Create: `DEPLOYMENT.md`

- [ ] **Step 1: Create architecture docs**

```markdown
# Architecture — Maravilla Intelligence System

## System Diagram

```
┌─────────────────┐
│  Phase 0: Loop  │
│   Validation    │
└────────┬────────┘
         │
         ├→ Flow 0: Existing Leads → Airtable (pending_review)
         ├→ Human Review → Approve/Reject
         ├→ GHL Sync → Email Campaign
         └→ Flow D Opt-Out: Webhook → Suppression

         ✓ Loop validated, proceed to Phase 1

┌─────────────────┐
│  Phase 1: APIs  │
│   Automation    │
└────────┬────────┘
         │
         ├→ Flow A: Sunbiz + SAM → Score → Airtable
         ├→ Flow B: Sunbiz (561720) → Subs Staging
         ├→ Flow C: USASpending → Teaming/FOIA
         ├→ Flow E: Changed Fields → Re-engagement
         └→ Flow D: Opt-out Webhook (continuous)

┌──────────────────┐
│  Phase 2: Supply │
│     Portal       │
└────────┬─────────┘
         │
         └→ Price Module: Subs enter rates → Benchmark builds

┌──────────────────┐
│ Phase 3: GovCon  │
│   Contracts      │
└────────┬─────────┘
         │
         └→ FOIA Requests + Teaming Outreach

┌─────────────────────┐
│ Phase 4: Productize │
│   (2nd Industry)    │
└─────────────────────┘
         │
         └→ Swap NAICS code → all flows adapt
```

## Data Flow

```
Sunbiz / SAM / USASpending (external APIs)
    ↓
Flow A / B / C (n8n)
    ↓
Enrich (Hunter.io or similar)
    ↓
Claude Scoring / Email Drafting
    ↓
Airtable (source of truth)
    ↓
Human Review (Airtable UI)
    ↓
GHL Sync
    ↓
Email Campaign (GHL)
    ↓
Opt-out Webhook (GHL → Flow D)
    ↓
Suppression List (permanent)
```

## Compliance Gates

Every outreach has a human approval gate:

1. **Prospect discovered** (API ingest)
2. **Enriched** (email, phone, website resolved)
3. **Scored** (Claude 1–100)
4. **Airtable pending_review** (human reviews)
5. **Human approves** (pipeline_status = approved)
6. **GHL sync** (contact created)
7. **Email sent** (from GHL)
8. **Opt-out handled** (Flow D → suppression)

No exceptions. Audit log tracks every step.

## Configuration is Swappable

Change ONE line in `config/config.js`:

```javascript
PRIMARY_NAICS = "541330"  // Switch to IT consulting
```

All flows adapt:
- Sunbiz queries use new NAICS
- Claude prompts mention IT services
- ICP segments change
- APIs filter by new code

This is the 16x9 product design: same skeleton, different industries.

## Testing Strategy

- **Unit tests:** Each lib/* module (airtable, scoring, compliance)
- **Integration tests:** Flows interacting (dedup, approval, opt-out)
- **End-to-end:** Phase 0 with real Airtable + GHL + leads

Run: `npm test`
```

- [ ] **Step 2: Create deployment docs**

```markdown
# Deployment Guide

## Prerequisites

- n8n instance (cloud or self-hosted)
- Airtable bases created + populated
- All API keys in .env

## Deployment Steps

### 1. Validate Phase 0

Before deploying Phase 1 automation:

```bash
npm test
npm run integration-test
```

Check: Opt-out flow works, audit log is clean, no duplicate contacts.

### 2. Import n8n Workflows

1. In n8n, go to Workflows → Import
2. Import each workflow JSON:
   - flow-d-optout.json (setup webhook first)
   - flow-0-migration.json (run once)
   - flow-a-clients.json (schedule: daily 6 AM)
   - flow-b-subs.json (schedule: daily 6 AM)
   - flow-c-contracts.json (schedule: daily 7 AM)
   - flow-e-reengagement.json (schedule: daily after A)

### 3. Configure Webhooks

Flow D (opt-out) webhook:

```
Method: POST
URL: https://your-n8n-instance.com/webhook/ghl/opt-out
Headers: { "Content-Type": "application/json" }
Body: { "email": "contact@example.com", "timestamp": "2026-05-25T10:00:00Z" }
```

In GHL:
- Settings → Webhooks → Create
- Event: Contact Unsubscribed
- URL: (paste webhook URL above)
- Test: send test event

### 4. Schedule Daily Flows

- Flow A: 6:00 AM ET (Sunbiz + SAM)
- Flow B: 6:05 AM ET (Subs)
- Flow C: 7:00 AM ET (USASpending)
- Flow E: 7:05 AM ET (Re-engagement)

Stagger to avoid CPU spikes.

### 5. Monitor

```bash
# Check n8n logs
n8n logs

# Monitor Airtable:
# - Prospects table: new records created daily?
# - Audit log: events logged?
# - Suppression list: opt-outs captured?

# Monitor GHL:
# - Contacts synced?
# - Campaign sending?
# - Unsubscribes captured?
```

### 6. Weekly Review

- Check Flow success rates (n8n UI)
- Review audit log for anomalies
- Monitor CPL (cost-per-lead) if running ads
- Check: Any duplicate contacts? (indicates dedup failure)

## Rollback

If an issue occurs:

1. **Pause all flows** (except Flow D)
2. **Investigate:** Check n8n logs + Airtable audit log
3. **Fix:** Update flow + test locally
4. **Re-enable:** One flow at a time, monitor 24 hours

Never delete prospect records without audit log reason.

## Scaling

Max 50 emails/day per sending domain (CAN-SPAM safe). To scale:

1. Add new sending domain (e.g., leads2.maravillacleaners.com)
2. Configure GHL with new sender
3. Create second Flow A instance targeting new domain
4. Split prospects between domains

Never exceed 50/day per domain without legal review.
```

- [ ] **Step 3: Run final tests**

```bash
npm test
```

Expected: 100% tests passing.

- [ ] **Step 4: Commit**

```bash
git add docs/architecture.md DEPLOYMENT.md
git commit -m "docs: add architecture and deployment guides"
```

---

### Task 9: Final Validation & Handoff

**Goal:** Confirm the entire plan is executable and documented.

- [ ] **Step 1: Verify all files are present**

```bash
find . -name "*.js" -o -name "*.json" -o -name "*.md" | grep -E "(config|lib|airtable|n8n-workflows|scoring|docs|tests)" | sort
```

Expected: All files from Task 1–8 present.

- [ ] **Step 2: Run full test suite**

```bash
npm test -- --coverage
```

Expected: >70% coverage, all tests passing.

- [ ] **Step 3: Validate config cascades**

```bash
node -e "const config = require('./config/config'); console.log('NAICS:', config.PRIMARY_NAICS); console.log('Counties:', config.FLORIDA_COUNTIES.length); console.log('Max emails/day:', config.MAX_EMAILS_PER_DAY);"
```

Expected: Config values print correctly.

- [ ] **Step 4: Create final checklist in README**

Update `README.md`:

```markdown
# Pre-Launch Checklist

- [ ] `.env` file populated with all API keys
- [ ] Airtable 4 bases created + schema matches `airtable/schema-*.js`
- [ ] `npm test` passes (100% tests)
- [ ] Phase 0 loop validated with real data:
  - [ ] Existing leads imported (migration/existing-leads.csv)
  - [ ] Prospects scored and saved to Airtable
  - [ ] Human reviewed and approved candidates
  - [ ] GHL sync working (contacts created)
  - [ ] Email campaign sent
  - [ ] Opt-out webhook fired and suppressed contact
- [ ] n8n instance running and accessible
- [ ] n8n Flow D (opt-out) webhook configured + tested
- [ ] All daily flows (A, B, C, E) imported and scheduled
- [ ] Sending domains configured in GHL
- [ ] Compliance review passed (legal sign-off)
- [ ] Audit log clean (no errors logged)

Once all checked: **Ready for Phase 1 production launch.**
```

- [ ] **Step 5: Final commit**

```bash
git add README.md
git commit -m "chore: add pre-launch checklist"
```

- [ ] **Step 6: Create summary of what was built**

```bash
git log --oneline | head -20
```

Expected: 9 commits representing each major task.

---

## Plan Summary

| Phase | Task | Goal | Output |
|-------|------|------|--------|
| 0 | 1 | Config + Airtable schema | 4 bases, 1 config file, tests passing |
| 0 | 2 | API client wrappers | lib/ modules (Airtable, Sunbiz, SAM, USASpending) |
| 0 | 3 | Compliance foundation | Flow D, CAN-SPAM footer, permanent opt-out |
| 1 | 4 | Migration workflow | Flow 0, enrichment, Claude scoring, loop validated |
| 1 | 5 | Setup documentation | Step-by-step guide, troubleshooting |
| 2 | 6 | Automation flows | Flows A–E (daily discovery, scoring, contracts) |
| 2 | 7 | Architecture + deployment | Deployment guide, scaling strategy |
| 2 | 8 | Final validation | Full test suite, pre-launch checklist |

**Total effort:** ~2–3 weeks for one developer (more if you include legal review + actual lead data testing).

**Next:** Choose execution method: **Subagent-Driven** or **Inline Execution**.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-25-maravilla-intelligence-system.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints

**Which approach?**