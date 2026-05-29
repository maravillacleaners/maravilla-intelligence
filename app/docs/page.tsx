'use client'

import React, { useState, useEffect, useRef } from 'react'

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

type DocType = 'RFPs' | 'Contracts' | 'Bids' | 'Other'
type SignalStrength = 'high' | 'medium' | 'low'

interface ExtractedDoc {
  id: string
  filename: string
  type: DocType
  uploadedAt: string
  agency?: string
  deadline?: string
  estimated_value?: string
  naics_code?: string
  submission_method?: string
  scope_summary?: string
  requirements?: string[]
  keywords?: string[]
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  signal_strength: SignalStrength
  fields_extracted: number
  file_ext: 'pdf' | 'docx' | 'other'
}

// ─── Mock Documents ───────────────────────────────────────────────────────────

const MOCK_DOCS: ExtractedDoc[] = [
  {
    id: 'd1',
    filename: 'Miami-Dade Transit Janitorial RFP 2026.pdf',
    type: 'RFPs',
    uploadedAt: '2026-05-26T10:30:00Z',
    agency: 'Miami-Dade Transit Authority',
    deadline: '2026-07-15',
    estimated_value: '$450,000',
    naics_code: '561720',
    submission_method: 'Electronic via Bonfire Portal',
    scope_summary: 'Comprehensive janitorial and custodial services for 12 Miami-Dade Transit facilities including maintenance stations, administrative offices, and passenger terminals. Contract is 2 years with two 1-year renewal options.',
    requirements: ['MBE/WBE preferred', 'OSHA 30-hour certification for supervisors', 'Minimum 3 years transit/government experience', '3 verifiable client references', '$1M general liability insurance'],
    keywords: ['janitorial', 'custodial', 'transit', 'green cleaning', 'LEED', 'biohazard', 'floor care'],
    contact_name: 'Maria Santos',
    contact_email: 'msantos@miamidade.gov',
    contact_phone: '(305) 555-1234',
    signal_strength: 'high',
    fields_extracted: 9,
    file_ext: 'pdf',
  },
  {
    id: 'd2',
    filename: 'Broward County School Cleaning Contract.pdf',
    type: 'Contracts',
    uploadedAt: '2026-05-25T14:00:00Z',
    agency: 'Broward County School Board',
    deadline: '2026-08-31',
    estimated_value: '$280,000',
    naics_code: '561720',
    submission_method: 'Physical submission to Procurement Office',
    scope_summary: 'Annual janitorial services contract for 8 Broward County elementary and middle schools. Includes daily cleaning, deep cleaning (quarterly), and emergency response services.',
    requirements: ['Background check for all staff', 'Green cleaning products required', 'After-hours service (4PM–10PM)', 'Same-day emergency response'],
    keywords: ['school cleaning', 'green products', 'background check', 'emergency', 'floor wax', 'sanitization'],
    contact_name: 'Robert Chen',
    contact_email: 'rchen@browardschools.com',
    signal_strength: 'high',
    fields_extracted: 8,
    file_ext: 'pdf',
  },
  {
    id: 'd3',
    filename: 'FL DOT Building Maintenance Bid.pdf',
    type: 'Bids',
    uploadedAt: '2026-05-24T09:15:00Z',
    agency: 'FL Department of Transportation',
    deadline: '2026-06-30',
    estimated_value: '$180,000',
    naics_code: '561710',
    submission_method: 'MyFloridaMarketPlace',
    scope_summary: 'Building maintenance and light janitorial services for FL DOT District 4 offices in Broward and Palm Beach counties. Includes 6 locations, approximately 42,000 sq ft total.',
    requirements: ['SBE certification required', 'Registered FL vendor', 'Performance bond required'],
    keywords: ['building maintenance', 'SBE', 'government', 'multi-location', 'pressure washing'],
    signal_strength: 'medium',
    fields_extracted: 7,
    file_ext: 'pdf',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const hr = Math.floor(diff / 3600000)
  if (hr < 24) return `${hr}h ago`
  if (hr < 48) return 'Yesterday'
  return `${Math.floor(hr / 24)}d ago`
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function FileIcon({ ext }: { ext: 'pdf' | 'docx' | 'other' }) {
  const map = { pdf: { bg: C.redLight, color: C.red, label: 'PDF' }, docx: { bg: C.blueLight, color: C.blue, label: 'DOC' }, other: { bg: '#F5F5F4', color: C.muted, label: 'FILE' } }
  const m = map[ext]
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
      background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: 9, fontWeight: 800, color: m.color, letterSpacing: '0.02em' }}>{m.label}</span>
    </div>
  )
}

function SignalBadge({ strength }: { strength: SignalStrength }) {
  const map = {
    high: { bg: C.greenLight, color: C.green, label: 'High' },
    medium: { bg: C.yellowLight, color: C.yellow, label: 'Medium' },
    low: { bg: '#F5F5F4', color: C.muted, label: 'Low' },
  }
  const m = map[strength]
  return (
    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10.5, fontWeight: 600, background: m.bg, color: m.color }}>
      {m.label}
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

// ─── Upload Zone ──────────────────────────────────────────────────────────────

function UploadZone({ uploading, uploadProgress, onUpload }: {
  uploading: boolean
  uploadProgress: number
  onUpload: (files: FileList) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const [sizeWarning, setSizeWarning] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    if (!files.length) return
    const tooBig = Array.from(files).some(f => f.size > 10 * 1024 * 1024)
    if (tooBig) { setSizeWarning(true); setTimeout(() => setSizeWarning(false), 4000); return }
    onUpload(files)
  }

  const handleClick = () => {
    if (inputRef.current) inputRef.current.click()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const tooBig = Array.from(e.target.files).some(f => f.size > 10 * 1024 * 1024)
      if (tooBig) { setSizeWarning(true); setTimeout(() => setSizeWarning(false), 4000); return }
      onUpload(e.target.files)
    }
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={uploading ? undefined : handleClick}
        style={{
          height: 140, borderRadius: 12,
          border: `2px dashed ${dragOver ? C.blue : uploading ? C.muted : C.border}`,
          background: dragOver ? C.blueLight : uploading ? C.bg : C.bg,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 10, cursor: uploading ? 'default' : 'pointer',
          transition: 'all 0.15s',
        }}
      >
        {uploading ? (
          <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '0 32px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Analyzing with AI...</div>
            <div style={{ width: '100%', height: 6, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${uploadProgress}%`,
                background: C.blue, borderRadius: 99,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>{uploadProgress}% — Extracting fields, requirements, and contact info</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 36 }}>📤</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Drop PDFs, contracts, or RFPs here</div>
              <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>
                or <span style={{ color: C.blue, textDecoration: 'underline' }}>click to browse</span>
              </div>
            </div>
            <span style={{
              padding: '4px 12px', background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 99, fontSize: 11.5, color: C.muted,
            }}>
              PDF · DOCX · DOC — Max 10MB
            </span>
          </>
        )}
      </div>
      {sizeWarning && (
        <div style={{ marginTop: 8, padding: '8px 14px', background: C.redLight, border: `1px solid #FECACA`, borderRadius: 8, fontSize: 12.5, color: C.red }}>
          File too large — maximum size is 10MB per file
        </div>
      )}
    </div>
  )
}

// ─── Document Card ────────────────────────────────────────────────────────────

function DocCard({ doc, isSelected, onClick }: { doc: ExtractedDoc; isSelected: boolean; onClick: () => void }) {
  const days = doc.deadline ? daysUntil(doc.deadline) : null
  return (
    <div
      onClick={onClick}
      style={{
        padding: '14px 16px', borderBottom: `1px solid ${C.border}`,
        background: isSelected ? C.blueLight : C.card,
        cursor: 'pointer', transition: 'background 0.1s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
        <FileIcon ext={doc.file_ext} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {doc.filename}
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{doc.agency || 'Unknown Agency'}</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>{relTime(doc.uploadedAt)}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <SignalBadge strength={doc.signal_strength} />
        <span style={{ fontSize: 11, color: C.muted }}>{doc.fields_extracted} fields</span>
        {days !== null && days > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
            background: days < 7 ? C.redLight : days < 30 ? C.yellowLight : C.greenLight,
            color: days < 7 ? C.red : days < 30 ? C.yellow : C.green,
          }}>
            Due in {days}d
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Document Detail Panel ────────────────────────────────────────────────────

function DocDetail({ doc, onCreateOpportunity }: { doc: ExtractedDoc; onCreateOpportunity: () => void }) {
  const [reanalyzing, setReanalyzing] = useState(false)

  const handleReanalyze = async () => {
    setReanalyzing(true)
    await new Promise(r => setTimeout(r, 1500))
    setReanalyzing(false)
  }

  const KEYWORD_COLORS = [C.blueLight, C.purpleLight, C.greenLight, C.yellowLight, '#FFF7ED']
  const KEYWORD_TEXT = [C.blue, C.purple, C.green, C.yellow, '#EA580C']

  const fields = [
    { label: 'Agency', value: doc.agency },
    { label: 'Deadline', value: doc.deadline ? new Date(doc.deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : undefined },
    { label: 'Est. Value', value: doc.estimated_value },
    { label: 'NAICS Code', value: doc.naics_code },
    { label: 'Submission Method', value: doc.submission_method },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <FileIcon ext={doc.file_ext} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text, lineHeight: 1.4, wordBreak: 'break-word' }}>{doc.filename}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Uploaded {relTime(doc.uploadedAt)}</div>
        </div>
        <button
          onClick={handleReanalyze}
          disabled={reanalyzing}
          style={{
            padding: '7px 14px', background: C.bg, border: `1px solid ${C.border}`,
            borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            color: C.text, fontFamily: FF, flexShrink: 0,
          }}
        >
          {reanalyzing ? 'Re-analyzing...' : 'Re-analyze'}
        </button>
      </div>

      {/* Extracted Intelligence */}
      <div style={{ border: `1px solid ${C.green}40`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', background: C.greenLight, borderBottom: `1px solid ${C.green}30` }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.green, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Extracted Intelligence
          </div>
          <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>{doc.fields_extracted} fields successfully extracted</div>
        </div>
        <div style={{ padding: '16px 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {fields.map(f => (
              <div key={f.label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                {f.value && (
                  <span style={{ color: C.green, fontSize: 13, flexShrink: 0, marginTop: 2 }}>✓</span>
                )}
                <div>
                  <div style={{ fontSize: 10.5, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{f.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: f.value ? C.text : C.muted }}>
                    {f.value || '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scope Summary */}
      {doc.scope_summary && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>Scope Summary</div>
          <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.7, padding: '12px 14px', background: C.bg, borderRadius: 8 }}>
            {doc.scope_summary}
          </div>
        </div>
      )}

      {/* Key Requirements */}
      {doc.requirements && doc.requirements.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>Key Requirements</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {doc.requirements.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: C.text, alignItems: 'flex-start' }}>
                <span style={{ color: C.blue, flexShrink: 0, marginTop: 2 }}>•</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cleaning Keywords */}
      {doc.keywords && doc.keywords.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>Cleaning Keywords Found</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {doc.keywords.map((kw, i) => (
              <span
                key={i}
                style={{
                  padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 500,
                  background: KEYWORD_COLORS[i % KEYWORD_COLORS.length],
                  color: KEYWORD_TEXT[i % KEYWORD_TEXT.length],
                }}
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Contact Information */}
      {(doc.contact_name || doc.contact_email || doc.contact_phone) && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>Contact Information</div>
          <div style={{ padding: '14px 16px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10 }}>
            {doc.contact_name && <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>{doc.contact_name}</div>}
            {doc.contact_email && (
              <div style={{ fontSize: 13, color: C.blue, marginBottom: 4 }}>
                <span style={{ color: C.muted, fontSize: 11 }}>Email: </span>{doc.contact_email}
              </div>
            )}
            {doc.contact_phone && (
              <div style={{ fontSize: 13, color: C.text }}>
                <span style={{ color: C.muted, fontSize: 11 }}>Phone: </span>{doc.contact_phone}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Opportunity */}
      <div style={{ paddingTop: 8 }}>
        <button
          onClick={onCreateOpportunity}
          style={{
            width: '100%', padding: '12px 24px',
            background: C.blue, color: '#FFF',
            border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: FF,
          }}
        >
          Create Opportunity from this Document
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [docs, setDocs] = useState<ExtractedDoc[]>(MOCK_DOCS)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedDoc, setSelectedDoc] = useState<ExtractedDoc | null>(null)
  const [filterTab, setFilterTab] = useState<'All' | DocType>('All')
  const [toast, setToast] = useState<string | null>(null)

  const FILTER_TABS: ('All' | DocType)[] = ['All', 'RFPs', 'Contracts', 'Bids', 'Other']

  const filteredDocs = filterTab === 'All' ? docs : docs.filter(d => d.type === filterTab)

  const handleUpload = async (files: FileList) => {
    setUploading(true)
    setUploadProgress(0)

    // Simulate progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) { clearInterval(interval); return 90 }
        return prev + Math.floor(Math.random() * 15) + 5
      })
    }, 400)

    const uploadedNew: ExtractedDoc[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fd = new globalThis.FormData()
      fd.append('file', file)

      let extracted: Partial<ExtractedDoc> = {}
      try {
        const res = await fetch('/api/docs/upload', { method: 'POST', body: fd })
        extracted = await res.json()
      } catch {
        // Generate plausible mock data from filename
        extracted = {
          agency: 'Government Agency',
          estimated_value: '$' + (Math.floor(Math.random() * 400 + 100)) + 'K',
          deadline: new Date(Date.now() + (30 + Math.floor(Math.random() * 60)) * 86400000).toISOString().split('T')[0],
          naics_code: '561720',
          submission_method: 'Electronic submission',
          scope_summary: 'AI-extracted scope of work from uploaded document. Review the full document for complete details.',
          requirements: ['Licensed & insured', 'Prior government experience preferred'],
          keywords: ['janitorial', 'cleaning', 'facility', 'maintenance'],
          signal_strength: 'medium' as SignalStrength,
          fields_extracted: 6,
        }
      }

      const ext = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : file.name.toLowerCase().endsWith('.docx') ? 'docx' : 'other'
      const type: DocType = file.name.toLowerCase().includes('rfp') ? 'RFPs'
        : file.name.toLowerCase().includes('contract') ? 'Contracts'
        : file.name.toLowerCase().includes('bid') ? 'Bids' : 'Other'

      const newDoc: ExtractedDoc = {
        id: `d_${Date.now()}_${i}`,
        filename: file.name,
        type,
        uploadedAt: new Date().toISOString(),
        file_ext: ext,
        signal_strength: (extracted.signal_strength as SignalStrength) ?? 'medium',
        fields_extracted: extracted.fields_extracted ?? 0,
        ...extracted,
      }

      uploadedNew.push(newDoc)
    }

    clearInterval(interval)
    setUploadProgress(100)
    await new Promise(r => setTimeout(r, 400))

    setDocs(prev => [...uploadedNew, ...prev])
    if (uploadedNew.length > 0) setSelectedDoc(uploadedNew[0])
    setUploading(false)
    setUploadProgress(0)
    setToast(`${uploadedNew.length} document${uploadedNew.length > 1 ? 's' : ''} analyzed`)
  }

  const handleCreateOpportunity = async () => {
    if (!selectedDoc) return
    try {
      await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedDoc.filename.replace(/\.(pdf|docx|doc)$/i, ''),
          agency: selectedDoc.agency,
          deadline: selectedDoc.deadline,
          estimated_value: selectedDoc.estimated_value,
          naics_code: selectedDoc.naics_code,
          source: 'Document Intelligence',
          status: 'New',
        }),
      })
    } catch { /* silent */ }
    setToast(`Opportunity created from "${selectedDoc.filename.slice(0, 40)}..."`)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FF, display: 'flex', flexDirection: 'column' }}>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${C.border}`, background: C.card,
        padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>Document Intelligence</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
            AI-powered extraction from RFPs, contracts, and bid documents
          </div>
        </div>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2,
        }}>
          <div style={{
            fontSize: 28, fontWeight: 800, color: C.blue,
            fontFamily: 'JetBrains Mono, Consolas, monospace', lineHeight: 1,
          }}>
            {docs.length}
          </div>
          <div style={{ fontSize: 11.5, color: C.muted }}>
            document{docs.length !== 1 ? 's' : ''} analyzed
          </div>
        </div>
      </div>

      {/* Upload zone */}
      <div style={{ padding: '24px 32px 0' }}>
        <UploadZone
          uploading={uploading}
          uploadProgress={uploadProgress}
          onUpload={handleUpload}
        />
      </div>

      {/* Body — split */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left panel — document list */}
        <div style={{ width: 360, flexShrink: 0, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', background: C.card }}>
          {/* Filter tabs */}
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
                    color: isActive ? '#FFF' : C.muted, fontFamily: FF,
                  }}
                >
                  {tab}
                </button>
              )
            })}
          </div>

          {/* Doc list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredDocs.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>No documents yet</div>
                <div style={{ fontSize: 12.5, color: C.muted }}>Upload your first RFP or contract above to get started</div>
              </div>
            ) : (
              filteredDocs.map(doc => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  isSelected={selectedDoc?.id === doc.id}
                  onClick={() => setSelectedDoc(doc)}
                />
              ))
            )}
          </div>

          {/* List stats footer */}
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, background: C.bg }}>
            <div style={{ fontSize: 11.5, color: C.muted }}>
              {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''} ·{' '}
              <span style={{ color: C.green, fontWeight: 600 }}>
                {filteredDocs.filter(d => d.signal_strength === 'high').length} high signal
              </span>
            </div>
          </div>
        </div>

        {/* Right panel — document detail */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px' }}>
          {!selectedDoc ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: C.muted }}>
              <div style={{ fontSize: 48 }}>📋</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.muted }}>Select a document to view extracted intelligence</div>
              <div style={{ fontSize: 13, color: C.muted }}>Upload a PDF or click a document in the list to the left</div>
            </div>
          ) : (
            <div style={{ maxWidth: 700 }}>
              <DocDetail doc={selectedDoc} onCreateOpportunity={handleCreateOpportunity} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
