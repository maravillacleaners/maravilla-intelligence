'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg: '#FAFAF9',
  surface: '#FFFFFF',
  border: '#E7E5E4',
  text: '#1C1917',
  muted: '#78716C',
  faint: '#A8A29E',
  indigo: '#4F46E5',
  indigoLight: '#EEF2FF',
  green: '#16A34A',
  greenLight: '#F0FDF4',
  red: '#DC2626',
  redLight: '#FEF2F2',
  amber: '#D97706',
  amberLight: '#FFFBEB',
  radius: 10,
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Sub {
  id: string
  legal_name: string
  county: string
  sub_category: string
  score: number
  priority: 'high' | 'medium' | 'low'
  pipeline_status: string
  business_email: string
  phone: string
}

interface IntelCompany {
  company: string
  state: string
  city: string
  avg_contract: number
  total_contracts: number
  contract_count: number
  angle: string
  signal: string
  agencies: string[]
}

interface IntelStats {
  avg_national_contract: number
  top_states: string[]
  total_market_value: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${Math.round(n)}`
}

function priorityColor(p: string): { bg: string; color: string } {
  if (p === 'high') return { bg: C.redLight, color: C.red }
  if (p === 'medium') return { bg: C.amberLight, color: C.amber }
  return { bg: C.greenLight, color: C.green }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SubsPage() {
  const router = useRouter()
  const [subs, setSubs] = useState<Sub[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedSub, setSelectedSub] = useState<Sub | null>(null)
  const [toastMessage, setToastMessage] = useState('')
  const [toastColor, setToastColor] = useState(C.text)

  // Intelligence panel
  const [intelLoading, setIntelLoading] = useState(false)
  const [intelCompanies, setIntelCompanies] = useState<IntelCompany[]>([])
  const [intelStats, setIntelStats] = useState<IntelStats | null>(null)
  const [intelShown, setIntelShown] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      router.push('/login')
      return
    }

    const fetchSubs = async () => {
      try {
        setLoading(true)
        const apiKey = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY
        const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID

        const response = await fetch(
          `https://api.airtable.com/v0/${baseId}/Intelligence?filterByFormula={record_type}='sub'`,
          { headers: { Authorization: `Bearer ${apiKey}` } }
        )

        if (!response.ok) throw new Error('Failed to fetch subs')

        const data = await response.json()
        const subsData = (data.records || []).map((record: any) => ({
          id: record.id,
          legal_name: record.fields.legal_name || 'Unknown',
          county: record.fields.county || 'Unknown',
          sub_category: record.fields.sub_category || 'N/A',
          score: record.fields.score || 0,
          priority: record.fields.priority || 'low',
          pipeline_status: record.fields.pipeline_status || 'pending',
          business_email: record.fields.business_email || 'N/A',
          phone: record.fields.phone || 'N/A',
        }))
        setSubs(subsData)
      } catch (err) {
        setError('Failed to load subs')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchSubs()
  }, [router])

  const showToast = (msg: string, color = C.text) => {
    setToastMessage(msg)
    setToastColor(color)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const fetchIntelCompanies = async () => {
    if (intelShown) { setIntelShown(false); return }
    setIntelLoading(true)
    setIntelShown(true)
    try {
      const res = await fetch('/api/intelligence/companies?angle=subcontractor_prospect&limit=20')
      if (!res.ok) throw new Error('Intel fetch failed')
      const data = await res.json()
      setIntelCompanies((data.companies || []).slice(0, 20))
      setIntelStats(data.stats || null)
    } catch (err) {
      console.error(err)
      showToast('Failed to load intelligence data', C.red)
      setIntelShown(false)
    } finally {
      setIntelLoading(false)
    }
  }

  const addToSubs = async (co: IntelCompany) => {
    const key = `${co.company}__${co.state}`
    if (addedIds.has(key)) return
    setAddingId(key)
    try {
      const res = await fetch('/api/outreach/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: co.company,
          state: co.state,
          city: co.city,
          source: 'intelligence',
          angle: 'subcontractor_prospect',
        }),
      })
      const data = await res.json()
      if (data.status === 'already_exists') {
        showToast(`${co.company} already in Subs`, C.amber)
      } else if (data.status === 'created') {
        showToast(`${co.company} added to Subs`, C.green)
        setAddedIds(prev => new Set([...prev, key]))
      } else {
        showToast('Could not add — try again', C.red)
      }
    } catch {
      showToast('Network error', C.red)
    } finally {
      setAddingId(null)
    }
  }

  // ── Derive stats ─────────────────────────────────────────────────────────────
  const activeSubs = subs.filter(s => s.pipeline_status === 'active').length
  const statesCovered = intelStats?.top_states?.length || 0
  const avgContractFmt = intelStats ? fmtMoney(intelStats.avg_national_contract) : '—'

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <p style={{ color: C.muted }}>Loading subcontractors…</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '20px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Subcontractors</h1>
            <p style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>{subs.length} potential subcontractors identified</p>
          </div>
          <button
            onClick={() => { localStorage.removeItem('auth_token'); router.push('/login') }}
            style={{ fontSize: 13, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px' }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '14px 32px', display: 'flex', gap: 32 }}>
        {[
          { label: 'Total Subs', value: String(subs.length) },
          { label: 'Active Subs', value: String(activeSubs || subs.filter(s => s.score >= 60).length) },
          { label: 'States Covered', value: statesCovered > 0 ? String(statesCovered) : '50' },
          { label: 'Avg Contract (National)', value: avgContractFmt },
        ].map(stat => (
          <div key={stat.label}>
            <p style={{ fontSize: 11, color: C.muted, margin: 0, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 500 }}>{stat.label}</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: '2px 0 0' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>

        {/* Left: list + Find from Intelligence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Find from Intelligence */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radius, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: intelShown ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>Find from Intelligence</p>
                  <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>National sub-scale cleaning contractors</p>
                </div>
                <button
                  onClick={fetchIntelCompanies}
                  disabled={intelLoading}
                  style={{
                    padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                    background: intelShown ? C.bg : C.indigo, color: intelShown ? C.muted : '#FFF',
                    border: `1px solid ${intelShown ? C.border : C.indigo}`, cursor: intelLoading ? 'wait' : 'pointer',
                  }}
                >
                  {intelLoading ? 'Loading…' : intelShown ? 'Hide' : 'Find National Subcontractors'}
                </button>
              </div>
            </div>

            {intelShown && !intelLoading && (
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {intelCompanies.length === 0 ? (
                  <p style={{ padding: 16, fontSize: 13, color: C.muted, textAlign: 'center' }}>No subcontractor prospects found</p>
                ) : (
                  intelCompanies.map((co, i) => {
                    const key = `${co.company}__${co.state}`
                    const isAdding = addingId === key
                    const isAdded = addedIds.has(key)
                    return (
                      <div
                        key={i}
                        style={{
                          padding: '12px 16px',
                          borderBottom: i < intelCompanies.length - 1 ? `1px solid ${C.border}` : 'none',
                          display: 'flex', alignItems: 'center', gap: 12,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{co.company}</p>
                          <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>
                            {co.state}{co.city ? ` · ${co.city}` : ''} · {fmtMoney(co.avg_contract)} avg
                          </p>
                        </div>
                        <button
                          onClick={() => addToSubs(co)}
                          disabled={isAdding || isAdded}
                          style={{
                            padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            border: 'none', cursor: isAdded ? 'default' : isAdding ? 'wait' : 'pointer',
                            background: isAdded ? C.greenLight : C.indigoLight,
                            color: isAdded ? C.green : C.indigo,
                            flexShrink: 0,
                          }}
                        >
                          {isAdded ? 'Added' : isAdding ? '…' : '+ Add to Subs'}
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* Subs list */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radius, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>My Subcontractors</p>
              <span style={{ fontSize: 12, color: C.muted }}>{subs.length} records</span>
            </div>
            <div style={{ maxHeight: 480, overflowY: 'auto' }}>
              {subs.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: C.muted }}>No subcontractors found</p>
                  <p style={{ fontSize: 12, color: C.faint, marginTop: 4 }}>Subs appear after Flow B discovery completes</p>
                </div>
              ) : (
                subs.map(sub => {
                  const isSelected = selectedSub?.id === sub.id
                  const pc = priorityColor(sub.priority)
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSub(sub)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '14px 16px',
                        background: isSelected ? C.indigoLight : 'transparent',
                        border: 'none', borderBottom: `1px solid ${C.border}`,
                        cursor: 'pointer', display: 'block',
                      }}
                    >
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{sub.legal_name}</p>
                      <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 6px' }}>{sub.county}</p>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: '#F3E8FF', color: '#7C3AED' }}>
                          {sub.sub_category}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: pc.bg, color: pc.color }}>
                          {sub.priority}
                        </span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: detail panel */}
        <div>
          {selectedSub ? (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radius, padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>{selectedSub.legal_name}</h2>
                  <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{selectedSub.county} · {selectedSub.sub_category}</p>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                  ...priorityColor(selectedSub.priority),
                }}>
                  {selectedSub.priority.toUpperCase()} PRIORITY
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                {[
                  { label: 'Email', value: selectedSub.business_email },
                  { label: 'Phone', value: selectedSub.phone },
                  { label: 'Pipeline Status', value: selectedSub.pipeline_status },
                  { label: 'Category', value: selectedSub.sub_category },
                ].map(f => (
                  <div key={f.label}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>{f.label}</p>
                    <p style={{ fontSize: 14, color: C.text, margin: 0, fontWeight: 500 }}>{f.value}</p>
                  </div>
                ))}
              </div>

              {/* Score bar */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>Fit Score</p>
                  <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{selectedSub.score}%</span>
                </div>
                <div style={{ width: '100%', height: 6, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${selectedSub.score}%`, height: '100%', background: C.green, borderRadius: 3, transition: 'width 400ms' }} />
                </div>
              </div>

              <button
                onClick={() => {
                  if (!selectedSub) return
                  const email = selectedSub.business_email || ''
                  const name = selectedSub.legal_name || ''
                  if (email) {
                    localStorage.setItem('outreach_preselect', name)
                    window.location.href = '/outreach'
                  } else {
                    alert(`No email on file for ${name}. Add an email in Airtable first.`)
                  }
                }}
                style={{
                  width: '100%', padding: '11px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                  background: C.green, color: '#FFF', border: 'none', cursor: 'pointer',
                }}
              >
                Contact Subcontractor
              </button>
            </div>
          ) : (
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radius,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minHeight: 260, padding: 32,
            }}>
              <p style={{ fontSize: 14, color: C.muted }}>Select a subcontractor to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Toast ── */}
      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          background: toastColor, color: '#FFF',
          padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)', zIndex: 999,
        }}>
          {toastMessage}
        </div>
      )}
    </div>
  )
}
