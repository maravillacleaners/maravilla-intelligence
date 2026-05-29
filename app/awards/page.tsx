'use client'

import { useState, useMemo, useEffect } from 'react'
import TopBar from '@/components/crm/top-bar'
import {
  Chip,
  LetterAvatar,
  StatusDot,
  Card,
  Button,
  Tooltip,
} from '@/components/crm/ui'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AwardSource {
  id: string
  name: string
  scope: string
  lastSync: string
  live: boolean
  awards30d: number
}

interface Award {
  id: string
  prime: string
  primeDomain: string
  agency: string
  scope: 'federal' | 'state' | 'local'
  amount: number
  awardDate: string
  naics: string
  setAside: string
  place: { city: string; state: string }
  crmStatus: 'in-crm-active' | 'in-crm-stale' | 'not-in-crm' | 'rejected'
  crmStage?: string
  lastTouch: string | null
  lastTouchBy: string | null
  ourPotential: { mid: number }
  isCurrent?: boolean
}

type TimeRange = '7d' | '30d' | '90d' | '1y'
type ScopeFilter = 'all' | 'federal' | 'state' | 'local'
type CrmFilter = 'all' | 'not-in-crm' | 'stale' | 'untouched30d'
type ContractTypeFilter = 'all' | 'prime' | 'sub'
type SetAsideFilter = 'all' | 'small-business' | 'sdvosb' | 'wosb' | 'open'

// ─── Mock data ────────────────────────────────────────────────────────────────

const AWARD_SOURCES: AwardSource[] = [
  { id: 'fed', name: 'USASpending.gov', scope: 'Federal', lastSync: '2026-05-25T04:00:00Z', live: true, awards30d: 1842 },
  { id: 'fl', name: 'FL DMS · MyFloridaMarketPlace', scope: 'FL State', lastSync: '2026-05-25T05:30:00Z', live: true, awards30d: 312 },
  { id: 'ca', name: 'CA eProcure', scope: 'CA State', lastSync: '2026-05-25T05:30:00Z', live: true, awards30d: 488 },
  { id: 'tx', name: 'TX SmartBuy', scope: 'TX State', lastSync: '2026-05-25T05:30:00Z', live: true, awards30d: 412 },
  { id: 'ny', name: 'NY OGS', scope: 'NY State', lastSync: '2026-05-22T05:30:00Z', live: false, awards30d: 280 },
  { id: 'local', name: 'Miami-Dade BCC + local RFP scrape', scope: 'Local · Miami-Dade', lastSync: '2026-05-25T07:00:00Z', live: true, awards30d: 84 },
]

const AWARDS: Award[] = [
  { id: 'AW-2026-04217', prime: 'ABM Industries Inc.', primeDomain: 'abm.com', agency: 'VA Medical Center Miami', scope: 'federal', amount: 3210000, awardDate: '2026-05-22', naics: '561720', setAside: 'Small Business', place: { city: 'Miami', state: 'FL' }, crmStatus: 'in-crm-active', crmStage: 'Contacted', lastTouch: '2026-04-12', lastTouchBy: 'sarah.k', ourPotential: { mid: 490000 }, isCurrent: true },
  { id: 'AW-2026-04200', prime: 'Skyline Maintenance Group LLC', primeDomain: 'skylinemaint.com', agency: 'GSA Region 4 · Federal Building', scope: 'federal', amount: 1840000, awardDate: '2026-05-20', naics: '561720', setAside: 'Small Business · WOSB', place: { city: 'Miami', state: 'FL' }, crmStatus: 'not-in-crm', lastTouch: null, lastTouchBy: null, ourPotential: { mid: 280000 } },
  { id: 'AW-2026-04188', prime: 'Coastal Facility Partners LLC', primeDomain: 'coastalfp.com', agency: 'Miami International Airport', scope: 'local', amount: 4200000, awardDate: '2026-05-18', naics: '561720', setAside: 'Open competition', place: { city: 'Miami', state: 'FL' }, crmStatus: 'in-crm-stale', crmStage: 'Discovered', lastTouch: '2025-11-08', lastTouchBy: 'marcus.r', ourPotential: { mid: 630000 } },
  { id: 'AW-2026-04173', prime: 'ServiceMaster Florida Inc.', primeDomain: 'servicemasterfl.com', agency: 'Florida Dept. of Corrections', scope: 'state', amount: 920000, awardDate: '2026-05-15', naics: '561720', setAside: 'Small Business', place: { city: 'Tallahassee', state: 'FL' }, crmStatus: 'in-crm-active', crmStage: 'Replied', lastTouch: '2026-05-02', lastTouchBy: 'sarah.k', ourPotential: { mid: 138000 } },
  { id: 'AW-2026-04161', prime: 'Aramark Facility Services LLC', primeDomain: 'aramark.com', agency: 'Jackson Memorial Hospital', scope: 'local', amount: 6800000, awardDate: '2026-05-12', naics: '561720', setAside: 'Open competition', place: { city: 'Miami', state: 'FL' }, crmStatus: 'in-crm-active', crmStage: 'Proposal sent', lastTouch: '2026-05-08', lastTouchBy: 'sarah.k', ourPotential: { mid: 1020000 } },
  { id: 'AW-2026-04144', prime: 'Reyes Building Services Corp.', primeDomain: 'reyesbuilding.com', agency: 'Broward County Schools', scope: 'local', amount: 2100000, awardDate: '2026-05-10', naics: '561720', setAside: 'Small Business · HUBZone', place: { city: 'Fort Lauderdale', state: 'FL' }, crmStatus: 'not-in-crm', lastTouch: null, lastTouchBy: null, ourPotential: { mid: 315000 } },
  { id: 'AW-2026-04122', prime: 'Atlantic Floor Care LLC', primeDomain: 'atlanticfloor.com', agency: 'City of Hialeah', scope: 'local', amount: 540000, awardDate: '2026-05-08', naics: '561740', setAside: 'Small Business', place: { city: 'Hialeah', state: 'FL' }, crmStatus: 'in-crm-active', crmStage: 'Won', lastTouch: '2026-04-22', lastTouchBy: 'marcus.r', ourPotential: { mid: 0 } },
  { id: 'AW-2026-04098', prime: 'Sunshine Cleaning Services LLC', primeDomain: 'sunshineclean.fl', agency: 'Florida State University', scope: 'state', amount: 1280000, awardDate: '2026-05-05', naics: '561720', setAside: 'Open competition', place: { city: 'Tallahassee', state: 'FL' }, crmStatus: 'rejected', lastTouch: '2025-08-14', lastTouchBy: 'sarah.k', ourPotential: { mid: 0 } },
  { id: 'AW-2026-04077', prime: 'Apex Industrial Services Inc.', primeDomain: 'apexindustrial.com', agency: 'Dept. of Homeland Security', scope: 'federal', amount: 980000, awardDate: '2026-05-03', naics: '561720', setAside: 'Small Business · SDVOSB', place: { city: 'Doral', state: 'FL' }, crmStatus: 'not-in-crm', lastTouch: null, lastTouchBy: null, ourPotential: { mid: 147000 } },
  { id: 'AW-2026-04060', prime: 'Premier Janitorial Group LLC', primeDomain: 'premierjan.com', agency: 'USPS Miami District', scope: 'federal', amount: 1620000, awardDate: '2026-05-01', naics: '561720', setAside: 'Small Business', place: { city: 'Miami', state: 'FL' }, crmStatus: 'in-crm-stale', crmStage: 'Discovered', lastTouch: '2024-09-22', lastTouchBy: 'sarah.k', ourPotential: { mid: 243000 } },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${n}`
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtSyncTime(iso: string): string {
  const d = new Date(iso)
  return `Last sync: ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  return Math.floor(ms / 86400000)
}

function rangeLabel(r: TimeRange): string {
  return { '7d': '7 days', '30d': '30 days', '90d': '90 days', '1y': '1 year' }[r]
}

function filterByRange(awards: Award[], range: TimeRange): Award[] {
  const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[range]
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return awards.filter(a => new Date(a.awardDate) >= cutoff)
}

function scopeTone(scope: Award['scope']): 'indigo' | 'blue' | 'neutral' {
  if (scope === 'federal') return 'indigo'
  if (scope === 'state') return 'blue'
  return 'neutral'
}

function scopeLabel(scope: Award['scope']): string {
  return scope.charAt(0).toUpperCase() + scope.slice(1)
}

function stageToneLocal(stage: string): 'emerald' | 'amber' | 'indigo' | 'blue' | 'neutral' | 'red' {
  if (stage === 'Won') return 'emerald'
  if (stage === 'Proposal sent') return 'amber'
  if (stage === 'Replied') return 'blue'
  if (stage === 'Contacted') return 'blue'
  if (stage === 'Discovered') return 'neutral'
  return 'neutral'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        background: '#F5F5F4',
        border: '1px solid #E7E5E4',
        borderRadius: 8,
        padding: 3,
        gap: 2,
      }}
    >
      {options.map(opt => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '5px 12px',
              fontSize: 12.5,
              fontWeight: active ? 600 : 400,
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              background: active ? '#FFFFFF' : 'transparent',
              color: active ? '#1C1917' : '#78716C',
              boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'background 0.12s ease, color 0.12s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone?: 'indigo' | 'emerald' | 'amber' | 'default'
}) {
  const valueColor =
    tone === 'indigo' ? '#4F46E5' :
    tone === 'emerald' ? '#059669' :
    tone === 'amber' ? '#D97706' :
    '#1C1917'

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E7E5E4',
        borderRadius: 10,
        padding: '16px 20px',
        flex: 1,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#A8A29E', marginBottom: 8 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: valueColor,
          lineHeight: 1,
          fontFamily: "'JetBrains Mono', Consolas, monospace",
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11.5, color: '#78716C', marginTop: 5 }}>{sub}</div>
      )}
    </div>
  )
}

function TouchCell({ lastTouch, lastTouchBy }: { lastTouch: string | null; lastTouchBy: string | null }) {
  if (!lastTouch) {
    return (
      <div>
        <span style={{ fontSize: 12, color: '#B91C1C', fontWeight: 500 }}>Never</span>
      </div>
    )
  }
  const days = daysSince(lastTouch)!
  const color = days > 30 ? '#D97706' : '#059669'
  const label = days === 0 ? 'Today' : days === 1 ? '1d ago' : days < 30 ? `${days}d ago` : `${Math.floor(days / 30)}mo ago`

  return (
    <div>
      <span style={{ fontSize: 12, color, fontWeight: 500 }}>{label}</span>
      {lastTouchBy && (
        <div
          style={{
            fontSize: 10.5,
            color: '#A8A29E',
            fontFamily: "'JetBrains Mono', Consolas, monospace",
            marginTop: 2,
          }}
        >
          {lastTouchBy}
        </div>
      )}
    </div>
  )
}

function CrmStatusCell({ award }: { award: Award }) {
  if (award.crmStatus === 'not-in-crm') {
    return (
      <Chip tone="blue" size="sm">+ Add to pipeline</Chip>
    )
  }
  if (award.crmStatus === 'rejected') {
    return <Chip tone="red" size="sm">Rejected</Chip>
  }
  if (award.crmStatus === 'in-crm-stale' && award.crmStage) {
    return (
      <Chip tone="amber" size="sm">{award.crmStage} · stale</Chip>
    )
  }
  if (award.crmStatus === 'in-crm-active' && award.crmStage) {
    return (
      <Chip tone={stageToneLocal(award.crmStage)} size="sm">{award.crmStage}</Chip>
    )
  }
  return <span style={{ color: '#A8A29E', fontSize: 12 }}>—</span>
}

function AwardRow({ award, isLast }: { award: Award; isLast: boolean }) {
  const [hovered, setHovered] = useState(false)

  function handleAddToOutreach() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('outreach_preselect', award.prime)
      window.location.href = '/outreach'
    }
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1.5fr 90px 90px 95px 130px 130px 90px 100px 110px',
        alignItems: 'center',
        gap: 0,
        padding: '12px 16px',
        borderBottom: isLast ? 'none' : '1px solid #F5F5F4',
        background: hovered ? '#FAFAF9' : '#FFFFFF',
        borderLeft: award.isCurrent ? '3px solid #4F46E5' : '3px solid transparent',
        transition: 'background 0.1s ease',
        cursor: 'default',
      }}
    >
      {/* Prime contractor */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, paddingRight: 8 }}>
        <LetterAvatar name={award.prime} size={30} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#1C1917',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 200,
              }}
            >
              {award.prime}
            </span>
            {award.isCurrent && (
              <Chip tone="indigo" size="sm">Open</Chip>
            )}
          </div>
          <div
            style={{
              fontSize: 11,
              color: '#A8A29E',
              fontFamily: "'JetBrains Mono', Consolas, monospace",
              marginTop: 1,
            }}
          >
            {award.primeDomain}
          </div>
        </div>
      </div>

      {/* Agency */}
      <div style={{ paddingRight: 8, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12.5,
            color: '#1C1917',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {award.agency}
        </div>
        <div style={{ fontSize: 11, color: '#A8A29E', marginTop: 1 }}>
          {award.place.city}, {award.place.state}
        </div>
      </div>

      {/* Scope */}
      <div>
        <Chip tone={scopeTone(award.scope)} size="sm">{scopeLabel(award.scope)}</Chip>
      </div>

      {/* Amount */}
      <div style={{ textAlign: 'right' }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#1C1917',
            fontFamily: "'JetBrains Mono', Consolas, monospace",
          }}
        >
          {fmtMoney(award.amount)}
        </span>
      </div>

      {/* Awarded date */}
      <div>
        <span style={{ fontSize: 12, color: '#57534E' }}>{fmtDate(award.awardDate)}</span>
      </div>

      {/* NAICS · set-aside */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 11.5,
            fontFamily: "'JetBrains Mono', Consolas, monospace",
            color: '#57534E',
          }}
        >
          {award.naics}
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#A8A29E',
            marginTop: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {award.setAside}
        </div>
      </div>

      {/* CRM status */}
      <div>
        <CrmStatusCell award={award} />
      </div>

      {/* Our potential */}
      <div style={{ textAlign: 'right' }}>
        {award.ourPotential.mid > 0 ? (
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: '#4F46E5',
              fontFamily: "'JetBrains Mono', Consolas, monospace",
            }}
          >
            {fmtMoney(award.ourPotential.mid)}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: '#A8A29E' }}>—</span>
        )}
      </div>

      {/* Last touch */}
      <div>
        <TouchCell lastTouch={award.lastTouch} lastTouchBy={award.lastTouchBy} />
      </div>

      {/* Add to Outreach */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleAddToOutreach}
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid #BFDBFE',
            background: hovered ? '#EFF6FF' : '#FFFFFF',
            color: '#2563EB',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'background 0.1s ease',
          }}
        >
          + Outreach
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AwardsPage() {
  const [range, setRange] = useState<TimeRange>('30d')
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all')
  const [crmFilter, setCrmFilter] = useState<CrmFilter>('all')
  const [contractTypeFilter, setContractTypeFilter] = useState<ContractTypeFilter>('all')
  const [setAsideFilter, setSetAsideFilter] = useState<SetAsideFilter>('all')
  const [search, setSearch] = useState('')
  const [awards, setAwards] = useState<Award[]>(AWARDS)

  useEffect(() => {
    async function loadAwards() {
      try {
        const [awardsApi, companiesRes, subawardsRes] = await Promise.allSettled([
          fetch(`/api/awards?range=${range}&type=${contractTypeFilter}`).then(r => r.json()),
          fetch('/api/intelligence/companies?limit=50').then(r => r.json()),
          fetch('/api/sources/subawards').then(r => r.json()),
        ])

        // Primary: use /api/awards if available
        if (awardsApi.status === 'fulfilled' && awardsApi.value.awards?.length) {
          setAwards(awardsApi.value.awards)
          return
        }

        // Fallback: build awards from intelligence companies
        const realAwards: Award[] = []

        if (companiesRes.status === 'fulfilled' && companiesRes.value.companies) {
          for (const c of companiesRes.value.companies) {
            realAwards.push({
              id: c.uei || c.company,
              prime: c.company,
              primeDomain: c.company.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com',
              agency: c.agencies?.[0] || 'Federal Agency',
              scope: 'federal',
              amount: c.largest_award || c.avg_contract || 0,
              awardDate: c.last_award || new Date().toISOString().split('T')[0],
              naics: c.naics || '561720',
              setAside: '',
              place: { city: c.city || '', state: c.state || '' },
              crmStatus: 'not-in-crm',
              lastTouch: null,
              lastTouchBy: null,
              ourPotential: { mid: Math.round((c.avg_contract || 0) * 0.15) },
            })
          }
        }

        if (realAwards.length > 0) setAwards(realAwards)
        // else keep MOCK_AWARDS (initial state)
      } catch (e) {
        console.error(e)
      }
    }
    loadAwards()
  }, [range, contractTypeFilter])

  const rangedAwards = useMemo(() => filterByRange(awards, range), [awards, range])

  const stats = useMemo(() => {
    const total = rangedAwards.length
    const totalAmount = rangedAwards.reduce((s, a) => s + a.amount, 0)
    const inCrm = rangedAwards.filter(a => a.crmStatus === 'in-crm-active' || a.crmStatus === 'in-crm-stale').length
    const notInCrm = rangedAwards.filter(a => a.crmStatus === 'not-in-crm').length
    const untouched30d = rangedAwards.filter(a => {
      const d = daysSince(a.lastTouch)
      return d === null || d > 30
    }).length
    const ourPotential = rangedAwards.reduce((s, a) => s + a.ourPotential.mid, 0)
    const crmCoverage = total > 0 ? Math.round((inCrm / total) * 100) : 0

    return { total, totalAmount, inCrm, notInCrm, untouched30d, ourPotential, crmCoverage }
  }, [rangedAwards])

  const filteredAwards = useMemo(() => {
    let result = rangedAwards

    if (scopeFilter !== 'all') {
      result = result.filter(a => a.scope === scopeFilter)
    }

    if (crmFilter === 'not-in-crm') {
      result = result.filter(a => a.crmStatus === 'not-in-crm')
    } else if (crmFilter === 'stale') {
      result = result.filter(a => a.crmStatus === 'in-crm-stale')
    } else if (crmFilter === 'untouched30d') {
      result = result.filter(a => {
        const d = daysSince(a.lastTouch)
        return d === null || d > 30
      })
    }

    if (contractTypeFilter === 'prime') {
      result = result.filter(a => a.amount > 500000)
    } else if (contractTypeFilter === 'sub') {
      result = result.filter(a => a.amount <= 500000)
    }

    if (setAsideFilter === 'small-business') {
      result = result.filter(a => a.setAside.toLowerCase().includes('small business'))
    } else if (setAsideFilter === 'sdvosb') {
      result = result.filter(a => a.setAside.toLowerCase().includes('sdvosb'))
    } else if (setAsideFilter === 'wosb') {
      result = result.filter(a => a.setAside.toLowerCase().includes('wosb'))
    } else if (setAsideFilter === 'open') {
      result = result.filter(a => a.setAside.toLowerCase().includes('open'))
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        a =>
          a.prime.toLowerCase().includes(q) ||
          a.agency.toLowerCase().includes(q) ||
          a.primeDomain.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q)
      )
    }

    return result
  }, [rangedAwards, scopeFilter, crmFilter, contractTypeFilter, setAsideFilter, search])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FAFAF9',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <TopBar
        notifications={[]}
        onMarkAllRead={() => {}}
        onClickNotif={() => {}}
        onOpenCopilot={() => {}}
        onOpenCmdK={() => {}}
      />

      <div style={{ padding: '32px 80px 80px' }}>

        {/* ── Page header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#A8A29E',
                marginBottom: 4,
              }}
            >
              Federal · state · local awards
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C1917', margin: 0, lineHeight: 1.2 }}>
              Recent Awards
            </h1>
            <p style={{ fontSize: 13, color: '#78716C', marginTop: 5, marginBottom: 0 }}>
              Who just won contracts · cross-checked against CRM · find untouched primes to reach out
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Time range toggle */}
            <div
              style={{
                display: 'inline-flex',
                background: '#F5F5F4',
                border: '1px solid #E7E5E4',
                borderRadius: 8,
                padding: 3,
                gap: 2,
              }}
            >
              {(['7d', '30d', '90d', '1y'] as TimeRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  style={{
                    padding: '5px 10px',
                    fontSize: 12,
                    fontWeight: range === r ? 600 : 400,
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    background: range === r ? '#FFFFFF' : 'transparent',
                    color: range === r ? '#1C1917' : '#78716C',
                    boxShadow: range === r ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'background 0.12s ease, color 0.12s ease',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>

            <Button variant="secondary" size="sm">
              Export CSV
            </Button>

            <Button variant="primary" size="sm">
              Subscribe to alerts
            </Button>
          </div>
        </div>

        {/* ── Source strip ── */}
        <Card pad={14} style={{ marginBottom: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>
              Sources
            </span>
            {AWARD_SOURCES.map(src => (
              <Tooltip key={src.id} tip={fmtSyncTime(src.lastSync)}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 10px',
                    background: '#F5F5F4',
                    border: '1px solid #E7E5E4',
                    borderRadius: 99,
                    fontSize: 12,
                    color: '#57534E',
                    cursor: 'default',
                  }}
                >
                  <StatusDot tone={src.live ? 'emerald' : 'amber'} size={7} pulse={src.live} />
                  <span>{src.name}</span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontFamily: "'JetBrains Mono', Consolas, monospace",
                      color: '#A8A29E',
                      background: '#FFFFFF',
                      border: '1px solid #E7E5E4',
                      borderRadius: 99,
                      padding: '1px 6px',
                    }}
                  >
                    {src.awards30d.toLocaleString()}
                  </span>
                </div>
              </Tooltip>
            ))}
          </div>
        </Card>

        {/* ── Stats row ── */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <StatCard
            label="Awards"
            value={stats.total.toString()}
            sub={`Last ${rangeLabel(range)}`}
          />
          <StatCard
            label="Total $"
            value={`$${(stats.totalAmount / 1_000_000).toFixed(1)}M`}
            sub="contract value"
          />
          <StatCard
            label="In CRM"
            value={`${stats.crmCoverage}%`}
            sub={`${stats.inCrm} of ${stats.total} tracked`}
            tone="emerald"
          />
          <StatCard
            label="Not in CRM"
            value={stats.notInCrm.toString()}
            sub="new targets"
            tone="indigo"
          />
          <StatCard
            label="Untouched > 30d"
            value={stats.untouched30d.toString()}
            sub="need outreach"
            tone="amber"
          />
          <StatCard
            label="Our potential"
            value={`$${Math.round(stats.ourPotential / 1_000)}k`}
            sub="estimated sub revenue"
            tone="indigo"
          />
        </div>

        {/* ── Filter bar ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 16,
            flexWrap: 'wrap',
          }}
        >
          <SegmentedControl
            options={[
              { label: 'All sources', value: 'all' },
              { label: 'Federal', value: 'federal' },
              { label: 'State', value: 'state' },
              { label: 'Local', value: 'local' },
            ]}
            value={scopeFilter}
            onChange={v => setScopeFilter(v as ScopeFilter)}
          />

          <SegmentedControl
            options={[
              { label: 'All status', value: 'all' },
              { label: 'Not in CRM', value: 'not-in-crm' },
              { label: 'Stale (no touch)', value: 'stale' },
              { label: 'Untouched > 30d', value: 'untouched30d' },
            ]}
            value={crmFilter}
            onChange={v => setCrmFilter(v as CrmFilter)}
          />

          <SegmentedControl
            options={[
              { label: 'All', value: 'all' },
              { label: 'Prime (>$500K)', value: 'prime' },
              { label: 'Sub target (<$500K)', value: 'sub' },
            ]}
            value={contractTypeFilter}
            onChange={v => setContractTypeFilter(v as ContractTypeFilter)}
          />

          <SegmentedControl
            options={[
              { label: 'All', value: 'all' },
              { label: 'Small Business', value: 'small-business' },
              { label: 'SDVOSB', value: 'sdvosb' },
              { label: 'WOSB', value: 'wosb' },
              { label: 'Open', value: 'open' },
            ]}
            value={setAsideFilter}
            onChange={v => setSetAsideFilter(v as SetAsideFilter)}
          />

          <div style={{ flex: 1 }} />

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 13 13"
              fill="none"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            >
              <circle cx="5.5" cy="5.5" r="4" stroke="#A8A29E" strokeWidth="1.3" />
              <path d="M9 9L12 12" stroke="#A8A29E" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search primes, agencies…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                paddingLeft: 30,
                paddingRight: 12,
                paddingTop: 7,
                paddingBottom: 7,
                fontSize: 12.5,
                border: '1px solid #E7E5E4',
                borderRadius: 8,
                background: '#FFFFFF',
                color: '#1C1917',
                outline: 'none',
                width: 220,
              }}
            />
          </div>
        </div>

        {/* ── Awards table ── */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E7E5E4',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          {/* Table header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.5fr 90px 90px 95px 130px 130px 90px 100px 110px',
              gap: 0,
              padding: '10px 16px',
              background: '#FAFAFB',
              borderBottom: '1px solid #E7E5E4',
            }}
          >
            {[
              'Prime contractor',
              'Agency',
              'Scope',
              'Amount',
              'Awarded',
              'NAICS · set-aside',
              'CRM status',
              'Our potential',
              'Last touch',
              '',
            ].map((h, i) => (
              <div
                key={h}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: '#A8A29E',
                  textAlign: i === 3 || i === 7 ? 'right' : 'left',
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Table rows */}
          {filteredAwards.length === 0 ? (
            <div
              style={{
                padding: '48px 0',
                textAlign: 'center',
                color: '#A8A29E',
                fontSize: 13,
              }}
            >
              No awards match the current filters.
            </div>
          ) : (
            filteredAwards.map((award, idx) => (
              <AwardRow
                key={award.id}
                award={award}
                isLast={idx === filteredAwards.length - 1}
              />
            ))
          )}

          {/* Table footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderTop: '1px solid #F5F5F4',
              background: '#FAFAFB',
            }}
          >
            <span style={{ fontSize: 12, color: '#78716C' }}>
              Showing <strong style={{ color: '#1C1917' }}>{filteredAwards.length}</strong> of{' '}
              <strong style={{ color: '#1C1917' }}>{rangedAwards.length}</strong> awards
            </span>
            <button
              style={{
                fontSize: 12,
                color: '#4F46E5',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 500,
                padding: 0,
              }}
            >
              View all in last {rangeLabel(range)} →
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
