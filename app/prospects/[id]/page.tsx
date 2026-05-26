'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProspectData {
  id: string
  legalName: string
  dba: string | null
  domain: string | null
  naics: string | null
  naicsDesc: string | null
  segment: string
  priority: string
  county: string
  source: string
  sunbizStatus: string
  entityType: string
  daysSinceFormed: number
  formedDate: string | null
  address: { line: string; city: string; state: string; zip: string }
  contact: { name: string | null; title: string; email: string | null; phone: string | null }
  intelligence: {
    score: number
    ticketEstimate: number
    serviceFit: number
    priorityScore: number
    rank: number | null
    icebreaker: string
    intentSignal: string
    reasoning: string[]
  }
  pipelineStage: string
  daysInStage: number
  sqft: number | null
  emailDraft: string | null
  emailVariants: Array<{ label: string; subject: string; body: string }>
  scoreBreakdown: Record<string, number>
  timeline: Array<{ date: string; event: string; type: string }>
  approved: boolean
  ghlContactId: string | null
}

// ─── Mock fallback ────────────────────────────────────────────────────────────

const MOCK_PROSPECT: ProspectData = {
  id: 'recMOCK000001',
  legalName: 'Brickell Property Group LLC',
  dba: 'BPG Commercial',
  domain: 'brickellproperty.com',
  naics: '531120',
  naicsDesc: 'Lessors of Nonresidential Buildings',
  segment: 'Commercial',
  priority: 'high',
  county: 'Miami-Dade',
  source: 'Sunbiz',
  sunbizStatus: 'Active',
  entityType: 'LLC',
  daysSinceFormed: 847,
  formedDate: '2024-01-15',
  address: { line: '1450 Brickell Ave Suite 2400', city: 'Miami', state: 'FL', zip: '33131' },
  contact: {
    name: 'Carlos Mendez',
    title: 'Registered Agent',
    email: 'carlos@brickellproperty.com',
    phone: '(305) 555-0192',
  },
  intelligence: {
    score: 87,
    ticketEstimate: 1850,
    serviceFit: 92,
    priorityScore: 89,
    rank: 3,
    icebreaker:
      'You recently registered BPG Commercial — congrats on the expansion. With a portfolio at 1450 Brickell, you likely need a cleaning partner who can handle high-traffic lobbies and executive suites.',
    intentSignal: 'Recent entity formation + nonresidential building segment + Brickell address',
    reasoning: [
      'NAICS 531120 maps directly to our commercial real estate segment',
      'Brickell address indicates high-value property portfolio',
      'Entity formed 847 days ago — past volatile startup phase',
      'Registered agent email likely reaches decision maker',
      'No GHL contact found — clean outreach opportunity',
    ],
  },
  pipelineStage: 'Pending review',
  daysInStage: 3,
  sqft: 8500,
  emailDraft: null,
  emailVariants: [
    {
      label: 'Warm',
      subject: 'Cleaning solutions for Brickell Property Group',
      body:
        "Hi Carlos,\n\nI came across Brickell Property Group and wanted to reach out — congrats on the Brickell presence.\n\nWe're Maravilla Cleaners, a commercial cleaning company serving 8,800+ clients across Florida. We specialize in office buildings, lobbies, and executive suites.\n\nWould you be open to a 15-minute call to discuss your property's needs?\n\nBest,\nMaravilla Cleaners Team\n(866) 986-6005",
    },
    {
      label: 'Direct',
      subject: 'Commercial cleaning quote for Brickell Property Group',
      body:
        'Hi Carlos,\n\nMaravilla Cleaners serves commercial properties throughout Miami-Dade. We offer:\n- Professional cleaning crews\n- Satisfaction guaranteed\n- Custom pricing based on sq ft\n\nCan I send you a free estimate for your Brickell property?\n\nBest,\nMaravilla Cleaners\n(866) 986-6005',
    },
    {
      label: 'Data',
      subject: 'How Brickell commercial clients save on cleaning',
      body:
        'Hi Carlos,\n\nNonresidential lessors like Brickell Property Group typically save 25-35% versus in-house cleaning. Maravilla Cleaners serves 200+ commercial clients in Miami-Dade with an avg ticket of $1,850/service.\n\nWant a comparison for your portfolio?\n\nBest,\nMaravilla Cleaners\n(866) 986-6005',
    },
  ],
  scoreBreakdown: {
    companyAge: 18,
    segment: 25,
    serviceMatch: 28,
    contactQuality: 10,
    intentSignal: 6,
  },
  timeline: [
    { date: new Date(Date.now() - 3 * 86400000).toISOString(), event: 'Discovered via Sunbiz scrape', type: 'system' },
    { date: new Date(Date.now() - 2 * 86400000).toISOString(), event: 'Scored by Claude (87/100)', type: 'claude' },
    { date: new Date(Date.now() - 2 * 86400000).toISOString(), event: 'Email draft generated', type: 'claude' },
    { date: new Date(Date.now() - 1 * 86400000).toISOString(), event: 'Added to review queue', type: 'system' },
  ],
  approved: false,
  ghlContactId: null,
}

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  bg: '#FAFAF9',
  white: '#FFFFFF',
  border: '#E7E5E4',
  indigo: '#4F46E5',
  indigoDark: '#4338CA',
  indigoLight: '#EEF2FF',
  text: '#1C1917',
  muted: '#78716C',
  stone: '#A8A29E',
  green: '#16A34A',
  greenLight: '#DCFCE7',
  red: '#DC2626',
  redLight: '#FEE2E2',
  amber: '#D97706',
  amberLight: '#FEF3C7',
  yellow: '#F59E0B',
  mono: "'JetBrains Mono', 'Fira Code', monospace",
}

// ─── Pipeline stages ──────────────────────────────────────────────────────────

const STAGES = [
  'Discovered',
  'Pending review',
  'Approved',
  'Contacted',
  'Replied',
  'Proposal sent',
  'Won',
]

// ─── Utility components ───────────────────────────────────────────────────────

function Chip({
  label,
  color = C.muted,
  bg = '#F5F5F4',
  small,
}: {
  label: string
  color?: string
  bg?: string
  small?: boolean
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: small ? '2px 7px' : '3px 10px',
        borderRadius: 20,
        fontSize: small ? 11 : 12,
        fontWeight: 500,
        color,
        background: bg,
        letterSpacing: '0.02em',
      }}
    >
      {label}
    </span>
  )
}

function KV({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.stone, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: C.text, fontFamily: mono ? C.mono : undefined }}>
        {value}
      </div>
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: '16px 20px',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: C.stone, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
      {children}
    </div>
  )
}

function MiniBar({
  value,
  max = 100,
  color = C.indigo,
  label,
}: {
  value: number
  max?: number
  color?: string
  label?: string
}) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div style={{ marginBottom: 8 }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 11, color: C.muted }}>{label}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.text, fontFamily: C.mono }}>{value}</span>
        </div>
      )}
      <div style={{ height: 4, background: '#F5F5F4', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        right: 24,
        background: C.text,
        color: C.white,
        padding: '10px 18px',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 500,
        zIndex: 9999,
        boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span>{message}</span>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', color: C.stone, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}
      >
        ×
      </button>
    </div>
  )
}

function ConfettiEffect() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10000,
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .confetti-piece {
          position: absolute;
          width: 8px;
          height: 8px;
          animation: confettiFall linear forwards;
        }
      `}</style>
      {Array.from({ length: 60 }).map((_, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}%`,
            top: -10,
            background: [C.indigo, '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][i % 5],
            borderRadius: i % 3 === 0 ? '50%' : 2,
            animationDuration: `${0.8 + Math.random() * 1.4}s`,
            animationDelay: `${Math.random() * 0.6}s`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ w = '100%', h = 14, style }: { w?: string | number; h?: number; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        background: 'linear-gradient(90deg, #F5F5F4 25%, #E7E5E4 50%, #F5F5F4 75%)',
        backgroundSize: '200% 100%',
        borderRadius: 4,
        animation: 'shimmer 1.4s infinite',
        ...style,
      }}
    />
  )
}

function PageSkeleton() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      <div style={{ height: 52, background: C.white, borderBottom: `1px solid ${C.border}` }} />
      <div style={{ padding: '24px 32px' }}>
        <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
          <Skeleton w={120} h={120} style={{ borderRadius: 10, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <Skeleton w="40%" h={28} style={{ marginBottom: 12 }} />
            <Skeleton w="60%" h={16} style={{ marginBottom: 8 }} />
            <Skeleton w="30%" h={14} />
          </div>
        </div>
        <Skeleton w="100%" h={200} style={{ borderRadius: 10 }} />
      </div>
    </div>
  )
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

function TopBar({
  legalName,
  onCopilot,
  router,
}: {
  legalName: string
  onCopilot: () => void
  router: ReturnType<typeof useRouter>
}) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: C.white,
        borderBottom: `1px solid ${C.border}`,
        height: 52,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 12,
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          background: C.indigo,
          color: C.white,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        M
      </div>
      <span style={{ fontWeight: 600, fontSize: 13, color: C.text, marginRight: 8 }}>Maravilla CRM</span>

      {/* Divider */}
      <span style={{ color: C.border, fontSize: 18 }}>|</span>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: C.muted }}>
        <button
          onClick={() => router.push('/prospects')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 12, padding: 0 }}
        >
          Prospects
        </button>
        <span>/</span>
        <span style={{ color: C.text, fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {legalName}
        </span>
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Queue counter */}
      <span style={{ fontSize: 11, color: C.muted, marginRight: 4 }}>18 of 47 in queue</span>

      {/* Nav arrows */}
      {['←', '→'].map((arrow, i) => (
        <button
          key={i}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: `1px solid ${C.border}`,
            background: C.white,
            cursor: 'pointer',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: C.muted,
          }}
        >
          {arrow}
        </button>
      ))}

      {/* Divider */}
      <span style={{ color: C.border, fontSize: 18 }}>|</span>

      {/* Copilot */}
      <button
        onClick={onCopilot}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 6,
          border: `1px solid ${C.indigo}`,
          background: C.indigoLight,
          color: C.indigo,
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        ✦ Copilot <kbd style={{ fontSize: 10, opacity: 0.7 }}>⌘J</kbd>
      </button>

      {/* Search */}
      <button
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          border: `1px solid ${C.border}`,
          background: C.white,
          cursor: 'pointer',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: C.muted,
        }}
        title="Search ⌘K"
      >
        🔍
      </button>

      {/* Bell */}
      <button
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          border: `1px solid ${C.border}`,
          background: C.white,
          cursor: 'pointer',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: C.muted,
          position: 'relative',
        }}
      >
        🔔
      </button>

      {/* Avatar */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: C.indigo,
          color: C.white,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 11,
          cursor: 'pointer',
        }}
      >
        SK
      </div>
    </header>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({
  p,
  approved,
  onApprove,
  onReject,
  approving,
}: {
  p: ProspectData
  approved: boolean
  onApprove: () => void
  onReject: () => void
  approving: boolean
}) {
  const initials = p.legalName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  const urgencyLabel =
    p.daysSinceFormed < 90
      ? { label: 'New business', color: C.red, bg: C.redLight }
      : p.daysSinceFormed < 365
      ? { label: 'Growth phase', color: C.amber, bg: C.amberLight }
      : { label: 'Established', color: C.green, bg: C.greenLight }

  const priorityColor =
    p.priority === 'high'
      ? { color: C.red, bg: C.redLight }
      : p.priority === 'medium'
      ? { color: C.amber, bg: C.amberLight }
      : { color: C.green, bg: C.greenLight }

  return (
    <Card style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Avatar col */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 120,
              height: 80,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${C.indigo} 0%, #7C3AED 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: C.white,
              fontWeight: 800,
              fontSize: 32,
              letterSpacing: '-1px',
            }}
          >
            {initials}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: p.sunbizStatus === 'Active' ? C.green : C.red,
                flexShrink: 0,
              }}
            />
            <span style={{ color: C.muted }}>Sunbiz {p.sunbizStatus}</span>
          </div>
          <Chip label={p.entityType} color={C.muted} bg="#F5F5F4" small />
        </div>

        {/* Main info col */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Days + urgency */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: C.muted, fontFamily: C.mono }}>
              {p.daysSinceFormed}d since formed
            </span>
            <Chip label={urgencyLabel.label} color={urgencyLabel.color} bg={urgencyLabel.bg} small />
          </div>

          {/* Name */}
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: C.text,
              marginBottom: 4,
              lineHeight: 1.2,
            }}
          >
            {p.legalName}
          </h1>

          {/* Domain + DBA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            {p.domain && (
              <a
                href={`https://${p.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, color: C.indigo, textDecoration: 'none', fontFamily: C.mono }}
              >
                {p.domain} ↗
              </a>
            )}
            {p.dba && (
              <span style={{ fontSize: 12, color: C.muted }}>dba {p.dba}</span>
            )}
          </div>

          {/* NAICS */}
          {p.naics && (
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontFamily: C.mono, fontSize: 11, color: C.stone }}>
                NAICS {p.naics}
              </span>
              {p.naicsDesc && (
                <span style={{ fontSize: 11, color: C.muted, marginLeft: 8 }}>
                  — {p.naicsDesc}
                </span>
              )}
            </div>
          )}

          {/* Chips row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            <Chip label={p.segment} color={C.indigo} bg={C.indigoLight} />
            <Chip label={`${p.priority} priority`} color={priorityColor.color} bg={priorityColor.bg} />
            <Chip label={p.county} color={C.muted} bg="#F5F5F4" />
            <Chip label={p.source} color={C.stone} bg="#F5F5F4" />
          </div>

          {/* Intent signal */}
          {p.intelligence.intentSignal && (
            <blockquote
              style={{
                borderLeft: `3px solid ${C.indigo}`,
                paddingLeft: 12,
                margin: '0 0 12px 0',
                fontSize: 12,
                color: C.muted,
                fontStyle: 'italic',
                lineHeight: 1.5,
              }}
            >
              {p.intelligence.intentSignal}
            </blockquote>
          )}

          {/* Approved / action */}
          {approved ? (
            <Chip label="Approved · sent to GHL" color={C.green} bg={C.greenLight} />
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={onApprove}
                disabled={approving}
                style={{
                  padding: '8px 18px',
                  borderRadius: 7,
                  border: 'none',
                  background: approving ? C.stone : C.indigo,
                  color: C.white,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: approving ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {approving ? 'Approving…' : '✓ Approve & send to GHL'}
              </button>
              <button
                onClick={onReject}
                style={{
                  padding: '8px 14px',
                  borderRadius: 7,
                  border: `1px solid ${C.red}`,
                  background: C.white,
                  color: C.red,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Reject
              </button>
            </div>
          )}
        </div>

        {/* Score panel */}
        <div
          style={{
            flexShrink: 0,
            textAlign: 'center',
            padding: '16px 20px',
            borderRadius: 10,
            border: `1px solid ${C.indigoLight}`,
            background: C.indigoLight,
            minWidth: 140,
          }}
        >
          <div style={{ fontSize: 52, fontWeight: 800, color: C.indigo, lineHeight: 1 }}>
            {p.intelligence.score}
          </div>
          <div style={{ fontSize: 13, color: C.stone, marginBottom: 12 }}>/100</div>
          {p.intelligence.rank && (
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
              Rank <span style={{ fontWeight: 700, color: C.text }}>#{p.intelligence.rank}</span>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
            {[
              { label: 'Ticket', value: p.intelligence.ticketEstimate ? `$${p.intelligence.ticketEstimate.toLocaleString()}` : '–' },
              { label: 'Fit', value: `${p.intelligence.serviceFit}%` },
              { label: 'Priority', value: `${p.intelligence.priorityScore}/100` },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: C.muted }}>{label}</span>
                <span style={{ fontWeight: 600, color: C.text, fontFamily: C.mono }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

// ─── Next Best Action ─────────────────────────────────────────────────────────

function NextBestAction({
  p,
  approved,
  onApprove,
  approving,
}: {
  p: ProspectData
  approved: boolean
  onApprove: () => void
  approving: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  const action = approved
    ? { label: 'Send outreach email', confidence: 91, desc: 'Email draft ready. Warm variant recommended for this segment.' }
    : { label: 'Approve & send to GHL', confidence: 87, desc: 'Score 87/100 with high service fit. Best time to reach out: Tuesday–Thursday, 9–11am.' }

  return (
    <Card style={{ marginBottom: 20, borderLeft: `3px solid ${C.indigo}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: C.indigoLight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          ✦
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.stone, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Next Best Action
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: C.indigo,
                background: C.indigoLight,
                padding: '1px 7px',
                borderRadius: 10,
              }}
            >
              {action.confidence}% confidence
            </span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
            {action.label}
          </div>
          <div style={{ fontSize: 12, color: C.muted }}>{action.desc}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {!approved && (
            <button
              onClick={onApprove}
              disabled={approving}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: approving ? C.stone : C.indigo,
                color: C.white,
                fontWeight: 600,
                fontSize: 12,
                cursor: approving ? 'not-allowed' : 'pointer',
              }}
            >
              {approving ? '…' : 'Run action'}
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: `1px solid ${C.border}`,
              background: C.white,
              color: C.muted,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.stone, marginBottom: 8 }}>
            Secondary actions
          </div>
          {[
            'Schedule follow-up in 3 days',
            'Add to Email sequence: Commercial NAICS',
            'Tag as high priority in GHL',
          ].map((action) => (
            <div
              key={action}
              style={{
                fontSize: 12,
                color: C.muted,
                padding: '5px 0',
                borderBottom: `1px solid ${C.border}`,
                cursor: 'pointer',
              }}
            >
              · {action}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'profile', label: 'Profile', key: 'P' },
  { id: 'signals', label: 'Signals', key: 'S' },
  { id: 'relationships', label: 'Relationships', key: 'T' },
  { id: 'market', label: 'Market', key: 'M' },
  { id: 'compare', label: 'Compare', key: 'C' },
  { id: 'history', label: 'History', key: 'H' },
]

function TabBar({ active, onTab }: { active: string; onTab: (id: string) => void }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 0,
        borderBottom: `1px solid ${C.border}`,
        background: C.white,
        marginBottom: 16,
        overflowX: 'auto',
      }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTab(tab.id)}
          style={{
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: active === tab.id ? 600 : 400,
            color: active === tab.id ? C.indigo : C.muted,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: active === tab.id ? `2px solid ${C.indigo}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            transition: 'color 0.15s',
          }}
        >
          {tab.label}
          <kbd
            style={{
              fontSize: 9,
              color: active === tab.id ? C.indigo : C.stone,
              border: `1px solid ${active === tab.id ? C.indigoLight : C.border}`,
              borderRadius: 3,
              padding: '0 4px',
              fontFamily: C.mono,
            }}
          >
            {tab.key}
          </kbd>
        </button>
      ))}
    </div>
  )
}

// ─── Tab: Profile ─────────────────────────────────────────────────────────────

function TabProfile({
  p,
  emailSubject,
  setEmailSubject,
  emailBody,
  setEmailBody,
  activeVariant,
  setActiveVariant,
  onCopy,
}: {
  p: ProspectData
  emailSubject: string
  setEmailSubject: (v: string) => void
  emailBody: string
  setEmailBody: (v: string) => void
  activeVariant: number
  setActiveVariant: (n: number) => void
  onCopy: (text: string) => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
      {/* Col 1: Sunbiz + Contact */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card>
          <SectionTitle>Sunbiz Data</SectionTitle>
          <KV label="NAICS" value={p.naics ? `${p.naics} — ${p.naicsDesc || ''}` : null} mono />
          <KV label="Entity Type" value={p.entityType} />
          <KV label="Formed" value={p.formedDate ? `${p.formedDate} (${p.daysSinceFormed}d ago)` : null} />
          <KV label="Status" value={p.sunbizStatus} />
          {p.address.line && (
            <KV
              label="Address"
              value={`${p.address.line}, ${p.address.city}, ${p.address.state} ${p.address.zip}`}
            />
          )}
          {p.sqft && <KV label="Sq Ft" value={`${p.sqft.toLocaleString()} sq ft`} />}
        </Card>
        <Card>
          <SectionTitle>Contact</SectionTitle>
          {p.contact.name && <KV label="Officer / Agent" value={p.contact.name} />}
          <KV label="Title" value={p.contact.title} />
          {p.contact.email && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.stone, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                Email
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, color: C.text, fontFamily: C.mono }}>{p.contact.email}</span>
                <button
                  onClick={() => onCopy(p.contact.email!)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.stone, fontSize: 12 }}
                  title="Copy"
                >
                  📋
                </button>
              </div>
            </div>
          )}
          {p.contact.phone && <KV label="Phone" value={p.contact.phone} />}
        </Card>
      </div>

      {/* Col 2: Intelligence */}
      <div>
        <Card style={{ height: '100%' }}>
          <SectionTitle>Intelligence</SectionTitle>
          {p.intelligence.icebreaker && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.stone, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Icebreaker
                </span>
                <button
                  onClick={() => onCopy(p.intelligence.icebreaker)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.stone, fontSize: 11 }}
                >
                  Copy 📋
                </button>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: C.text,
                  lineHeight: 1.6,
                  background: C.indigoLight,
                  padding: '10px 12px',
                  borderRadius: 7,
                  borderLeft: `3px solid ${C.indigo}`,
                }}
              >
                {p.intelligence.icebreaker}
              </div>
            </div>
          )}

          {p.intelligence.reasoning.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.stone, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Reasoning
              </div>
              {p.intelligence.reasoning.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
                  <span style={{ color: C.indigo, fontSize: 11, flexShrink: 0, marginTop: 1 }}>·</span>
                  <span style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{r}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.stone, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Score Breakdown
            </div>
            {Object.entries(p.scoreBreakdown).map(([key, val]) => (
              <MiniBar
                key={key}
                label={key.replace(/([A-Z])/g, ' $1').trim()}
                value={val}
                max={30}
                color={C.indigo}
              />
            ))}
          </div>

          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.stone, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Deliverability
            </div>
            <MiniBar
              value={p.contact.email ? 80 : 20}
              color={p.contact.email ? C.green : C.red}
            />
            <div style={{ fontSize: 11, color: C.muted }}>
              {p.contact.email ? 'Direct email found' : 'No email — domain outreach only'}
            </div>
          </div>
        </Card>
      </div>

      {/* Col 3: Email Composer */}
      <div>
        <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <SectionTitle>Email Composer</SectionTitle>

          {/* Variant tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
            {p.emailVariants.map((v, i) => (
              <button
                key={i}
                onClick={() => {
                  setActiveVariant(i)
                  setEmailSubject(v.subject)
                  setEmailBody(v.body)
                }}
                style={{
                  padding: '3px 10px',
                  borderRadius: 5,
                  border: `1px solid ${activeVariant === i ? C.indigo : C.border}`,
                  background: activeVariant === i ? C.indigoLight : C.white,
                  color: activeVariant === i ? C.indigo : C.muted,
                  fontWeight: activeVariant === i ? 600 : 400,
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Subject */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: C.stone, marginBottom: 3 }}>Subject</div>
            <input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                fontSize: 12,
                color: C.text,
                outline: 'none',
              }}
            />
          </div>

          {/* Body */}
          <textarea
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            rows={8}
            style={{
              width: '100%',
              flex: 1,
              padding: '8px',
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              fontSize: 12,
              color: C.text,
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.6,
              marginBottom: 10,
            }}
          />

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { label: 'Send', bg: C.indigo, color: C.white },
              { label: 'Schedule', bg: C.white, color: C.indigo, border: `1px solid ${C.indigo}` },
              { label: 'Copy', bg: C.white, color: C.muted, border: `1px solid ${C.border}` },
            ].map(({ label, bg, color, border }) => (
              <button
                key={label}
                onClick={() => label === 'Copy' && onCopy(`Subject: ${emailSubject}\n\n${emailBody}`)}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: 6,
                  border: border || 'none',
                  background: bg,
                  color,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─── Tab: Signals ─────────────────────────────────────────────────────────────

function TabSignals({ p }: { p: ProspectData }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <Card>
        <SectionTitle>Intent Score</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
          <span style={{ fontSize: 40, fontWeight: 800, color: C.indigo }}>{Math.round(p.intelligence.score * 0.9)}</span>
          <span style={{ color: C.muted }}>/100</span>
        </div>
        <MiniBar value={p.intelligence.score} label="Composite intent" />
        <MiniBar value={p.intelligence.serviceFit} label="Service fit" color={C.green} />
        <div style={{ marginTop: 12, fontSize: 12, color: C.muted }}>
          {p.intelligence.intentSignal || 'No explicit intent signal detected.'}
        </div>
      </Card>

      <Card>
        <SectionTitle>Hiring Signals</SectionTitle>
        {['No active job postings found', 'Recent Sunbiz registration', 'Possible facility manager on-site'].map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 12, color: C.muted }}>
            <span style={{ color: C.stone }}>·</span>
            {s}
          </div>
        ))}
      </Card>

      <Card>
        <SectionTitle>Tech Stack</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['Google Workspace', 'QuickBooks', 'Calendly', 'Wix'].map((tech) => (
            <Chip key={tech} label={tech} color={C.muted} bg="#F5F5F4" small />
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>News Feed</SectionTitle>
        <div style={{ fontSize: 12, color: C.muted }}>
          No recent news found for {p.legalName}. Consider setting up Google Alerts.
        </div>
      </Card>
    </div>
  )
}

// ─── Tab: Relationships ───────────────────────────────────────────────────────

function TabRelationships({ p }: { p: ProspectData }) {
  const mockSameOfficer = [
    { name: 'Brickell Holding Corp', naics: '531110', status: 'Active', inCrm: true },
    { name: 'BPG Ventures LLC', naics: '551112', status: 'Active', inCrm: false },
  ]
  const mockSameAddress: typeof mockSameOfficer = []
  const mockNearby = [
    { name: 'Miami Commercial Spaces LLC', distance: '0.3 mi', status: 'Pending review', score: 72 },
    { name: 'Brickell Tower Mgmt', distance: '0.5 mi', status: 'Discovered', score: 65 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card>
        <SectionTitle>Same Officer Companies ({mockSameOfficer.length})</SectionTitle>
        {mockSameOfficer.length === 0 ? (
          <div style={{ fontSize: 12, color: C.muted }}>No other companies found under same officer.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Company', 'NAICS', 'Status', 'In CRM'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '4px 8px', color: C.stone, fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockSameOfficer.map((r, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: '6px 8px', color: C.text }}>{r.name}</td>
                  <td style={{ padding: '6px 8px', fontFamily: C.mono, color: C.muted }}>{r.naics}</td>
                  <td style={{ padding: '6px 8px' }}>
                    <Chip label={r.status} color={C.green} bg={C.greenLight} small />
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    {r.inCrm ? (
                      <Chip label="In CRM" color={C.indigo} bg={C.indigoLight} small />
                    ) : (
                      <Chip label="New" color={C.amber} bg={C.amberLight} small />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <SectionTitle>Same Address Companies</SectionTitle>
        {mockSameAddress.length === 0 ? (
          <div style={{ fontSize: 12, color: C.muted }}>No co-located companies found.</div>
        ) : null}
      </Card>

      <Card>
        <SectionTitle>Nearby Prospects</SectionTitle>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Company', 'Distance', 'Pipeline Stage', 'Score'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '4px 8px', color: C.stone, fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockNearby.map((r, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: '6px 8px', color: C.text }}>{r.name}</td>
                <td style={{ padding: '6px 8px', fontFamily: C.mono, color: C.muted }}>{r.distance}</td>
                <td style={{ padding: '6px 8px', color: C.muted }}>{r.status}</td>
                <td style={{ padding: '6px 8px', fontWeight: 700, color: C.indigo, fontFamily: C.mono }}>{r.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ─── Tab: Market ──────────────────────────────────────────────────────────────

function TabMarket({ p }: { p: ProspectData }) {
  const benchmarkMin = 800
  const benchmarkMax = 3200
  const ourPos = p.intelligence.ticketEstimate || 1800
  const pct = Math.round(((ourPos - benchmarkMin) / (benchmarkMax - benchmarkMin)) * 100)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <Card>
        <SectionTitle>Benchmark Pricing — {p.segment}</SectionTitle>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginBottom: 6 }}>
            <span>Market min: ${benchmarkMin.toLocaleString()}</span>
            <span>Market max: ${benchmarkMax.toLocaleString()}</span>
          </div>
          <div style={{ position: 'relative', height: 8, background: '#F5F5F4', borderRadius: 4 }}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                width: '100%',
                height: '100%',
                background: `linear-gradient(90deg, ${C.greenLight} 0%, ${C.amberLight} 50%, ${C.redLight} 100%)`,
                borderRadius: 4,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: `${pct}%`,
                top: -4,
                transform: 'translateX(-50%)',
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: C.indigo,
                border: `2px solid ${C.white}`,
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              }}
            />
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
            Our estimated ticket: <strong style={{ color: C.text }}>${ourPos.toLocaleString()}</strong> (
            {pct}th percentile)
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>Segment Performance — {p.segment}</SectionTitle>
        {[
          { label: 'Close rate', value: '38%' },
          { label: 'Avg days to close', value: '14 days' },
          { label: 'Avg ticket', value: '$1,228' },
          { label: 'Monthly recurring', value: '22% of clients' },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '7px 0',
              borderBottom: `1px solid ${C.border}`,
              fontSize: 12,
            }}
          >
            <span style={{ color: C.muted }}>{label}</span>
            <span style={{ fontWeight: 600, color: C.text }}>{value}</span>
          </div>
        ))}
      </Card>

      <Card style={{ gridColumn: '1 / -1' }}>
        <SectionTitle>County Pipeline — {p.county}</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'In queue', value: '47', sub: 'prospects' },
            { label: 'Approved', value: '12', sub: 'this month' },
            { label: 'Contacted', value: '8', sub: 'awaiting reply' },
            { label: 'Won', value: '3', sub: 'closed deals' },
          ].map(({ label, value, sub }) => (
            <div
              key={label}
              style={{
                textAlign: 'center',
                padding: '14px 10px',
                background: C.bg,
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 800, color: C.indigo }}>{value}</div>
              <div style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{sub}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── Tab: Compare ─────────────────────────────────────────────────────────────

function TabCompare({ p }: { p: ProspectData }) {
  const candidates = [
    { name: 'Miami Tower LLC', score: 74, ticket: 1400, fit: 78, days: 5, segment: 'Commercial', stage: 'Discovered' },
    { name: 'Coral Gables Prop.', score: 81, ticket: 2100, fit: 85, days: 2, segment: 'Commercial', stage: 'Pending review' },
    { name: 'Brickell Holdings', score: 68, ticket: 950, fit: 65, days: 8, segment: 'Office', stage: 'Discovered' },
  ]

  const rows: Array<{ label: string; key: string; format: (v: any) => string; max?: number; invert?: boolean }> = [
    { label: 'Score', key: 'score', format: (v) => String(v), max: 100 },
    { label: 'Ticket Estimate', key: 'ticket', format: (v) => `$${Number(v).toLocaleString()}`, max: 3000 },
    { label: 'Service Fit', key: 'fit', format: (v) => `${v}%`, max: 100 },
    { label: 'Days in Stage', key: 'days', format: (v) => `${v}d`, max: 30, invert: true },
    { label: 'Segment', key: 'segment', format: (v) => String(v) },
    { label: 'Stage', key: 'stage', format: (v) => String(v) },
  ]

  const current = {
    score: p.intelligence.score,
    ticket: p.intelligence.ticketEstimate,
    fit: p.intelligence.serviceFit,
    days: p.daysInStage,
    segment: p.segment,
    stage: p.pipelineStage,
  }

  const cols = [
    { data: current, name: p.legalName, isActive: true },
    ...candidates.map((c) => ({ data: c, name: c.name, isActive: false })),
  ]

  return (
    <Card>
      <SectionTitle>Side-by-Side Comparison</SectionTitle>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 10px', color: C.stone, fontSize: 10, textTransform: 'uppercase', fontWeight: 600 }}>
                Metric
              </th>
              {cols.map((col) => (
                <th
                  key={col.name}
                  style={{
                    textAlign: 'center',
                    padding: '6px 10px',
                    fontSize: 12,
                    fontWeight: col.isActive ? 700 : 500,
                    color: col.isActive ? C.indigo : C.text,
                    background: col.isActive ? C.indigoLight : 'transparent',
                    borderRadius: col.isActive ? '8px 8px 0 0' : 0,
                  }}
                >
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: '8px 10px', color: C.muted }}>{row.label}</td>
                {cols.map((col, ci) => {
                  const val = (col.data as any)[row.key]
                  const formatted = row.format(val)
                  const numVal = typeof val === 'number' ? val : null
                  return (
                    <td
                      key={ci}
                      style={{
                        padding: '8px 10px',
                        textAlign: 'center',
                        background: col.isActive ? C.indigoLight : 'transparent',
                      }}
                    >
                      <div style={{ fontWeight: col.isActive ? 700 : 400, color: col.isActive ? C.indigo : C.text }}>
                        {formatted}
                      </div>
                      {numVal !== null && row.max && (
                        <div style={{ marginTop: 3 }}>
                          <div style={{ height: 3, background: '#F5F5F4', borderRadius: 2, overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${Math.min(100, Math.round((numVal / row.max!) * 100))}%`,
                                height: '100%',
                                background: col.isActive ? C.indigo : C.stone,
                                borderRadius: 2,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ─── Tab: History ─────────────────────────────────────────────────────────────

function TabHistory({ p }: { p: ProspectData }) {
  const iconMap: Record<string, string> = {
    claude: '✦',
    system: '⚙',
    user: '👤',
  }
  const colorMap: Record<string, string> = {
    claude: C.indigo,
    system: C.stone,
    user: '#92400E',
  }

  return (
    <Card>
      <SectionTitle>Activity Timeline</SectionTitle>
      <div style={{ position: 'relative' }}>
        {p.timeline.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: `${colorMap[item.type] || C.stone}22`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                flexShrink: 0,
                color: colorMap[item.type] || C.stone,
              }}
            >
              {iconMap[item.type] || '·'}
            </div>
            <div>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{item.event}</div>
              <div style={{ fontSize: 11, color: C.stone, marginTop: 2 }}>
                {new Date(item.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── Pipeline Strip ───────────────────────────────────────────────────────────

function PipelineStrip({
  currentStage,
  daysInStage,
  onAdvance,
}: {
  currentStage: string
  daysInStage: number
  onAdvance: () => void
}) {
  const idx = STAGES.indexOf(currentStage)

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: C.white,
        borderTop: `1px solid ${C.border}`,
        zIndex: 30,
        padding: '0 24px',
        height: 52,
        display: 'flex',
        alignItems: 'center',
        gap: 0,
      }}
    >
      {/* Stages */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
        {STAGES.map((stage, i) => {
          const isActive = stage === currentStage
          const isDone = i < idx
          return (
            <div
              key={stage}
              style={{
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 5,
                  background: isActive ? C.indigoLight : 'transparent',
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: isActive
                      ? C.indigo
                      : isDone
                      ? C.green
                      : C.border,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: isActive ? 700 : 400,
                    color: isActive ? C.indigo : isDone ? C.green : C.stone,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {stage}
                </span>
                {isActive && daysInStage > 0 && (
                  <span style={{ fontSize: 10, color: C.muted }}>({daysInStage}d)</span>
                )}
              </div>
              {i < STAGES.length - 1 && (
                <span style={{ color: C.border, fontSize: 14, margin: '0 2px' }}>›</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Advance button */}
      {idx < STAGES.length - 1 && (
        <button
          onClick={onAdvance}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: 'none',
            background: C.indigo,
            color: C.white,
            fontWeight: 600,
            fontSize: 12,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            marginLeft: 12,
          }}
        >
          Advance stage →
        </button>
      )}
    </div>
  )
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

function QuickActions({
  p,
  approved,
  onApprove,
  onReject,
  approving,
  onTab,
  router,
}: {
  p: ProspectData
  approved: boolean
  onApprove: () => void
  onReject: () => void
  approving: boolean
  onTab: (id: string) => void
  router: ReturnType<typeof useRouter>
}) {
  const airtableUrl = `https://airtable.com/${process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || 'appXXX'}/tblXXX/${p.id}`

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 62,
        right: 20,
        zIndex: 35,
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: '12px 14px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        minWidth: 180,
      }}
    >
      <div style={{ fontSize: 10, color: C.stone, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
        Quick Actions
      </div>

      {/* Keyboard hints */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {[
          { key: 'A', label: 'Approve' },
          { key: 'R', label: 'Reject' },
          { key: 'Esc', label: 'Queue' },
        ].map(({ key, label }) => (
          <span
            key={key}
            style={{
              fontSize: 10,
              color: C.muted,
              border: `1px solid ${C.border}`,
              borderRadius: 3,
              padding: '1px 5px',
              fontFamily: C.mono,
            }}
          >
            {key} {label}
          </span>
        ))}
      </div>

      {/* Action buttons */}
      {!approved ? (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <button
            onClick={onApprove}
            disabled={approving}
            style={{
              flex: 1,
              padding: '7px 0',
              borderRadius: 6,
              border: 'none',
              background: approving ? C.stone : C.indigo,
              color: C.white,
              fontWeight: 700,
              fontSize: 12,
              cursor: approving ? 'not-allowed' : 'pointer',
            }}
          >
            {approving ? '…' : '✓ Approve'}
          </button>
          <button
            onClick={onReject}
            style={{
              flex: 1,
              padding: '7px 0',
              borderRadius: 6,
              border: `1px solid ${C.red}`,
              background: C.white,
              color: C.red,
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Reject
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: 10 }}>
          <Chip label="Approved · in GHL" color={C.green} bg={C.greenLight} />
        </div>
      )}

      {/* Metadata */}
      <div style={{ fontSize: 10, color: C.stone, marginBottom: 6 }}>Last saved just now</div>

      {/* Links */}
      <div style={{ display: 'flex', gap: 8 }}>
        <a
          href={airtableUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 10, color: C.indigo, textDecoration: 'none' }}
        >
          Airtable ↗
        </a>
        {p.ghlContactId && (
          <a
            href={`https://app.gohighlevel.com/contacts/${p.ghlContactId}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 10, color: C.indigo, textDecoration: 'none' }}
          >
            GHL ↗
          </a>
        )}
      </div>
    </div>
  )
}

// ─── AI Copilot Panel ─────────────────────────────────────────────────────────

function CopilotPanel({ p, onClose }: { p: ProspectData; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 52,
        right: 0,
        bottom: 52,
        width: 340,
        background: C.white,
        borderLeft: `1px solid ${C.border}`,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 16px rgba(0,0,0,0.08)',
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ color: C.indigo, fontSize: 16 }}>✦</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Copilot</span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 18 }}
        >
          ×
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <div
          style={{
            background: C.indigoLight,
            borderRadius: 8,
            padding: '12px 14px',
            marginBottom: 14,
            fontSize: 13,
            color: C.text,
            lineHeight: 1.6,
          }}
        >
          <strong>{p.legalName}</strong> scores <strong>{p.intelligence.score}/100</strong>. This is a{' '}
          {p.priority} priority {p.segment.toLowerCase()} prospect in {p.county} with an estimated
          ticket of ${p.intelligence.ticketEstimate?.toLocaleString() || 'N/A'}.{' '}
          {p.intelligence.icebreaker && (
            <>
              <br />
              <br />
              Suggested icebreaker: <em>"{p.intelligence.icebreaker.slice(0, 100)}…"</em>
            </>
          )}
        </div>
        <div style={{ fontSize: 11, color: C.stone, textAlign: 'center' }}>
          Ask me anything about this prospect
        </div>
      </div>
      <div
        style={{
          padding: 12,
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <input
          placeholder="Ask about this prospect… (⌘J)"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: `1px solid ${C.border}`,
            borderRadius: 7,
            fontSize: 13,
            outline: 'none',
          }}
        />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProspectProfilePage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [data, setData] = useState<ProspectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('profile')
  const [approved, setApproved] = useState(false)
  const [pipelineStage, setPipelineStage] = useState('Pending review')
  const [daysInStage, setDaysInStage] = useState(0)
  const [approving, setApproving] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [toast, setToast] = useState('')
  const [showCopilot, setShowCopilot] = useState(false)

  // Email composer state
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [activeVariant, setActiveVariant] = useState(0)

  // Fetch prospect
  useEffect(() => {
    if (!id) return

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) {
      router.push('/login')
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/prospects/${id}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json: ProspectData = await res.json()
        setData(json)
        setApproved(json.approved || json.pipelineStage === 'Approved')
        setPipelineStage(json.pipelineStage || 'Pending review')
        setDaysInStage(json.daysInStage || 0)
        if (json.emailVariants?.length) {
          setEmailSubject(json.emailVariants[0].subject)
          setEmailBody(json.emailVariants[0].body)
        }
      } catch (err) {
        console.warn('Failed to fetch prospect, using mock:', err)
        setData(MOCK_PROSPECT)
        setApproved(MOCK_PROSPECT.approved)
        setPipelineStage(MOCK_PROSPECT.pipelineStage)
        setDaysInStage(MOCK_PROSPECT.daysInStage)
        setEmailSubject(MOCK_PROSPECT.emailVariants[0].subject)
        setEmailBody(MOCK_PROSPECT.emailVariants[0].body)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, router])

  // Approve flow
  const handleApprove = useCallback(async () => {
    if (!data || approving || approved) return
    setApproving(true)
    try {
      const res = await fetch(`/api/prospects/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: data.id,
          name: data.legalName,
          email: data.contact.email || `${data.id}@prospect.maravilla.com`,
          locationId: process.env.NEXT_PUBLIC_GHL_LOCATION_ID || 'default',
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setApproved(true)
      setPipelineStage('Approved')
      setConfetti(true)
      setToast('Approved & sent to GHL')
      setTimeout(() => setConfetti(false), 2500)
    } catch (err) {
      console.error('Approval error:', err)
      setToast('Approval failed — check console')
    } finally {
      setApproving(false)
    }
  }, [data, approving, approved])

  const handleReject = useCallback(() => {
    setPipelineStage('Discovered')
    setToast('Prospect rejected')
    setTimeout(() => router.push('/prospects'), 800)
  }, [router])

  const handleAdvanceStage = useCallback(() => {
    const idx = STAGES.indexOf(pipelineStage)
    if (idx < STAGES.length - 1) {
      const next = STAGES[idx + 1]
      setPipelineStage(next)
      setToast(`Stage advanced to: ${next}`)
    }
  }, [pipelineStage])

  const handleCopy = useCallback((text: string) => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => setToast('Copied to clipboard'))
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in input/textarea
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA'].includes(target.tagName)) return

      if (e.metaKey && e.key === 'j') {
        e.preventDefault()
        setShowCopilot((v) => !v)
        return
      }
      if (e.metaKey && e.key === 'k') {
        e.preventDefault()
        setToast('Command palette — coming soon')
        return
      }

      switch (e.key.toLowerCase()) {
        case 'a': handleApprove(); break
        case 'r': handleReject(); break
        case 'escape': router.push('/prospects'); break
        case 's': setTab('signals'); break
        case 't': setTab('relationships'); break
        case 'm': setTab('market'); break
        case 'c': setTab('compare'); break
        case 'h': setTab('history'); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleApprove, handleReject, router])

  if (loading) return <PageSkeleton />

  const p = data || MOCK_PROSPECT

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E7E5E4; border-radius: 3px; }
        a { color: ${C.indigo}; }
      `}</style>

      {confetti && <ConfettiEffect />}

      <TopBar legalName={p.legalName} onCopilot={() => setShowCopilot((v) => !v)} router={router} />

      {showCopilot && <CopilotPanel p={p} onClose={() => setShowCopilot(false)} />}

      <main
        style={{
          maxWidth: showCopilot ? 'calc(100% - 340px)' : 1200,
          margin: '0 auto',
          padding: '20px 24px 80px',
          transition: 'max-width 0.2s ease',
        }}
      >
        <Hero
          p={p}
          approved={approved}
          onApprove={handleApprove}
          onReject={handleReject}
          approving={approving}
        />

        <NextBestAction p={p} approved={approved} onApprove={handleApprove} approving={approving} />

        <TabBar active={tab} onTab={setTab} />

        {tab === 'profile' && (
          <TabProfile
            p={p}
            emailSubject={emailSubject}
            setEmailSubject={setEmailSubject}
            emailBody={emailBody}
            setEmailBody={setEmailBody}
            activeVariant={activeVariant}
            setActiveVariant={setActiveVariant}
            onCopy={handleCopy}
          />
        )}
        {tab === 'signals' && <TabSignals p={p} />}
        {tab === 'relationships' && <TabRelationships p={p} />}
        {tab === 'market' && <TabMarket p={p} />}
        {tab === 'compare' && <TabCompare p={p} />}
        {tab === 'history' && <TabHistory p={p} />}
      </main>

      <PipelineStrip
        currentStage={pipelineStage}
        daysInStage={daysInStage}
        onAdvance={handleAdvanceStage}
      />

      <QuickActions
        p={p}
        approved={approved}
        onApprove={handleApprove}
        onReject={handleReject}
        approving={approving}
        onTab={setTab}
        router={router}
      />

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}
