/**
 * DATA SOURCES Base Schema
 * Defines tables and field configurations for managing data sources
 */

export const DATA_SOURCES_SCHEMA = {
  baseName: 'DATA_SOURCES',
  tables: [
    {
      name: 'Sources',
      fields: [
        { name: 'name', type: 'singleLineText' },
        { name: 'category', type: 'singleSelect', options: [
          { name: 'Gobierno federal' },
          { name: 'Estatal y local' },
          { name: 'GIS y geoespacial' },
          { name: 'Salud y regulacion' },
          { name: 'Financiero y corporativo' },
          { name: 'Directorios de negocios' }
        ]},
        { name: 'description', type: 'multilineText' },
        { name: 'url', type: 'url' },
        { name: 'is_free', type: 'checkbox' },
        { name: 'requires_api_key', type: 'checkbox' },
        { name: 'api_key', type: 'singleLineText' }, // Will be encrypted in production
        { name: 'status', type: 'singleSelect', options: [
          { name: 'Active' },
          { name: 'Inactive' },
          { name: 'Testing' },
          { name: 'Error' },
          { name: 'Rate Limited' }
        ]},
        { name: 'last_sync', type: 'lastModifiedTime' },
        { name: 'records_imported', type: 'number' },
        { name: 'import_frequency', type: 'singleSelect', options: [
          { name: 'Manual' },
          { name: 'Hourly' },
          { name: 'Daily' },
          { name: 'Weekly' },
          { name: 'Monthly' }
        ]},
        { name: 'data_type', type: 'singleSelect', options: [
          { name: 'Contracts' },
          { name: 'Opportunities' },
          { name: 'Companies' },
          { name: 'Contacts' },
          { name: 'Locations' },
          { name: 'Financial' },
          { name: 'Mixed' }
        ]},
        { name: 'geographic_scope', type: 'singleLineText' }, // e.g., "US Federal", "Florida", "All States"
        { name: 'error_message', type: 'multilineText' },
        { name: 'notes', type: 'multilineText' },
        { name: 'created_at', type: 'createdTime' },
      ]
    },
    {
      name: 'Import Logs',
      fields: [
        { name: 'source_name', type: 'singleLineText' },
        { name: 'import_date', type: 'date' },
        { name: 'records_count', type: 'number' },
        { name: 'status', type: 'singleSelect', options: [
          { name: 'Success' },
          { name: 'Failed' },
          { name: 'Partial' },
          { name: 'Pending' }
        ]},
        { name: 'error_details', type: 'multilineText' },
        { name: 'duration_ms', type: 'number' },
        { name: 'timestamp', type: 'createdTime' },
      ]
    }
  ]
}
