/**
 * Config Tests
 * Native Node.js test runner (--test flag)
 */

import assert from 'assert';
import { test } from 'node:test';
import config from '../config/config.js';

test('Config Scaffold - System Identity', async (t) => {
  await t.test('SYSTEM_NAME is defined', () => {
    assert.ok(config.SYSTEM_NAME);
    assert.strictEqual(config.SYSTEM_NAME, 'Maravilla Intelligence');
  });

  await t.test('VERSION is defined', () => {
    assert.ok(config.VERSION);
    assert.match(config.VERSION, /\d+\.\d+\.\d+/);
  });

  await t.test('ENVIRONMENT is set', () => {
    assert.ok(config.ENVIRONMENT);
    assert.strictEqual(typeof config.ENVIRONMENT, 'string');
  });
});

test('Config Scaffold - Industry Classification', async (t) => {
  await t.test('PRIMARY_NAICS is defined', () => {
    assert.ok(config.PRIMARY_NAICS);
  });

  await t.test('PRIMARY_NAICS is defined', () => {
    assert.ok(config.PRIMARY_NAICS);
    assert.strictEqual(typeof config.PRIMARY_NAICS, 'string');
  });

  await t.test('NAICS_NAME is defined', () => {
    assert.ok(config.NAICS_NAME);
    assert.strictEqual(typeof config.NAICS_NAME, 'string');
  });
});

test('Config Scaffold - Geographic Configuration', async (t) => {
  await t.test('FLORIDA_COUNTIES is an array', () => {
    assert.ok(Array.isArray(config.FLORIDA_COUNTIES));
  });

  await t.test('FLORIDA_COUNTIES has 8 counties', () => {
    assert.strictEqual(config.FLORIDA_COUNTIES.length, 8);
  });

  await t.test('Each county has required fields', () => {
    config.FLORIDA_COUNTIES.forEach((county) => {
      assert.ok(county.name, 'County must have name');
      assert.ok(county.code, 'County must have code');
      assert.ok(county.metro, 'County must have metro');
    });
  });

  await t.test('County codes follow pattern FL-XX', () => {
    config.FLORIDA_COUNTIES.forEach((county) => {
      assert.match(county.code, /^FL-[A-Z]{2}$/);
    });
  });

  await t.test('Miami-Dade is first county', () => {
    assert.strictEqual(config.FLORIDA_COUNTIES[0].name, 'Miami-Dade');
  });

  await t.test('All county names are unique', () => {
    const names = config.FLORIDA_COUNTIES.map((c) => c.name);
    const unique = new Set(names);
    assert.strictEqual(names.length, unique.size);
  });
});

test('Config Scaffold - ICP Segments', async (t) => {
  await t.test('ICP_SEGMENTS is an array', () => {
    assert.ok(Array.isArray(config.ICP_SEGMENTS));
  });

  await t.test('ICP_SEGMENTS has 5 segments', () => {
    assert.strictEqual(config.ICP_SEGMENTS.length, 5);
  });

  await t.test('Each segment has required fields', () => {
    config.ICP_SEGMENTS.forEach((segment) => {
      assert.ok(segment.segment, 'Segment must have segment name');
      assert.ok(segment.priority !== undefined, 'Segment must have priority');
      assert.ok(segment.fit_score !== undefined, 'Segment must have fit_score');
      assert.ok(segment.description, 'Segment must have description');
      assert.ok(Array.isArray(segment.key_signals), 'Segment must have key_signals array');
    });
  });

  await t.test('Priorities are sequential 1-5', () => {
    const priorities = config.ICP_SEGMENTS.map((s) => s.priority).sort((a, b) => a - b);
    for (let i = 0; i < priorities.length; i++) {
      assert.strictEqual(priorities[i], i + 1);
    }
  });

  await t.test('Fit scores are between 0.75-1.0', () => {
    config.ICP_SEGMENTS.forEach((segment) => {
      assert.ok(segment.fit_score >= 0.75 && segment.fit_score <= 1.0,
        `Fit score ${segment.fit_score} out of range for ${segment.segment}`);
    });
  });

  await t.test('Property Manager is highest priority', () => {
    const pm = config.ICP_SEGMENTS.find((s) => s.segment === 'Property Manager');
    assert.ok(pm);
    assert.strictEqual(pm.priority, 1);
    assert.strictEqual(pm.fit_score, 0.95);
  });
});

test('Config Scaffold - Integrations', async (t) => {
  await t.test('Airtable config exists', () => {
    assert.ok(config.AIRTABLE);
    assert.ok(config.AIRTABLE.API_KEY_ENV_VAR);
    assert.ok(config.AIRTABLE.TABLES.PROSPECTS);
  });

  await t.test('n8n config exists', () => {
    assert.ok(config.N8N);
    assert.ok(config.N8N.API_URL_ENV_VAR);
    assert.ok(config.N8N.TIMEOUT_MS > 0);
  });

  await t.test('Claude API config exists', () => {
    assert.ok(config.CLAUDE_API);
    assert.ok(config.CLAUDE_API.API_KEY_ENV_VAR);
    assert.match(config.CLAUDE_API.MODEL, /^claude-/);
    assert.ok(config.CLAUDE_API.MAX_TOKENS >= 1024);
  });
});

test('Config Scaffold - Lead Scoring', async (t) => {
  await t.test('Lead scoring config exists', () => {
    assert.ok(config.LEAD_SCORING);
    assert.ok(config.LEAD_SCORING.HIGH_SCORE_THRESHOLD > config.LEAD_SCORING.MEDIUM_SCORE_THRESHOLD);
  });

  await t.test('Weights sum to 1.0', () => {
    const sum = config.LEAD_SCORING.RECENCY_WEIGHT
      + config.LEAD_SCORING.ENGAGEMENT_WEIGHT
      + config.LEAD_SCORING.FIT_WEIGHT;
    assert.strictEqual(sum, 1.0);
  });
});

test('Config Scaffold - Health & Outreach', async (t) => {
  await t.test('Health config has all timeouts', () => {
    assert.ok(config.HEALTH.CHECK_INTERVAL_MS > 0);
    assert.ok(config.HEALTH.AIRTABLE_TIMEOUT_MS > 0);
    assert.ok(config.HEALTH.N8N_TIMEOUT_MS > 0);
    assert.ok(config.HEALTH.CLAUDE_TIMEOUT_MS > 0);
  });

  await t.test('Outreach config is valid', () => {
    assert.ok(config.OUTREACH.MAX_CONCURRENT_THREADS >= 1);
    assert.ok(config.OUTREACH.DAILY_RATE_LIMIT >= 50);
    assert.ok(config.OUTREACH.RETRY_ATTEMPTS > 0);
  });
});

test('Config Scaffold - Validation & Methods', async (t) => {
  await t.test('validate() returns true for valid config', () => {
    assert.strictEqual(config.validate(), true);
  });

  await t.test('getSummary() returns expected fields', () => {
    const summary = config.getSummary();
    assert.ok(summary.system);
    assert.ok(summary.version);
    assert.strictEqual(summary.counties_count, 8);
    assert.strictEqual(summary.icp_segments, 5);
    assert.strictEqual(summary.validation, true);
  });
});

test('Config Scaffold - Completeness', async (t) => {
  await t.test('All required keys are present', () => {
    const required = [
      'SYSTEM_NAME',
      'VERSION',
      'ENVIRONMENT',
      'PRIMARY_NAICS',
      'NAICS_NAME',
      'FLORIDA_COUNTIES',
      'ICP_SEGMENTS',
      'AIRTABLE',
      'N8N',
      'CLAUDE_API',
      'LEAD_SCORING',
      'OUTREACH',
      'HEALTH',
      'validate',
      'getSummary',
    ];
    required.forEach((key) => {
      assert.ok(config[key] !== undefined, `Missing required key: ${key}`);
    });
  });

  await t.test('Config loads without errors', () => {
    // If we got here, config loaded successfully
    assert.ok(config);
    assert.ok(config.SYSTEM_NAME.length > 0);
  });
});
