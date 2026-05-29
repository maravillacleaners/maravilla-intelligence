"""Run avatar extraction on top 5 intelligence records and show full intelligence."""
import urllib.request, json, subprocess

KEY = 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92'
BASE = 'appZhXnyFiKbnOZLr'
TBL = 'tbl3qWHqunA0eERE2'
PORTAL = 'http://172.18.0.10:3000'

def at_curl(path):
    url = f'https://api.airtable.com/v0/{BASE}/{path}'
    result = subprocess.run(
        ['curl', '-s', url, '-H', f'Authorization: Bearer {KEY}'],
        capture_output=True, text=True, timeout=20
    )
    return json.loads(result.stdout)

def portal_post(path, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        f'{PORTAL}{path}', data=body,
        headers={'Content-Type': 'application/json'}, method='POST'
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())

def portal_get(path):
    req = urllib.request.Request(f'{PORTAL}{path}')
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

# Fetch intelligence records
records = []
offset = None
for _ in range(3):
    path = f'{TBL}?maxRecords=100'
    if offset:
        path += f'&offset={offset}'
    data = at_curl(path)
    records.extend(data.get('records', []))
    offset = data.get('offset')
    if not offset:
        break

print(f"Got {len(records)} intelligence records")

def sort_key(r):
    f = r.get('fields', {})
    state = f.get('place_of_performance', '')
    amt = f.get('award_amount', 0)
    is_target = 1 if state in ('FL', 'TX', 'CA', 'GA', 'NC') else 0
    naics = f.get('naics_code', '')
    is_cleaning = 1 if naics.startswith('5617') or naics.startswith('5616') else 0
    return -(is_target * 1e12 + is_cleaning * 1e11 + amt)

records.sort(key=sort_key)

print()
print(f"{'COMPANY':<52} {'STATE':5} {'NAICS':7} {'AMOUNT':>15}")
print('-'*80)

top5 = []
seen = set()
for r in records:
    if len(top5) >= 5:
        break
    f = r.get('fields', {})
    name = (f.get('legal_name') or f.get('awarded_contractor') or '').strip()
    if not name or name in seen:
        continue
    seen.add(name)
    amt = f.get('award_amount', 0)
    state = f.get('place_of_performance', '')
    naics = f.get('naics_code', '')
    agency = f.get('awarding_agency', '') or f.get('agency', '') or 'Federal Agency'
    desc = f.get('description', '') or ''
    uid = f.get('usaspending_id', '') or ''
    print(f"{name[:52]:<52} {state:5} {naics:7} ${amt:>14,.0f}")
    top5.append({
        'company_name': name,
        'agency': agency,
        'naics': naics,
        'description': desc[:400],
        'award_amount': amt,
        'state': state,
        'entity_key': f'company:{name.upper()}',
        'entity_name': name,
        'contracts_seen_in': uid,
        'source': 'usaspending',
    })

print()
print(f"Extracting avatars for {len(top5)} companies...")
print()

results = []
for item in top5:
    name = item['company_name']
    ek = item['entity_key']
    print(f"  → {name[:55]}")
    try:
        ext = portal_post('/api/avatars/extract', item)
        extracted = ext.get('extracted', 0)
        print(f"    extracted={extracted}")
    except Exception as e:
        print(f"    extract error: {e}")
        extracted = 0

    # Fetch full avatar objects
    try:
        ek_enc = ek.replace(' ', '%20').replace(':', '%3A')
        av_resp = portal_get(f'/api/avatars?entity_key={ek_enc}&limit=20')
        avatars = av_resp.get('avatars', [])
    except Exception as e:
        print(f"    fetch error: {e}")
        avatars = []

    results.append((item, avatars))

# Full intelligence report
print()
print('=' * 80)
print('OPERATIONAL AVATAR INTELLIGENCE — TOP 5 OPPORTUNITIES')
print('=' * 80)

TYPE_EMOJI = {
    'contracting_officer': '⚖️ ',
    'small_business_officer': '🏛️ ',
    'facilities_manager': '🏢 ',
    'prime_bd': '🤝 ',
    'property_manager': '🏠 ',
    'developer': '🔨 ',
    'government_buyer': '💰 ',
    'commercial_operator': '🏪 ',
}

for item, avatars in results:
    name = item['company_name']
    agency = item['agency']
    amt = item['award_amount']
    state = item['state']
    naics = item['naics']

    named = [a for a in avatars if a.get('status') == 'named']
    inferred = [a for a in avatars if a.get('status') != 'named']
    avg_inf = int(sum(a.get('influence_score', 0) for a in avatars) / len(avatars)) if avatars else 0
    avg_rel = int(sum(a.get('relevance_score', 0) for a in avatars) / len(avatars)) if avatars else 0

    print(f"\n{'─'*78}")
    print(f"  {name}")
    print(f"  Agency: {agency}  |  ${amt:,.0f}  |  {state}  |  NAICS {naics}")
    print(f"  Avatars: {len(avatars)} nodes ({len(named)} named, {len(inferred)} inferred) | avg inf={avg_inf} rel={avg_rel}")

    for av in sorted(avatars, key=lambda x: -x.get('influence_score', 0)):
        t = av.get('avatar_type', '?')
        emoji = TYPE_EMOJI.get(t, '👤 ')
        title = av.get('title', '?')
        inf = av.get('influence_score', 0)
        rel = av.get('relevance_score', 0)
        role = av.get('decision_role', '')
        status = '★' if av.get('status') == 'named' else '·'
        strat = (av.get('outreach_strategy') or '')[:90]
        nxt = (av.get('next_action') or '')[:80]
        reason = (av.get('relevance_reason') or '')[:80]
        print()
        print(f"  {status} {emoji}{title}  [{t}]")
        print(f"    Influence: {inf}/100  Relevance: {rel}/100  Role: {role}")
        if reason:
            print(f"    Why:      {reason}")
        if strat:
            print(f"    Strategy: {strat}")
        if nxt:
            print(f"    Next:     {nxt}")

    ek = item['entity_key']
    ek_enc = ek.replace(' ', '%20')
    print()
    print(f"  Company page: http://localhost:3002/companies/{ek_enc}")
    print(f"  Avatars:      http://localhost:3002/avatars?entity_key={ek_enc}")

print()
print("All done. Operational Avatar Graph populated.")
