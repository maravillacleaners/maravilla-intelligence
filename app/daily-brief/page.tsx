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
}

const TYPE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'GovCon Opportunity': { bg: C.blueBg, color: C.blue, border: C.blueBorder },
  'Prime Target':       { bg: C.indigoBg, color: C.indigo, border: C.indigoBorder },
  'Procurement Contact':{ bg: C.amberBg, color: C.amber, border: C.amberBorder },
  'Commercial Prospect':{ bg: C.greenBg, color: C.green, border: C.greenBorder },
  'New Business':       { bg: C.cyanBg, color: C.cyan, border: C.cyanBorder },
}

function StatCard({ label, value, sub, tone = 'neutral' }: {
  label: string; value: number | string; sub?: string; tone?: string
}) {
  const tones: Record<string, { dot: string }> = {
    blue:    { dot: C.blue },
    green:   { dot: C.green },
    amber:   { dot: C.amber },
    purple:  { dot: C.indigo },
    red:     { dot: C.red },
    cyan:    { dot: C.cyan },
    neutral: { dot: C.xmuted },
  }
  const dot = (tones[tone] || tones.neutral).dot
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: dot }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.xmuted, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function SectionHead({ title, count, color = C.muted }: { title: string; count?: number; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <h2 style={{ margin: 0, fontSize: 11, fontWeight: 700, color, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{title}</h2>
      {count !== undefined && (
        <span style={{ background: '#F5F5F4', color: C.muted, padding: '1px 7px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{count}</span>
      )}
    </div>
  )
}

function LeadRow({ lead, onClick }: { lead: any; onClick: () => void }) {
  const tc = TYPE_COLORS[lead.lead_type] || { bg: '#F5F5F4', color: C.muted, border: C.border }
  const value = lead.value > 1e9 ? `$${(lead.value/1e9).toFixed(1)}B`
    : lead.value > 1e6 ? `$${(lead.value/1e6).toFixed(1)}M`
    : lead.value > 0   ? `$${(lead.value/1e3).toFixed(0)}K` : ''
  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', marginBottom: 6, transition: 'box-shadow 0.12s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.entity_name}</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{lead.lead_type} · {lead.location || lead.agency || lead.source}</div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        {lead.contactable && (
          <span style={{ background: C.greenBg, color: C.green, border: `1px solid ${C.greenBorder}`, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>✓ Contact</span>
        )}
        <span style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600 }}>{lead.priority_score}</span>
        {value && <span style={{ fontSize: 11, color: C.muted }}>{value}</span>}
      </div>
    </div>
  )
}

function TaskRow({ task }: { task: any }) {
  return (
    <div style={{
      padding: '10px 14px', background: C.surface,
      border: `1px solid ${task.overdue ? C.redBorder : C.border}`,
      borderLeft: `3px solid ${task.overdue ? C.red : task.priority === 'High' ? C.amber : C.border}`,
      borderRadius: 8, marginBottom: 6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: C.text, marginBottom: 3 }}>{task.task}</div>
          {task.entity_name && <div style={{ fontSize: 11, color: C.muted }}>→ {task.entity_name}</div>}
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: task.overdue ? C.red : C.muted }}>
            {task.overdue ? '⚠ Overdue' : `Due ${task.due_date}`}
          </div>
          <div style={{ fontSize: 10, color: C.xmuted, marginTop: 2 }}>{task.priority}</div>
        </div>
      </div>
    </div>
  )
}

function AvatarRow({ avatar }: { avatar: any }) {
  const ICONS: Record<string, string> = {
    contracting_officer: '🏛', small_business_officer: '🤝',
    facilities_manager: '🏢', prime_bd: '💼',
    property_manager: '🏠', government_buyer: '📋',
  }
  return (
    <div style={{ padding: '10px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 18 }}>{ICONS[avatar.avatar_type] || '👤'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{avatar.name}</div>
        <div style={{ fontSize: 11, color: C.muted }}>{avatar.title}{avatar.organization ? ` @ ${avatar.organization}` : ''}</div>
      </div>
      {avatar.email && (
        <a href={`mailto:${avatar.email}`} style={{ fontSize: 11, color: C.indigo, textDecoration: 'none', flexShrink: 0 }}>{avatar.email}</a>
      )}
    </div>
  )
}

function EventRow({ event }: { event: any }) {
  const ICONS: Record<string, string> = {
    stage_change: '🔄', enrichment_success: '✅', enrichment_attempted: '🔍',
    daily_run: '⚡', intake: '📥', outreach: '📧',
  }
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 6, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 2 }}>{ICONS[event.event_type] || '📝'}</span>
      <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px' }}>
        <div style={{ fontSize: 12, color: C.text }}>{event.description}</div>
        <div style={{ fontSize: 10, color: C.xmuted, marginTop: 3 }}>
          {event.entity_name ? `${event.entity_name} · ` : ''}
          {event.timestamp ? new Date(event.timestamp).toLocaleString() : ''}
        </div>
      </div>
    </div>
  )
}

export default function DailyBriefPage() {
  const router = useRouter()
  const [brief, setBrief] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [notifs, setNotifs] = useState<any[]>([])

  const fetchBrief = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/daily-brief')
      const data = await res.json()
      setBrief(data)
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchBrief() }, [fetchBrief])

  const runPipeline = async () => {
    setRunning(true)
    setRunResult(null)
    try {
      const res = await fetch('/api/daily-run', { method: 'POST' })
      const data = await res.json()
      setRunResult(data)
      await fetchBrief()
    } catch (e: any) {
      setRunResult({ error: e.message })
    }
    setRunning(false)
  }

  const s = brief?.stats || {}

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif', color: C.text }}>
      <TopBar screen="Daily Brief" notifications={notifs} onMarkAllRead={() => setNotifs([])} onClickNotif={() => {}} onOpenCopilot={() => {}} onOpenCmdK={() => {}} />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>Daily Brief</h1>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>
              {brief?.date || '…'}{brief?.generated_at ? ` · Refreshed ${new Date(brief.generated_at).toLocaleTimeString()}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={fetchBrief}
              style={{ padding: '8px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, fontSize: 12, cursor: 'pointer' }}
            >
              Refresh
            </button>
            <button
              onClick={runPipeline}
              disabled={running}
              style={{ padding: '8px 18px', background: running ? C.xmuted : C.indigo, border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, cursor: running ? 'not-allowed' : 'pointer', fontWeight: 600 }}
            >
              {running ? 'Running…' : '⚡ Run Pipeline'}
            </button>
          </div>
        </div>

        {/* Run result banner */}
        {runResult && (
          <div style={{ marginBottom: 20, padding: '14px 18px', background: runResult.error ? C.redBg : C.greenBg, border: `1px solid ${runResult.error ? C.redBorder : C.greenBorder}`, borderRadius: 8, fontSize: 13 }}>
            {runResult.error ? (
              <span style={{ color: C.red }}>Pipeline error: {runResult.error}</span>
            ) : (
              <span style={{ color: C.green }}>
                ⚡ Done in {(runResult.duration_ms / 1000).toFixed(1)}s — intake: +{runResult.steps?.intake?.created} | enriched: {runResult.steps?.enrichment?.enriched} | advanced: {runResult.steps?.advance?.advanced} | tasks: +{runResult.steps?.tasks?.created}
                {runResult.errors?.length > 0 && <span style={{ color: C.amber, marginLeft: 10 }}>⚠ {runResult.errors.length} errors</span>}
              </span>
            )}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: C.muted }}>Loading brief…</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 80, color: C.red }}>{error}</div>
        ) : (
          <>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 32 }}>
              <StatCard label="New leads (24h)" value={s.new_leads_24h ?? 0} tone="blue" />
              <StatCard label="Contactable" value={s.contactable_total ?? 0} tone="green" />
              <StatCard label="Need enrichment" value={s.enrichment_needed_total ?? 0} tone="amber" />
              <StatCard label="High priority" value={s.high_priority_total ?? 0} tone="purple" />
              <StatCard label="Tasks due today" value={s.tasks_due_today ?? 0} tone={s.overdue_tasks > 0 ? 'red' : 'neutral'} sub={s.overdue_tasks > 0 ? `${s.overdue_tasks} overdue` : undefined} />
              <StatCard label="New contacts (7d)" value={s.new_avatars_7d ?? 0} tone="cyan" />
            </div>

            {/* Last pipeline run */}
            {brief?.last_run && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center', fontSize: 12 }}>
                <span style={{ color: C.muted }}>Last pipeline run:</span>
                <span style={{ color: C.text }}>{brief.last_run.description}</span>
                <span style={{ color: C.xmuted, marginLeft: 'auto' }}>{new Date(brief.last_run.timestamp).toLocaleString()}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              {/* LEFT */}
              <div>
                <div style={{ marginBottom: 28 }}>
                  <SectionHead title="Contactable" count={brief?.contactable?.length} color={C.green} />
                  {brief?.contactable?.length > 0
                    ? brief.contactable.map((l: any) => <LeadRow key={l.id} lead={l} onClick={() => router.push(`/leads/${l.id}`)} />)
                    : <div style={{ color: C.muted, fontSize: 12, padding: '12px 0' }}>No contactable leads</div>}
                </div>
                <div style={{ marginBottom: 28 }}>
                  <SectionHead title="Needs Enrichment" count={brief?.enrichment_needed?.length} color={C.amber} />
                  {brief?.enrichment_needed?.length > 0
                    ? brief.enrichment_needed.map((l: any) => <LeadRow key={l.id} lead={l} onClick={() => router.push(`/leads/${l.id}`)} />)
                    : <div style={{ color: C.muted, fontSize: 12, padding: '12px 0' }}>All leads enriched</div>}
                </div>
                <div>
                  <SectionHead title="New Signals (24h)" count={brief?.new_leads?.length} color={C.blue} />
                  {brief?.new_leads?.length > 0
                    ? brief.new_leads.map((l: any) => <LeadRow key={l.id} lead={l} onClick={() => router.push(`/leads/${l.id}`)} />)
                    : <div style={{ color: C.muted, fontSize: 12, padding: '12px 0' }}>No new leads in 24h — run pipeline to ingest</div>}
                </div>
              </div>

              {/* RIGHT */}
              <div>
                <div style={{ marginBottom: 28 }}>
                  <SectionHead title="Tasks Due Today" count={brief?.tasks_due?.length} color={s.overdue_tasks > 0 ? C.red : C.muted} />
                  {brief?.tasks_due?.length > 0
                    ? brief.tasks_due.map((t: any) => <TaskRow key={t.id} task={t} />)
                    : <div style={{ color: C.muted, fontSize: 12, padding: '12px 0' }}>No tasks due today</div>}
                </div>
                <div style={{ marginBottom: 28 }}>
                  <SectionHead title="Top GovCon" count={brief?.top_govcon?.length} color={C.blue} />
                  {brief?.top_govcon?.map((l: any) => <LeadRow key={l.id} lead={l} onClick={() => router.push(`/leads/${l.id}`)} />)}
                </div>
                <div style={{ marginBottom: 28 }}>
                  <SectionHead title="Top Commercial" count={brief?.top_commercial?.length} color={C.green} />
                  {brief?.top_commercial?.map((l: any) => <LeadRow key={l.id} lead={l} onClick={() => router.push(`/leads/${l.id}`)} />)}
                </div>
                {brief?.new_avatars?.length > 0 && (
                  <div style={{ marginBottom: 28 }}>
                    <SectionHead title="New Contacts (7d)" count={brief.new_avatars.length} color={C.cyan} />
                    {brief.new_avatars.map((av: any) => <AvatarRow key={av.id} avatar={av} />)}
                  </div>
                )}
                {brief?.recent_events?.length > 0 && (
                  <div>
                    <SectionHead title="Recent Activity" color={C.muted} />
                    {brief.recent_events.map((ev: any) => <EventRow key={ev.id} event={ev} />)}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
