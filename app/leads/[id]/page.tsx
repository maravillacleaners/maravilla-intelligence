'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import TopBar from '@/components/crm/top-bar'

const C = {
  bg: '#FAFAF9', surface: '#FFFFFF', border: '#E7E5E4', borderMid: '#D6D3D1',
  text: '#1C1917', muted: '#78716C', xmuted: '#A8A29E',
  indigo: '#4F46E5', indigoBg: '#EEF2FF', indigoBorder: '#C7D2FE',
  green: '#059669', greenBg: '#ECFDF5', greenBorder: '#A7F3D0',
  amber: '#D97706', amberBg: '#FFFBEB', amberBorder: '#FDE68A',
  red: '#DC2626', redBg: '#FEF2F2', redBorder: '#FECACA',
  blue: '#2563EB', blueBg: '#EFF6FF', blueBorder: '#BFDBFE',
}

const STAGE_CFG: Record<string, { bg: string; color: string; border: string }> = {
  'New Signal':      { bg: '#EEF2FF', color: '#3730A3', border: '#C7D2FE' },
  'Contact Found':   { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  'Outreach Ready':  { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  'In Conversation': { bg: '#FFF7ED', color: '#9A3412', border: '#FED7AA' },
  'Proposal Sent':   { bg: '#FAF5FF', color: '#7E22CE', border: '#E9D5FF' },
  'Won':             { bg: '#F0FDF4', color: '#166534', border: '#86EFAC' },
  'Lost':            { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
  'Monitor':         { bg: '#F5F5F4', color: '#57534E', border: '#E7E5E4' },
}

const ACTIONS = [
  { id: 'qualify',        label: 'Qualify',        icon: '✅', desc: 'Outreach-ready + task',   color: C.indigo, bg: C.indigoBg, border: C.indigoBorder },
  { id: 'find_contact',   label: 'Find Contact',   icon: '🔍', desc: 'Create research task',    color: '#0369A1', bg: '#E0F2FE', border: '#BAE6FD' },
  { id: 'start_outreach', label: 'Start Outreach', icon: '📤', desc: 'Outreach task + event',   color: C.green,  bg: C.greenBg, border: C.greenBorder },
  { id: 'pipeline',       label: 'In Pipeline',    icon: '📈', desc: 'Move to pipeline',        color: C.amber,  bg: C.amberBg, border: C.amberBorder },
  { id: 'monitor',        label: 'Monitor',        icon: '👁',  desc: 'Watch for later',         color: C.muted,  bg: '#F5F5F4', border: C.border },
  { id: 'not_a_fit',      label: 'Not a Fit',      icon: '✗',  desc: 'Remove from pipeline',   color: C.red,    bg: C.redBg,   border: C.redBorder },
]

const AVATAR_ICONS: Record<string, string> = {
  contracting_officer:'🏛', small_business_officer:'🤝', facilities_manager:'🏢',
  prime_bd:'💼', property_manager:'🏠', developer:'🏗', government_buyer:'📋', commercial_operator:'🏪',
}

function StageBadge({ stage }: { stage: string }) {
  const s = STAGE_CFG[stage] || { bg: '#F5F5F4', color: C.muted, border: C.border }
  return <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{stage}</span>
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: C.muted }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{value}</span>
      </div>
      <div style={{ height: 5, background: '#F5F5F4', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(value||0, 100)}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
    </div>
  )
}

function KV({ k, v, mono }: { k: string; v?: string | null; mono?: boolean }) {
  if (!v) return null
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 12.5, marginBottom: 6 }}>
      <span style={{ color: C.xmuted, flexShrink: 0, minWidth: 90 }}>{k}</span>
      <span style={{ color: C.text, fontFamily: mono ? 'monospace' : undefined, wordBreak: 'break-all' as const }}>{v}</span>
    </div>
  )
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const [lead,   setLead]   = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notes,  setNotes]  = useState('')
  const [notesChanged, setNotesChanged] = useState(false)
  const [tab,    setTab]    = useState<'overview'|'contacts'|'outreach'|'timeline'>('overview')
  const [toast,  setToast]  = useState<{ msg: string; ok?: boolean } | null>(null)
  const [notifs, setNotifs] = useState<any[]>([])

  function showToast(msg: string, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast(null), 4000) }

  const fetchLead = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/leads/${id}`)
      const data = await res.json()
      setLead(data)
      setNotes(data.lead?.notes || data.notes || '')
    } catch (e: any) { showToast(e.message, false) }
    setLoading(false)
  }, [id])

  useEffect(() => { fetchLead() }, [fetchLead])

  async function doAction(actionId: string) {
    setActing(true)
    try {
      const res = await fetch(`/api/leads/${id}/action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionId }),
      })
      const data = await res.json()
      if (data.ok) {
        const a = ACTIONS.find(x => x.id === actionId)
        showToast(`${a?.label || actionId} → ${data.new_stage}${data.task_created ? ' + task created' : ''}`)
        await fetchLead()
      } else showToast(data.error || 'Action failed', false)
    } catch (e: any) { showToast(e.message, false) }
    setActing(false)
  }

  async function saveNotes() {
    setSaving(true)
    try {
      await fetch(`/api/leads/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }) })
      setNotesChanged(false); showToast('Notes saved')
    } catch (e: any) { showToast(e.message, false) }
    setSaving(false)
  }

  if (loading) return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: 'system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: C.muted }}>Loading…</span>
    </div>
  )

  const l = lead?.lead || lead || {}
  if (!l?.entity_name) return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: 'system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' as const }}>
        <div style={{ color: C.red, marginBottom: 8 }}>Lead not found</div>
        <button onClick={() => router.push('/leads')} style={{ color: C.indigo, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>← Back</button>
      </div>
    </div>
  )

  const events  = lead?.events  || []
  const tasks   = lead?.tasks   || []
  const avatars = lead?.avatars || []
  const stage   = l.stage || 'New Signal'
  const valueStr = l.value > 1e9 ? `$${(l.value/1e9).toFixed(1)}B` : l.value > 1e6 ? `$${(l.value/1e6).toFixed(1)}M` : l.value > 0 ? `$${(l.value/1e3).toFixed(0)}K` : '—'
  const contactEmail = l.decision_maker_email || l.decision_maker?.email || ''
  const contactName  = l.decision_maker_name  || l.decision_maker?.name  || ''
  const signals = Array.isArray(l.score_signals) ? l.score_signals : (l.score_signals ? [l.score_signals] : [])

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif', color: C.text }}>
      <TopBar screen="Leads" notifications={notifs} onMarkAllRead={() => setNotifs([])} onClickNotif={() => {}} onOpenCopilot={() => {}} onOpenCmdK={() => {}} />

      {toast && (
        <div style={{ position: 'fixed', top: 72, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 500, maxWidth: 400,
          background: toast.ok !== false ? C.greenBg : C.redBg,
          border: `1px solid ${toast.ok !== false ? C.greenBorder : C.redBorder}`,
          color: toast.ok !== false ? C.green : C.red,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        }}>{toast.msg}</div>
      )}

      {/* Breadcrumb bar */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => router.push('/leads')} style={{ color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>← Leads</button>
        <span style={{ color: C.border }}>·</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.entity_name}</span>
        <StageBadge stage={stage} />
        {l.contactable && <span style={{ background: C.greenBg, color: C.green, border: `1px solid ${C.greenBorder}`, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>✓ Contact</span>}
        {(acting || saving) && <span style={{ fontSize: 11, color: C.xmuted }}>Saving…</span>}
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

        {/* LEFT */}
        <div>
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>{l.entity_name}</h1>
            <div style={{ display: 'flex', gap: 14, color: C.muted, fontSize: 13, flexWrap: 'wrap' as const }}>
              {l.agency   && <span>🏛 {l.agency}</span>}
              {l.location && <span>📍 {l.location}</span>}
              {l.naics    && <span>NAICS {l.naics}</span>}
              {l.source   && <span style={{ background: '#F5F5F4', padding: '1px 7px', borderRadius: 6 }}>via {l.source}</span>}
            </div>
          </div>

          {/* Score pills */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' as const }}>
            {[
              { label: 'Priority',    value: l.priority_score, color: l.priority_score >= 70 ? C.green : l.priority_score >= 50 ? C.amber : C.muted },
              { label: 'GovCon',      value: l.govcon_fit,     color: C.blue },
              { label: 'Commercial',  value: l.commercial_fit, color: C.green },
              { label: 'Value',       value: valueStr,         color: C.text },
            ].map(p => (
              <div key={p.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', textAlign: 'center' as const }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: p.color }}>{p.value ?? '—'}</div>
                <div style={{ fontSize: 10, color: C.xmuted, marginTop: 2, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{p.label}</div>
              </div>
            ))}
          </div>

          {l.next_action && (
            <div style={{ background: C.amberBg, border: `1px solid ${C.amberBorder}`, borderLeft: `3px solid ${C.amber}`, borderRadius: 8, padding: 14, marginBottom: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.amber, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 4 }}>Next Action</div>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{l.next_action}</div>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}`, marginBottom: 18 }}>
            {(['overview', 'contacts', 'outreach', 'timeline'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: tab === t ? 600 : 400,
                color: tab === t ? C.text : C.muted,
                borderBottom: tab === t ? `2px solid ${C.indigo}` : '2px solid transparent',
              }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t === 'contacts' && avatars.length > 0 ? ` (${avatars.length})` : ''}
                {t === 'timeline' && events.length > 0 ? ` (${events.length})` : ''}
              </button>
            ))}
          </div>

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
              {signals.length > 0 && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 10 }}>Why this lead</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                    {signals.map((s: string, i: number) => (
                      <span key={i} style={{ background: C.indigoBg, color: C.indigo, border: `1px solid ${C.indigoBorder}`, padding: '4px 10px', borderRadius: 99, fontSize: 12 }}>✓ {s}</span>
                    ))}
                  </div>
                </div>
              )}
              {l.description && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 8 }}>About</div>
                  <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.7 }}>{l.description}</p>
                </div>
              )}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 12 }}>Scores</div>
                <ScoreBar label="Priority" value={l.priority_score || 0} color={C.indigo} />
                <ScoreBar label="GovCon" value={l.govcon_fit || 0} color={C.blue} />
                <ScoreBar label="Commercial" value={l.commercial_fit || 0} color={C.green} />
              </div>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 12 }}>Details</div>
                <KV k="Source" v={l.source} />
                <KV k="NAICS" v={l.naics} mono />
                <KV k="Agency" v={l.agency} />
                <KV k="Location" v={l.location} />
                <KV k="Signal date" v={l.signal_date} />
                <KV k="Value" v={valueStr !== '—' ? valueStr : undefined} />
              </div>
            </div>
          )}

          {/* CONTACTS */}
          {tab === 'contacts' && (
            <div>
              {(contactName || contactEmail) && (
                <div style={{ background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.green, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 8 }}>Primary contact</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: C.greenBorder, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{contactName || 'Unknown'}</div>
                      {contactEmail && <a href={`mailto:${contactEmail}`} style={{ color: C.indigo, fontSize: 12, textDecoration: 'none' }}>{contactEmail}</a>}
                    </div>
                  </div>
                </div>
              )}
              {avatars.length > 0 ? avatars.map((av: any) => (
                <div key={av.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{AVATAR_ICONS[av.avatar_type] || '👤'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{av.name}</div>
                      <div style={{ color: C.muted, fontSize: 12 }}>{av.title}{av.organization ? ` @ ${av.organization}` : ''}</div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' as const }}>
                        {av.email && <a href={`mailto:${av.email}`} style={{ color: C.indigo, fontSize: 12, textDecoration: 'none' }}>✉ {av.email}</a>}
                        {av.phone && <span style={{ color: C.muted, fontSize: 12 }}>📞 {av.phone}</span>}
                        {!av.email && !av.phone && <span style={{ color: C.xmuted, fontSize: 12 }}>No contact info yet</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 36, textAlign: 'center' as const }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                  <div style={{ color: C.text, fontWeight: 600, fontSize: 14, marginBottom: 4 }}>No contacts mapped yet</div>
                  <div style={{ color: C.muted, fontSize: 12 }}>Use "Find Contact" to start enrichment</div>
                </div>
              )}
            </div>
          )}

          {/* OUTREACH */}
          {tab === 'outreach' && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 12 }}>Email template</div>
                <div style={{ background: '#F5F5F4', borderRadius: 8, padding: 14, fontSize: 12, color: C.text, lineHeight: 1.8, fontFamily: 'monospace', whiteSpace: 'pre-wrap' as const }}>
{`Subject: Maravilla Cleaners — NAICS ${l.naics || '561720'} Partnership

Dear ${contactName || '[Contracting Officer]'},

I'm reaching out on behalf of Maravilla Cleaners LLC, a licensed commercial cleaning company with Florida operations under NAICS ${l.naics || '561720'}.

We're interested in subcontracting partnership with ${l.entity_name}${l.agency ? ` on ${l.agency} projects` : ''}.

• SAM.gov registered
• Bonded, insured, federal-compliant
• Florida statewide coverage

Best regards,
[Your Name]
Maravilla Cleaners | (866) 986-6005 | hello@maravillacleaners.com`}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => { navigator.clipboard.writeText(''); showToast('Copied') }} style={{ padding: '6px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, color: C.muted, fontSize: 12, cursor: 'pointer' }}>Copy</button>
                  {contactEmail && <a href={`mailto:${contactEmail}`} style={{ padding: '6px 12px', background: C.indigoBg, border: `1px solid ${C.indigoBorder}`, borderRadius: 7, color: C.indigo, fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>Open in email →</a>}
                </div>
              </div>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 10 }}>Notes</div>
                <textarea value={notes} onChange={e => { setNotes(e.target.value); setNotesChanged(true) }} placeholder="Add notes, conversation history, next steps…"
                  style={{ width: '100%', minHeight: 100, background: '#FAFAF9', border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, color: C.text, fontSize: 13, resize: 'vertical' as const, boxSizing: 'border-box' as const, fontFamily: 'system-ui' }} />
                {notesChanged && <button onClick={saveNotes} disabled={saving} style={{ marginTop: 8, padding: '7px 14px', background: C.indigo, border: 'none', borderRadius: 7, color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Save</button>}
              </div>
            </div>
          )}

          {/* TIMELINE */}
          {tab === 'timeline' && (
            <div>
              {tasks.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 10 }}>Tasks ({tasks.length})</div>
                  {tasks.map((t: any) => (
                    <div key={t.id} style={{ background: C.surface, border: `1px solid ${t.priority === 'High' ? C.amberBorder : C.border}`, borderLeft: `3px solid ${t.priority === 'High' ? C.amber : C.border}`, borderRadius: 8, padding: '10px 12px', marginBottom: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{t.task}</div>
                      <div style={{ fontSize: 11, color: C.xmuted, marginTop: 3 }}>{t.status} {t.due_date ? `· Due ${t.due_date}` : ''} {t.owner ? `· ${t.owner}` : ''}</div>
                    </div>
                  ))}
                </div>
              )}
              {events.length > 0 ? (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 10 }}>Events ({events.length})</div>
                  {events.map((ev: any, i: number) => (
                    <div key={ev.id || i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.indigoBorder, marginTop: 5, flexShrink: 0 }} />
                      <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 13, color: C.text }}>{ev.description}</div>
                        <div style={{ fontSize: 11, color: C.xmuted, marginTop: 3 }}>
                          {ev.actor && `${ev.actor} · `}
                          {ev.timestamp ? new Date(ev.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 36, textAlign: 'center' as const }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                  <div style={{ color: C.text, fontWeight: 600, fontSize: 14, marginBottom: 4 }}>No events yet</div>
                  <div style={{ color: C.muted, fontSize: 12 }}>Use action buttons to create events and tasks</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <div style={{ position: 'sticky' as const, top: 110 }}>
          {/* Actions */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 12 }}>Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
              {ACTIONS.map(a => (
                <button key={a.id} onClick={() => doAction(a.id)} disabled={acting} title={a.desc}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: a.bg, border: `1px solid ${a.border}`, borderRadius: 8, cursor: acting ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500, color: a.color, opacity: acting ? 0.6 : 1, transition: 'opacity 0.12s' }}>
                  <span>{a.icon}</span>
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stage */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 10 }}>Stage</div>
            <StageBadge stage={stage} />
            <div style={{ marginTop: 8, fontSize: 11, color: C.xmuted }}>{tasks.length} task{tasks.length !== 1 ? 's' : ''} · {events.length} event{events.length !== 1 ? 's' : ''}</div>
          </div>

          {/* Contact */}
          {contactEmail && (
            <div style={{ background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.green, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 8 }}>Contact ready</div>
              <div style={{ fontWeight: 600, fontSize: 13, color: C.text, marginBottom: 3 }}>{contactName}</div>
              <a href={`mailto:${contactEmail}`} style={{ color: C.indigo, fontSize: 12, textDecoration: 'none', display: 'block', marginBottom: 8 }}>{contactEmail}</a>
              <a href={`mailto:${contactEmail}`} style={{ display: 'block', textAlign: 'center' as const, background: C.indigo, color: '#fff', padding: '8px', borderRadius: 7, fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>Send email</a>
            </div>
          )}

          {/* Snapshot */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 10 }}>Snapshot</div>
            <KV k="Source" v={l.source} />
            <KV k="Type" v={l.lead_type} />
            <KV k="Contacts" v={`${avatars.length} mapped`} />
            <KV k="Tasks" v={`${tasks.length} open`} />
          </div>
        </div>
      </div>
    </div>
  )
}
