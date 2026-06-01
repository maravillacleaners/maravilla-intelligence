'use client'

import { useEffect, useState, useCallback } from 'react'
import TopBar from '@/components/crm/top-bar'
import { InvestigationModal } from '@/components/crm/investigation-modal'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Lead {
  id: string
  entity_name: string
  lead_type: string
  stage: string
  priority_score: number
  govcon_fit: number
  commercial_fit: number
  source: string
  agency: string
  location: string
  value: number
  contactable: boolean
  has_decision_maker: boolean
  decision_maker_name: string
  decision_maker_email: string
  decision_maker_phone: string
  enrichment_needed: boolean
  score_signals: string
  naics: string
  description: string
  notes: string
  avatar_count: number
  last_seen: string
  created_time: string
}

interface LeadDetail {
  lead: Lead & { entity_key: string; score_signals: string[] | string }
  events: { id: string; event_type: string; description: string; actor: string; timestamp: string }[]
  tasks:  { id: string; task: string; status: string; priority: string; owner: string; due_date: string; notes: string }[]
}

// ── Theme ──────────────────────────────────────────────────────────────────────

const C = {
  bg:      '#FAFAF9',
  surface: '#FFFFFF',
  border:  '1px solid #E7E5E4',
  text:    '#1C1917',
  muted:   '#78716C',
  vMuted:  '#A8A29E',
  primary: '#4F46E5',
  green:   '#16A34A',
  amber:   '#D97706',
  red:     '#DC2626',
}

const STAGE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'New Signal':      { bg: '#EEF2FF', color: '#3730A3', border: '#C7D2FE' },
  'Contact Found':   { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  'Outreach Ready':  { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  'In Conversation': { bg: '#FFF7ED', color: '#9A3412', border: '#FED7AA' },
  'Proposal Sent':   { bg: '#FAF5FF', color: '#7E22CE', border: '#E9D5FF' },
  'Won':             { bg: '#F0FDF4', color: '#166534', border: '#86EFAC' },
  'Lost':            { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
  'Monitor':         { bg: '#F5F5F4', color: '#57534E', border: '#E7E5E4' },
}

const SOURCE_ICONS: Record<string, string> = {
  'sam.gov':       '🏛️',
  intelligence:    '📊',
  avatars:         '👤',
  highergov:       '🔍',
  sunbiz:          '☀️',
  email:           '📧',
  manual:          '✏️',
}

const ACTION_BUTTONS = [
  { id: 'qualify',        label: 'Qualify',        color: '#4F46E5', bg: '#EEF2FF',   desc: 'Mark outreach-ready + create task' },
  { id: 'find_contact',   label: 'Find Contact',   color: '#0369A1', bg: '#E0F2FE',   desc: 'Create research task' },
  { id: 'start_outreach', label: 'Outreach',       color: '#15803D', bg: '#F0FDF4',   desc: 'Create outreach task + event' },
  { id: 'pipeline',       label: 'In Pipeline',    color: '#B45309', bg: '#FFF7ED',   desc: 'Move to active pipeline' },
  { id: 'monitor',        label: 'Monitor',        color: '#57534E', bg: '#F5F5F4',   desc: 'Flag for future review' },
  { id: 'not_a_fit',      label: 'Not a Fit',      color: '#991B1B', bg: '#FEF2F2',   desc: 'Close as lost' },
] as const

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatValue(v: number) {
  if (!v) return '—'
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  return `$${v}`
}
function formatDate(s: string) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}
function formatTs(s: string) {
  if (!s) return ''
  const d = new Date(s)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}
function eventIcon(type: string) {
  const map: Record<string, string> = {
    signal_detected: '📡', lead_qualified: '✅', contact_search_started: '🔍',
    outreach_started: '📤', moved_to_pipeline: '🔄', set_to_monitor: '👁️',
    marked_not_a_fit: '❌', lead_won: '🏆', stage_change: '🔄', intake: '⬇️',
  }
  return map[type] || '•'
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StageBadge({ stage }: { stage: string }) {
  const t = STAGE_COLORS[stage] || STAGE_COLORS['Monitor']
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 500, background: t.bg, color: t.color, border: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>
      {stage}
    </span>
  )
}

function ScoreBar({ value }: { value: number }) {
  const pct = Math.min(value, 100)
  const color = value >= 80 ? C.green : value >= 60 ? C.amber : C.vMuted
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 44, height: 4, background: '#E7E5E4', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums', minWidth: 22 }}>{value}</span>
    </div>
  )
}

// ── Lead Detail Slide-out ──────────────────────────────────────────────────────

function LeadPanel({
  leadId,
  onClose,
  onActionDone,
}: {
  leadId: string
  onClose: () => void
  onActionDone: (newStage: string) => void
}) {
  const [detail, setDetail]       = useState<LeadDetail | null>(null)
  const [loading, setLoading]     = useState(true)
  const [acting, setActing]       = useState<string | null>(null)
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null)
  const [notes, setNotes]         = useState('')
  const [activeTab, setActiveTab] = useState<'timeline' | 'tasks' | 'contact'>('timeline')
  const [showInvestigation, setShowInvestigation] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/leads/${leadId}`)
      .then(r => r.json())
      .then(data => {
        // API returns either { lead, events, tasks } or flat object
        if (data.lead) {
          setDetail(data)
        } else {
          // flat response from existing route
          setDetail({ lead: data, events: data.events || [], tasks: data.tasks || [] })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [leadId])

  async function runAction(action: string) {
    setActing(action)
    try {
      const res = await fetch(`/api/leads/${leadId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: notes || undefined }),
      })
      const data = await res.json()
      if (data.ok) {
        setToast({ msg: `Done — ${data.new_stage}${data.task_created ? ' + task created' : ''}`, ok: true })
        onActionDone(data.new_stage)
        // Refresh detail
        const fresh = await fetch(`/api/leads/${leadId}`).then(r => r.json())
        if (fresh.lead) setDetail(fresh)
        else setDetail({ lead: fresh, events: fresh.events || [], tasks: fresh.tasks || [] })
      } else {
        setToast({ msg: data.error || 'Error', ok: false })
      }
    } catch (e: any) {
      setToast({ msg: e.message, ok: false })
    } finally {
      setActing(null)
      setTimeout(() => setToast(null), 4000)
    }
  }

  const lead   = detail?.lead
  const events = detail?.events || []
  const tasks  = detail?.tasks  || []
  const signals = lead ? (Array.isArray(lead.score_signals) ? lead.score_signals : (lead.score_signals || '').split('\n').filter(Boolean)) : []

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 100 }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 540, zIndex: 101,
        background: '#FFF', boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        {loading ? (
          <div style={{ padding: 40, color: C.vMuted }}>Loading…</div>
        ) : !lead ? (
          <div style={{ padding: 40, color: C.red }}>Lead not found</div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: C.border }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: C.vMuted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    {SOURCE_ICONS[lead.source] || '•'} {lead.source} · {lead.lead_type || 'Lead'}
                  </div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{lead.entity_name}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <StageBadge stage={lead.stage} />
                    <ScoreBar value={lead.priority_score} />
                    {lead.value > 0 && <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{formatValue(lead.value)}</span>}
                  </div>
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: C.vMuted, padding: 4, lineHeight: 1 }}>×</button>
              </div>

              {/* Meta row */}
              <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                {lead.agency && <span style={{ fontSize: 12, color: C.muted }}>🏢 {lead.agency}</span>}
                {lead.location && <span style={{ fontSize: 12, color: C.muted }}>📍 {lead.location}</span>}
                {lead.naics && <span style={{ fontSize: 12, color: C.muted }}>NAICS {lead.naics}</span>}
              </div>
            </div>

            {/* Toast */}
            {toast && (
              <div style={{ margin: '8px 16px', padding: '8px 14px', borderRadius: 8, fontSize: 13, background: toast.ok ? '#F0FDF4' : '#FEF2F2', color: toast.ok ? C.green : C.red, border: `1px solid ${toast.ok ? '#BBF7D0' : '#FECACA'}` }}>
                {toast.msg}
              </div>
            )}

            {/* Contact banner */}
            {lead.has_decision_maker || lead.decision_maker_email ? (
              <div style={{ margin: '12px 16px 0', padding: '10px 14px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>✓</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>{lead.decision_maker_name || 'Contact found'}</div>
                  <div style={{ fontSize: 12, color: '#15803D', display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 2 }}>
                    {lead.decision_maker_email && <a href={`mailto:${lead.decision_maker_email}`} style={{ color: '#15803D' }}>{lead.decision_maker_email}</a>}
                    {lead.decision_maker_phone && <span>{lead.decision_maker_phone}</span>}
                  </div>
                </div>
                <a
                  href={`mailto:${lead.decision_maker_email}?subject=Maravilla Cleaners — Facilities Services&body=Hello ${(lead.decision_maker_name || '').split(' ')[0]},%0A%0A`}
                  style={{ padding: '5px 12px', borderRadius: 6, background: '#15803D', color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  Email ↗
                </a>
              </div>
            ) : lead.enrichment_needed ? (
              <div style={{ margin: '12px 16px 0', padding: '10px 14px', background: '#FFFBEB', borderRadius: 8, border: '1px solid #FDE68A', fontSize: 13, color: '#92400E' }}>
                ⟳ No contact yet — use <strong>Find Contact</strong> to research
              </div>
            ) : null}

            {/* Action buttons */}
            <div style={{ padding: '14px 16px 0' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.vMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Actions</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {lead.enrichment_needed && (
                  <button
                    onClick={() => setShowInvestigation(true)}
                    title="Research company and decision makers from 5 sources"
                    style={{
                      padding: '6px 12px', borderRadius: 7, border: '1px solid #4F46E522',
                      background: '#F3F3FF',
                      color: '#4F46E5',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      transition: 'all 150ms',
                    }}
                  >
                    🔍 Investigate
                  </button>
                )}
                {ACTION_BUTTONS.map(btn => (
                  <button
                    key={btn.id}
                    onClick={() => runAction(btn.id)}
                    disabled={!!acting}
                    title={btn.desc}
                    style={{
                      padding: '6px 12px', borderRadius: 7, border: `1px solid ${btn.color}22`,
                      background: acting === btn.id ? btn.color : btn.bg,
                      color: acting === btn.id ? '#fff' : btn.color,
                      fontSize: 12, fontWeight: 600, cursor: acting ? 'not-allowed' : 'pointer',
                      opacity: acting && acting !== btn.id ? 0.55 : 1,
                      transition: 'all 150ms',
                    }}
                  >
                    {acting === btn.id ? '…' : btn.label}
                  </button>
                ))}
              </div>

              {/* Notes input */}
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add a note (optional) — included with any action above"
                rows={2}
                style={{ width: '100%', marginTop: 8, padding: '7px 10px', borderRadius: 7, border: C.border, fontSize: 12, color: C.text, background: C.bg, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>

            {/* Signals */}
            {signals.length > 0 && (
              <div style={{ padding: '12px 16px 0' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.vMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Score Signals</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {signals.map((s: string, i: number) => (
                    <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#EEF2FF', color: '#3730A3', border: '1px solid #C7D2FE' }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div style={{ padding: '16px 16px 0' }}>
              <div style={{ display: 'flex', gap: 0, borderBottom: C.border }}>
                {(['timeline', 'tasks', 'contact'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: '7px 14px', background: 'none', border: 'none', borderBottom: activeTab === tab ? `2px solid ${C.primary}` : '2px solid transparent',
                      cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
                      color: activeTab === tab ? C.primary : C.muted, textTransform: 'capitalize', marginBottom: -1,
                    }}
                  >
                    {tab} {tab === 'tasks' && tasks.length > 0 ? `(${tasks.length})` : ''}{tab === 'timeline' && events.length > 0 ? `(${events.length})` : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div style={{ padding: '12px 16px 24px', flex: 1 }}>
              {/* Timeline */}
              {activeTab === 'timeline' && (
                events.length === 0 ? (
                  <div style={{ color: C.vMuted, fontSize: 13, paddingTop: 12 }}>No events yet — take an action above to start the timeline.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {events.map((ev, i) => (
                      <div key={ev.id} style={{ display: 'flex', gap: 12, paddingBottom: 16, position: 'relative' }}>
                        {i < events.length - 1 && (
                          <div style={{ position: 'absolute', left: 11, top: 24, bottom: 0, width: 1, background: '#E7E5E4' }} />
                        )}
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#F5F5F4', border: C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, zIndex: 1 }}>
                          {eventIcon(ev.event_type)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                          <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>{ev.description}</div>
                          <div style={{ fontSize: 11, color: C.vMuted, marginTop: 2 }}>{formatTs(ev.timestamp || '')} · {ev.actor}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* Tasks */}
              {activeTab === 'tasks' && (
                tasks.length === 0 ? (
                  <div style={{ color: C.vMuted, fontSize: 13, paddingTop: 12 }}>No open tasks — actions like Qualify or Outreach create tasks automatically.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tasks.map(task => (
                      <div key={task.id} style={{ padding: '10px 12px', background: C.bg, borderRadius: 8, border: C.border }}>
                        <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginBottom: 4 }}>{task.task}</div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: task.priority === 'High' ? '#FEF2F2' : '#F5F5F4', color: task.priority === 'High' ? C.red : C.muted, fontWeight: 600 }}>{task.priority}</span>
                          {task.due_date && <span style={{ fontSize: 11, color: C.muted }}>Due {formatDate(task.due_date)}</span>}
                          {task.owner && <span style={{ fontSize: 11, color: C.muted }}>→ {task.owner}</span>}
                        </div>
                        {task.notes && <div style={{ fontSize: 11, color: C.vMuted, marginTop: 4 }}>{task.notes}</div>}
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* Contact */}
              {activeTab === 'contact' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
                  {lead.decision_maker_name && <Row label="Name" value={lead.decision_maker_name} />}
                  {lead.decision_maker_email && <Row label="Email" value={lead.decision_maker_email} link={`mailto:${lead.decision_maker_email}`} />}
                  {lead.decision_maker_phone && <Row label="Phone" value={lead.decision_maker_phone} link={`tel:${lead.decision_maker_phone}`} />}
                  {lead.agency && <Row label="Agency" value={lead.agency} />}
                  {lead.naics && <Row label="NAICS" value={lead.naics} />}
                  {lead.location && <Row label="Location" value={lead.location} />}
                  {lead.description && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.vMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Description</div>
                      <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{lead.description}</div>
                    </div>
                  )}
                  {lead.notes && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.vMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Notes</div>
                      <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{lead.notes}</div>
                    </div>
                  )}
                  {!lead.decision_maker_email && (
                    <div style={{ padding: '12px 14px', background: '#FFFBEB', borderRadius: 8, border: '1px solid #FDE68A', fontSize: 13, color: '#92400E' }}>
                      No verified contact. Use <strong>Find Contact</strong> to research Apollo, Hunter, or LinkedIn.
                    </div>
                  )}
                </div>
              )}
            </div>
            {showInvestigation && (
              <InvestigationModal
                leadId={lead.id}
                entityName={lead.entity_name}
                domain={lead.notes && lead.notes.includes('domain:') ? lead.notes.split('domain:')[1].trim().split(' ')[0] : ''}
                onClose={() => setShowInvestigation(false)}
                onComplete={(profile) => {
                  // Refresh lead data after investigation
                  fetch(`/api/leads/${lead.id}`).then(r => r.json()).then(data => {
                    setDetail(data.lead ? data : { lead: data, events: data.events || [], tasks: data.tasks || [] })
                  }).catch(() => {})
                }}
              />
            )}
          </>
        )}
      </div>
    </>
  )
}

function Row({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 12, color: C.vMuted, minWidth: 72, fontWeight: 500 }}>{label}</span>
      {link ? (
        <a href={link} style={{ fontSize: 13, color: C.primary, textDecoration: 'none' }}>{value}</a>
      ) : (
        <span style={{ fontSize: 13, color: C.text }}>{value}</span>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const [leads, setLeads]           = useState<Lead[]>([])
  const [loading, setLoading]       = useState(true)
  const [intaking, setIntaking]     = useState(false)
  const [toast, setToast]           = useState<string | null>(null)
  const [stageFilter, setStageFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [scoreMin, setScoreMin]     = useState('')
  const [scoreMax, setScoreMax]     = useState('')
  const [hasContactFilter, setHasContactFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notifs, setNotifs] = useState<any[]>([])

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '200', sort: 'Priority_Score', dir: 'desc' })
      if (stageFilter) params.set('stage', stageFilter)
      if (sourceFilter) params.set('source', sourceFilter)
      if (scoreMin) params.set('scoreMin', scoreMin)
      if (scoreMax) params.set('scoreMax', scoreMax)
      if (hasContactFilter) params.set('hasContact', hasContactFilter)
      const res  = await fetch(`/api/leads?${params}`)
      const data = await res.json()
      setLeads(data.records || [])
    } catch {
      setLeads([])
    } finally {
      setLoading(false)
    }
  }, [stageFilter, sourceFilter, scoreMin, scoreMax, hasContactFilter])

  async function runIntake() {
    setIntaking(true)
    try {
      const res  = await fetch('/api/leads/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: ['intelligence', 'avatars', 'sam'], dry_run: false }),
      })
      const data = await res.json()
      showToast(`Intake — +${data.created_count} new, ${data.updated_count} updated. SAM: ${data.source_summary?.sam ?? 0}, Intel: ${data.source_summary?.intelligence ?? 0}, Avatars: ${data.source_summary?.avatars ?? 0}`)
      fetchLeads()
    } catch (e: any) {
      showToast(`Intake failed: ${e.message}`)
    } finally {
      setIntaking(false)
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 6000)
  }

  function handleActionDone(leadId: string, newStage: string) {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: newStage } : l))
  }

  function exportCSV() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''
    const params = new URLSearchParams()
    if (stageFilter) params.set('stage', stageFilter)
    if (sourceFilter) params.set('source', sourceFilter)
    if (token) params.set('token', token)
    const url = `/api/export/leads?${params}`
    window.location.href = url
  }

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const stages  = ['', 'New Signal', 'Contact Found', 'Outreach Ready', 'In Conversation', 'Proposal Sent', 'Won', 'Lost', 'Monitor']
  const sources = ['', ...Array.from(new Set(leads.map(l => l.source).filter(Boolean)))]

  // Stats bar
  const total       = leads.length
  const contactable = leads.filter(l => l.contactable || l.has_decision_maker).length
  const highPri     = leads.filter(l => l.priority_score >= 80).length
  const inPipeline  = leads.filter(l => ['Outreach Ready', 'In Conversation', 'Proposal Sent'].includes(l.stage)).length

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <TopBar screen="Leads" notifications={notifs} onMarkAllRead={() => setNotifs([])} onClickNotif={() => {}} onOpenCopilot={() => {}} onOpenCmdK={() => {}} />
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: '#1C1917', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, maxWidth: 480, boxShadow: '0 4px 24px rgba(0,0,0,0.2)', lineHeight: 1.5 }}>
          {toast}
        </div>
      )}

      {/* Slide-out panel */}
      {selectedId && (
        <LeadPanel
          leadId={selectedId}
          onClose={() => setSelectedId(null)}
          onActionDone={(newStage) => handleActionDone(selectedId, newStage)}
        />
      )}

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Leads</h1>
            <p style={{ color: C.muted, fontSize: 14, margin: '4px 0 0' }}>
              {loading ? 'Loading…' : `${total} leads · SAM · Intelligence · Avatars`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} style={{ height: 34, padding: '0 8px', border: C.border, borderRadius: 7, fontSize: 12, color: C.text, background: '#FFF', cursor: 'pointer' }}>
              {sources.map(s => <option key={s} value={s}>{s || 'All sources'}</option>)}
            </select>
            <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} style={{ height: 34, padding: '0 8px', border: C.border, borderRadius: 7, fontSize: 12, color: C.text, background: '#FFF', cursor: 'pointer' }}>
              {stages.map(s => <option key={s} value={s}>{s || 'All stages'}</option>)}
            </select>
            <input type="number" min="0" max="100" placeholder="Min score" value={scoreMin} onChange={e => setScoreMin(e.target.value)} style={{ height: 34, padding: '0 8px', width: 100, border: C.border, borderRadius: 7, fontSize: 12, color: C.text, background: '#FFF', cursor: 'pointer' }} />
            <input type="number" min="0" max="100" placeholder="Max score" value={scoreMax} onChange={e => setScoreMax(e.target.value)} style={{ height: 34, padding: '0 8px', width: 100, border: C.border, borderRadius: 7, fontSize: 12, color: C.text, background: '#FFF', cursor: 'pointer' }} />
            <select value={hasContactFilter} onChange={e => setHasContactFilter(e.target.value)} style={{ height: 34, padding: '0 8px', border: C.border, borderRadius: 7, fontSize: 12, color: C.text, background: '#FFF', cursor: 'pointer' }}>
              <option value="">All contacts</option>
              <option value="yes">Has contact</option>
              <option value="no">No contact</option>
            </select>
            <button onClick={fetchLeads} disabled={loading} style={{ height: 34, padding: '0 12px', border: C.border, borderRadius: 7, fontSize: 12, background: '#FFF', color: C.text, cursor: 'pointer' }}>
              Refresh
            </button>
            <button
              onClick={runIntake}
              disabled={intaking}
              style={{ height: 34, padding: '0 14px', borderRadius: 7, fontSize: 13, fontWeight: 600, border: 'none', background: intaking ? '#A5B4FC' : C.primary, color: '#fff', cursor: intaking ? 'not-allowed' : 'pointer' }}
            >
              {intaking ? '⟳ Running…' : '⬇ Run Intake'}
            </button>
            <button
              onClick={exportCSV}
              style={{ height: 34, padding: '0 12px', border: C.border, borderRadius: 7, fontSize: 12, background: '#FFF', color: C.text, cursor: 'pointer' }}
              title="Download all leads as CSV"
            >
              📥 Export CSV
            </button>
          </div>
        </div>

        {/* Stats bar */}
        {!loading && total > 0 && (
          <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Total', value: total,      color: C.muted   },
              { label: 'Contactable', value: contactable, color: C.green   },
              { label: 'High Priority', value: highPri,    color: '#D97706' },
              { label: 'In Pipeline', value: inPipeline,  color: C.primary },
            ].map(stat => (
              <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#FFF', border: C.border, borderRadius: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: stat.color }}>{stat.value}</span>
                <span style={{ fontSize: 12, color: C.muted }}>{stat.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Data provenance row */}
        {!loading && total > 0 && (() => {
          const srcCounts: Record<string, number> = {}
          leads.forEach(l => { const s = l.source || 'unknown'; srcCounts[s] = (srcCounts[s] || 0) + 1 })
          const SRC_LABELS: Record<string, { icon: string; label: string; color: string }> = {
            'sam.gov':     { icon: '🏛️', label: 'SAM.gov',     color: '#2563EB' },
            'intelligence':{ icon: '📊', label: 'Intelligence', color: '#7C3AED' },
            'highergov':   { icon: '🔍', label: 'HigherGov',   color: '#059669' },
            'avatars':     { icon: '👤', label: 'Avatars',      color: '#D97706' },
            'gmail':       { icon: '📧', label: 'Gmail',        color: '#DC2626' },
            'manual':      { icon: '✏️', label: 'Manual',      color: '#78716C' },
          }
          return (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: C.xmuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sources:</span>
              {Object.entries(srcCounts).sort((a,b) => b[1]-a[1]).map(([src, count]) => {
                const s = SRC_LABELS[src] || { icon: '📌', label: src, color: C.muted }
                return (
                  <button key={src} onClick={() => setSourceFilter(src === sourceFilter ? '' : src)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                      background: sourceFilter === src ? '#EEF2FF' : '#FFF',
                      border: `1px solid ${sourceFilter === src ? '#C7D2FE' : C.border}`,
                      borderRadius: 99, fontSize: 11, fontWeight: 500, cursor: 'pointer',
                      color: sourceFilter === src ? '#4F46E5' : C.muted,
                    }}>
                    <span>{s.icon}</span>
                    <span style={{ color: sourceFilter === src ? '#4F46E5' : s.color, fontWeight: 600 }}>{s.label}</span>
                    <span style={{ background: '#F5F5F4', color: C.muted, padding: '0 5px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{count}</span>
                  </button>
                )
              })}
            </div>
          )
        })()}

        {/* Table */}
        <div style={{ background: '#FFF', border: C.border, borderRadius: 12, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: C.vMuted }}>Loading leads…</div>
          ) : leads.length === 0 ? (
            <div style={{ padding: 64, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 6 }}>No leads yet</div>
              <div style={{ fontSize: 14, color: C.muted, marginBottom: 20 }}>Click Run Intake to pull from SAM.gov, Intelligence, and Avatar sources.</div>
              <button onClick={runIntake} disabled={intaking} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {intaking ? 'Running…' : 'Run Intake Now'}
              </button>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#FAFAFB', borderBottom: C.border }}>
                  {['Company', 'Stage', 'Score', 'Source', 'Agency / NAICS', 'Contact', 'Actions', 'Last Seen'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    isLast={i === leads.length - 1}
                    onSelect={() => setSelectedId(lead.id)}
                    onAction={async (action) => {
                      try {
                        const res = await fetch(`/api/leads/${lead.id}/action`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action }),
                        })
                        const data = await res.json()
                        if (data.ok) {
                          handleActionDone(lead.id, data.new_stage)
                          showToast(`${lead.entity_name} → ${data.new_stage}${data.task_created ? ' + task' : ''}`)
                        }
                      } catch (e: any) {
                        showToast(`Error: ${e.message}`)
                      }
                    }}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Lead Row with inline quick-actions ────────────────────────────────────────

function LeadRow({
  lead,
  isLast,
  onSelect,
  onAction,
}: {
  lead: Lead
  isLast: boolean
  onSelect: () => void
  onAction: (action: string) => void
}) {
  const [hover, setHover] = useState(false)

  // Pick the most relevant quick actions based on stage
  function quickActions(stage: string): typeof ACTION_BUTTONS[number][] {
    if (stage === 'New Signal')      return ACTION_BUTTONS.filter(b => ['qualify', 'find_contact', 'not_a_fit'].includes(b.id))
    if (stage === 'Contact Found')   return ACTION_BUTTONS.filter(b => ['start_outreach', 'monitor', 'not_a_fit'].includes(b.id))
    if (stage === 'Outreach Ready')  return ACTION_BUTTONS.filter(b => ['pipeline', 'monitor', 'not_a_fit'].includes(b.id))
    if (stage === 'In Conversation') return ACTION_BUTTONS.filter(b => ['pipeline', 'monitor'].includes(b.id))
    return ACTION_BUTTONS.filter(b => ['qualify', 'monitor'].includes(b.id))
  }

  const actions = quickActions(lead.stage)

  return (
    <tr
      style={{ borderBottom: isLast ? 'none' : '1px solid #F5F5F4', background: hover ? '#FAFAF9' : 'transparent', cursor: 'pointer' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Company */}
      <td style={{ padding: '10px 12px', maxWidth: 200 }} onClick={onSelect}>
        <div style={{ fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.entity_name || '—'}</div>
        {lead.lead_type && <div style={{ fontSize: 11, color: C.vMuted, marginTop: 1 }}>{lead.lead_type}</div>}
      </td>

      {/* Stage */}
      <td style={{ padding: '10px 12px' }} onClick={onSelect}>
        <StageBadge stage={lead.stage} />
      </td>

      {/* Score */}
      <td style={{ padding: '10px 12px' }} onClick={onSelect}>
        <ScoreBar value={lead.priority_score} />
      </td>

      {/* Source */}
      <td style={{ padding: '10px 12px' }} onClick={onSelect}>
        <span style={{ fontSize: 11, color: C.muted }}>{SOURCE_ICONS[lead.source] || ''} {lead.source || '—'}</span>
      </td>

      {/* Agency / NAICS */}
      <td style={{ padding: '10px 12px', maxWidth: 160 }} onClick={onSelect}>
        <div style={{ color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{lead.agency || lead.location || '—'}</div>
        {lead.naics && <div style={{ fontSize: 11, color: C.vMuted }}>NAICS {lead.naics}</div>}
      </td>

      {/* Contact */}
      <td style={{ padding: '10px 12px' }} onClick={onSelect}>
        {lead.has_decision_maker || lead.decision_maker_email ? (
          <span style={{ color: C.green, fontSize: 12, display: 'flex', alignItems: 'center', gap: 3 }}>
            ✓ <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100, whiteSpace: 'nowrap', display: 'inline-block' }}>{lead.decision_maker_name || 'Found'}</span>
          </span>
        ) : lead.enrichment_needed ? (
          <span style={{ color: C.amber, fontSize: 12 }}>⟳ Needed</span>
        ) : (
          <span style={{ color: C.vMuted, fontSize: 12 }}>—</span>
        )}
      </td>

      {/* Quick actions */}
      <td style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', gap: 4, opacity: hover ? 1 : 0, transition: 'opacity 120ms' }}>
          {actions.map(btn => (
            <button
              key={btn.id}
              title={btn.desc}
              onClick={e => { e.stopPropagation(); onAction(btn.id) }}
              style={{
                padding: '3px 8px', borderRadius: 5, border: 'none',
                background: btn.bg, color: btn.color,
                fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </td>

      {/* Last seen */}
      <td style={{ padding: '10px 12px', color: C.vMuted, whiteSpace: 'nowrap', fontSize: 11 }} onClick={onSelect}>
        {formatDate(lead.last_seen || lead.created_time)}
      </td>
    </tr>
  )
}
