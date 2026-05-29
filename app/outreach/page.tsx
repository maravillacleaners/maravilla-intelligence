'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

const C = {
  bg: '#FAFAF9',
  surface: '#FFFFFF',
  border: '#E7E5E4',
  borderMid: '#D6D3D1',
  text: '#1C1917',
  muted: '#78716C',
  faint: '#A8A29E',
  blue: '#2563EB',
  blueLight: '#EFF6FF',
  blueDark: '#1D4ED8',
  green: '#16A34A',
  greenLight: '#F0FDF4',
  purple: '#7C3AED',
  purpleLight: '#F5F3FF',
  amber: '#D97706',
  amberLight: '#FFFBEB',
  red: '#DC2626',
  radius: 10,
}

interface Contact {
  id: string
  name: string
  email: string
  domain: string
  type: 'sub' | 'prime'
  city: string
  state: string
  service: string
  source: string
  angle?: string
  signal?: string
}

type Purpose = 'quote_request' | 'partnership' | 'followup'

const PURPOSE_LABELS: Record<Purpose, string> = {
  quote_request: 'Request Price Quote',
  partnership: 'Partnership Inquiry',
  followup: 'Follow-up',
}

export default function OutreachPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'sub' | 'prime'>('all')

  const [purpose, setPurpose] = useState<Purpose>('quote_request')
  const [customContext, setCustomContext] = useState('')
  const [draftEmail, setDraftEmail] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [sending, setSending] = useState(false)
  const [sentCount, setSentCount] = useState(0)
  const [smartleadConnected, setSmartleadConnected] = useState(false)

  useEffect(() => {
    setSmartleadConnected(!!localStorage.getItem('integration_smartlead'))
    loadContacts()
  }, [])

  // Apply preselect from localStorage after contacts load (set by Intelligence / Awards pages)
  useEffect(() => {
    if (contacts.length === 0) return
    const preselect = localStorage.getItem('outreach_preselect')
    if (!preselect) return
    localStorage.removeItem('outreach_preselect')
    const match = contacts.find(c => c.name.toUpperCase().includes(preselect.toUpperCase()) || preselect.toUpperCase().includes(c.name.toUpperCase()))
    if (match) setSelected(new Set([match.id]))
  }, [contacts])

  async function loadContacts() {
    setLoading(true)
    try {
      const [subsRes, discovRes, intelRes] = await Promise.allSettled([
        fetch('/api/subs').then(r => r.json()),
        fetch('/api/discovery/matches').then(r => r.json()),
        fetch('/api/intelligence/companies?limit=50').then(r => r.json()).catch(() => ({ companies: [] })),
      ])

      const contactList: Contact[] = []

      if (subsRes.status === 'fulfilled' && subsRes.value.subs) {
        for (const s of subsRes.value.subs) {
          if (!s.email && !s.domain) continue
          const domain = s.domain || s.email?.split('@')[1] || ''
          contactList.push({
            id: `sub_${s.id}`,
            name: s.name || s.companyName || 'Unknown',
            email: s.email || `info@${domain}`,
            domain,
            type: 'sub',
            city: s.city || '',
            state: s.state || 'FL',
            service: s.serviceType || 'Janitorial',
            source: 'Airtable',
          })
        }
      }

      if (discovRes.status === 'fulfilled' && discovRes.value.matches) {
        for (const m of discovRes.value.matches) {
          if (!m.name || m.name === 'Unknown') continue
          const domain = m.domain || ''
          const email = m.email || (domain ? `contracts@${domain}` : '')
          if (!email) continue
          contactList.push({
            id: `prime_${m.id}`,
            name: m.name,
            email,
            domain,
            type: 'prime',
            city: m.place?.city || '',
            state: m.place?.state || 'FL',
            service: m.naics || '561720',
            source: 'USASpending',
          })
        }
      }

      const intelValue = intelRes.status === 'fulfilled' ? intelRes.value : { companies: [] }
      if (intelValue.companies) {
        for (const c of intelValue.companies) {
          const domain = c.company.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com'
          contactList.push({
            id: `intel_${c.uei || c.company}`,
            name: c.company,
            email: `contracts@${domain}`,
            domain,
            type: c.angle === 'prime_contractor' ? 'prime' : 'sub',
            city: c.city || '',
            state: c.state || '',
            service: c.naics_desc || 'Janitorial Services',
            source: 'Intelligence API',
            angle: c.angle,
            signal: c.signal,
          })
        }
      }

      setContacts(contactList)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const filtered = useMemo(() => {
    return contacts.filter(c => {
      if (typeFilter !== 'all' && c.type !== typeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!c.name.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q) && !c.city.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [contacts, typeFilter, search])

  const selectedContacts = useMemo(() => filtered.filter(c => selected.has(c.id)), [filtered, selected])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(c => c.id)))
    }
  }

  function buildClientTemplate(p: Purpose, contact: Contact | undefined): string {
    const company = contact?.name || '[company]'
    if (p === 'quote_request') {
      return `Subject: Janitorial Subcontracting Inquiry — Maravilla Cleaners

Dear ${company} team,

We noticed ${company} has active government facility contracts. Maravilla Cleaners (licensed, insured, government-experienced FL cleaning company) offers competitive subcontracting rates for janitorial scopes. Can we schedule a brief call?

${customContext ? `Additional context: ${customContext}\n\n` : ''}Best regards,
Maravilla Cleaners
(866) 986-6005 | hello@maravillacleaners.com`
    }
    if (p === 'partnership') {
      return `Subject: Cleaning Services Partnership — Maravilla Cleaners

Dear ${company} team,

Maravilla Cleaners is expanding and looking for reliable cleaning partners for overflow capacity. We have government contracts in FL and are exploring regional partnerships.

${customContext ? `Additional context: ${customContext}\n\n` : ''}We'd love to connect. Are you available for a quick call this week?

Best regards,
Maravilla Cleaners
(866) 986-6005 | hello@maravillacleaners.com`
    }
    return `Subject: Following Up — Maravilla Cleaners

Dear ${company} team,

Following up on our previous discussion about potential partnership opportunities.

${customContext ? `${customContext}\n\n` : ''}We remain very interested in working together. Please let us know your availability.

Best regards,
Maravilla Cleaners
(866) 986-6005 | hello@maravillacleaners.com`
  }

  async function handleDraftEmail() {
    setDrafting(true)
    setDraftEmail('')
    const sample = selectedContacts[0] || filtered[0]
    try {
      const res = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts: selectedContacts.length > 0 ? selectedContacts : [sample],
          purpose,
          customContext,
        }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setDraftEmail(data.email || buildClientTemplate(purpose, sample))
    } catch (e) {
      // Fallback: generate client-side template
      setDraftEmail(buildClientTemplate(purpose, sample))
    }
    setDrafting(false)
  }

  async function handleSendSelected() {
    if (selected.size === 0) return
    if (!draftEmail) { alert('Please draft an email first'); return }
    setSending(true)
    await new Promise(r => setTimeout(r, 800))
    setSentCount(selected.size)
    setSending(false)
    alert(`${selected.size} email${selected.size !== 1 ? 's' : ''} queued — connect Smartlead to send`)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
        <p style={{ color: C.muted, fontSize: 14 }}>Loading contacts…</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '16px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>Supply Outreach</h1>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
              Select companies → Draft AI email → Send via Smartlead
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {sentCount > 0 && (
              <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>
                ✓ {sentCount} sent this session
              </span>
            )}
            <button
              onClick={() => router.push('/settings')}
              style={{ fontSize: 12, color: C.blue, background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 12px', cursor: 'pointer' }}
            >
              ⚙ Settings
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Left: Contact List ── */}
        <div style={{ width: 420, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', background: C.surface }}>

          {/* Filters */}
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
            <input
              type="text"
              placeholder="Search by name, email, city…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 13, color: C.text, background: C.bg, outline: 'none', boxSizing: 'border-box', marginBottom: 10, fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'sub', 'prime'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    border: `1px solid ${typeFilter === t ? C.blue : C.border}`,
                    background: typeFilter === t ? C.blueLight : C.bg,
                    color: typeFilter === t ? C.blue : C.muted,
                  }}
                >
                  {t === 'all' ? 'All' : t === 'sub' ? 'Subcontractors' : 'Primes'}
                </button>
              ))}
            </div>
          </div>

          {/* Select-all bar */}
          <div style={{ padding: '8px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, background: '#F5F5F4' }}>
            <input
              type="checkbox"
              checked={filtered.length > 0 && selected.size === filtered.length}
              onChange={toggleAll}
              style={{ width: 15, height: 15, cursor: 'pointer' }}
            />
            <span style={{ fontSize: 12, color: C.muted }}>
              {selected.size > 0
                ? `${selected.size} of ${filtered.length} selected`
                : `${filtered.length} contacts`}
            </span>
            {selected.size > 0 && (
              <button
                onClick={() => setSelected(new Set())}
                style={{ fontSize: 11, color: C.faint, background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Contact rows */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: C.faint, fontSize: 13 }}>
                No contacts found
              </div>
            ) : filtered.map(c => {
              const isSelected = selected.has(c.id)
              return (
                <div
                  key={c.id}
                  onClick={() => toggleSelect(c.id)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 16px',
                    borderBottom: `1px solid ${C.border}`,
                    cursor: 'pointer',
                    background: isSelected ? C.blueLight : C.surface,
                    transition: 'background 100ms',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    onClick={e => e.stopPropagation()}
                    style={{ width: 15, height: 15, cursor: 'pointer', marginTop: 2, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                        {c.name}
                      </span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                        background: c.type === 'sub' ? C.purpleLight : C.amberLight,
                        color: c.type === 'sub' ? C.purple : C.amber,
                        letterSpacing: '0.05em', flexShrink: 0,
                      }}>
                        {c.type.toUpperCase()}
                      </span>
                      <span style={{
                        fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 4,
                        background: c.source === 'Airtable' ? '#F5F5F4' : c.source === 'USASpending' ? '#EFF6FF' : '#FFFBEB',
                        color: c.source === 'Airtable' ? '#78716C' : c.source === 'USASpending' ? '#2563EB' : '#D97706',
                        letterSpacing: '0.04em', flexShrink: 0,
                        border: `1px solid ${c.source === 'Airtable' ? '#E7E5E4' : c.source === 'USASpending' ? '#BFDBFE' : '#FDE68A'}`,
                      }}>
                        {c.source}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.email}
                    </div>
                    <div style={{ fontSize: 11, color: C.faint, marginTop: 1 }}>
                      {[c.city, c.state].filter(Boolean).join(', ')}{c.service ? ` · ${c.service}` : ''}
                    </div>
                    {c.signal && (
                      <div style={{ fontSize: 10, color: C.amber, marginTop: 2, fontStyle: 'italic' }}>
                        {c.signal}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Right: Email Composer ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 28, overflowY: 'auto' }}>

          {/* Purpose selector */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Email Purpose</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {(Object.entries(PURPOSE_LABELS) as [Purpose, string][]).map(([p, label]) => (
                <button
                  key={p}
                  onClick={() => setPurpose(p)}
                  style={{
                    padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    border: `1px solid ${purpose === p ? C.blue : C.border}`,
                    background: purpose === p ? C.blue : C.surface,
                    color: purpose === p ? '#FFF' : C.muted,
                    transition: 'all 150ms',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Context input */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Additional Context (optional)</p>
            <textarea
              value={customContext}
              onChange={e => setCustomContext(e.target.value)}
              placeholder="e.g. We have a 5-year federal contract in Broward County and need janitorial crews immediately. Looking for $18–22/hr rates."
              rows={3}
              style={{ width: '100%', padding: '10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, resize: 'vertical', outline: 'none', fontFamily: 'inherit', background: C.bg, boxSizing: 'border-box', lineHeight: 1.5 }}
            />
          </div>

          {/* Draft button */}
          <button
            onClick={handleDraftEmail}
            disabled={drafting}
            style={{
              padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: drafting ? C.muted : C.purple, color: '#FFF', border: 'none',
              cursor: drafting ? 'wait' : 'pointer', marginBottom: 20,
              alignSelf: 'flex-start', transition: 'background 150ms',
            }}
          >
            {drafting ? '✦ Drafting with AI…' : '✦ Draft Email with AI'}
          </button>

          {/* Draft output */}
          {draftEmail && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                AI Draft — edit before sending
              </p>
              <textarea
                value={draftEmail}
                onChange={e => setDraftEmail(e.target.value)}
                rows={14}
                style={{ width: '100%', padding: '12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, resize: 'vertical', outline: 'none', fontFamily: 'JetBrains Mono, monospace', background: C.surface, boxSizing: 'border-box', lineHeight: 1.6 }}
              />
            </div>
          )}

          {/* Send section */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radius, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>
                  Ready to send to {selected.size} contact{selected.size !== 1 ? 's' : ''}
                </p>
                <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                  {selected.size === 0
                    ? 'Select contacts on the left to enable sending'
                    : `${Math.min(selected.size, 20)} / 20 selected · draft email above then send`}
                </p>
              </div>
              {smartleadConnected ? (
                <span style={{ fontSize: 11, color: C.green, fontWeight: 600, background: C.greenLight, padding: '4px 8px', borderRadius: 5, border: `1px solid #BBF7D0` }}>
                  Smartlead connected
                </span>
              ) : (
                <span style={{ fontSize: 11, color: C.amber, fontWeight: 600, background: C.amberLight, padding: '4px 8px', borderRadius: 5 }}>
                  Smartlead not connected
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleSendSelected}
                disabled={selected.size === 0 || !draftEmail || sending}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: selected.size === 0 || !draftEmail ? '#E7E5E4' : C.green,
                  color: selected.size === 0 || !draftEmail ? C.faint : '#FFF',
                  border: 'none', cursor: selected.size === 0 || !draftEmail ? 'not-allowed' : 'pointer',
                  transition: 'all 150ms',
                }}
              >
                {sending ? 'Queuing…' : `Send All (${selected.size})`}
              </button>
              <button
                onClick={() => router.push('/settings')}
                style={{ padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: C.bg, border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer' }}
              >
                ⚙ Integrations
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
