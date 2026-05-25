/**
 * CLIENTS Base Schema
 * Defines tables and field configurations for the CLIENTS base
 */

export const CLIENTS_SCHEMA = {
  baseName: 'CLIENTS',
  tables: [
    {
      name: 'Prospects',
      fields: [
        { name: 'legal_name', type: 'singleLineText' },
        { name: 'dba', type: 'singleLineText' },
        { name: 'entity_type', type: 'singleSelect', options: [
          { name: 'Corporation' },
          { name: 'LLC' },
          { name: 'Partnership' },
          { name: 'Sole Proprietorship' },
          { name: 'Non-Profit' },
          { name: 'Government' },
          { name: 'Other' }
        ]},
        { name: 'sunbiz_status', type: 'singleLineText' },
        { name: 'date_formed', type: 'date' },
        { name: 'naics', type: 'singleLineText' },
        { name: 'officer_name', type: 'singleLineText' },
        { name: 'registered_address', type: 'singleLineText' },
        { name: 'physical_address', type: 'singleLineText' },
        { name: 'is_virtual_office', type: 'checkbox' },
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
        { name: 'zip', type: 'singleLineText' },
        { name: 'business_email', type: 'email' },
        { name: 'phone', type: 'phoneNumber' },
        { name: 'website', type: 'url' },
        { name: 'linkedin', type: 'url' },
        { name: 'has_physical_office', type: 'checkbox' },
        { name: 'sqft_estimate', type: 'number' },
        { name: 'employees_estimate', type: 'number' },
        { name: 'segment', type: 'singleSelect', options: [
          { name: 'Property Manager' },
          { name: 'Clinic/Medical' },
          { name: 'Office Complex' },
          { name: 'Government/GovCon' },
          { name: 'Newly Formed' },
          { name: 'Other' }
        ]},
        { name: 'service_fit', type: 'singleLineText' },
        { name: 'ticket_estimate', type: 'currency' },
        { name: 'priority', type: 'singleSelect', options: [
          { name: 'P0' },
          { name: 'P1' },
          { name: 'P2' },
          { name: 'P3' },
          { name: 'P4' }
        ]},
        { name: 'intent_signal', type: 'singleLineText' },
        { name: 'icebreaker', type: 'multilineText' },
        { name: 'score', type: 'number' },
        { name: 'source', type: 'singleSelect', options: [
          { name: 'Sunbiz' },
          { name: 'LinkedIn' },
          { name: 'USAspending' },
          { name: 'Web' },
          { name: 'Referral' },
          { name: 'Other' }
        ]},
        { name: 'date_added', type: 'createdTime' },
        { name: 'pipeline_status', type: 'singleSelect', options: [
          { name: 'Lead' },
          { name: 'Prospect' },
          { name: 'Qualified' },
          { name: 'Contacted' },
          { name: 'Proposal' },
          { name: 'Won' },
          { name: 'Lost' },
          { name: 'On-Hold' }
        ]},
        { name: 're_engagement_candidate', type: 'checkbox' },
        { name: 'change_detected', type: 'checkbox' },
        { name: 'opt_out', type: 'checkbox' },
        { name: 'opt_out_date', type: 'date' },
        { name: 'opt_out_source', type: 'singleLineText' },
        { name: 'retention_tier', type: 'singleSelect', options: [
          { name: 'Tier 1' },
          { name: 'Tier 2' },
          { name: 'Tier 3' },
          { name: 'Tier 4' },
          { name: 'Tier 5' }
        ]},
        { name: 'last_contacted', type: 'date' },
        { name: 'notes', type: 'multilineText' }
      ]
    },
    {
      name: 'Audit Log',
      fields: [
        { name: 'record_id', type: 'singleLineText' },
        { name: 'event_date', type: 'createdTime' },
        { name: 'event_type', type: 'singleSelect', options: [
          { name: 'Created' },
          { name: 'Updated' },
          { name: 'Contacted' },
          { name: 'Status Changed' },
          { name: 'Score Updated' },
          { name: 'Opt-Out' },
          { name: 'Re-Engaged' },
          { name: 'Other' }
        ]},
        { name: 'source', type: 'singleLineText' },
        { name: 'performed_by', type: 'singleLineText' },
        { name: 'notes', type: 'multilineText' }
      ]
    },
    {
      name: 'Suppression List',
      fields: [
        { name: 'email', type: 'email' },
        { name: 'legal_name', type: 'singleLineText' },
        { name: 'opt_out_date', type: 'date' },
        { name: 'reason', type: 'singleLineText' }
      ]
    }
  ]
};
