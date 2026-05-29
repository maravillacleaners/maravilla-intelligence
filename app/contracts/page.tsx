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

interface Contract {
  company: string
  uei: string
  state: string
  city: string
  naics: string
  naics_desc: string
  total_contracts: number
  contract_count: number
  avg_contract: number
  last_award: string
  largest_award: number
  agencies: string[]
  angle: 'prime_contractor' | 'competitor' | 'subcontractor_prospect'
  signal: string
}

interface Stats {
  avg_national_contract: number
  top_states: string[]
  total_market_value: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${Math.round(n)}`
}

function angleLabel(a: string): { label: string; bg: string; color: string } {
  if (a === 'prime_contractor') return { label: 'Prime Contractor', bg: '#EDE9FE', color: '#7C3AED' }
  if (a === 'competitor') return { label: 'Competitor', bg: C.redLight, color: C.red }
  return { label: 'Sub Prospect', bg: C.greenLight, color: C.green }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ContractsPage() {
  const router = useRouter()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Contract | null>(null)
  const [search, setSearch] = useState('')
  const [angleFilter, setAngleFilter] = useState<string>('all')
  const [addingOutreach, setAddingOutreach] = useState(false)
  const [outreachResult, setOutreachResult] = useState<'idle' | 'ok' | 'exists' | 'err'>('idle')

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) { router.push('/login'); return }

    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/intelligence/companies?limit=30')
        if (!res.ok) throw new Error(`Status ${res.status}`)
        const data = await res.json()
        setContracts(data.companies || [])
        setStats(data.stats || null)
      } catch (err) {
        console.error('Companies fetch failed:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [router])

  const filtered = contracts.filter(c => {
    const matchesSearch =
      !search ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.state.toLowerCase().includes(search.toLowerCase())
    const matchesAngle = angleFilter === 'all' || c.angle === angleFilter
    return matchesSearch && matchesAngle
  })

  const handleAddOutreach = async (c: Contract) => {
    setAddingOutreach(true)
    setOutreachResult('idle')
    try {
      // Store for /outreach page preselect
      localStorage.setItem('outreach_preselect', JSON.stringify({ company: c.company, state: c.state, angle: c.angle }))
      const res = await fetch('/api/outreach/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: c.company, state: c.state, city: c.city, source: 'contracts', angle: c.angle }),
      })
      const data = await res.json()
      if (data.status === 'created') setOutreachResult('ok')
      else if (data.status === 'already_exists') setOutreachResult('exists')
      else setOutreachResult('err')
    } catch {
      setOutreachResult('err')
    } finally {
      setAddingOutreach(false)
      setTimeout(() => setOutreachResult('idle'), 3000)
    }
  }

  const outreachBtnLabel = () => {
    if (addingOutreach) return 'Adding…'
    if (outreachResult === 'ok') return 'Added to Outreach'
    if (outreachResult === 'exists') return 'Already in Outreach'
    if (outreachResult === 'err') return 'Error — retry'
    return 'Add to Outreach'
  }

  const outreachBtnColor = () => {
    if (outreachResult === 'ok') return { bg: C.greenLight, color: C.green }
    if (outreachResult === 'exists') return { bg: C.amberLight, color: C.amber }
    if (outreachResult === 'err') return { bg: C.redLight, color: C.red }
    return { bg: C.indigo, color: '#FFF' }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '20px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Federal Contracts</h1>
              {/* National scope badge */}
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                background: C.indigoLight, color: C.indigo, letterSpacing: '0.03em',
              }}>
                National Coverage · 50 States
              </span>
            </div>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
              Active Government Contracts — real cleaning companies winning federal awards
              {stats && (
                <span style={{ marginLeft: 8, color: C.indigo, fontWeight: 500 }}>
                  {fmtMoney(stats.total_market_value)} total market
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => { localStorage.removeItem('auth_token'); router.push('/login') }}
            style={{ fontSize: 13, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px' }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      {stats && (
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '14px 32px', display: 'flex', gap: 32 }}>
          {[
            { label: 'Companies Found', value: String(contracts.length) },
            { label: 'Total Market', value: fmtMoney(stats.total_market_value) },
            { label: 'Avg Contract', value: fmtMoney(stats.avg_national_contract) },
            { label: 'Top States', value: stats.top_states.slice(0, 3).join(', ') || '—' },
          ].map(s => (
            <div key={s.label}>
              <p style={{ fontSize: 11, color: C.muted, margin: 0, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 500 }}>{s.label}</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: '2px 0 0' }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>

        {/* Left: table */}
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Search company or state…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 7,
                fontSize: 13, color: C.text, background: C.surface, outline: 'none', fontFamily: 'inherit',
              }}
            />
            <select
              value={angleFilter}
              onChange={e => setAngleFilter(e.target.value)}
              style={{
                padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 7,
                fontSize: 13, color: C.text, background: C.surface, outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="all">All Types</option>
              <option value="prime_contractor">Prime Contractors</option>
              <option value="competitor">Competitors</option>
              <option value="subcontractor_prospect">Sub Prospects</option>
            </select>
          </div>

          {loading ? (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radius, padding: 40, textAlign: 'center' }}>
              <p style={{ color: C.muted }}>Loading contracts from USASpending…</p>
            </div>
          ) : (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radius, overflow: 'hidden' }}>
              {/* Table header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 80px 90px 90px 70px',
                padding: '10px 16px', borderBottom: `1px solid ${C.border}`,
                background: C.bg,
              }}>
                {['Company', 'State', 'Total', 'Avg', 'Type'].map(h => (
                  <p key={h} style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>{h}</p>
                ))}
              </div>

              {/* Rows */}
              <div style={{ maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
                {filtered.length === 0 ? (
                  <p style={{ padding: '32px 16px', textAlign: 'center', color: C.muted, fontSize: 13 }}>
                    No contracts match the current filter
                  </p>
                ) : (
                  filtered.map((c, i) => {
                    const al = angleLabel(c.angle)
                    const isSelected = selected?.company === c.company
                    return (
                      <div
                        key={i}
                        onClick={() => { setSelected(c); setOutreachResult('idle') }}
                        style={{
                          display: 'grid', gridTemplateColumns: '1fr 80px 90px 90px 70px',
                          padding: '12px 16px',
                          borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none',
                          background: isSelected ? C.indigoLight : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 120ms',
                        }}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = C.bg }}
                        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.company}</p>
                          <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>{c.contract_count} contract{c.contract_count !== 1 ? 's' : ''}</p>
                        </div>
                        <p style={{ fontSize: 13, color: C.text, margin: 0, alignSelf: 'center' }}>{c.state || '—'}</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0, alignSelf: 'center' }}>{fmtMoney(c.total_contracts)}</p>
                        <p style={{ fontSize: 13, color: C.muted, margin: 0, alignSelf: 'center' }}>{fmtMoney(c.avg_contract)}</p>
                        <div style={{ alignSelf: 'center' }}>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: al.bg, color: al.color, whiteSpace: 'nowrap' }}>
                            {al.label === 'Sub Prospect' ? 'Sub' : al.label === 'Prime Contractor' ? 'Prime' : 'Competitor'}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: detail panel */}
        <div style={{ position: 'sticky', top: 24 }}>
          {selected ? (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radius, padding: 24 }}>
              {/* Company header */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1.3 }}>{selected.company}</h2>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4, flexShrink: 0,
                    ...(() => { const al = angleLabel(selected.angle); return { background: al.bg, color: al.color } })()
                  }}>
                    {angleLabel(selected.angle).label}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: C.muted, margin: '6px 0 0' }}>
                  {selected.state}{selected.city ? ` · ${selected.city}` : ''} · NAICS {selected.naics}
                </p>
              </div>

              {/* Key metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Total Awarded', value: fmtMoney(selected.total_contracts) },
                  { label: 'Contract Count', value: String(selected.contract_count) },
                  { label: 'Avg Contract', value: fmtMoney(selected.avg_contract) },
                  { label: 'Largest Award', value: fmtMoney(selected.largest_award) },
                ].map(m => (
                  <div key={m.label} style={{ background: C.bg, borderRadius: 7, padding: '10px 12px' }}>
                    <p style={{ fontSize: 11, color: C.muted, margin: '0 0 3px', fontWeight: 500 }}>{m.label}</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Top agencies */}
              {selected.agencies.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 8px' }}>Top Agencies</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {selected.agencies.slice(0, 4).map((agency, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.indigo, flexShrink: 0 }} />
                        <p style={{ fontSize: 12, color: C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agency}</p>
                      </div>
                    ))}
                    {selected.agencies.length > 4 && (
                      <p style={{ fontSize: 11, color: C.faint, margin: '2px 0 0' }}>+{selected.agencies.length - 4} more agencies</p>
                    )}
                  </div>
                </div>
              )}

              {/* Signal */}
              <div style={{ background: C.indigoLight, borderRadius: 7, padding: '10px 12px', marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: C.indigo, margin: '0 0 4px' }}>Intelligence Signal</p>
                <p style={{ fontSize: 12, color: '#3730A3', margin: 0, lineHeight: 1.5 }}>{selected.signal}</p>
              </div>

              {/* Last award */}
              {selected.last_award && (
                <p style={{ fontSize: 12, color: C.faint, margin: '0 0 16px' }}>
                  Last award: {new Date(selected.last_award).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              )}

              {/* Add to Outreach CTA */}
              <button
                onClick={() => handleAddOutreach(selected)}
                disabled={addingOutreach}
                style={{
                  width: '100%', padding: '11px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                  border: 'none', cursor: addingOutreach ? 'wait' : 'pointer',
                  transition: 'background 200ms, color 200ms',
                  ...outreachBtnColor(),
                }}
              >
                {outreachBtnLabel()}
              </button>

              {(outreachResult === 'ok') && (
                <p style={{ fontSize: 12, color: C.green, textAlign: 'center', marginTop: 8 }}>
                  Saved to Airtable Subcontractors — navigate to /outreach to continue
                </p>
              )}
            </div>
          ) : (
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radius,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minHeight: 220, padding: 32,
            }}>
              <p style={{ fontSize: 14, color: C.muted }}>Select a contract to view details</p>
              <p style={{ fontSize: 12, color: C.faint, marginTop: 4 }}>Click any row on the left</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
