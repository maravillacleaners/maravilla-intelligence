/**
 * CONTRACTS Base Schema
 * Defines tables and field configurations for the CONTRACTS base
 */

export const CONTRACTS_SCHEMA = {
  baseName: 'CONTRACTS',
  tables: [
    {
      name: 'Contracts',
      fields: [
        { name: 'usaspending_award_id', type: 'singleLineText' },
        { name: 'agency', type: 'singleLineText' },
        { name: 'prime_contractor', type: 'singleLineText' },
        { name: 'prime_uei', type: 'singleLineText' },
        { name: 'prime_email', type: 'email' },
        { name: 'total_obligated_amount', type: 'currency' },
        { name: 'naics', type: 'singleLineText' },
        { name: 'sow_summary', type: 'multilineText' },
        { name: 'period_start', type: 'date' },
        { name: 'period_end', type: 'date' },
        { name: 'place_city', type: 'singleLineText' },
        { name: 'place_county', type: 'singleLineText' },
        { name: 'teaming_opportunity', type: 'checkbox' },
        { name: 'foia_pending', type: 'checkbox' },
        { name: 'foia_sent_date', type: 'date' },
        { name: 'foia_draft', type: 'multilineText' },
        { name: 'teaming_email_draft', type: 'multilineText' },
        { name: 'outreach_status', type: 'singleSelect', options: [
          { name: 'Not Started' },
          { name: 'Draft' },
          { name: 'Sent' },
          { name: 'Replied' },
          { name: 'Meeting Scheduled' },
          { name: 'Proposal Sent' },
          { name: 'Won' },
          { name: 'Lost' },
          { name: 'Archived' }
        ]},
        { name: 'outreach_date', type: 'date' },
        { name: 'source', type: 'singleSelect', options: [
          { name: 'USAspending' },
          { name: 'SAM.gov' },
          { name: 'Manual' },
          { name: 'Other' }
        ]},
        { name: 'notes', type: 'multilineText' }
      ]
    }
  ]
};
