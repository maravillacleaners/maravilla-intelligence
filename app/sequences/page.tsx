'use client'

import { useState } from 'react'
import TopBar from '@/components/crm/top-bar'
import { Chip } from '@/components/crm/ui'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SequenceStep {
  day: number
  channel: 'email' | 'linkedin' | 'phone' | 'system'
  template: string
  required: boolean
}

interface SequenceStats {
  enrolled: number
  opened: number
  replied: number
  booked: number
}

interface Sequence {
  id: string
  name: string
  active: boolean
  owner: string
  createdAt: string
  enrolledTotal: number
  stats: SequenceStats
  steps: SequenceStep[]
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const SEQUENCES: Sequence[] = [
  {
    id: 'seq-warm-pm',
    name: 'Warm intro · Property Manager',
    active: true,
    owner: 'sarah.k',
    createdAt: '2026-03-12',
    enrolledTotal: 284,
    stats: { enrolled: 142, opened: 0.67, replied: 0.18, booked: 0.09 },
    steps: [
      { day: 0, channel: 'email', template: 'Variant: Warm intro', required: true },
      { day: 2, channel: 'linkedin', template: 'Connection request + soft mention', required: false },
      { day: 5, channel: 'email', template: 'Bump · case study from same building', required: true },
      { day: 8, channel: 'phone', template: 'Brief intro call · 90s pitch', required: false },
      { day: 12, channel: 'email', template: 'Last-chance · sample SOW attached', required: true },
      { day: 18, channel: 'system', template: 'Auto-drop · move to dormant nurture', required: true },
    ],
  },
  {
    id: 'seq-govcon',
    name: 'Federal teaming · NAICS 561720',
    active: true,
    owner: 'marcus.r',
    createdAt: '2026-04-01',
    enrolledTotal: 52,
    stats: { enrolled: 28, opened: 0.71, replied: 0.32, booked: 0.18 },
    steps: [
      { day: 0, channel: 'email', template: 'Teaming inquiry · prime contractor', required: true },
      { day: 3, channel: 'linkedin', template: 'Connect with capture manager', required: true },
      { day: 7, channel: 'email', template: 'Capability statement attached', required: true },
      { day: 12, channel: 'phone', template: 'Discovery call · scope alignment', required: false },
    ],
  },
  {
    id: 'seq-healthcare',
    name: 'Healthcare · dental & outpatient',
    active: false,
    owner: 'sarah.k',
    createdAt: '2026-02-18',
    enrolledTotal: 89,
    stats: { enrolled: 31, opened: 0.52, replied: 0.12, booked: 0.06 },
    steps: [
      { day: 0, channel: 'email', template: 'Healthcare intro · compliance focus', required: true },
      { day: 4, channel: 'email', template: 'HIPAA cert + insurance proof', required: true },
      { day: 9, channel: 'phone', template: 'Quick qualification call', required: false },
      { day: 14, channel: 'email', template: 'Case study · dental chain', required: true },
      { day: 20, channel: 'system', template: 'Auto-drop · move to nurture', required: true },
    ],
  },
  {
    id: 'seq-hoa',
    name: 'HOA · high-ticket buildings',
    active: true,
    owner: 'sarah.k',
    createdAt: '2026-04-15',
    enrolledTotal: 44,
    stats: { enrolled: 22, opened: 0.61, replied: 0.22, booked: 0.13 },
    steps: [
      { day: 0, channel: 'email', template: 'HOA board intro + building ref', required: true },
      { day: 3, channel: 'linkedin', template: 'Connect with HOA president', required: false },
      { day: 7, channel: 'email', template: 'Proposal template + pricing grid', required: true },
      { day: 12, channel: 'phone', template: 'Follow-up call · address objections', required: false },
    ],
  },
]

// ─── Channel metadata ─────────────────────────────────────────────────────────

const CHANNEL_META: Record<SequenceStep['channel'], { color: string; bg: string; bd: string }> = {
  email:    { color: '#4F46E5', bg: '#EEF2FF', bd: '#E0E7FF' },
  linkedin: { color: '#0EA5E9', bg: '#F0F9FF', bd: '#BAE6FD' },
  phone:    { color: '#059669', bg: '#ECFDF5', bd: '#D1FAE5' },
  system:   { color: '#78716C', bg: '#FAFAF9', bd: '#E7E5E4' },
}

// ─── Channel SVG icons ────────────────────────────────────────────────────────

function ChannelIcon({ channel, size = 14 }: { channel: SequenceStep['channel']; size?: number }) {
  const meta = CHANNEL_META[channel]

  const iconContent = () => {
    switch (channel) {
      case 'email':
        return (
          <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke={meta.color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="10" height="8" rx="1.5" />
            <path d="M2.5 4l4.5 3.5L11.5 4" />
          </svg>
        )
      case 'linkedin':
        return (
          <svg width={size} height={size} viewBox="0 0 14 14" fill={meta.color}>
            <path d="M3 5h2v7H3V5zm1-3a1 1 0 110 2 1 1 0 010-2zm3 3h2v1c.5-.7 1.5-1.2 2.5-1.2 2 0 2.5 1.3 2.5 3V12h-2V8.3c0-1-.3-1.7-1.2-1.7-1 0-1.4.7-1.4 1.7V12H7V5z" />
          </svg>
        )
      case 'phone':
        return (
          <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke={meta.color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 2.5a1 1 0 011-1h1.5l1 2.5L5 5a8 8 0 004 4l1-1.5 2.5 1V10a1 1 0 01-1 1A9.5 9.5 0 013 2.5z" />
          </svg>
        )
      case 'system':
        return (
          <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke={meta.color} strokeWidth="1.4" strokeLinecap="round">
            <circle cx="7" cy="7" r="2" />
            <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13" />
          </svg>
        )
    }
  }

  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: meta.bg,
        border: `1px solid ${meta.bd}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {iconContent()}
    </div>
  )
}

// ─── Toggle component ─────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 32,
        height: 18,
        borderRadius: 999,
        background: on ? '#4F46E5' : '#D6D3D1',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 16 : 2,
          width: 14,
          height: 14,
          borderRadius: 999,
          background: '#FFFFFF',
          transition: 'left 150ms',
          boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
        }}
      />
    </button>
  )
}

// ─── Sequence list card (left panel) ─────────────────────────────────────────

function SequenceListCard({
  seq,
  selected,
  onClick,
}: {
  seq: Sequence
  selected: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '12px 14px',
        borderRadius: 10,
        border: selected ? '1px solid #4F46E5' : `1px solid ${hovered ? '#C7C3C0' : '#E7E5E4'}`,
        background: selected ? '#EEF2FF' : hovered ? '#FAFAF9' : '#FFFFFF',
        cursor: 'pointer',
        transition: 'border-color 120ms, background 120ms',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#1C1917', lineHeight: 1.3 }}>
          {seq.name}
        </span>
        <Chip tone={seq.active ? 'emerald' : 'neutral'} size="sm">
          {seq.active ? 'Active' : 'Paused'}
        </Chip>
      </div>
      <div
        style={{
          fontSize: 11.5,
          color: '#78716C',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {seq.stats.enrolled} enrolled · {Math.round(seq.stats.booked * 100)}% booked
      </div>
    </div>
  )
}

// ─── Step row ─────────────────────────────────────────────────────────────────

function StepRow({
  step,
  isLast,
}: {
  step: SequenceStep
  isLast: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{ display: 'flex', gap: 12, position: 'relative' }}>
      {/* Connector line */}
      {!isLast && (
        <div
          style={{
            position: 'absolute',
            left: 17,
            top: 44,
            width: 1,
            height: 'calc(100% - 8px)',
            background: '#E7E5E4',
            zIndex: 0,
          }}
        />
      )}

      {/* Channel icon */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 1 }}>
        <ChannelIcon channel={step.channel} size={14} />
      </div>

      {/* Step card */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          flex: 1,
          padding: '10px 12px',
          border: `1px solid ${hovered ? '#C7C3C0' : '#E7E5E4'}`,
          borderRadius: 8,
          background: hovered ? '#FAFAF9' : '#FFFFFF',
          cursor: 'pointer',
          transition: 'border-color 120ms, background 120ms',
          marginBottom: isLast ? 0 : 8,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: '#1C1917', textTransform: 'capitalize' }}>
              {step.channel}
            </span>
            <span
              style={{
                fontSize: 11,
                color: '#78716C',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              day {step.day}
            </span>
            <Chip tone={step.required ? 'indigo' : 'neutral'} size="sm">
              {step.required ? 'Required' : 'Optional'}
            </Chip>
          </div>
          <div style={{ fontSize: 12, color: '#78716C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {step.template}
          </div>
        </div>

        {/* Chevron right */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, color: '#A8A29E' }}>
          <path d="M5 3l4 4-4 4" stroke="#A8A29E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )
}

// ─── Stats funnel ─────────────────────────────────────────────────────────────

function StatFunnelCol({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub: string
  accent?: boolean
}) {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: 10,
        background: accent ? '#EEF2FF' : '#FAFAF9',
        border: `1px solid ${accent ? '#E0E7FF' : '#E7E5E4'}`,
        flex: 1,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#A8A29E', marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: accent ? '#4F46E5' : '#1C1917',
          fontFamily: "'JetBrains Mono', monospace",
          lineHeight: 1,
          marginBottom: 4,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11.5, color: '#78716C' }}>{sub}</div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SequencesPage() {
  const [selectedId, setSelectedId] = useState<string>(SEQUENCES[0].id)
  const [rules, setRules] = useState({
    pauseOnReply: true,
    skipWeekends: true,
    businessHours: true,
    stopOnOptOut: true,
  })

  const selected = SEQUENCES.find((s) => s.id === selectedId) ?? SEQUENCES[0]

  const fmtPct = (n: number) => `${Math.round(n * 100)}%`
  const fmtCount = (n: number, pct: number) => `${Math.round(n * pct)} prospects`

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FAFAF9',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#1C1917',
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
        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
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
            Outreach
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1C1917', letterSpacing: -0.5, marginBottom: 4 }}>
            Sequences
          </div>
          <div style={{ fontSize: 13.5, color: '#78716C' }}>
            Multi-channel cadences · email + LinkedIn + phone + auto-drop · live A/B tracked
          </div>
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>

          {/* ── Left panel ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Create sequence button */}
            <button
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                padding: '10px 14px',
                background: '#4F46E5',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 120ms',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = '#4338CA'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = '#4F46E5'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 1v11M1 6.5h11" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Create sequence
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M3 6.5h7M7 4l2.5 2.5L7 9" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Sequence list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SEQUENCES.map((seq) => (
                <SequenceListCard
                  key={seq.id}
                  seq={seq}
                  selected={seq.id === selectedId}
                  onClick={() => setSelectedId(seq.id)}
                />
              ))}
            </div>
          </div>

          {/* ── Right panel ── */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E7E5E4',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {/* Header bar */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E7E5E4',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#A8A29E',
                    marginBottom: 3,
                  }}
                >
                  Sequence
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1917', marginBottom: 3 }}>
                  {selected.name}
                </div>
                <div style={{ fontSize: 12, color: '#78716C' }}>
                  Owner: <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{selected.owner}</span>
                  {' · '}
                  Created {selected.createdAt}
                  {' · '}
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{selected.enrolledTotal}</span> total enrolled
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <ActionButton label="Duplicate" icon={
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <rect x="1" y="4" width="7" height="8" rx="1.5" stroke="#57534E" strokeWidth="1.3" />
                    <path d="M4 2.5h6a1 1 0 011 1v7" stroke="#57534E" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                } />
                <ActionButton
                  label={selected.active ? 'Pause' : 'Activate'}
                  icon={
                    selected.active ? (
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <rect x="3" y="2" width="2.5" height="9" rx="1" fill="#57534E" />
                        <rect x="7.5" y="2" width="2.5" height="9" rx="1" fill="#57534E" />
                      </svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M3.5 2.5l7 4-7 4V2.5z" fill="#57534E" />
                      </svg>
                    )
                  }
                />
                <button
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 12px',
                    background: '#4F46E5',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.background = '#4338CA'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.background = '#4F46E5'
                  }}
                >
                  Enroll prospects
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6h8M7 3l3 3-3 3" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Stats funnel */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E7E5E4' }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <StatFunnelCol
                  label="Enrolled"
                  value={String(selected.stats.enrolled)}
                  sub="last 30d"
                />
                <StatFunnelCol
                  label="Opened"
                  value={fmtPct(selected.stats.opened)}
                  sub={fmtCount(selected.stats.enrolled, selected.stats.opened)}
                />
                <StatFunnelCol
                  label="Replied"
                  value={fmtPct(selected.stats.replied)}
                  sub={fmtCount(selected.stats.enrolled, selected.stats.replied)}
                />
                <StatFunnelCol
                  label="Booked"
                  value={fmtPct(selected.stats.booked)}
                  sub={`${Math.round(selected.stats.enrolled * selected.stats.booked)} meetings`}
                  accent
                />
              </div>
            </div>

            {/* Steps section */}
            <div style={{ padding: '20px 20px 0' }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#A8A29E',
                  marginBottom: 14,
                }}
              >
                Cadence
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {selected.steps.map((step, i) => (
                  <StepRow
                    key={`${step.day}-${step.channel}-${i}`}
                    step={step}
                    isLast={i === selected.steps.length - 1}
                  />
                ))}
              </div>

              {/* Add step button */}
              <button
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  marginTop: 12,
                  border: '1px dashed #D6D3D1',
                  borderRadius: 8,
                  background: 'transparent',
                  color: '#78716C',
                  fontSize: 12.5,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'border-color 120ms, color 120ms',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#A8A29E'
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#1C1917'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#D6D3D1'
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#78716C'
                }}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Add step
              </button>
            </div>

            {/* Settings section */}
            <div style={{ padding: '24px 20px 20px' }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#A8A29E',
                  marginBottom: 14,
                }}
              >
                Settings
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Rules */}
                <div
                  style={{
                    padding: '14px 16px',
                    border: '1px solid #E7E5E4',
                    borderRadius: 10,
                    background: '#FAFAF9',
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1C1917', marginBottom: 12 }}>
                    Rules
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <RuleToggle
                      label="Pause on reply"
                      on={rules.pauseOnReply}
                      onChange={() => setRules((r) => ({ ...r, pauseOnReply: !r.pauseOnReply }))}
                    />
                    <RuleToggle
                      label="Skip weekends"
                      on={rules.skipWeekends}
                      onChange={() => setRules((r) => ({ ...r, skipWeekends: !r.skipWeekends }))}
                    />
                    <RuleToggle
                      label="Business hours (9a–6p ET)"
                      on={rules.businessHours}
                      onChange={() => setRules((r) => ({ ...r, businessHours: !r.businessHours }))}
                    />
                    <RuleToggle
                      label="Stop on opt-out"
                      on={rules.stopOnOptOut}
                      onChange={() => setRules((r) => ({ ...r, stopOnOptOut: !r.stopOnOptOut }))}
                    />
                  </div>
                </div>

                {/* Send time optimization */}
                <div
                  style={{
                    padding: '14px 16px',
                    border: '1px solid #E7E5E4',
                    borderRadius: 10,
                    background: '#FAFAF9',
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1C1917', marginBottom: 10 }}>
                    Send time optimization
                  </div>
                  <div
                    style={{
                      padding: '12px 14px',
                      background: '#EEF2FF',
                      border: '1px solid #E0E7FF',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="5.5" stroke="#4F46E5" strokeWidth="1.3" />
                        <path d="M7 4v3l2 1.5" stroke="#4F46E5" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#4338CA' }}>
                        Best send time: Tue 9:42am ET
                      </span>
                    </div>
                    <p style={{ fontSize: 11.5, color: '#4338CA', margin: 0, lineHeight: 1.5 }}>
                      Based on reply patterns across {selected.enrolledTotal} contacts in this segment, messages sent Tuesday morning see the highest open and reply rates.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Rule toggle row ──────────────────────────────────────────────────────────

function RuleToggle({
  label,
  on,
  onChange,
}: {
  label: string
  on: boolean
  onChange: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ fontSize: 12.5, color: '#57534E', flex: 1 }}>{label}</span>
      <Toggle on={on} onChange={onChange} />
    </div>
  )
}

// ─── Action button (Duplicate / Pause) ───────────────────────────────────────

function ActionButton({ label, icon }: { label: string; icon: React.ReactNode }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 10px',
        background: hovered ? '#F5F5F4' : '#FFFFFF',
        color: '#57534E',
        border: '1px solid #E7E5E4',
        borderRadius: 8,
        fontSize: 12.5,
        fontWeight: 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background 120ms',
      }}
    >
      {icon}
      {label}
    </button>
  )
}
