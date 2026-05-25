# Airtable Integration

This module contains all schema definitions and setup scripts for the Maravilla Intelligence Airtable bases.

## Bases

1. **CLIENTS** - Main prospect database with 3 tables
   - Prospects: 37 fields for lead tracking
   - Audit Log: 6 fields for tracking changes
   - Suppression List: 4 fields for opt-out management

2. **CONTRACTS** - Government and commercial contracts
   - Contracts: 21 fields for contract tracking

3. **SUBS_STAGING** - Sub-contractor staging database
   - Subs Staging: 13 fields for vendor management

4. **PRICE_BENCHMARK** - Pricing reference database
   - Price Benchmark: 9 fields for price tracking

## Files

- `schema-clients.js` - CLIENTS base schema
- `schema-contracts.js` - CONTRACTS base schema
- `schema-subs-staging.js` - SUBS_STAGING base schema
- `schema-price-benchmark.js` - PRICE_BENCHMARK base schema
- `create-bases.js` - Main script to create all bases
- `validate-schemas.js` - Validation script to verify all schemas

## Setup

### Prerequisites

1. Node.js 16+ installed
2. Airtable API key (personal token with `create` scope)
3. `.env` file with `AIRTABLE_API_KEY` set

### Installation

```bash
npm install
```

### Usage

#### Validate Schemas

Validate all schema files before creation:

```bash
npm run airtable:validate
```

#### Create Bases

Create all 4 bases with tables and fields:

```bash
npm run airtable:create-bases
```

This script will:
1. Authenticate with Airtable API using your token
2. Create 4 new bases (CLIENTS, CONTRACTS, SUBS_STAGING, PRICE_BENCHMARK)
3. Create all tables within each base
4. Create all fields with proper types and options
5. Log the base IDs for reference

## Schema Structure

Each schema file exports an object with:

```javascript
{
  baseName: 'BASE_NAME',
  tables: [
    {
      name: 'Table Name',
      fields: [
        {
          name: 'field_name',
          type: 'fieldType',
          options: { /* for select/multi-select */ }
        }
      ]
    }
  ]
}
```

## Field Types

Supported field types:
- `singleLineText` - Single line text
- `multilineText` - Multi-line text
- `email` - Email field
- `url` - URL field
- `phoneNumber` - Phone number
- `number` - Number
- `currency` - Currency
- `percent` - Percentage
- `date` - Date
- `checkbox` - Checkbox
- `singleSelect` - Single select dropdown (requires `options`)
- `multipleSelect` - Multiple select (requires `options`)
- `createdTime` - Auto-populated created time

## API Key

Get your Airtable API key from: https://airtable.com/account/tokens

Set in `.env`:
```
AIRTABLE_API_KEY=pat_YOUR_TOKEN_HERE
```

## Troubleshooting

### 401 Authentication Error
- Verify your API key is correct
- Check the token has not expired
- Ensure token has `create` scope

### Validation Errors
Run `npm run airtable:validate` to check schema syntax before creation.

## Notes

- The script filters out system fields (`date_added`, `lastModifiedTime`) during creation as these are auto-managed by Airtable
- Select field options are auto-populated based on schema definitions
- Base IDs will be logged after successful creation for use in other parts of the system
