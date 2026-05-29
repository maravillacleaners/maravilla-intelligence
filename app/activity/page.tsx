'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/crm/top-bar'

const C = {
  bg: '#FAFAF9', surface: '#FFFFFF', border: '#E7E5E4',
  text: '#1C1917', muted: '#78716C', xmuted: '#A8A29E',
  indigo: '#4F46E5', indigoBg: '#EEF2FF', indigoBorder: '#C7D2FE',
  green: '#059669', greenBg: '#ECFDF5', greenBorder: '#A7F3D0',
  amber: '#D97706', amberBg: '#FFFBEB', amberBorder: '#FDE68A',
  red: '#DC2626', redBg: '#FEF2F2', redBorder: '#FECACA',
  blue: '#2563EB', blueBg: '#EFF6FF', blueBorder: '#BFDBFE',
  cyan: '#0891B2', cyanBg: '#ECFEFF', cyanBorder: '#A5F3FC',
  purple: '#7C3AED', purpleBg: '#F5F3FF', purpleBorder: '#DDD6FE',
}

type EventCfg = { icon: string; label: string; color: string; bg: string; border: string }

const EVENT_CFG: Record<string, EventCfg> = {
  stage_change:         { icon: '🔄', label: 'Stage changed',    color: C.blue,   bg: C.blueBg,   border: C.blueBorder },
  enrichment_success:   { icon: '✅', label: 'Contact found',    color: C.green,  bg: C.greenBg,  border: C.greenBorder },
  enrichment_attempted: { icon: '🔍', label: 'Search attempted', color: C.amber,  bg: C.amberBg,  border: C.amberBorder },
  daily_run:            { icon: '⚡', label: 'Pipeline ran',     color: C.indigo, bg: C.indigoBg, border: C.indigoBorder },
  intake:               { icon: '📥', label: 'New leads in',     color: C.blue,   bg: C.blueBg,   border: C.blueBorder },
  email_signal_detected:{ icon: '📧', label: 'Email signal',     color: C.purple, bg: C.purpleBg, border: C.purpleBorder },
  outreach:             { icon: '📤', label: 'Outreach sent',    color: C.green,  bg: C.greenBg,  border: C.greenBorder },
  task_created:         { icon: '📋', label: 'Task created',     color: C.amber,  bg: C.amberBg,  border: C.amberBorder },
  won:                  { icon: '🏆', label: 'Won',              color: C.green,  bg: C.greenBg,  border: C.greenBorder },
  lost:                 { icon: '❌', label: 'Lost',             color: C.red,    bg: C.redBg,    border: C.redBorder },
  note:                 { icon: '📝', label: 'Note',             color: C.muted,  bg: '#F5F5F4',  border: C.border },
}

function cfg(type: string): EventCfg {
  return EVENT_CFG[type] || EVENT_CFG.note
}

function relTime(iso: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 0) return 'just now'
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function isToday(iso: string): boolean {
  if (!iso) return false
  const d = new Date(iso)
  const now = new Date()
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

function isThisWeek(iso: string): boolean {
  if (!iso) return false
  return Date.now() - new Date(iso).getTime() < 7 * 24 * 60 * 60 * 1000
}

// ── Event card ──────────────────────────────────────────────────────────────

function EventCard({ event, onClick }: { event: any; onClick?: () => void }) {
  const c = cfg(event.event_type)
  const hasLink = !!event.entity_key

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', gap: 12, padding: '14px 16px',
        background: C.surface, border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${c.border}`,
        borderRadius: 10, marginBottom: 6,
        cursor: hasLink ? 'pointer' : 'default',
        transition: 'box-shadow 0.12s',
      }}
      onMouseEnter={e => { if (hasLink) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Icon */}
      <div style={{
        width: 34, height: 34, borderRadius: 8,
        background: c.bg, border: `1px solid ${c.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, flexShrink: 0,
      }}>{c.icon}</div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.text, lineHeight: 1.4 }}>
              {event.description || c.label}
            </div>
            {event.entity_name && (
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                {event.entity_type ? `${event.entity_type} · ` : ''}{event.entity_name}
              </div>
            )}
          </div>
          <div style={{ flexShrink: 0, textAlign: 'right' as const }}>
            <span style={{
              background: c.bg, color: c.color, border: `1px solid ${c.border}`,
              padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
              display: 'block', marginBottom: 4,
            }}>{c.label}</span>
            <div style={{ fontSize: 10, color: C.xmuted }}>{relTime(event.timestamp)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 6, alignItems: 'center' }}>
          {event.actor && (
            <span style={{ fontSize: 10, color: C.xmuted }}>by {event.actor}</span>
          )}
          {event.source && (
            <span style={{ fontSize: 10, color: C.xmuted, background: '#F5F5F4', padding: '1px 6px', borderRadius: 4 }}>
              {event.source}
            </span>
          )}
          {event.timestamp && (
            <span style={{ fontSize: 10, color: C.xmuted, marginLeft: 'auto' }}>{fmtDate(event.timestamp)}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Stat chip ───────────────────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px', textAlign: 'center' as const }}>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{label}</div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────

const FILTERS = [
  { id: 'all',   label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'week',  label: 'This week' },
]

const TYPE_FILTERS = [
  { id: '', label: 'All types' },
  { id: 'stage_change', label: 'Stage changes' },
  { id: 'enrichment_success', label: 'Contacts found' },
  { id: 'intake', label: 'Intakes' },
  { id: 'daily_run', label: 'Pipeline runs' },
  { id: 'email_signal_detected', label: 'Email signals' },
  { id: 'outreach', label: 'Outreach' },
]

export default function ActivityPage() {
  const router = useRouter()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [timeFilter, setTimeFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('')
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [fetchedAt, setFetchedAt] = useState('')
  const [notifs, setNotifs] = useState<any[]>([])

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ limit: '150' })
      if (typeFilter) params.set('type', typeFilter)
      const res = await fetch(`/api/activity?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setEvents(data.events || [])
      setCounts(data.counts || {})
      setFetchedAt(data.fetched_at || '')
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }, [typeFilter])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // Time filter
  const filtered = events.filter(e => {
    if (timeFilter === 'today') return isToday(e.timestamp)
    if (timeFilter === 'week') return isThisWeek(e.timestamp)
    return true
  })

  // Group by date label
  const groups: { label: string; events: any[] }[] = []
  const seen = new Set<string>()
  for (const ev of filtered) {
    const d = ev.timestamp ? new Date(ev.timestamp) : null
    let label = 'Unknown date'
    if (d) {
      if (isToday(ev.timestamp)) label = 'Today'
      else {
        const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
        if (diff === 1) label = 'Yesterday'
        else if (diff < 7) label = d.toLocaleDateString('en-US', { weekday: 'long' })
        else label = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
      }
    }
    if (!seen.has(label)) {
      seen.add(label)
      groups.push({ label, events: [] })
    }
    groups[groups.length - 1].events.push(ev)
  }

  const todayCount  = events.filter(e => isToday(e.timestamp)).length
  const totalToday  = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif', color: C.text }}>
      <TopBar screen="Activity" notifications={notifs} onMarkAllRead={() => setNotifs([])} onClickNotif={() => {}} onOpenCopilot={() => {}} onOpenCmdK={() => {}} />

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>Activity Feed</h1>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>
              What happened: stage changes, contacts found, pipeline runs, email signals
              {fetchedAt && ` · Updated ${relTime(fetchedAt)}`}
            </div>
          </div>
          <button
            onClick={fetchEvents}
            style={{ padding: '8px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, fontSize: 12, cursor: 'pointer' }}
          >
            Refresh
          </button>
        </div>

        {/* Stats row */}
        {!loading && events.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 24 }}>
            <StatChip label="Today" value={todayCount} color={C.blue} />
            <StatChip label="Stage changes" value={counts['stage_change'] || 0} color={C.blue} />
            <StatChip label="Contacts found" value={counts['enrichment_success'] || 0} color={C.green} />
            <StatChip label="Intakes" value={counts['intake'] || 0} color={C.indigo} />
            <StatChip label="Pipeline runs" value={counts['daily_run'] || 0} color={C.purple} />
            <StatChip label="Total events" value={totalToday} color={C.muted} />
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 20, alignItems: 'center' }}>
          {/* Time filters */}
          <div style={{ display: 'flex', gap: 2, background: '#F5F5F4', borderRadius: 8, padding: 3 }}>
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setTimeFilter(f.id)}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: timeFilter === f.id ? 600 : 400,
                  background: timeFilter === f.id ? C.surface : 'transparent',
                  color: timeFilter === f.id ? C.text : C.muted,
                  border: 'none', cursor: 'pointer',
                  boxShadow: timeFilter === f.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >{f.label}</button>
            ))}
          </div>

          <div style={{ width: 1, height: 20, background: C.border }} />

          {/* Type filters */}
          {TYPE_FILTERS.map(f => {
            const active = typeFilter === f.id
            const count = f.id === '' ? events.length : (counts[f.id] || 0)
            return (
              <button
                key={f.id}
                onClick={() => setTypeFilter(f.id)}
                style={{
                  padding: '5px 10px', borderRadius: 99, fontSize: 11, fontWeight: active ? 600 : 400,
                  background: active ? C.indigoBg : C.surface,
                  color: active ? C.indigo : C.muted,
                  border: `1px solid ${active ? C.indigoBorder : C.border}`,
                  cursor: 'pointer',
                }}
              >
                {f.label} {count > 0 && <span style={{ opacity: 0.65 }}>({count})</span>}
              </button>
            )
          })}
        </div>

        {/* Events */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
            Loading activity…
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.red }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>No activity yet</div>
            <div style={{ fontSize: 13 }}>
              {timeFilter === 'today'
                ? 'No events recorded today. Run the pipeline to generate activity.'
                : 'No events found. Run the pipeline or qualify leads to generate activity.'}
            </div>
            <button
              onClick={() => router.push('/settings')}
              style={{ marginTop: 16, padding: '8px 16px', background: C.indigoBg, border: `1px solid ${C.indigoBorder}`, borderRadius: 8, color: C.indigo, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
            >
              → Go to Settings to run pipeline
            </button>
          </div>
        ) : (
          <div>
            {groups.map(group => (
              <div key={group.label} style={{ marginBottom: 24 }}>
                {/* Date separator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.xmuted, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{group.label}</div>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                  <div style={{ fontSize: 11, color: C.xmuted }}>{group.events.length} event{group.events.length !== 1 ? 's' : ''}</div>
                </div>
                {group.events.map((ev, i) => (
                  <EventCard
                    key={ev.id || i}
                    event={ev}
                    onClick={ev.entity_key ? () => {
                      // Try to navigate to lead if entity_key exists
                      const leadId = ev.entity_key.replace('lead:', '').replace('company:', '')
                      if (ev.entity_key) router.push(`/leads`)
                    } : undefined}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
