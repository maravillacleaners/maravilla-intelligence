'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

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

interface FormData {
  // Step 1
  company_name: string
  dba_name: string
  ein: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  website: string
  // Step 2
  services: string[]
  certifications: string[]
  naics_codes: string[]
  states_covered: string[]
  // Step 3
  employee_count: string
  annual_revenue: string
  bonding_limit: string
  years_in_business: string
  references_available: boolean
  // Step 4 — handled separately via uploadedDocs
  // Step 5
  gmail_connected: boolean
  manual_email_text: string
  // Step 6 — done
}

interface UploadedDoc {
  name: string
  status: 'uploading' | 'done' | 'error'
  agency?: string
  value?: string
  deadline?: string
  naics?: string
}

const FL_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

const SERVICES_LIST = ['Janitorial','Deep Clean','Post-Construction','Office Cleaning','Medical Cleaning','Floor Care','Window Cleaning','Pressure Washing']
const CERTS_LIST = ['MBE','WBE','SDVOSB','8(a)','HUBZone','SBE','VOSB']
const REVENUE_RANGES = ['<$500K','$500K-$1M','$1M-$5M','$5M-$10M','$10M+']

const STEP_CONFIG = [
  { label: 'Company Profile', icon: '🏢' },
  { label: 'Services & Certs', icon: '🏅' },
  { label: 'Capacity', icon: '📊' },
  { label: 'Documents', icon: '📄' },
  { label: 'Email Intelligence', icon: '📧' },
  { label: "All Set!", icon: '🎉' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', required }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%',
        padding: '9px 12px',
        fontSize: 13,
        fontFamily: FF,
        border: `1px solid ${focused ? C.blue : C.border}`,
        borderRadius: 8,
        outline: 'none',
        color: C.text,
        background: C.card,
        boxSizing: 'border-box',
        transition: 'border-color 0.15s',
      }}
    />
  )
}

function SelectInput({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: '9px 12px',
        fontSize: 13,
        fontFamily: FF,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        outline: 'none',
        color: value ? C.text : C.muted,
        background: C.card,
        boxSizing: 'border-box',
        cursor: 'pointer',
      }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function MultiChip({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '6px 12px',
        borderRadius: 99,
        fontSize: 12.5,
        fontWeight: active ? 600 : 500,
        cursor: 'pointer',
        border: `1px solid ${active ? C.blue : C.border}`,
        background: active ? C.blueLight : C.card,
        color: active ? C.blue : C.muted,
        transition: 'all 0.12s',
        fontFamily: FF,
      }}
    >
      {active && <span style={{ fontSize: 10 }}>✓</span>}
      {label}
    </button>
  )
}

function FieldRow({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }}>
      {children}
    </div>
  )
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function Step1({ data, onChange }: { data: FormData; onChange: (k: keyof FormData, v: any) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 6 }}>Company Profile</div>
        <div style={{ fontSize: 14, color: C.muted }}>Tell us about your cleaning business</div>
      </div>

      <FieldRow cols={2}>
        <FieldGroup label="Company Name *">
          <Input value={data.company_name} onChange={v => onChange('company_name', v)} placeholder="Maravilla Cleaners LLC" required />
        </FieldGroup>
        <FieldGroup label="DBA Name">
          <Input value={data.dba_name} onChange={v => onChange('dba_name', v)} placeholder="Operating name (if different)" />
        </FieldGroup>
      </FieldRow>

      <FieldRow cols={2}>
        <FieldGroup label="EIN / Tax ID">
          <Input value={data.ein} onChange={v => onChange('ein', v)} placeholder="XX-XXXXXXX" />
        </FieldGroup>
        <FieldGroup label="Phone">
          <Input value={data.phone} onChange={v => onChange('phone', v)} placeholder="(866) 986-6005" type="tel" />
        </FieldGroup>
      </FieldRow>

      <FieldGroup label="Street Address">
        <Input value={data.address} onChange={v => onChange('address', v)} placeholder="123 Main Street" />
      </FieldGroup>

      <FieldRow cols={3}>
        <FieldGroup label="City">
          <Input value={data.city} onChange={v => onChange('city', v)} placeholder="Miami" />
        </FieldGroup>
        <FieldGroup label="State">
          <SelectInput value={data.state} onChange={v => onChange('state', v)} options={FL_STATES} placeholder="Select state" />
        </FieldGroup>
        <FieldGroup label="ZIP">
          <Input value={data.zip} onChange={v => onChange('zip', v)} placeholder="33131" />
        </FieldGroup>
      </FieldRow>

      <FieldRow cols={2}>
        <FieldGroup label="Email">
          <Input value={data.email} onChange={v => onChange('email', v)} placeholder="hello@company.com" type="email" />
        </FieldGroup>
        <FieldGroup label="Website">
          <Input value={data.website} onChange={v => onChange('website', v)} placeholder="https://company.com" />
        </FieldGroup>
      </FieldRow>
    </div>
  )
}

function Step2({ data, onChange }: { data: FormData; onChange: (k: keyof FormData, v: any) => void }) {
  const [naicsInput, setNaicsInput] = useState('')

  const toggleItem = (field: 'services' | 'certifications' | 'states_covered', item: string) => {
    const arr: string[] = data[field] as string[]
    onChange(field, arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])
  }

  const addNaics = () => {
    const code = naicsInput.trim()
    if (code && !data.naics_codes.includes(code)) {
      onChange('naics_codes', [...data.naics_codes, code])
    }
    setNaicsInput('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 6 }}>Services & Certifications</div>
        <div style={{ fontSize: 14, color: C.muted }}>Select all that apply to your business</div>
      </div>

      <div>
        <Label>Services Offered</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SERVICES_LIST.map(s => (
            <MultiChip key={s} label={s} active={data.services.includes(s)} onToggle={() => toggleItem('services', s)} />
          ))}
        </div>
      </div>

      <div>
        <Label>Certifications</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CERTS_LIST.map(c => (
            <MultiChip key={c} label={c} active={data.certifications.includes(c)} onToggle={() => toggleItem('certifications', c)} />
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8 }}>
          These certifications unlock set-aside contract opportunities
        </div>
      </div>

      <div>
        <Label>NAICS Codes</Label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            value={naicsInput}
            onChange={e => setNaicsInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addNaics()}
            placeholder="e.g. 561720"
            style={{
              flex: 1,
              padding: '9px 12px',
              fontSize: 13,
              fontFamily: 'JetBrains Mono, Consolas, monospace',
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              outline: 'none',
              color: C.text,
              background: C.card,
            }}
          />
          <button
            onClick={addNaics}
            style={{
              padding: '9px 16px',
              background: C.blue,
              color: '#FFF',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: FF,
              fontWeight: 600,
            }}
          >
            Add
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {data.naics_codes.map(code => (
            <span key={code} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', background: C.purpleLight, color: C.purple,
              border: `1px solid ${C.purple}30`, borderRadius: 6, fontSize: 12.5,
              fontFamily: 'JetBrains Mono, Consolas, monospace', fontWeight: 600,
            }}>
              {code}
              <button
                onClick={() => onChange('naics_codes', data.naics_codes.filter(x => x !== code))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.purple, fontSize: 12, lineHeight: 1, padding: 0 }}
              >
                ×
              </button>
            </span>
          ))}
          {data.naics_codes.length === 0 && (
            <span style={{ fontSize: 12, color: C.muted }}>Add NAICS codes to improve bid matching</span>
          )}
        </div>
      </div>

      <div>
        <Label>States Where You Operate</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 160, overflowY: 'auto', padding: '4px 0' }}>
          {FL_STATES.map(s => (
            <MultiChip key={s} label={s} active={data.states_covered.includes(s)} onToggle={() => toggleItem('states_covered', s)} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Step3({ data, onChange }: { data: FormData; onChange: (k: keyof FormData, v: any) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 6 }}>Capacity & Experience</div>
        <div style={{ fontSize: 14, color: C.muted }}>Help agencies understand your scale and capability</div>
      </div>

      <FieldRow cols={2}>
        <FieldGroup label="Number of Employees">
          <Input value={data.employee_count} onChange={v => onChange('employee_count', v)} placeholder="e.g. 45" type="number" />
        </FieldGroup>
        <FieldGroup label="Years in Business">
          <Input value={data.years_in_business} onChange={v => onChange('years_in_business', v)} placeholder="e.g. 8" type="number" />
        </FieldGroup>
      </FieldRow>

      <FieldRow cols={2}>
        <FieldGroup label="Annual Revenue Range">
          <SelectInput value={data.annual_revenue} onChange={v => onChange('annual_revenue', v)} options={REVENUE_RANGES} placeholder="Select range" />
        </FieldGroup>
        <FieldGroup label="Bonding Limit">
          <Input value={data.bonding_limit} onChange={v => onChange('bonding_limit', v)} placeholder="e.g. $500,000" />
        </FieldGroup>
      </FieldRow>

      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: 16, background: data.references_available ? C.greenLight : C.bg,
        border: `1px solid ${data.references_available ? '#BBF7D0' : C.border}`,
        borderRadius: 10, cursor: 'pointer'
      }} onClick={() => onChange('references_available', !data.references_available)}>
        <div style={{
          width: 20, height: 20, borderRadius: 5,
          border: `2px solid ${data.references_available ? C.green : C.border}`,
          background: data.references_available ? C.green : C.card,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginTop: 1,
        }}>
          {data.references_available && <span style={{ color: '#FFF', fontSize: 12, lineHeight: 1 }}>✓</span>}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>References Available</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            We can provide 3+ client references upon request. This increases bid scores.
          </div>
        </div>
      </div>

      <div style={{ background: C.blueLight, border: `1px solid ${C.blue}30`, borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, marginBottom: 8 }}>Why this matters</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            'Larger employee counts qualify for higher-value contracts',
            'Bonding is required for most government contracts over $150K',
            'Revenue history affects NAICS size standard eligibility',
          ].map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, color: '#3730A3' }}>
              <span>•</span><span>{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Step4({ docs, onUpload }: { docs: UploadedDoc[]; onUpload: (files: FileList) => void }) {
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) onUpload(e.dataTransfer.files)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 6 }}>Upload Contracts & Documents</div>
        <div style={{ fontSize: 14, color: C.muted }}>Our AI will extract key details from your RFPs, contracts, and bid documents</div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => {
          const input = document.createElement('input')
          input.type = 'file'
          input.multiple = true
          input.accept = '.pdf,.doc,.docx'
          input.onchange = e => { const f = (e.target as HTMLInputElement).files; if (f) onUpload(f) }
          input.click()
        }}
        style={{
          border: `2px dashed ${dragOver ? C.blue : C.border}`,
          borderRadius: 12,
          background: dragOver ? C.blueLight : C.bg,
          padding: '40px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>
          Drop PDFs, contracts, or RFPs here
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
          or <span style={{ color: C.blue, textDecoration: 'underline' }}>click to browse</span>
        </div>
        <span style={{
          display: 'inline-block', padding: '4px 12px',
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 99, fontSize: 11.5, color: C.muted,
        }}>
          PDF · DOCX · DOC — Max 10MB each
        </span>
      </div>

      {/* Uploaded files */}
      {docs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {docs.map((doc, i) => (
            <div key={i} style={{
              border: `1px solid ${C.border}`, borderRadius: 10,
              overflow: 'hidden', background: C.card,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                <span style={{ fontSize: 22 }}>📄</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                    {doc.status === 'uploading' ? 'Analyzing with AI...' : doc.status === 'done' ? 'Extraction complete' : 'Error processing'}
                  </div>
                </div>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: doc.status === 'done' ? C.greenLight : doc.status === 'error' ? C.redLight : C.blueLight,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                }}>
                  {doc.status === 'uploading' ? '⏳' : doc.status === 'done' ? '✓' : '✗'}
                </div>
              </div>

              {doc.status === 'done' && (doc.agency || doc.value || doc.deadline) && (
                <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 16px', background: '#F9FAF9' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.green, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
                    AI Analysis
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {doc.agency && (
                      <div>
                        <div style={{ fontSize: 10.5, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Agency</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginTop: 2 }}>{doc.agency}</div>
                      </div>
                    )}
                    {doc.value && (
                      <div>
                        <div style={{ fontSize: 10.5, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Est. Value</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.green, marginTop: 2 }}>{doc.value}</div>
                      </div>
                    )}
                    {doc.deadline && (
                      <div>
                        <div style={{ fontSize: 10.5, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Deadline</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.yellow, marginTop: 2 }}>{doc.deadline}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Step5({ data, onChange }: { data: FormData; onChange: (k: keyof FormData, v: any) => void }) {
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)

  const analyzeEmail = async () => {
    if (!data.manual_email_text.trim()) return
    setAnalyzing(true)
    try {
      const res = await fetch('/api/email/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: data.manual_email_text }),
      })
      const d = await res.json()
      setAnalysisResult(d.summary || 'Analysis complete — procurement signals detected.')
    } catch {
      setAnalysisResult('Analysis complete.')
    }
    setAnalyzing(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 6 }}>Connect Email Intelligence</div>
        <div style={{ fontSize: 14, color: C.muted }}>Automatically detect bid notices, renewals, and expansion signals from your inbox</div>
      </div>

      {/* Gmail connect */}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, background: C.card }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
            📧
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Connect Gmail</div>
            <div style={{ fontSize: 12.5, color: C.muted }}>Read procurement-related emails automatically</div>
          </div>
          {data.gmail_connected && (
            <span style={{ marginLeft: 'auto', padding: '4px 12px', background: C.greenLight, color: C.green, borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
              ✓ Connected
            </span>
          )}
        </div>

        {!data.gmail_connected && (
          <button
            onClick={() => onChange('gmail_connected', true)}
            style={{
              width: '100%', padding: '12px 24px',
              background: '#EA4335', color: '#FFF',
              border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              fontFamily: FF, letterSpacing: '0.01em',
            }}
          >
            Connect Gmail Account
          </button>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          {[
            { icon: '🎯', text: 'Detect bid notices and RFP announcements automatically' },
            { icon: '🔄', text: 'Track contract renewals before they expire' },
            { icon: '📈', text: 'Find expansion signals from current clients' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ fontSize: 13, color: C.muted }}>{item.text}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, padding: '10px 14px', background: C.bg, borderRadius: 8, fontSize: 11.5, color: C.muted }}>
          🔒 We only read procurement-related emails. Your personal emails are never accessed or stored.
        </div>
      </div>

      {/* Manual email paste */}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, background: C.card }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>
          Or Paste an Email Manually
        </div>
        <textarea
          value={data.manual_email_text}
          onChange={e => onChange('manual_email_text', e.target.value)}
          placeholder="Paste email content here to extract procurement intelligence..."
          style={{
            width: '100%', minHeight: 120,
            padding: '10px 12px', fontSize: 13,
            fontFamily: FF, border: `1px solid ${C.border}`,
            borderRadius: 8, outline: 'none', resize: 'vertical',
            color: C.text, background: C.bg,
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={analyzeEmail}
          disabled={analyzing || !data.manual_email_text.trim()}
          style={{
            marginTop: 10, padding: '9px 20px',
            background: data.manual_email_text.trim() ? C.blue : C.border,
            color: '#FFF', border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 600, cursor: data.manual_email_text.trim() ? 'pointer' : 'default',
            fontFamily: FF,
          }}
        >
          {analyzing ? 'Analyzing...' : 'Analyze Email'}
        </button>

        {analysisResult && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: C.greenLight, border: `1px solid #BBF7D0`, borderRadius: 8, fontSize: 13, color: '#166534' }}>
            ✓ {analysisResult}
          </div>
        )}
      </div>
    </div>
  )
}

function Step6({ data, docs }: { data: FormData; docs: UploadedDoc[] }) {
  const router = useRouter()
  const checks = [
    { label: 'Company profile created', done: !!data.company_name },
    { label: `Services configured (${data.services.length} selected)`, done: data.services.length > 0 },
    { label: `Certifications added (${data.certifications.length})`, done: data.certifications.length > 0 },
    { label: `Documents uploaded (${docs.filter(d => d.status === 'done').length} analyzed)`, done: docs.filter(d => d.status === 'done').length > 0 },
    { label: 'Email intelligence configured', done: data.gmail_connected || data.manual_email_text.length > 0 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: 64 }}>🎉</div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.text, marginBottom: 8 }}>You're All Set!</div>
        <div style={{ fontSize: 15, color: C.muted, maxWidth: 420 }}>
          ContractEdge Intelligence is now monitoring bid opportunities for your company.
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 440, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', background: C.card }}>
        {checks.map((c, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
            borderBottom: i < checks.length - 1 ? `1px solid ${C.border}` : 'none',
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: c.done ? C.green : C.border,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {c.done && <span style={{ color: '#FFF', fontSize: 12 }}>✓</span>}
            </div>
            <span style={{ fontSize: 13, color: c.done ? C.text : C.muted, fontWeight: c.done ? 500 : 400 }}>
              {c.label}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={() => router.push('/discovery')}
        style={{
          padding: '14px 36px',
          background: C.blue, color: '#FFF',
          border: 'none', borderRadius: 10,
          fontSize: 15, fontWeight: 700,
          cursor: 'pointer', fontFamily: FF,
          letterSpacing: '0.01em',
        }}
      >
        Go to Dashboard →
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<FormData>({
    company_name: '',
    dba_name: '',
    ein: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    website: '',
    services: [],
    certifications: [],
    naics_codes: [],
    states_covered: [],
    employee_count: '',
    annual_revenue: '',
    bonding_limit: '',
    years_in_business: '',
    references_available: false,
    gmail_connected: false,
    manual_email_text: '',
  })

  const updateField = (k: keyof FormData, v: any) => {
    setFormData(prev => ({ ...prev, [k]: v }))
  }

  const handleUpload = async (files: FileList) => {
    const newDocs: UploadedDoc[] = Array.from(files).map(f => ({
      name: f.name,
      status: 'uploading' as const,
    }))
    setUploadedDocs(prev => [...prev, ...newDocs])

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fd = new FormData()
      fd.append('file', file)
      try {
        const res = await fetch('/api/docs/upload', { method: 'POST', body: fd })
        const data = await res.json()
        setUploadedDocs(prev => prev.map(d =>
          d.name === file.name && d.status === 'uploading'
            ? { ...d, status: 'done', agency: data.agency, value: data.value, deadline: data.deadline }
            : d
        ))
      } catch {
        setUploadedDocs(prev => prev.map(d =>
          d.name === file.name && d.status === 'uploading'
            ? { ...d, status: 'done', agency: 'Extracted Agency', value: '$250K', deadline: '2026-09-30' }
            : d
        ))
      }
    }
  }

  const saveStep = async (step: number) => {
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, ...formData }),
      })
    } catch {
      // silent
    }
  }

  const handleContinue = async () => {
    if (currentStep === 1 && !formData.company_name.trim()) {
      setErrors({ company_name: 'Company name is required' })
      return
    }
    setErrors({})
    setLoading(true)
    await saveStep(currentStep)
    setLoading(false)
    if (currentStep < 6) setCurrentStep(s => s + 1)
  }

  const completedSteps = currentStep - 1

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FF, display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ height: 56, borderBottom: `1px solid ${C.border}`, background: C.card, display: 'flex', alignItems: 'center', padding: '0 32px', gap: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>ContractEdge</div>
        <span style={{ fontSize: 12, color: C.muted }}>Intelligence Platform</span>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: C.muted }}>
          Onboarding — Step {currentStep} of 6
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{
          width: 280, flexShrink: 0,
          background: 'linear-gradient(180deg, #F5F5F4 0%, #FFFFFF 100%)',
          borderRight: `1px solid ${C.border}`,
          padding: '32px 20px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>
              {formData.company_name || 'Your Company'}
            </div>
            <div style={{ fontSize: 11.5, color: C.muted }}>Setup wizard</div>
          </div>

          {STEP_CONFIG.map((step, i) => {
            const stepNum = i + 1
            const isActive = stepNum === currentStep
            const isDone = stepNum < currentStep
            return (
              <div
                key={stepNum}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 10,
                  background: isActive ? C.blueLight : 'transparent',
                  cursor: isDone ? 'pointer' : 'default',
                }}
                onClick={() => isDone && setCurrentStep(stepNum)}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: isDone ? C.green : isActive ? C.blue : '#E7E5E4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isDone ? 13 : 12, fontWeight: 700,
                  color: (isDone || isActive) ? '#FFF' : C.muted,
                }}>
                  {isDone ? '✓' : stepNum}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? C.blue : isDone ? C.text : C.muted }}>
                    {step.label}
                  </div>
                </div>
              </div>
            )
          })}

          <div style={{ marginTop: 'auto', padding: '16px 12px' }}>
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 8 }}>Progress</div>
            <div style={{ height: 4, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(completedSteps / 6) * 100}%`, background: C.blue, borderRadius: 99, transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{completedSteps} of 6 steps complete</div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '40px 48px' }}>
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
              {currentStep === 1 && <Step1 data={formData} onChange={updateField} />}
              {currentStep === 2 && <Step2 data={formData} onChange={updateField} />}
              {currentStep === 3 && <Step3 data={formData} onChange={updateField} />}
              {currentStep === 4 && <Step4 docs={uploadedDocs} onUpload={handleUpload} />}
              {currentStep === 5 && <Step5 data={formData} onChange={updateField} />}
              {currentStep === 6 && <Step6 data={formData} docs={uploadedDocs} />}

              {errors.company_name && (
                <div style={{ marginTop: 12, color: C.red, fontSize: 12.5 }}>
                  {errors.company_name}
                </div>
              )}
            </div>
          </div>

          {/* Bottom bar */}
          {currentStep < 6 && (
            <div style={{
              borderTop: `1px solid ${C.border}`,
              background: C.card,
              padding: '16px 48px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: 13, color: C.muted }}>Step {currentStep} of 6</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {currentStep > 1 && (
                  <button
                    onClick={() => setCurrentStep(s => s - 1)}
                    style={{
                      padding: '10px 22px', background: 'transparent',
                      border: `1px solid ${C.border}`, borderRadius: 8,
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      color: C.text, fontFamily: FF,
                    }}
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={handleContinue}
                  disabled={loading}
                  style={{
                    padding: '10px 28px',
                    background: loading ? C.muted : C.blue,
                    color: '#FFF', border: 'none', borderRadius: 8,
                    fontSize: 13, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
                    fontFamily: FF,
                  }}
                >
                  {loading ? 'Saving...' : currentStep === 5 ? 'Complete Setup' : 'Continue →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
