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

const AVATAR_ICONS: Record<string, string> = {
  contracting_officer:'🏛', small_business_officer:'🤝', facilities_manager:'🏢',
  prime_bd:'💼', property_manager:'🏠', developer:'🏗', government_buyer:'📋', commercial_operator:'🏪',
}

const SOURCE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  highergov: { bg: C.greenBg, color: C.green, border: C.greenBorder },
  'sam.gov': { bg: C.indigoBg, color: C.indigo, border: C.indigoBorder },
  intelligence: { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  manual: { bg: '#F5F5F4', color: C.muted, border: C.border },
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

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [contact, setContact] = useState<any>(null)
  const [relatedLeads, setRelatedLeads] = useState<any[]>([])
  const [relatedOpportunities, setRelatedOpportunities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [enriching, setEnriching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState('')
  const [notesChanged, setNotesChanged] = useState(false)
  const [tab, setTab] = useState<'overview'|'outreach'|'notes'|'related'>('overview')
  const [toast, setToast] = useState<{ msg: string; ok?: boolean } | null>(null)
  const [outreachStatus, setOutreachStatus] = useState('')
  const [autoEnrichedOnce, setAutoEnrichedOnce] = useState(false)

  function showToast(msg: string, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast(null), 4000) }

  const fetchContact = useCallback(async () => {
    setLoading(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const res = await fetch(`/api/contacts/${id}${token ? `?token=${token}` : ''}`)
      const data = await res.json()
      setContact(data.contact || data)
      setRelatedLeads(data.relatedLeads || [])
      setRelatedOpportunities(data.relatedOpportunities || [])
      setNotes((data.contact || data).notes || '')
      setOutreachStatus((data.contact || data).outreach_status || '')
    } catch (e: any) { showToast(e.message, false) }
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchContact()
  }, [fetchContact])

  // Auto-enrich on-page load if email is missing
  useEffect(() => {
    if (contact && !contact.email && !autoEnrichedOnce && !loading) {
      setAutoEnrichedOnce(true)
      setEnriching(true)
      fetch('/api/enrichment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: id,
          name: contact.name,
          organization: contact.organization,
          email: contact.email,
        }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showToast('Email enriched automatically via Hunter.io')
            fetchContact()
          }
        })
        .catch(e => console.error('Auto-enrichment failed:', e))
        .finally(() => setEnriching(false))
    }
  }, [contact, autoEnrichedOnce, loading, id])

  async function enrichContact() {
    setEnriching(true)
    try {
      const res = await fetch('/api/enrichment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: id,
          name: contact.name,
          organization: contact.organization,
          email: contact.email,
        }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(`Enrichment complete${data.enriched?.email ? ' — email found' : ''}`)
        await fetchContact()
      } else {
        showToast(`No email found via Hunter.io`, false)
      }
    } catch (e: any) { showToast(e.message, false) }
    setEnriching(false)
  }

  async function updateStatus(newStatus: string) {
    setSaving(true)
    try {
      await fetch(`/api/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outreach_status: newStatus }),
      })
      setOutreachStatus(newStatus)
      showToast('Status updated')
    } catch (e: any) { showToast(e.message, false) }
    setSaving(false)
  }

  async function saveNotes() {
    setSaving(true)
    try {
      await fetch(`/api/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      setNotesChanged(false)
      showToast('Notes saved')
    } catch (e: any) { showToast(e.message, false) }
    setSaving(false)
  }

  if (loading) return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: 'system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: C.muted }}>Loading…</span>
    </div>
  )

  if (!contact?.name) return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: 'system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' as const }}>
        <div style={{ color: C.red, marginBottom: 8 }}>Contact not found</div>
        <button onClick={() => router.push('/contacts')} style={{ color: C.indigo, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>← Back</button>
      </div>
    </div>
  )

  const sourceColor = SOURCE_COLORS[contact.source?.toLowerCase()] || { bg: '#F5F5F4', color: C.muted, border: C.border }
  const avatarIcon = AVATAR_ICONS[contact.decision_role?.toLowerCase().replace(/ /g, '_')] || '👤'

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif', color: C.text }}>
      <TopBar screen="Contacts" notifications={[]} onMarkAllRead={() => {}} onClickNotif={() => {}} onOpenCopilot={() => {}} onOpenCmdK={() => {}} />

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
        <button onClick={() => router.push('/contacts')} style={{ color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>← Contacts</button>
        <span style={{ color: C.border }}>·</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.name}</span>
        {(enriching || saving) && <span style={{ fontSize: 11, color: C.xmuted }}>Saving…</span>}
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

        {/* LEFT */}
        <div>
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>{contact.name}</h1>
            <div style={{ display: 'flex', gap: 14, color: C.muted, fontSize: 13, flexWrap: 'wrap' as const }}>
              {contact.title   && <span>{contact.title}</span>}
              {contact.organization && <span>@ {contact.organization}</span>}
              {contact.geographic_jurisdiction && <span>📍 {contact.geographic_jurisdiction}</span>}
              {contact.source   && <span style={{ background: sourceColor.bg, color: sourceColor.color, padding: '1px 7px', borderRadius: 6, border: `1px solid ${sourceColor.border}` }}>via {contact.source}</span>}
            </div>
          </div>

          {/* Score pills */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' as const }}>
            {[
              { label: 'Influence', value: contact.influence_score || 0, color: C.blue },
              { label: 'Relevance', value: contact.relevance_score || 0, color: C.green },
              { label: 'Match', value: contact.match_score || 0, color: contact.match_score > 50 ? C.amber : C.muted },
            ].map(p => (
              <div key={p.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', textAlign: 'center' as const }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: p.color }}>{p.value || '—'}</div>
                <div style={{ fontSize: 10, color: C.xmuted, marginTop: 2, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{p.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}`, marginBottom: 18 }}>
            {(['overview', 'outreach', 'notes', 'related'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: tab === t ? 600 : 400,
                color: tab === t ? C.text : C.muted,
                borderBottom: tab === t ? `2px solid ${C.indigo}` : '2px solid transparent',
              }}>
                {t === 'related' ? 'Related' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
              {/* Contact Info */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 12 }}>Contact Info</div>
                {contact.email && <a href={`mailto:${contact.email}`} style={{ display: 'block', color: C.indigo, fontSize: 13, textDecoration: 'none', marginBottom: 8 }}>✉ {contact.email}</a>}
                {contact.phone && <a href={`tel:${contact.phone}`} style={{ display: 'block', color: C.indigo, fontSize: 13, textDecoration: 'none', marginBottom: 8 }}>📞 {contact.phone}</a>}
                {contact.linkedin_url && <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', color: C.indigo, fontSize: 13, textDecoration: 'none', marginBottom: 8 }}>🔗 LinkedIn</a>}
                {!contact.email && !contact.phone && !contact.linkedin_url && <div style={{ color: C.muted, fontSize: 13 }}>No contact info yet</div>}
              </div>

              {/* Details */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 12 }}>Details</div>
                <KV k="Title" v={contact.title} />
                <KV k="Organization" v={contact.organization} />
                <KV k="Entity Name" v={contact.entity_name} />
                <KV k="Entity Type" v={contact.entity_type} />
                <KV k="Decision Role" v={contact.decision_role} />
                <KV k="Location" v={contact.geographic_jurisdiction} />
                <KV k="Source" v={contact.source} />
                <KV k="Status" v={contact.status} />
                <KV k="Confidence" v={contact.confidence ? `${contact.confidence}%` : undefined} />
                <KV k="Last Seen" v={contact.last_seen} />
                <KV k="Created" v={contact.created_time ? new Date(contact.created_time).toLocaleDateString() : undefined} />
              </div>

              {/* Procurement Categories */}
              {contact.procurement_categories && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 10 }}>Procurement Categories</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                    {contact.procurement_categories.split(',').map((cat: string, i: number) => (
                      <span key={i} style={{ background: C.indigoBg, color: C.indigo, border: `1px solid ${C.indigoBorder}`, padding: '4px 10px', borderRadius: 99, fontSize: 12 }}>
                        {cat.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OUTREACH */}
          {tab === 'outreach' && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 12 }}>Status</div>
                <select value={outreachStatus} onChange={e => updateStatus(e.target.value)} disabled={saving}
                  style={{ width: '100%', padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, background: C.surface, cursor: 'pointer' }}>
                  <option value="">Unstarted</option>
                  <option value="not_contacted">Not Contacted</option>
                  <option value="contacted">Contacted</option>
                  <option value="in_conversation">In Conversation</option>
                  <option value="proposal_sent">Proposal Sent</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </div>

              {contact.email && (
                <div style={{ background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 10, padding: 18 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.green, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 10 }}>Ready to Contact</div>
                  <a href={`mailto:${contact.email}`} style={{ display: 'block', textAlign: 'center' as const, background: C.indigo, color: '#fff', padding: '10px', borderRadius: 7, fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>Send Email</a>
                </div>
              )}
            </div>
          )}

          {/* NOTES */}
          {tab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 10 }}>Notes</div>
                <textarea value={notes} onChange={e => { setNotes(e.target.value); setNotesChanged(true) }} placeholder="Add notes, research, next steps…"
                  style={{ width: '100%', minHeight: 150, background: '#FAFAF9', border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, color: C.text, fontSize: 13, resize: 'vertical' as const, boxSizing: 'border-box' as const, fontFamily: 'system-ui' }} />
                {notesChanged && <button onClick={saveNotes} disabled={saving} style={{ marginTop: 8, padding: '7px 14px', background: C.indigo, border: 'none', borderRadius: 7, color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Save</button>}
              </div>
            </div>
          )}

          {/* RELATED */}
          {tab === 'related' && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
              {/* Related Leads */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 12 }}>Related Leads</div>
                {relatedLeads.length === 0 ? (
                  <div style={{ color: C.muted, fontSize: 13 }}>No related leads</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                    {relatedLeads.map((lead: any) => (
                      <div key={lead.id} onClick={() => router.push(`/leads/${lead.id}`)} style={{ padding: 10, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, cursor: 'pointer', transition: 'all 0.2s', fontSize: 13 }}>
                        <div style={{ fontWeight: 600, marginBottom: 3, color: C.text }}>{lead.entity_name}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>Stage: {lead.stage} • Value: ${lead.value?.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Related Opportunities */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 12 }}>Related Opportunities</div>
                {relatedOpportunities.length === 0 ? (
                  <div style={{ color: C.muted, fontSize: 13 }}>No related opportunities</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                    {relatedOpportunities.map((opp: any) => (
                      <div key={opp.id} onClick={() => router.push(`/opportunities`)} style={{ padding: 10, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, cursor: 'pointer', transition: 'all 0.2s', fontSize: 13 }}>
                        <div style={{ fontWeight: 600, marginBottom: 3, color: C.text }}>{opp.title}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>Deadline: {opp.deadline} • ${opp.estimated_value?.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <div style={{ position: 'sticky' as const, top: 110 }}>
          {/* Enrich Button */}
          {!contact.email && (
            <div style={{ background: C.blueBg, border: `1px solid ${C.blueBorder}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 10 }}>Missing Email</div>
              <button onClick={enrichContact} disabled={enriching}
                style={{ width: '100%', padding: '10px 12px', background: C.blue, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: enriching ? 'not-allowed' : 'pointer', opacity: enriching ? 0.6 : 1 }}>
                {enriching ? 'Enriching…' : 'Enrich Contact'}
              </button>
              <div style={{ fontSize: 11, color: C.blue, marginTop: 8 }}>Find email via Hunter.io</div>
            </div>
          )}

          {/* Contact Card */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 20, marginBottom: 12 }}>{avatarIcon}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 3 }}>{contact.name}</div>
            {contact.title && <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>{contact.title}</div>}
            {contact.organization && <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>@ {contact.organization}</div>}
            {contact.decision_role && (
              <span style={{ background: C.amberBg, color: C.amber, border: `1px solid ${C.amberBorder}`, padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                {contact.decision_role}
              </span>
            )}
          </div>

          {/* Status Card */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 10 }}>Status</div>
            <span style={{ background: contact.status === 'Active' ? C.greenBg : C.redBg, color: contact.status === 'Active' ? C.green : C.red, border: `1px solid ${contact.status === 'Active' ? C.greenBorder : C.redBorder}`, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
              {contact.status || 'Active'}
            </span>
          </div>

          {/* Source Chip */}
          {contact.source && (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 10 }}>Source</div>
              <span style={{ background: sourceColor.bg, color: sourceColor.color, border: `1px solid ${sourceColor.border}`, padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
                {contact.source}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
