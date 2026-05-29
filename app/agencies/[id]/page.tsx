'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

const C = {
  bg: '#FAFAF9', surface: '#FFFFFF', border: '#E7E5E4',
  text: '#1C1917', muted: '#78716C', faint: '#A8A29E',
  indigo: '#4F46E5', indigoLight: '#EEF2FF', indigoBorder: '#C7D2FE', indigoDark: '#3730A3',
  green: '#16A34A', greenLight: '#DCFCE7', greenBorder: '#BBF7D0',
  amber: '#D97706', amberLight: '#FEF3C7', amberBorder: '#FDE68A',
  red: '#DC2626', redLight: '#FEE2E2', redBorder: '#FECACA',
  blue: '#2563EB', blueLight: '#DBEAFE', blueBorder: '#BFDBFE',
  purple: '#7C3AED', purpleLight: '#F5F3FF', purpleBorder: '#DDD6FE',
}

interface TopRecipient { name: string; total: number; count: number }
interface NaicsEntry { code: string; count: number }
interface RecentAward {
  award_id: string; recipient: string; amount: number;
  naics: string; date: string; description: string; state: string
}
interface ContactToFind { title: string; department: string; relevance: string }
interface AgencyData {
  agency: {
    name: string; slug: string; total_spend: number; contract_count: number;
    fl_spend: number; fl_contract_count: number; cleaning_spend: number;
    cleaning_count: number; score: number; years_active: number[]
  }
  ai: {
    why_matters: string; opportunity_signals: string[]; procurement_pattern: string;
    recompete_likelihood: 'high' | 'medium' | 'low'; recommended_approach: string;
    contacts_to_find: ContactToFind[]
  }
  top_recipients: TopRecipient[]
  naics_distribution: NaicsEntry[]
  recent_awards: RecentAward[]
  airtable_opportunities: { id: string; [key: string]: unknown }[]
  airtable_intel: { id: string; [key: string]: unknown }[]
}

type TabId = 'overview' | 'awards' | 'recipients' | 'contacts'

function fmtVal(n: number): string {
  if (!n) return '—'
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${n.toLocaleString()}`
}

function fmtDate(s: string): string {
  if (!s) return '—'
  try { return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return s }
}

function Skeleton({ h = 16, w = '100%', radius = 6 }: { h?: number; w?: string | number; radius?: number }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: radius,
      background: 'linear-gradient(90deg,#F5F5F4 25%,#E7E5E4 50%,#F5F5F4 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
    }} />
  )
}

function MetricCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div style={{
      background: accent ? C.indigoLight : C.surface,
      border: `1px solid ${accent ? C.indigoBorder : C.border}`,
      borderRadius: 10, padding: '14px 18px', flex: 1, minWidth: 120,
    }}>
      <div style={{ fontSize: 11, color: accent ? C.indigo : C.muted, marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: accent ? C.indigo : C.text, lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.faint, marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function ScoreArc({ score }: { score: number }) {
  const color = score >= 70 ? C.indigo : score >= 40 ? C.amber : C.red
  const bg = score >= 70 ? C.indigoLight : score >= 40 ? C.amberLight : C.redLight
  return (
    <div style={{
      width: 80, height: 80, borderRadius: '50%', background: bg,
      border: `4px solid ${color}`, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
      <span style={{ fontSize: 11, color, opacity: 0.7 }}>relevance</span>
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: C.faint, letterSpacing: '0.06em', marginBottom: 14, textTransform: 'uppercase' }}>
      {title}
    </div>
  )
}

export default function AgencyProfile() {
  const params = useParams()
  const router = useRouter()
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id
  const agencyName = decodeURIComponent(rawId || '')

  const [data, setData] = useState<AgencyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<TabId>('overview')

  useEffect(() => {
    if (!rawId) return
    setLoading(true)
    fetch(`/api/agencies/${rawId}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) { setError(d.error); return }; setData(d) })
      .catch(() => setError('Failed to load agency profile'))
      .finally(() => setLoading(false))
  }, [rawId])

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'awards', label: 'Recent Awards', count: data?.recent_awards.length },
    { id: 'recipients', label: 'Top Recipients', count: data?.top_recipients.length },
    { id: 'contacts', label: 'Contacts' },
  ]

  const recompeteColor = data?.ai.recompete_likelihood === 'high' ? C.green
    : data?.ai.recompete_likelihood === 'medium' ? C.amber : C.red

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* Top bar */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: '0 32px', display: 'flex', alignItems: 'center', height: 56, gap: 12,
      }}>
        <button onClick={() => router.back()} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
          borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface,
          color: C.muted, fontSize: 13, cursor: 'pointer',
        }}>← Back</button>
        <span style={{ color: C.faint, fontSize: 13 }}>Agencies</span>
        <span style={{ color: C.faint, fontSize: 13 }}>›</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{loading ? '…' : agencyName}</span>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px' }}>
        {error && (
          <div style={{
            background: C.redLight, border: `1px solid ${C.redBorder}`,
            borderRadius: 10, padding: '20px', color: C.red, fontSize: 14,
          }}>{error}</div>
        )}

        {loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Skeleton h={28} w={320} /><Skeleton h={14} w={200} />
            <div style={{ display: 'flex', gap: 12 }}><Skeleton h={90} /><Skeleton h={90} /><Skeleton h={90} /><Skeleton h={90} /></div>
            <Skeleton h={130} /><Skeleton h={200} />
          </div>
        )}

        {data && !loading && (
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

            {/* Main column */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Agency header */}
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: '24px 28px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
                  {/* Icon */}
                  <div style={{
                    width: 68, height: 68, borderRadius: 16,
                    background: C.purpleLight, border: `2px solid ${C.purpleBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 32, flexShrink: 0,
                  }}>🏛</div>

                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>
                        {data.agency.name}
                      </h1>
                      <span style={{
                        background: C.purpleLight, color: C.purple,
                        border: `1px solid ${C.purpleBorder}`,
                        borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600,
                      }}>Federal Agency</span>
                    </div>
                    <div style={{ fontSize: 13, color: C.muted, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      <span>📋 {data.agency.contract_count} awards (2020–2026)</span>
                      {data.agency.years_active.length > 0 && (
                        <span>📅 Active {Math.min(...data.agency.years_active)}–{Math.max(...data.agency.years_active)}</span>
                      )}
                      {data.agency.fl_contract_count > 0 && (
                        <span>📍 {data.agency.fl_contract_count} FL contracts</span>
                      )}
                    </div>
                  </div>

                  <ScoreArc score={data.agency.score} />
                </div>

                {/* Metrics */}
                <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
                  <MetricCard label="Total Spend" value={fmtVal(data.agency.total_spend)} sub="All awards 2020-2026" />
                  <MetricCard label="FL Spend" value={fmtVal(data.agency.fl_spend)} sub="Florida operations" accent={data.agency.fl_spend > 0} />
                  <MetricCard label="Janitorial Awards" value={String(data.agency.cleaning_count || '—')} sub={fmtVal(data.agency.cleaning_spend)} accent={data.agency.cleaning_count > 0} />
                  <MetricCard label="Contract Count" value={String(data.agency.contract_count)} sub="Federal awards" />
                </div>

                {/* Why This Matters */}
                <div style={{
                  marginTop: 20, background: C.purpleLight,
                  border: `1px solid ${C.purpleBorder}`, borderRadius: 10, padding: '18px 20px',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.purple, marginBottom: 10, letterSpacing: 0.5 }}>
                    ⚡ WHY THIS AGENCY MATTERS
                  </div>
                  <p style={{ margin: '0 0 16px', fontSize: 14, color: '#4C1D95', lineHeight: 1.6 }}>
                    {data.ai.why_matters}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 8 }}>✓ OPPORTUNITY SIGNALS</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {(data.ai.opportunity_signals || []).map((s, i) => (
                          <div key={i} style={{ fontSize: 12, color: C.text, display: 'flex', gap: 6 }}>
                            <span style={{ color: C.green, fontWeight: 700 }}>+</span>{s}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8 }}>PROCUREMENT PATTERN</div>
                      <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>
                        {data.ai.procurement_pattern}
                      </div>
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4 }}>RECOMPETE LIKELIHOOD</div>
                        <span style={{
                          fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                          background: `${recompeteColor}18`, color: recompeteColor,
                        }}>{data.ai.recompete_likelihood?.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    marginTop: 14, borderTop: `1px solid ${C.purpleBorder}`, paddingTop: 14,
                    fontSize: 13, color: '#4C1D95', fontWeight: 500,
                  }}>
                    → <strong>Recommended approach:</strong> {data.ai.recommended_approach}
                  </div>
                </div>

                {/* CTAs */}
                <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {[
                    { label: 'View Awards', icon: '📋', onClick: () => setTab('awards') },
                    { label: 'Top Recipients', icon: '🏢', onClick: () => setTab('recipients') },
                    { label: 'Find Contacts', icon: '👤', onClick: () => setTab('contacts') },
                    { label: 'Search Contracts', icon: '🔍', onClick: () => window.open(`https://www.usaspending.gov/agency/${encodeURIComponent(data.agency.name)}`, '_blank') },
                  ].map((btn) => (
                    <button key={btn.label} onClick={btn.onClick} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                      borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      border: `1px solid ${C.border}`, background: C.surface, color: C.text,
                    }}>
                      <span>{btn.icon}</span>{btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}` }}>
                {tabs.map((t) => (
                  <button key={t.id} onClick={() => setTab(t.id)} style={{
                    padding: '10px 18px', fontSize: 13,
                    fontWeight: tab === t.id ? 600 : 400,
                    color: tab === t.id ? C.indigo : C.muted,
                    background: 'transparent', border: 'none',
                    borderBottom: tab === t.id ? `2px solid ${C.indigo}` : '2px solid transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {t.label}
                    {t.count !== undefined && t.count > 0 && (
                      <span style={{
                        background: tab === t.id ? C.indigoLight : '#F5F5F4',
                        color: tab === t.id ? C.indigo : C.faint,
                        borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 600,
                      }}>{t.count}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Overview tab */}
              {tab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* NAICS distribution */}
                  {data.naics_distribution.length > 0 && (
                    <div style={{
                      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '20px',
                    }}>
                      <SectionHeader title="NAICS Distribution" />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {data.naics_distribution.map((n) => {
                          const pct = Math.round((n.count / data.agency.contract_count) * 100)
                          const isJanitorial = n.code.startsWith('561')
                          return (
                            <div key={n.code} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{
                                fontSize: 12, fontFamily: 'monospace', fontWeight: 600,
                                width: 64, flexShrink: 0,
                                color: isJanitorial ? C.green : C.muted,
                              }}>
                                {n.code}
                                {isJanitorial && <span style={{ marginLeft: 4, fontSize: 10 }}>★</span>}
                              </span>
                              <div style={{ flex: 1, height: 8, background: '#F5F5F4', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%', width: `${Math.min(pct, 100)}%`,
                                  background: isJanitorial ? C.green : C.indigo, borderRadius: 4,
                                }} />
                              </div>
                              <span style={{ fontSize: 12, color: C.muted, width: 60, textAlign: 'right', flexShrink: 0 }}>
                                {n.count} awards
                              </span>
                            </div>
                          )
                        })}
                      </div>
                      <div style={{ fontSize: 11, color: C.green, marginTop: 10 }}>★ NAICS 561xxx = Janitorial / Facilities overlap</div>
                    </div>
                  )}

                  {/* Linked opportunities */}
                  {data.airtable_opportunities.length > 0 && (
                    <div style={{
                      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '20px',
                    }}>
                      <SectionHeader title="Pipeline Opportunities" />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {data.airtable_opportunities.slice(0, 5).map((opp) => (
                          <div key={opp.id} style={{
                            padding: '10px 12px', background: C.bg, borderRadius: 8,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13,
                          }}>
                            <span style={{ color: C.text }}>{String(opp.title || opp.bid_id || '—')}</span>
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                              background: C.greenLight, color: C.green,
                            }}>{String(opp.status || 'New')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Awards tab */}
              {tab === 'awards' && (
                <div style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 10, overflow: 'hidden',
                }}>
                  {data.recent_awards.length === 0 ? (
                    <div style={{ padding: '48px 24px', textAlign: 'center', color: C.muted }}>
                      No federal contract records found for this agency.
                    </div>
                  ) : (
                    <>
                      <div style={{
                        background: '#FAFAFB', borderBottom: `1px solid ${C.border}`, padding: '10px 16px',
                        display: 'grid', gridTemplateColumns: '1fr 160px 100px 80px 80px', gap: 12,
                      }}>
                        {['Recipient', 'Description', 'Amount', 'NAICS', 'Date'].map((h) => (
                          <div key={h} style={{ fontSize: 11, fontWeight: 600, color: C.faint, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {h}
                          </div>
                        ))}
                      </div>
                      {data.recent_awards.map((a, i) => (
                        <div key={`${a.award_id}-${i}`} style={{
                          padding: '12px 16px',
                          borderBottom: i < data.recent_awards.length - 1 ? `1px solid ${C.border}` : 'none',
                          display: 'grid', gridTemplateColumns: '1fr 160px 100px 80px 80px', gap: 12,
                          alignItems: 'start',
                        }}>
                          <div
                            style={{ fontSize: 13, fontWeight: 600, color: C.indigo, cursor: 'pointer' }}
                            onClick={() => router.push(`/companies/${encodeURIComponent(a.recipient)}`)}
                          >{a.recipient || '—'}</div>
                          <div style={{ fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.description || '—'}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{fmtVal(a.amount)}</div>
                          <div style={{
                            fontSize: 11, fontFamily: 'monospace',
                            color: a.naics.startsWith('561') ? C.green : C.muted,
                          }}>{a.naics || '—'}</div>
                          <div style={{ fontSize: 11, color: C.faint }}>{fmtDate(a.date)}</div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Top recipients tab */}
              {tab === 'recipients' && (
                <div style={{
                  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden',
                }}>
                  {data.top_recipients.length === 0 ? (
                    <div style={{ padding: '48px 24px', textAlign: 'center', color: C.muted }}>No recipient data available.</div>
                  ) : (
                    <>
                      <div style={{
                        background: '#FAFAFB', borderBottom: `1px solid ${C.border}`, padding: '10px 16px',
                        display: 'grid', gridTemplateColumns: '1fr 120px 60px 120px', gap: 12,
                      }}>
                        {['Company', 'Total Received', 'Awards', 'Maravilla Angle'].map((h) => (
                          <div key={h} style={{ fontSize: 11, fontWeight: 600, color: C.faint, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {h}
                          </div>
                        ))}
                      </div>
                      {data.top_recipients.map((r, i) => {
                        const angle = r.total > 5_000_000 ? { label: 'Sub Target', color: C.indigo, bg: C.indigoLight }
                          : r.total > 500_000 ? { label: 'Competitor', color: C.red, bg: C.redLight }
                          : { label: 'Monitor', color: C.muted, bg: '#F5F5F4' }
                        return (
                          <div key={`${r.name}-${i}`} style={{
                            padding: '12px 16px',
                            borderBottom: i < data.top_recipients.length - 1 ? `1px solid ${C.border}` : 'none',
                            display: 'grid', gridTemplateColumns: '1fr 120px 60px 120px', gap: 12,
                            alignItems: 'center',
                          }}>
                            <div
                              style={{ fontSize: 13, fontWeight: 600, color: C.indigo, cursor: 'pointer' }}
                              onClick={() => router.push(`/companies/${encodeURIComponent(r.name)}`)}
                            >{r.name}</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{fmtVal(r.total)}</div>
                            <div style={{ fontSize: 13, color: C.muted }}>{r.count}</div>
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 10,
                              background: angle.bg, color: angle.color, display: 'inline-block',
                            }}>{angle.label}</span>
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>
              )}

              {/* Contacts tab */}
              {tab === 'contacts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{
                    background: C.purpleLight, border: `1px solid ${C.purpleBorder}`,
                    borderRadius: 10, padding: '12px 16px', fontSize: 13, color: C.purple,
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                  }}>
                    <span>🤖</span>
                    <div>
                      <strong>AI-inferred procurement contacts</strong> — These roles are inferred from agency type and procurement patterns. Verify before outreach.
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
                    {(data.ai.contacts_to_find || []).map((c, i) => (
                      <div key={i} style={{
                        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px',
                        display: 'flex', flexDirection: 'column', gap: 10,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: '50%', background: C.purpleLight,
                            border: `2px solid ${C.purpleBorder}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                          }}>👤</div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{c.title}</div>
                            <div style={{ fontSize: 12, color: C.muted }}>{c.department}</div>
                          </div>
                        </div>
                        <div style={{
                          fontSize: 12, color: C.muted, background: '#FAFAFB',
                          borderRadius: 8, padding: '8px 10px', lineHeight: 1.5,
                        }}>
                          <strong style={{ color: C.text }}>Relevance: </strong>{c.relevance}
                        </div>
                        <button
                          onClick={() => window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(c.title + ' ' + data.agency.name)}`, '_blank')}
                          style={{
                            padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                            cursor: 'pointer', border: `1px solid ${C.border}`,
                            background: C.surface, color: C.text, textAlign: 'center',
                          }}
                        >Search on LinkedIn →</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px',
              }}>
                <SectionHeader title="Agency Summary" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'Total Spend', value: fmtVal(data.agency.total_spend) },
                    { label: 'Contract Count', value: String(data.agency.contract_count) },
                    { label: 'Florida Spend', value: fmtVal(data.agency.fl_spend) },
                    { label: 'Janitorial Awards', value: String(data.agency.cleaning_count || '—') },
                    { label: 'Janitorial Spend', value: fmtVal(data.agency.cleaning_spend) },
                    { label: 'Relevance Score', value: `${data.agency.score}/100` },
                    { label: 'Recompete Likelihood', value: (data.ai.recompete_likelihood || '—').toUpperCase() },
                  ].map((f) => (
                    <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: C.muted }}>{f.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {data.top_recipients.length > 0 && (
                <div style={{
                  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px',
                }}>
                  <SectionHeader title="Top Recipients" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {data.top_recipients.slice(0, 5).map((r) => (
                      <div key={r.name}
                        onClick={() => router.push(`/companies/${encodeURIComponent(r.name)}`)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          cursor: 'pointer', padding: '6px 0',
                        }}>
                        <span style={{
                          fontSize: 12, color: C.indigo, fontWeight: 500,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140,
                        }}>{r.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.text, flexShrink: 0 }}>{fmtVal(r.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
