/**
 * SUBS_STAGING Base Schema
 * Defines tables and field configurations for the SUBS_STAGING base
 */

export const SUBS_STAGING_SCHEMA = {
  baseName: 'SUBS_STAGING',
  tables: [
    {
      name: 'Subs Staging',
      fields: [
        { name: 'legal_name', type: 'singleLineText' },
        { name: 'contact_name', type: 'singleLineText' },
        { name: 'business_email', type: 'email' },
        { name: 'phone', type: 'phoneNumber' },
        { name: 'website', type: 'url' },
        { name: 'date_formed', type: 'date' },
        { name: 'county', type: 'singleSelect', options: [
          { name: 'Miami-Dade' },
          { name: 'Broward' },
          { name: 'Palm Beach' },
          { name: 'Orange' },
          { name: 'Hillsborough' },
          { name: 'Pinellas' },
          { name: 'Duval' },
          { name: 'Polk' },
          { name: 'Seminole' },
          { name: 'Lee' },
          { name: 'St. Lucie' },
          { name: 'Collier' }
        ]},
        { name: 'sub_category', type: 'singleSelect', options: [
          { name: 'Cleaning' },
          { name: 'Maintenance' },
          { name: 'Landscaping' },
          { name: 'Staffing' },
          { name: 'Equipment' },
          { name: 'Supplies' },
          { name: 'Other' }
        ]},
        { name: 'services_offered', type: 'multipleSelect', options: [
          { name: 'Routine Cleaning' },
          { name: 'Deep Cleaning' },
          { name: 'Commercial' },
          { name: 'Residential' },
          { name: 'Post-Construction' },
          { name: 'Window Cleaning' },
          { name: 'Carpet Cleaning' },
          { name: 'Floor Waxing' },
          { name: 'Pressure Washing' },
          { name: 'HVAC Cleaning' },
          { name: 'Other' }
        ]},
        { name: 'status', type: 'singleSelect', options: [
          { name: 'New' },
          { name: 'Contacted' },
          { name: 'Qualified' },
          { name: 'Active' },
          { name: 'Inactive' },
          { name: 'Archived' }
        ]},
        { name: 'source', type: 'singleSelect', options: [
          { name: 'Referral' },
          { name: 'Web' },
          { name: 'LinkedIn' },
          { name: 'Cold Outreach' },
          { name: 'Other' }
        ]},
        { name: 'date_added', type: 'createdTime' },
        { name: 'notes', type: 'multilineText' }
      ]
    }
  ]
};
