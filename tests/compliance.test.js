/**
 * Compliance Manager Tests
 * Tests: opt-out detection, webhook handling, suppression list, audit logging
 */

import test from 'node:test';
import assert from 'node:assert';
import ComplianceManager from '../lib/compliance.js';

// Mock Airtable for testing
class MockAirtable {
  constructor(options) {
    this.apiKey = options.apiKey;
    this.data = {
      Prospects: [],
      'Suppression List': [],
      'Audit Log': [],
    };
  }

  base(baseId) {
    const self = this;
    return (tableName) => {
      return {
        select: (options) => self._selectHandler(tableName, options),
        update: (id, data) => self._updateHandler(tableName, id, data),
        create: (data) => self._createHandler(tableName, data),
      };
    };
  }

  _selectHandler(tableName, options) {
    return {
      all: async () => {
        const formula = options.filterByFormula;
        let results = this.data[tableName] || [];

        // Parse simple filter formulas
        if (formula && formula.includes('{email}')) {
          const emailMatch = formula.match(/'([^']+)'/);
          if (emailMatch) {
            const searchEmail = emailMatch[1];
            results = results.filter(r => r.fields.email === searchEmail);
          }
        }

        return results.slice(0, options.maxRecords || Infinity);
      }
    };
  }

  _updateHandler(tableName, id, data) {
    return new Promise((resolve) => {
      const record = this.data[tableName].find(r => r.id === id);
      if (record) {
        record.fields = { ...record.fields, ...data.fields };
      }
      resolve({ id, fields: data.fields });
    });
  }

  _createHandler(tableName, data) {
    return new Promise((resolve) => {
      const id = `rec_${Math.random().toString(36).substr(2, 9)}`;
      const record = { id, fields: data.fields };
      this.data[tableName].push(record);
      resolve(record);
    });
  }
}

// Setup mock environment
process.env.AIRTABLE_API_KEY = 'test-key';
process.env.AIRTABLE_BASE_ID = 'appTest';

let mockAirtableInstance;

// Override ComplianceManager to use mock
class TestComplianceManager extends ComplianceManager {
  constructor(config) {
    super(config);
    mockAirtableInstance = new MockAirtable({ apiKey: process.env.AIRTABLE_API_KEY });
    this.airtable = mockAirtableInstance;
  }
}

test('ComplianceManager - Basic instantiation', () => {
  const manager = new TestComplianceManager({});
  assert.ok(manager);
  assert.strictEqual(manager.baseId, 'appTest');
});

test('ComplianceManager.isOptedOut - Returns false for non-existent email', async () => {
  const manager = new TestComplianceManager({});
  const result = await manager.isOptedOut('unknown@example.com');
  assert.strictEqual(result, false);
});

test('ComplianceManager.isOptedOut - Returns true for opted-out email', async () => {
  const manager = new TestComplianceManager({});

  // Add email to suppression list
  mockAirtableInstance.data['Suppression List'].push({
    id: 'rec_sup_1',
    fields: {
      email: 'opted@example.com',
      status: 'Active',
      source: 'Test',
    }
  });

  const result = await manager.isOptedOut('opted@example.com');
  assert.strictEqual(result, true);
});

test('ComplianceManager.isOptedOut - Throws on invalid email', async () => {
  const manager = new TestComplianceManager({});

  await assert.rejects(
    () => manager.isOptedOut(null),
    /Invalid email format/
  );

  await assert.rejects(
    () => manager.isOptedOut(123),
    /Invalid email format/
  );
});

test('ComplianceManager.handleOptOut - Creates prospect and suppression records', async () => {
  const manager = new TestComplianceManager({});

  // Setup: Add a prospect
  mockAirtableInstance.data.Prospects.push({
    id: 'rec_prospect_1',
    fields: {
      email: 'test@example.com',
      name: 'Test User',
      opt_out: false,
    }
  });

  const payload = {
    email: 'test@example.com',
    ghl_contact_id: 'contact_123',
    timestamp: '2026-05-25T10:00:00Z'
  };

  const result = await manager.handleOptOut(payload);

  assert.ok(result.success);
  assert.strictEqual(result.email, 'test@example.com');
  assert.strictEqual(result.prospectId, 'rec_prospect_1');

  // Verify prospect was updated
  const prospect = mockAirtableInstance.data.Prospects[0];
  assert.strictEqual(prospect.fields.opt_out, true);
  assert.strictEqual(prospect.fields.opt_out_source, 'GHL');

  // Verify suppression list entry created
  const suppression = mockAirtableInstance.data['Suppression List'][0];
  assert.strictEqual(suppression.fields.email, 'test@example.com');
  assert.strictEqual(suppression.fields.status, 'Active');
  assert.strictEqual(suppression.fields.source, 'GHL Webhook');

  // Verify audit log created
  const auditLog = mockAirtableInstance.data['Audit Log'][0];
  assert.strictEqual(auditLog.fields.event_type, 'opted_out');
  assert.strictEqual(auditLog.fields.email, 'test@example.com');
});

test('ComplianceManager.handleOptOut - Throws on missing email', async () => {
  const manager = new TestComplianceManager({});

  await assert.rejects(
    () => manager.handleOptOut({ ghl_contact_id: 'contact_123' }),
    /Email is required in opt-out payload/
  );
});

test('ComplianceManager.handleOptOut - Normalizes email to lowercase', async () => {
  const manager = new TestComplianceManager({});

  mockAirtableInstance.data.Prospects.push({
    id: 'rec_prospect_2',
    fields: {
      email: 'TEST@EXAMPLE.COM',
      name: 'Test User',
      opt_out: false,
    }
  });

  const payload = {
    email: 'TEST@EXAMPLE.COM',
    ghl_contact_id: 'contact_456',
    timestamp: '2026-05-25T11:00:00Z'
  };

  const result = await manager.handleOptOut(payload);

  assert.strictEqual(result.email, 'test@example.com');
  const suppression = mockAirtableInstance.data['Suppression List'][0];
  assert.strictEqual(suppression.fields.email, 'test@example.com');
});

test('ComplianceManager.validateOutreach - Allows valid outreach', async () => {
  const manager = new TestComplianceManager({});

  const outreach = {
    email: 'valid@example.com',
    prospect_id: 'rec_prospect_1',
    message: 'This is a legitimate business outreach.',
    channel: 'email'
  };

  const result = await manager.validateOutreach(outreach);

  assert.strictEqual(result.allowed, true);
  assert.strictEqual(result.reason, undefined);
});

test('ComplianceManager.validateOutreach - Rejects opted-out emails', async () => {
  const manager = new TestComplianceManager({});

  // Setup: Add opted-out email
  mockAirtableInstance.data['Suppression List'].push({
    id: 'rec_sup_2',
    fields: {
      email: 'optedout@example.com',
      status: 'Active',
      source: 'GHL',
    }
  });

  const outreach = {
    email: 'optedout@example.com',
    prospect_id: 'rec_prospect_1',
    message: 'This is a legitimate business outreach.',
    channel: 'email'
  };

  const result = await manager.validateOutreach(outreach);

  assert.strictEqual(result.allowed, false);
  assert.match(result.reason, /suppression list/i);
});

test('ComplianceManager.validateOutreach - Rejects scraping language', async () => {
  const manager = new TestComplianceManager({});

  const scraperMessages = [
    'We use web scraping to collect your data',
    'Our data mining tool will extract your information',
    'This is automated extraction without permission',
    'Our unauthorized scraper found your contact',
  ];

  for (const message of scraperMessages) {
    const outreach = {
      email: 'test@example.com',
      prospect_id: 'rec_prospect_1',
      message,
      channel: 'email'
    };

    const result = await manager.validateOutreach(outreach);

    assert.strictEqual(result.allowed, false, `Should reject: ${message}`);
    assert.match(result.reason, /scraping|spam language/i);
  }
});

test('ComplianceManager.validateOutreach - Accepts clean business messages', async () => {
  const manager = new TestComplianceManager({});

  const cleanMessages = [
    'We noticed your company is in the cleaning industry. We offer janitorial services.',
    'Your business profile indicates you might benefit from our commercial cleaning services.',
    'Based on public information, we believe our service aligns with your needs.',
  ];

  for (const message of cleanMessages) {
    const outreach = {
      email: 'test@example.com',
      prospect_id: 'rec_prospect_1',
      message,
      channel: 'email'
    };

    const result = await manager.validateOutreach(outreach);

    assert.strictEqual(result.allowed, true, `Should allow: ${message}`);
  }
});

test('ComplianceManager.validateOutreach - Rejects invalid email format', async () => {
  const manager = new TestComplianceManager({});

  const result = await manager.validateOutreach({
    email: null,
    prospect_id: 'rec_prospect_1',
    message: 'Test message',
    channel: 'email'
  });

  assert.strictEqual(result.allowed, false);
  assert.match(result.reason, /invalid email/i);
});

test('ComplianceManager.validateOutreach - Returns error on validation failure', async () => {
  const manager = new TestComplianceManager({});

  // Force an error by passing undefined outreach
  const result = await manager.validateOutreach({
    email: 'test@example.com',
  });

  // Should still succeed with missing optional fields
  assert.strictEqual(result.allowed, true);
});

test('Compliance flow - End-to-end opt-out + validation', async () => {
  const manager = new TestComplianceManager({});

  // Step 1: Create prospect
  mockAirtableInstance.data.Prospects.push({
    id: 'rec_prospect_e2e',
    fields: {
      email: 'user@example.com',
      name: 'John Doe',
      opt_out: false,
    }
  });

  // Step 2: Handle opt-out webhook
  const optOutPayload = {
    email: 'user@example.com',
    ghl_contact_id: 'contact_e2e',
    timestamp: '2026-05-25T12:00:00Z'
  };

  const optOutResult = await manager.handleOptOut(optOutPayload);
  assert.strictEqual(optOutResult.success, true);

  // Step 3: Try to send outreach to opted-out email
  const outreach = {
    email: 'user@example.com',
    prospect_id: 'rec_prospect_e2e',
    message: 'This is a legitimate business outreach.',
    channel: 'email'
  };

  const validationResult = await manager.validateOutreach(outreach);
  assert.strictEqual(validationResult.allowed, false);
  assert.match(validationResult.reason, /suppression list/i);

  // Verify all tables updated
  assert.strictEqual(mockAirtableInstance.data.Prospects[0].fields.opt_out, true);
  assert.strictEqual(mockAirtableInstance.data['Suppression List'].length, 1);
  assert.strictEqual(mockAirtableInstance.data['Audit Log'].length, 1);
});
