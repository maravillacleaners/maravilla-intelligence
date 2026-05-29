"""Create Phase 5 Contract Intelligence Daily Orchestration workflow in n8n."""
import json, requests, uuid

N8N_URL = 'http://localhost:5678'
N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkNjFkMWZkOC0xNDdmLTQzMWYtOGIzYy00YTJjM2U5OTQzOTQiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODRkOWY1ZTQtMmMzYS00ODJkLTgxOGMtMzY2NDBiMGViNWRhIiwiaWF0IjoxNzc5NzM2ODE2fQ.pdifsbn7LFvOB09iPFuZLL41bVvsfQOVxL-ovy8LBKM'

AIRTABLE_KEY = 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92'
AIRTABLE_BASE = 'appZhXnyFiKbnOZLr'
TBL_INTEL = 'tbl3qWHqunA0eERE2'
TBL_EVENTS = 'tbl84x3ZGOIGf8bDA'
TBL_TASKS = 'tblrB7Cj84vLwI8tD'
SLACK_URL = 'https://hooks.slack.com/services/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'
PORTAL_URL = 'http://172.18.0.10:3000'

HEADERS = {'X-N8N-API-KEY': N8N_KEY, 'Content-Type': 'application/json'}

def node(id_, name, type_, pos, params):
    return {
        'id': id_, 'name': name, 'type': type_,
        'typeVersion': 2 if 'http' in type_ or 'airtable' in type_ else 1,
        'position': pos, 'parameters': params
    }

scoring_code = r"""
const items = $input.all();
const results = [];

for (const item of items) {
  const d = item.json;
  let score = 0;
  const signals = [];

  // NAICS overlap (cleaning/janitorial = 561xxx)
  const naics = String(d.naics_code || d.naics || '');
  if (naics.startsWith('5617') || naics.startsWith('5616')) { score += 35; signals.push('janitorial NAICS match'); }
  else if (naics.startsWith('561')) { score += 20; signals.push('facility services NAICS'); }

  // Florida presence
  const state = String(d.state || d.pop_state || d.place_of_performance || '').toUpperCase();
  if (state.includes('FL') || state.includes('FLORIDA')) { score += 25; signals.push('Florida opportunity'); }
  else if (['TX','CA','GA','NC','VA'].some(s => state.includes(s))) { score += 10; signals.push('target state'); }

  // Contract value
  const amt = Number(d.award_amount || d.total_obligated_amount || d.base_and_exercised_options_value || 0);
  if (amt > 500000) { score += 20; signals.push(`$${(amt/1e6).toFixed(1)}M value`); }
  else if (amt > 100000) { score += 12; signals.push(`$${(amt/1e3).toFixed(0)}K value`); }
  else if (amt > 0) { score += 5; }

  // Freshness
  const dateStr = d.award_date || d.period_of_performance_start_date || d.action_date || '';
  const age_days = dateStr ? (Date.now() - new Date(dateStr).getTime()) / 86400000 : 999;
  if (age_days < 7) { score += 15; signals.push('last 7 days'); }
  else if (age_days < 21) { score += 8; signals.push('last 3 weeks'); }

  // Keywords
  const text = `${d.title || ''} ${d.description || ''}`.toLowerCase();
  if (/janitor|clean|custod|sanitiz|housekeep|janitorial/.test(text)) { score += 20; signals.push('cleaning keywords'); }
  else if (/facilit|maintenance|building/.test(text)) { score += 8; signals.push('facilities keywords'); }

  // Subcontracting language
  if (/subcontract|small.?business|8\(a\)|hub.?zone|wosb|sdvosb/.test(text)) { score += 10; signals.push('subcontracting opportunity'); }

  const final_score = Math.min(score, 100);
  const source = d.source || 'usaspending';
  const entity_key = `company:${(d.recipient_name || d.company || 'UNKNOWN').toUpperCase()}`;
  const agency_key = `agency:${(d.awarding_agency || d.agency || 'FEDERAL').toUpperCase()}`;

  results.push({
    ...d,
    score: final_score,
    signals: signals.join(', '),
    entity_key,
    agency_key,
    source,
    processed_at: new Date().toISOString(),
  });
}

// Sort by score descending
results.sort((a, b) => b.score - a.score);
return results.map(r => ({ json: r }));
"""

report_code = r"""
const items = $input.all();
const high = items.filter(i => i.json.score >= 65);
const med = items.filter(i => i.json.score >= 40 && i.json.score < 65);
const total = items.length;

const topItems = high.slice(0, 5).map(i => {
  const d = i.json;
  const name = (d.recipient_name || d.company || 'Unknown').substring(0, 40);
  const agency = (d.awarding_agency || d.agency || 'Federal').substring(0, 30);
  const amt = Number(d.award_amount || d.total_obligated_amount || 0);
  const amtStr = amt > 0 ? `$${(amt/1e3).toFixed(0)}K` : 'n/a';
  return `  • ${name} | ${agency} | ${amtStr} | Score: ${d.score}`;
}).join('\n');

const text = `*Phase 5 Contract Intelligence — Daily Report*
Date: ${new Date().toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'})}

*Awards Found:* ${total} total
  🔴 High Priority (65+): ${high.length}
  🟡 Medium (40-64): ${med.length}
  ⚪ Low (<40): ${total - high.length - med.length}

${high.length > 0 ? `*Top Opportunities:*\n${topItems}` : '_No high-priority opportunities today_'}

_Source: USASpending + HigherGov | NAICS 561xxx | FL/TX/CA focus_`;

return [{ json: { text, high_count: high.length, total } }];
"""

wf = {
    'name': 'Phase 5 — Contract Intelligence Daily Orchestration',
    'active': True,
    'nodes': [
        node('n-trigger', '7AM Daily Trigger', 'n8n-nodes-base.scheduleTrigger', [250, 300], {
            'rule': {
                'interval': [{'field': 'cronExpression', 'expression': '0 11 * * 1-5'}]
            }
        }),
        node('n-usaspending', 'Fetch USASpending Awards', 'n8n-nodes-base.httpRequest', [500, 200], {
            'url': 'https://api.usaspending.gov/api/v2/search/spending_by_award/',
            'method': 'POST',
            'sendHeaders': True,
            'headerParameters': {'parameters': [{'name': 'Content-Type', 'value': 'application/json'}]},
            'sendBody': True,
            'contentType': 'json',
            'body': {
                'filters': {
                    'naics_codes': ['561720', '561710', '561730', '561790', '561110'],
                    'award_type_codes': ['A', 'B', 'C', 'D'],
                    'time_period': [{'start_date': '={{ $now.minus(45, "days").toFormat("yyyy-MM-dd") }}', 'end_date': '={{ $now.toFormat("yyyy-MM-dd") }}'},],
                    'place_of_performance_locations': [
                        {'country': 'USA', 'state': 'FL'},
                        {'country': 'USA', 'state': 'TX'},
                        {'country': 'USA', 'state': 'CA'},
                        {'country': 'USA', 'state': 'GA'},
                        {'country': 'USA', 'state': 'NC'},
                    ]
                },
                'fields': ['Award ID', 'Recipient Name', 'Award Amount', 'Awarding Agency',
                           'Award Date', 'NAICS Code', 'Description', 'Place of Performance State Code'],
                'page': 1, 'limit': 100, 'sort': 'Award Amount', 'order': 'desc'
            },
            'options': {'timeout': 30000}
        }),
        node('n-transform-usa', 'Transform USASpending', 'n8n-nodes-base.code', [750, 200], {
            'jsCode': r"""
const raw = $json.results || [];
return raw.map(r => ({ json: {
    award_id: r['Award ID'] || '',
    recipient_name: r['Recipient Name'] || '',
    award_amount: Number(r['Award Amount']) || 0,
    awarding_agency: r['Awarding Agency'] || '',
    award_date: r['Award Date'] || '',
    naics_code: r['NAICS Code'] || '',
    description: r['Description'] || '',
    state: r['Place of Performance State Code'] || '',
    source: 'usaspending',
    url: `https://www.usaspending.gov/award/${encodeURIComponent(r['Award ID'] || '')}`,
    title: `${r['Recipient Name'] || 'Award'} — ${r['Awarding Agency'] || 'Federal'}`
}}));
"""
        }),
        node('n-merge', 'Merge Sources', 'n8n-nodes-base.merge', [1000, 300], {
            'mode': 'append'
        }),
        node('n-score', 'Score & Rank', 'n8n-nodes-base.code', [1250, 300], {
            'jsCode': scoring_code
        }),
        node('n-split-high', 'Split High Score', 'n8n-nodes-base.if', [1500, 300], {
            'conditions': {
                'options': {'leftValue': '', 'caseSensitive': True, 'typeValidation': 'strict'},
                'conditions': [{'leftValue': '={{ $json.score }}', 'rightValue': 65, 'operator': {'type': 'number', 'operation': 'gte'}}],
                'combinator': 'and'
            }
        }),
        node('n-save-intel', 'Save to Intelligence', 'n8n-nodes-base.httpRequest', [1750, 200], {
            'url': f'{PORTAL_URL}/api/intelligence/companies',
            'method': 'POST',
            'sendHeaders': True,
            'headerParameters': {'parameters': [{'name': 'Content-Type', 'value': 'application/json'}]},
            'sendBody': True,
            'specifyBody': 'json',
            'jsonBody': '={{ JSON.stringify({ company: $json.recipient_name, agency: $json.awarding_agency, score: $json.score, signals: $json.signals, source: $json.source, contract_value: $json.award_amount, naics: $json.naics_code, state: $json.state, url: $json.url }) }}',
            'options': {'timeout': 10000, 'response': {'response': {'neverError': True}}}
        }),
        node('n-create-event', 'Create Portal Event', 'n8n-nodes-base.httpRequest', [1750, 400], {
            'url': f'{PORTAL_URL}/api/events',
            'method': 'POST',
            'sendHeaders': True,
            'headerParameters': {'parameters': [{'name': 'Content-Type', 'value': 'application/json'}]},
            'sendBody': True,
            'specifyBody': 'json',
            'jsonBody': '={{ JSON.stringify({ entity_key: $json.entity_key, entity_type: "company", entity_name: $json.recipient_name, event_type: "signal_detected", description: `Score ${$json.score}/100: ${$json.signals}. Award: $${($json.award_amount/1000).toFixed(0)}K via ${$json.awarding_agency}`, actor: "Phase5", source: "phase5_daily", related_url: $json.url }) }}',
            'options': {'timeout': 8000, 'response': {'response': {'neverError': True}}}
        }),
        node('n-report', 'Build Report', 'n8n-nodes-base.code', [2000, 300], {
            'jsCode': report_code,
            'mode': 'runOnceForAllItems'
        }),
        node('n-slack', 'Slack Report', 'n8n-nodes-base.httpRequest', [2250, 300], {
            'url': SLACK_URL,
            'method': 'POST',
            'sendHeaders': True,
            'headerParameters': {'parameters': [{'name': 'Content-Type', 'value': 'application/json'}]},
            'sendBody': True,
            'specifyBody': 'json',
            'jsonBody': '={{ JSON.stringify({ text: $json.text }) }}',
            'options': {'timeout': 10000, 'response': {'response': {'neverError': True}}}
        }),
    ],
    'connections': {
        '7AM Daily Trigger': {'main': [[{'node': 'Fetch USASpending Awards', 'type': 'main', 'index': 0}]]},
        'Fetch USASpending Awards': {'main': [[{'node': 'Transform USASpending', 'type': 'main', 'index': 0}]]},
        'Transform USASpending': {'main': [[{'node': 'Merge Sources', 'type': 'main', 'index': 0}]]},
        'Merge Sources': {'main': [[{'node': 'Score & Rank', 'type': 'main', 'index': 0}]]},
        'Score & Rank': {'main': [[{'node': 'Split High Score', 'type': 'main', 'index': 0}]]},
        'Split High Score': {
            'main': [
                [{'node': 'Create Portal Event', 'type': 'main', 'index': 0}],
                [{'node': 'Save to Intelligence', 'type': 'main', 'index': 0}],
            ]
        },
        'Create Portal Event': {'main': [[{'node': 'Build Report', 'type': 'main', 'index': 0}]]},
        'Save to Intelligence': {'main': [[{'node': 'Build Report', 'type': 'main', 'index': 0}]]},
        'Build Report': {'main': [[{'node': 'Slack Report', 'type': 'main', 'index': 0}]]},
    },
    'settings': {
        'saveDataErrorExecution': 'all',
        'saveDataSuccessExecution': 'all',
        'executionTimeout': 300,
        'timezone': 'America/New_York',
    }
}

# Import via n8n API
resp = requests.post(f'{N8N_URL}/api/v1/workflows',
    headers=HEADERS, json=wf)

if resp.status_code in (200, 201):
    data = resp.json()
    wf_id = data.get('id')
    print(f'Created: {data.get("name")} (id={wf_id})')
    print(f'Active: {data.get("active")}')
else:
    print(f'ERROR {resp.status_code}: {resp.text[:500]}')
