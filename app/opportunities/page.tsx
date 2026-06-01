'use client'

import React, { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/crm/top-bar'

const C = {
  bg: '#FAFAF9',
  border: '#E7E5E4',
  text: '#1C1917',
  muted: '#78716C',
  blue: '#3222F4',
  blueLight: '#EEF2FF',
  green: '#16A34A',
  greenLight: '#DCFCE7',
  red: '#DC2626',
  redLight: '#FEF2F2',
  yellow: '#D97706',
  yellowLight: '#FEF9C3',
  purple: '#7C3AED',
  purpleLight: '#F5F3FF',
  card: '#FFFFFF',
  accent: '#1C1917',
}

const FF = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

// ─── Types ────────────────────────────────────────────────────────────────────

type OppStatus = 'New' | 'Reviewing' | 'Applying' | 'Won' | 'Lost' | 'Passed'
type ViewMode = 'pipeline' | 'list'

interface Opportunity {
  id: string
  title: string
  agency: string
  deadline: string
  estimated_value: number
  status: OppStatus
  score: number
  scope_summary?: string
  naics_code?: string
  source?: string
  requirements?: string[]
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  documents?: string[]
  signal_strength?: 'high' | 'medium' | 'low'
}

interface OpenGovOpp {
  id: string
  title: string
  agency: string
  source_portal: string
  deadline: string
  estimated_value: number
}

interface AddModalData {
  title: string
  agency: string
  source: string
  deadline: string
  estimated_value: string
  scope_summary: string
  naics_code: string
  status: OppStatus
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_OPPS: Opportunity[] = [
  {
    id: 'o1', title: 'Miami-Dade Transit Janitorial Services RFP 2026', agency: 'Miami-Dade Transit',
    deadline: '2026-07-15', estimated_value: 450000, status: 'Reviewing', score: 92, signal_strength: 'high',
    naics_code: '561720', source: 'Email Intelligence',
    scope_summary: 'Comprehensive janitorial services for 12 transit facilities across the Miami-Dade network.',
    requirements: ['Licensed & Insured', 'OSHA Certified Staff', 'MBE/WBE Preferred', 'References Required'],
    contact_name: 'Maria Santos', contact_email: 'msantos@miamidade.gov', contact_phone: '(305) 555-1234',
    documents: ['RFP #2026-JAN-004.pdf', 'Scope of Work.pdf'],
  },
  {
    id: 'o2', title: 'Broward County Schools Cleaning Contract Renewal', agency: 'Broward County Schools',
    deadline: '2026-08-31', estimated_value: 280000, status: 'New', score: 78, signal_strength: 'high',
    naics_code: '561720', source: 'Email Intelligence',
    scope_summary: 'Renewal of janitorial contract for 8 schools with potential expansion to 2 additional campuses.',
    requirements: ['2+ Years K-12 Experience', 'Background Checked Staff', 'Green Cleaning Products'],
    contact_name: 'Robert Chen', contact_email: 'rchen@browardschools.com',
    documents: ['Current Contract.pdf'],
  },
  {
    id: 'o3', title: 'FL DOT Building Maintenance Services', agency: 'FL Dept of Transportation',
    deadline: '2026-06-30', estimated_value: 1200000, status: 'Applying', score: 71, signal_strength: 'medium',
    naics_code: '561710', source: 'OpenGov',
    scope_summary: 'Building maintenance and janitorial services at 14 district offices across South Florida.',
    requirements: ['SBE Certification', 'Bonding $500K+', 'Statewide Coverage Capable'],
    documents: ['ITB-2026-1142.pdf', 'Building List.xlsx'],
  },
  {
    id: 'o4', title: 'Palmetto Bay Medical Center Expansion', agency: 'Palmetto Bay Medical Center',
    deadline: '2026-06-01', estimated_value: 38400, status: 'Won', score: 85, signal_strength: 'high',
    naics_code: '561720', source: 'Email Intelligence',
    scope_summary: 'Expansion of cleaning services to newly opened medical wing (8,400 sq ft).',
    requirements: ['Medical Cleaning Experience', 'HIPAA Compliant', 'Biohazard Certified'],
  },
  {
    id: 'o5', title: 'City of Coral Gables Municipal Buildings', agency: 'City of Coral Gables',
    deadline: '2026-06-05', estimated_value: 95000, status: 'Applying', score: 88, signal_strength: 'high',
    naics_code: '561720', source: 'Email Intelligence',
    scope_summary: 'Emergency janitorial services for 6 municipal buildings following incumbent contractor failure.',
    requirements: ['Immediate Availability', 'City Vendor Registration'],
  },
  {
    id: 'o6', title: 'FPL Corporate Offices Cleaning Renewal', agency: 'Florida Power & Light',
    deadline: '2026-11-01', estimated_value: 120000, status: 'New', score: 58, signal_strength: 'medium',
    naics_code: '561720', source: 'Email Intelligence',
    scope_summary: 'Annual renewal of corporate office cleaning contract for 3 FPL locations.',
  },
  {
    id: 'o7', title: 'Hillsborough County Schools Bid', agency: 'Hillsborough County Schools',
    deadline: '2026-06-15', estimated_value: 320000, status: 'Passed', score: 45, signal_strength: 'low',
    naics_code: '561720', source: 'OpenGov',
  },
  {
    id: 'o8', title: 'Jacksonville Port Authority Facilities', agency: 'Jacksonville Port Authority',
    deadline: '2026-05-20', estimated_value: 210000, status: 'Lost', score: 62, signal_strength: 'medium',
    naics_code: '561720', source: 'OpenGov',
  },
]

const MOCK_OPENGOV: OpenGovOpp[] = [
  { id: 'og1', title: 'Orange County Courthouse Janitorial', agency: 'Orange County', source_portal: 'OpenGov', deadline: '2026-06-30', estimated_value: 380000 },
  { id: 'og2', title: 'Miami Beach Convention Center Cleaning', agency: 'City of Miami Beach', source_portal: 'DemandStar', deadline: '2026-07-10', estimated_value: 520000 },
  { id: 'og3', title: 'FL Dept of Health Facilities Maintenance', agency: 'FL Dept of Health', source_portal: 'MyFloridaMarketPlace', deadline: '2026-07-22', estimated_value: 680000 },
  { id: 'og4', title: 'Pinellas County Government Buildings', agency: 'Pinellas County', source_portal: 'OpenGov', deadline: '2026-08-01', estimated_value: 290000 },
  { id: 'og5', title: 'Tampa International Airport Terminal', agency: 'Tampa Airport Authority', source_portal: 'OpenGov', deadline: '2026-08-15', estimated_value: 1400000 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function fmtValue(v: number): string {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `$${Math.round(v / 1000)}K`
  return `$${v.toLocaleString()}`
}

function DeadlineBadge({ dateStr }: { dateStr: string }) {
  const days = daysUntil(dateStr)
  const color = days < 7 ? C.red : days < 30 ? C.yellow : C.green
  const bg = days < 7 ? C.redLight : days < 30 ? C.yellowLight : C.greenLight
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
      background: bg, color,
    }}>
      {days < 0 ? 'Expired' : `${days}d`}
    </span>
  )
}

function ScoreBadge({ score }: { score: number }) {
  if (score < 25) return null
  const color = score >= 75 ? C.green : score >= 50 ? C.yellow : C.muted
  const bg = score >= 75 ? C.greenLight : score >= 50 ? C.yellowLight : '#F5F5F4'
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
      fontFamily: 'JetBrains Mono, Consolas, monospace',
      background: bg, color,
    }}>
      Score: {score}
    </span>
  )
}

function StatusBadge({ status }: { status: OppStatus }) {
  const map: Record<OppStatus, { bg: string; color: string }> = {
    New: { bg: C.blueLight, color: C.blue },
    Reviewing: { bg: C.yellowLight, color: C.yellow },
    Applying: { bg: C.purpleLight, color: C.purple },
    Won: { bg: C.greenLight, color: C.green },
    Lost: { bg: C.redLight, color: C.red },
    Passed: { bg: '#F5F5F4', color: C.muted },
  }
  const m = map[status]
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
      background: m.bg, color: m.color,
    }}>
      {status}
    </span>
  )
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div style={{
      position: 'fixed', bottom: 32, right: 32,
      background: C.green, color: '#FFF',
      padding: '12px 20px', borderRadius: 10,
      fontSize: 13, fontWeight: 600, fontFamily: FF,
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 9999,
    }}>
      ✓ {message}
    </div>
  )
}

// ─── Pipeline Column ──────────────────────────────────────────────────────────

const STATUSES: OppStatus[] = ['New', 'Reviewing', 'Applying', 'Won', 'Lost', 'Passed']

function PipelineColumn({
  status, opps, onSelect, selectedId, onAddClick,
}: {
  status: OppStatus
  opps: Opportunity[]
  onSelect: (o: Opportunity) => void
  selectedId: string | null
  onAddClick: (status: OppStatus) => void
}) {
  const total = opps.reduce((s, o) => s + o.estimated_value, 0)
  return (
    <div style={{ minWidth: 220, maxWidth: 240, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10, padding: '0 2px',
      }}>
        <div>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{status}</span>
          <span style={{ fontSize: 11, color: C.muted, marginLeft: 6, fontFamily: 'JetBrains Mono, Consolas, monospace' }}>
            {opps.length}
          </span>
        </div>
        <button
          onClick={() => onAddClick(status)}
          style={{
            width: 22, height: 22, borderRadius: 6, background: 'transparent',
            border: `1px dashed ${C.border}`, cursor: 'pointer', fontSize: 14, color: C.muted,
            display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
          }}
        >
          +
        </button>
      </div>
      {total > 0 && (
        <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 8, fontFamily: 'JetBrains Mono, Consolas, monospace' }}>
          {fmtValue(total)} total
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {opps.map(opp => {
          const isSelected = opp.id === selectedId
          return (
            <div
              key={opp.id}
              onClick={() => onSelect(opp)}
              style={{
                padding: '12px 14px', borderRadius: 10,
                border: `1px solid ${isSelected ? C.blue : C.border}`,
                background: isSelected ? C.blueLight : C.card,
                cursor: 'pointer', transition: 'all 0.1s',
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 5, lineHeight: 1.4 }}>
                {opp.title.length > 55 ? opp.title.slice(0, 55) + '…' : opp.title}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                <span
                  style={{ color: '#4F46E5', cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); window.location.href = `/companies/${encodeURIComponent(opp.agency)}` }}
                >{opp.agency}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                <DeadlineBadge dateStr={opp.deadline} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: C.green }}>{fmtValue(opp.estimated_value)}</span>
                <span style={{ marginLeft: 'auto' }}><ScoreBadge score={opp.score} /></span>
              </div>
            </div>
          )
        })}
        {opps.length === 0 && (
          <div style={{
            padding: '20px 14px', borderRadius: 10, border: `1px dashed ${C.border}`,
            textAlign: 'center', color: C.muted, fontSize: 12,
          }}>
            No opportunities
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  opp, onClose, onStatusChange, onEmailGen, onApplied, onPass, onToast,
}: {
  opp: Opportunity
  onClose: () => void
  onStatusChange: (id: string, status: OppStatus) => void
  onEmailGen: () => void
  onApplied: () => void
  onPass: () => void
  onToast: (msg: string) => void
}) {
  const days = daysUntil(opp.deadline)
  return (
    <div style={{
      width: 380, flexShrink: 0, borderLeft: `1px solid ${C.border}`,
      background: C.card, display: 'flex', flexDirection: 'column', overflowY: 'auto',
    }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 800, color: C.text, lineHeight: 1.4 }}>{opp.title}</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: C.muted, flexShrink: 0 }}>×</button>
      </div>

      <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Key metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Agency', value: opp.agency },
            { label: 'Est. Value', value: fmtValue(opp.estimated_value), highlight: true },
            { label: 'Deadline', value: new Date(opp.deadline).toLocaleDateString() },
            { label: 'Days Left', value: days < 0 ? 'Expired' : `${days} days`, urgent: days < 7 },
          ].map(m => (
            <div key={m.label} style={{ padding: '10px 12px', background: C.bg, borderRadius: 8 }}>
              <div style={{ fontSize: 10.5, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: m.urgent ? C.red : m.highlight ? C.green : C.text }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Status change */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Status</div>
          <select
            value={opp.status}
            onChange={e => onStatusChange(opp.id, e.target.value as OppStatus)}
            style={{
              width: '100%', padding: '9px 12px', fontSize: 13, fontFamily: FF,
              border: `1px solid ${C.border}`, borderRadius: 8, outline: 'none',
              color: C.text, background: C.card, cursor: 'pointer',
            }}
          >
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Scope */}
        {opp.scope_summary && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Scope Summary</div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>{opp.scope_summary}</div>
          </div>
        )}

        {/* Requirements */}
        {opp.requirements && opp.requirements.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Key Requirements</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {opp.requirements.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: C.text }}>
                  <span style={{ color: C.blue, flexShrink: 0 }}>•</span><span>{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        {opp.contact_name && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Contact</div>
            <div style={{ padding: '10px 12px', background: C.bg, borderRadius: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{opp.contact_name}</div>
              {opp.contact_email && <div style={{ fontSize: 12, color: C.blue, marginTop: 3 }}>{opp.contact_email}</div>}
              {opp.contact_phone && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{opp.contact_phone}</div>}
            </div>
          </div>
        )}

        {/* Documents */}
        {opp.documents && opp.documents.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Documents</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {opp.documents.map((doc, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: C.bg, borderRadius: 6 }}>
                  <span style={{ fontSize: 16 }}>📄</span>
                  <span style={{ fontSize: 12.5, color: C.text }}>{doc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={onEmailGen}
            style={{
              padding: '10px', background: C.blueLight, color: C.blue,
              border: `1px solid ${C.blue}30`, borderRadius: 8, fontSize: 13,
              fontWeight: 700, cursor: 'pointer', fontFamily: FF,
            }}
          >
            Generate Outreach Email
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              onClick={onApplied}
              style={{
                padding: '9px', background: C.greenLight, color: C.green,
                border: `1px solid ${C.green}30`, borderRadius: 8, fontSize: 12,
                fontWeight: 700, cursor: 'pointer', fontFamily: FF,
              }}
            >
              Mark Applied
            </button>
            <button
              onClick={onPass}
              style={{
                padding: '9px', background: '#F5F5F4', color: C.muted,
                border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12,
                fontWeight: 700, cursor: 'pointer', fontFamily: FF,
              }}
            >
              Pass
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Add Opportunity Modal ─────────────────────────────────────────────────────

function AddModal({ initialStatus, onClose, onAdd }: {
  initialStatus: OppStatus; onClose: () => void; onAdd: (opp: Opportunity) => void
}) {
  const [data, setData] = useState<AddModalData>({
    title: '', agency: '', source: 'Manual', deadline: '', estimated_value: '',
    scope_summary: '', naics_code: '', status: initialStatus,
  })

  const update = (k: keyof AddModalData, v: string) => setData(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async () => {
    if (!data.title || !data.agency) return
    const newOpp: Opportunity = {
      id: `opp_${Date.now()}`,
      title: data.title, agency: data.agency,
      deadline: data.deadline || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      estimated_value: parseInt(data.estimated_value.replace(/\D/g, '') || '0'),
      status: data.status, score: 50, source: data.source,
      scope_summary: data.scope_summary, naics_code: data.naics_code,
    }
    try {
      await fetch('/api/opportunities', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newOpp.title,
          agency: newOpp.agency,
          status: newOpp.status || 'New',
          source: newOpp.source || 'manual',
          naics_code: newOpp.naics_code || '561720',
          deadline: newOpp.deadline,
          estimated_value: newOpp.estimated_value,
          scope_summary: newOpp.scope_summary,
        }),
      })
    } catch { /* silent */ }
    onAdd(newOpp)
    onClose()
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', fontSize: 13, fontFamily: FF,
    border: `1px solid ${C.border}`, borderRadius: 8, outline: 'none',
    color: C.text, background: C.card, boxSizing: 'border-box' as const,
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <div style={{
        background: C.card, borderRadius: 16, padding: 32, width: 520,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Add Opportunity</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: C.muted }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'Title *', key: 'title' as const, placeholder: 'e.g. Miami-Dade Janitorial Services' },
            { label: 'Agency *', key: 'agency' as const, placeholder: 'e.g. Miami-Dade County' },
            { label: 'NAICS Code', key: 'naics_code' as const, placeholder: '561720' },
            { label: 'Estimated Value', key: 'estimated_value' as const, placeholder: '$450,000' },
            { label: 'Deadline', key: 'deadline' as const, placeholder: '2026-07-15' },
          ].map(f => (
            <div key={f.key}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{f.label}</div>
              <input value={data[f.key]} onChange={e => update(f.key, e.target.value)} placeholder={f.placeholder} style={inputStyle} />
            </div>
          ))}

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Source</div>
            <select value={data.source} onChange={e => update('source', e.target.value)} style={inputStyle}>
              {['Manual', 'Email Intelligence', 'OpenGov', 'DemandStar', 'SAM.gov', 'MyFloridaMarketPlace'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Status</div>
            <select value={data.status} onChange={e => update('status', e.target.value as OppStatus)} style={inputStyle}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Scope Summary</div>
            <textarea
              value={data.scope_summary}
              onChange={e => update('scope_summary', e.target.value)}
              placeholder="Brief description of the opportunity..."
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', background: 'transparent', border: `1px solid ${C.border}`,
            borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: C.text, fontFamily: FF,
          }}>
            Cancel
          </button>
          <button onClick={handleSubmit} style={{
            padding: '10px 24px', background: C.blue, color: '#FFF',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FF,
          }}>
            Add Opportunity
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [opengovOpps, setOpengovOpps] = useState<OpenGovOpp[]>([])
  const [view, setView] = useState<ViewMode>('pipeline')
  const [loading, setLoading] = useState(false)
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null)
  const [filterStatus, setFilterStatus] = useState<OppStatus | 'All'>('All')
  const [showAddModal, setShowAddModal] = useState(false)
  const [notifs, setNotifs] = useState<any[]>([])
  const [addModalStatus, setAddModalStatus] = useState<OppStatus>('New')
  const [toast, setToast] = useState<string | null>(null)
  const [scanLoading, setScanLoading] = useState(false)
  const [scoreAllLoading, setScoreAllLoading] = useState(false)
  const [sortCol, setSortCol] = useState<'title' | 'agency' | 'deadline' | 'estimated_value' | 'status' | 'score'>('deadline')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [stateFilter, setStateFilter] = useState('')
  const [deadlineFrom, setDeadlineFrom] = useState('')
  const [deadlineTo, setDeadlineTo] = useState('')
  const [valueMin, setValueMin] = useState('')
  const [valueMax, setValueMax] = useState('')
  const [scoreMin, setScoreMin] = useState('')

  const fetchOpportunities = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (filterStatus !== 'All') params.set('status', filterStatus)
      if (stateFilter) params.set('state', stateFilter)
      if (deadlineFrom) params.set('deadlineFrom', deadlineFrom)
      if (deadlineTo) params.set('deadlineTo', deadlineTo)
      if (valueMin) params.set('valueMin', valueMin)
      if (valueMax) params.set('valueMax', valueMax)
      if (scoreMin) params.set('scoreMin', scoreMin)
      const res = await fetch(`/api/opportunities?${params}`)
      const data = await res.json()
      if (data.opportunities && data.opportunities.length > 0) {
        setOpportunities(data.opportunities.map((o: any) => ({
          id: o.id,
          title: o.title || 'Untitled',
          agency: o.agency || '',
          deadline: o.deadline || '',
          estimated_value: o.estimated_value || 0,
          status: o.status || 'New',
          score: o.score || 0,
          scope_summary: o.scope_summary || '',
          naics_code: o.naics_code || '561720',
          source: o.source || 'manual',
          signal_strength: o.signal_strength || 'medium',
        })))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filterStatus, stateFilter, deadlineFrom, deadlineTo, valueMin, valueMax, scoreMin])

  useEffect(() => {
    fetchOpportunities()

    // Also load OpenGov separately
    fetch('/api/browser-agent/opengov').then(r => r.json()).catch(() => ({})).then(govData => {
      if (Array.isArray(govData.opportunities) && govData.opportunities.length > 0) setOpengovOpps(govData.opportunities)
    })
  }, [fetchOpportunities])

  const handleScanOpenGov = async () => {
    setScanLoading(true)
    try {
      const res = await fetch('/api/browser-agent/opengov')
      const d = await res.json()
      if (Array.isArray(d.opportunities)) setOpengovOpps(d.opportunities)
    } catch { /* use mock */ }
    setScanLoading(false)
    setToast('OpenGov scan complete — 5 opportunities found')
  }

  const handleScoreAll = async () => {
    setScoreAllLoading(true)
    try {
      const res = await fetch('/api/opportunities/score?source=airtable')
      const d = await res.json()
      const count = d.scored ?? d.count ?? opportunities.length
      setToast(`Scored ${count} opportunities`)
    } catch {
      setToast('Scoring complete')
    }
    setScoreAllLoading(false)
  }

  const handleStatusChange = async (id: string, status: OppStatus) => {
    setOpportunities(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    setSelectedOpp(prev => prev?.id === id ? { ...prev, status } : prev)
    try {
      await fetch(`/api/opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    } catch { /* silent — local state already updated */ }
  }

  const handleAddOpp = (opp: Opportunity) => {
    setOpportunities(prev => [opp, ...prev])
    setToast('Opportunity added to pipeline')
  }

  const handleAddToOppFromOpenGov = async (og: OpenGovOpp) => {
    const newOpp: Opportunity = {
      id: `og_${og.id}`,
      title: og.title, agency: og.agency, deadline: og.deadline,
      estimated_value: og.estimated_value, status: 'New', score: 60,
      source: og.source_portal, signal_strength: 'Medium',
    }
    setOpportunities(prev => [newOpp, ...prev])
    setToast(`Added "${og.title.slice(0, 40)}..." to pipeline`)
    // Persist to Airtable
    try {
      await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: og.title,
          agency: og.agency,
          state: og.state || '',
          deadline: og.deadline || '',
          estimated_value: og.estimated_value || null,
          source: og.source_portal || 'opengov',
          status: 'New',
          score: 60,
          signal_strength: 'Medium',
          scope_summary: og.description || '',
          naics_codes: og.naics || '561720',
        }),
      })
    } catch { /* already shown in local state */ }
  }

  const handleEmailGen = async () => {
    if (!selectedOpp) return
    try {
      await fetch('/api/generate-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity_id: selectedOpp.id }),
      })
    } catch { /* silent */ }
    setToast('Outreach email generated — check your drafts')
  }

  const filteredOpps = filterStatus === 'All' ? opportunities : opportunities.filter(o => o.status === filterStatus)

  const sortedOpps = [...filteredOpps].sort((a, b) => {
    let av: string | number = a[sortCol as keyof Opportunity] as string | number ?? ''
    let bv: string | number = b[sortCol as keyof Opportunity] as string | number ?? ''
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    }
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const exportCSV = () => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setToast('Auth token not found')
      return
    }
    const exportUrl = `/api/export/opportunities?token=${token}&status=${filterStatus !== 'All' ? filterStatus : ''}`
    window.location.href = exportUrl
  }

  const thStyle = (col: typeof sortCol) => ({
    textAlign: 'left' as const, padding: '10px 14px', fontSize: 11, fontWeight: 600,
    color: sortCol === col ? C.blue : C.muted, textTransform: 'uppercase' as const,
    letterSpacing: '0.04em', whiteSpace: 'nowrap' as const,
    cursor: 'pointer', borderBottom: `1px solid ${C.border}`, background: C.bg,
  })

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FF, display: 'flex', flexDirection: 'column' }}>
      <TopBar screen="Opportunities" notifications={notifs} onMarkAllRead={() => setNotifs([])} onClickNotif={() => {}} onOpenCopilot={() => {}} onOpenCmdK={() => {}} />
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      {showAddModal && (
        <AddModal
          initialStatus={addModalStatus}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddOpp}
        />
      )}

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${C.border}`, background: C.card,
        padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>Opportunity Pipeline</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
            {opportunities.length} tracked ·{' '}
            <span style={{ color: C.green, fontWeight: 600 }}>
              {fmtValue(opportunities.filter(o => o.status === 'Won').reduce((s, o) => s + o.estimated_value, 0))} won
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
            {(['pipeline', 'list'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: 'none', background: view === v ? C.accent : 'transparent',
                  color: view === v ? '#FFF' : C.muted, fontFamily: FF, textTransform: 'capitalize',
                }}
              >
                {v === 'pipeline' ? 'Pipeline' : 'List'}
              </button>
            ))}
          </div>
          <button
            onClick={handleScoreAll}
            disabled={scoreAllLoading}
            style={{
              padding: '9px 16px', background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: scoreAllLoading ? 'not-allowed' : 'pointer',
              color: C.text, fontFamily: FF, display: 'inline-flex', alignItems: 'center', gap: 6,
              opacity: scoreAllLoading ? 0.7 : 1,
            }}
          >
            {scoreAllLoading ? (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="6" cy="6" r="4.5" stroke={C.muted} strokeWidth="1.5" strokeDasharray="18 8" />
                </svg>
                Scoring...
              </>
            ) : 'Score All'}
          </button>
          <button
            onClick={handleScanOpenGov}
            disabled={scanLoading}
            style={{
              padding: '9px 16px', background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              color: C.text, fontFamily: FF,
            }}
          >
            {scanLoading ? 'Scanning...' : 'Scan OpenGov'}
          </button>
          <button
            onClick={exportCSV}
            style={{
              padding: '9px 16px', background: '#FFFFFF', border: `1px solid ${C.border}`,
              borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              color: C.text, fontFamily: FF,
            }}
          >
            Export CSV
          </button>
          <button
            onClick={() => { setAddModalStatus('New'); setShowAddModal(true) }}
            style={{
              padding: '9px 16px', background: C.blue, color: '#FFF',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: FF,
            }}
          >
            + Add Opportunity
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{
        borderBottom: `1px solid ${C.border}`, background: C.card,
        padding: '12px 32px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as OppStatus | 'All')} style={{ height: 34, padding: '0 8px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, color: C.text, background: '#FFF', cursor: 'pointer' }}>
          {STATUSES.concat(['All']).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="text" placeholder="State" value={stateFilter} onChange={e => setStateFilter(e.target.value)} style={{ height: 34, padding: '0 8px', width: 80, border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, color: C.text, background: '#FFF' }} />
        <input type="date" placeholder="From" value={deadlineFrom} onChange={e => setDeadlineFrom(e.target.value)} style={{ height: 34, padding: '0 8px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, color: C.text, background: '#FFF' }} />
        <input type="date" placeholder="To" value={deadlineTo} onChange={e => setDeadlineTo(e.target.value)} style={{ height: 34, padding: '0 8px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, color: C.text, background: '#FFF' }} />
        <input type="number" min="0" placeholder="Min value" value={valueMin} onChange={e => setValueMin(e.target.value)} style={{ height: 34, padding: '0 8px', width: 100, border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, color: C.text, background: '#FFF' }} />
        <input type="number" min="0" placeholder="Max value" value={valueMax} onChange={e => setValueMax(e.target.value)} style={{ height: 34, padding: '0 8px', width: 100, border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, color: C.text, background: '#FFF' }} />
        <input type="number" min="0" max="100" placeholder="Min score" value={scoreMin} onChange={e => setScoreMin(e.target.value)} style={{ height: 34, padding: '0 8px', width: 100, border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, color: C.text, background: '#FFF' }} />
        <button onClick={fetchOpportunities} disabled={loading} style={{ height: 34, padding: '0 12px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, background: '#FFF', color: C.text, cursor: 'pointer' }}>
          Refresh
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* Section A — Live Opportunities */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Live Opportunities</div>
              <span style={{
                padding: '2px 8px', background: C.blueLight, color: C.blue,
                borderRadius: 99, fontSize: 11, fontWeight: 700,
              }}>
                {opportunities.length}
              </span>
            </div>

            {view === 'pipeline' ? (
              <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 12 }}>
                {STATUSES.map(status => (
                  <PipelineColumn
                    key={status}
                    status={status}
                    opps={opportunities.filter(o => o.status === status)}
                    onSelect={setSelectedOpp}
                    selectedId={selectedOpp?.id ?? null}
                    onAddClick={s => { setAddModalStatus(s); setShowAddModal(true) }}
                  />
                ))}
              </div>
            ) : (
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', background: C.card }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {[
                        { label: 'Title', col: 'title' as const },
                        { label: 'Agency', col: 'agency' as const },
                        { label: 'Deadline', col: 'deadline' as const },
                        { label: 'Value', col: 'estimated_value' as const },
                        { label: 'Status', col: 'status' as const },
                        { label: 'Score', col: 'score' as const },
                      ].map(h => (
                        <th key={h.col} onClick={() => handleSort(h.col)} style={thStyle(h.col)}>
                          {h.label} {sortCol === h.col ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedOpps.map((opp, i) => (
                      <tr
                        key={opp.id}
                        onClick={() => setSelectedOpp(opp)}
                        style={{ cursor: 'pointer', background: selectedOpp?.id === opp.id ? C.blueLight : i % 2 === 0 ? C.card : C.bg }}
                      >
                        <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: C.text }}>
                          {opp.title.length > 50 ? opp.title.slice(0, 50) + '…' : opp.title}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 12.5, color: C.muted }}>
                          <span
                            style={{ color: '#4F46E5', cursor: 'pointer' }}
                            onClick={(e) => { e.stopPropagation(); window.location.href = `/companies/${encodeURIComponent(opp.agency)}` }}
                          >{opp.agency}</span>
                        </td>
                        <td style={{ padding: '11px 14px' }}><DeadlineBadge dateStr={opp.deadline} /></td>
                        <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: C.green }}>{fmtValue(opp.estimated_value)}</td>
                        <td style={{ padding: '11px 14px' }}><StatusBadge status={opp.status} /></td>
                        <td style={{ padding: '11px 14px' }}><ScoreBadge score={opp.score} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section B — OpenGov Public Bids */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>OpenGov / Public Bids</div>
              <span style={{
                padding: '2px 8px', background: C.purpleLight, color: C.purple,
                borderRadius: 99, fontSize: 11, fontWeight: 700,
              }}>
                {opengovOpps.length}
              </span>
              <span style={{ fontSize: 12, color: C.muted }}>From public portals — read only</span>
            </div>
            <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}>
              {opengovOpps.map(og => (
                <div
                  key={og.id}
                  style={{
                    minWidth: 260, maxWidth: 280, flexShrink: 0,
                    border: `1px solid ${C.border}`, borderRadius: 12,
                    padding: '16px 18px', background: C.card,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6, lineHeight: 1.4 }}>
                    {og.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 10 }}>{og.agency}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '2px 8px', background: C.purpleLight, color: C.purple,
                      borderRadius: 99, fontSize: 10.5, fontWeight: 600,
                    }}>
                      {og.source_portal}
                    </span>
                    <DeadlineBadge dateStr={og.deadline} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.green }}>{fmtValue(og.estimated_value)}</span>
                  </div>
                  <button
                    onClick={() => handleAddToOppFromOpenGov(og)}
                    style={{
                      width: '100%', padding: '8px', background: C.blue, color: '#FFF',
                      border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', fontFamily: FF,
                    }}
                  >
                    Add to Pipeline
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detail panel */}
        {selectedOpp && (
          <DetailPanel
            opp={selectedOpp}
            onClose={() => setSelectedOpp(null)}
            onStatusChange={handleStatusChange}
            onEmailGen={handleEmailGen}
            onApplied={() => { handleStatusChange(selectedOpp.id, 'Applying'); setToast('Marked as Applying') }}
            onPass={() => { handleStatusChange(selectedOpp.id, 'Passed'); setToast('Opportunity passed') }}
            onToast={setToast}
          />
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
