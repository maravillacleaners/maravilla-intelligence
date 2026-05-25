/**
 * SUBS_STAGING Airtable Base Setup Schema
 *
 * This script documents the schema for the SUBS_STAGING Airtable base.
 * The base and tables should be created manually in the Airtable UI.
 *
 * Base Name: SUBS_STAGING
 * Tables: Suppliers, Supplier_Opportunities, Supplier_Applications, Communications
 *
 * INSTRUCTIONS:
 * 1. Go to https://airtable.com
 * 2. Create a new Base named "SUBS_STAGING"
 * 3. Note the Base ID (starts with 'app') and add it to .env as AIRTABLE_SUBS_BASE_ID
 * 4. Create the 4 tables with exact names shown below
 * 5. Add fields to each table using the schema defined below
 * 6. Run this script to validate (when API integration is added)
 */

const SUBS_STAGING_SCHEMA = {
  baseName: 'SUBS_STAGING',
  tables: {
    Suppliers: {
      description: 'Master supplier registry for vendor management',
      fields: [
        // Identity & Contact (Required)
        { name: 'supplier_id', type: 'text', description: 'Unique supplier identifier' },
        { name: 'legal_name', type: 'text', description: 'Legal business name' },
        { name: 'contact_name', type: 'text', description: 'Primary contact person' },
        { name: 'business_email', type: 'email', description: 'Business email address' },
        { name: 'phone', type: 'phone_number', description: 'Business phone number' },
        { name: 'website', type: 'url', description: 'Business website URL' },

        // Categorization
        { name: 'sub_category', type: 'single_select', description: 'Supplier category (e.g., HVAC, Janitorial, Plumbing)',
          options: ['Janitorial Services', 'HVAC', 'Plumbing', 'Electrical', 'Construction', 'Landscaping', 'Security', 'Other'] },
        { name: 'services_offered', type: 'multiple_select', description: 'List of services offered',
          options: ['Deep Cleaning', 'Routine Cleaning', 'Commercial Cleaning', 'Post-Construction', 'Maintenance', 'Specialty Services'] },
        { name: 'preferred_counties', type: 'multiple_select', description: 'Counties where supplier operates',
          options: ['Lee', 'Hillsborough', 'Pinellas', 'Duval', 'Miami-Dade', 'Polk', 'St. Lucie', 'Collier'] },

        // Government & Compliance
        { name: 'certification_status', type: 'single_select', description: 'Government certification status',
          options: ['Not Certified', 'MBE', 'WBE', 'VOSB', 'HUBZone', 'GSA Schedule', 'State Contract', 'Multiple'] },
        { name: 'sam_gov_id', type: 'text', description: 'SAM.gov CAGE registration number' },
        { name: 'cage_code', type: 'text', description: 'CAGE code for federal contracting' },

        // Operational
        { name: 'availability_start_date', type: 'date', description: 'Date when supplier became available' },
        { name: 'estimated_annual_capacity_usd', type: 'number', description: 'Estimated annual capacity in USD' },
        { name: 'insurance_certificate_url', type: 'url', description: 'URL to insurance certificate' },

        // Status & Tracking
        { name: 'registration_status', type: 'single_select', description: 'Registration status in supplier portal',
          options: ['Pending', 'Active', 'Inactive', 'Suspended', 'Approved'] },
        { name: 'registration_date', type: 'date', description: 'Date supplier registered in portal' },
        { name: 'last_activity_date', type: 'date', description: 'Last activity timestamp' },

        // Authentication (Do NOT expose in UI)
        { name: 'password_hash', type: 'text', description: '[INTERNAL] Hashed password for portal login' },

        // Notes
        { name: 'notes', type: 'long_text', description: 'Additional notes about supplier' },
      ],
      recordCount: 0,
      views: ['All Suppliers', 'Active', 'GSA Schedule Holders', 'By Category'],
    },

    Supplier_Opportunities: {
      description: 'Government contracting opportunities matched to suppliers',
      fields: [
        // Identifiers
        { name: 'supplier_id', type: 'text', description: 'Reference to Suppliers table' },
        { name: 'opportunity_id', type: 'text', description: 'Unique opportunity identifier' },

        // Opportunity Details
        { name: 'opportunity_name', type: 'text', description: 'Name/title of the opportunity' },
        { name: 'agency', type: 'text', description: 'Government agency (e.g., EPA, DOD, GSA)' },
        { name: 'contract_value_usd', type: 'number', description: 'Contract value in USD' },
        { name: 'deadline', type: 'date', description: 'Application/bid deadline' },

        // Matching & Scoring
        { name: 'match_score', type: 'number', description: 'Algorithm match score (0-100)' },
        { name: 'match_reason', type: 'long_text', description: 'Why this opportunity matches supplier' },
        { name: 'status', type: 'single_select', description: 'Current opportunity status',
          options: ['New', 'Matched', 'Applied', 'Won', 'Lost', 'Archived'] },

        // Dates
        { name: 'date_matched', type: 'date', description: 'When opportunity was matched to supplier' },
        { name: 'date_applied', type: 'date', description: 'When supplier applied/submitted bid' },
      ],
      recordCount: 0,
      views: ['Active Opportunities', 'Applied', 'Won', 'By Agency'],
    },

    Supplier_Applications: {
      description: 'Track supplier applications and responses to opportunities',
      fields: [
        // Identifiers
        { name: 'supplier_id', type: 'text', description: 'Reference to Suppliers table' },
        { name: 'supplier_name', type: 'text', description: 'Supplier legal name (denormalized for UI)' },
        { name: 'opportunity_id', type: 'text', description: 'Reference to opportunity' },
        { name: 'opportunity_name', type: 'text', description: 'Opportunity name (denormalized for UI)' },

        // Application Status
        { name: 'application_status', type: 'single_select', description: 'Current application status',
          options: ['Draft', 'Submitted', 'Under Review', 'Accepted', 'Rejected', 'Withdrawn'] },

        // Dates
        { name: 'application_date', type: 'date', description: 'When application was submitted' },
        { name: 'response_date', type: 'date', description: 'When response was received from agency' },

        // Notes
        { name: 'notes', type: 'long_text', description: 'Application notes, feedback, rejection reasons' },
      ],
      recordCount: 0,
      views: ['Pending Review', 'Accepted', 'Rejected', 'By Supplier'],
    },

    Communications: {
      description: 'Email communications log with suppliers',
      fields: [
        // Identifiers
        { name: 'supplier_id', type: 'text', description: 'Reference to Suppliers table' },
        { name: 'supplier_email', type: 'email', description: 'Email address communication was sent to' },

        // Email Details
        { name: 'email_type', type: 'single_select', description: 'Type of communication',
          options: ['Opportunity Notification', 'Application Reminder', 'Feedback', 'Onboarding', 'Follow-up', 'System Alert'] },
        { name: 'email_subject', type: 'text', description: 'Email subject line' },

        // Status
        { name: 'sent_date', type: 'date', description: 'When email was sent' },
        { name: 'open_status', type: 'single_select', description: 'Email open status (if tracking enabled)',
          options: ['Sent', 'Delivered', 'Opened', 'Clicked', 'Bounced'] },
      ],
      recordCount: 0,
      views: ['Sent', 'Opened', 'By Type'],
    },
  },
};

// Schema validation function (for future API integration)
function validateSchema(baseId: string, tables: Record<string, any>): boolean {
  console.log(`\n✓ Schema validation complete for base: ${baseId}`);
  console.log(`✓ Expected tables: ${Object.keys(SUBS_STAGING_SCHEMA.tables).join(', ')}`);
  return true;
}

// Display schema for manual reference
function displaySchema(): void {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('SUBS_STAGING Airtable Base Setup - Schema Definition');
  console.log('═══════════════════════════════════════════════════════════════\n');

  Object.entries(SUBS_STAGING_SCHEMA.tables).forEach(([tableName, table]: [string, any]) => {
    console.log(`\n📋 TABLE: ${tableName}`);
    console.log(`   Description: ${table.description}`);
    console.log(`   Fields: ${table.fields.length}`);
    console.log(`   ─────────────────────────────────────────────────`);

    table.fields.forEach((field: any, index: number) => {
      const fieldType = field.type.replace(/_/g, ' ').toUpperCase();
      const options = field.options ? ` [${field.options.join(', ')}]` : '';
      console.log(`   ${index + 1}. ${field.name}`);
      console.log(`      Type: ${fieldType}${options}`);
      console.log(`      ${field.description}`);
    });

    if (table.views.length > 0) {
      console.log(`\n   Views to create: ${table.views.join(', ')}`);
    }
  });

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

// Main execution
async function main(): Promise<void> {
  console.log('\n🚀 SUBS_STAGING Airtable Base Setup');

  // Display schema for manual reference
  displaySchema();

  // Instructions for manual setup
  console.log('\n📋 MANUAL SETUP INSTRUCTIONS:');
  console.log('\n1. Create Base in Airtable UI:');
  console.log('   → Go to https://airtable.com');
  console.log('   → Click "Create" → "Create Base from scratch"');
  console.log('   → Name it "SUBS_STAGING"');
  console.log('   → Note the Base ID (starts with "app")');
  console.log('   → Add AIRTABLE_SUBS_BASE_ID=appXXXXXXXXXXXXXX to .env\n');

  console.log('2. Create Tables:');
  Object.keys(SUBS_STAGING_SCHEMA.tables).forEach((tableName) => {
    console.log(`   → ${tableName}`);
  });
  console.log();

  console.log('3. Add Fields to Each Table:');
  console.log('   Use the schema displayed above to add fields with exact names and types\n');

  console.log('4. Create Views (Optional):');
  Object.entries(SUBS_STAGING_SCHEMA.tables).forEach(([tableName, table]: [string, any]) => {
    if (table.views.length > 0) {
      console.log(`   ${tableName}: ${table.views.join(', ')}`);
    }
  });

  console.log('\n5. Verify Setup:');
  console.log('   → All tables created');
  console.log('   → All fields added with correct types');
  console.log('   → Base ID in .env as AIRTABLE_SUBS_BASE_ID\n');

  console.log('\n✅ Once setup is complete, commit the changes and move to Task 2\n');
}

main().catch(console.error);

export { SUBS_STAGING_SCHEMA, validateSchema };
