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
}

const AVATAR_ICONS: Record<string, string> = {
  contracting_officer: '🏛', small_business_officer: '🤝', facilities_manager: '🏢',
  prime_bd: '💼', property_manager: '🏠', developer: '🏗', government_buyer: '📋',
  commercial_operator: '🏪',
}

const SOURCE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  highergov:   { bg: C.greenBg,  color: C.green,  border: C.greenBorder },
  intelligence: { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  'sam.gov':   { bg: C.indigoBg, color: C.indigo, border: C.indigoBorder },
  manual:      { bg: '#F5F5F4',  color: C.muted,  border: C.border },
}

function SourceChip({ source }: { source: string }) {
  const s = SOURCE_COLORS[source] || SOURCE_COLORS.manual
  return <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600 }}>{source}</span>
}

function ContactCard({ contact, onClick }: { contact: any; onClick: () => void }) {
  const icon = AVATAR_ICONS[contact.avatar_type] || '👤'
  return (
    <div
      onClick={onClick}
      style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', cursor: 'pointer', transition: 'box-shadow 0.12s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#F5F5F4', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.name || 'Unknown'}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{contact.title}{contact.organization ? ` @ ${contact.organization}` : ''}</div>
            </div>
            <SourceChip source={contact.source || 'unknown'} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
            {contact.email && (
              <a href={`mailto:${contact.email}`} onClick={e => e.stopPropagation()} style={{ fontSize: 12, color: C.indigo, textDecoration: 'none' }}>✉ {contact.email}</a>
            )}
            {contact.phone && <span style={{ fontSize: 12, color: C.muted }}>📞 {contact.phone}</span>}
            {!contact.email && !contact.phone && <span style={{ fontSize: 12, color: C.xmuted }}>No contact info</span>}
          </div>
          {contact.entity_name && (
            <div style={{ marginTop: 6, fontSize: 11, color: C.xmuted, display: 'flex', gap: 6, alignItems: 'center' }}>
              <span>🏛</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.entity_name}</span>
            </div>
          )}
          {(contact.influence_score > 0 || contact.relevance_score > 0) && (
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              {contact.influence_score > 0 && <span style={{ fontSize: 11, color: C.xmuted }}>Influence: {contact.influence_score}</span>}
              {contact.relevance_score > 0 && <span style={{ fontSize: 11, color: C.xmuted }}>Relevance: {contact.relevance_score}</span>}
              {contact.decision_role && <span style={{ fontSize: 11, background: C.amberBg, color: C.amber, padding: '0 6px', borderRadius: 10 }}>{contact.decision_role}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ContactsPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [q, setQ]               = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [typeFilter, setTypeFilter]     = useState('')
  const [srcCounts, setSrcCounts]       = useState<Record<string, number>>({})
  const [typeCounts, setTypeCounts]     = useState<Record<string, number>>({})
  const [selected, setSelected]         = useState<any | null>(null)
  const [showAdd, setShowAdd]           = useState(false)
  const [newContact, setNewContact]     = useState({ name: '', email: '', title: '', organization: '', avatar_type: '', notes: '' })
  const [saving, setSaving]             = useState(false)
  const [notifs, setNotifs]             = useState<any[]>([])

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '200' })
      if (q) params.set('q', q)
      if (sourceFilter) params.set('source', sourceFilter)
      if (typeFilter) params.set('avatar_type', typeFilter)
      const res = await fetch(`/api/contacts?${params}`)
      const data = await res.json()
      setContacts(data.contacts || [])
      setSrcCounts(data.source_counts || {})
      setTypeCounts(data.type_counts || {})
    } catch { setContacts([]) }
    setLoading(false)
  }, [q, sourceFilter, typeFilter])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  async function handleAdd() {
    if (!newContact.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
      })
      if (res.ok) {
        setShowAdd(false)
        setNewContact({ name: '', email: '', title: '', organization: '', avatar_type: '', notes: '' })
        await fetchContacts()
      }
    } catch { /* noop */ }
    setSaving(false)
  }

  const withEmail = contacts.filter(c => c.email).length
  const govContacts = contacts.filter(c => c.avatar_type === 'contracting_officer' || c.avatar_type === 'government_buyer').length
  const total = contacts.length

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif', color: C.text }}>
      <TopBar screen="Contacts" notifications={notifs} onMarkAllRead={() => setNotifs([])} onClickNotif={() => {}} onOpenCopilot={() => {}} onOpenCmdK={() => {}} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px', display: 'grid', gridTemplateColumns: selected ? '1fr 360px' : '1fr', gap: 20 }}>

        <div>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>Contacts</h1>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>
                {loading ? 'Loading…' : `${total} contacts · ${withEmail} with email · ${govContacts} gov buyers`}
              </div>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              style={{ padding: '9px 16px', background: C.indigo, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              + Add Contact
            </button>
          </div>

          {/* Stats */}
          {!loading && total > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 18 }}>
              {[
                { label: 'Total', value: total, color: C.muted },
                { label: 'With email', value: withEmail, color: C.green },
                { label: 'Gov buyers', value: govContacts, color: C.blue },
              ].map(s => (
                <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Source filters */}
          {!loading && Object.keys(srcCounts).length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: C.xmuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source:</span>
              <button onClick={() => setSourceFilter('')} style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11, background: !sourceFilter ? C.indigoBg : C.surface, color: !sourceFilter ? C.indigo : C.muted, border: `1px solid ${!sourceFilter ? C.indigoBorder : C.border}`, cursor: 'pointer' }}>
                All ({total})
              </button>
              {Object.entries(srcCounts).sort((a,b) => b[1]-a[1]).map(([src, cnt]) => {
                const s = SOURCE_COLORS[src] || SOURCE_COLORS.manual
                return (
                  <button key={src} onClick={() => setSourceFilter(src === sourceFilter ? '' : src)}
                    style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11, background: sourceFilter === src ? s.bg : C.surface, color: sourceFilter === src ? s.color : C.muted, border: `1px solid ${sourceFilter === src ? s.border : C.border}`, cursor: 'pointer', fontWeight: 500 }}>
                    {src} ({cnt})
                  </button>
                )
              })}
            </div>
          )}

          {/* Search */}
          <div style={{ marginBottom: 16 }}>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search by name, organization, email…"
              style={{ width: '100%', height: 38, padding: '0 14px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, background: C.surface, boxSizing: 'border-box' }}
            />
          </div>

          {/* List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>Loading contacts…</div>
          ) : contacts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>👥</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>No contacts yet</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
                {q || sourceFilter ? 'No contacts match your search.' : 'Run HigherGov sync in Settings to import procurement officers.'}
              </div>
              {!q && !sourceFilter && (
                <button onClick={() => router.push('/settings')} style={{ padding: '9px 18px', background: C.indigoBg, border: `1px solid ${C.indigoBorder}`, borderRadius: 8, color: C.indigo, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  → Go to Settings → Government Data → Sync HigherGov
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 10 }}>
              {contacts.map(c => (
                <ContactCard key={c.id} contact={c} onClick={() => setSelected(selected?.id === c.id ? null : c)} />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ position: 'sticky', top: 80 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F5F5F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    {AVATAR_ICONS[selected.avatar_type] || '👤'}
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{selected.name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{selected.title}</div>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.xmuted, fontSize: 18, lineHeight: 1 }}>×</button>
              </div>

              <SourceChip source={selected.source || 'unknown'} />

              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selected.organization && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Organization</div>
                    <div style={{ fontSize: 13, color: C.text }}>{selected.organization}</div>
                  </div>
                )}
                {selected.email && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Email</div>
                    <a href={`mailto:${selected.email}`} style={{ fontSize: 13, color: C.indigo, textDecoration: 'none' }}>{selected.email}</a>
                  </div>
                )}
                {selected.phone && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Phone</div>
                    <a href={`tel:${selected.phone}`} style={{ fontSize: 13, color: C.indigo, textDecoration: 'none' }}>{selected.phone}</a>
                  </div>
                )}
                {selected.geographic_jurisdiction && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Jurisdiction</div>
                    <div style={{ fontSize: 13, color: C.text }}>{selected.geographic_jurisdiction}</div>
                  </div>
                )}
                {selected.entity_name && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Entity</div>
                    <div style={{ fontSize: 13, color: C.text }}>{selected.entity_name}</div>
                  </div>
                )}
                {selected.notes && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.xmuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Notes</div>
                    <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{selected.notes}</div>
                  </div>
                )}
              </div>

              {selected.email && (
                <a href={`mailto:${selected.email}`}
                  style={{ display: 'block', marginTop: 16, textAlign: 'center', background: C.indigo, color: '#fff', padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  Send email
                </a>
              )}
              {selected.linkedin_url && (
                <a href={selected.linkedin_url} target="_blank" rel="noreferrer"
                  style={{ display: 'block', marginTop: 8, textAlign: 'center', background: '#EFF6FF', color: '#0A66C2', border: '1px solid #BFDBFE', padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  View on LinkedIn
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add contact modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, width: 440, maxWidth: '90vw', boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 20 }}>Add Contact</div>
            {[
              { key: 'name', label: 'Name *', placeholder: 'Full name' },
              { key: 'email', label: 'Email', placeholder: 'email@domain.com' },
              { key: 'title', label: 'Title', placeholder: 'Contracting Officer' },
              { key: 'organization', label: 'Organization', placeholder: 'Agency or company name' },
              { key: 'notes', label: 'Notes', placeholder: 'Additional context…' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 5 }}>{f.label}</div>
                <input
                  value={(newContact as any)[f.key]}
                  onChange={e => setNewContact(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: '100%', height: 36, padding: '0 12px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 13, color: C.text, background: C.bg, boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={handleAdd} disabled={saving || !newContact.name.trim()}
                style={{ flex: 1, padding: '10px', background: C.indigo, border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Add Contact'}
              </button>
              <button onClick={() => setShowAdd(false)}
                style={{ padding: '10px 16px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
