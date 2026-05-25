/**
 * PRICE_BENCHMARK Base Schema
 * Defines tables and field configurations for the PRICE_BENCHMARK base
 */

export const PRICE_BENCHMARK_SCHEMA = {
  baseName: 'PRICE_BENCHMARK',
  tables: [
    {
      name: 'Price Benchmark',
      fields: [
        { name: 'id', type: 'singleLineText' },
        { name: 'sub_id', type: 'singleLineText' },
        { name: 'service_type', type: 'singleSelect', options: [
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
        { name: 'spec_description', type: 'multilineText' },
        { name: 'price_quoted', type: 'currency' },
        { name: 'price_unit', type: 'singleSelect', options: [
          { name: 'Per Hour' },
          { name: 'Per Day' },
          { name: 'Per Week' },
          { name: 'Per Month' },
          { name: 'Per Square Foot' },
          { name: 'Per Job' },
          { name: 'Other' }
        ]},
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
        { name: 'date_quoted', type: 'date' },
        { name: 'verified', type: 'checkbox' }
      ]
    }
  ]
};
