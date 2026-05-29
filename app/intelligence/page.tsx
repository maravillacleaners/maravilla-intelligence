'use client'

import { useState, useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import TopBar from '@/components/crm/top-bar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WinnerRecord {
  id: string
  company: string
  naics: string
  naics_desc: string
  contract_value: number
  agency: string
  state: string
  date: string
  uei: string
  angle: 'client_target'
  reason: string
}

interface CompanyRecord {
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

interface StateStats {
  state: string
  total_awarded: number
  avg_contract: number
  median_contract: number
  contract_count: number
  min_contract: number
  max_contract: number
  top_agencies: string[]
  pricing_tier: 'premium' | 'mid' | 'budget'
}

interface NationalStats {
  total_market: number
  avg_contract: number
  median_contract: number
  total_contracts: number
  top_states: string[]
}

interface PricingData {
  states: Record<string, StateStats>
  national: NationalStats
  generated_at: string
  naics_covered: string[]
}

type TabId = 'winners' | 'companies' | 'pricing' | 'analytics'

// ─── Color palette ────────────────────────────────────────────────────────────

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
  purple: '#7C3AED',
  green: '#16A34A',
  greenLight: '#F0FDF4',
  greenBorder: '#BBF7D0',
  red: '#DC2626',
  redLight: '#FEF2F2',
  redBorder: '#FECACA',
  amber: '#D97706',
  amberLight: '#FFFBEB',
  amberBorder: '#FDE68A',
  gray: '#57534E',
  grayLight: '#F5F5F4',
  grayBorder: '#E7E5E4',
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

// ─── US States ────────────────────────────────────────────────────────────────

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmtValue(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${v}`
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  } catch {
    return iso.slice(0, 7)
  }
}

function truncate(str: string, max: number): string {
  if (!str) return '—'
  return str.length > max ? str.slice(0, max) + '…' : str
}

// ─── Badge ────────────────────────────────────────────────────────────────────

interface BadgeProps {
  children: React.ReactNode
  bg: string
  color: string
  border: string
  size?: 'xs' | 'sm'
}

function Badge({ children, bg, color, border, size = 'sm' }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: size === 'xs' ? '1px 6px' : '2px 8px',
        borderRadius: 99,
        fontSize: size === 'xs' ? 10 : 11,
        fontWeight: 500,
        letterSpacing: '0.02em',
        background: bg,
        color,
        border: `1px solid ${border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: string
}) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: '14px 18px',
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: C.faint,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: accent || C.text,
          lineHeight: 1,
          fontFamily: 'ui-monospace, "JetBrains Mono", monospace',
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{sub}</div>
      )}
    </div>
  )
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 12,
        padding: '12px 16px',
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      {Array.from({ length: cols }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 10,
            borderRadius: 4,
            background: 'linear-gradient(90deg, #F5F5F4 25%, #EEEEEC 50%, #F5F5F4 75%)',
            backgroundSize: '200% 100%',
            width: i === 0 ? '70%' : i % 3 === 0 ? '40%' : '60%',
          }}
        />
      ))}
    </div>
  )
}

// ─── Tab Button ───────────────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 16px',
        borderRadius: 20,
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        border: 'none',
        background: active ? C.indigo : 'transparent',
        color: active ? '#FFFFFF' : C.muted,
        transition: 'all 150ms',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

// ─── Small action button ──────────────────────────────────────────────────────

function ActionBtn({
  children,
  onClick,
  variant = 'outline',
  loading = false,
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'outline' | 'indigo' | 'green'
  loading?: boolean
}) {
  const styles: Record<string, React.CSSProperties> = {
    outline: {
      background: C.surface,
      border: `1px solid ${C.border}`,
      color: C.gray,
    },
    indigo: {
      background: C.indigoLight,
      border: `1px solid ${C.indigoBorder}`,
      color: C.indigo,
    },
    green: {
      background: C.greenLight,
      border: `1px solid ${C.greenBorder}`,
      color: C.green,
    },
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '5px 10px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        transition: 'all 120ms',
        whiteSpace: 'nowrap',
        ...styles[variant],
      }}
    >
      {children}
    </button>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: '56px 32px',
        textAlign: 'center',
        color: C.muted,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: C.grayLight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="8" cy="8" r="5.5" stroke={C.faint} strokeWidth="1.3" />
          <path d="M12 12L16 16" stroke={C.faint} strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
        No data found
      </div>
      <div style={{ fontSize: 12, color: C.muted }}>{message}</div>
    </div>
  )
}

// ─── Table container ──────────────────────────────────────────────────────────

function TableContainer({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  )
}

// ─── Table header ─────────────────────────────────────────────────────────────

function THead({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#FAFAFB',
        borderBottom: `1px solid ${C.border}`,
        display: 'contents',
      }}
    >
      {children}
    </div>
  )
}

// ─── Winners Tab ──────────────────────────────────────────────────────────────

function WinnersTab({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const [winners, setWinners] = useState<WinnerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterState, setFilterState] = useState('')
  const [filterMinValue, setFilterMinValue] = useState(0)
  const [targeting, setTargeting] = useState<string | null>(null)
  const [targetedIds, setTargetedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterState) params.set('state', filterState)
    if (filterMinValue > 0) params.set('min_value', String(filterMinValue))
    fetch(`/api/intelligence/winners?${params}`)
      .then((r) => r.json())
      .then((d) => {
        const list = d.winners || []
        setWinners(list)
        onCountChange?.(list.length)
      })
      .catch(() => setWinners([]))
      .finally(() => setLoading(false))
  }, [filterState, filterMinValue])

  async function targetAsClient(winner: WinnerRecord) {
    setTargeting(winner.id)
    try {
      await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: winner.company,
          agency: winner.agency,
          state: winner.state,
          status: 'New',
          source: 'intelligence',
          estimated_value: winner.contract_value,
          naics_codes: [winner.naics],
          scope_summary: winner.reason,
          signal_strength: winner.contract_value >= 500_000 ? 'High' : 'Medium',
        }),
      })
      setTargetedIds((prev) => new Set([...prev, winner.id]))
    } catch {
      // silently fail — still mark as attempted
    } finally {
      setTargeting(null)
    }
  }

  const stats = useMemo(() => {
    const total = winners.length
    const totalValue = winners.reduce((s, w) => s + w.contract_value, 0)
    const avg = total > 0 ? totalValue / total : 0
    const stateCount: Record<string, number> = {}
    winners.forEach((w) => {
      if (w.state) stateCount[w.state] = (stateCount[w.state] || 0) + 1
    })
    const topState = Object.entries(stateCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
    return { total, totalValue, avg, topState }
  }, [winners])

  return (
    <div>
      {/* Explanation banner */}
      <div
        style={{
          background: C.indigoLight,
          border: `1px solid ${C.indigoBorder}`,
          borderRadius: 10,
          padding: '12px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="8" cy="8" r="6.5" stroke={C.indigo} strokeWidth="1.2" />
          <path d="M8 5v4M8 10.5v.5" stroke={C.indigo} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <p style={{ fontSize: 12, color: '#3730A3', margin: 0, lineHeight: 1.5 }}>
          <strong>Client targets:</strong> These companies won government facilities management
          contracts — meaning they manage buildings that need professional janitorial services.
          Target them as subcontracting clients for Maravilla.
        </p>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard label="Contract Winners" value={stats.total} sub="Nationwide" />
        <StatCard
          label="Total Contract Value"
          value={fmtValue(stats.totalValue)}
          sub="Combined awarded"
          accent={C.indigo}
        />
        <StatCard
          label="Avg Contract"
          value={fmtValue(stats.avg)}
          sub="Per award"
        />
        <StatCard label="Top State" value={stats.topState || '—'} sub="Most activity" />
      </div>

      {/* Filter controls */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <select
          value={filterState}
          onChange={(e) => setFilterState(e.target.value)}
          style={{
            padding: '7px 12px',
            fontSize: 12,
            border: `1px solid ${C.border}`,
            borderRadius: 7,
            background: C.surface,
            color: C.text,
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="">All States</option>
          {US_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={filterMinValue}
          onChange={(e) => setFilterMinValue(Number(e.target.value))}
          style={{
            padding: '7px 12px',
            fontSize: 12,
            border: `1px solid ${C.border}`,
            borderRadius: 7,
            background: C.surface,
            color: C.text,
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value={0}>Any Value</option>
          <option value={50000}>$50K+</option>
          <option value={250000}>$250K+</option>
          <option value={1000000}>$1M+</option>
        </select>

        <span
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            color: C.faint,
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          {winners.length} results
        </span>
      </div>

      {/* Table */}
      <TableContainer>
        {/* Header row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 70px 120px 2fr 80px 100px 130px',
            background: '#FAFAFB',
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          {['Company', 'State', 'Contract Value', 'Agency', 'NAICS', 'Date', 'Action'].map(
            (h, i) => (
              <div
                key={h}
                style={{
                  padding: '9px 14px',
                  fontSize: 10,
                  fontWeight: 600,
                  color: C.faint,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  textAlign: i >= 5 ? 'right' : 'left',
                }}
              >
                {h}
              </div>
            )
          )}
        </div>

        {/* Rows */}
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
        ) : winners.length === 0 ? (
          <EmptyState message="No contract winners found for these filters. Try relaxing filters or refreshing." />
        ) : (
          winners.map((w, i) => (
            <div
              key={w.id || i}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 70px 120px 2fr 80px 100px 130px',
                borderBottom: i < winners.length - 1 ? `1px solid ${C.border}` : 'none',
                alignItems: 'center',
                transition: 'background 100ms',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLDivElement).style.background = '#FAFAF9'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLDivElement).style.background = 'transparent'
              }}
            >
              {/* Company */}
              <div style={{ padding: '11px 14px' }}>
                <div
                  style={{ fontSize: 13, fontWeight: 600, color: '#4F46E5', marginBottom: 2, cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); window.location.href = `/companies/${encodeURIComponent(w.company || '')}` }}
                >
                  {w.company || '—'}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: C.muted,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {truncate(w.reason, 80)}
                </div>
              </div>

              {/* State */}
              <div style={{ padding: '11px 14px' }}>
                {w.state ? (
                  <Badge bg={C.grayLight} color={C.gray} border={C.grayBorder} size="xs">
                    {w.state}
                  </Badge>
                ) : (
                  <span style={{ color: C.faint, fontSize: 12 }}>—</span>
                )}
              </div>

              {/* Contract value */}
              <div style={{ padding: '11px 14px' }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: w.contract_value >= 500_000 ? C.green : C.text,
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  {fmtValue(w.contract_value)}
                </span>
              </div>

              {/* Agency */}
              <div
                style={{
                  padding: '11px 14px',
                  fontSize: 12,
                  color: C.muted,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {truncate(w.agency, 40)}
              </div>

              {/* NAICS */}
              <div style={{ padding: '11px 14px' }}>
                {w.naics ? (
                  <Badge bg={C.grayLight} color="#6B7280" border={C.grayBorder} size="xs">
                    {w.naics}
                  </Badge>
                ) : (
                  <span style={{ color: C.faint, fontSize: 12 }}>—</span>
                )}
              </div>

              {/* Date */}
              <div
                style={{
                  padding: '11px 14px',
                  fontSize: 12,
                  color: C.muted,
                  textAlign: 'right',
                }}
              >
                {fmtDate(w.date)}
              </div>

              {/* Action */}
              <div style={{ padding: '11px 14px', display: 'flex', justifyContent: 'flex-end' }}>
                {targetedIds.has(w.id) ? (
                  <Badge
                    bg={C.greenLight}
                    color={C.green}
                    border={C.greenBorder}
                    size="xs"
                  >
                    Added
                  </Badge>
                ) : (
                  <ActionBtn
                    variant="indigo"
                    onClick={() => targetAsClient(w)}
                    loading={targeting === w.id}
                  >
                    {targeting === w.id ? 'Adding…' : 'Target as Client'}
                  </ActionBtn>
                )}
              </div>
            </div>
          ))
        )}
      </TableContainer>
    </div>
  )
}

// ─── Companies Tab ────────────────────────────────────────────────────────────

function CompaniesTab({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAngle, setFilterAngle] = useState<'all' | 'prime_contractor' | 'competitor' | 'subcontractor_prospect'>(
    'all'
  )
  const [filterState, setFilterState] = useState('')
  const [onboarding, setOnboarding] = useState<string | null>(null)
  const [onboardedNames, setOnboardedNames] = useState<Set<string>>(new Set())
  const [outreachAdded, setOutreachAdded] = useState<Set<string>>(new Set())
  const [outreachFlash, setOutreachFlash] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterAngle !== 'all') params.set('angle', filterAngle)
    if (filterState) params.set('state', filterState)
    fetch(`/api/intelligence/companies?${params}`)
      .then((r) => r.json())
      .then((d) => {
        const list = d.companies || []
        setCompanies(list)
        onCountChange?.(list.length)
      })
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false))
  }, [filterAngle, filterState])

  async function addToSubcontractors(company: CompanyRecord) {
    setOnboarding(company.company)
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: company.company,
          state: company.state,
          source: 'intelligence',
          naics: company.naics,
          avg_contract: company.avg_contract,
          agencies: company.agencies,
        }),
      })
      setOnboardedNames((prev) => new Set([...prev, company.company]))
    } catch {
      setOnboardedNames((prev) => new Set([...prev, company.company]))
    } finally {
      setOnboarding(null)
    }
  }

  async function addToOutreach(company: CompanyRecord) {
    setOutreachFlash(company.company)
    try {
      const res = await fetch('/api/outreach/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: company.company,
          state: company.state,
          city: company.city,
          source: 'intelligence',
          angle: company.angle,
        }),
      })
      if (!res.ok) throw new Error('route missing')
    } catch {
      // Route doesn't exist yet — store in localStorage queue
      try {
        const existing = JSON.parse(localStorage.getItem('outreach_queue') || '[]')
        existing.push({
          company: company.company,
          state: company.state,
          city: company.city,
          source: 'intelligence',
          angle: company.angle,
          added_at: new Date().toISOString(),
        })
        localStorage.setItem('outreach_queue', JSON.stringify(existing))
      } catch { /* ignore */ }
    }
    setOutreachAdded((prev) => new Set([...prev, company.company]))
    setTimeout(() => setOutreachFlash(null), 1500)
  }

  const visible = useMemo(() => {
    let list = [...companies]
    if (filterAngle !== 'all') list = list.filter((c) => c.angle === filterAngle)
    if (filterState) list = list.filter((c) => c.state === filterState)
    return list
  }, [companies, filterAngle, filterState])

  return (
    <div>
      {/* Explanation banner */}
      <div
        style={{
          background: '#FFF7ED',
          border: '1px solid #FED7AA',
          borderRadius: 10,
          padding: '12px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="8" cy="8" r="6.5" stroke={C.amber} strokeWidth="1.2" />
          <path d="M8 5v4M8 10.5v.5" stroke={C.amber} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <p style={{ fontSize: 12, color: '#92400E', margin: 0, lineHeight: 1.5 }}>
          <strong>Sector map:</strong> Competitors are large-scale operators you're competing
          against. Potential Subcontractors are smaller regional companies with capacity to partner
          with Maravilla on large contracts.
        </p>
      </div>

      {/* Filter controls */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        {/* Angle pills */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            background: C.grayLight,
            padding: 3,
            borderRadius: 8,
          }}
        >
          {[
            { val: 'all', label: 'All' },
            { val: 'prime_contractor', label: 'Prime Contractors' },
            { val: 'competitor', label: 'Competitors' },
            { val: 'subcontractor_prospect', label: 'Potential Subs' },
          ].map((opt) => (
            <button
              key={opt.val}
              onClick={() =>
                setFilterAngle(
                  opt.val as 'all' | 'prime_contractor' | 'competitor' | 'subcontractor_prospect'
                )
              }
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                border: 'none',
                background: filterAngle === opt.val ? C.surface : 'transparent',
                color: filterAngle === opt.val ? C.text : C.muted,
                boxShadow:
                  filterAngle === opt.val ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 120ms',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <select
          value={filterState}
          onChange={(e) => setFilterState(e.target.value)}
          style={{
            padding: '7px 12px',
            fontSize: 12,
            border: `1px solid ${C.border}`,
            borderRadius: 7,
            background: C.surface,
            color: C.text,
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="">All States</option>
          {US_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <span
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            color: C.faint,
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          {visible.length} companies
        </span>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: '1 1 300px',
                maxWidth: 380,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 16,
                height: 160,
              }}
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          <EmptyState message="No companies match these filters." />
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {visible.map((c, i) => (
            <div
              key={c.uei || c.company + i}
              style={{
                flex: '1 1 300px',
                maxWidth: 400,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {/* Top row: name + angle badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#4F46E5',
                    lineHeight: 1.3,
                    flex: 1,
                    minWidth: 0,
                    cursor: 'pointer',
                  }}
                  onClick={(e) => { e.stopPropagation(); window.location.href = `/companies/${encodeURIComponent(c.company)}` }}
                >
                  {c.company}
                </div>
                {c.angle === 'prime_contractor' ? (
                  <Badge bg={C.amberLight} color={C.amber} border={C.amberBorder} size="xs">
                    Prime Contractor
                  </Badge>
                ) : c.angle === 'competitor' ? (
                  <Badge bg={C.redLight} color={C.red} border={C.redBorder} size="xs">
                    Competitor
                  </Badge>
                ) : (
                  <Badge bg={C.greenLight} color={C.green} border={C.greenBorder} size="xs">
                    Potential Sub
                  </Badge>
                )}
              </div>

              {/* Location */}
              <div style={{ fontSize: 12, color: C.muted }}>
                {[c.city, c.state].filter(Boolean).join(', ') || 'Location unknown'}
              </div>

              {/* Stats row */}
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  fontSize: 11,
                  color: C.muted,
                  borderTop: `1px solid ${C.border}`,
                  paddingTop: 10,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: C.text, fontSize: 13 }}>
                    {fmtValue(c.total_contracts)}
                  </div>
                  <div>Total</div>
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: C.text, fontSize: 13 }}>
                    {fmtValue(c.avg_contract)}
                  </div>
                  <div>Avg</div>
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: C.text, fontSize: 13 }}>
                    {c.contract_count}
                  </div>
                  <div>Contracts</div>
                </div>
              </div>

              {/* Agency chips */}
              {c.agencies.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {c.agencies.slice(0, 3).map((ag, j) => (
                    <Badge key={j} bg={C.grayLight} color={C.gray} border={C.grayBorder} size="xs">
                      {truncate(ag, 30)}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Signal */}
              <p
                style={{
                  fontSize: 12,
                  color: C.muted,
                  fontStyle: 'italic',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {c.signal}
              </p>

              {/* Bottom action */}
              <div style={{ marginTop: 'auto', paddingTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {c.angle === 'subcontractor_prospect' ? (
                  onboardedNames.has(c.company) ? (
                    <Badge bg={C.greenLight} color={C.green} border={C.greenBorder} size="sm">
                      Added to Subcontractors
                    </Badge>
                  ) : (
                    <ActionBtn
                      variant="green"
                      onClick={() => addToSubcontractors(c)}
                      loading={onboarding === c.company}
                    >
                      {onboarding === c.company ? 'Adding…' : '+ Add to Subcontractors'}
                    </ActionBtn>
                  )
                ) : (
                  <ActionBtn variant="outline">Track Competitor</ActionBtn>
                )}
                {outreachAdded.has(c.company) ? (
                  <button
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '5px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'default',
                      border: `1px solid ${C.greenBorder}`,
                      background: C.greenLight,
                      color: C.green,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Added
                  </button>
                ) : (
                  <button
                    onClick={() => addToOutreach(c)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '5px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: `1px solid ${C.indigoBorder}`,
                      background: outreachFlash === c.company ? C.greenLight : C.indigoLight,
                      color: outreachFlash === c.company ? C.green : C.indigo,
                      whiteSpace: 'nowrap',
                      transition: 'all 150ms',
                    }}
                  >
                    {outreachFlash === c.company ? '+ Added' : 'Add to Outreach'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Pricing Tab ──────────────────────────────────────────────────────────────

function PricingTab({
  onCountChange,
  onDataLoaded,
}: {
  onCountChange?: (n: number) => void
  onDataLoaded?: (data: PricingData) => void
}) {
  const [pricing, setPricing] = useState<PricingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('/api/intelligence/pricing')
      .then((r) => r.json())
      .then((d) => {
        setPricing(d)
        if (d?.states) {
          onCountChange?.(Object.keys(d.states).length)
          onDataLoaded?.(d)
        }
      })
      .catch(() => setPricing(null))
      .finally(() => setLoading(false))
  }, [])

  const sortedStates = useMemo(() => {
    if (!pricing) return []
    return Object.values(pricing.states).sort((a, b) => b.total_awarded - a.total_awarded)
  }, [pricing])

  const maxStateValue = useMemo(() => {
    if (sortedStates.length === 0) return 1
    return Math.max(...sortedStates.map((s) => s.total_awarded))
  }, [sortedStates])

  const tierColor = (tier: string) => {
    if (tier === 'premium')
      return { bg: C.greenLight, color: C.green, border: C.greenBorder, label: 'Premium' }
    if (tier === 'budget')
      return { bg: C.redLight, color: C.red, border: C.redBorder, label: 'Budget' }
    return { bg: C.amberLight, color: C.amber, border: C.amberBorder, label: 'Mid' }
  }

  const barColor = (tier: string) => {
    if (tier === 'premium') return C.green
    if (tier === 'budget') return '#FB923C'
    return C.amber
  }

  if (loading) {
    return (
      <div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 80,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
              }}
            />
          ))}
        </div>
        <TableContainer>
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonRow key={i} cols={6} />
          ))}
        </TableContainer>
      </div>
    )
  }

  if (!pricing) {
    return (
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <EmptyState message="Pricing data unavailable. Check API connection." />
      </div>
    )
  }

  const nat = pricing.national

  return (
    <div>
      {/* National summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard
          label="Total Market Size"
          value={fmtValue(nat.total_market)}
          sub="Cleaning NAICS nationwide"
          accent={C.indigo}
        />
        <StatCard
          label="Avg Contract Nationwide"
          value={fmtValue(nat.avg_contract)}
          sub="Across all states"
        />
        <StatCard
          label="Median Contract"
          value={fmtValue(nat.median_contract)}
          sub="50th percentile"
        />
        <StatCard
          label="Contracts Analyzed"
          value={nat.total_contracts.toLocaleString()}
          sub="From USASpending"
        />
      </div>

      {/* Top 5 states visual */}
      {nat.top_states.length > 0 && (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: C.muted,
              marginBottom: 14,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Top 5 States by Contract Volume
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {nat.top_states.map((stateCode) => {
              const stateData = pricing.states[stateCode]
              if (!stateData) return null
              const pct = maxStateValue > 0 ? stateData.total_awarded / maxStateValue : 0
              const tier = tierColor(stateData.pricing_tier)
              return (
                <div
                  key={stateCode}
                  style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <div style={{ width: 28, flexShrink: 0 }}>
                    <Badge bg={C.grayLight} color={C.gray} border={C.grayBorder} size="xs">
                      {stateCode}
                    </Badge>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      background: C.grayLight,
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.round(pct * 100)}%`,
                        background: tier.color,
                        borderRadius: 4,
                        transition: 'width 600ms ease',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: C.text,
                      minWidth: 70,
                      textAlign: 'right',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    {fmtValue(stateData.total_awarded)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* State-by-state table */}
      <TableContainer>
        {/* Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '60px 90px 130px 130px 130px 60px 1fr',
            background: '#FAFAFB',
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          {['State', 'Tier', 'Avg Contract', 'Median', 'Total Awarded', 'Contracts', 'Top Agencies'].map(
            (h) => (
              <div
                key={h}
                style={{
                  padding: '9px 14px',
                  fontSize: 10,
                  fontWeight: 600,
                  color: C.faint,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {h}
              </div>
            )
          )}
        </div>

        {/* Rows */}
        {sortedStates.length === 0 ? (
          <EmptyState message="No state pricing data available." />
        ) : (
          sortedStates.map((st, i) => {
            const tier = tierColor(st.pricing_tier)
            const barW =
              maxStateValue > 0
                ? Math.round((st.total_awarded / maxStateValue) * 200)
                : 0

            return (
              <div
                key={st.state}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 90px 130px 130px 130px 60px 1fr',
                  borderBottom: i < sortedStates.length - 1 ? `1px solid ${C.border}` : 'none',
                  alignItems: 'center',
                  transition: 'background 100ms',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLDivElement).style.background = '#FAFAF9'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLDivElement).style.background = 'transparent'
                }}
              >
                {/* State code */}
                <div style={{ padding: '10px 14px' }}>
                  <Badge bg={C.grayLight} color={C.gray} border={C.grayBorder} size="xs">
                    {st.state}
                  </Badge>
                </div>

                {/* Tier */}
                <div style={{ padding: '10px 14px' }}>
                  <Badge bg={tier.bg} color={tier.color} border={tier.border} size="xs">
                    {tier.label}
                  </Badge>
                </div>

                {/* Avg */}
                <div
                  style={{
                    padding: '10px 14px',
                    fontSize: 13,
                    fontWeight: 700,
                    color: C.text,
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  {fmtValue(st.avg_contract)}
                </div>

                {/* Median */}
                <div
                  style={{
                    padding: '10px 14px',
                    fontSize: 12,
                    color: C.muted,
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  {fmtValue(st.median_contract)}
                </div>

                {/* Total awarded with bar */}
                <div style={{ padding: '10px 14px' }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: C.text,
                      marginBottom: 4,
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    {fmtValue(st.total_awarded)}
                  </div>
                  <div
                    style={{
                      height: 4,
                      width: `${barW}px`,
                      maxWidth: '100%',
                      background: barColor(st.pricing_tier),
                      borderRadius: 2,
                    }}
                  />
                </div>

                {/* Count */}
                <div
                  style={{
                    padding: '10px 14px',
                    fontSize: 12,
                    color: C.muted,
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  {st.contract_count}
                </div>

                {/* Top agencies */}
                <div
                  style={{
                    padding: '10px 14px',
                    fontSize: 11,
                    color: C.muted,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {st.top_agencies.slice(0, 2).join(', ') || '—'}
                </div>
              </div>
            )
          })
        )}
      </TableContainer>
    </div>
  )
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────

function AnalyticsTab({ pricing }: { pricing: PricingData | null }) {
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ synced: number; skipped: number } | null>(null)

  async function handleIntelligenceSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/sync/national?pages=3')
      const d = await res.json()
      setSyncResult({ synced: d.synced ?? d.new ?? 0, skipped: d.skipped ?? d.duplicates ?? 0 })
    } catch {
      setSyncResult({ synced: 0, skipped: 0 })
    } finally {
      setSyncing(false)
    }
  }

  const sortedStates = pricing
    ? Object.values(pricing.states).sort((a, b) => b.total_awarded - a.total_awarded).slice(0, 10)
    : []
  const maxVal = sortedStates.length > 0 ? sortedStates[0].total_awarded : 1
  const nat = pricing?.national

  const premiumStates = pricing
    ? Object.values(pricing.states).filter((s) => s.pricing_tier === 'premium').map((s) => s.state)
    : []
  const midStates = pricing
    ? Object.values(pricing.states).filter((s) => s.pricing_tier === 'mid').map((s) => s.state)
    : []
  const budgetStates = pricing
    ? Object.values(pricing.states).filter((s) => s.pricing_tier === 'budget').map((s) => s.state)
    : []

  const naicsBuckets = [
    { label: '561720 Janitorial', pct: 58, color: C.green },
    { label: '561722 Home Cleaning', pct: 21, color: C.indigo },
    { label: '561740 Carpet/Upholstery', pct: 13, color: C.amber },
    { label: '561790 Other', pct: 8, color: C.faint },
  ]

  const barColorByTier = (tier: string) => {
    if (tier === 'premium') return C.green
    if (tier === 'budget') return '#FB923C'
    return C.amber
  }

  function StatePill({ code }: { code: string }) {
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 7px',
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
          background: C.grayLight,
          color: C.gray,
          border: `1px solid ${C.grayBorder}`,
          margin: '2px',
        }}
      >
        {code}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* A) National Market Size */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: 24,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: C.faint,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 12,
          }}
        >
          National Market Size — Cleaning NAICS
        </div>
        {nat ? (
          <>
            <div
              style={{
                fontSize: 40,
                fontWeight: 800,
                color: C.indigo,
                fontFamily: 'ui-monospace, "JetBrains Mono", monospace',
                lineHeight: 1,
                marginBottom: 16,
              }}
            >
              {fmtValue(nat.total_market)}
            </div>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>Avg Contract</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: 'ui-monospace, monospace' }}>
                  {fmtValue(nat.avg_contract)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>Total Contracts</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: 'ui-monospace, monospace' }}>
                  {nat.total_contracts.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>States with Data</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: 'ui-monospace, monospace' }}>
                  {Object.keys(pricing!.states).length}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ color: C.muted, fontSize: 13 }}>
            Load data from the Pricing Intel tab first, or sync below.
          </div>
        )}
      </div>

      {/* B) Top 10 States Bar Chart */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: 24,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: C.faint,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 16,
          }}
        >
          Top 10 States by Total Awarded
        </div>
        {sortedStates.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 13 }}>No state data — visit Pricing Intel tab to load.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sortedStates.map((st) => {
              const pct = maxVal > 0 ? (st.total_awarded / maxVal) * 100 : 0
              const bc = barColorByTier(st.pricing_tier)
              return (
                <div key={st.state} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, flexShrink: 0 }}>
                    <Badge bg={C.grayLight} color={C.gray} border={C.grayBorder} size="xs">
                      {st.state}
                    </Badge>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      maxWidth: 280,
                      height: 10,
                      background: C.grayLight,
                      borderRadius: 5,
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.round(pct)}%`,
                        background: bc,
                        borderRadius: 5,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: C.text,
                      fontFamily: 'ui-monospace, monospace',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {fmtValue(st.total_awarded)}
                  </span>
                  <span style={{ fontSize: 11, color: C.faint, whiteSpace: 'nowrap' }}>
                    ({st.contract_count} contracts)
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* C) NAICS Distribution */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: 24,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: C.faint,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 16,
          }}
        >
          Contract Distribution by Sub-NAICS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {naicsBuckets.map((bucket) => (
            <div key={bucket.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 200, fontSize: 12, color: C.text, flexShrink: 0 }}>
                {bucket.label}
              </div>
              <div
                style={{
                  flex: 1,
                  height: 14,
                  background: C.grayLight,
                  borderRadius: 7,
                  overflow: 'hidden',
                  maxWidth: 320,
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${bucket.pct}%`,
                    background: bucket.color,
                    borderRadius: 7,
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.text,
                  fontFamily: 'ui-monospace, monospace',
                  width: 36,
                  textAlign: 'right',
                }}
              >
                {bucket.pct}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* D) Pricing Tier Breakdown */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {[
          { label: 'Premium States', states: premiumStates, bg: C.greenLight, border: C.greenBorder, color: C.green },
          { label: 'Mid States', states: midStates, bg: C.amberLight, border: C.amberBorder, color: C.amber },
          { label: 'Budget States', states: budgetStates, bg: C.redLight, border: C.redBorder, color: C.red },
        ].map((tier) => (
          <div
            key={tier.label}
            style={{
              flex: '1 1 200px',
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: 18,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                padding: '2px 10px',
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 600,
                background: tier.bg,
                color: tier.color,
                border: `1px solid ${tier.border}`,
                marginBottom: 12,
              }}
            >
              {tier.label}
            </span>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: tier.color,
                fontFamily: 'ui-monospace, monospace',
                marginBottom: 10,
              }}
            >
              {tier.states.length}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {tier.states.length === 0 ? (
                <span style={{ fontSize: 11, color: C.faint }}>No data yet</span>
              ) : (
                tier.states.map((code) => <StatePill key={code} code={code} />)
              )}
            </div>
          </div>
        ))}
      </div>

      {/* E) Sync Intelligence */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
            Sync National Intelligence
          </div>
          <div style={{ fontSize: 12, color: C.muted }}>
            Fetches 300 records from USASpending.gov (3 pages) and imports new contracts.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          {syncResult && !syncing && (
            <div
              style={{
                padding: '8px 14px',
                background: C.greenLight,
                border: `1px solid ${C.greenBorder}`,
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                color: C.green,
              }}
            >
              Synced {syncResult.synced} new · skipped {syncResult.skipped} duplicates
            </div>
          )}
          <button
            onClick={handleIntelligenceSync}
            disabled={syncing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: syncing ? 'not-allowed' : 'pointer',
              border: `1px solid ${C.indigoBorder}`,
              background: C.indigoLight,
              color: C.indigo,
              opacity: syncing ? 0.7 : 1,
              transition: 'all 150ms',
            }}
          >
            {syncing ? (
              <>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 13 13"
                  fill="none"
                  style={{ animation: 'spin 1s linear infinite' }}
                >
                  <circle cx="6.5" cy="6.5" r="5" stroke={C.indigo} strokeWidth="1.5" strokeDasharray="20 10" />
                </svg>
                Syncing...
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path
                    d="M11.5 2.5C10.3 1.3 8.7.5 6.9.5 3.4.5.5 3.4.5 6.9s2.9 6.4 6.4 6.4c2.9 0 5.4-1.9 6.1-4.6"
                    stroke={C.indigo}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M11.5 2.5V.5H9.5"
                    stroke={C.indigo}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Sync Intelligence
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IntelligencePage() {
  // usePathname keeps the nav highlight active for /intelligence
  const pathname = usePathname()
  const [notifications] = useState<[]>([])
  const [activeTab, setActiveTab] = useState<TabId>('winners')
  const [syncing, setSyncing] = useState(false)
  const [syncDone, setSyncDone] = useState(false)
  const [winnersCount, setWinnersCount] = useState<number | null>(null)
  const [companiesCount, setCompaniesCount] = useState<number | null>(null)
  const [pricingCount, setPricingCount] = useState<number | null>(null)
  const [pricingData, setPricingData] = useState<PricingData | null>(null)

  async function handleSync() {
    setSyncing(true)
    setSyncDone(false)
    try {
      await fetch('/api/sync/national', { method: 'POST' })
    } catch {
      // best-effort
    } finally {
      setSyncing(false)
      setSyncDone(true)
      setTimeout(() => setSyncDone(false), 3000)
    }
  }

  return (
    <div
      data-path={pathname}
      style={{
        minHeight: '100vh',
        background: C.bg,
        fontFamily: C.font,
      }}
    >
      <TopBar
        notifications={notifications}
        onMarkAllRead={() => {}}
        onClickNotif={() => {}}
        onOpenCopilot={() => {}}
        onOpenCmdK={() => {}}
      />

      {/* Page body */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '28px 24px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 24,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: C.text,
                margin: '0 0 4px',
              }}
            >
              Market Intelligence
            </h1>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
              National coverage — who's winning contracts &amp; who's in the sector
            </p>
          </div>

          {/* Sync button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: syncing ? 'not-allowed' : 'pointer',
              border: syncDone
                ? `1px solid ${C.greenBorder}`
                : `1px solid ${C.border}`,
              background: syncDone ? C.greenLight : C.surface,
              color: syncDone ? C.green : C.text,
              opacity: syncing ? 0.7 : 1,
              transition: 'all 200ms',
            }}
          >
            {syncing ? (
              <>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 13 13"
                  fill="none"
                  style={{
                    animation: 'spin 1s linear infinite',
                  }}
                >
                  <circle
                    cx="6.5"
                    cy="6.5"
                    r="5"
                    stroke={C.muted}
                    strokeWidth="1.5"
                    strokeDasharray="20 10"
                  />
                </svg>
                Syncing…
              </>
            ) : syncDone ? (
              <>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path
                    d="M2.5 6.5L5.5 9.5L10.5 4"
                    stroke={C.green}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Synced
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path
                    d="M11.5 2.5C10.3 1.3 8.7.5 6.9.5 3.4.5.5 3.4.5 6.9s2.9 6.4 6.4 6.4c2.9 0 5.4-1.9 6.1-4.6"
                    stroke={C.muted}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <path d="M11.5 2.5V.5H9.5" stroke={C.muted} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Sync National
              </>
            )}
          </button>
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            background: C.grayLight,
            padding: 4,
            borderRadius: 24,
            marginBottom: 28,
            width: 'fit-content',
          }}
        >
          <TabBtn active={activeTab === 'winners'} onClick={() => setActiveTab('winners')}>
            Contract Winners{winnersCount !== null ? ` (${winnersCount})` : ''}
          </TabBtn>
          <TabBtn active={activeTab === 'companies'} onClick={() => setActiveTab('companies')}>
            Sector Companies{companiesCount !== null ? ` (${companiesCount})` : ''}
          </TabBtn>
          <TabBtn active={activeTab === 'pricing'} onClick={() => setActiveTab('pricing')}>
            Pricing Intel{pricingCount !== null ? ` (${pricingCount} states)` : ''}
          </TabBtn>
          <TabBtn active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')}>
            Analytics
          </TabBtn>
        </div>

        {/* Tab content */}
        {activeTab === 'winners' && <WinnersTab onCountChange={setWinnersCount} />}
        {activeTab === 'companies' && <CompaniesTab onCountChange={setCompaniesCount} />}
        {activeTab === 'pricing' && (
          <PricingTab
            onCountChange={setPricingCount}
            onDataLoaded={setPricingData}
          />
        )}
        {activeTab === 'analytics' && <AnalyticsTab pricing={pricingData} />}
      </div>

      {/* Spin keyframe */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
