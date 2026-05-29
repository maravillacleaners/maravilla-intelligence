'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

const C = {
  bg: '#FAFAF9',
  surface: '#FFFFFF',
  border: '#E7E5E4',
  text: '#1C1917',
  muted: '#78716C',
  faint: '#A8A29E',
  indigo: '#4F46E5',
  indigoLight: '#EEF2FF',
  indigoBorder: '#C7D2FE',
  indigoDark: '#3730A3',
  green: '#16A34A',
  greenLight: '#DCFCE7',
  greenBorder: '#BBF7D0',
  amber: '#D97706',
  amberLight: '#FEF3C7',
  amberBorder: '#FDE68A',
  red: '#DC2626',
  redLight: '#FEE2E2',
  redBorder: '#FECACA',
  blue: '#2563EB',
  blueLight: '#DBEAFE',
  blueBorder: '#BFDBFE',
  purple: '#7C3AED',
  purpleLight: '#F5F3FF',
  purpleBorder: '#DDD6FE',
}

interface Contract {
  award_id: string
  recipient: string
  amount: number
  agency: string
  naics: string
  date: string
  description: string
  state: string
}

interface ContactToFind {
  name: string
  title: string
  department: string
  confidence: number
  procurement_role: string
  decision_influence: 'high' | 'medium' | 'low'
  likely_buyer: boolean
  linkedin_hint: string
}

interface AirtableRecord {
  id: string
  [key: string]: unknown
}

interface TimelineEntry {
  date: string
  event: string
  type: string
}

interface CompanyData {
  company: {
    name: string
    slug: string
    state: string
    classification: 'prime_contractor' | 'competitor' | 'subcontractor_prospect'
    total_contract_value: number
    contract_count: number
    avg_contract: number
    agencies: string[]
    naics_codes: string[]
    last_award_date: string
    score: number
  }
  ai: {
    why_matters: string
    opportunity_signals: string[]
    risks: string[]
    recommended_actions: string[]
    contacts_to_find: ContactToFind[]
    relationship_angle: string
    score_explanation: string
    next_best_action: string
  }
  contracts: Contract[]
  airtable_intel: AirtableRecord[]
  opportunities: AirtableRecord[]
  contacts: AirtableRecord[]
  timeline: TimelineEntry[]
  score: number
}

interface Ownership {
  owner: string
  status: string
  next_action: string
  due_date: string
  notes: string
}

type TabId = 'overview' | 'contracts' | 'contacts' | 'signals' | 'outreach' | 'relationships'

function fmtVal(n: number): string {
  if (!n) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${n.toLocaleString()}`
}

function fmtDate(s: string): string {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return s
  }
}

function classLabel(c: string) {
  if (c === 'prime_contractor') return 'Prime Contractor'
  if (c === 'competitor') return 'Competitor'
  return 'Sub Prospect'
}

function classColors(c: string) {
  if (c === 'prime_contractor') return { bg: C.amberLight, color: C.amber, border: C.amberBorder }
  if (c === 'competitor') return { bg: C.redLight, color: C.red, border: C.redBorder }
  return { bg: C.greenLight, color: C.green, border: C.greenBorder }
}

function Skeleton({ h = 16, w = '100%', radius = 6 }: { h?: number; w?: string | number; radius?: number }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: radius,
      background: 'linear-gradient(90deg,#F5F5F4 25%,#E7E5E4 50%,#F5F5F4 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
    }} />
  )
}

function ScoreCircle({ score, size = 64 }: { score: number; size?: number }) {
  const color = score >= 70 ? C.indigo : score >= 40 ? C.amber : C.red
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: score >= 70 ? C.indigoLight : score >= 40 ? C.amberLight : C.redLight,
      border: `3px solid ${color}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ fontSize: size * 0.28, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
      <span style={{ fontSize: size * 0.14, color, opacity: 0.7, fontWeight: 500 }}>score</span>
    </div>
  )
}

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: '12px 16px', flex: 1, minWidth: 110,
    }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.faint, marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function CtaBtn({ label, icon, primary = false, onClick, disabled = false }: {
  label: string; icon: string; primary?: boolean; onClick: () => void; disabled?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: primary ? '9px 16px' : '8px 14px',
      borderRadius: 8, fontSize: 13, fontWeight: primary ? 600 : 500,
      cursor: disabled ? 'default' : 'pointer',
      border: primary ? 'none' : `1px solid ${C.border}`,
      background: primary ? C.indigo : C.surface,
      color: primary ? '#FFFFFF' : C.text,
      opacity: disabled ? 0.7 : 1,
      transition: 'opacity 120ms',
    }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.opacity = '0.85' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = disabled ? '0.7' : '1' }}
    >
      <span style={{ fontSize: 15 }}>{icon}</span>
      {label}
    </button>
  )
}

function Chip({ label, tone = 'gray' }: { label: string; tone?: 'green' | 'red' | 'amber' | 'indigo' | 'gray' | 'purple' }) {
  const map = {
    green: { bg: C.greenLight, color: C.green, border: C.greenBorder },
    red: { bg: C.redLight, color: C.red, border: C.redBorder },
    amber: { bg: C.amberLight, color: C.amber, border: C.amberBorder },
    indigo: { bg: C.indigoLight, color: C.indigo, border: C.indigoBorder },
    purple: { bg: C.purpleLight, color: C.purple, border: C.purpleBorder },
    gray: { bg: '#F5F5F4', color: C.muted, border: C.border },
  }
  const s = map[tone]
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 20, padding: '3px 10px', fontSize: 11.5, fontWeight: 500,
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>{label}</span>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: C.faint, letterSpacing: '0.06em', marginBottom: 12, textTransform: 'uppercase' }}>
      {title}
    </div>
  )
}

function EmptyState({ icon = '🔍', title, sub, action }: {
  icon?: string; title: string; sub: string; action?: { label: string; onClick: () => void }
}) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, background: '#F5F5F4',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: C.muted, maxWidth: 340, lineHeight: 1.5 }}>{sub}</div>
      </div>
      {action && (
        <button onClick={action.onClick} style={{
          marginTop: 4, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
          cursor: 'pointer', border: `1px solid ${C.indigo}`, background: C.indigoLight, color: C.indigo,
        }}>{action.label}</button>
      )}
    </div>
  )
}

// ── Contacts Tab ──────────────────────────────────────────────────────────────

function ContactCard({ contact, companyName }: { contact: ContactToFind; companyName: string }) {
  const influenceColor = contact.decision_influence === 'high' ? C.indigo
    : contact.decision_influence === 'medium' ? C.amber : C.muted
  const influenceTone = contact.decision_influence === 'high' ? 'indigo'
    : contact.decision_influence === 'medium' ? 'amber' : 'gray'

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: '20px', display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: contact.likely_buyer ? C.indigoLight : '#F5F5F4',
            border: `2px solid ${contact.likely_buyer ? C.indigoBorder : C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: contact.likely_buyer ? C.indigo : C.muted,
            flexShrink: 0,
          }}>
            {contact.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>
              {contact.name}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{contact.title}</div>
            <div style={{ fontSize: 11, color: C.faint }}>{contact.department}</div>
          </div>
        </div>
        {/* AI badge */}
        <span style={{
          fontSize: 10, fontWeight: 600, color: C.purple, background: C.purpleLight,
          border: `1px solid ${C.purpleBorder}`, borderRadius: 4, padding: '2px 6px',
          flexShrink: 0,
        }}>AI-INFERRED</span>
      </div>

      {/* Confidence + influence row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Chip label={`${contact.confidence}% confidence`} tone="gray" />
        <Chip label={`${contact.decision_influence} influence`} tone={influenceTone as 'indigo' | 'amber' | 'gray'} />
        {contact.likely_buyer && <Chip label="Likely Buyer" tone="green" />}
        <Chip label={contact.procurement_role.replace(/_/g, ' ')} tone="gray" />
      </div>

      {/* Relationship intelligence */}
      <div style={{
        background: '#FAFAFB', borderRadius: 8, padding: '10px 12px',
        fontSize: 12, color: C.muted, lineHeight: 1.5,
      }}>
        <span style={{ fontWeight: 600, color: C.text }}>Procurement role: </span>
        {contact.procurement_role === 'primary_decision_maker'
          ? 'Most likely janitorial decision-maker based on title and contract patterns.'
          : contact.procurement_role === 'financial_approver'
          ? 'Controls budget approval for facilities services. Secondary influence.'
          : contact.procurement_role === 'subcontract_coordinator'
          ? 'Manages subcontracting relationships and vendor onboarding.'
          : 'Operational contact who manages day-to-day facilities. Good entry point.'}
      </div>

      {/* LinkedIn hint */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', background: C.blueLight, borderRadius: 8,
        fontSize: 12, color: C.blue,
      }}>
        <span>🔗</span>
        <span style={{ fontWeight: 500 }}>LinkedIn: </span>
        <span style={{ color: C.muted }}>{contact.linkedin_hint}</span>
      </div>

      {/* Action */}
      <button
        onClick={() => {
          const q = encodeURIComponent(`${contact.name} ${companyName}`)
          window.open(`https://www.linkedin.com/search/results/people/?keywords=${q}`, '_blank')
        }}
        style={{
          padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
          cursor: 'pointer', border: `1px solid ${C.border}`, background: C.surface, color: C.text,
          width: '100%', textAlign: 'center',
        }}
      >
        Search on LinkedIn →
      </button>
    </div>
  )
}

// ── Ownership Panel ───────────────────────────────────────────────────────────

function OwnershipPanel({ companySlug }: { companySlug: string }) {
  const key = `ownership_${companySlug}`
  const [editing, setEditing] = useState(false)
  const [ownership, setOwnership] = useState<Ownership>({
    owner: '',
    status: 'Researching',
    next_action: '',
    due_date: '',
    notes: '',
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key)
      if (saved) setOwnership(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [key])

  function save() {
    localStorage.setItem(key, JSON.stringify(ownership))
    setEditing(false)
  }

  const statusColors: Record<string, { bg: string; color: string }> = {
    Researching: { bg: C.blueLight, color: C.blue },
    Qualifying: { bg: C.amberLight, color: C.amber },
    Outreach: { bg: C.purpleLight, color: C.purple },
    Active: { bg: C.greenLight, color: C.green },
    Stalled: { bg: '#F5F5F4', color: C.muted },
    Won: { bg: C.greenLight, color: C.green },
    Lost: { bg: C.redLight, color: C.red },
  }
  const sc = statusColors[ownership.status] || statusColors['Researching']

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: '20px', display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionHeader title="Ownership" />
        <button onClick={() => setEditing(!editing)} style={{
          fontSize: 12, color: C.indigo, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500,
        }}>{editing ? 'Cancel' : 'Edit'}</button>
      </div>

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Owner', key: 'owner', placeholder: 'e.g. Mariana' },
            { label: 'Next Action', key: 'next_action', placeholder: 'e.g. Find procurement contact' },
            { label: 'Due Date', key: 'due_date', placeholder: 'YYYY-MM-DD' },
            { label: 'Notes', key: 'notes', placeholder: 'Internal notes...' },
          ].map((f) => (
            <div key={f.key}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 500 }}>{f.label}</div>
              <input
                value={ownership[f.key as keyof Ownership]}
                placeholder={f.placeholder}
                onChange={(e) => setOwnership({ ...ownership, [f.key]: e.target.value })}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: 7,
                  border: `1px solid ${C.border}`, fontSize: 13, color: C.text,
                  background: C.surface, boxSizing: 'border-box',
                }}
              />
            </div>
          ))}
          <div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 500 }}>Status</div>
            <select
              value={ownership.status}
              onChange={(e) => setOwnership({ ...ownership, status: e.target.value })}
              style={{
                width: '100%', padding: '7px 10px', borderRadius: 7,
                border: `1px solid ${C.border}`, fontSize: 13, color: C.text, background: C.surface,
              }}
            >
              {Object.keys(statusColors).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={save} style={{
            padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', border: 'none', background: C.indigo, color: '#FFF',
          }}>Save</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Owner', value: ownership.owner || '—' },
            { label: 'Next Action', value: ownership.next_action || '—' },
            { label: 'Due Date', value: ownership.due_date ? fmtDate(ownership.due_date) : '—' },
          ].map((f) => (
            <div key={f.label}>
              <div style={{ fontSize: 11, color: C.faint, marginBottom: 3 }}>{f.label}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{f.value}</div>
            </div>
          ))}
          <div>
            <div style={{ fontSize: 11, color: C.faint, marginBottom: 3 }}>Status</div>
            <span style={{
              fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
              background: sc.bg, color: sc.color,
            }}>{ownership.status}</span>
          </div>
          {ownership.notes && (
            <div style={{ fontSize: 12, color: C.muted, background: '#FAFAFB', borderRadius: 8, padding: '8px 10px' }}>
              {ownership.notes}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Timeline ──────────────────────────────────────────────────────────────────

function TimelinePanel({ entries, contracts, opportunities, intelCount }: {
  entries: TimelineEntry[]
  contracts: Contract[]
  opportunities: AirtableRecord[]
  intelCount: number
}) {
  const events: { date: string; label: string; icon: string; color: string }[] = []

  contracts.slice(0, 3).forEach((c) => {
    if (c.date) events.push({
      date: c.date,
      label: `Contract awarded: ${c.agency || 'Federal agency'} — ${fmtVal(c.amount)}`,
      icon: '📋',
      color: C.indigo,
    })
  })

  if (intelCount > 0) events.push({
    date: new Date().toISOString(),
    label: `Captured in ${intelCount} intelligence signal${intelCount > 1 ? 's' : ''}`,
    icon: '📡',
    color: C.green,
  })

  if (opportunities.length > 0) events.push({
    date: new Date().toISOString(),
    label: `Linked to ${opportunities.length} pipeline opportunity`,
    icon: '🎯',
    color: C.amber,
  })

  events.push({
    date: new Date().toISOString(),
    label: 'Profile first viewed',
    icon: '👁',
    color: C.muted,
  })

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (events.length === 0) {
    return (
      <EmptyState
        icon="🕐"
        title="No Activity Yet"
        sub="Activity will appear here as you interact with this company — contracts found, signals captured, outreach sent."
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {events.map((ev, i) => (
        <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', paddingBottom: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: '#F5F5F4',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
            }}>{ev.icon}</div>
            {i < events.length - 1 && (
              <div style={{ width: 1, flex: 1, background: C.border, minHeight: 16, marginTop: 4 }} />
            )}
          </div>
          <div style={{ paddingTop: 6, flex: 1 }}>
            <div style={{ fontSize: 13, color: C.text, fontWeight: 500, lineHeight: 1.4 }}>{ev.label}</div>
            {ev.date && (
              <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>{fmtDate(ev.date)}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CompanyProfile() {
  const params = useParams()
  const router = useRouter()
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id
  const companyName = decodeURIComponent(rawId || '').replace(/-/g, ' ')

  const [data, setData] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<TabId>('overview')
  const [addedPipeline, setAddedPipeline] = useState(false)
  const [monitorSaved, setMonitorSaved] = useState(false)

  useEffect(() => {
    if (!rawId) return
    setLoading(true)
    setError('')
    fetch(`/api/companies/${rawId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return }
        setData(d)
      })
      .catch(() => setError('Failed to load company profile'))
      .finally(() => setLoading(false))
  }, [rawId])

  async function addToPipeline() {
    if (!data || addedPipeline) return
    try {
      await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.company.name,
          agency: data.company.agencies[0] || '',
          state: data.company.state,
          status: 'New',
          source: 'company_profile',
          estimated_value: data.company.total_contract_value,
          naics_codes: data.company.naics_codes.join(', '),
          scope_summary: data.ai.why_matters,
          signal_strength: data.score >= 70 ? 'High' : data.score >= 40 ? 'Medium' : 'Low',
          score: data.score,
        }),
      })
    } catch { /* non-fatal */ }
    setAddedPipeline(true)
  }

  function startOutreach() {
    if (!data) return
    localStorage.setItem('outreach_preselect', data.company.name)
    router.push('/outreach')
  }

  function saveMonitor() {
    if (!data) return
    const watched = JSON.parse(localStorage.getItem('monitored_companies') || '[]')
    if (!watched.includes(data.company.name)) {
      watched.push(data.company.name)
      localStorage.setItem('monitored_companies', JSON.stringify(watched))
    }
    setMonitorSaved(true)
    setTimeout(() => setMonitorSaved(false), 2000)
  }

  const aiContacts = data?.ai?.contacts_to_find || []
  const airtableContacts = data?.contacts || []
  const totalContacts = aiContacts.length + airtableContacts.length

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'contracts', label: 'Contracts', count: data?.contracts.length },
    { id: 'contacts', label: 'Contacts', count: totalContacts || undefined },
    { id: 'signals', label: 'Signals', count: data?.airtable_intel.length },
    { id: 'outreach', label: 'Outreach' },
    { id: 'relationships', label: 'Relationships' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* Top bar */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: '0 32px', display: 'flex', alignItems: 'center', height: 56, gap: 12,
      }}>
        <button onClick={() => router.back()} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
          borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface,
          color: C.muted, fontSize: 13, cursor: 'pointer',
        }}>← Back</button>
        <span style={{ color: C.faint, fontSize: 13 }}>Companies</span>
        <span style={{ color: C.faint, fontSize: 13 }}>›</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
          {loading ? '...' : companyName}
        </span>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px' }}>
        {error && (
          <div style={{
            background: C.redLight, border: `1px solid ${C.redBorder}`,
            borderRadius: 10, padding: '20px 24px', color: C.red, fontSize: 14,
          }}>{error}</div>
        )}

        {loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Skeleton h={24} w={280} />
            <Skeleton h={12} w={200} />
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <Skeleton h={80} /><Skeleton h={80} /><Skeleton h={80} />
            </div>
            <Skeleton h={120} /><Skeleton h={200} />
          </div>
        )}

        {data && !loading && (
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

            {/* ── Main column ── */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Company Header */}
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: '24px 28px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
                  {/* Avatar */}
                  <div style={{
                    width: 64, height: 64, borderRadius: 16,
                    background: C.indigoLight, border: `2px solid ${C.indigoBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 26, fontWeight: 700, color: C.indigo, flexShrink: 0,
                  }}>
                    {data.company.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name + meta */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>
                        {data.company.name}
                      </h1>
                      {(() => {
                        const cls = classColors(data.company.classification)
                        return (
                          <span style={{
                            background: cls.bg, color: cls.color, border: `1px solid ${cls.border}`,
                            borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600,
                          }}>{classLabel(data.company.classification)}</span>
                        )
                      })()}
                    </div>
                    <div style={{ fontSize: 13, color: C.muted, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      {data.company.state && <span>📍 {data.company.state}</span>}
                      {data.company.agencies.length > 0 && (
                        <span>🏛 {data.company.agencies.length} {data.company.agencies.length === 1 ? 'agency' : 'agencies'}</span>
                      )}
                      {data.company.naics_codes.length > 0 && (
                        <span>NAICS: {data.company.naics_codes.slice(0, 3).join(', ')}</span>
                      )}
                      {data.company.last_award_date && (
                        <span>Last award: {fmtDate(data.company.last_award_date)}</span>
                      )}
                    </div>
                  </div>

                  <ScoreCircle score={data.score} size={72} />
                </div>

                {/* Metrics */}
                <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
                  <MetricCard label="Total Contract Value" value={fmtVal(data.company.total_contract_value)} sub="All known awards" />
                  <MetricCard label="Avg Contract" value={fmtVal(data.company.avg_contract)} sub="Per award" />
                  <MetricCard label="Contract Count" value={data.company.contract_count || '—'} sub="Federal awards" />
                  <MetricCard label="Agencies" value={data.company.agencies.length || '—'} sub="Connected to" />
                </div>

                {/* ── Structured Why This Matters ── */}
                <div style={{
                  marginTop: 20, background: C.indigoLight, border: `1px solid ${C.indigoBorder}`,
                  borderRadius: 10, padding: '18px 20px',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.indigo, marginBottom: 10, letterSpacing: 0.5 }}>
                    ⚡ WHY THIS MATTERS
                  </div>
                  <p style={{ margin: '0 0 16px', fontSize: 14, color: C.indigoDark, lineHeight: 1.6 }}>
                    {data.ai.why_matters}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {/* Opportunity signals */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                        ✓ OPPORTUNITY SIGNALS
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {(data.ai.opportunity_signals || []).map((s, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.text }}>
                            <span style={{ color: C.green, fontWeight: 700 }}>+</span>
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Risks */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.red, marginBottom: 8 }}>
                        ⚠ RISKS
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {(data.ai.risks || []).map((r, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.text }}>
                            <span style={{ color: C.red, fontWeight: 700 }}>−</span>
                            {r}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recommended actions */}
                  <div style={{
                    marginTop: 14, borderTop: `1px solid ${C.indigoBorder}`,
                    paddingTop: 14,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.indigo, marginBottom: 8 }}>
                      → RECOMMENDED ACTIONS
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {(data.ai.recommended_actions || []).map((a, i) => (
                        <div key={i} style={{ fontSize: 13, color: C.indigoDark, fontWeight: i === 0 ? 600 : 400 }}>
                          {i + 1}. {a}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Next best action */}
                {data.ai.next_best_action && (
                  <div style={{
                    marginTop: 12, padding: '12px 16px',
                    background: '#FFFBEB', border: `1px solid ${C.amberBorder}`,
                    borderRadius: 8, fontSize: 13, color: C.amber, fontWeight: 500,
                  }}>
                    ⚡ <strong>Next best action:</strong> {data.ai.next_best_action}
                  </div>
                )}

                {/* Score explanation */}
                <div style={{
                  marginTop: 12, padding: '10px 14px', background: '#F9F9F8',
                  borderRadius: 8, fontSize: 12, color: C.muted,
                }}>
                  <strong style={{ color: C.text }}>Score {data.score}/100:</strong> {data.ai.score_explanation}
                </div>

                {/* CTAs */}
                <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <CtaBtn
                    label={addedPipeline ? 'Added ✓' : 'Add to Pipeline'}
                    icon="🎯" primary
                    onClick={addToPipeline}
                    disabled={addedPipeline}
                  />
                  <CtaBtn label="Find Contacts" icon="👤" onClick={() => setTab('contacts')} />
                  <CtaBtn label="Start Outreach" icon="✉️" onClick={startOutreach} />
                  <CtaBtn label={monitorSaved ? 'Monitoring ✓' : 'Monitor'} icon="🔔" onClick={saveMonitor} />
                  <CtaBtn label="View Contracts" icon="📋" onClick={() => setTab('contracts')} />
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}` }}>
                {tabs.map((t) => (
                  <button key={t.id} onClick={() => setTab(t.id)} style={{
                    padding: '10px 18px', fontSize: 13,
                    fontWeight: tab === t.id ? 600 : 400,
                    color: tab === t.id ? C.indigo : C.muted,
                    background: 'transparent', border: 'none',
                    borderBottom: tab === t.id ? `2px solid ${C.indigo}` : '2px solid transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {t.label}
                    {t.count !== undefined && t.count > 0 && (
                      <span style={{
                        background: tab === t.id ? C.indigoLight : '#F5F5F4',
                        color: tab === t.id ? C.indigo : C.faint,
                        borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 600,
                      }}>{t.count}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── Overview Tab ── */}
              {tab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Relationship intelligence */}
                  <div style={{
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 10, padding: '20px',
                  }}>
                    <SectionHeader title="Relationship Intelligence" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {[
                        { label: 'Relationship Type', value: data.ai.relationship_angle === 'client_target' ? '🎯 Client Target'
                            : data.ai.relationship_angle === 'competitor' ? '⚔️ Competitor'
                            : data.ai.relationship_angle === 'teaming_partner' ? '🤝 Teaming Partner'
                            : '🔧 Subcontractor' },
                        { label: 'Classification', value: classLabel(data.company.classification) },
                        { label: 'Top Agencies', value: data.company.agencies.slice(0, 2).join(', ') || '—' },
                        { label: 'NAICS Codes', value: data.company.naics_codes.slice(0, 3).join(', ') || '—' },
                      ].map((f) => (
                        <div key={f.label}>
                          <div style={{ fontSize: 11, color: C.faint, marginBottom: 4 }}>{f.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{f.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Related entities */}
                  <div style={{
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 10, padding: '20px',
                  }}>
                    <SectionHeader title="Related Entities" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Agencies */}
                      {data.company.agencies.slice(0, 4).map((agency) => (
                        <div key={agency} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                          background: '#FAFAFB', borderRadius: 8, cursor: 'pointer',
                        }}
                          onClick={() => window.location.href = `/companies/${encodeURIComponent(agency)}`}
                        >
                          <span style={{ fontSize: 16 }}>🏛</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: C.indigo }}>{agency}</div>
                            <div style={{ fontSize: 11, color: C.faint }}>Awarding agency</div>
                          </div>
                          <span style={{ fontSize: 12, color: C.faint }}>→</span>
                        </div>
                      ))}

                      {/* Related opportunities */}
                      {data.opportunities.slice(0, 2).map((opp) => (
                        <div key={opp.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                          background: '#FAFAFB', borderRadius: 8,
                        }}>
                          <span style={{ fontSize: 16 }}>🎯</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>
                              {String(opp.title || opp.agency || 'Pipeline opportunity')}
                            </div>
                            <div style={{ fontSize: 11, color: C.faint }}>In pipeline · {String(opp.status || 'New')}</div>
                          </div>
                        </div>
                      ))}

                      {data.company.agencies.length === 0 && data.opportunities.length === 0 && (
                        <div style={{ fontSize: 13, color: C.faint, textAlign: 'center', padding: '12px 0' }}>
                          No related entities found — expand search to discover connections.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activity timeline */}
                  <div style={{
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 10, padding: '20px',
                  }}>
                    <SectionHeader title="Activity Timeline" />
                    <TimelinePanel
                      entries={data.timeline}
                      contracts={data.contracts}
                      opportunities={data.opportunities}
                      intelCount={data.airtable_intel.length}
                    />
                  </div>
                </div>
              )}

              {/* ── Contracts Tab ── */}
              {tab === 'contracts' && (
                <div style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 10, overflow: 'hidden',
                }}>
                  {data.contracts.length === 0 ? (
                    <EmptyState
                      icon="📋"
                      title="No Federal Contract Records Found"
                      sub={`No USASpending.gov records match "${data.company.name}". The company may use a different registered name or may not hold federal prime contracts.`}
                      action={{ label: 'Search USASpending.gov →', onClick: () => window.open(`https://www.usaspending.gov/search/?query=${encodeURIComponent(data.company.name)}`, '_blank') }}
                    />
                  ) : (
                    <>
                      <div style={{
                        background: '#FAFAFB', borderBottom: `1px solid ${C.border}`,
                        padding: '10px 16px',
                        display: 'grid', gridTemplateColumns: '140px 1fr 1fr 100px 80px', gap: 12,
                      }}>
                        {['Award ID', 'Agency', 'Description', 'Amount', 'Date'].map((h) => (
                          <div key={h} style={{ fontSize: 11, fontWeight: 600, color: C.faint, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {h}
                          </div>
                        ))}
                      </div>
                      {data.contracts.map((c, i) => (
                        <div key={`${c.award_id}-${i}`} style={{
                          padding: '12px 16px',
                          borderBottom: i < data.contracts.length - 1 ? `1px solid ${C.border}` : 'none',
                          display: 'grid', gridTemplateColumns: '140px 1fr 1fr 100px 80px', gap: 12,
                          alignItems: 'start',
                        }}>
                          <div style={{ fontSize: 11, fontFamily: 'monospace', color: C.muted }}>
                            {String(c.award_id || '').slice(0, 18) || '—'}
                          </div>
                          <div style={{ fontSize: 12, color: C.text }}>{c.agency || '—'}</div>
                          <div style={{ fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.description || '—'}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{fmtVal(c.amount)}</div>
                          <div style={{ fontSize: 11, color: C.faint }}>{fmtDate(c.date)}</div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* ── Contacts Tab ── */}
              {tab === 'contacts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* AI-inferred contacts header */}
                  {aiContacts.length > 0 && (
                    <>
                      <div style={{
                        background: C.purpleLight, border: `1px solid ${C.purpleBorder}`,
                        borderRadius: 10, padding: '12px 16px',
                        fontSize: 13, color: C.purple,
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <span>🤖</span>
                        <div>
                          <strong>AI-inferred contacts</strong> — These are research starting points based on company type and contract patterns.
                          Confidence scores are low (30–55%) by design. Verify before outreach.
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
                        {aiContacts.map((contact, i) => (
                          <ContactCard key={i} contact={contact} companyName={data.company.name} />
                        ))}
                      </div>
                    </>
                  )}

                  {/* Airtable verified contacts */}
                  {airtableContacts.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        ✓ VERIFIED IN AIRTABLE
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
                        {airtableContacts.map((contact) => (
                          <div key={contact.id} style={{
                            background: C.surface, border: `1px solid ${C.greenBorder}`,
                            borderRadius: 12, padding: '16px 20px',
                          }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                              {String(contact.contact_name || contact.legal_name || '—')}
                            </div>
                            <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
                              {String(contact.sub_category || contact.supplier_type || '—')}
                            </div>
                            {contact.business_email && (
                              <div style={{ fontSize: 12, color: C.indigo }}>✉️ {String(contact.business_email)}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No contacts at all */}
                  {aiContacts.length === 0 && airtableContacts.length === 0 && (
                    <div style={{
                      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
                    }}>
                      <EmptyState
                        icon="👤"
                        title="No Contact Intelligence Available"
                        sub="This company returned no AI-inferred contacts. This can happen when the company name is too generic or contract data is insufficient to infer roles."
                      />
                      <div style={{
                        borderTop: `1px solid ${C.border}`, padding: '16px 24px', background: '#FAFAFB',
                      }}>
                        <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, fontWeight: 600 }}>ROLES TO RESEARCH</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {['Facilities Director', 'Procurement Officer', 'VP Operations', 'Regional Manager', 'Contracts Administrator'].map((role) => (
                            <span key={role} style={{
                              background: '#F5F5F4', color: C.muted, borderRadius: 20,
                              padding: '4px 10px', fontSize: 12,
                            }}>{role}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Signals Tab ── */}
              {tab === 'signals' && (
                <div>
                  {data.airtable_intel.length === 0 ? (
                    <div style={{
                      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
                    }}>
                      <EmptyState
                        icon="📡"
                        title="No Intelligence Signals Captured"
                        sub="Run a discovery scan or analyze emails mentioning this company to start capturing procurement signals."
                        action={{ label: 'Go to Discovery →', onClick: () => router.push('/discovery') }}
                      />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {data.airtable_intel.map((rec) => (
                        <div key={rec.id} style={{
                          background: C.surface, border: `1px solid ${C.border}`,
                          borderRadius: 10, padding: '16px 20px',
                          display: 'flex', gap: 14, alignItems: 'flex-start',
                        }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%', background: C.indigoLight,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
                          }}>📡</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                              {String(rec.signal_type || rec.source || 'Intelligence Signal')}
                            </div>
                            <div style={{ fontSize: 12, color: C.muted }}>
                              {String(rec.scope_summary || rec.summary || rec.description || '—')}
                            </div>
                            {rec.created_at && (
                              <div style={{ fontSize: 11, color: C.faint, marginTop: 6 }}>
                                {fmtDate(String(rec.created_at))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Outreach Tab ── */}
              {tab === 'outreach' && (
                <div style={{
                  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
                }}>
                  <EmptyState
                    icon="✉️"
                    title="No Outreach Activity Recorded"
                    sub="Start an outreach sequence for this company. All emails, calls, and touchpoints will appear here."
                    action={{ label: 'Start Outreach', onClick: startOutreach }}
                  />
                </div>
              )}

              {/* ── Relationships Tab ── */}
              {tab === 'relationships' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Graph placeholder — simple card map */}
                  <div style={{
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 10, padding: '24px',
                  }}>
                    <SectionHeader title="Relationship Map" />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                      {/* Root node */}
                      <div style={{
                        background: C.indigo, color: '#FFF', borderRadius: 10, padding: '10px 20px',
                        fontSize: 13, fontWeight: 700,
                      }}>{data.company.name}</div>

                      {/* Connectors */}
                      {data.company.agencies.slice(0, 3).map((agency, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                          <div style={{ width: 1, height: 20, background: C.border }} />
                          <div style={{
                            background: C.blueLight, color: C.blue, border: `1px solid ${C.blueBorder}`,
                            borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 500,
                            cursor: 'pointer',
                          }}
                            onClick={() => window.location.href = `/companies/${encodeURIComponent(agency)}`}
                          >🏛 {agency}</div>
                        </div>
                      ))}

                      {data.company.agencies.length === 0 && (
                        <div style={{ fontSize: 13, color: C.faint, marginTop: 20, textAlign: 'center' }}>
                          No agency relationships found in federal contract data.
                        </div>
                      )}
                    </div>
                  </div>

                  {data.company.agencies.length > 3 && (
                    <div style={{
                      background: C.surface, border: `1px solid ${C.border}`,
                      borderRadius: 10, padding: '16px 20px',
                    }}>
                      <SectionHeader title="All Connected Agencies" />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {data.company.agencies.map((agency) => (
                          <div key={agency} style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                            background: '#FAFAFB', borderRadius: 8, cursor: 'pointer',
                          }}
                            onClick={() => window.location.href = `/companies/${encodeURIComponent(agency)}`}
                          >
                            <span>🏛</span>
                            <span style={{ fontSize: 13, color: C.indigo, fontWeight: 500, flex: 1 }}>{agency}</span>
                            <span style={{ fontSize: 12, color: C.faint }}>→</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Sidebar ── */}
            <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Ownership */}
              <OwnershipPanel companySlug={rawId || ''} />

              {/* Quick stats */}
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: '20px',
              }}>
                <SectionHeader title="Quick Facts" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'Total Contracts', value: String(data.company.contract_count || '—') },
                    { label: 'Contract Value', value: fmtVal(data.company.total_contract_value) },
                    { label: 'Avg Award Size', value: fmtVal(data.company.avg_contract) },
                    { label: 'Last Award', value: fmtDate(data.company.last_award_date) },
                    { label: 'State', value: data.company.state || '—' },
                    { label: 'Relevance Score', value: `${data.score}/100` },
                  ].map((f) => (
                    <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: C.muted }}>{f.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* NAICS codes */}
              {data.company.naics_codes.length > 0 && (
                <div style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 12, padding: '20px',
                }}>
                  <SectionHeader title="NAICS Codes" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {data.company.naics_codes.slice(0, 8).map((n) => (
                      <div key={n} style={{
                        fontSize: 12, fontFamily: 'monospace',
                        background: String(n).startsWith('561') ? C.greenLight : '#F5F5F4',
                        color: String(n).startsWith('561') ? C.green : C.muted,
                        borderRadius: 6, padding: '4px 8px',
                      }}>
                        {n}
                        {String(n).startsWith('561') && (
                          <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600 }}>← JANITORIAL</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
