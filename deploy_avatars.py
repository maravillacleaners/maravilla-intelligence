"""Deploy Operational Avatar System — relationship intelligence graph."""
import os

APP = '/root/maravilla-intelligence/app'
AT_KEY = 'pat99rdlH4w13bxyF.b9d1c94b946e484274aef34315d7a8442fffa86237ee061faf96c2e0fb90ca92'
BASE = 'appZhXnyFiKbnOZLr'
TBL_AVATARS = 'tblrIv6lKjsMeUcyU'
TBL_REL = 'tblYpnlHtIYaf07CA'
TBL_LINKS = 'tblqFhN7GwQ6TM0ot'
TBL_EVENTS = 'tbl84x3ZGOIGf8bDA'
TBL_TASKS = 'tblrB7Cj84vLwI8tD'

def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)
    print(f'  wrote {path}')

def patch(path, old, new, label):
    with open(path) as f:
        src = f.read()
    if old in src:
        src = src.replace(old, new, 1)
        with open(path, 'w') as f:
            f.write(src)
        print(f'  OK: {label}')
    else:
        print(f'  MISS: {label}')

# ─── /api/avatars/route.ts ────────────────────────────────────────────────────
AVATARS_ROUTE = '''import { NextRequest, NextResponse } from 'next/server'

const KEY = '__KEY__'
const BASE = '__BASE__'
const TBL = '__TBL_AVATARS__'
const API = 'https://api.airtable.com/v0'
const H = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

type Rec = { id: string; fields: Record<string, unknown> }

function at(url: string) {
  return fetch(url, { headers: H, signal: AbortSignal.timeout(12000) })
    .then(r => r.ok ? r.json() : { records: [] })
    .catch(() => ({ records: [] }))
}

function mapAvatar(r: Rec) {
  const f = r.fields
  return {
    id: r.id,
    name: String(f.Name || ''),
    avatar_type: String(f.Avatar_Type || ''),
    title: String(f.Title || ''),
    organization: String(f.Organization || ''),
    entity_key: String(f.Entity_Key || ''),
    entity_type: String(f.Entity_Type || ''),
    email: String(f.Email || ''),
    phone: String(f.Phone || ''),
    linkedin_url: String(f.LinkedIn_URL || ''),
    verified: Boolean(f.Verified),
    confidence: Number(f.Confidence || 0),
    influence_score: Number(f.Influence_Score || 0),
    relevance_score: Number(f.Relevance_Score || 0),
    decision_role: String(f.Decision_Role || ''),
    status: String(f.Status || 'inferred'),
    source: String(f.Source || ''),
    geographic_jurisdiction: String(f.Geographic_Jurisdiction || ''),
    procurement_categories: String(f.Procurement_Categories || ''),
    budget_authority: Number(f.Budget_Authority || 0),
    avg_award_size: Number(f.Avg_Award_Size || 0),
    award_frequency: String(f.Award_Frequency || ''),
    preferred_vehicle: String(f.Preferred_Vehicle || ''),
    set_aside_preference: String(f.Set_Aside_Preference || ''),
    outreach_status: String(f.Outreach_Status || 'not_contacted'),
    outreach_strategy: String(f.Outreach_Strategy || ''),
    best_contact_method: String(f.Best_Contact_Method || ''),
    next_action: String(f.Next_Action || ''),
    next_action_date: String(f.Next_Action_Date || ''),
    relevance_reason: String(f.Relevance_Reason || ''),
    contracts_seen_in: String(f.Contracts_Seen_In || ''),
    facilities_managed: String(f.Facilities_Managed || ''),
    last_seen: String(f.Last_Seen || ''),
    notes: String(f.Notes || ''),
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const entity_key = sp.get('entity_key')
  const avatar_type = sp.get('avatar_type')
  const outreach_status = sp.get('outreach_status')
  const status = sp.get('status')
  const decision_role = sp.get('decision_role')
  const q = sp.get('q')
  const limit = Number(sp.get('limit') || 50)
  const relevance_min = Number(sp.get('relevance_min') || 0)

  const parts: string[] = []
  if (entity_key) {
    const safe = entity_key.replace(/"/g, '')
    parts.push(`SEARCH(LOWER("${safe}"),LOWER({Entity_Key}))>0`)
  }
  if (avatar_type) parts.push(`{Avatar_Type}="${avatar_type}"`)
  if (outreach_status) parts.push(`{Outreach_Status}="${outreach_status}"`)
  if (status) parts.push(`{Status}="${status}"`)
  if (decision_role) parts.push(`{Decision_Role}="${decision_role}"`)
  if (relevance_min > 0) parts.push(`{Relevance_Score}>=${relevance_min}`)
  if (q) {
    const safe = q.replace(/"/g, '')
    parts.push(`OR(SEARCH(LOWER("${safe}"),LOWER({Name}))>0,SEARCH(LOWER("${safe}"),LOWER({Title}))>0,SEARCH(LOWER("${safe}"),LOWER({Organization}))>0)`)
  }

  const formula = parts.length > 1 ? `AND(${parts.join(',')})` : parts[0] || 'TRUE()'
  const url = `${API}/${BASE}/${TBL}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=${limit}&sort[0][field]=Relevance_Score&sort[0][direction]=desc`
  const data = await at(url)
  const avatars = (data.records || []).map(mapAvatar)
  return NextResponse.json({ avatars, total: avatars.length })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, organization } = body
  if (!name || !organization) return NextResponse.json({ error: 'name and organization required' }, { status: 400 })

  // Upsert by name + organization
  const existFormula = `AND(LOWER(TRIM({Name}))=LOWER("${name.replace(/"/g,'')}"),LOWER(TRIM({Organization}))=LOWER("${organization.replace(/"/g,'')}"))`
  const existUrl = `${API}/${BASE}/${TBL}?filterByFormula=${encodeURIComponent(existFormula)}&maxRecords=1`
  const existData = await at(existUrl)
  const existing = existData.records?.[0]

  const fields: Record<string, unknown> = {
    Name: name, Organization: organization,
    Avatar_Type: body.avatar_type || 'prime_bd',
    Title: body.title || '', Entity_Key: body.entity_key || '',
    Entity_Type: body.entity_type || 'company',
    Email: body.email || '', Phone: body.phone || '',
    LinkedIn_URL: body.linkedin_url || '', Verified: body.verified || false,
    Confidence: Number(body.confidence || 40),
    Influence_Score: Number(body.influence_score || 0),
    Relevance_Score: Number(body.relevance_score || 0),
    Decision_Role: body.decision_role || 'executor',
    Status: body.status || 'inferred', Source: body.source || 'manual',
    Geographic_Jurisdiction: body.geographic_jurisdiction || '',
    Procurement_Categories: body.procurement_categories || '',
    Budget_Authority: Number(body.budget_authority || 0),
    Avg_Award_Size: Number(body.avg_award_size || 0),
    Award_Frequency: body.award_frequency || '',
    Preferred_Vehicle: body.preferred_vehicle || '',
    Set_Aside_Preference: body.set_aside_preference || '',
    Outreach_Status: body.outreach_status || 'not_contacted',
    Outreach_Strategy: body.outreach_strategy || '',
    Best_Contact_Method: body.best_contact_method || '',
    Next_Action: body.next_action || '', Next_Action_Date: body.next_action_date || '',
    Relevance_Reason: body.relevance_reason || '',
    Contracts_Seen_In: body.contracts_seen_in || '',
    Facilities_Managed: body.facilities_managed || '',
    Last_Seen: body.last_seen || new Date().toISOString().split('T')[0],
    Notes: body.notes || '',
  }

  let record: Rec
  if (existing) {
    const updateFields: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(fields)) {
      if (v !== '' && v !== 0 && v !== false) updateFields[k] = v
    }
    const r = await fetch(`${API}/${BASE}/${TBL}/${existing.id}`, {
      method: 'PATCH', headers: H, body: JSON.stringify({ typecast: true, fields: updateFields })
    })
    record = await r.json()
  } else {
    const r = await fetch(`${API}/${BASE}/${TBL}`, {
      method: 'POST', headers: H, body: JSON.stringify({ typecast: true, records: [{ fields }] })
    })
    const created = await r.json()
    record = created.records?.[0]
  }

  if (!record?.id) return NextResponse.json({ error: 'save failed' }, { status: 500 })
  return NextResponse.json({ avatar: mapAvatar(record), upserted: Boolean(existing) }, { status: existing ? 200 : 201 })
}
'''

# ─── /api/avatars/[id]/route.ts ───────────────────────────────────────────────
AVATARS_ID_ROUTE = '''import { NextRequest, NextResponse } from 'next/server'

const KEY = '__KEY__'
const BASE = '__BASE__'
const TBL = '__TBL_AVATARS__'
const TBL_REL = '__TBL_REL__'
const TBL_LINKS = '__TBL_LINKS__'
const TBL_EVENTS = '__TBL_EVENTS__'
const TBL_TASKS = '__TBL_TASKS__'
const API = 'https://api.airtable.com/v0'
const H = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

type Rec = { id: string; fields: Record<string, unknown> }

function at(url: string) {
  return fetch(url, { headers: H, signal: AbortSignal.timeout(12000) })
    .then(r => r.ok ? r.json() : { records: [] })
    .catch(() => ({ records: [] }))
}

function mapAvatar(r: Rec) {
  const f = r.fields
  return {
    id: r.id, name: String(f.Name || ''), avatar_type: String(f.Avatar_Type || ''),
    title: String(f.Title || ''), organization: String(f.Organization || ''),
    entity_key: String(f.Entity_Key || ''), entity_type: String(f.Entity_Type || ''),
    email: String(f.Email || ''), phone: String(f.Phone || ''),
    linkedin_url: String(f.LinkedIn_URL || ''), verified: Boolean(f.Verified),
    confidence: Number(f.Confidence || 0), influence_score: Number(f.Influence_Score || 0),
    relevance_score: Number(f.Relevance_Score || 0),
    decision_role: String(f.Decision_Role || ''), status: String(f.Status || 'inferred'),
    source: String(f.Source || ''), geographic_jurisdiction: String(f.Geographic_Jurisdiction || ''),
    procurement_categories: String(f.Procurement_Categories || ''),
    budget_authority: Number(f.Budget_Authority || 0), avg_award_size: Number(f.Avg_Award_Size || 0),
    award_frequency: String(f.Award_Frequency || ''), preferred_vehicle: String(f.Preferred_Vehicle || ''),
    set_aside_preference: String(f.Set_Aside_Preference || ''),
    outreach_status: String(f.Outreach_Status || 'not_contacted'),
    outreach_strategy: String(f.Outreach_Strategy || ''),
    best_contact_method: String(f.Best_Contact_Method || ''),
    next_action: String(f.Next_Action || ''), next_action_date: String(f.Next_Action_Date || ''),
    relevance_reason: String(f.Relevance_Reason || ''),
    contracts_seen_in: String(f.Contracts_Seen_In || ''),
    facilities_managed: String(f.Facilities_Managed || ''),
    last_seen: String(f.Last_Seen || ''), notes: String(f.Notes || ''),
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const [rec, rels, links, evts, tasks] = await Promise.all([
    fetch(`${API}/${BASE}/${TBL}/${id}`, { headers: H }).then(r => r.ok ? r.json() : null),
    at(`${API}/${BASE}/${TBL_REL}?filterByFormula=${encodeURIComponent('OR({From_Avatar_ID}="' + id + '",{To_Avatar_ID}="' + id + '")')}&maxRecords=20`),
    at(`${API}/${BASE}/${TBL_LINKS}?filterByFormula=${encodeURIComponent('{Avatar_ID}="' + id + '"')}&maxRecords=20&sort[0][field]=Award_Amount&sort[0][direction]=desc`),
    at(`${API}/${BASE}/${TBL_EVENTS}?filterByFormula=${encodeURIComponent(`SEARCH("${id}",{description})>0`)}&maxRecords=10&sort[0][field]=Timestamp&sort[0][direction]=desc`),
    at(`${API}/${BASE}/${TBL_TASKS}?filterByFormula=${encodeURIComponent(`SEARCH("${id}",{notes})>0`)}&maxRecords=10`),
  ])
  if (!rec || rec.error) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({
    avatar: mapAvatar(rec),
    relationships: (rels.records || []).map((r: Rec) => r.fields),
    contract_links: (links.records || []).map((r: Rec) => r.fields),
    recent_events: (evts.records || []).map((r: Rec) => r.fields),
    tasks: (tasks.records || []).map((r: Rec) => r.fields),
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const fieldMap: Record<string, string> = {
    name: 'Name', avatar_type: 'Avatar_Type', title: 'Title', organization: 'Organization',
    entity_key: 'Entity_Key', email: 'Email', phone: 'Phone', linkedin_url: 'LinkedIn_URL',
    verified: 'Verified', confidence: 'Confidence', influence_score: 'Influence_Score',
    relevance_score: 'Relevance_Score', decision_role: 'Decision_Role', status: 'Status',
    geographic_jurisdiction: 'Geographic_Jurisdiction', procurement_categories: 'Procurement_Categories',
    budget_authority: 'Budget_Authority', avg_award_size: 'Avg_Award_Size',
    award_frequency: 'Award_Frequency', preferred_vehicle: 'Preferred_Vehicle',
    set_aside_preference: 'Set_Aside_Preference', outreach_status: 'Outreach_Status',
    outreach_strategy: 'Outreach_Strategy', best_contact_method: 'Best_Contact_Method',
    next_action: 'Next_Action', next_action_date: 'Next_Action_Date',
    relevance_reason: 'Relevance_Reason', contracts_seen_in: 'Contracts_Seen_In',
    facilities_managed: 'Facilities_Managed', notes: 'Notes',
  }
  const fields: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (fieldMap[k]) fields[fieldMap[k]] = v
  }
  const r = await fetch(`${API}/${BASE}/${TBL}/${params.id}`, {
    method: 'PATCH', headers: H, body: JSON.stringify({ typecast: true, fields })
  })
  const updated = await r.json()
  if (updated.error) return NextResponse.json({ error: updated.error }, { status: 400 })
  return NextResponse.json({ avatar: mapAvatar(updated) })
}
'''

# ─── /api/avatars/extract/route.ts ───────────────────────────────────────────
AVATARS_EXTRACT_ROUTE = r'''import { NextRequest, NextResponse } from 'next/server'

const KEY = '__KEY__'
const BASE = '__BASE__'
const TBL_AVATARS = '__TBL_AVATARS__'
const TBL_REL = '__TBL_REL__'
const TBL_LINKS = '__TBL_LINKS__'
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
const API = 'https://api.airtable.com/v0'
const H = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

type Rec = { id: string; fields: Record<string, unknown> }

async function atGet(url: string) {
  const r = await fetch(url, { headers: H, signal: AbortSignal.timeout(10000) })
  return r.ok ? r.json() : { records: [] }
}

async function upsertAvatar(fields: Record<string, unknown>): Promise<string | null> {
  const name = String(fields.Name || '')
  const org = String(fields.Organization || '')
  const existFormula = `AND(LOWER(TRIM({Name}))=LOWER("${name.replace(/"/g,'')}"),LOWER(TRIM({Organization}))=LOWER("${org.replace(/"/g,'')}"))`
  const existUrl = `${API}/${BASE}/${TBL_AVATARS}?filterByFormula=${encodeURIComponent(existFormula)}&maxRecords=1`
  const existData = await atGet(existUrl)
  const existing: Rec | undefined = existData.records?.[0]

  if (existing) {
    // Update: refresh Last_Seen and Contracts_Seen_In, upgrade status if verified
    const updates: Record<string, unknown> = {
      Last_Seen: fields.Last_Seen,
      Contracts_Seen_In: fields.Contracts_Seen_In,
    }
    if (String(fields.Status) === 'named' && existing.fields.Status !== 'named') updates.Status = 'named'
    if (Number(fields.Relevance_Score) > Number(existing.fields.Relevance_Score || 0)) {
      updates.Relevance_Score = fields.Relevance_Score
      updates.Relevance_Reason = fields.Relevance_Reason
      updates.Outreach_Strategy = fields.Outreach_Strategy
      updates.Next_Action = fields.Next_Action
    }
    await fetch(`${API}/${BASE}/${TBL_AVATARS}/${existing.id}`, {
      method: 'PATCH', headers: H, body: JSON.stringify({ typecast: true, fields: updates })
    })
    return existing.id
  } else {
    const r = await fetch(`${API}/${BASE}/${TBL_AVATARS}`, {
      method: 'POST', headers: H, body: JSON.stringify({ typecast: true, records: [{ fields }] })
    })
    const created = await r.json()
    return created.records?.[0]?.id || null
  }
}

async function saveRelationship(fromId: string, fromName: string, fromType: string,
  toId: string, toName: string, toType: string,
  relType: string, strength: string, evidence: string, source: string) {
  // Check existing
  const formula = `AND({From_Avatar_ID}="${fromId}",{To_Avatar_ID}="${toId}",{Relationship_Type}="${relType}")`
  const existData = await atGet(`${API}/${BASE}/${TBL_REL}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`)
  if (existData.records?.length > 0) {
    const existing = existData.records[0]
    await fetch(`${API}/${BASE}/${TBL_REL}/${existing.id}`, {
      method: 'PATCH', headers: H,
      body: JSON.stringify({ typecast: true, fields: { Co_Appearance_Count: Number(existing.fields.Co_Appearance_Count || 0) + 1, Last_Seen: new Date().toISOString().split('T')[0] } })
    }).catch(() => {})
  } else {
    await fetch(`${API}/${BASE}/${TBL_REL}`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ typecast: true, records: [{ fields: {
        From_Avatar_ID: fromId, From_Name: fromName, From_Type: fromType,
        To_Avatar_ID: toId, To_Name: toName, To_Type: toType,
        Relationship_Type: relType, Strength: strength, Evidence: evidence,
        Co_Appearance_Count: 1, Source: source,
        Last_Seen: new Date().toISOString().split('T')[0],
      }}]})
    }).catch(() => {})
  }
}

async function saveContractLink(avatarId: string, avatarName: string, avatarType: string,
  contractId: string, entityKey: string, entityName: string, contractRole: string,
  awardAmount: number, naics: string, agency: string, source: string) {
  const formula = `AND({Avatar_ID}="${avatarId}",{Contract_ID}="${contractId.replace(/"/g,'')}")`
  const existData = await atGet(`${API}/${BASE}/${TBL_LINKS}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`)
  if (!existData.records?.length) {
    await fetch(`${API}/${BASE}/${TBL_LINKS}`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ typecast: true, records: [{ fields: {
        Avatar_ID: avatarId, Avatar_Name: avatarName, Avatar_Type: avatarType,
        Contract_ID: contractId, Entity_Key: entityKey, Entity_Name: entityName,
        Contract_Role: contractRole, Award_Amount: awardAmount,
        NAICS: naics, Agency: agency, Source: source,
      }}]})
    }).catch(() => {})
  }
}

function scoreAvatar(avatarType: string, decisionRole: string, jurisdiction: string,
  naics: string, budgetAuthority: number, status: string): { influence: number; relevance: number } {
  let influence = 0
  if (decisionRole === 'primary') influence += 50
  else if (decisionRole === 'gatekeeper') influence += 40
  else if (decisionRole === 'influencer') influence += 30
  else influence += 15
  if (['contracting_officer', 'government_buyer'].includes(avatarType)) influence += 30
  else if (['facilities_manager', 'prime_bd', 'small_business_officer'].includes(avatarType)) influence += 25
  else if (['property_manager', 'developer', 'commercial_operator'].includes(avatarType)) influence += 20
  if (budgetAuthority > 10_000_000) influence += 20
  else if (budgetAuthority > 1_000_000) influence += 15
  else if (budgetAuthority > 100_000) influence += 5
  influence = Math.min(influence, 100)

  let relevance = 0
  const typeRel: Record<string, number> = {
    facilities_manager: 35, prime_bd: 30, contracting_officer: 30,
    small_business_officer: 25, property_manager: 30,
    government_buyer: 20, commercial_operator: 25, developer: 20,
  }
  relevance += typeRel[avatarType] || 10
  const j = jurisdiction.toUpperCase()
  if (j.includes('FL')) relevance += 30
  else if (j.includes('TX') || j.includes('CA') || j.includes('GA')) relevance += 20
  else if (j.includes('NC') || j.includes('VA')) relevance += 10
  if (naics.startsWith('56172') || naics.startsWith('56171')) relevance += 25
  else if (naics.startsWith('561')) relevance += 15
  if (budgetAuthority > 1_000_000) relevance += 15
  else if (budgetAuthority > 500_000) relevance += 10
  else if (budgetAuthority > 100_000) relevance += 5
  if (status === 'named') relevance += 5
  relevance = Math.min(relevance, 100)

  return { influence, relevance }
}

function inferType(title: string, isGovOrg: boolean): string {
  const t = title.toLowerCase()
  if (/contracting officer|co |warranted/.test(t)) return 'contracting_officer'
  if (/small business|osdbu|sbir|set.aside/.test(t)) return 'small_business_officer'
  if (/facilit|custodial|maintenance|housekeep|janitorial|cleaning/.test(t)) return 'facilities_manager'
  if (/business develop|bd |capture|subcontract|teaming/.test(t)) return 'prime_bd'
  if (/property manag|building manag|asset manag/.test(t)) return 'property_manager'
  if (/developer|development|construction|project manag/.test(t)) return 'developer'
  if (/procurement|acquisition|contracting|purchasing/.test(t) && isGovOrg) return 'government_buyer'
  if (isGovOrg) return 'government_buyer'
  return 'prime_bd'
}

function inferRole(title: string): string {
  const t = title.toLowerCase()
  if (/director|chief|head|vp |vice president|senior director/.test(t)) return 'primary'
  if (/manager|officer|lead|supervisor/.test(t)) return 'gatekeeper'
  if (/specialist|analyst|coordinator/.test(t)) return 'influencer'
  return 'executor'
}

async function generateStrategy(context: {
  name: string; avatarType: string; org: string; jurisdiction: string;
  naics: string; contractValue: number; agency: string
}): Promise<{ outreach_strategy: string; next_action: string; best_method: string }> {
  if (!ANTHROPIC_KEY) return templates(context)

  const prompt = `You are a business development strategist for Maravilla Cleaners — an FL-based federally certified commercial janitorial company (NAICS 561720, SDVOSB eligible, strong FL/TX/CA past performance).

Target: ${context.name} (${context.avatarType.replace(/_/g,' ')}) at ${context.org}
Jurisdiction: ${context.jurisdiction} | Contract value: $${(context.contractValue/1000).toFixed(0)}K | NAICS: ${context.naics}
${context.agency ? `Agency/Client: ${context.agency}` : ''}

Write 3 fields as JSON:
1. outreach_strategy (2-3 sentences): specific angle for Maravilla to approach this person. Reference their role and what Maravilla offers that's relevant.
2. next_action (1 sentence): concrete first step.
3. best_method (5 words max): how to reach them.

Return ONLY valid JSON with those 3 keys.`

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (resp.ok) {
      const data = await resp.json()
      const text = data.content?.[0]?.text || '{}'
      const cleaned = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      return {
        outreach_strategy: parsed.outreach_strategy || '',
        next_action: parsed.next_action || '',
        best_method: parsed.best_method || '',
      }
    }
  } catch { /* fallback */ }
  return templates(context)
}

function templates(ctx: { avatarType: string; org: string; contractValue: number; jurisdiction: string }): {
  outreach_strategy: string; next_action: string; best_method: string
} {
  const amt = `$${(ctx.contractValue / 1000).toFixed(0)}K`
  const strategies: Record<string, { outreach_strategy: string; next_action: string; best_method: string }> = {
    contracting_officer: {
      outreach_strategy: `${ctx.org} has awarded ${amt} in NAICS 561720. Maravilla can register as an interested vendor for future solicitations and request a capability briefing. Reference FL/TX past performance and SDVOSB eligibility.`,
      next_action: `Register in SAM.gov under ${ctx.org} and set up procurement alert for NAICS 561720.`,
      best_method: 'SAM.gov / agency portal',
    },
    facilities_manager: {
      outreach_strategy: `${ctx.org} manages facilities in ${ctx.jurisdiction} under a ${amt} contract. Maravilla should approach as a local, certified subcontractor with rapid mobilization and government past performance. Lead with same-day cleaning capability and SDVOSB set-aside advantage.`,
      next_action: `Send LinkedIn connection with a brief capabilities statement focused on ${ctx.jurisdiction} janitorial services.`,
      best_method: 'LinkedIn direct message',
    },
    prime_bd: {
      outreach_strategy: `${ctx.org} is a prime with ${amt} in federal facilities contracts. Their BD team controls subcontract awards. Maravilla should position as a teaming partner — certified in NAICS 561720, FL-based, with commercial janitorial past performance that complements their government portfolio.`,
      next_action: `Identify ${ctx.org}'s upcoming recompetes on USASpending and request a teaming conversation 90 days before solicitation.`,
      best_method: 'LinkedIn + capability brief email',
    },
    small_business_officer: {
      outreach_strategy: `The SB Officer at ${ctx.org} advocates for small business utilization in their acquisition plans. Maravilla should request a capabilities meeting and get on their preferred vendor list for NAICS 561720. Reference any relevant set-aside certifications.`,
      next_action: `Email the OSDBU at ${ctx.org} with a one-page capabilities statement.`,
      best_method: 'Email to OSDBU',
    },
    property_manager: {
      outreach_strategy: `${ctx.org} manages commercial properties in ${ctx.jurisdiction}. Maravilla should pitch a recurring commercial cleaning contract with a volume discount proposal. Emphasize background-checked cleaners, insurance, and local presence.`,
      next_action: `Cold outreach with a quote offer for facility walkthrough — ${ctx.jurisdiction} properties.`,
      best_method: 'Phone + email',
    },
  }
  return strategies[ctx.avatarType] || {
    outreach_strategy: `${ctx.org} represents a ${amt} opportunity in ${ctx.jurisdiction}. Maravilla should engage via capability brief and referencing FL janitorial past performance.`,
    next_action: `Research ${ctx.org} on LinkedIn and find the appropriate BD contact.`,
    best_method: 'LinkedIn',
  }
}

/**
 * POST /api/avatars/extract
 * Accepts award/company data and creates operational avatars.
 * named_contacts: [{name, title, source}] — real people from source data
 * If no named_contacts, creates role-based inferred avatars.
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    company_name, agency = '', naics = '', description = '',
    award_amount = 0, contracts_seen_in = '', entity_key = '',
    entity_name = '', source = 'ai_inference', jurisdiction = '',
    named_contacts = [],
  } = body

  if (!company_name) return NextResponse.json({ error: 'company_name required' }, { status: 400 })

  const isGovAgency = Boolean(agency && !company_name.toLowerCase().includes('inc') && !company_name.toLowerCase().includes('llc'))
  const amt = Number(award_amount)
  const today = new Date().toISOString().split('T')[0]
  const jur = jurisdiction || (description + entity_name).toUpperCase().includes('FL') ? 'FL' :
    (description + entity_name).toUpperCase().includes('TX') ? 'TX' : 'Multi-state'

  const savedIds: { id: string; name: string; type: string }[] = []

  // ── Named contacts (real people from source data) ──────────────────────────
  for (const nc of (named_contacts as { name: string; title: string; source?: string }[])) {
    if (!nc.name || !nc.title) continue
    const avatarType = inferType(nc.title, isGovAgency)
    const decisionRole = inferRole(nc.title)
    const { influence, relevance } = scoreAvatar(avatarType, decisionRole, jur, naics, amt, 'named')
    const strategy = await generateStrategy({ name: nc.name, avatarType, org: company_name, jurisdiction: jur, naics, contractValue: amt, agency })

    const ek = entity_key || `company:${company_name.toUpperCase()}`
    const id = await upsertAvatar({
      Name: nc.name, Avatar_Type: avatarType, Title: nc.title,
      Organization: agency && avatarType === 'contracting_officer' ? agency : company_name,
      Entity_Key: ek, Entity_Type: isGovAgency ? 'agency' : 'company',
      Confidence: 80, Influence_Score: influence, Relevance_Score: relevance,
      Decision_Role: decisionRole, Status: 'named',
      Geographic_Jurisdiction: jur, Procurement_Categories: naics,
      Budget_Authority: amt, Source: nc.source || source,
      Outreach_Strategy: strategy.outreach_strategy,
      Best_Contact_Method: strategy.best_method,
      Next_Action: strategy.next_action,
      Relevance_Reason: `Named contact from ${nc.source || source}: ${nc.title} at ${company_name} on a ${(amt/1000).toFixed(0)}K award.`,
      Contracts_Seen_In: contracts_seen_in,
      Last_Seen: today,
    })
    if (id) {
      savedIds.push({ id, name: nc.name, type: avatarType })
      await saveContractLink(id, nc.name, avatarType, contracts_seen_in, ek, company_name, avatarType === 'contracting_officer' ? 'contracting_officer' : 'awardee_contact', amt, naics, agency, source)
    }
  }

  // ── Role-based inferred avatars (when no named contacts or to supplement) ─
  const rolesToInfer: Array<{
    title: string; avatarType: string; decisionRole: string;
    budgetAuthority: number; relevanceNote: string
  }> = []

  if (amt > 1_000_000) {
    rolesToInfer.push({
      title: 'Director of Facilities Management', avatarType: 'facilities_manager',
      decisionRole: 'primary', budgetAuthority: amt,
      relevanceNote: `${company_name} holds $${(amt/1e6).toFixed(1)}M in federal contracts. Their Facilities Director controls subcontract selection for all cleaning and maintenance.`,
    })
    rolesToInfer.push({
      title: 'Subcontracts Manager', avatarType: 'prime_bd',
      decisionRole: 'gatekeeper', budgetAuthority: amt * 0.3,
      relevanceNote: `Prime with >$1M federal award must maintain subcontracting plan. Their Subcontracts Manager owns teaming relationships and is first contact for subcontract opportunities.`,
    })
  }
  if (agency) {
    rolesToInfer.push({
      title: `Contracting Officer — ${agency}`, avatarType: 'contracting_officer',
      decisionRole: 'primary', budgetAuthority: amt,
      relevanceNote: `${agency} is the awarding agency. Their CO controls the contract vehicle, issues solicitations, and can direct janitorial set-asides.`,
    })
  }
  if (naics.startsWith('5617') || naics.startsWith('5616')) {
    rolesToInfer.push({
      title: 'Quality Assurance Manager', avatarType: 'facilities_manager',
      decisionRole: 'influencer', budgetAuthority: amt * 0.2,
      relevanceNote: `${company_name} operates in facilities/cleaning services. Their QA Manager evaluates subcontractor performance and recommends preferred vendors.`,
    })
  }

  for (const role of rolesToInfer) {
    const { influence, relevance } = scoreAvatar(role.avatarType, role.decisionRole, jur, naics, role.budgetAuthority, 'inferred')
    const strategy = await generateStrategy({ name: role.title, avatarType: role.avatarType, org: company_name, jurisdiction: jur, naics, contractValue: amt, agency })
    const ek = entity_key || `company:${company_name.toUpperCase()}`
    const org = role.avatarType === 'contracting_officer' && agency ? agency : company_name
    const id = await upsertAvatar({
      Name: role.title, Avatar_Type: role.avatarType, Title: role.title,
      Organization: org, Entity_Key: ek, Entity_Type: isGovAgency ? 'agency' : 'company',
      Confidence: 40, Influence_Score: influence, Relevance_Score: relevance,
      Decision_Role: role.decisionRole, Status: 'inferred',
      Geographic_Jurisdiction: jur, Procurement_Categories: naics,
      Budget_Authority: Math.round(role.budgetAuthority), Source: source,
      Outreach_Strategy: strategy.outreach_strategy,
      Best_Contact_Method: strategy.best_method,
      Next_Action: strategy.next_action,
      Relevance_Reason: role.relevanceNote,
      Contracts_Seen_In: contracts_seen_in, Last_Seen: today,
    })
    if (id) {
      savedIds.push({ id, name: role.title, type: role.avatarType })
      await saveContractLink(id, role.title, role.avatarType, contracts_seen_in, ek, company_name, role.avatarType === 'contracting_officer' ? 'contracting_officer' : role.avatarType === 'prime_bd' ? 'bd_contact' : 'facilities_manager', amt, naics, agency, source)
    }
  }

  // ── Create relationships between avatars ───────────────────────────────────
  if (savedIds.length >= 2) {
    const coRecipients = savedIds.filter(a => a.type !== 'contracting_officer')
    const co = savedIds.find(a => a.type === 'contracting_officer')
    if (co && coRecipients.length > 0) {
      for (const a of coRecipients) {
        await saveRelationship(co.id, co.name, co.type, a.id, a.name, a.type, 'awards_to', 'moderate', `${co.name} awarded contract to ${company_name}`, source)
      }
    }
    // Co-recipient relationships within company
    for (let i = 0; i < coRecipients.length - 1; i++) {
      await saveRelationship(coRecipients[i].id, coRecipients[i].name, coRecipients[i].type, coRecipients[i+1].id, coRecipients[i+1].name, coRecipients[i+1].type, 'co_recipient', 'strong', `Both associated with ${company_name} on ${contracts_seen_in}`, source)
    }
  }

  return NextResponse.json({
    extracted: savedIds.length,
    avatars: savedIds.map(a => a.name),
    ids: savedIds.map(a => a.id),
  })
}
'''

# ─── /avatars/page.tsx ────────────────────────────────────────────────────────
AVATARS_PAGE = r"""'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Avatar {
  id: string; name: string; avatar_type: string; title: string; organization: string
  entity_key: string; influence_score: number; relevance_score: number
  decision_role: string; status: string; geographic_jurisdiction: string
  procurement_categories: string; budget_authority: number
  outreach_status: string; relevance_reason: string; verified: boolean
  outreach_strategy: string; next_action: string; last_seen: string
}

const C = {
  bg: '#0A0E1A', surface: '#111827', card: '#141C2E', border: '#1E2D45',
  text: '#F1F5F9', muted: '#94A3B8', faint: '#475569',
  blue: '#3B82F6', green: '#10B981', amber: '#F59E0B', red: '#EF4444',
  purple: '#8B5CF6', indigo: '#6366F1', teal: '#14B8A6', orange: '#F97316', pink: '#EC4899',
}

const TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  contracting_officer: { label: 'Contracting Officer', color: C.indigo, icon: '⚖️' },
  government_buyer: { label: 'Gov. Buyer', color: C.blue, icon: '🏛️' },
  small_business_officer: { label: 'SB Officer', color: C.green, icon: '🤝' },
  facilities_manager: { label: 'Facilities Mgr', color: C.amber, icon: '🏢' },
  prime_bd: { label: 'Prime BD', color: C.purple, icon: '🎯' },
  property_manager: { label: 'Property Mgr', color: C.orange, icon: '🏗️' },
  developer: { label: 'Developer', color: C.teal, icon: '🔨' },
  commercial_operator: { label: 'Commercial Op', color: C.pink, icon: '🏪' },
}

const OUTREACH_META: Record<string, { label: string; color: string }> = {
  not_contacted: { label: 'Not Contacted', color: C.faint },
  in_progress: { label: 'In Progress', color: C.blue },
  responded: { label: 'Responded', color: C.green },
  meeting_scheduled: { label: 'Meeting Set', color: C.amber },
  relationship_active: { label: 'Active', color: '#10B981' },
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 4, background: '#1E2D45', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 11, color: C.muted, minWidth: 24, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function AvatarCard({ avatar, onClick }: { avatar: Avatar; onClick: () => void }) {
  const meta = TYPE_META[avatar.avatar_type] || { label: avatar.avatar_type, color: C.faint, icon: '👤' }
  const outreach = OUTREACH_META[avatar.outreach_status] || OUTREACH_META.not_contacted
  const initials = avatar.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div onClick={onClick} style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px',
      cursor: 'pointer', transition: 'border-color 0.2s, transform 0.1s',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = meta.color; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.border; (e.currentTarget as HTMLDivElement).style.transform = 'none' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: `${meta.color}20`, border: `2px solid ${meta.color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: avatar.status === 'inferred' ? 20 : 15, fontWeight: 700, color: meta.color,
        }}>
          {avatar.status === 'inferred' ? meta.icon : initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>
              {avatar.name}
            </span>
            {avatar.verified && <span style={{ fontSize: 10, color: C.green }}>✓</span>}
            {avatar.status === 'named' && <span style={{ fontSize: 9, fontWeight: 700, color: C.blue, background: `${C.blue}20`, borderRadius: 3, padding: '1px 5px' }}>NAMED</span>}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {avatar.organization}
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, color: meta.color,
          background: `${meta.color}15`, border: `1px solid ${meta.color}40`,
          borderRadius: 5, padding: '3px 7px', flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          {meta.label}
        </span>
      </div>

      {/* Scores */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontSize: 10, color: C.faint }}>Influence</span>
          <span style={{ fontSize: 10, color: C.faint }}>Relevance</span>
        </div>
        <ScoreBar value={avatar.influence_score} color={C.indigo} />
        <ScoreBar value={avatar.relevance_score} color={C.green} />
      </div>

      {/* Context chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {avatar.decision_role && (
          <span style={{ fontSize: 10, color: C.muted, background: '#1A2235', borderRadius: 4, padding: '2px 7px', border: `1px solid ${C.border}` }}>
            {avatar.decision_role}
          </span>
        )}
        {avatar.geographic_jurisdiction && (
          <span style={{ fontSize: 10, color: C.teal, background: `${C.teal}15`, borderRadius: 4, padding: '2px 7px', border: `1px solid ${C.teal}30` }}>
            📍 {avatar.geographic_jurisdiction}
          </span>
        )}
        {avatar.budget_authority > 0 && (
          <span style={{ fontSize: 10, color: C.amber, background: `${C.amber}15`, borderRadius: 4, padding: '2px 7px', border: `1px solid ${C.amber}30` }}>
            ${(avatar.budget_authority / 1e6).toFixed(1)}M
          </span>
        )}
      </div>

      {/* Relevance snippet */}
      {avatar.relevance_reason && (
        <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5, borderLeft: `2px solid ${meta.color}40`, paddingLeft: 8 }}>
          {avatar.relevance_reason.substring(0, 100)}{avatar.relevance_reason.length > 100 ? '…' : ''}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 4, borderTop: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 10, color: outreach.color, fontWeight: 600 }}>{outreach.label}</span>
        <span style={{ fontSize: 11, color: C.blue }}>View Profile →</span>
      </div>
    </div>
  )
}

const TYPE_FILTERS = ['all', 'contracting_officer', 'government_buyer', 'facilities_manager', 'prime_bd', 'small_business_officer', 'property_manager', 'developer', 'commercial_operator']

export default function AvatarsPage() {
  const router = useRouter()
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [outreachFilter, setOutreachFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [relevanceMin, setRelevanceMin] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '100' })
    if (typeFilter !== 'all') params.set('avatar_type', typeFilter)
    if (outreachFilter) params.set('outreach_status', outreachFilter)
    if (statusFilter) params.set('status', statusFilter)
    if (relevanceMin > 0) params.set('relevance_min', String(relevanceMin))
    if (search.trim()) params.set('q', search.trim())
    const r = await fetch('/api/avatars?' + params)
    const d = await r.json()
    setAvatars(d.avatars || [])
    setLoading(false)
  }, [typeFilter, outreachFilter, statusFilter, relevanceMin, search])

  useEffect(() => { void load() }, [load])

  const byType: Record<string, number> = {}
  avatars.forEach(a => { byType[a.avatar_type] = (byType[a.avatar_type] || 0) + 1 })
  const highInfluence = avatars.filter(a => a.influence_score >= 70).length
  const named = avatars.filter(a => a.status === 'named').length

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', gap: 16 }}>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>
          Operational Intelligence Graph
        </h1>
        <span style={{ fontSize: 12, color: C.muted }}>—</span>
        <span style={{ fontSize: 13, color: C.muted }}>Avatar Network</span>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 32px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total Avatars', value: avatars.length, color: C.blue },
            { label: 'Named (Real)', value: named, color: C.green },
            { label: 'High Influence (70+)', value: highInfluence, color: C.indigo },
            { label: 'Avg Relevance', value: avatars.length ? Math.round(avatars.reduce((s, a) => s + a.relevance_score, 0) / avatars.length) : 0, color: C.amber },
          ].map(s => (
            <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Search name, title, org…"
            style={{ flex: 1, minWidth: 200, background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: '8px 12px', color: C.text, fontSize: 13, outline: 'none' }}
          />
          <select value={outreachFilter} onChange={e => setOutreachFilter(e.target.value)}
            style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: '8px 12px', color: outreachFilter ? C.text : C.muted, fontSize: 13 }}>
            <option value="">All Outreach Status</option>
            <option value="not_contacted">Not Contacted</option>
            <option value="in_progress">In Progress</option>
            <option value="responded">Responded</option>
            <option value="meeting_scheduled">Meeting Scheduled</option>
            <option value="relationship_active">Active</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: '8px 12px', color: statusFilter ? C.text : C.muted, fontSize: 13 }}>
            <option value="">All Status</option>
            <option value="named">Named (Real Person)</option>
            <option value="inferred">Inferred (Role-based)</option>
            <option value="verified">Verified</option>
          </select>
          <input type="range" min={0} max={80} step={10} value={relevanceMin}
            onChange={e => setRelevanceMin(Number(e.target.value))}
            style={{ width: 100 }} title={`Min relevance: ${relevanceMin}`}
          />
          <span style={{ fontSize: 11, color: C.muted }}>Relevance ≥ {relevanceMin}</span>
        </div>

        {/* Type chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {TYPE_FILTERS.map(t => {
            const meta = t === 'all' ? { label: `All (${avatars.length})`, color: C.blue, icon: '🔍' } :
              { ...TYPE_META[t], label: `${TYPE_META[t]?.label} (${byType[t] || 0})` }
            return (
              <button key={t} onClick={() => setTypeFilter(t)} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: `1px solid ${typeFilter === t ? meta.color : C.border}`,
                background: typeFilter === t ? `${meta.color}20` : C.surface,
                color: typeFilter === t ? meta.color : C.muted,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {meta.icon} {meta.label}
              </button>
            )
          })}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ color: C.muted, textAlign: 'center', padding: 48, fontSize: 14 }}>Loading operational intelligence…</div>
        ) : avatars.length === 0 ? (
          <div style={{ color: C.muted, textAlign: 'center', padding: 48, fontSize: 14, border: `1px dashed ${C.border}`, borderRadius: 12 }}>
            No avatars found. Go to a company or agency page and click "Infer Targets" to generate operational avatars.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {avatars.map(a => (
              <AvatarCard key={a.id} avatar={a} onClick={() => router.push('/avatars/' + a.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
"""

# ─── /avatars/[id]/page.tsx ───────────────────────────────────────────────────
AVATAR_PROFILE_PAGE = r"""'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import TaskPanel from '@/app/components/TaskPanel'
import TimelinePanel from '@/app/components/TimelinePanel'

interface Avatar {
  id: string; name: string; avatar_type: string; title: string; organization: string
  entity_key: string; entity_type: string; email: string; phone: string; linkedin_url: string
  verified: boolean; confidence: number; influence_score: number; relevance_score: number
  decision_role: string; status: string; source: string; geographic_jurisdiction: string
  procurement_categories: string; budget_authority: number; avg_award_size: number
  award_frequency: string; preferred_vehicle: string; set_aside_preference: string
  outreach_status: string; outreach_strategy: string; best_contact_method: string
  next_action: string; next_action_date: string; relevance_reason: string
  contracts_seen_in: string; facilities_managed: string; last_seen: string; notes: string
}
interface Relationship { From_Avatar_ID: string; From_Name: string; From_Type: string; To_Avatar_ID: string; To_Name: string; To_Type: string; Relationship_Type: string; Strength: string; Evidence: string; Co_Appearance_Count: number }
interface ContractLink { Contract_ID: string; Entity_Name: string; Entity_Key: string; Contract_Role: string; Award_Amount: number; NAICS: string; Agency: string }

const C = {
  bg: '#0A0E1A', surface: '#111827', card: '#141C2E', border: '#1E2D45',
  text: '#F1F5F9', muted: '#94A3B8', faint: '#475569',
  blue: '#3B82F6', green: '#10B981', amber: '#F59E0B', red: '#EF4444',
  purple: '#8B5CF6', indigo: '#6366F1', teal: '#14B8A6', orange: '#F97316', pink: '#EC4899',
}

const TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  contracting_officer: { label: 'Contracting Officer', color: C.indigo, icon: '⚖️' },
  government_buyer: { label: 'Gov. Buyer', color: C.blue, icon: '🏛️' },
  small_business_officer: { label: 'SB Officer', color: C.green, icon: '🤝' },
  facilities_manager: { label: 'Facilities Mgr', color: C.amber, icon: '🏢' },
  prime_bd: { label: 'Prime BD', color: C.purple, icon: '🎯' },
  property_manager: { label: 'Property Mgr', color: C.orange, icon: '🏗️' },
  developer: { label: 'Developer', color: C.teal, icon: '🔨' },
  commercial_operator: { label: 'Commercial Op', color: C.pink, icon: '🏪' },
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  not_contacted: { label: 'Not Contacted', color: C.faint },
  in_progress: { label: 'In Progress', color: C.blue },
  responded: { label: 'Responded', color: C.green },
  meeting_scheduled: { label: 'Meeting Set', color: C.amber },
  relationship_active: { label: 'Active', color: C.green },
}

const REL_TYPE_LABEL: Record<string, string> = {
  reports_to: 'Reports To', works_with: 'Works With', co_awards_with: 'Co-Awards With',
  subcontracts_via: 'Subcontracts Via', co_recipient: 'Co-Recipient', awards_to: 'Awards To',
  manages_facility: 'Manages Facility', former_colleague: 'Former Colleague', competes_with: 'Competes With',
}

type TabId = 'overview' | 'intelligence' | 'contracts' | 'relationships' | 'actions'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 24px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.faint, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  )
}

function MetricPill({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 10, color: C.faint, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: color || C.text }}>{value}</div>
    </div>
  )
}

export default function AvatarProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = Array.isArray(params.id) ? params.id[0] : params.id || ''
  const [data, setData] = useState<{ avatar: Avatar; relationships: Relationship[]; contract_links: ContractLink[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabId>('overview')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch('/api/avatars/' + id).then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [id])

  const updateStatus = async (outreach_status: string) => {
    setUpdating(true)
    await fetch('/api/avatars/' + id, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outreach_status }),
    })
    setData(d => d ? { ...d, avatar: { ...d.avatar, outreach_status } } : d)
    setUpdating(false)
  }

  if (loading || !data) {
    return <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 14 }}>Loading avatar…</div>
  }

  const { avatar, relationships, contract_links } = data
  const meta = TYPE_META[avatar.avatar_type] || { label: avatar.avatar_type, color: C.faint, icon: '👤' }
  const statusMeta = STATUS_META[avatar.outreach_status] || STATUS_META.not_contacted
  const initials = avatar.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'intelligence', label: 'Intelligence' },
    { id: 'contracts', label: `Contracts (${contract_links.length})` },
    { id: 'relationships', label: `Network (${relationships.length})` },
    { id: 'actions', label: 'Actions' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      {/* Top bar */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface, color: C.muted, fontSize: 13, cursor: 'pointer' }}>← Back</button>
        <span style={{ color: C.faint, fontSize: 13 }}>Avatars</span>
        <span style={{ color: C.faint }}>›</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{avatar.name}</span>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 32px' }}>

        {/* Avatar Header */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `4px solid ${meta.color}`, borderRadius: 12, padding: '24px 28px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
            {/* Avatar icon */}
            <div style={{
              width: 72, height: 72, borderRadius: 16, flexShrink: 0,
              background: `${meta.color}20`, border: `2px solid ${meta.color}50`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: avatar.status === 'inferred' ? 32 : 22, fontWeight: 800, color: meta.color,
            }}>
              {avatar.status === 'inferred' ? meta.icon : initials}
            </div>

            {/* Identity */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>{avatar.name}</h1>
                {avatar.verified && <span style={{ fontSize: 12, color: C.green }}>✓ Verified</span>}
                <span style={{ fontSize: 10, fontWeight: 700, color: avatar.status === 'named' ? C.blue : C.faint, background: avatar.status === 'named' ? `${C.blue}20` : '#1A2235', borderRadius: 4, padding: '2px 7px', border: `1px solid ${avatar.status === 'named' ? C.blue + '40' : C.border}` }}>
                  {avatar.status === 'named' ? 'NAMED' : avatar.status === 'verified' ? 'VERIFIED' : 'INFERRED'}
                </span>
              </div>
              <div style={{ fontSize: 14, color: C.muted, marginBottom: 4 }}>{avatar.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: C.text }}>{avatar.organization}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: `${meta.color}15`, border: `1px solid ${meta.color}40`, borderRadius: 20, padding: '3px 10px' }}>
                  {meta.icon} {meta.label}
                </span>
              </div>
              {avatar.last_seen && (
                <div style={{ fontSize: 11, color: C.faint, marginTop: 6 }}>Last seen: {avatar.last_seen} · Source: {avatar.source}</div>
              )}
            </div>

            {/* Outreach status + actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: statusMeta.color, background: `${statusMeta.color}20`, border: `1px solid ${statusMeta.color}40`, borderRadius: 20, padding: '4px 12px' }}>
                {statusMeta.label}
              </span>
              {avatar.linkedin_url && (
                <a href={'https://linkedin.com/search/results/people/?keywords=' + encodeURIComponent(avatar.name + ' ' + avatar.organization)} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: '#0A66C2', textDecoration: 'none' }}>💼 Search LinkedIn</a>
              )}
            </div>
          </div>

          {/* Score metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginTop: 24 }}>
            <MetricPill label="Influence" value={`${avatar.influence_score}/100`} color={avatar.influence_score >= 70 ? C.indigo : avatar.influence_score >= 40 ? C.amber : C.faint} />
            <MetricPill label="Relevance" value={`${avatar.relevance_score}/100`} color={avatar.relevance_score >= 70 ? C.green : avatar.relevance_score >= 40 ? C.amber : C.faint} />
            <MetricPill label="Decision Role" value={avatar.decision_role || '—'} />
            <MetricPill label="Confidence" value={`${avatar.confidence}%`} />
            {avatar.budget_authority > 0 && <MetricPill label="Budget Authority" value={`$${(avatar.budget_authority / 1e6).toFixed(1)}M`} color={C.amber} />}
            {avatar.geographic_jurisdiction && <MetricPill label="Jurisdiction" value={avatar.geographic_jurisdiction} color={C.teal} />}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '10px 18px', fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? meta.color : C.muted,
              background: 'transparent', border: 'none',
              borderBottom: tab === t.id ? `2px solid ${meta.color}` : '2px solid transparent',
              cursor: 'pointer',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Overview tab */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Why they matter */}
            {avatar.relevance_reason && (
              <Section title="Why This Person Matters to Maravilla">
                <div style={{ fontSize: 14, color: C.text, lineHeight: 1.7 }}>{avatar.relevance_reason}</div>
              </Section>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Outreach strategy */}
              {avatar.outreach_strategy && (
                <Section title="Outreach Strategy">
                  <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 16 }}>{avatar.outreach_strategy}</div>
                  {avatar.best_contact_method && (
                    <div style={{ fontSize: 12, color: C.teal }}>
                      <strong>Best method:</strong> {avatar.best_contact_method}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                    {['not_contacted', 'in_progress', 'responded', 'meeting_scheduled', 'relationship_active'].map(s => (
                      <button key={s} disabled={updating || avatar.outreach_status === s} onClick={() => updateStatus(s)}
                        style={{
                          padding: '5px 11px', fontSize: 11, borderRadius: 6, border: `1px solid ${C.border}`,
                          background: avatar.outreach_status === s ? `${STATUS_META[s].color}20` : C.card,
                          color: avatar.outreach_status === s ? STATUS_META[s].color : C.muted,
                          cursor: avatar.outreach_status === s || updating ? 'not-allowed' : 'pointer',
                        }}>{STATUS_META[s].label}</button>
                    ))}
                  </div>
                </Section>
              )}

              {/* Next action */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {avatar.next_action && (
                  <Section title="Next Action">
                    <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{avatar.next_action}</div>
                    {avatar.next_action_date && (
                      <div style={{ fontSize: 11, color: C.amber, marginTop: 8 }}>📅 {avatar.next_action_date}</div>
                    )}
                  </Section>
                )}

                {/* Contact info */}
                {(avatar.email || avatar.phone || avatar.linkedin_url) && (
                  <Section title="Contact Information">
                    {avatar.email && <div style={{ fontSize: 13, color: C.text, marginBottom: 8 }}>✉️ {avatar.email}</div>}
                    {avatar.phone && <div style={{ fontSize: 13, color: C.text, marginBottom: 8 }}>📞 {avatar.phone}</div>}
                    {avatar.linkedin_url && (
                      <a href={avatar.linkedin_url} target="_blank" rel="noreferrer"
                        style={{ fontSize: 13, color: '#0A66C2', textDecoration: 'none' }}>💼 LinkedIn Profile</a>
                    )}
                  </Section>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Intelligence tab */}
        {tab === 'intelligence' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Section title="Procurement Profile">
              {[
                { label: 'NAICS Categories', value: avatar.procurement_categories || '—' },
                { label: 'Geographic Scope', value: avatar.geographic_jurisdiction || '—' },
                { label: 'Budget Authority', value: avatar.budget_authority > 0 ? `$${(avatar.budget_authority/1e6).toFixed(1)}M` : '—' },
                { label: 'Avg Award Size', value: avatar.avg_award_size > 0 ? `$${(avatar.avg_award_size/1e3).toFixed(0)}K` : '—' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.muted }}>{row.label}</span>
                  <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </Section>
            <Section title="Award Behavior">
              {[
                { label: 'Award Frequency', value: avatar.award_frequency || '—' },
                { label: 'Preferred Vehicle', value: avatar.preferred_vehicle || '—' },
                { label: 'Set-Aside Preference', value: avatar.set_aside_preference || '—' },
                { label: 'Decision Role', value: avatar.decision_role || '—' },
                { label: 'Influence Score', value: `${avatar.influence_score}/100` },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.muted }}>{row.label}</span>
                  <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </Section>
            {avatar.contracts_seen_in && (
              <Section title="Contracts Seen In">
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, fontFamily: 'monospace' }}>{avatar.contracts_seen_in}</div>
              </Section>
            )}
            {avatar.facilities_managed && (
              <Section title="Facilities Managed">
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>{avatar.facilities_managed}</div>
              </Section>
            )}
          </div>
        )}

        {/* Contracts tab */}
        {tab === 'contracts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {contract_links.length === 0 ? (
              <div style={{ color: C.muted, textAlign: 'center', padding: 40, border: `1px dashed ${C.border}`, borderRadius: 12 }}>
                No contract links recorded yet.
              </div>
            ) : contract_links.map((link, i) => (
              <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                    {link.Entity_Name || link.Entity_Key}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted }}>
                    {link.Agency && <span style={{ marginRight: 12 }}>{link.Agency}</span>}
                    {link.NAICS && <span style={{ marginRight: 12 }}>NAICS: {link.NAICS}</span>}
                    {link.Contract_Role && <span style={{ color: C.teal }}>{link.Contract_Role.replace(/_/g,' ')}</span>}
                  </div>
                </div>
                {link.Award_Amount > 0 && (
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.amber }}>${(link.Award_Amount/1e6).toFixed(1)}M</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Relationships tab */}
        {tab === 'relationships' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {relationships.length === 0 ? (
              <div style={{ color: C.muted, textAlign: 'center', padding: 40, border: `1px dashed ${C.border}`, borderRadius: 12 }}>
                No relationships mapped yet. Relationships form when avatars appear together on contracts or awards.
              </div>
            ) : relationships.map((rel, i) => {
              const isFrom = rel.From_Avatar_ID === id
              const otherName = isFrom ? rel.To_Name : rel.From_Name
              const otherType = isFrom ? rel.To_Type : rel.From_Type
              const otherMeta = TYPE_META[otherType] || { label: otherType, color: C.faint, icon: '👤' }
              const strength = rel.Strength === 'strong' ? C.green : rel.Strength === 'moderate' ? C.amber : C.faint
              return (
                <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 24, color: otherMeta.color }}>{otherMeta.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{otherName}</span>
                      <span style={{ fontSize: 10, color: otherMeta.color, background: `${otherMeta.color}15`, border: `1px solid ${otherMeta.color}40`, borderRadius: 4, padding: '1px 6px' }}>{otherMeta.label}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: C.indigo, fontWeight: 600 }}>
                        {isFrom ? '→' : '←'} {REL_TYPE_LABEL[rel.Relationship_Type] || rel.Relationship_Type}
                      </span>
                      <span style={{ fontSize: 10, color: strength }}>● {rel.Strength}</span>
                      {rel.Co_Appearance_Count > 1 && <span style={{ fontSize: 10, color: C.faint }}>{rel.Co_Appearance_Count}× co-appearance</span>}
                    </div>
                    {rel.Evidence && <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>{rel.Evidence.substring(0, 100)}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Actions tab */}
        {tab === 'actions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <TaskPanel entityKey={avatar.id} entityType="contact" entityName={avatar.name} entityUrl={'/avatars/' + avatar.id} />
            <TimelinePanel entityKey={avatar.id} entityName={avatar.name} />
          </div>
        )}
      </div>
    </div>
  )
}
"""

# ─── components/AvatarsPanel.tsx ──────────────────────────────────────────────
AVATARS_PANEL = r"""'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Avatar {
  id: string; name: string; avatar_type: string; title: string; organization: string
  influence_score: number; relevance_score: number; decision_role: string; status: string
  outreach_status: string; relevance_reason: string; outreach_strategy: string; next_action: string
  budget_authority: number; geographic_jurisdiction: string; verified: boolean
}

const C = {
  bg: '#0A0E1A', surface: '#111827', card: '#141C2E', border: '#1E2D45',
  text: '#F1F5F9', muted: '#94A3B8', faint: '#475569',
  blue: '#3B82F6', green: '#10B981', amber: '#F59E0B',
  purple: '#8B5CF6', indigo: '#6366F1', teal: '#14B8A6', orange: '#F97316', pink: '#EC4899',
}

const TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  contracting_officer: { label: 'Contracting Officer', color: C.indigo, icon: '⚖️' },
  government_buyer: { label: 'Gov. Buyer', color: C.blue, icon: '🏛️' },
  small_business_officer: { label: 'SB Officer', color: C.green, icon: '🤝' },
  facilities_manager: { label: 'Facilities Mgr', color: C.amber, icon: '🏢' },
  prime_bd: { label: 'Prime BD', color: C.purple, icon: '🎯' },
  property_manager: { label: 'Property Mgr', color: C.orange, icon: '🏗️' },
  developer: { label: 'Developer', color: C.teal, icon: '🔨' },
  commercial_operator: { label: 'Commercial Op', color: C.pink, icon: '🏪' },
}

const OUTREACH_META: Record<string, { label: string; color: string }> = {
  not_contacted: { label: 'Not Contacted', color: C.faint },
  in_progress: { label: 'In Progress', color: C.blue },
  responded: { label: 'Responded', color: C.green },
  meeting_scheduled: { label: 'Meeting Set', color: C.amber },
  relationship_active: { label: 'Active', color: C.green },
}

export default function AvatarsPanel({
  entityKey, entityName, entityType = 'company', compact = false,
}: {
  entityKey: string; entityName: string; entityType?: string; compact?: boolean
}) {
  const router = useRouter()
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = async () => {
    if (!entityKey || entityKey.includes('undefined') || entityKey.includes('null')) {
      setLoading(false); return
    }
    setLoading(true)
    const r = await fetch('/api/avatars?entity_key=' + encodeURIComponent(entityKey) + '&limit=20')
    const d = await r.json()
    setAvatars(d.avatars || [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [entityKey])

  const extractAvatars = async () => {
    setExtracting(true)
    await fetch('/api/avatars/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_name: entityName, entity_key: entityKey, entity_name: entityName, source: 'portal_extract' }),
    })
    await load()
    setExtracting(false)
  }

  const named = avatars.filter(a => a.status === 'named' || a.status === 'verified')
  const inferred = avatars.filter(a => a.status === 'inferred')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
            Operational Avatars {loading ? '' : `(${avatars.length})`}
          </span>
          {named.length > 0 && (
            <span style={{ fontSize: 11, color: C.green }}>{named.length} named</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {avatars.length > 0 && (
            <button onClick={() => router.push('/avatars?entity_key=' + encodeURIComponent(entityKey))}
              style={{ fontSize: 11, padding: '4px 10px', background: C.card, color: C.muted, borderRadius: 6, border: `1px solid ${C.border}`, cursor: 'pointer' }}>
              Full Graph →
            </button>
          )}
          <button onClick={extracting ? undefined : extractAvatars} disabled={extracting}
            style={{ fontSize: 11, padding: '4px 12px', background: extracting ? C.card : '#1E3A5F', color: extracting ? C.muted : '#93C5FD', borderRadius: 6, border: '1px solid #1E3A5F', cursor: extracting ? 'not-allowed' : 'pointer' }}>
            {extracting ? 'Analyzing…' : '+ Infer Avatars'}
          </button>
        </div>
      </div>

      {loading && <div style={{ color: C.muted, fontSize: 12, padding: '20px', textAlign: 'center' }}>Loading intelligence…</div>}

      {!loading && avatars.length === 0 && (
        <div style={{ color: C.muted, fontSize: 12, padding: '20px', textAlign: 'center', border: `1px dashed ${C.border}`, borderRadius: 8 }}>
          No avatars yet.<br />
          <span style={{ fontSize: 11 }}>Click "Infer Avatars" to generate operational intelligence targets.</span>
        </div>
      )}

      {/* Named avatars */}
      {!loading && named.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: C.green, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>● Named (Real Persons)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {named.map(a => <AvatarRow key={a.id} a={a} expanded={expanded === a.id} onToggle={() => setExpanded(expanded === a.id ? null : a.id)} onView={() => router.push('/avatars/' + a.id)} />)}
          </div>
        </div>
      )}

      {/* Inferred avatars */}
      {!loading && inferred.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: C.faint, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>○ Inferred (Role-based)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(compact ? inferred.slice(0, 3) : inferred).map(a => <AvatarRow key={a.id} a={a} expanded={expanded === a.id} onToggle={() => setExpanded(expanded === a.id ? null : a.id)} onView={() => router.push('/avatars/' + a.id)} />)}
            {compact && inferred.length > 3 && (
              <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 4 }}>
                +{inferred.length - 3} more inferred avatars
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AvatarRow({ a, expanded, onToggle, onView }: { a: Avatar; expanded: boolean; onToggle: () => void; onView: () => void }) {
  const meta = TYPE_META[a.avatar_type] || { label: a.avatar_type, color: C.faint, icon: '👤' }
  const outreach = OUTREACH_META[a.outreach_status] || OUTREACH_META.not_contacted
  const borderColor = a.status === 'named' ? C.green : a.status === 'verified' ? C.teal : C.border

  return (
    <div style={{ background: C.card, border: `1px solid ${borderColor}`, borderRadius: 10, overflow: 'hidden' }}>
      {/* Row header — always visible */}
      <div onClick={onToggle} style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 20 }}>{meta.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
              {a.name}
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, color: meta.color, background: `${meta.color}15`, border: `1px solid ${meta.color}40`, borderRadius: 4, padding: '1px 5px' }}>
              {meta.label}
            </span>
            {a.verified && <span style={{ fontSize: 10, color: C.green }}>✓</span>}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{a.organization}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ fontSize: 10, color: C.indigo }}>inf {a.influence_score}</span>
            <span style={{ fontSize: 10, color: C.green }}>rel {a.relevance_score}</span>
          </div>
          <span style={{ fontSize: 9, color: outreach.color }}>{outreach.label}</span>
        </div>
        <span style={{ color: C.faint, fontSize: 12, marginLeft: 4 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${C.border}` }}>
          {a.relevance_reason && (
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, padding: '12px 0 8px', borderBottom: `1px solid ${C.border}` }}>
              <strong style={{ color: C.text }}>Why:</strong> {a.relevance_reason.substring(0, 150)}{a.relevance_reason.length > 150 ? '…' : ''}
            </div>
          )}
          {a.next_action && (
            <div style={{ fontSize: 12, color: C.teal, marginTop: 8, marginBottom: 12 }}>
              <strong>Next:</strong> {a.next_action.substring(0, 100)}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={onView} style={{ fontSize: 11, padding: '5px 12px', background: '#1E3A5F', color: '#93C5FD', borderRadius: 6, border: 'none', cursor: 'pointer' }}>
              Full Profile →
            </button>
            <button onClick={() => window.open('https://linkedin.com/search/results/people/?keywords=' + encodeURIComponent(a.name + ' ' + a.organization), '_blank')}
              style={{ fontSize: 11, padding: '5px 12px', background: C.card, color: C.muted, borderRadius: 6, border: `1px solid ${C.border}`, cursor: 'pointer' }}>
              LinkedIn Search
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
"""

# ─── Write all files ──────────────────────────────────────────────────────────
def sub(template):
    return (template
        .replace('__KEY__', AT_KEY)
        .replace('__BASE__', BASE)
        .replace('__TBL_AVATARS__', TBL_AVATARS)
        .replace('__TBL_REL__', TBL_REL)
        .replace('__TBL_LINKS__', TBL_LINKS)
        .replace('__TBL_EVENTS__', TBL_EVENTS)
        .replace('__TBL_TASKS__', TBL_TASKS)
    )

write(f'{APP}/api/avatars/route.ts', sub(AVATARS_ROUTE))
write(f'{APP}/api/avatars/[id]/route.ts', sub(AVATARS_ID_ROUTE))
write(f'{APP}/api/avatars/extract/route.ts', sub(AVATARS_EXTRACT_ROUTE))
write(f'{APP}/avatars/page.tsx', AVATARS_PAGE)
write(f'{APP}/avatars/[id]/page.tsx', AVATAR_PROFILE_PAGE)
write(f'{APP}/components/AvatarsPanel.tsx', AVATARS_PANEL)
print("All files written.")

# ─── Patch Navigation and profile pages ──────────────────────────────────────
patch(f'{APP}/components/Navigation.tsx',
    "{ href: '/contacts', label: '\U0001f465 Contacts', icon: '\U0001f465' },",
    "{ href: '/avatars', label: '\U0001f9e0 Intelligence', icon: '\U0001f9e0' },\n    { href: '/contacts', label: '\U0001f465 Contacts', icon: '\U0001f465' },",
    "navigation: add Intelligence/Avatars link")

# Replace ContactsPanel with AvatarsPanel in company page
patch(f'{APP}/companies/[id]/page.tsx',
    "import ContactsPanel from '@/app/components/ContactsPanel'",
    "import AvatarsPanel from '@/app/components/AvatarsPanel'",
    "company: swap ContactsPanel → AvatarsPanel import")
patch(f'{APP}/companies/[id]/page.tsx',
    "<ContactsPanel entityKey={buildEntityKey('company', rawId)} entityName={formatCompanyName(data?.company?.name || rawId)} compact={false} />",
    "<AvatarsPanel entityKey={buildEntityKey('company', rawId)} entityName={formatCompanyName(data?.company?.name || rawId)} entityType=\"company\" compact={false} />",
    "company: use AvatarsPanel in contacts tab")

# Replace ContactsPanel with AvatarsPanel in agency page
patch(f'{APP}/agencies/[id]/page.tsx',
    "import ContactsPanel from '@/app/components/ContactsPanel'",
    "import AvatarsPanel from '@/app/components/AvatarsPanel'",
    "agency: swap ContactsPanel → AvatarsPanel import")
patch(f'{APP}/agencies/[id]/page.tsx',
    "<ContactsPanel entityKey={buildEntityKey('agency', rawId)} entityName={data?.agency?.name ? formatAgencyName(data.agency.name) : agencyName} compact={false} />",
    "<AvatarsPanel entityKey={buildEntityKey('agency', rawId)} entityName={data?.agency?.name ? formatAgencyName(data.agency.name) : agencyName} entityType=\"agency\" compact={false} />",
    "agency: use AvatarsPanel in contacts tab")

print("Patches done.")
