'use client'

import React, { useState, useMemo, useEffect } from 'react'
import TopBar from '@/components/crm/top-bar'
import { Chip, LetterAvatar, Button, Checkbox, Tooltip } from '@/components/crm/ui'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Compliance {
  insured: boolean
  bonded: boolean
  everify: boolean
  background: boolean
  w9: boolean
  coi: boolean
}

interface Sub {
  id: string
  name: string
  county: string
  address: string
  trades: string[]
  yearsActive: number
  crews: number
  employees: number
  email: string
  phone: string
  domain: string
  tags: string[]
  crmStatus: 'in-crm-active' | 'in-crm-stale' | 'new'
  relationshipMonths: number
  rating: number
  reviews: number
  responseTime: string
  responseRate: number
  pricing: { avg: number; unit: string; confidence: string }
  availability: string
  compliance: Compliance
  lastQuoteRequested: string | null
  lastQuoteBy: string | null
}

interface SubTrade {
  id: string
  label: string
  subs: number
}

interface RFQSpec {
  project: string
  sqft: string
  frequency: string
  startDate: string
  duration: string
  deadline: string
  notes: string
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const SUB_TRADES: SubTrade[] = [
  { id: 'janitorial', label: 'Janitorial', subs: 14 },
  { id: 'landscaping', label: 'Landscaping', subs: 8 },
  { id: 'hvac', label: 'HVAC', subs: 6 },
  { id: 'painting', label: 'Painting', subs: 5 },
  { id: 'flooring', label: 'Floor care', subs: 4 },
  { id: 'pest', label: 'Pest control', subs: 3 },
  { id: 'security', label: 'Security', subs: 7 },
  { id: 'electrical', label: 'Electrical', subs: 4 },
  { id: 'plumbing', label: 'Plumbing', subs: 3 },
  { id: 'construction', label: 'Construction', subs: 9 },
  { id: 'all', label: 'All trades', subs: 63 },
]

const SUBS: Sub[] = [
  {
    id: 'sub1', name: 'Costa Janitorial Services', county: 'Miami-Dade', address: '8420 NW 33rd Terrace, Doral, FL 33122',
    trades: ['janitorial'], yearsActive: 7, crews: 4, employees: 22,
    email: 'ops@costajanitorial.com', phone: '(305) 555-0188', domain: 'costajanitorial.com',
    tags: ['Bilingual crews', 'Background checked', 'HIPAA trained'],
    crmStatus: 'in-crm-active', relationshipMonths: 14,
    rating: 4.6, reviews: 87, responseTime: '2.4h', responseRate: 0.91,
    pricing: { avg: 1.85, unit: '$/sqft/mo', confidence: 'High confidence · 5 RFQs' },
    availability: 'Available now',
    compliance: { insured: true, bonded: true, everify: true, background: true, w9: true, coi: true },
    lastQuoteRequested: '2026-04-12', lastQuoteBy: 'sarah.k',
  },
  {
    id: 'sub2', name: 'Reyes Cleaning Co.', county: 'Miami-Dade', address: '3410 SW 8th St, Miami, FL 33135',
    trades: ['janitorial'], yearsActive: 5, crews: 2, employees: 12,
    email: 'info@reyescleaning.com', phone: '(305) 555-0244', domain: 'reyescleaning.com',
    tags: ['Turnovers specialist', 'Spanish-speaking', 'Same-day available'],
    crmStatus: 'in-crm-active', relationshipMonths: 8,
    rating: 4.4, reviews: 34, responseTime: '3.1h', responseRate: 0.85,
    pricing: { avg: 2.20, unit: '$/sqft/mo', confidence: 'Medium confidence · 2 RFQs' },
    availability: 'Available now',
    compliance: { insured: true, bonded: false, everify: true, background: true, w9: true, coi: true },
    lastQuoteRequested: '2026-03-22', lastQuoteBy: 'sarah.k',
  },
  {
    id: 'sub3', name: 'Atlantic Floor Care LLC', county: 'Miami-Dade', address: '1840 NE 4th Ave, Miami, FL 33132',
    trades: ['flooring', 'janitorial'], yearsActive: 12, crews: 1, employees: 8,
    email: 'quotes@atlanticfloor.com', phone: '(305) 555-0381', domain: 'atlanticfloor.com',
    tags: ['Floor specialty', 'VCT strip & wax', 'Post-construction'],
    crmStatus: 'in-crm-stale', relationshipMonths: 3,
    rating: 4.9, reviews: 121, responseTime: '1.8h', responseRate: 0.96,
    pricing: { avg: 2.65, unit: '$/sqft/mo', confidence: 'High confidence · 8 RFQs' },
    availability: '2-week lead time',
    compliance: { insured: true, bonded: true, everify: true, background: true, w9: true, coi: false },
    lastQuoteRequested: '2026-02-18', lastQuoteBy: 'marcus.r',
  },
  {
    id: 'sub4', name: 'ProClean South Florida LLC', county: 'Broward', address: '2210 SW 82nd Ave, Davie, FL 33324',
    trades: ['janitorial'], yearsActive: 9, crews: 3, employees: 18,
    email: 'ops@procleansfl.com', phone: '(954) 555-0122', domain: 'procleansfl.com',
    tags: ['Healthcare certified', 'OSHA compliant', 'Broward specialist'],
    crmStatus: 'new', relationshipMonths: 0,
    rating: 4.5, reviews: 58, responseTime: '6.2h', responseRate: 0.78,
    pricing: { avg: 1.95, unit: '$/sqft/mo', confidence: 'Low confidence · 1 RFQ' },
    availability: 'Available now',
    compliance: { insured: true, bonded: true, everify: false, background: true, w9: false, coi: true },
    lastQuoteRequested: null, lastQuoteBy: null,
  },
  {
    id: 'sub5', name: 'Elite Maintenance Partners', county: 'Miami-Dade', address: '550 NW 42nd Ave Suite 102, Miami, FL 33126',
    trades: ['janitorial', 'landscaping'], yearsActive: 14, crews: 6, employees: 35,
    email: 'bids@elitemaint.com', phone: '(305) 555-0501', domain: 'elitemaint.com',
    tags: ['Large capacity', 'Government certified', 'Green cleaning'],
    crmStatus: 'in-crm-active', relationshipMonths: 22,
    rating: 4.7, reviews: 203, responseTime: '2.8h', responseRate: 0.89,
    pricing: { avg: 2.40, unit: '$/sqft/mo', confidence: 'High confidence · 11 RFQs' },
    availability: 'Available now',
    compliance: { insured: true, bonded: true, everify: true, background: true, w9: true, coi: true },
    lastQuoteRequested: '2026-05-10', lastQuoteBy: 'sarah.k',
  },
  {
    id: 'sub6', name: 'Brickell Building Services LLC', county: 'Miami-Dade', address: '888 Brickell Ave, Miami, FL 33131',
    trades: ['janitorial'], yearsActive: 6, crews: 2, employees: 14,
    email: 'contact@brickellbldg.com', phone: '(305) 555-0622', domain: 'brickellbldg.com',
    tags: ['Brickell specialist', 'Class A focus', 'Bilingual'],
    crmStatus: 'new', relationshipMonths: 0,
    rating: 4.7, reviews: 41, responseTime: '3.0h', responseRate: 0.82,
    pricing: { avg: 2.05, unit: '$/sqft/mo', confidence: 'No prior RFQ' },
    availability: 'Available now',
    compliance: { insured: true, bonded: false, everify: true, background: false, w9: true, coi: false },
    lastQuoteRequested: null, lastQuoteBy: null,
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ratingColor(r: number): string {
  if (r >= 4.7) return '#059669'
  if (r >= 4.3) return '#D97706'
  return '#B91C1C'
}

function availColor(a: string): { bg: string; text: string; border: string } {
  if (a === 'Available now') return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' }
  return { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' }
}

function crmChipTone(s: Sub['crmStatus']): 'emerald' | 'amber' | 'blue' {
  if (s === 'in-crm-active') return 'emerald'
  if (s === 'in-crm-stale') return 'amber'
  return 'blue'
}

function crmLabel(s: Sub['crmStatus']): string {
  if (s === 'in-crm-active') return 'In CRM · Active'
  if (s === 'in-crm-stale') return 'In CRM · Stale'
  return 'New'
}

function fmtDate(d: string): string {
  const dt = new Date(d)
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function copyToClipboard(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {})
}

// ─── Compliance chip row ───────────────────────────────────────────────────────

const COMP_KEYS: (keyof Compliance)[] = ['insured', 'bonded', 'everify', 'background', 'w9', 'coi']
const COMP_LABELS: Record<keyof Compliance, string> = {
  insured: 'Insured', bonded: 'Bonded', everify: 'E-Verify',
  background: 'Bkgrnd', w9: 'W-9', coi: 'COI',
}

function ComplianceRow({ c }: { c: Compliance }) {
  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
      {COMP_KEYS.map(k => {
        const ok = c[k]
        return (
          <span
            key={k}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              background: ok ? '#ECFDF5' : '#FEF2F2',
              color: ok ? '#065F46' : '#991B1B',
              border: `1px solid ${ok ? '#A7F3D0' : '#FECACA'}`,
              borderRadius: 99, padding: '2px 7px',
              fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: 10 }}>{ok ? '✓' : '✕'}</span>
            {COMP_LABELS[k]}
          </span>
        )
      })}
    </div>
  )
}

// ─── Stats pill ───────────────────────────────────────────────────────────────

function StatCol({ label, value, sub, valueColor }: { label: string; value: string; sub?: string; valueColor?: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10.5, color: '#A8A29E', fontWeight: 500, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: valueColor ?? '#1C1917', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: '#78716C', marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

// ─── Sub Card ────────────────────────────────────────────────────────────────

interface SubCardProps {
  sub: Sub
  selected: boolean
  onToggle: (id: string) => void
}

function SubCard({ sub, selected, onToggle }: SubCardProps) {
  const av = availColor(sub.availability)
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: `1.5px solid ${selected ? '#4F46E5' : '#E7E5E4'}`,
        borderRadius: 12,
        padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12,
        boxShadow: selected ? '0 0 0 3px rgba(79,70,229,0.10)' : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        position: 'relative',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ paddingTop: 2 }}>
          <Checkbox checked={selected} onChange={() => onToggle(sub.id)} />
        </div>
        <LetterAvatar name={sub.name} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1C1917' }}>{sub.name}</span>
            <Chip tone={crmChipTone(sub.crmStatus)} size="sm">{crmLabel(sub.crmStatus)}</Chip>
          </div>
          <div style={{ fontSize: 11.5, color: '#78716C', marginTop: 3 }}>{sub.address}</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11.5, color: '#A8A29E' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{sub.yearsActive}y active</span>
            <span>·</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{sub.crews} crews</span>
            <span>·</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{sub.employees} employees</span>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {sub.tags.map(t => (
          <Chip key={t} tone="neutral" size="sm">{t}</Chip>
        ))}
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8, padding: '10px 12px',
          background: '#FAFAF9', border: '1px solid #F0EFEE', borderRadius: 8,
        }}
      >
        <StatCol
          label="Rating"
          value={sub.rating.toFixed(1)}
          sub={`${sub.reviews} reviews`}
          valueColor={ratingColor(sub.rating)}
        />
        <StatCol
          label="Avg price"
          value={`$${sub.pricing.avg.toFixed(2)}`}
          sub={sub.pricing.unit}
        />
        <StatCol
          label="Response"
          value={sub.responseTime}
          sub={`${Math.round(sub.responseRate * 100)}% reply rate`}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10.5, color: '#A8A29E', fontWeight: 500, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Availability</div>
          <span style={{
            display: 'inline-block',
            background: av.bg, color: av.text, border: `1px solid ${av.border}`,
            borderRadius: 99, padding: '2px 7px',
            fontSize: 11, fontWeight: 500,
          }}>
            {sub.availability}
          </span>
        </div>
      </div>

      {/* Compliance */}
      <div>
        <div style={{ fontSize: 10.5, color: '#A8A29E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Compliance</div>
        <ComplianceRow c={sub.compliance} />
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingTop: 4, borderTop: '1px solid #F0EFEE' }}>
        <div style={{ fontSize: 11.5 }}>
          {sub.lastQuoteRequested ? (
            <span style={{ color: '#78716C' }}>
              Last RFQ: <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{fmtDate(sub.lastQuoteRequested)}</span>
              {sub.lastQuoteBy && <span style={{ color: '#A8A29E' }}> · {sub.lastQuoteBy}</span>}
            </span>
          ) : (
            <span style={{ color: '#B91C1C', fontWeight: 500 }}>Never quoted</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <Tooltip tip={`Copy ${sub.email}`}>
            <button
              onClick={() => copyToClipboard(sub.email)}
              style={{ background: '#F5F5F4', border: '1px solid #E7E5E4', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
              title="Copy email"
            >
              ✉
            </button>
          </Tooltip>
          <Tooltip tip={`Copy ${sub.phone}`}>
            <button
              onClick={() => copyToClipboard(sub.phone)}
              style={{ background: '#F5F5F4', border: '1px solid #E7E5E4', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
              title="Copy phone"
            >
              ☎
            </button>
          </Tooltip>
          <Tooltip tip={`Open ${sub.domain}`}>
            <button
              onClick={() => window.open(`https://${sub.domain}`, '_blank')}
              style={{ background: '#F5F5F4', border: '1px solid #E7E5E4', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
              title="Open website"
            >
              ↗
            </button>
          </Tooltip>
          <Button variant="secondary" size="sm">Profile</Button>
          <Button
            variant={selected ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onToggle(sub.id)}
            style={selected ? { background: '#4F46E5', color: '#FFF' } : {}}
          >
            {selected ? '✓ Selected' : '+ Quote'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Segmented control ────────────────────────────────────────────────────────

function SegControl<T extends string>({
  options, value, onChange,
}: { options: { label: string; value: T }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'inline-flex', background: '#F5F5F4', border: '1px solid #E7E5E4', borderRadius: 8, padding: 2, gap: 1 }}>
      {options.map(o => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              padding: '4px 10px', fontSize: 12, fontWeight: active ? 600 : 400,
              background: active ? '#FFFFFF' : 'transparent',
              color: active ? '#1C1917' : '#78716C',
              border: active ? '1px solid #E7E5E4' : '1px solid transparent',
              borderRadius: 6, cursor: 'pointer',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.12s',
              whiteSpace: 'nowrap',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── RFQ Modal ────────────────────────────────────────────────────────────────

const DEFAULT_SPEC: RFQSpec = {
  project: 'Commercial janitorial services',
  sqft: '15,000',
  frequency: 'Weekly',
  startDate: '2026-07-01',
  duration: '12 months',
  deadline: '2026-06-15',
  notes: 'Please include per-visit and monthly pricing options. We require background-checked crews.',
}

const FREQUENCY_OPTIONS = ['Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'One-time', 'Custom']

interface RFQModalProps {
  selectedSubs: Sub[]
  onClose: () => void
  onSend: () => void
}

function RFQModal({ selectedSubs, onClose, onSend }: RFQModalProps) {
  const [step, setStep] = useState(1)
  const [spec, setSpec] = useState<RFQSpec>(DEFAULT_SPEC)

  function InputRow({ label, value, onChange, type = 'text', children }: {
    label: string; value?: string; onChange?: (v: string) => void; type?: string; children?: React.ReactNode
  }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#57534E' }}>{label}</label>
        {children ?? (
          <input
            type={type}
            value={value}
            onChange={e => onChange?.(e.target.value)}
            style={{
              padding: '7px 10px', fontSize: 13, border: '1px solid #E7E5E4',
              borderRadius: 7, outline: 'none', color: '#1C1917', background: '#FFFFFF',
            }}
          />
        )}
      </div>
    )
  }

  const emailPreview = selectedSubs[0]
    ? `Subject: RFQ — ${spec.project} · Maravilla Cleaners

Hi ${selectedSubs[0].name} team,

We are seeking quotes for the following scope of work:

  Project:    ${spec.project}
  Sq. footage: ${spec.sqft} sqft
  Frequency:  ${spec.frequency}
  Start date: ${spec.startDate}
  Duration:   ${spec.duration}

Please reply with your per-visit and monthly pricing by ${spec.deadline}.

${spec.notes ? `Additional notes:\n${spec.notes}\n\n` : ''}We look forward to working with you.

Best regards,
Maravilla Cleaners · Procurement Team
hello@maravillacleaners.com`
    : ''

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.40)',
          zIndex: 500, animation: 'cmdkFade 0.18s ease',
        }}
      />
      {/* Dialog */}
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translateX(-50%) translateY(-50%)',
          width: 620, maxWidth: '95vw', maxHeight: '90vh',
          background: '#FFFFFF', borderRadius: 14,
          border: '1px solid #E7E5E4',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          zIndex: 600, display: 'flex', flexDirection: 'column',
          animation: 'cmdkPop 0.18s ease',
        }}
      >
        {/* Modal header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #F0EFEE', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#A8A29E', marginBottom: 2 }}>
              RFQ Wizard · Step {step} of 3
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1917' }}>
              {step === 1 ? 'Job Specifications' : step === 2 ? 'Review Recipients' : 'Email Preview'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A8A29E', fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 0, padding: '10px 22px 0' }}>
          {[1, 2, 3].map(s => (
            <React.Fragment key={s}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: s <= step ? '#4F46E5' : '#F0EFEE',
                  color: s <= step ? '#FFF' : '#A8A29E',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {s < step ? '✓' : s}
                </div>
                <span style={{ fontSize: 11.5, color: s === step ? '#1C1917' : '#A8A29E', fontWeight: s === step ? 600 : 400 }}>
                  {s === 1 ? 'Specs' : s === 2 ? 'Recipients' : 'Preview'}
                </span>
              </div>
              {s < 3 && <div style={{ flex: 1, height: 1, background: s < step ? '#4F46E5' : '#E7E5E4', alignSelf: 'center', margin: '0 8px', minWidth: 20 }} />}
            </React.Fragment>
          ))}
        </div>

        {/* Modal body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>

          {/* Step 1 */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <InputRow label="Project / Scope description" value={spec.project} onChange={v => setSpec(p => ({ ...p, project: v }))} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <InputRow label="Square footage" value={spec.sqft} onChange={v => setSpec(p => ({ ...p, sqft: v }))} />
                <InputRow label="Service frequency">
                  <select
                    value={spec.frequency}
                    onChange={e => setSpec(p => ({ ...p, frequency: e.target.value }))}
                    style={{ padding: '7px 10px', fontSize: 13, border: '1px solid #E7E5E4', borderRadius: 7, outline: 'none', color: '#1C1917', background: '#FFFFFF' }}
                  >
                    {FREQUENCY_OPTIONS.map(f => <option key={f}>{f}</option>)}
                  </select>
                </InputRow>
                <InputRow label="Requested start date" value={spec.startDate} onChange={v => setSpec(p => ({ ...p, startDate: v }))} type="date" />
                <InputRow label="Contract duration" value={spec.duration} onChange={v => setSpec(p => ({ ...p, duration: v }))} />
              </div>
              <InputRow label="Quote deadline" value={spec.deadline} onChange={v => setSpec(p => ({ ...p, deadline: v }))} type="date" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#57534E' }}>Additional notes</label>
                <textarea
                  value={spec.notes}
                  onChange={e => setSpec(p => ({ ...p, notes: e.target.value }))}
                  rows={3}
                  style={{ padding: '7px 10px', fontSize: 13, border: '1px solid #E7E5E4', borderRadius: 7, outline: 'none', color: '#1C1917', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12.5, color: '#78716C', marginBottom: 4 }}>
                {selectedSubs.length} sub{selectedSubs.length !== 1 ? 's' : ''} will receive this RFQ.
              </div>
              {selectedSubs.map(s => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', background: '#FAFAF9',
                    border: '1px solid #E7E5E4', borderRadius: 8,
                  }}
                >
                  <LetterAvatar name={s.name} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1917' }}>{s.name}</div>
                    <div style={{ fontSize: 11.5, color: '#78716C', marginTop: 2 }}>{s.email} · {s.phone}</div>
                  </div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: '#EEF2FF', color: '#4338CA', border: '1px solid #C7D2FE',
                    borderRadius: 99, padding: '3px 8px', fontSize: 11, fontWeight: 500,
                  }}>
                    ⚡ {s.responseTime}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 12.5, color: '#78716C' }}>
                This template will be personalized for each recipient. Review before sending.
              </div>
              <pre style={{
                padding: 14, background: '#FAFAF9', border: '1px solid #E7E5E4', borderRadius: 8,
                fontSize: 12, fontFamily: 'JetBrains Mono, Consolas, monospace',
                color: '#1C1917', whiteSpace: 'pre-wrap', lineHeight: 1.7,
              }}>
                {emailPreview}
              </pre>
              {selectedSubs.length > 1 && (
                <div style={{ fontSize: 11.5, color: '#78716C', padding: '8px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 7 }}>
                  + {selectedSubs.length - 1} more personalized version{selectedSubs.length > 2 ? 's' : ''} will be sent to remaining recipients.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid #F0EFEE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button variant="ghost" size="sm" onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}>
            {step > 1 ? '← Back' : 'Cancel'}
          </Button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step < 3 && (
              <Button variant="primary" size="sm" onClick={() => setStep(s => s + 1)}>
                Continue →
              </Button>
            )}
            {step === 3 && (
              <Button
                variant="primary"
                size="sm"
                onClick={onSend}
                style={{ background: '#059669', borderColor: '#059669' }}
              >
                Send to {selectedSubs.length} sub{selectedSubs.length !== 1 ? 's' : ''} ✓
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FindSubsPage() {
  const [activeTrade, setActiveTrade] = useState('all')
  const [regions, setRegions] = useState<string[]>([])
  const [crmFilter, setCrmFilter] = useState<'all' | 'in-crm' | 'not-in-crm'>('all')
  const [complianceFilter, setComplianceFilter] = useState<'any' | 'full'>('any')
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'response'>('rating')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showRFQ, setShowRFQ] = useState(false)
  const [subs, setSubs] = useState<Sub[]>(SUBS)

  useEffect(() => {
    fetch('/api/subs')
      .then(r => r.json())
      .then(d => { if (d.subs?.length) setSubs(d.subs) })
      .catch(() => {})
  }, [])

  const allRegions = ['Miami-Dade', 'Broward', 'Palm Beach']

  function toggleRegion(r: string) {
    setRegions(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])
  }

  function toggleSub(id: string) {
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const filtered = useMemo(() => {
    let list = [...subs]

    // trade
    if (activeTrade !== 'all') list = list.filter(s => s.trades.includes(activeTrade))

    // region
    if (regions.length > 0) list = list.filter(s => regions.includes(s.county))

    // crm
    if (crmFilter === 'in-crm') list = list.filter(s => s.crmStatus !== 'new')
    if (crmFilter === 'not-in-crm') list = list.filter(s => s.crmStatus === 'new')

    // compliance
    if (complianceFilter === 'full') {
      list = list.filter(s => Object.values(s.compliance).every(Boolean))
    }

    // search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.county.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q))
      )
    }

    // sort
    if (sortBy === 'rating') list.sort((a, b) => b.rating - a.rating)
    if (sortBy === 'price') list.sort((a, b) => a.pricing.avg - b.pricing.avg)
    if (sortBy === 'response') {
      list.sort((a, b) => parseFloat(a.responseTime) - parseFloat(b.responseTime))
    }

    return list
  }, [subs, activeTrade, regions, crmFilter, complianceFilter, search, sortBy])

  const selectedSubs = useMemo(() => subs.filter(s => selectedIds.has(s.id)), [subs, selectedIds])

  return (
    <>
      <TopBar
        notifications={[]}
        onMarkAllRead={() => {}}
        onClickNotif={() => {}}
        onOpenCopilot={() => {}}
        onOpenCmdK={() => {}}
      />

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 32px 60px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Page Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#A8A29E', marginBottom: 4 }}>
              Vendor sourcing · RFQ
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1C1917', letterSpacing: -0.4 }}>
              Find subs · request quotes
            </h1>
            <p style={{ fontSize: 13, color: '#78716C', marginTop: 4 }}>
              Browse your sub network, compare compliance and pricing, and send quote requests in bulk.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <Button variant="secondary" size="md">
              ↑ Import sub list
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={selectedIds.size === 0}
              onClick={() => selectedIds.size > 0 && setShowRFQ(true)}
            >
              Send RFQ {selectedIds.size > 0 && `(${selectedIds.size})`}
            </Button>
          </div>
        </div>

        {/* ── Trade picker ── */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E7E5E4', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: '#78716C', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Filter by trade
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SUB_TRADES.map(t => {
              const active = activeTrade === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTrade(t.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 11px',
                    background: active ? '#1C1917' : '#FAFAF9',
                    color: active ? '#FFFFFF' : '#57534E',
                    border: `1px solid ${active ? '#1C1917' : '#E7E5E4'}`,
                    borderRadius: 99, cursor: 'pointer',
                    fontSize: 12.5, fontWeight: active ? 600 : 400,
                    transition: 'all 0.12s',
                  }}
                >
                  {t.label}
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 10.5,
                    background: active ? 'rgba(255,255,255,0.18)' : '#F0EFEE',
                    color: active ? '#FFF' : '#A8A29E',
                    borderRadius: 99, padding: '1px 6px',
                  }}>
                    {t.subs}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E7E5E4', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>

            {/* Region multi-toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11.5, color: '#78716C', fontWeight: 500, whiteSpace: 'nowrap' }}>Region:</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {allRegions.map(r => {
                  const on = regions.includes(r)
                  return (
                    <button
                      key={r}
                      onClick={() => toggleRegion(r)}
                      style={{
                        padding: '4px 10px', fontSize: 12, borderRadius: 99, cursor: 'pointer',
                        background: on ? '#EEF2FF' : '#FAFAF9',
                        color: on ? '#4338CA' : '#78716C',
                        border: `1px solid ${on ? '#C7D2FE' : '#E7E5E4'}`,
                        fontWeight: on ? 600 : 400,
                        transition: 'all 0.12s',
                      }}
                    >
                      {r}
                    </button>
                  )
                })}
                <button
                  style={{
                    padding: '4px 10px', fontSize: 12, borderRadius: 99, cursor: 'pointer',
                    background: 'transparent', color: '#78716C',
                    border: '1.5px dashed #D6D3D1',
                    transition: 'all 0.12s',
                  }}
                >
                  + Add county
                </button>
              </div>
            </div>

            <div style={{ width: 1, height: 20, background: '#E7E5E4', flexShrink: 0 }} />

            {/* CRM filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11.5, color: '#78716C', fontWeight: 500, whiteSpace: 'nowrap' }}>CRM:</span>
              <SegControl
                options={[
                  { label: 'All subs', value: 'all' },
                  { label: 'In CRM', value: 'in-crm' },
                  { label: 'Not in CRM', value: 'not-in-crm' },
                ]}
                value={crmFilter}
                onChange={setCrmFilter}
              />
            </div>

            <div style={{ width: 1, height: 20, background: '#E7E5E4', flexShrink: 0 }} />

            {/* Compliance filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11.5, color: '#78716C', fontWeight: 500, whiteSpace: 'nowrap' }}>Compliance:</span>
              <SegControl
                options={[
                  { label: 'Any', value: 'any' },
                  { label: 'Fully compliant', value: 'full' },
                ]}
                value={complianceFilter}
                onChange={setComplianceFilter}
              />
            </div>

            <div style={{ flex: 1 }} />

            {/* Sort */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11.5, color: '#78716C', fontWeight: 500, whiteSpace: 'nowrap' }}>Sort:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                style={{
                  padding: '5px 10px', fontSize: 12.5, border: '1px solid #E7E5E4',
                  borderRadius: 7, outline: 'none', color: '#1C1917', background: '#FFFFFF', cursor: 'pointer',
                }}
              >
                <option value="rating">Highest rated</option>
                <option value="price">Lowest price</option>
                <option value="response">Fastest response</option>
              </select>
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#A8A29E', fontSize: 12, pointerEvents: 'none' }}>
                ⌕
              </span>
              <input
                type="text"
                placeholder="Search subs, tags…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  paddingLeft: 26, paddingRight: 10, paddingTop: 5, paddingBottom: 5,
                  fontSize: 12.5, border: '1px solid #E7E5E4', borderRadius: 7,
                  outline: 'none', color: '#1C1917', width: 180,
                }}
              />
            </div>
          </div>

          {/* Selection banner */}
          {selectedIds.size > 0 && (
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 14px',
                background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 8,
                animation: 'cmdkFade 0.15s ease',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: '#3730A3' }}>
                {selectedIds.size} sub{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366F1', fontSize: 12.5, fontWeight: 500 }}
                >
                  Clear
                </button>
                <Button variant="primary" size="sm" onClick={() => setShowRFQ(true)}>
                  Build RFQ →
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Results count ── */}
        <div style={{ fontSize: 12.5, color: '#78716C' }}>
          Showing <span style={{ fontWeight: 600, color: '#1C1917', fontFamily: 'JetBrains Mono, monospace' }}>{filtered.length}</span> sub{filtered.length !== 1 ? 's' : ''}
          {activeTrade !== 'all' && (
            <> in <span style={{ fontWeight: 600, color: '#1C1917' }}>{SUB_TRADES.find(t => t.id === activeTrade)?.label}</span></>
          )}
        </div>

        {/* ── Sub cards grid ── */}
        {filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
            background: '#FFFFFF', border: '1px solid #E7E5E4', borderRadius: 12,
            color: '#A8A29E', fontSize: 14,
          }}>
            No subcontractors match the current filters.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {filtered.map(sub => (
              <SubCard
                key={sub.id}
                sub={sub}
                selected={selectedIds.has(sub.id)}
                onToggle={toggleSub}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── RFQ Modal ── */}
      {showRFQ && (
        <RFQModal
          selectedSubs={selectedSubs}
          onClose={() => setShowRFQ(false)}
          onSend={() => {
            setShowRFQ(false)
            setSelectedIds(new Set())
          }}
        />
      )}
    </>
  )
}
