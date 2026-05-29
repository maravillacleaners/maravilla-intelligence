'use client'

import { useState, useEffect } from 'react'

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

function Bar({ value, max = 100, tone = 'indigo', height = 6 }: any) {
  const colors: any = { indigo: '#4F46E5', emerald: '#059669', amber: '#D97706', red: '#DC2626', blue: '#2563EB' }
  return (
    <div style={{ width: '100%', height, background: '#F5F5F4', borderRadius: 999 }}>
      <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, height: '100%', background: colors[tone] || '#4F46E5', borderRadius: 999 }} />
    </div>
  )
}

function SectionHeader({ children }: any) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: '#A8A29E', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>
      {children}
    </div>
  )
}

function Th({ children }: any) {
  return (
    <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 600, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E7E5E4', whiteSpace: 'nowrap' }}>
      {children}
    </th>
  )
}

function Td({ children, mono = false, align = 'left' }: any) {
  return (
    <td style={{ padding: '9px 12px', fontSize: 13, color: '#1C1917', fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit', borderBottom: '1px dashed #F5F5F4', textAlign: align as any }}>
      {children}
    </td>
  )
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const colors = ['#4F46E5', '#059669', '#D97706', '#DC2626', '#2563EB', '#7C3AED']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div style={{ width: 28, height: 28, borderRadius: '50%', background: color, color: '#FFF', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {initials}
    </div>
  )
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const INSIGHTS = {
  pipeline: [
    { stage: 'Replied', count: 14, mrr: 48200, prob: 0.72 },
    { stage: 'Proposal', count: 8, mrr: 92400, prob: 0.55 },
    { stage: 'Approved', count: 3, mrr: 38700, prob: 0.91 },
    { stage: 'Contacted', count: 27, mrr: 61300, prob: 0.28 },
    { stage: 'Pending', count: 41, mrr: 112800, prob: 0.14 },
  ],
  leaderboard: [
    { name: 'Sarah Kim', approved: 12, contacted: 38, won: 7, mrr: 28400, convRate: 0.184 },
    { name: 'Marcus Torres', approved: 9, contacted: 29, won: 5, mrr: 19600, convRate: 0.172 },
    { name: 'Priya Nair', approved: 7, contacted: 44, won: 4, mrr: 15200, convRate: 0.091 },
    { name: 'James Okafor', approved: 5, contacted: 22, won: 3, mrr: 11800, convRate: 0.136 },
    { name: 'Elena Cruz', approved: 3, contacted: 18, won: 1, mrr: 4200, convRate: 0.056 },
  ],
  leadSources: [
    { source: 'SAM.gov scrape', count: 84, closeRate: 0.21, avgTicket: 4800, totalMrr: 84672 },
    { source: 'LinkedIn outbound', count: 47, closeRate: 0.15, avgTicket: 3200, totalMrr: 22560 },
    { source: 'Referral', count: 22, closeRate: 0.41, avgTicket: 6100, totalMrr: 54981 },
    { source: 'Inbound website', count: 18, closeRate: 0.33, avgTicket: 2900, totalMrr: 17226 },
    { source: 'Google Ads', count: 31, closeRate: 0.13, avgTicket: 2100, totalMrr: 8463 },
  ],
  abTests: [
    { variant: 'Control — Generic intro', sent: 240, openPct: 0.31, replyPct: 0.06, bookedPct: 0.02, winner: false },
    { variant: 'Variant A — Pain-led subject', sent: 240, openPct: 0.44, replyPct: 0.11, bookedPct: 0.04, winner: false },
    { variant: 'Variant B — Social proof + CTA', sent: 240, openPct: 0.52, replyPct: 0.17, bookedPct: 0.07, winner: true },
  ],
  geoNeighborhoods: [
    { name: 'Brickell', mrr: 42000 },
    { name: 'Coral Gables', mrr: 31000 },
    { name: 'Doral', mrr: 28500 },
    { name: 'Miami Beach', mrr: 24800 },
    { name: 'Aventura', mrr: 18200 },
    { name: 'Kendall', mrr: 14600 },
    { name: 'Hialeah', mrr: 9400 },
    { name: 'Homestead', mrr: 4200 },
  ],
  recompetes: [
    { contract: 'GSA Region 4 · Janitorial', agency: 'GSA', amount: 740000, expiresDate: '2026-08-12', daysUntil: 78 },
    { contract: 'VA Miami OPC Cleaning', agency: 'VA', amount: 480000, expiresDate: '2026-07-01', daysUntil: 37 },
    { contract: 'CBP Miami Field Office', agency: 'DHS', amount: 290000, expiresDate: '2026-06-15', daysUntil: 21 },
    { contract: 'IRS Doral Service Center', agency: 'IRS', amount: 180000, expiresDate: '2026-09-30', daysUntil: 128 },
  ],
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, tone = 'indigo' }: any) {
  const accent: any = { indigo: '#4F46E5', emerald: '#059669', amber: '#D97706', red: '#DC2626' }
  return (
    <Card pad={18}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent[tone] || '#1C1917', fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#A8A29E', marginTop: 4 }}>{sub}</div>}
    </Card>
  )
}

// ─── Analytics API types ─────────────────────────────────────────────────────

interface AnalyticsData {
  totalProspects: number
  totalContracts: number
  totalSubs: number
  averageScore: number
  scoreDistribution: { high: number; medium: number; low: number }
  bySegment: { [key: string]: number }
  byStatus: { [key: string]: number }
  topOpportunities: Array<{ name: string; value: number; agency?: string }>
}

const INITIAL_ANALYTICS: AnalyticsData = {
  totalProspects: 3,
  totalContracts: 0,
  totalSubs: 0,
  averageScore: 78,
  scoreDistribution: { high: 1, medium: 1, low: 1 },
  bySegment: { Federal: 1, State: 1, Local: 1 },
  byStatus: { qualified: 1, interested: 1, pending: 1 },
  topOpportunities: [],
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData>(INITIAL_ANALYTICS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then((res) => res.json())
      .then((json: any) => {
        if (json.success && json.data) {
          setAnalytics(json.data)
        }
      })
      .catch((err) => {
        console.warn('[Analytics] fetch failed, using mock data', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const totalWeightedMrr = INSIGHTS.pipeline.reduce((sum, row) => sum + row.mrr * row.prob, 0)
  const totalPipelineMrr = INSIGHTS.pipeline.reduce((sum, row) => sum + row.mrr, 0)
  const topLeader = INSIGHTS.leaderboard[0]
  const maxGeoMrr = Math.max(...INSIGHTS.geoNeighborhoods.map(g => g.mrr))

  return (
    <div style={{ background: '#FAFAF9', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#FFF', borderBottom: '1px solid #E7E5E4', padding: '20px 80px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1C1917', margin: 0, marginBottom: 4 }}>Insights Dashboard</h1>
        <div style={{ fontSize: 13, color: '#78716C' }}>
          Pipeline analytics, team performance, and market intelligence
          {loading && <span style={{ marginLeft: 10, color: '#A8A29E' }}>Loading real data…</span>}
        </div>
      </div>

      <div style={{ padding: '28px 80px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <StatCard label="Total Prospects" value={analytics.totalProspects} sub={`avg score ${analytics.averageScore}`} tone="indigo" />
          <StatCard label="Total Contracts" value={analytics.totalContracts} sub="active contracts" tone="blue" />
          <StatCard label="Total Subs" value={analytics.totalSubs} sub="subcontractors" tone="emerald" />
          <StatCard label="Recompetes" value={INSIGHTS.recompetes.length} sub="contracts expiring soon" tone="amber" />
        </div>

        {/* ── Revenue Forecast ── */}
        <Card>
          <SectionHeader>Revenue Forecast by Pipeline Stage</SectionHeader>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <Th>Stage</Th>
                <Th>Deals</Th>
                <Th>Pipeline MRR</Th>
                <Th>Close Prob</Th>
                <Th>Weighted MRR</Th>
              </tr>
            </thead>
            <tbody>
              {INSIGHTS.pipeline.map((row, i) => {
                const weighted = row.mrr * row.prob
                const stageTone = row.stage === 'Approved' ? 'emerald' : row.stage === 'Replied' || row.stage === 'Proposal' ? 'indigo' : 'neutral'
                return (
                  <tr key={i}>
                    <Td><Chip tone={stageTone} size="sm">{row.stage}</Chip></Td>
                    <Td mono>{row.count}</Td>
                    <Td mono>${row.mrr.toLocaleString()}</Td>
                    <Td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Bar value={row.prob * 100} tone={row.prob >= 0.7 ? 'emerald' : row.prob >= 0.4 ? 'amber' : 'indigo'} height={5} />
                        <span style={{ fontSize: 11, color: '#78716C', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>{Math.round(row.prob * 100)}%</span>
                      </div>
                    </Td>
                    <Td mono><span style={{ fontWeight: 700, color: '#4F46E5' }}>${Math.round(weighted).toLocaleString()}</span></Td>
                  </tr>
                )
              })}
              <tr style={{ borderTop: '2px solid #E7E5E4' }}>
                <td colSpan={4} style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#78716C', textAlign: 'right' }}>Total Weighted MRR</td>
                <td style={{ padding: '10px 12px', fontSize: 15, fontWeight: 800, color: '#4F46E5', fontFamily: 'JetBrains Mono, monospace' }}>
                  ${Math.round(totalWeightedMrr).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </Card>

        {/* ── Team Leaderboard ── */}
        <Card>
          <SectionHeader>Team Leaderboard</SectionHeader>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>Rep</Th>
                <Th>Approved</Th>
                <Th>Contacted</Th>
                <Th>Won</Th>
                <Th>MRR</Th>
                <Th>Conv Rate</Th>
              </tr>
            </thead>
            <tbody>
              {INSIGHTS.leaderboard.map((rep, i) => {
                const convPct = Math.round(rep.convRate * 100)
                const convTone = convPct >= 15 ? 'emerald' : convPct >= 10 ? 'amber' : 'red'
                return (
                  <tr key={i}>
                    <Td><span style={{ fontSize: 12, fontWeight: 600, color: '#A8A29E' }}>#{i + 1}</span></Td>
                    <Td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={rep.name} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#1C1917' }}>{rep.name}</span>
                      </div>
                    </Td>
                    <Td mono>{rep.approved}</Td>
                    <Td mono>{rep.contacted}</Td>
                    <Td mono>{rep.won}</Td>
                    <Td mono>${rep.mrr.toLocaleString()}</Td>
                    <Td>
                      <Chip tone={convTone} size="sm">{convPct}%</Chip>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>

        {/* ── Lead Source Cohorts ── */}
        <Card>
          <SectionHeader>Lead Source Cohorts</SectionHeader>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <Th>Source</Th>
                <Th>Leads</Th>
                <Th>Close Rate</Th>
                <Th>Avg Ticket</Th>
                <Th>Total MRR</Th>
              </tr>
            </thead>
            <tbody>
              {INSIGHTS.leadSources.map((src, i) => (
                <tr key={i}>
                  <Td><span style={{ fontWeight: 500 }}>{src.source}</span></Td>
                  <Td mono>{src.count}</Td>
                  <Td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Bar value={src.closeRate * 100} tone={src.closeRate >= 0.3 ? 'emerald' : src.closeRate >= 0.2 ? 'amber' : 'indigo'} height={5} />
                      <span style={{ fontSize: 11, color: '#78716C', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>{Math.round(src.closeRate * 100)}%</span>
                    </div>
                  </Td>
                  <Td mono>${src.avgTicket.toLocaleString()}</Td>
                  <Td mono><span style={{ fontWeight: 700, color: '#1C1917' }}>${src.totalMrr.toLocaleString()}</span></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* ── A/B Test Results ── */}
        <Card>
          <SectionHeader>A/B Test Results — Outreach Sequences</SectionHeader>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <Th>Variant</Th>
                <Th>Sent</Th>
                <Th>Opened</Th>
                <Th>Replied</Th>
                <Th>Booked</Th>
                <Th>Result</Th>
              </tr>
            </thead>
            <tbody>
              {INSIGHTS.abTests.map((v, i) => (
                <tr key={i} style={{ background: v.winner ? '#F0FDF4' : 'transparent' }}>
                  <Td>
                    <span style={{ fontSize: 13, fontWeight: v.winner ? 600 : 400, color: '#1C1917' }}>{v.variant}</span>
                  </Td>
                  <Td mono>{v.sent}</Td>
                  <Td mono>{Math.round(v.openPct * 100)}%</Td>
                  <Td mono>{Math.round(v.replyPct * 100)}%</Td>
                  <Td mono>{Math.round(v.bookedPct * 100)}%</Td>
                  <Td>
                    {v.winner ? <Chip tone="emerald" size="sm">Winner</Chip> : <span style={{ fontSize: 12, color: '#A8A29E' }}>—</span>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* ── Bottom Row: Geo + Recompetes ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Geo Heatmap */}
          <Card>
            <SectionHeader>Geo Distribution — MRR by Neighborhood</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {INSIGHTS.geoNeighborhoods.map((g, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#1C1917', fontWeight: 500 }}>{g.name}</span>
                    <span style={{ fontSize: 11, color: '#78716C', fontFamily: 'JetBrains Mono, monospace' }}>${(g.mrr / 1000).toFixed(1)}K</span>
                  </div>
                  <Bar value={g.mrr} max={maxGeoMrr} tone="indigo" height={6} />
                </div>
              ))}
            </div>
          </Card>

          {/* Recompetes Feed */}
          <Card>
            <SectionHeader>Recompetes — Contracts Expiring Soon</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[...INSIGHTS.recompetes].sort((a, b) => a.daysUntil - b.daysUntil).map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed #F5F5F4' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#1C1917' }}>{r.contract}</div>
                    <div style={{ fontSize: 11, color: '#A8A29E', marginTop: 2 }}>{r.agency} · Expires {r.expiresDate}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1C1917', fontFamily: 'JetBrains Mono, monospace' }}>${(r.amount / 1000).toFixed(0)}K</span>
                    <Chip
                      tone={r.daysUntil <= 30 ? 'red' : r.daysUntil <= 60 ? 'amber' : 'neutral'}
                      size="sm"
                    >
                      {r.daysUntil}d
                    </Chip>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Score Distribution (real API data) ── */}
        <Card>
          <SectionHeader>Score Distribution</SectionHeader>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#059669', fontFamily: 'JetBrains Mono, monospace' }}>{analytics.scoreDistribution.high}</div>
              <div style={{ fontSize: 11, color: '#78716C', marginTop: 4 }}>High (≥75)</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#D97706', fontFamily: 'JetBrains Mono, monospace' }}>{analytics.scoreDistribution.medium}</div>
              <div style={{ fontSize: 11, color: '#78716C', marginTop: 4 }}>Medium (50–74)</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#DC2626', fontFamily: 'JetBrains Mono, monospace' }}>{analytics.scoreDistribution.low}</div>
              <div style={{ fontSize: 11, color: '#78716C', marginTop: 4 }}>Low (&lt;50)</div>
            </div>
          </div>
        </Card>

        {/* ── Segment & Status Breakdown (real API data) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Card>
            <SectionHeader>By Segment</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(analytics.bySegment).map(([seg, count], i) => {
                const maxCount = Math.max(...Object.values(analytics.bySegment))
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: '#1C1917', fontWeight: 500 }}>{seg}</span>
                      <span style={{ fontSize: 11, color: '#78716C', fontFamily: 'JetBrains Mono, monospace' }}>{count}</span>
                    </div>
                    <Bar value={count} max={maxCount || 1} tone="indigo" height={6} />
                  </div>
                )
              })}
            </div>
          </Card>

          <Card>
            <SectionHeader>By Status</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(analytics.byStatus).map(([status, count], i) => {
                const maxCount = Math.max(...Object.values(analytics.byStatus))
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: '#1C1917', fontWeight: 500, textTransform: 'capitalize' }}>{status}</span>
                      <span style={{ fontSize: 11, color: '#78716C', fontFamily: 'JetBrains Mono, monospace' }}>{count}</span>
                    </div>
                    <Bar value={count} max={maxCount || 1} tone="blue" height={6} />
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* ── Top Opportunities (real API data) ── */}
        {analytics.topOpportunities.length > 0 && (
          <Card>
            <SectionHeader>Top Opportunities</SectionHeader>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <Th>Company</Th>
                  <Th>Agency</Th>
                  <Th>Contract Value</Th>
                </tr>
              </thead>
              <tbody>
                {analytics.topOpportunities.map((opp, i) => (
                  <tr key={i}>
                    <Td><span style={{ fontWeight: 500 }}>{opp.name}</span></Td>
                    <Td>{opp.agency || '—'}</Td>
                    <Td mono><span style={{ fontWeight: 700, color: '#4F46E5' }}>${opp.value.toLocaleString()}</span></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

      </div>
    </div>
  )
}
