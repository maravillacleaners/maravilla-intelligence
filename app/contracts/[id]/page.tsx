'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

const C = {
  accent: '#3B82F6',
  accentLight: '#EFF6FF',
  accentBorder: '#BFDBFE',
  green: '#16A34A',
  greenLight: '#F0FDF4',
  greenBorder: '#BBF7D0',
  red: '#DC2626',
  redLight: '#FEF2F2',
  redBorder: '#FECACA',
  amber: '#D97706',
  amberLight: '#FFFBEB',
  amberBorder: '#FDE68A',
  purple: '#7C3AED',
  purpleLight: '#F5F3FF',
  purpleBorder: '#DDD6FE',
  teal: '#0D9488',
  tealLight: '#F0FDFA',
  tealBorder: '#99F6E4',
  indigo: '#4338CA',
  indigoLight: '#EEF2FF',
  indigoBorder: '#C7D2FE',
  text: '#1C1917',
  muted: '#78716C',
  border: '#E7E5E4',
  bg: '#FAFAF9',
  card: '#FFFFFF',
  surface: '#F5F5F4',
}

interface ContractData {
  contract: {
    award_id: string
    generated_id: string
    description: string
    total_obligation: number
    base_and_all_options: number
    date_signed: string
    start_date: string
    end_date: string
    awarding_agency: string
    awarding_subtier: string
    funding_agency: string
    recipient_name: string
    recipient_duns: string
    recipient_city: string
    recipient_state: string
    place_city: string
    place_state: string
    place_state_name: string
    naics: string
    naics_description: string
    psc: string
    psc_description: string
    pricing_type: string
    competed: string
    set_aside: string
    subaward_count: number
    total_subaward_amount: number
    award_type: string
    subcontracting_angle: string
  }
  recompete: { days: number; urgency: string; label: string }
  score: number
  ai: {
    why_matters: string
    opportunity_signals: string[]
    subcontracting_angle: string
    recompete_strategy: string
    recommended_action: string
    next_best_action: string
    teaming_approach: string
  }
  related_contracts: Array<{
    Award_ID: string
    Recipient_Name: string
    Award_Amount: number
    Awarding_Agency: string
    Start_Date: string
    End_Date: string
    generated_internal_id: string
    Description: string
  }>
  airtable_opportunities: Array<Record<string, unknown>>
  airtable_intel: Array<Record<string, unknown>>
  usaspending_url: string
  sam_url: string
}

function fmt(n: number) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function ScoreRing({ score }: { score: number }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const color = score >= 70 ? C.green : score >= 45 ? C.amber : C.red
  return (
    <div style={{ position: 'relative', width: 72, height: 72 }}>
      <svg width={72} height={72} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={36} cy={36} r={r} fill="none" stroke={C.border} strokeWidth={6} />
        <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: C.muted }}>SCORE</span>
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', minWidth: 0 }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || C.text, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
      {children}
    </div>
  )
}

function UrgencyBar({ urgency, days }: { urgency: string; days: number }) {
  const pct = urgency === 'expired' ? 100 : urgency === 'high' ? 85 : urgency === 'medium' ? 50 : urgency === 'low' ? 20 : 0
  const color = urgency === 'expired' || urgency === 'high' ? C.red : urgency === 'medium' ? C.amber : C.green
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color }}>
          {urgency === 'expired' ? 'EXPIRED' : urgency === 'high' ? 'HIGH URGENCY' : urgency === 'medium' ? 'MEDIUM' : urgency === 'low' ? 'LOW' : 'UNKNOWN'}
        </span>
        <span style={{ fontSize: 12, color: C.muted }}>
          {urgency === 'expired' ? `${Math.abs(days)}d ago` : days < 9999 ? `${days}d left` : ''}
        </span>
      </div>
      <div style={{ height: 8, background: C.surface, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

function CtaButton({ label, onClick, primary, danger }: { label: string; onClick: () => void; primary?: boolean; danger?: boolean }) {
  const [hov, setHov] = useState(false)
  const bg = primary ? (hov ? '#2563EB' : C.accent) : danger ? (hov ? '#B91C1C' : C.red) : (hov ? C.surface : C.card)
  const col = primary || danger ? '#fff' : C.text
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ padding: '8px 14px', background: bg, color: col, border: `1px solid ${primary ? C.accent : danger ? C.red : C.border}`, borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
      {label}
    </button>
  )
}

export default function ContractPage() {
  const params = useParams()
  const id = decodeURIComponent(params.id as string)

  const [data, setData] = useState<ContractData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'overview' | 'subcontracting' | 'recompete' | 'relationships'>('overview')
  const [monitored, setMonitored] = useState(false)
  const [inPipeline, setInPipeline] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetch(`/api/contracts/${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Failed to load contract'); setLoading(false) })

    const stored = JSON.parse(localStorage.getItem('monitored_contracts') || '[]')
    setMonitored(stored.includes(id))
  }, [id])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2800)
  }

  function toggleMonitor() {
    const stored: string[] = JSON.parse(localStorage.getItem('monitored_contracts') || '[]')
    const next = monitored ? stored.filter(x => x !== id) : [...stored, id]
    localStorage.setItem('monitored_contracts', JSON.stringify(next))
    setMonitored(!monitored)
    showToast(monitored ? 'Removed from monitoring' : 'Contract monitoring enabled')
  }

  async function addToPipeline() {
    if (!data) return
    try {
      await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Name: `${data.contract.award_id} — ${data.contract.recipient_name}`,
          Agency: data.contract.awarding_agency,
          Value: data.contract.total_obligation,
          Status: 'Qualifying',
          Notes: `Contract profile imported. NAICS: ${data.contract.naics}. End: ${data.contract.end_date}.`
        })
      })
      setInPipeline(true)
      showToast('Added to opportunities pipeline')
    } catch { showToast('Could not add to pipeline') }
  }

  function startTeaming() {
    if (!data) return
    localStorage.setItem('outreach_target', JSON.stringify({
      company: data.contract.recipient_name,
      context: `Subcontracting under ${data.contract.award_id}`,
      agency: data.contract.awarding_agency
    }))
    showToast('Outreach context saved — navigate to Outreach')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent, animation: `pulseDot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
        <div style={{ color: C.muted, fontSize: 14 }}>Loading contract intelligence...</div>
      </div>
    </div>
  )

  if (error || !data) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 8 }}>Contract Not Found</div>
        <div style={{ color: C.muted, marginBottom: 20 }}>Could not locate award: {id}</div>
        <button onClick={() => window.history.back()} style={{ padding: '8px 18px', background: C.accent, color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 14 }}>Go Back</button>
      </div>
    </div>
  )

  const { contract, recompete, score, ai } = data
  const isJanitorial = contract.naics.startsWith('561')
  const isFL = contract.place_state === 'FL'
  const urgencyColor = recompete.urgency === 'expired' || recompete.urgency === 'high' ? C.red : recompete.urgency === 'medium' ? C.amber : C.green
  const aiTheme = isJanitorial ? { bg: C.greenLight, border: C.greenBorder, color: C.green } : { bg: C.purpleLight, border: C.purpleBorder, color: C.purple }

  const tabs: Array<{ key: typeof tab; label: string }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'subcontracting', label: 'Subcontracting' },
    { key: 'recompete', label: 'Recompete' },
    { key: 'relationships', label: 'Relationships' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Inter, sans-serif' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1C1917', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 13, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          {toast}
        </div>
      )}

      {/* nav */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: '12px 32px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, padding: '4px 0' }}>← Back</button>
        <span style={{ color: C.border }}>·</span>
        <span style={{ fontSize: 13, color: C.muted }}>Contract Intelligence</span>
        <span style={{ color: C.border }}>·</span>
        <span style={{ fontSize: 13, color: C.text, fontFamily: 'JetBrains Mono, monospace' }}>{contract.award_id}</span>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 32px' }}>
        {/* header */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
            <ScoreRing score={score} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: C.muted, background: C.surface, padding: '3px 8px', borderRadius: 5 }}>
                  {contract.award_id}
                </span>
                {isJanitorial && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.green, background: C.greenLight, border: `1px solid ${C.greenBorder}`, padding: '2px 8px', borderRadius: 4 }}>
                    ★ JANITORIAL
                  </span>
                )}
                {isFL && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, background: C.accentLight, border: `1px solid ${C.accentBorder}`, padding: '2px 8px', borderRadius: 4 }}>
                    FLORIDA
                  </span>
                )}
                <span style={{ fontSize: 11, fontWeight: 700, color: urgencyColor, background: recompete.urgency === 'expired' || recompete.urgency === 'high' ? C.redLight : recompete.urgency === 'medium' ? C.amberLight : C.greenLight, border: `1px solid ${urgencyColor}40`, padding: '2px 8px', borderRadius: 4 }}>
                  {recompete.label}
                </span>
              </div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 10, lineHeight: 1.3 }}>
                {contract.description || `Federal Contract ${contract.award_id}`}
              </h1>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: 11, color: C.muted }}>Agency</span>
                  <div>
                    <button onClick={() => window.location.href = `/agencies/${encodeURIComponent(contract.awarding_agency)}`}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.purple, textDecoration: 'underline' }}>
                      {contract.awarding_agency}
                    </button>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: C.muted }}>Prime Contractor</span>
                  <div>
                    <button onClick={() => window.location.href = `/companies/${encodeURIComponent(contract.recipient_name)}`}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.accent, textDecoration: 'underline' }}>
                      {contract.recipient_name || '—'}
                    </button>
                  </div>
                </div>
                {contract.naics && (
                  <div>
                    <span style={{ fontSize: 11, color: C.muted }}>NAICS</span>
                    <div style={{ fontSize: 13, fontWeight: 600, color: isJanitorial ? C.green : C.text }}>
                      {contract.naics} — {contract.naics_description || 'Services'}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
              <CtaButton label={inPipeline ? '✓ In Pipeline' : 'Add to Pipeline'} onClick={addToPipeline} primary />
              <CtaButton label={monitored ? '★ Monitoring' : 'Monitor Recompete'} onClick={toggleMonitor} />
            </div>
          </div>
        </div>

        {/* metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          <MetricCard label="Contract Value" value={fmt(contract.total_obligation)} sub={contract.award_type} color={C.accent} />
          <MetricCard label="End Date" value={fmtDate(contract.end_date)} sub={recompete.label} color={urgencyColor} />
          <MetricCard label="Subawards" value={contract.subaward_count.toString()} sub={contract.subaward_count > 0 ? fmt(contract.total_subaward_amount) + ' total' : 'None reported'} />
          <MetricCard label="Performance" value={contract.place_state || '—'} sub={contract.place_city || contract.place_state_name} color={isFL ? C.accent : C.text} />
        </div>

        {/* AI panel */}
        <div style={{ background: aiTheme.bg, border: `1px solid ${aiTheme.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: aiTheme.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {isJanitorial ? '★ Janitorial Intelligence' : 'AI Analysis'}
            </span>
          </div>
          <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6, marginBottom: 16 }}>{ai.why_matters}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <SectionLabel>Opportunity Signals</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ai.opportunity_signals.map((sig, i) => (
                  <div key={i} style={{ fontSize: 13, color: C.text, display: 'flex', gap: 6 }}>
                    <span style={{ color: C.green, fontWeight: 700 }}>+</span>
                    <span>{sig}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <SectionLabel>Subcontracting Angle</SectionLabel>
              <p style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{ai.subcontracting_angle}</p>
            </div>
          </div>
        </div>

        {/* tabs */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: C.surface, borderRadius: 10, padding: 4 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ flex: 1, padding: '8px 16px', background: tab === t.key ? C.card : 'transparent', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: tab === t.key ? 600 : 400, color: tab === t.key ? C.text : C.muted, cursor: 'pointer', transition: 'all 0.15s', boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
          {/* main tab content */}
          <div>
            {tab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                  <SectionLabel>Contract Details</SectionLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
                    {[
                      ['Award ID', contract.award_id],
                      ['Date Signed', fmtDate(contract.date_signed)],
                      ['Start Date', fmtDate(contract.start_date)],
                      ['End Date', fmtDate(contract.end_date)],
                      ['Total Obligation', fmt(contract.total_obligation)],
                      ['Base + All Options', fmt(contract.base_and_all_options)],
                      ['PSC Code', contract.psc ? `${contract.psc} — ${contract.psc_description}` : '—'],
                      ['Pricing Type', contract.pricing_type || '—'],
                      ['Competition', contract.competed || '—'],
                      ['Set Aside', contract.set_aside || 'None'],
                      ['Place of Performance', contract.place_city ? `${contract.place_city}, ${contract.place_state}` : contract.place_state || '—'],
                      ['Funding Agency', contract.funding_agency || contract.awarding_agency],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{k}</div>
                        <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{v || '—'}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {data.related_contracts.length > 0 && (
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                    <SectionLabel>Related Contracts — Same Prime</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {data.related_contracts.map((r, i) => (
                        <div key={i} onClick={() => window.location.href = `/contracts/${encodeURIComponent(r.Award_ID)}`}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: C.surface, borderRadius: 8, cursor: 'pointer', border: `1px solid transparent`, transition: 'all 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.accentBorder; (e.currentTarget as HTMLDivElement).style.background = C.accentLight }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent'; (e.currentTarget as HTMLDivElement).style.background = C.surface }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.accent, fontFamily: 'JetBrains Mono, monospace' }}>{r.Award_ID}</div>
                            <div style={{ fontSize: 12, color: C.muted }}>{r.Awarding_Agency}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{fmt(r.Award_Amount)}</div>
                            <div style={{ fontSize: 11, color: C.muted }}>{r.End_Date ? fmtDate(r.End_Date) : '—'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.airtable_intel.length > 0 && (
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                    <SectionLabel>Pipeline Intelligence</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {data.airtable_intel.map((r: Record<string, unknown>, i: number) => (
                        <div key={i} style={{ padding: '10px 14px', background: C.indigoLight, border: `1px solid ${C.indigoBorder}`, borderRadius: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{String(r.Company || '')}</div>
                          <div style={{ fontSize: 12, color: C.muted }}>{String(r.Notes || r.Status || '')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'subcontracting' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                  <SectionLabel>Subcontracting Analysis</SectionLabel>
                  <div style={{ background: C.tealLight, border: `1px solid ${C.tealBorder}`, borderRadius: 8, padding: 14, marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, marginBottom: 4 }}>{contract.subcontracting_angle}</div>
                    <p style={{ fontSize: 13, color: C.text, lineHeight: 1.5, margin: 0 }}>{ai.subcontracting_angle}</p>
                  </div>
                  <SectionLabel>Teaming Approach</SectionLabel>
                  <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6, marginBottom: 16 }}>{ai.teaming_approach}</p>
                  <SectionLabel>4-Step Approach</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { step: 1, color: C.accent, title: 'Identify Prime Contact', detail: `Research ${contract.recipient_name} business development team on LinkedIn and SAM.gov` },
                      { step: 2, color: C.teal, title: 'Prepare Capability Statement', detail: 'One-page document: NAICS 561720, FL experience, bonded/insured, references, DUNS/UEI' },
                      { step: 3, color: C.amber, title: 'Initiate Outreach', detail: 'Email BD lead: introduce Maravilla, janitorial capability, FL presence, availability for subcontracting' },
                      { step: 4, color: C.green, title: 'Register on SAM.gov', detail: "Ensure active SAM.gov registration. Search for this contract's solicitation history for agency contacts" },
                    ].map(({ step, color, title, detail }) => (
                      <div key={step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', background: C.surface, borderRadius: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{step}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 3 }}>{title}</div>
                          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <CtaButton label="Find Prime Contacts" onClick={() => window.location.href = `/companies/${encodeURIComponent(contract.recipient_name)}`} primary />
                  <CtaButton label="Start Teaming Outreach" onClick={startTeaming} />
                  <CtaButton label="Search SAM.gov" onClick={() => window.open(data.sam_url, '_blank')} />
                </div>
              </div>
            )}

            {tab === 'recompete' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                  <SectionLabel>Recompete Status</SectionLabel>
                  <div style={{ marginBottom: 20 }}>
                    <UrgencyBar urgency={recompete.urgency} days={recompete.days} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Contract Start</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{fmtDate(contract.start_date)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Contract End</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: urgencyColor }}>{fmtDate(contract.end_date)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Days Remaining</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: urgencyColor }}>
                        {recompete.days < 9999 ? (recompete.days < 0 ? `${Math.abs(recompete.days)}d expired` : `${recompete.days}d`) : 'Unknown'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Urgency Level</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: urgencyColor, textTransform: 'capitalize' }}>{recompete.urgency}</div>
                    </div>
                  </div>
                  <SectionLabel>Recompete Strategy</SectionLabel>
                  <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6, marginBottom: 16 }}>{ai.recompete_strategy}</p>
                  <SectionLabel>Action Checklist</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      'Register on SAM.gov (active registration required)',
                      'Search SAM.gov for solicitation history of this contract',
                      'Identify Contracting Officer (CO) from USASpending.gov records',
                      'Request Sources Sought notice response window',
                      'Submit capability statement to agency small business office',
                      'Contact prime contractor for teaming introduction',
                      'Set calendar alert 180 days before end date',
                      'Monitor FedBizOpps for recompete solicitation posting',
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px', background: C.surface, borderRadius: 6 }}>
                        <input type="checkbox" style={{ accentColor: C.accent }} />
                        <span style={{ fontSize: 13, color: C.text }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <CtaButton label={monitored ? '★ Monitoring Active' : 'Monitor Recompete'} onClick={toggleMonitor} primary={!monitored} />
                  <CtaButton label="View on USASpending" onClick={() => window.open(data.usaspending_url, '_blank')} />
                  <CtaButton label="Search SAM.gov" onClick={() => window.open(data.sam_url, '_blank')} />
                </div>
              </div>
            )}

            {tab === 'relationships' && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
                <SectionLabel>Relationship Graph</SectionLabel>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, padding: '20px 0', overflowX: 'auto' }}>
                  {/* Agency node */}
                  <button onClick={() => window.location.href = `/agencies/${encodeURIComponent(contract.awarding_agency)}`}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 16px', background: C.purpleLight, border: `2px solid ${C.purple}`, borderRadius: 10, cursor: 'pointer', minWidth: 120, maxWidth: 150 }}>
                    <span style={{ fontSize: 18 }}>🏛️</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.purple, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agency</span>
                    <span style={{ fontSize: 12, color: C.text, textAlign: 'center', lineHeight: 1.3 }}>{contract.awarding_agency.split(' ').slice(0, 3).join(' ')}</span>
                  </button>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px' }}>
                    <div style={{ width: 40, height: 2, background: `linear-gradient(90deg, ${C.purple}, ${isJanitorial ? C.green : C.indigo})` }} />
                    <span style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>awards</span>
                  </div>

                  {/* Contract node */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 16px', background: isJanitorial ? C.greenLight : C.indigoLight, border: `2px solid ${isJanitorial ? C.green : C.indigo}`, borderRadius: 10, minWidth: 120, maxWidth: 160 }}>
                    <span style={{ fontSize: 18 }}>📄</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isJanitorial ? C.green : C.indigo, textTransform: 'uppercase' }}>Contract</span>
                    <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: C.text }}>{contract.award_id}</span>
                    <span style={{ fontSize: 11, color: C.muted }}>{fmt(contract.total_obligation)}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px' }}>
                    <div style={{ width: 40, height: 2, background: `linear-gradient(90deg, ${isJanitorial ? C.green : C.indigo}, ${C.amber})` }} />
                    <span style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>prime</span>
                  </div>

                  {/* Prime node */}
                  <button onClick={() => window.location.href = `/companies/${encodeURIComponent(contract.recipient_name)}`}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 16px', background: C.amberLight, border: `2px solid ${C.amber}`, borderRadius: 10, cursor: 'pointer', minWidth: 120, maxWidth: 150 }}>
                    <span style={{ fontSize: 18 }}>🏢</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.amber, textTransform: 'uppercase' }}>Prime</span>
                    <span style={{ fontSize: 12, color: C.text, textAlign: 'center', lineHeight: 1.3 }}>{(contract.recipient_name || 'Unknown').split(' ').slice(0, 3).join(' ')}</span>
                  </button>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px' }}>
                    <div style={{ width: 40, borderTop: `2px dashed ${C.indigo}`, marginTop: 0 }} />
                    <span style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>teaming</span>
                  </div>

                  {/* Maravilla node */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 16px', background: C.indigoLight, border: `2px dashed ${C.indigo}`, borderRadius: 10, minWidth: 120 }}>
                    <span style={{ fontSize: 18 }}>✨</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.indigo, textTransform: 'uppercase' }}>Maravilla</span>
                    <span style={{ fontSize: 12, color: C.text, textAlign: 'center' }}>Sub Target</span>
                  </div>
                </div>
                <div style={{ marginTop: 20, padding: '12px 16px', background: C.surface, borderRadius: 8 }}>
                  <SectionLabel>Next Best Action</SectionLabel>
                  <p style={{ fontSize: 14, color: C.text, lineHeight: 1.5, margin: 0 }}>{ai.next_best_action}</p>
                </div>
              </div>
            )}
          </div>

          {/* sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
              <SectionLabel>Contract Summary</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Value', fmt(contract.total_obligation)],
                  ['Agency', contract.awarding_agency.split(' ').slice(0, 3).join(' ')],
                  ['Prime', (contract.recipient_name || '—').split(' ').slice(0, 3).join(' ')],
                  ['NAICS', contract.naics || '—'],
                  ['State', contract.place_state || '—'],
                  ['End Date', fmtDate(contract.end_date)],
                  ['Subawards', contract.subaward_count.toString()],
                  ['Score', `${score}/100`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: C.muted }}>{k}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
              <SectionLabel>External Links</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => window.open(data.usaspending_url, '_blank')}
                  style={{ width: '100%', padding: '9px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 13, color: C.text, cursor: 'pointer', textAlign: 'left' }}>
                  View on USASpending →
                </button>
                <button onClick={() => window.open(data.sam_url, '_blank')}
                  style={{ width: '100%', padding: '9px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 13, color: C.text, cursor: 'pointer', textAlign: 'left' }}>
                  Search SAM.gov →
                </button>
                <button onClick={() => window.location.href = `/agencies/${encodeURIComponent(contract.awarding_agency)}`}
                  style={{ width: '100%', padding: '9px 14px', background: C.purpleLight, border: `1px solid ${C.purpleBorder}`, borderRadius: 7, fontSize: 13, color: C.purple, cursor: 'pointer', textAlign: 'left', fontWeight: 600 }}>
                  Agency Profile →
                </button>
                <button onClick={() => window.location.href = `/companies/${encodeURIComponent(contract.recipient_name)}`}
                  style={{ width: '100%', padding: '9px 14px', background: C.accentLight, border: `1px solid ${C.accentBorder}`, borderRadius: 7, fontSize: 13, color: C.accent, cursor: 'pointer', textAlign: 'left', fontWeight: 600 }}>
                  Prime Profile →
                </button>
              </div>
            </div>

            {data.airtable_opportunities.length > 0 && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
                <SectionLabel>Pipeline Opportunities</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.airtable_opportunities.map((opp: Record<string, unknown>, i: number) => (
                    <div key={i} style={{ padding: '10px 12px', background: C.greenLight, border: `1px solid ${C.greenBorder}`, borderRadius: 7 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{String(opp.Name || opp.Agency || '')}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{String(opp.Status || '')}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: C.amberLight, border: `1px solid ${C.amberBorder}`, borderRadius: 12, padding: 18 }}>
              <SectionLabel>Next Best Action</SectionLabel>
              <p style={{ fontSize: 13, color: C.text, lineHeight: 1.5, margin: '0 0 12px' }}>{ai.recommended_action}</p>
              <CtaButton label="Add to Pipeline" onClick={addToPipeline} primary />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
