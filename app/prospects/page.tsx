'use client'

import { useEffect, useState, useCallback, CSSProperties } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface QueueItem {
  id: string
  legalName: string
  segment: string
  county: string
  score: number
  ticket: number
  days: number
  stage: string
  priority: string
}

type SortKey = 'score' | 'ticket' | 'days' | 'stage' | 'priority' | 'legalName'
type SortDir = 'asc' | 'desc'

interface Sort {
  key: SortKey
  dir: SortDir
}

// ─── Palette / tokens ─────────────────────────────────────────────────────────

const C = {
  bg: '#FAFAF9',
  surface: '#FFFFFF',
  tblHead: '#FAFAFB',
  border: '1px solid #E7E5E4',
  sep: '1px solid #F5F5F4',
  text: '#1C1917',
  muted: '#78716C',
  vMuted: '#A8A29E',
  primary: '#4F46E5',
  primaryLight: '#EEF2FF',
  red: '#DC2626',
  redLight: '#FEF2F2',
  amber: '#D97706',
  amberLight: '#FFFBEB',
  green: '#16A34A',
  greenLight: '#F0FDF4',
  indigo: '#4F46E5',
  indigoLight: '#EEF2FF',
  mono: "'JetBrains Mono', monospace",
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

type ChipTone = 'red' | 'amber' | 'green' | 'indigo' | 'neutral' | 'blue' | 'purple' | 'sky'

const toneMap: Record<ChipTone, { bg: string; color: string; border: string }> = {
  red:     { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
  amber:   { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  green:   { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  indigo:  { bg: '#EEF2FF', color: '#3730A3', border: '#C7D2FE' },
  neutral: { bg: '#F5F5F4', color: '#57534E', border: '#E7E5E4' },
  blue:    { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  purple:  { bg: '#FAF5FF', color: '#7E22CE', border: '#E9D5FF' },
  sky:     { bg: '#F0F9FF', color: '#0369A1', border: '#BAE6FD' },
}

function Chip({
  children,
  tone = 'neutral',
  size = 'sm',
}: {
  children: React.ReactNode
  tone?: ChipTone
  size?: 'xs' | 'sm'
}) {
  const t = toneMap[tone]
  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: size === 'xs' ? '1px 6px' : '2px 8px',
    borderRadius: 99,
    fontSize: size === 'xs' ? 10 : 11,
    fontWeight: 500,
    letterSpacing: '0.02em',
    background: t.bg,
    color: t.color,
    border: `1px solid ${t.border}`,
    whiteSpace: 'nowrap',
  }
  return <span style={style}>{children}</span>
}

// ─── LetterAvatar ─────────────────────────────────────────────────────────────

function LetterAvatar({
  name,
  size = 28,
  radius = 6,
}: {
  name: string
  size?: number
  radius?: number
}) {
  const letter = (name || '?')[0].toUpperCase()
  // deterministic hue from name
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    background: `hsl(${hue},55%,88%)`,
    color: `hsl(${hue},45%,35%)`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size * 0.42,
    fontWeight: 700,
    flexShrink: 0,
    userSelect: 'none',
  }
  return <span style={style}>{letter}</span>
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────

function Checkbox({
  checked,
  onChange,
  indeterminate = false,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  indeterminate?: boolean
}) {
  const style: CSSProperties = {
    width: 15,
    height: 15,
    borderRadius: 3,
    border: checked || indeterminate ? `2px solid ${C.primary}` : `1.5px solid #D6D3D1`,
    background: checked ? C.primary : indeterminate ? C.primary : '#FFFFFF',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.1s',
  }
  return (
    <span
      style={style}
      onClick={e => { e.stopPropagation(); onChange(!checked) }}
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      tabIndex={0}
      onKeyDown={e => e.key === ' ' && onChange(!checked)}
    >
      {checked && (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
          <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {!checked && indeterminate && (
        <svg width="8" height="2" viewBox="0 0 8 2" fill="none">
          <path d="M1 1H7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </span>
  )
}

// ─── HeaderCell ───────────────────────────────────────────────────────────────

function HeaderCell({
  label,
  k,
  sort,
  setSort,
  right = false,
}: {
  label: string
  k: SortKey | null
  sort: Sort
  setSort: (s: Sort) => void
  right?: boolean
}) {
  const active = k !== null && sort.key === k
  const style: CSSProperties = {
    padding: '8px 10px',
    fontSize: 11,
    fontWeight: 600,
    color: active ? C.primary : C.muted,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: k ? 'pointer' : 'default',
    userSelect: 'none',
    textAlign: right ? 'right' : 'left',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    justifyContent: right ? 'flex-end' : 'flex-start',
    whiteSpace: 'nowrap',
  }
  const handleClick = () => {
    if (!k) return
    if (sort.key === k) {
      setSort({ key: k, dir: sort.dir === 'desc' ? 'asc' : 'desc' })
    } else {
      setSort({ key: k, dir: 'desc' })
    }
  }
  return (
    <div style={style} onClick={handleClick}>
      {label}
      {k && (
        <svg
          width="8"
          height="10"
          viewBox="0 0 8 10"
          fill="none"
          style={{ opacity: active ? 1 : 0.3 }}
        >
          {sort.dir === 'desc' || !active ? (
            <path d="M4 2L4 8M4 8L1.5 5.5M4 8L6.5 5.5" stroke={active ? C.primary : C.muted} strokeWidth="1.2" strokeLinecap="round" />
          ) : (
            <path d="M4 8L4 2M4 2L1.5 4.5M4 2L6.5 4.5" stroke={active ? C.primary : C.muted} strokeWidth="1.2" strokeLinecap="round" />
          )}
        </svg>
      )}
    </div>
  )
}

// ─── FilterPill ───────────────────────────────────────────────────────────────

function FilterPill({
  label,
  value,
  setValue,
  options,
}: {
  label: string
  value: string
  setValue: (v: string) => void
  options: string[]
}) {
  const active = value !== 'all'
  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 99,
    fontSize: 12,
    fontWeight: 500,
    border: active ? `1.5px solid ${C.primary}` : `1px solid #E7E5E4`,
    background: active ? C.primaryLight : '#FFFFFF',
    color: active ? C.primary : C.muted,
    cursor: 'pointer',
    position: 'relative',
  }
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        style={style}
        onClick={() => setOpen(o => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      >
        {label}
        {active && `: ${value}`}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2.5 3.75L5 6.25L7.5 3.75" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            background: '#FFFFFF',
            border: '1px solid #E7E5E4',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            zIndex: 100,
            minWidth: 160,
            overflow: 'hidden',
          }}
        >
          {['all', ...options].map(opt => (
            <div
              key={opt}
              style={{
                padding: '8px 12px',
                fontSize: 12,
                cursor: 'pointer',
                background: value === opt ? C.primaryLight : 'transparent',
                color: value === opt ? C.primary : C.text,
                fontWeight: value === opt ? 600 : 400,
              }}
              onMouseDown={() => { setValue(opt); setOpen(false) }}
            >
              {opt === 'all' ? `All ${label}` : opt}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Score color helper ───────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return { color: C.indigo, fontWeight: 700 }
  if (score >= 70) return { color: C.text, fontWeight: 600 }
  return { color: C.muted, fontWeight: 500 }
}

// ─── Priority badge ───────────────────────────────────────────────────────────

function priorityTone(priority: string): ChipTone {
  const p = priority.toLowerCase()
  if (p === 'high') return 'red'
  if (p === 'medium') return 'amber'
  return 'neutral'
}

// ─── Stage badge ──────────────────────────────────────────────────────────────

function stageTone(stage: string): ChipTone {
  const s = stage.toLowerCase()
  if (s.includes('approved') || s.includes('won')) return 'green'
  if (s.includes('contact') || s.includes('outreach')) return 'blue'
  if (s.includes('proposal') || s.includes('quote')) return 'purple'
  if (s.includes('reject') || s.includes('lost')) return 'red'
  if (s.includes('review')) return 'amber'
  return 'neutral'
}

// ─── Age color helper ─────────────────────────────────────────────────────────

function ageColor(days: number): string {
  if (days < 30) return C.green
  if (days <= 60) return C.amber
  return C.red
}

// ─── QueueStat ────────────────────────────────────────────────────────────────

function QueueStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string | number
  sub?: string
  tone?: 'indigo' | 'green' | 'amber' | 'red'
}) {
  const accentColor =
    tone === 'indigo' ? C.indigo :
    tone === 'green' ? C.green :
    tone === 'amber' ? C.amber :
    tone === 'red' ? C.red :
    C.text

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E7E5E4',
        borderRadius: 10,
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        flex: 1,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accentColor, fontFamily: C.mono, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: C.vMuted }}>{sub}</div>
      )}
    </div>
  )
}

// ─── QueueRow ─────────────────────────────────────────────────────────────────

const GRID = '32px 1fr 130px 110px 100px 90px 110px 120px 80px 40px'

function QueueRow({
  it,
  selected,
  onToggle,
  onOpen,
}: {
  it: QueueItem
  selected: boolean
  onToggle: () => void
  onOpen: () => void
}) {
  const [hover, setHover] = useState(false)

  const rowStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: GRID,
    alignItems: 'center',
    borderBottom: C.sep,
    background: selected ? '#F5F3FF' : hover ? '#FAFAF9' : '#FFFFFF',
    transition: 'background 0.1s',
    cursor: 'pointer',
  }

  const cellStyle: CSSProperties = {
    padding: '10px 10px',
    fontSize: 13,
    color: C.text,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  }

  return (
    <div
      style={rowStyle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onOpen}
    >
      {/* Checkbox */}
      <div style={{ ...cellStyle, paddingLeft: 12 }} onClick={e => e.stopPropagation()}>
        <Checkbox checked={selected} onChange={onToggle} />
      </div>

      {/* Company */}
      <div style={{ ...cellStyle, display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 6 }}>
        <LetterAvatar name={it.legalName} size={26} />
        <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {it.legalName}
        </span>
      </div>

      {/* Segment */}
      <div style={{ ...cellStyle, color: C.muted, fontSize: 12 }}>{it.segment}</div>

      {/* County */}
      <div style={{ ...cellStyle, color: C.muted, fontSize: 12 }}>{it.county}</div>

      {/* Score */}
      <div style={{ ...cellStyle, fontFamily: C.mono, ...scoreColor(it.score) }}>
        {it.score}
      </div>

      {/* Ticket */}
      <div style={{ ...cellStyle, fontFamily: C.mono, fontSize: 12, color: C.muted }}>
        ${it.ticket.toLocaleString()}
      </div>

      {/* Stage */}
      <div style={cellStyle}>
        <Chip tone={stageTone(it.stage)} size="xs">{it.stage}</Chip>
      </div>

      {/* Priority */}
      <div style={cellStyle}>
        <Chip tone={priorityTone(it.priority)} size="xs">{it.priority}</Chip>
      </div>

      {/* Age */}
      <div style={{ ...cellStyle, fontFamily: C.mono, fontSize: 12, color: ageColor(it.days) }}>
        {it.days}d
      </div>

      {/* Arrow */}
      <div style={{ ...cellStyle, color: C.vMuted, display: 'flex', justifyContent: 'center' }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5.5 3.5L9.5 7L5.5 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  const pulse: CSSProperties = {
    background: 'linear-gradient(90deg, #F5F5F4 25%, #EEEEEC 50%, #F5F5F4 75%)',
    backgroundSize: '200% 100%',
    animation: 'skeleton-pulse 1.4s ease infinite',
    borderRadius: 4,
    height: 12,
  }
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: GRID,
        alignItems: 'center',
        borderBottom: C.sep,
        padding: '14px 10px',
        gap: 10,
      }}
    >
      {[32, 180, 90, 80, 40, 60, 80, 70, 35, 16].map((w, i) => (
        <div key={i} style={{ ...pulse, width: w, height: 10 }} />
      ))}
    </div>
  )
}

// ─── Saved views ─────────────────────────────────────────────────────────────

const SAVED_VIEWS = [
  'All prospects',
  'My PMs · Brickell · score ≥ 80',
  'High priority · 0–30d window',
  'Healthcare · pending review',
]

// ─── Intelligence Winner type ─────────────────────────────────────────────────

interface IntelWinner {
  id: string
  company: string
  naics: string
  naics_desc: string
  contract_value: number
  agency: string
  state: string
  date: string
  uei: string
  angle: string
  reason: string
}

// ─── Priority score from contract value ───────────────────────────────────────

function contractScore(value: number): number {
  if (value > 2_000_000) return 85
  if (value >= 500_000) return 70
  if (value >= 100_000) return 55
  return 40
}

function scoreTone(score: number): ChipTone {
  if (score >= 80) return 'indigo'
  if (score >= 65) return 'blue'
  if (score >= 50) return 'amber'
  return 'neutral'
}

function fmtValue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${v}`
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QueuePage() {
  const router = useRouter()
  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isMock, setIsMock] = useState(false)

  const [sort, setSort] = useState<Sort>({ key: 'score', dir: 'desc' })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState('all')
  const [filterSegment, setFilterSegment] = useState('all')
  const [filterCounty, setFilterCounty] = useState('all')
  const [filterScore, setFilterScore] = useState('all')
  const [activeView, setActiveView] = useState(0)

  // Intelligence Queue state
  const [intelWinners, setIntelWinners] = useState<IntelWinner[]>([])
  const [intelLoading, setIntelLoading] = useState(true)
  const [movedToCRM, setMovedToCRM] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/intelligence/winners?limit=10')
      .then(r => r.json())
      .then(d => setIntelWinners(d.winners || []))
      .catch(() => {})
      .finally(() => setIntelLoading(false))
  }, [])

  function handleMoveToCRM(winner: IntelWinner) {
    setMovedToCRM(prev => new Set(prev).add(winner.id))
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        sort: sort.key,
        dir: sort.dir,
        stage: filterStage,
        segment: filterSegment,
        county: filterCounty,
      })
      const res = await fetch(`/api/prospects?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setItems(data.items || [])
      setIsMock(data.mock || false)
    } catch (err: any) {
      setError(err.message || 'Failed to load')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [sort, filterStage, filterSegment, filterCounty])

  useEffect(() => { fetchData() }, [fetchData])

  // Derive unique filter options from loaded items
  const allSegments = Array.from(new Set(items.map(i => i.segment).filter(Boolean))).sort()
  const allCounties = Array.from(new Set(items.map(i => i.county).filter(Boolean))).sort()
  const allStages = Array.from(new Set(items.map(i => i.stage).filter(Boolean))).sort()

  // Client-side search + score filter
  const visible = items.filter(it => {
    if (search && !it.legalName.toLowerCase().includes(search.toLowerCase())) return false
    if (filterScore !== 'all') {
      const min = parseInt(filterScore)
      if (!isNaN(min) && it.score < min) return false
    }
    return true
  })

  // Stats
  const pendingCount = visible.filter(i => i.stage.toLowerCase().includes('pending')).length
  const highCount = visible.filter(i => i.priority.toLowerCase() === 'high').length
  const avgDays = visible.length ? Math.round(visible.reduce((s, i) => s + i.days, 0) / visible.length) : 0
  const weeklyMRR = Math.round(visible.reduce((s, i) => s + i.ticket, 0) / 4)

  // Selection helpers
  const allSelected = visible.length > 0 && visible.every(i => selected.has(i.id))
  const someSelected = visible.some(i => selected.has(i.id))
  const selectedList = visible.filter(i => selected.has(i.id))

  const toggleAll = () => {
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev)
        visible.forEach(i => next.delete(i.id))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        visible.forEach(i => next.add(i.id))
        return next
      })
    }
  }

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Keyframes for skeleton */}
      <style>{`
        @keyframes skeleton-pulse {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');
      `}</style>

      {/* ── Page Header ── */}
      <div style={{ background: '#FFFFFF', borderBottom: C.border, padding: '20px 32px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Queue</h1>
              {isMock && (
                <Chip tone="amber" size="xs">Demo data</Chip>
              )}
            </div>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
              <span style={{ fontFamily: C.mono, fontWeight: 600, color: C.text }}>{visible.length}</span>
              {' '}prospects
              {' · '}Est. MRR <span style={{ fontFamily: C.mono, fontWeight: 600, color: C.indigo }}>${weeklyMRR.toLocaleString()}</span>
              {' · '}Avg score <span style={{ fontFamily: C.mono, fontWeight: 600, color: C.text }}>{visible.length ? Math.round(visible.reduce((s, i) => s + i.score, 0) / visible.length) : 0}</span>
              {' · '}
              <span style={{ color: C.red, fontWeight: 600 }}>{highCount} high priority</span>
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button style={btnOutline}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ marginRight: 5 }}>
                <path d="M6.5 1v7M3.5 5l3 3 3-3M1 9.5v1a1 1 0 001 1h9a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Import CSV
            </button>
            <a
              href="https://airtable.com/appZhXnyFiKbnOZLr"
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...btnOutline, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ marginRight: 5 }}>
                <path d="M5.5 2.5H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1v-3.5M8 1.5h3m0 0v3m0-3L5.5 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              Open in Airtable
            </a>
            <button style={btnOutline}>+ Add manually</button>
            <button style={btnPrimary}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginRight: 5 }}>
                <circle cx="6" cy="6" r="4.5" stroke="white" strokeWidth="1.2" />
                <path d="M6 3.5v2.5l1.5 1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              Run discovery
            </button>
          </div>
        </div>

        {/* Saved views bar */}
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', marginBottom: -1 }}>
          {SAVED_VIEWS.map((v, idx) => (
            <button
              key={v}
              onClick={() => setActiveView(idx)}
              style={{
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: activeView === idx ? 600 : 400,
                color: activeView === idx ? C.primary : C.muted,
                background: 'transparent',
                border: 'none',
                borderBottom: activeView === idx ? `2px solid ${C.primary}` : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '20px 32px', maxWidth: 1400, margin: '0 auto' }}>

        {/* Error banner */}
        {error && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            padding: '10px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            color: '#B91C1C',
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="#B91C1C" strokeWidth="1.2" />
              <path d="M8 5v3.5M8 10.5v.5" stroke="#B91C1C" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            Airtable error: {error}. Showing mock data below.
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <QueueStat
            label="Pending review"
            value={pendingCount}
            sub="Need triage"
            tone="amber"
          />
          <QueueStat
            label="High priority"
            value={highCount}
            sub="Act within 7 days"
            tone="red"
          />
          <QueueStat
            label="Avg age"
            value={`${avgDays}d`}
            sub="Since entity formed"
          />
          <QueueStat
            label="Est. weekly MRR"
            value={`$${weeklyMRR.toLocaleString()}`}
            sub="From visible prospects"
            tone="indigo"
          />
        </div>

        {/* Intelligence Queue */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>Intelligence Queue</h2>
              <Chip tone="indigo" size="xs">Live</Chip>
            </div>
            <span style={{ fontSize: 11, color: C.vMuted }}>Contract winners from federal data — potential subcontract clients</span>
          </div>
          {intelLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ border: '1px solid #E7E5E4', borderRadius: 10, padding: 16, height: 110,
                  background: 'linear-gradient(90deg, #F5F5F4 25%, #EEEEEC 50%, #F5F5F4 75%)',
                  backgroundSize: '200% 100%', animation: 'skeleton-pulse 1.4s ease infinite' }} />
              ))}
            </div>
          ) : intelWinners.length === 0 ? (
            <div style={{ background: '#FFFFFF', border: '1px solid #E7E5E4', borderRadius: 10, padding: '24px 20px', textAlign: 'center', color: C.muted, fontSize: 13 }}>
              No intelligence data available — check connection to /api/intelligence/winners
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
              {intelWinners.map(winner => {
                const score = contractScore(winner.contract_value)
                const moved = movedToCRM.has(winner.id)
                return (
                  <div
                    key={winner.id}
                    style={{
                      background: moved ? '#F0FDF4' : '#FFFFFF',
                      border: `1px solid ${moved ? '#BBF7D0' : '#E7E5E4'}`,
                      borderRadius: 10, padding: 14,
                      display: 'flex', flexDirection: 'column', gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <p
                          style={{ fontSize: 13, fontWeight: 600, color: '#4F46E5', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                          onClick={(e) => { e.stopPropagation(); window.location.href = `/companies/${encodeURIComponent(winner.company)}` }}
                        >{winner.company}</p>
                        <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>{winner.state} · {winner.agency.split(',')[0]}</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <Chip tone={scoreTone(score)} size="xs">Score {score}</Chip>
                        <Chip tone="blue" size="xs">New Lead</Chip>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.indigo, fontFamily: C.mono }}>{fmtValue(winner.contract_value)}</span>
                      <button
                        disabled={moved}
                        onClick={() => handleMoveToCRM(winner)}
                        style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: moved ? 'default' : 'pointer',
                          border: `1px solid ${moved ? '#BBF7D0' : C.primary}`,
                          background: moved ? '#F0FDF4' : C.primary,
                          color: moved ? C.green : '#FFFFFF',
                          transition: 'all 150ms',
                        }}
                      >
                        {moved ? 'Added to CRM' : 'Move to CRM'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Filters row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '0 0 220px' }}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 13 13"
              fill="none"
              style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: C.vMuted }}
            >
              <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.2" />
              <path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search company…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 28px',
                fontSize: 12,
                border: '1px solid #E7E5E4',
                borderRadius: 99,
                outline: 'none',
                color: C.text,
                background: '#FFFFFF',
              }}
            />
          </div>

          <FilterPill label="Segment" value={filterSegment} setValue={setFilterSegment} options={allSegments} />
          <FilterPill label="Stage" value={filterStage} setValue={setFilterStage} options={allStages} />
          <FilterPill label="County" value={filterCounty} setValue={setFilterCounty} options={allCounties} />
          <FilterPill
            label="Score ≥"
            value={filterScore}
            setValue={setFilterScore}
            options={['60', '70', '80', '90']}
          />

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {(filterStage !== 'all' || filterSegment !== 'all' || filterCounty !== 'all' || filterScore !== 'all' || search) && (
              <button
                style={{ fontSize: 11, color: C.muted, cursor: 'pointer', background: 'none', border: 'none', padding: '4px 6px' }}
                onClick={() => {
                  setFilterStage('all')
                  setFilterSegment('all')
                  setFilterCounty('all')
                  setFilterScore('all')
                  setSearch('')
                }}
              >
                Clear filters
              </button>
            )}
            <span style={{ fontSize: 11, color: C.vMuted, fontFamily: C.mono }}>{visible.length} shown</span>
          </div>
        </div>

        {/* Bulk actions bar */}
        {someSelected && (
          <div style={{
            background: '#F0F0FF',
            border: '1px solid #C7D2FE',
            borderRadius: 8,
            padding: '8px 14px',
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 13,
          }}>
            <span style={{ color: C.primary, fontWeight: 600 }}>{selectedList.length} selected</span>
            <div style={{ width: 1, height: 16, background: '#C7D2FE' }} />
            <button style={{ ...bulkBtn, color: C.green }}>Approve all</button>
            <button style={{ ...bulkBtn, color: C.red }}>Reject all</button>
            <button style={{ ...bulkBtn, color: C.muted }}>Assign to…</button>
            <button
              style={{ ...bulkBtn, marginLeft: 'auto', color: C.vMuted }}
              onClick={() => setSelected(new Set())}
            >
              Clear
            </button>
          </div>
        )}

        {/* Table */}
        <div style={{ background: '#FFFFFF', border: C.border, borderRadius: 10, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: GRID,
            background: C.tblHead,
            borderBottom: C.border,
            alignItems: 'center',
          }}>
            <div style={{ padding: '8px 12px' }}>
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected && !allSelected}
                onChange={toggleAll}
              />
            </div>
            <HeaderCell label="Company" k="legalName" sort={sort} setSort={setSort} />
            <HeaderCell label="Segment" k={null} sort={sort} setSort={setSort} />
            <HeaderCell label="County" k={null} sort={sort} setSort={setSort} />
            <HeaderCell label="Score" k="score" sort={sort} setSort={setSort} right />
            <HeaderCell label="Ticket" k="ticket" sort={sort} setSort={setSort} right />
            <HeaderCell label="Stage" k="stage" sort={sort} setSort={setSort} />
            <HeaderCell label="Priority" k="priority" sort={sort} setSort={setSort} />
            <HeaderCell label="Age" k="days" sort={sort} setSort={setSort} right />
            <div />
          </div>

          {/* Rows */}
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
          ) : visible.length === 0 ? (
            <div style={{ padding: '48px 32px', textAlign: 'center', color: C.muted }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No prospects found</div>
              <div style={{ fontSize: 12, color: C.vMuted }}>
                {error ? 'Check your Airtable connection' : 'Try adjusting filters or run discovery'}
              </div>
            </div>
          ) : (
            visible.map(it => (
              <QueueRow
                key={it.id}
                it={it}
                selected={selected.has(it.id)}
                onToggle={() => toggleOne(it.id)}
                onOpen={() => router.push(`/prospects/${it.id}`)}
              />
            ))
          )}
        </div>

        {/* Footer count */}
        {!loading && visible.length > 0 && (
          <div style={{ marginTop: 12, textAlign: 'center', fontSize: 11, color: C.vMuted }}>
            Showing {visible.length} of {items.length} prospects
            {isMock && ' · Demo mode: connect Airtable to see real data'}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Button styles ────────────────────────────────────────────────────────────

const btnBase: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 12px',
  borderRadius: 7,
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.15s',
  whiteSpace: 'nowrap',
}

const btnOutline: CSSProperties = {
  ...btnBase,
  background: '#FFFFFF',
  border: '1px solid #E7E5E4',
  color: '#57534E',
}

const btnPrimary: CSSProperties = {
  ...btnBase,
  background: '#4F46E5',
  border: '1px solid #4338CA',
  color: '#FFFFFF',
}

const bulkBtn: CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 500,
  padding: '2px 6px',
}
