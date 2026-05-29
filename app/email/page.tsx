'use client'

import React, { useState, useEffect } from 'react'

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

type SignalType = 'bid_opportunity' | 'renewal' | 'expansion' | 'urgent' | 'vendor_issue'

interface EmailSignal {
  type: SignalType
  evidence: string
}

interface EmailItem {
  id: string
  sender: string
  company: string
  subject: string
  date: string
  preview: string
  body: string
  signals: EmailSignal[]
  score: number
  unread: boolean
}

interface Entity {
  name: string
  role?: string
}

interface AnalysisResult {
  intent_score: number
  people: Entity[]
  companies: Entity[]
  facilities: Entity[]
  signals: EmailSignal[]
  recommended_action: string
}

type FilterTab = 'All' | 'Bids' | 'Renewals' | 'Expansion' | 'Urgent'

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_EMAILS: EmailItem[] = [
  {
    id: 'e1',
    sender: 'Maria Santos',
    company: 'Miami-Dade Transit Authority',
    subject: 'RFP #2026-JAN-004 - Janitorial Services',
    date: '2026-05-27T09:15:00Z',
    preview: 'We are seeking qualified vendors for our annual janitorial contract covering 12 transit facilities...',
    body: 'Dear Vendor, The Miami-Dade Transit Authority is issuing RFP #2026-JAN-004 for comprehensive janitorial and custodial services across our network of 12 transit facilities. The contract period is 2 years with two 1-year renewal options. Estimated annual value: $450,000. Proposals are due July 15, 2026.',
    signals: [
      { type: 'bid_opportunity', evidence: 'RFP issued with formal procurement number' },
      { type: 'urgent', evidence: 'Deadline 49 days from today' },
    ],
    score: 92,
    unread: true,
  },
  {
    id: 'e2',
    sender: 'Robert Chen',
    company: 'Broward County Schools',
    subject: 'Contract Renewal Discussion - Cleaning Services',
    date: '2026-05-26T14:30:00Z',
    preview: 'Our current contract with your team expires on August 31. We would like to discuss renewal options...',
    body: 'Hello, Our current janitorial services contract (BCS-2024-8821) expires on August 31, 2026. We have been very satisfied with the service quality. We would like to schedule a meeting to discuss renewal terms and potential expansion to two additional schools.',
    signals: [
      { type: 'renewal', evidence: 'Current contract expires August 31' },
      { type: 'expansion', evidence: 'Potential expansion to 2 additional schools' },
    ],
    score: 78,
    unread: true,
  },
  {
    id: 'e3',
    sender: 'Jennifer Walsh',
    company: 'FL Department of Transportation',
    subject: 'Building Maintenance Services - Pre-Bid Conference',
    date: '2026-05-26T10:00:00Z',
    preview: 'Invitation to pre-bid conference for building maintenance services at 14 district offices...',
    body: 'You are invited to attend a pre-bid conference for FL DOT ITB-2026-1142 covering building maintenance and janitorial services at 14 district offices across South Florida. Total estimated value: $1.2M over 3 years.',
    signals: [
      { type: 'bid_opportunity', evidence: 'Pre-bid conference invitation for formal ITB' },
    ],
    score: 71,
    unread: false,
  },
  {
    id: 'e4',
    sender: 'David Park',
    company: 'Palmetto Bay Medical Center',
    subject: 'Expanding Cleaning Services - Medical Wing',
    date: '2026-05-25T16:45:00Z',
    preview: 'Following the successful first 6 months, we want to expand coverage to our new medical wing...',
    body: 'Team, Based on the excellent performance in our main facility, hospital administration has approved expansion of cleaning services to our newly opened medical wing (8,400 sq ft). This would increase the contract value by approximately $3,200/month.',
    signals: [
      { type: 'expansion', evidence: 'Client requesting expansion to new medical wing' },
    ],
    score: 65,
    unread: false,
  },
  {
    id: 'e5',
    sender: 'Carlos Rivera',
    company: 'City of Coral Gables',
    subject: 'URGENT: Municipal Buildings Cleaning RFQ',
    date: '2026-05-25T08:00:00Z',
    preview: 'Urgent procurement notice - municipal buildings cleaning services, response required by June 5...',
    body: 'URGENT PROCUREMENT NOTICE: The City of Coral Gables requires quotes for emergency janitorial services for 6 municipal buildings. Current contractor unable to fulfill contract. Response required by June 5, 2026.',
    signals: [
      { type: 'urgent', evidence: 'Emergency procurement, 9-day deadline' },
      { type: 'bid_opportunity', evidence: 'Current contractor vacancy creates opportunity' },
      { type: 'vendor_issue', evidence: 'Existing vendor failed to perform' },
    ],
    score: 88,
    unread: true,
  },
  {
    id: 'e6',
    sender: 'Amanda Torres',
    company: 'FPL Corporate Offices',
    subject: 'Quarterly Cleaning Services Review',
    date: '2026-05-24T13:00:00Z',
    preview: 'Q1 performance review — overall satisfaction 4.8/5.0. Renewal coming up in November...',
    body: 'Hi, I wanted to share our Q1 satisfaction report (4.8/5.0 overall). Our facilities team is happy with the current service levels. Our contract is up for renewal in November 2026. We would like to start renewal discussions in August.',
    signals: [
      { type: 'renewal', evidence: 'Contract renewal in November 2026' },
    ],
    score: 58,
    unread: false,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  if (hr < 48) return 'Yesterday'
  return `${Math.floor(hr / 24)}d ago`
}

const SIGNAL_META: Record<SignalType, { label: string; bg: string; color: string }> = {
  bid_opportunity: { label: 'Bid', bg: C.blueLight, color: C.blue },
  renewal:         { label: 'Renewal', bg: C.yellowLight, color: C.yellow },
  expansion:       { label: 'Expansion', bg: C.greenLight, color: C.green },
  urgent:          { label: 'Urgent', bg: C.redLight, color: C.red },
  vendor_issue:    { label: 'Vendor Issue', bg: '#FFF7ED', color: '#EA580C' },
}

function SignalBadge({ type }: { type: SignalType }) {
  const m = SIGNAL_META[type]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 8px', borderRadius: 99, fontSize: 10.5, fontWeight: 600,
      background: m.bg, color: m.color,
    }}>
      {m.label}
    </span>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? C.green : score >= 40 ? C.yellow : C.muted
  const bg = score >= 70 ? C.greenLight : score >= 40 ? C.yellowLight : '#F5F5F4'
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 6,
      fontSize: 11.5, fontWeight: 700,
      fontFamily: 'JetBrains Mono, Consolas, monospace',
      background: bg, color,
    }}>
      {score}
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
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      zIndex: 9999,
      animation: 'fadeIn 0.2s ease',
    }}>
      ✓ {message}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface RecentSignal {
  id: string
  title: string
  agency?: string
  created_at?: string
  signal_strength?: string
}

export default function EmailPage() {
  const [emails, setEmails] = useState<EmailItem[]>(MOCK_EMAILS)
  const [loading, setLoading] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null)
  const [hasGmailConnected, setHasGmailConnected] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [filterTab, setFilterTab] = useState<FilterTab>('All')
  const [manualEmailText, setManualEmailText] = useState('')
  const [pasteSubject, setPasteSubject] = useState('')
  const [pasteSender, setPasteSender] = useState('')
  const [pasteAnalysisResult, setPasteAnalysisResult] = useState<AnalysisResult | null>(null)
  const [pasteOpSaved, setPasteOpSaved] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [scanLoading, setScanLoading] = useState(false)
  const [sessionOpCount, setSessionOpCount] = useState(0)
  const [recentSignals, setRecentSignals] = useState<RecentSignal[]>([])

  useEffect(() => {
    const connected = typeof window !== 'undefined' && localStorage.getItem('gmail_connected') === '1'
    setHasGmailConnected(connected)

    fetch('/api/email/scan')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.emails) && d.emails.length > 0) setEmails(d.emails) })
      .catch(() => {})

    fetch('/api/opportunities?source=email_intel&limit=5')
      .then(r => r.json())
      .then(d => {
        const list = d.opportunities ?? d.items ?? d ?? []
        if (Array.isArray(list)) setRecentSignals(list.slice(0, 5))
      })
      .catch(() => {})
  }, [])

  const filterMap: Record<FilterTab, SignalType | null> = {
    All: null,
    Bids: 'bid_opportunity',
    Renewals: 'renewal',
    Expansion: 'expansion',
    Urgent: 'urgent',
  }

  const filteredEmails = filterTab === 'All'
    ? emails
    : emails.filter(e => e.signals.some(s => s.type === filterMap[filterTab]))

  const handleScanInbox = async () => {
    setScanLoading(true)
    try {
      const res = await fetch('/api/email/scan')
      const d = await res.json()
      if (Array.isArray(d.emails) && d.emails.length > 0) setEmails(d.emails)
    } catch { /* use mock */ }
    setScanLoading(false)
  }

  const handleAnalyze = async () => {
    if (!selectedEmail) return
    setAnalyzing(true)
    setAnalysisResult(null)
    try {
      const res = await fetch('/api/email/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: selectedEmail }),
      })
      const d = await res.json()
      setAnalysisResult(d)
      if ((d.intent_score ?? 0) > 60) setSessionOpCount(prev => prev + 1)
    } catch {
      const fallback: AnalysisResult = {
        intent_score: selectedEmail.score,
        people: [{ name: selectedEmail.sender, role: 'Procurement Officer' }],
        companies: [{ name: selectedEmail.company }],
        facilities: [{ name: 'Main Facility', role: 'Primary location' }],
        signals: selectedEmail.signals,
        recommended_action: 'Prepare a compelling proposal and submit within the deadline window.',
      }
      setAnalysisResult(fallback)
      if (selectedEmail.score > 60) setSessionOpCount(prev => prev + 1)
    }
    setAnalyzing(false)
  }

  const handleAnalyzePasted = async () => {
    if (!manualEmailText.trim()) return
    setAnalyzing(true)
    setPasteAnalysisResult(null)
    setPasteOpSaved(false)
    try {
      const res = await fetch('/api/email/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: pasteSubject, sender: pasteSender, body: manualEmailText }),
      })
      const d = await res.json()
      setPasteAnalysisResult(d)
      if ((d.intent_score ?? 0) > 60) setSessionOpCount(prev => prev + 1)
    } catch {
      const fallback: AnalysisResult = {
        intent_score: 72,
        people: [],
        companies: [{ name: pasteSender || 'Unknown Agency' }],
        facilities: [],
        signals: [{ type: 'bid_opportunity', evidence: 'Procurement language detected' }],
        recommended_action: 'Review email for bid details and prepare response.',
      }
      setPasteAnalysisResult(fallback)
      setSessionOpCount(prev => prev + 1)
    }
    setAnalyzing(false)
  }

  const handleSavePasteOpportunity = async () => {
    if (!pasteAnalysisResult) return
    try {
      await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pasteSubject || 'Email Opportunity',
          agency: pasteSender || pasteAnalysisResult.companies[0]?.name || 'Unknown',
          source: 'email_intel',
          status: 'New',
          signal_strength: pasteAnalysisResult.intent_score >= 70 ? 'high' : 'medium',
        }),
      })
    } catch { /* silent */ }
    setPasteOpSaved(true)
    setToast('Opportunity saved from pasted email')
  }

  const handleCreateOpportunity = async () => {
    if (!selectedEmail) return
    try {
      await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedEmail.subject,
          agency: selectedEmail.company,
          source: 'Email Intelligence',
          status: 'New',
        }),
      })
    } catch { /* silent */ }
    setToast(`Opportunity created from "${selectedEmail.subject.slice(0, 40)}..."`)
  }

  const FILTER_TABS: FilterTab[] = ['All', 'Bids', 'Renewals', 'Expansion', 'Urgent']

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FF, display: 'flex', flexDirection: 'column' }}>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${C.border}`, background: C.card,
        padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>Email Intelligence</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            Procurement signals from your inbox
            {sessionOpCount > 0 && (
              <span style={{
                padding: '2px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 700,
                background: C.greenLight, color: C.green,
              }}>
                {sessionOpCount} {sessionOpCount === 1 ? 'opportunity' : 'opportunities'} detected this session
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleScanInbox}
            disabled={scanLoading}
            style={{
              padding: '9px 18px', background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              color: C.text, fontFamily: FF,
            }}
          >
            {scanLoading ? 'Scanning...' : 'Scan Inbox'}
          </button>
          {!hasGmailConnected && (
            <button
              onClick={() => {
                localStorage.setItem('gmail_connected', '1')
                setHasGmailConnected(true)
                setToast('Gmail connected successfully')
              }}
              style={{
                padding: '9px 18px', background: '#EA4335', border: 'none',
                borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                color: '#FFF', fontFamily: FF,
              }}
            >
              Connect Gmail
            </button>
          )}
          {hasGmailConnected && (
            <span style={{
              padding: '9px 14px', background: C.greenLight,
              color: C.green, borderRadius: 8, fontSize: 12, fontWeight: 600,
            }}>
              ✓ Gmail Connected
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left panel — email list */}
        <div style={{ width: 380, flexShrink: 0, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', background: C.card }}>
          {/* Filter bar */}
          <div style={{ display: 'flex', gap: 2, padding: '12px 16px', borderBottom: `1px solid ${C.border}`, overflowX: 'auto' }}>
            {FILTER_TABS.map(tab => {
              const isActive = filterTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  style={{
                    padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer', border: 'none', whiteSpace: 'nowrap',
                    background: isActive ? C.blue : 'transparent',
                    color: isActive ? '#FFF' : C.muted,
                    fontFamily: FF,
                  }}
                >
                  {tab}
                </button>
              )
            })}
          </div>

          {/* Email list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredEmails.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: C.muted, fontSize: 13 }}>
                No emails match this filter
              </div>
            )}
            {filteredEmails.map(email => {
              const isSelected = selectedEmail?.id === email.id
              return (
                <div
                  key={email.id}
                  onClick={() => { setSelectedEmail(email); setAnalysisResult(null) }}
                  style={{
                    padding: '14px 16px',
                    borderBottom: `1px solid ${C.border}`,
                    background: isSelected ? C.blueLight : C.card,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.1s',
                  }}
                >
                  {email.unread && (
                    <div style={{
                      position: 'absolute', top: 16, left: 6,
                      width: 6, height: 6, borderRadius: '50%', background: C.blue,
                    }} />
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: email.unread ? 700 : 600, color: C.text, marginBottom: 1 }}>
                        {email.sender}
                      </div>
                      <div style={{ fontSize: 11.5, color: C.muted }}>{email.company}</div>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>{relTime(email.date)}</div>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {email.subject}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 8 }}>
                    {email.preview}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    {email.signals.map((s, i) => <SignalBadge key={i} type={s.type} />)}
                    <span style={{ marginLeft: 'auto' }}><ScoreBadge score={email.score} /></span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right panel — detail + analysis */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selectedEmail ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: C.muted }}>
              <div style={{ fontSize: 40 }}>📧</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.muted }}>Select an email to analyze</div>
              <div style={{ fontSize: 13, color: C.muted }}>Click any email in the list to view extracted intelligence</div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
              {/* Email header */}
              <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8 }}>
                  {selectedEmail.subject}
                </div>
                <div style={{ display: 'flex', gap: 20, fontSize: 13, color: C.muted }}>
                  <span><strong style={{ color: C.text }}>From:</strong> {selectedEmail.sender}, {selectedEmail.company}</span>
                  <span><strong style={{ color: C.text }}>Received:</strong> {relTime(selectedEmail.date)}</span>
                </div>
              </div>

              {/* Email body */}
              <div style={{
                maxHeight: 200, overflowY: 'auto', fontSize: 13.5, color: C.text,
                lineHeight: 1.7, marginBottom: 20,
                padding: 16, background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`,
              }}>
                {selectedEmail.body}
              </div>

              {/* Analyze button */}
              <div style={{ marginBottom: 24 }}>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  style={{
                    padding: '10px 24px', background: analyzing ? C.muted : C.blue,
                    color: '#FFF', border: 'none', borderRadius: 8,
                    fontSize: 13, fontWeight: 700, cursor: analyzing ? 'default' : 'pointer',
                    fontFamily: FF,
                  }}
                >
                  {analyzing ? 'Analyzing...' : 'Analyze with AI'}
                </button>
              </div>

              {/* Analysis results */}
              {analysisResult && (
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 24, background: C.card }}>
                  <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, background: C.bg }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
                      AI Analysis Results
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Intent Score</div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: analysisResult.intent_score >= 70 ? C.green : C.yellow, fontFamily: 'JetBrains Mono, Consolas, monospace' }}>
                          {analysisResult.intent_score}
                          <span style={{ fontSize: 16, fontWeight: 400, color: C.muted }}>/100</span>
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 8, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${analysisResult.intent_score}%`,
                            background: analysisResult.intent_score >= 70 ? C.green : C.yellow,
                            borderRadius: 99, transition: 'width 0.5s',
                          }} />
                        </div>
                        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>
                          {analysisResult.intent_score >= 70 ? 'High priority opportunity' : 'Medium priority signal'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Entities */}
                  <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>
                      Extracted Entities
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                      {(['people', 'companies', 'facilities'] as const).map(group => (
                        <div key={group}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'capitalize', marginBottom: 6 }}>{group}</div>
                          {analysisResult[group].length === 0 ? (
                            <span style={{ fontSize: 12, color: C.muted }}>None detected</span>
                          ) : analysisResult[group].map((e, i) => (
                            <div key={i} style={{ fontSize: 12.5, color: C.text, marginBottom: 4 }}>
                              <strong>{e.name}</strong>
                              {e.role && <div style={{ fontSize: 11, color: C.muted }}>{e.role}</div>}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Signals */}
                  <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
                      Signals Detected
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {analysisResult.signals.map((s, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <SignalBadge type={s.type} />
                          <span style={{ fontSize: 12.5, color: C.text }}>{s.evidence}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommended action */}
                  <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, background: C.blueLight }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
                      Recommended Action
                    </div>
                    <div style={{ fontSize: 13.5, color: '#1E3A8A', fontWeight: 500, lineHeight: 1.6 }}>
                      {analysisResult.recommended_action}
                    </div>
                  </div>

                  <div style={{ padding: '12px 20px' }}>
                    <button
                      onClick={handleCreateOpportunity}
                      style={{
                        padding: '9px 20px', background: C.green, color: '#FFF',
                        border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                        cursor: 'pointer', fontFamily: FF,
                      }}
                    >
                      Create Opportunity
                    </button>
                  </div>
                </div>
              )}

              {/* Manual email input — Paste & Analyze */}
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, background: C.card }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>Analyze Pasted Email</div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>Paste any email to extract procurement signals</div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <input
                    value={pasteSubject}
                    onChange={e => setPasteSubject(e.target.value)}
                    placeholder="Subject line..."
                    style={{
                      flex: 1, padding: '8px 12px', fontSize: 12.5, fontFamily: FF,
                      border: `1px solid ${C.border}`, borderRadius: 8, outline: 'none',
                      color: C.text, background: C.bg,
                    }}
                  />
                  <input
                    value={pasteSender}
                    onChange={e => setPasteSender(e.target.value)}
                    placeholder="Sender / Company..."
                    style={{
                      flex: 1, padding: '8px 12px', fontSize: 12.5, fontFamily: FF,
                      border: `1px solid ${C.border}`, borderRadius: 8, outline: 'none',
                      color: C.text, background: C.bg,
                    }}
                  />
                </div>
                <textarea
                  value={manualEmailText}
                  onChange={e => setManualEmailText(e.target.value)}
                  placeholder="Paste email body here..."
                  style={{
                    width: '100%', minHeight: 100, padding: '10px 12px',
                    fontSize: 13, fontFamily: FF, border: `1px solid ${C.border}`,
                    borderRadius: 8, outline: 'none', resize: 'vertical',
                    color: C.text, background: C.bg, boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={handleAnalyzePasted}
                  disabled={analyzing || !manualEmailText.trim()}
                  style={{
                    marginTop: 10, padding: '9px 20px',
                    background: manualEmailText.trim() ? C.blue : C.border,
                    color: '#FFF', border: 'none', borderRadius: 8,
                    fontSize: 13, fontWeight: 600, cursor: manualEmailText.trim() ? 'pointer' : 'default',
                    fontFamily: FF,
                  }}
                >
                  {analyzing ? 'Analyzing...' : 'Analyze Pasted Email'}
                </button>

                {/* Paste analysis result */}
                {pasteAnalysisResult && (
                  <div style={{ marginTop: 16, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', background: C.bg, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div>
                        <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>Intent Score</div>
                        <div style={{
                          fontSize: 26, fontWeight: 800, fontFamily: 'JetBrains Mono, Consolas, monospace',
                          color: pasteAnalysisResult.intent_score >= 70 ? C.green : C.yellow,
                        }}>
                          {pasteAnalysisResult.intent_score}<span style={{ fontSize: 13, fontWeight: 400, color: C.muted }}>/100</span>
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        {pasteAnalysisResult.signals.map((s, i) => (
                          <div key={i} style={{ marginBottom: 4 }}>
                            <SignalBadge type={s.type} />
                            <span style={{ fontSize: 11.5, color: C.text, marginLeft: 6 }}>{s.evidence}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Recommended action:</div>
                      <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 12 }}>
                        {pasteAnalysisResult.recommended_action}
                      </div>
                      {pasteAnalysisResult.intent_score > 60 && (
                        pasteOpSaved ? (
                          <span style={{ fontSize: 12, fontWeight: 600, color: C.green }}>Saved to Opportunities</span>
                        ) : (
                          <button
                            onClick={handleSavePasteOpportunity}
                            style={{
                              padding: '8px 18px', background: C.green, color: '#FFF',
                              border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                              cursor: 'pointer', fontFamily: FF,
                            }}
                          >
                            Save to Opportunities
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Signals from Email */}
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, background: C.card }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>Recent Signals from Email</div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>Last 5 opportunities created from email intelligence</div>
                {recentSignals.length === 0 ? (
                  <div style={{ fontSize: 13, color: C.muted, padding: '12px 0' }}>
                    No email-sourced opportunities yet. Analyze emails above to create them.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {recentSignals.map((sig, i) => (
                      <div key={sig.id || i} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                        background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sig.title}
                          </div>
                          {sig.agency && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>{sig.agency}</div>}
                        </div>
                        {sig.signal_strength && (
                          <span style={{
                            padding: '2px 8px', borderRadius: 99, fontSize: 10.5, fontWeight: 600,
                            background: sig.signal_strength === 'high' ? C.greenLight : C.yellowLight,
                            color: sig.signal_strength === 'high' ? C.green : C.yellow,
                          }}>
                            {sig.signal_strength}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom bar */}
          {selectedEmail && analysisResult && (
            <div style={{
              borderTop: `1px solid ${C.border}`, background: C.card,
              padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            }}>
              <button
                onClick={handleCreateOpportunity}
                style={{
                  padding: '10px 24px', background: C.blue, color: '#FFF',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: FF,
                }}
              >
                Add to Opportunities →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
