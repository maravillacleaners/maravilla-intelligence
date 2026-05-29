'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { SearchResult } from '../api/search/route'

const C = {
  bg: '#FAFAF9',
  surface: '#FFFFFF',
  border: '#E7E5E4',
  text: '#1C1917',
  muted: '#78716C',
  faint: '#A8A29E',
  indigo: '#4F46E5',
  indigoLight: '#EEF2FF',
  indigoBorder: '#C7D2FE',
  green: '#16A34A',
  greenLight: '#DCFCE7',
  amber: '#D97706',
  amberLight: '#FEF3C7',
  red: '#DC2626',
  redLight: '#FEE2E2',
  blue: '#2563EB',
  blueLight: '#DBEAFE',
  purple: '#7C3AED',
  purpleLight: '#F5F3FF',
}

const TYPE_META: Record<string, { icon: string; label: string; color: string; bg: string; border: string }> = {
  company:     { icon: '🏢', label: 'Company',     color: C.indigo,  bg: C.indigoLight, border: C.indigoBorder },
  contract:    { icon: '📋', label: 'Contract',    color: C.blue,    bg: C.blueLight,   border: '#BFDBFE' },
  agency:      { icon: '🏛',  label: 'Agency',      color: C.purple,  bg: C.purpleLight, border: '#DDD6FE' },
  opportunity: { icon: '🎯', label: 'Opportunity', color: C.amber,   bg: C.amberLight,  border: '#FDE68A' },
  contact:     { icon: '👤', label: 'Contact',     color: C.green,   bg: C.greenLight,  border: '#BBF7D0' },
}

function ResultCard({ result, onClick }: { result: SearchResult; onClick: () => void }) {
  const meta = TYPE_META[result.type] || TYPE_META.company
  const [hover, setHover] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? meta.bg : C.surface,
        border: `1px solid ${hover ? meta.border : C.border}`,
        borderRadius: 12, padding: '16px 20px', cursor: 'pointer',
        display: 'flex', gap: 16, alignItems: 'flex-start',
        transition: 'all 100ms',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: meta.bg, border: `1px solid ${meta.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, flexShrink: 0,
      }}>{meta.icon}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: hover ? meta.color : C.text }}>
            {result.title}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
            background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`,
          }}>{meta.label}</span>
          {result.badge && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
              background: result.badgeColor ? `${result.badgeColor}18` : '#F5F5F4',
              color: result.badgeColor || C.muted,
            }}>{result.badge}</span>
          )}
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>{result.subtitle}</div>
        {result.meta && (
          <div style={{ fontSize: 12, color: C.faint }}>{result.meta}</div>
        )}
      </div>

      <div style={{ fontSize: 14, color: C.faint, flexShrink: 0 }}>→</div>
    </div>
  )
}

type FilterType = 'all' | SearchResult['type']

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQ = searchParams.get('q') || ''

  const [query, setQuery] = useState(initialQ)
  const [submittedQ, setSubmittedQ] = useState(initialQ)
  const [results, setResults] = useState<SearchResult[]>([])
  const [grouped, setGrouped] = useState<Record<string, SearchResult[]>>({})
  const [parsed, setParsed] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!submittedQ || submittedQ.length < 2) return
    setLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(submittedQ)}&limit=60`)
      .then((r) => r.json())
      .then((d) => {
        setResults(d.results || [])
        setGrouped(d.grouped || {})
        setParsed(d.parsed || null)
        setTotal(d.total || 0)
        setFilter('all')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [submittedQ])

  useEffect(() => {
    if (initialQ) setSubmittedQ(initialQ)
  }, [initialQ])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      setSubmittedQ(query.trim())
      router.push(`/search?q=${encodeURIComponent(query.trim())}`, { scroll: false })
    }
  }

  const filterOptions: { id: FilterType; label: string; icon: string; count: number }[] = [
    { id: 'all', label: 'All', icon: '✦', count: total },
    { id: 'company', label: 'Companies', icon: '🏢', count: (grouped.company || []).length },
    { id: 'contract', label: 'Contracts', icon: '📋', count: (grouped.contract || []).length },
    { id: 'agency', label: 'Agencies', icon: '🏛', count: (grouped.agency || []).length },
    { id: 'opportunity', label: 'Opportunities', icon: '🎯', count: (grouped.opportunity || []).length },
    { id: 'contact', label: 'Contacts', icon: '👤', count: (grouped.contact || []).length },
  ]

  const displayResults = filter === 'all' ? results : results.filter((r) => r.type === filter)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui,-apple-system,sans-serif' }}>
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
        <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Search</span>
      </div>

      {/* Search bar */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: '20px 32px',
      }}>
        <form onSubmit={submit} style={{ maxWidth: 720, display: 'flex', gap: 10 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 10,
            border: `2px solid ${C.indigo}`, borderRadius: 12, padding: '12px 16px',
            background: C.surface,
          }}>
            <span style={{ fontSize: 18, opacity: 0.5 }}>🔍</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Florida janitorial contractors with DoD relationships…"
              style={{
                flex: 1, border: 'none', outline: 'none',
                fontSize: 16, color: C.text, background: 'transparent',
              }}
              autoFocus
            />
            {loading && <span style={{ fontSize: 12, color: C.faint, whiteSpace: 'nowrap' }}>Searching…</span>}
          </div>
          <button type="submit" style={{
            padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600,
            border: 'none', background: C.indigo, color: '#FFF', cursor: 'pointer',
          }}>Search</button>
        </form>

        {/* Parsed query intel */}
        {parsed && submittedQ && (
          <div style={{ maxWidth: 720, marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: C.faint }}>Interpreted:</span>
            {(parsed.keywords as string[] || []).map((k: string) => (
              <span key={k} style={{
                fontSize: 12, padding: '2px 9px', borderRadius: 20,
                background: C.indigoLight, color: C.indigo, border: `1px solid ${C.indigoBorder}`,
              }}>{k}</span>
            ))}
            {parsed.state && (
              <span style={{
                fontSize: 12, padding: '2px 9px', borderRadius: 20,
                background: '#DCFCE7', color: C.green, border: '1px solid #BBF7D0',
              }}>State: {String(parsed.state)}</span>
            )}
            {parsed.agency && (
              <span style={{
                fontSize: 12, padding: '2px 9px', borderRadius: 20,
                background: C.purpleLight, color: C.purple, border: '1px solid #DDD6FE',
              }}>Agency: {String(parsed.agency)}</span>
            )}
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 32px', display: 'flex', gap: 24 }}>
        {/* Sidebar filters */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 12, overflow: 'hidden',
          }}>
            {filterOptions.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  width: '100%', padding: '11px 16px', textAlign: 'left',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  border: 'none', borderBottom: `1px solid ${C.border}`,
                  background: filter === f.id ? C.indigoLight : C.surface,
                  color: filter === f.id ? C.indigo : C.text,
                  cursor: 'pointer', fontSize: 13, fontWeight: filter === f.id ? 600 : 400,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{f.icon}</span> {f.label}
                </span>
                {f.count > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 10,
                    background: filter === f.id ? C.indigo : '#F5F5F4',
                    color: filter === f.id ? '#FFF' : C.faint,
                  }}>{f.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Quick searches */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.faint, letterSpacing: '0.06em', marginBottom: 8 }}>
              QUICK SEARCHES
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                'Florida janitorial 561720',
                'DoD cleaning contracts',
                'GSA facilities management',
                'healthcare janitorial FL',
                'airport cleaning contracts',
                'NAICS 561720 prime',
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setQuery(s)
                    setSubmittedQ(s)
                    router.push(`/search?q=${encodeURIComponent(s)}`, { scroll: false })
                  }}
                  style={{
                    padding: '7px 10px', borderRadius: 8, fontSize: 12, textAlign: 'left',
                    border: `1px solid ${C.border}`, background: C.surface,
                    color: C.muted, cursor: 'pointer',
                  }}
                >{s}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!submittedQ && (
            <div style={{ textAlign: 'center', padding: '80px 24px', color: C.muted }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>
                Search across all entities
              </div>
              <div style={{ fontSize: 14, maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
                Find companies, contracts, agencies, opportunities, and contacts.
                Try natural language: "Florida janitorial contractors with DoD relationships"
              </div>
            </div>
          )}

          {submittedQ && !loading && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 24px', color: C.muted }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🤷</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 6 }}>
                No results for "{submittedQ}"
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                Try a company name, agency name, NAICS code like "561720", or keywords.
              </div>
            </div>
          )}

          {displayResults.length > 0 && (
            <>
              <div style={{
                fontSize: 13, color: C.muted, marginBottom: 16,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>
                  {displayResults.length} result{displayResults.length !== 1 ? 's' : ''}
                  {filter !== 'all' ? ` · ${filter}s` : ''}
                  {submittedQ ? ` for "${submittedQ}"` : ''}
                </span>
                {loading && <span style={{ color: C.faint }}>Refreshing…</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {displayResults.map((r, i) => (
                  <ResultCard
                    key={`${r.type}-${r.id}-${i}`}
                    result={r}
                    onClick={() => router.push(r.url)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: '#78716C' }}>Loading…</div>}>
      <SearchContent />
    </Suspense>
  )
}
