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

const SUB = {
  id: 'sub_4K9pZbN3vM',
  name: 'Costa Janitorial Services LLC',
  category: 'Recurring janitorial',
  domain: 'costajanitorial.com',
  email: 'ops@costajanitorial.com',
  phone: '(305) 555-0188',
  qualificationStatus: 'Active',
  yearsActive: 7,
  compliance: { insured: true, bonded: true, everify: true, background: true },
  pricing: [
    { service: 'Recurring janitorial', spec: 'Class A office, 20-50k sqft', price: 1.85, unit: '$/sqft/mo', marketAvg: 1.95 },
    { service: 'Turnover (unit clean)', spec: '1BR apartment', price: 145, unit: '$/unit', marketAvg: 165 },
    { service: 'Deep clean', spec: 'post-construction', price: 0.95, unit: '$/sqft', marketAvg: 1.10 },
  ],
  coverageCounties: [
    { name: 'Miami-Dade', active: true, clients: 8, prospects: 47 },
    { name: 'Broward', active: false, clients: 0, prospects: 12 },
    { name: 'Lee', active: false, clients: 0, prospects: 0 },
  ],
  people: [
    { name: 'Roberto Costa', title: 'Founder · CEO', role: 'decision', email: 'roberto@costajanitorial.com', phone: '(305) 555-0189', influence: 100 },
    { name: 'Maria Castillo', title: 'Operations Director', role: 'decision', email: 'maria@costajanitorial.com', phone: '', influence: 78 },
  ],
  reputation: {
    google: { rating: 4.6, reviews: 87 },
    sentiment: { positive: 0.82, neutral: 0.13, negative: 0.05 },
  },
  insurance: {
    generalLiability: { carrier: 'Travelers Casualty', amount: 2000000, expires: '2027-04-15', status: 'current' },
    workersComp: { carrier: 'The Hartford', expires: '2027-01-31', status: 'current' },
    bond: { carrier: 'Bond Builders Surety', amount: 50000, expires: '2026-12-31', status: 'current' },
  },
  publicRecord: {
    sam: { registered: true, uei: 'X9F7B3K4L2M8', cage: '8R7W4', certifications: ['Small Business', 'WOSB'], primaryNaics: '561720' },
    federalWins: [
      { id: 'C-2024-0184', agency: 'GSA Region 4', amount: 740000, awardDate: '2024-08-12', status: 'Active' },
    ],
    activeSolicitations: [
      { id: 'SAM-2026-N028', agency: 'VA Medical Center Miami', amount: 480000, dueDate: '2026-06-12', daysLeft: 18, status: 'bidding' },
    ],
  },
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Compliance', 'Pricing', 'Coverage', 'People', 'Awards & Contracts']

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SubProfilePage() {
  const [activeTab, setActiveTab] = useState('Overview')
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const complianceDots = [
    { label: 'Insured', value: SUB.compliance.insured },
    { label: 'Bonded', value: SUB.compliance.bonded },
    { label: 'E-Verify', value: SUB.compliance.everify },
    { label: 'Background', value: SUB.compliance.background },
  ]

  return (
    <div style={{ background: '#FAFAF9', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#FFF', borderBottom: '1px solid #E7E5E4', padding: '20px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C1917', margin: 0 }}>{SUB.name}</h1>
              <Chip tone="emerald">{SUB.qualificationStatus}</Chip>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Chip tone="neutral" size="sm">{SUB.category}</Chip>
              <span style={{ fontSize: 12, color: '#78716C' }}>{SUB.yearsActive} years active</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => showToast('RFQ draft opened · filling with sub data...')}
              style={{ background: '#4F46E5', color: '#FFF', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Send RFQ
            </button>
            <button
              onClick={() => showToast('Edit mode coming soon')}
              style={{ background: '#FFF', color: '#1C1917', border: '1px solid #E7E5E4', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              Edit profile
            </button>
            <button
              onClick={() => window.open('https://airtable.com', '_blank')}
              style={{ background: '#FFF', color: '#78716C', border: '1px solid #E7E5E4', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              Open in Airtable
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
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Card>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>Contact & Identity</div>
                <KV k="Category" v={SUB.category} />
                <KV k="Domain" v={SUB.domain} />
                <KV k="Email" v={SUB.email} mono />
                <KV k="Phone" v={SUB.phone} />
                <KV k="Years Active" v={`${SUB.yearsActive} years`} />
                <KV k="Qualification" v={SUB.qualificationStatus} />
              </Card>

              <Card>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>Compliance Quick Check</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {complianceDots.map(c => (
                    <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.value ? '#059669' : '#DC2626' }} />
                      <span style={{ fontSize: 12, color: '#1C1917' }}>{c.label}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Card>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>Reputation</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 26, fontWeight: 700, color: '#1C1917' }}>{SUB.reputation.google.rating}</span>
                  <div>
                    <div style={{ fontSize: 12, color: '#78716C' }}>Google Rating</div>
                    <div style={{ fontSize: 11, color: '#A8A29E' }}>{SUB.reputation.google.reviews} reviews</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: '#78716C' }}>Positive</span>
                      <span style={{ fontSize: 11, color: '#047857', fontWeight: 600 }}>{Math.round(SUB.reputation.sentiment.positive * 100)}%</span>
                    </div>
                    <Bar value={SUB.reputation.sentiment.positive * 100} tone="emerald" height={5} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: '#78716C' }}>Neutral</span>
                      <span style={{ fontSize: 11, color: '#B45309', fontWeight: 600 }}>{Math.round(SUB.reputation.sentiment.neutral * 100)}%</span>
                    </div>
                    <Bar value={SUB.reputation.sentiment.neutral * 100} tone="amber" height={5} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: '#78716C' }}>Negative</span>
                      <span style={{ fontSize: 11, color: '#B91C1C', fontWeight: 600 }}>{Math.round(SUB.reputation.sentiment.negative * 100)}%</span>
                    </div>
                    <Bar value={SUB.reputation.sentiment.negative * 100} tone="red" height={5} />
                  </div>
                </div>
              </Card>

              <Card>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>Active Clients</div>
                {SUB.coverageCounties.filter(c => c.active).map(county => (
                  <div key={county.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #F5F5F4' }}>
                    <span style={{ fontSize: 13, color: '#1C1917' }}>{county.name}</span>
                    <span style={{ fontSize: 12, color: '#78716C' }}>{county.clients} clients</span>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        )}

        {/* ── Compliance ── */}
        {activeTab === 'Compliance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {/* General Liability */}
              <Card>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>General Liability</div>
                <KV k="Carrier" v={SUB.insurance.generalLiability.carrier} />
                <KV k="Coverage Amount" v={`$${(SUB.insurance.generalLiability.amount / 1000000).toFixed(0)}M`} />
                <KV k="Expires" v={SUB.insurance.generalLiability.expires} />
                <div style={{ marginTop: 10 }}>
                  <Chip tone={SUB.insurance.generalLiability.status === 'current' ? 'emerald' : 'red'} size="sm">
                    {SUB.insurance.generalLiability.status}
                  </Chip>
                </div>
              </Card>

              {/* Workers Comp */}
              <Card>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>Workers Compensation</div>
                <KV k="Carrier" v={SUB.insurance.workersComp.carrier} />
                <KV k="Expires" v={SUB.insurance.workersComp.expires} />
                <div style={{ marginTop: 10 }}>
                  <Chip tone={SUB.insurance.workersComp.status === 'current' ? 'emerald' : 'red'} size="sm">
                    {SUB.insurance.workersComp.status}
                  </Chip>
                </div>
              </Card>

              {/* Bond */}
              <Card>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>Surety Bond</div>
                <KV k="Carrier" v={SUB.insurance.bond.carrier} />
                <KV k="Bond Amount" v={`$${(SUB.insurance.bond.amount / 1000).toFixed(0)}K`} />
                <KV k="Expires" v={SUB.insurance.bond.expires} />
                <div style={{ marginTop: 10 }}>
                  <Chip tone={SUB.insurance.bond.status === 'current' ? 'emerald' : 'red'} size="sm">
                    {SUB.insurance.bond.status}
                  </Chip>
                </div>
              </Card>
            </div>

            {/* SAM Registration */}
            <Card>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>SAM.gov Registration</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                <div>
                  <KV k="Registered" v={SUB.publicRecord.sam.registered ? 'Yes' : 'No'} />
                  <KV k="UEI" v={SUB.publicRecord.sam.uei} mono />
                  <KV k="CAGE Code" v={SUB.publicRecord.sam.cage} mono />
                  <KV k="Primary NAICS" v={SUB.publicRecord.sam.primaryNaics} mono />
                </div>
                <div style={{ paddingLeft: 20 }}>
                  <div style={{ fontSize: 12, color: '#78716C', marginBottom: 8 }}>Certifications</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {SUB.publicRecord.sam.certifications.map(cert => (
                      <Chip key={cert} tone="indigo" size="sm">{cert}</Chip>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── Pricing ── */}
        {activeTab === 'Pricing' && (
          <Card>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16 }}>Service Pricing vs Market</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E7E5E4' }}>
                  {['Service', 'Spec', 'Our Price', 'Market Avg', 'vs Market'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 600, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SUB.pricing.map((row, i) => {
                  const delta = ((row.price - row.marketAvg) / row.marketAvg) * 100
                  const isBelow = delta < 0
                  return (
                    <tr key={i} style={{ borderBottom: '1px dashed #F5F5F4' }}>
                      <td style={{ padding: '10px 12px', color: '#1C1917', fontWeight: 500 }}>{row.service}</td>
                      <td style={{ padding: '10px 12px', color: '#78716C', fontSize: 12 }}>{row.spec}</td>
                      <td style={{ padding: '10px 12px', color: '#1C1917', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{row.price} {row.unit}</td>
                      <td style={{ padding: '10px 12px', color: '#A8A29E', fontFamily: 'JetBrains Mono, monospace' }}>{row.marketAvg} {row.unit}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <Chip tone={isBelow ? 'emerald' : 'red'} size="sm">
                          {isBelow ? '▼' : '▲'} {Math.abs(delta).toFixed(1)}%
                        </Chip>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
        )}

        {/* ── Coverage ── */}
        {activeTab === 'Coverage' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {SUB.coverageCounties.map(county => (
              <Card key={county.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1917' }}>{county.name}</div>
                  <Chip tone={county.active ? 'emerald' : 'neutral'} size="sm">
                    {county.active ? 'Active' : 'Inactive'}
                  </Chip>
                </div>
                <KV k="Active Clients" v={county.clients.toString()} />
                <KV k="Prospects" v={county.prospects.toString()} />
              </Card>
            ))}
          </div>
        )}

        {/* ── People ── */}
        {activeTab === 'People' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {SUB.people.map((person, i) => (
              <Card key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1917' }}>{person.name}</div>
                    <div style={{ fontSize: 12, color: '#78716C', marginTop: 2 }}>{person.title}</div>
                  </div>
                  <Chip tone={person.role === 'decision' ? 'indigo' : person.role === 'blocker' ? 'red' : 'neutral'} size="sm">
                    {person.role}
                  </Chip>
                </div>
                <KV k="Email" v={person.email} mono />
                {person.phone && <KV k="Phone" v={person.phone} />}
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#78716C' }}>Influence</span>
                    <span style={{ fontSize: 11, color: '#4F46E5', fontWeight: 600 }}>{person.influence}%</span>
                  </div>
                  <Bar value={person.influence} tone="indigo" height={5} />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── Awards & Contracts ── */}
        {activeTab === 'Awards & Contracts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Card>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 14 }}>Federal Awards Won</div>
              {SUB.publicRecord.federalWins.map((win, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed #F5F5F4' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1917', fontFamily: 'JetBrains Mono, monospace' }}>{win.id}</div>
                    <div style={{ fontSize: 12, color: '#78716C', marginTop: 2 }}>{win.agency}</div>
                    <div style={{ fontSize: 11, color: '#A8A29E', marginTop: 1 }}>Awarded {win.awardDate}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1917', fontFamily: 'JetBrains Mono, monospace' }}>${(win.amount / 1000).toFixed(0)}K</div>
                    <Chip tone="emerald" size="sm">{win.status}</Chip>
                  </div>
                </div>
              ))}
            </Card>

            <Card>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 14 }}>Active Solicitations</div>
              {SUB.publicRecord.activeSolicitations.map((sol, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed #F5F5F4' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1917', fontFamily: 'JetBrains Mono, monospace' }}>{sol.id}</div>
                    <div style={{ fontSize: 12, color: '#78716C', marginTop: 2 }}>{sol.agency}</div>
                    <div style={{ fontSize: 11, color: '#A8A29E', marginTop: 1 }}>Due {sol.dueDate}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1917', fontFamily: 'JetBrains Mono, monospace' }}>${(sol.amount / 1000).toFixed(0)}K</div>
                    <div style={{ marginTop: 4 }}>
                      <Chip tone={sol.daysLeft <= 14 ? 'red' : sol.daysLeft <= 30 ? 'amber' : 'neutral'} size="sm">
                        {sol.daysLeft}d left
                      </Chip>
                    </div>
                  </div>
                </div>
              ))}
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
