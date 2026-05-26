'use client'

import { useState } from 'react'

// ─── Helpers ────────────────────────────────────────────────────────────────

function Chip({ children, tone = 'neutral', size = 'md' }: any) {
  const tones: any = {
    neutral: { bg: '#F5F5F4', fg: '#44403C', bd: '#E7E5E4' },
    indigo: { bg: '#EEF2FF', fg: '#4338CA', bd: '#E0E7FF' },
    emerald: { bg: '#ECFDF5', fg: '#047857', bd: '#D1FAE5' },
    amber: { bg: '#FFFBEB', fg: '#B45309', bd: '#FDE68A' },
    red: { bg: '#FEF2F2', fg: '#B91C1C', bd: '#FECACA' },
    blue: { bg: '#EFF6FF', fg: '#1D4ED8', bd: '#DBEAFE' },
  }
  const t = tones[tone] || tones.neutral
  const s = size === 'sm' ? { px: 6, py: 2, fs: 10.5 } : size === 'lg' ? { px: 10, py: 5, fs: 12.5 } : { px: 8, py: 3, fs: 11.5 }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: t.bg, color: t.fg, border: `1px solid ${t.bd}`, padding: `${s.py}px ${s.px}px`, fontSize: s.fs, fontWeight: 500, borderRadius: 5, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

function Card({ children, pad = 20, style = {} }: any) {
  return (
    <div style={{ background: '#FFF', border: '1px solid #E7E5E4', borderRadius: 10, padding: pad, ...style }}>
      {children}
    </div>
  )
}

function KV({ k, v, mono = false }: any) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px dashed #F5F5F4', gap: 16 }}>
      <span style={{ fontSize: 12, color: '#78716C' }}>{k}</span>
      <span style={{ fontSize: 13, color: '#1C1917', fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit', fontWeight: mono ? 500 : 400, textAlign: 'right' }}>{v || '—'}</span>
    </div>
  )
}

function Bar({ value, max = 100, tone = 'indigo', height = 6 }: any) {
  const colors: any = { indigo: '#4F46E5', emerald: '#059669', amber: '#D97706', red: '#DC2626' }
  return (
    <div style={{ width: '100%', height, background: '#F5F5F4', borderRadius: 999 }}>
      <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, height: '100%', background: colors[tone] || '#4F46E5', borderRadius: 999 }} />
    </div>
  )
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const CONTRACT = {
  id: 'C-2026-0098',
  prime: 'ABM Industries',
  agency: 'VA Medical Center Miami',
  amount: 3210000,
  periodStart: '2026-04-01',
  periodEnd: '2028-03-15',
  naics: '561720',
  naicsDesc: 'Janitorial Services',
  setAside: 'Small Business',
  obligated: 1740000,
  type: 'Definitive contract · FFP',
  sowSummary: 'Janitorial, custodial and floor-care services for VA Medical Center Miami (287,000 sqft) and 4 satellite outpatient clinics. Nightly, 7 days/week.',
  scope: {
    estSqft: 287000,
    frequency: 'Nightly · 7d/wk',
    ourSubValue: { low: 420000, high: 560000, mid: 490000 },
    pWin: 0.42,
  },
  capture: {
    pWin: 0.42,
    competitors: [
      { name: 'ABM Industries (incumbent)', pastWins: 8, threat: 'high' },
      { name: 'ServiceMaster FL Inc.', pastWins: 3, threat: 'medium' },
    ],
    colorReviews: [
      { name: 'Pink team', date: '2026-06-12', status: 'scheduled' },
      { name: 'Red team', date: '2026-06-26', status: 'pending' },
    ],
    gaps: [
      { area: 'HIPAA training docs', status: 'in-progress', owner: 'compliance' },
      { area: 'Past performance · VA work', status: 'blocked', owner: 'sarah.k' },
    ],
  },
}

const TABS = ['Overview', 'Capture', 'Scope', 'Subs', 'Teaming']

// ─── Cost breakdown mock ─────────────────────────────────────────────────────
const COST_BREAKDOWN = [
  { label: 'Direct Labor', amount: 294000, pct: 60 },
  { label: 'Fringe (28%)', amount: 82320, pct: 16.8 },
  { label: 'Overhead (12%)', amount: 45336, pct: 9.2 },
  { label: 'G&A (8%)', amount: 33650, pct: 6.9 },
  { label: 'Fee / Profit (7%)', amount: 34694, pct: 7.1 },
]

const SUBS_AVAILABLE = [
  { name: 'Costa Janitorial Services LLC', county: 'Miami-Dade', capacity: 'High', avgPrice: '$1.85/sqft/mo', status: 'Active' },
  { name: 'Cleantech Solutions Inc.', county: 'Miami-Dade', capacity: 'Medium', avgPrice: '$1.92/sqft/mo', status: 'Prospect' },
  { name: 'ProClean Commercial FL', county: 'Broward', capacity: 'Low', avgPrice: '$2.10/sqft/mo', status: 'Prospect' },
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ContractProfilePage() {
  const [activeTab, setActiveTab] = useState('Overview')
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const pWinPct = Math.round(CONTRACT.capture.pWin * 100)

  return (
    <div style={{ background: '#FAFAF9', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#FFF', borderBottom: '1px solid #E7E5E4', padding: '20px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#78716C', fontFamily: 'JetBrains Mono, monospace' }}>{CONTRACT.id}</span>
              <Chip tone="blue" size="sm">{CONTRACT.naics}</Chip>
              <Chip tone="indigo" size="sm">{CONTRACT.setAside}</Chip>
            </div>
            <div style={{ fontSize: 15, color: '#78716C', marginBottom: 4 }}>{CONTRACT.agency}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1C1917', fontFamily: 'JetBrains Mono, monospace' }}>
              ${(CONTRACT.amount / 1000000).toFixed(2)}M
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => showToast('Generating bid package...')}
              style={{ background: '#4F46E5', color: '#FFF', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Generate bid
            </button>
            <button
              onClick={() => showToast('Added to active capture')}
              style={{ background: '#FFF', color: '#1C1917', border: '1px solid #E7E5E4', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              Add to capture
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginTop: 20, borderBottom: '1px solid #E7E5E4' }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #4F46E5' : '2px solid transparent',
                color: activeTab === tab ? '#4F46E5' : '#78716C',
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: activeTab === tab ? 600 : 400,
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '28px 80px' }}>

        {/* ── Overview ── */}
        {activeTab === 'Overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Card>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>Contract Details</div>
                <KV k="Prime Contractor" v={CONTRACT.prime} />
                <KV k="Agency" v={CONTRACT.agency} />
                <KV k="Period" v={`${CONTRACT.periodStart} → ${CONTRACT.periodEnd}`} />
                <KV k="NAICS" v={`${CONTRACT.naics} — ${CONTRACT.naicsDesc}`} mono />
                <KV k="Set-Aside" v={CONTRACT.setAside} />
                <KV k="Type" v={CONTRACT.type} />
                <KV k="Obligated" v={`$${(CONTRACT.obligated / 1000000).toFixed(2)}M`} />
              </Card>

              <Card>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>SOW Summary</div>
                <p style={{ fontSize: 13, color: '#1C1917', lineHeight: 1.6 }}>{CONTRACT.sowSummary}</p>
              </Card>
            </div>

            {/* pWin Gauge */}
            <div>
              <Card>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16 }}>Win Probability</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
                  {/* Simple circular gauge via SVG */}
                  <svg width={96} height={96} viewBox="0 0 96 96">
                    <circle cx={48} cy={48} r={40} fill="none" stroke="#F5F5F4" strokeWidth={10} />
                    <circle
                      cx={48} cy={48} r={40}
                      fill="none"
                      stroke="#4F46E5"
                      strokeWidth={10}
                      strokeDasharray={`${(pWinPct / 100) * 251.2} 251.2`}
                      strokeLinecap="round"
                      transform="rotate(-90 48 48)"
                    />
                    <text x={48} y={53} textAnchor="middle" fontSize={18} fontWeight={700} fill="#1C1917">
                      {pWinPct}%
                    </text>
                  </svg>
                  <div>
                    <div style={{ fontSize: 13, color: '#78716C', marginBottom: 4 }}>Estimated probability of winning this contract based on incumbent threat, certifications, and past performance.</div>
                    <Chip tone={pWinPct >= 50 ? 'emerald' : pWinPct >= 30 ? 'amber' : 'red'}>
                      {pWinPct >= 50 ? 'Strong' : pWinPct >= 30 ? 'Moderate' : 'Low'} confidence
                    </Chip>
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Bar value={pWinPct} tone={pWinPct >= 50 ? 'emerald' : pWinPct >= 30 ? 'amber' : 'red'} height={8} />
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ── Capture ── */}
        {activeTab === 'Capture' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Competitors */}
            <Card>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 14 }}>Competitors</div>
              {CONTRACT.capture.competitors.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed #F5F5F4' }}>
                  <div style={{ fontSize: 13, color: '#1C1917', fontWeight: 500 }}>{c.name}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#78716C' }}>{c.pastWins} prior wins</span>
                    <Chip tone={c.threat === 'high' ? 'red' : c.threat === 'medium' ? 'amber' : 'neutral'} size="sm">
                      {c.threat} threat
                    </Chip>
                  </div>
                </div>
              ))}
            </Card>

            {/* Color Reviews */}
            <Card>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 14 }}>Color Reviews</div>
              {CONTRACT.capture.colorReviews.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed #F5F5F4' }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#1C1917', fontWeight: 500 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: '#A8A29E', marginTop: 2 }}>{r.date}</div>
                  </div>
                  <Chip tone={r.status === 'scheduled' ? 'blue' : r.status === 'complete' ? 'emerald' : 'neutral'} size="sm">
                    {r.status}
                  </Chip>
                </div>
              ))}
            </Card>

            {/* Capability Gaps */}
            <Card>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 14 }}>Capability Gaps</div>
              {CONTRACT.capture.gaps.map((g, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed #F5F5F4' }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#1C1917', fontWeight: 500 }}>{g.area}</div>
                    <div style={{ fontSize: 11, color: '#A8A29E', marginTop: 2 }}>Owner: {g.owner}</div>
                  </div>
                  <Chip tone={g.status === 'in-progress' ? 'amber' : g.status === 'blocked' ? 'red' : 'emerald'} size="sm">
                    {g.status}
                  </Chip>
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* ── Scope ── */}
        {activeTab === 'Scope' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Card>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>Scope Details</div>
              <KV k="Est. Square Footage" v={`${CONTRACT.scope.estSqft.toLocaleString()} sqft`} />
              <KV k="Frequency" v={CONTRACT.scope.frequency} />
              <KV k="Sub Value (Low)" v={`$${(CONTRACT.scope.ourSubValue.low / 1000).toFixed(0)}K`} />
              <KV k="Sub Value (Mid)" v={`$${(CONTRACT.scope.ourSubValue.mid / 1000).toFixed(0)}K`} />
              <KV k="Sub Value (High)" v={`$${(CONTRACT.scope.ourSubValue.high / 1000).toFixed(0)}K`} />

              <div style={{ marginTop: 14, padding: '12px', background: '#EEF2FF', borderRadius: 7 }}>
                <div style={{ fontSize: 11, color: '#4338CA', fontWeight: 600, marginBottom: 4 }}>Estimated Sub Value Range</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#4338CA', fontFamily: 'JetBrains Mono, monospace' }}>
                  ${(CONTRACT.scope.ourSubValue.low / 1000).toFixed(0)}K – ${(CONTRACT.scope.ourSubValue.high / 1000).toFixed(0)}K
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 14 }}>Cost Breakdown (Mid Estimate)</div>
              {COST_BREAKDOWN.map((row, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#78716C' }}>{row.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1C1917', fontFamily: 'JetBrains Mono, monospace' }}>
                      ${row.amount.toLocaleString()} <span style={{ color: '#A8A29E', fontWeight: 400 }}>({row.pct}%)</span>
                    </span>
                  </div>
                  <Bar value={row.pct} tone="indigo" height={4} />
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* ── Subs ── */}
        {activeTab === 'Subs' && (
          <Card>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16 }}>Available Subcontractors</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E7E5E4' }}>
                  {['Name', 'County', 'Capacity', 'Avg Price', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 600, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SUBS_AVAILABLE.map((sub, i) => (
                  <tr key={i} style={{ borderBottom: '1px dashed #F5F5F4' }}>
                    <td style={{ padding: '10px 12px', color: '#1C1917', fontWeight: 500 }}>{sub.name}</td>
                    <td style={{ padding: '10px 12px', color: '#78716C' }}>{sub.county}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <Chip tone={sub.capacity === 'High' ? 'emerald' : sub.capacity === 'Medium' ? 'amber' : 'red'} size="sm">{sub.capacity}</Chip>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#1C1917', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{sub.avgPrice}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <Chip tone={sub.status === 'Active' ? 'emerald' : 'neutral'} size="sm">{sub.status}</Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* ── Teaming ── */}
        {activeTab === 'Teaming' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => showToast('Teaming request sent')}
                style={{ background: '#4F46E5', color: '#FFF', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Request teaming
              </button>
            </div>
            <Card>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 14 }}>Existing Teaming Relationships</div>
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#A8A29E', fontSize: 13 }}>
                No teaming relationships established yet for this contract.
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#1C1917', color: '#FFF', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
