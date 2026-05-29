'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
}

const TYPE_META: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  company:     { icon: '🏢', label: 'Company',     color: '#4F46E5', bg: '#EEF2FF' },
  contract:    { icon: '📋', label: 'Contract',    color: '#2563EB', bg: '#DBEAFE' },
  agency:      { icon: '🏛',  label: 'Agency',      color: '#7C3AED', bg: '#F5F3FF' },
  opportunity: { icon: '🎯', label: 'Opportunity', color: '#D97706', bg: '#FEF3C7' },
  contact:     { icon: '👤', label: 'Contact',     color: '#16A34A', bg: '#DCFCE7' },
}

const HISTORY_KEY = 'search_history'
const MAX_HISTORY = 8

function getHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
}

function addToHistory(q: string) {
  if (!q.trim() || q.trim().length < 2) return
  const h = getHistory().filter((x) => x !== q)
  h.unshift(q)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, MAX_HISTORY)))
}

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return dv
}

export default function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [history, setHistory] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQ = useDebounce(query, 300)

  // ⌘K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen((o) => !o) }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setHistory(getHistory())
      setTimeout(() => inputRef.current?.focus(), 60)
    }
  }, [open])

  useEffect(() => {
    if (!debouncedQ || debouncedQ.length < 2) { setResults([]); return }
    setLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(debouncedQ)}&limit=30`)
      .then((r) => r.json())
      .then((d) => { setResults(d.results || []); setSelectedIdx(0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [debouncedQ])

  const navigate = useCallback((result: SearchResult) => {
    addToHistory(query || result.title)
    setOpen(false)
    router.push(result.url)
  }, [router, query])

  function runHistory(q: string) {
    setQuery(q)
    addToHistory(q)
  }

  function viewAll() {
    if (!query) return
    addToHistory(query)
    setOpen(false)
    router.push(`/search?q=${encodeURIComponent(query)}`)
  }

  function clearHistory() {
    localStorage.removeItem(HISTORY_KEY)
    setHistory([])
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && results[selectedIdx]) navigate(results[selectedIdx])
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Search (⌘K)"
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 1000,
          width: 52, height: 52, borderRadius: '50%',
          background: C.indigo, color: '#FFF', border: 'none', cursor: 'pointer',
          fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(79,70,229,0.35)', transition: 'transform 120ms, box-shadow 120ms',
        }}
        onMouseEnter={(e) => {
          const b = e.currentTarget as HTMLButtonElement
          b.style.transform = 'scale(1.08)'
          b.style.boxShadow = '0 6px 20px rgba(79,70,229,0.45)'
        }}
        onMouseLeave={(e) => {
          const b = e.currentTarget as HTMLButtonElement
          b.style.transform = 'scale(1)'
          b.style.boxShadow = '0 4px 16px rgba(79,70,229,0.35)'
        }}
      >
        🔍
      </button>
    )
  }

  const typeOrder: SearchResult['type'][] = ['company', 'opportunity', 'contract', 'agency', 'contact']
  const grouped: Record<string, SearchResult[]> = {}
  for (const r of results) {
    if (!grouped[r.type]) grouped[r.type] = []
    grouped[r.type].push(r)
  }

  let flatIndex = 0

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 1001,
          background: 'rgba(28,25,23,0.45)', backdropFilter: 'blur(3px)',
          animation: 'cmdkFade 120ms ease',
        }}
      />

      {/* Palette */}
      <div style={{
        position: 'fixed', top: '12vh', left: '50%', transform: 'translateX(-50%)',
        zIndex: 1002, width: '100%', maxWidth: 700,
        background: C.surface, borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08)',
        overflow: 'hidden', animation: 'cmdkPop 140ms ease',
        fontFamily: 'system-ui,-apple-system,sans-serif',
      }}>
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
        }}>
          <span style={{ fontSize: 18, opacity: 0.4 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search companies, agencies, contracts, opportunities…"
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: 16, color: C.text, background: 'transparent',
            }}
          />
          {loading && <span style={{ fontSize: 12, color: C.faint }}>…</span>}
          <kbd style={{
            fontSize: 11, color: C.faint, background: '#F5F5F4',
            border: `1px solid ${C.border}`, borderRadius: 5, padding: '2px 7px',
          }}>esc</kbd>
        </div>

        {/* No query: history + suggestions */}
        {!query && (
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {/* Recent searches */}
            {history.length > 0 && (
              <div>
                <div style={{
                  padding: '10px 20px 6px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.faint, letterSpacing: '0.06em' }}>
                    RECENT SEARCHES
                  </span>
                  <button onClick={clearHistory} style={{
                    fontSize: 11, color: C.faint, background: 'none', border: 'none', cursor: 'pointer',
                  }}>Clear</button>
                </div>
                {history.map((h) => (
                  <div key={h} onClick={() => runHistory(h)} style={{
                    padding: '9px 20px', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', gap: 10, fontSize: 13, color: C.muted,
                    borderBottom: `1px solid ${C.border}`,
                  }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = C.indigoLight }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = '' }}
                  >
                    <span style={{ fontSize: 14, opacity: 0.4 }}>🕐</span>
                    {h}
                  </div>
                ))}
              </div>
            )}

            {/* Suggested */}
            <div style={{ padding: '10px 20px 16px', borderTop: history.length > 0 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.faint, letterSpacing: '0.06em', marginBottom: 10 }}>
                SUGGESTED
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[
                  'Florida janitorial contractors',
                  'DoD cleaning contracts',
                  'GSA facilities',
                  'NAICS 561720 FL',
                  'healthcare janitorial',
                  'airport facilities',
                ].map((s) => (
                  <button key={s} onClick={() => setQuery(s)} style={{
                    padding: '6px 12px', borderRadius: 20, fontSize: 12,
                    border: `1px solid ${C.border}`, background: C.bg,
                    color: C.muted, cursor: 'pointer',
                  }}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div style={{ maxHeight: '62vh', overflowY: 'auto' }}>
            {typeOrder.map((type) => {
              const group = (grouped[type] || []).slice(0, 4)
              if (!group.length) return null
              const meta = TYPE_META[type]
              return (
                <div key={type}>
                  <div style={{
                    padding: '9px 20px 5px', fontSize: 11, fontWeight: 700,
                    color: C.faint, letterSpacing: '0.06em', textTransform: 'uppercase',
                    background: '#FAFAFB', borderTop: `1px solid ${C.border}`,
                  }}>
                    {meta.icon} {meta.label}s
                  </div>
                  {group.map((r) => {
                    const idx = flatIndex++
                    const isSelected = selectedIdx === idx
                    return (
                      <div
                        key={`${r.type}-${r.id}-${idx}`}
                        onClick={() => navigate(r)}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        style={{
                          padding: '12px 20px', cursor: 'pointer',
                          background: isSelected ? C.indigoLight : C.surface,
                          borderBottom: `1px solid ${C.border}`,
                          display: 'flex', flexDirection: 'column', gap: 6,
                          transition: 'background 80ms',
                        }}
                      >
                        {/* Title row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: 9, background: meta.bg, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                          }}>{meta.icon}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 14, fontWeight: 600,
                              color: isSelected ? C.indigo : C.text,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{r.title}</div>
                            <div style={{
                              fontSize: 12, color: C.muted,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{r.subtitle}{r.meta ? ` · ${r.meta}` : ''}</div>
                          </div>
                          {r.badge && (
                            <span style={{
                              fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10, flexShrink: 0,
                              background: r.badgeColor ? `${r.badgeColor}18` : '#F5F5F4',
                              color: r.badgeColor || C.muted,
                            }}>{r.badge}</span>
                          )}
                        </div>

                        {/* Reasoning preview */}
                        {r.match_reasons && r.match_reasons.length > 0 && (
                          <div style={{ paddingLeft: 44, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <div style={{ fontSize: 10.5, color: C.faint, fontWeight: 500, marginBottom: 2 }}>
                              Matched because:
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                              {r.match_reasons.slice(0, 3).map((reason, i) => (
                                <span key={i} style={{
                                  fontSize: 10.5, padding: '1px 8px', borderRadius: 10,
                                  background: isSelected ? '#DBEAFE' : '#F5F5F4',
                                  color: isSelected ? C.indigo : C.muted,
                                  border: `1px solid ${isSelected ? '#BFDBFE' : C.border}`,
                                }}>{reason}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recommended actions (only on selected) */}
                        {isSelected && r.recommended_actions && r.recommended_actions.length > 0 && (
                          <div style={{ paddingLeft: 44, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {r.recommended_actions.map((action, i) => (
                              <span key={i} style={{
                                fontSize: 11, padding: '3px 9px', borderRadius: 6,
                                background: C.indigo, color: '#FFF', cursor: 'pointer', fontWeight: 500,
                              }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (action.toLowerCase().includes('contact')) { navigate({ ...r, url: r.url + '#contacts' }) }
                                  else if (action.toLowerCase().includes('pipeline')) { navigate({ ...r, url: r.url + '?action=pipeline' }) }
                                  else navigate(r)
                                }}
                              >{action} →</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {/* View all */}
            <div onClick={viewAll} style={{
              padding: '12px 20px', cursor: 'pointer', textAlign: 'center',
              fontSize: 13, color: C.indigo, fontWeight: 500, background: '#FAFAFB',
              borderTop: `1px solid ${C.border}`,
            }}>
              See all {results.length} results for "{query}" →
            </div>
          </div>
        )}

        {/* No results */}
        {query.length >= 2 && !loading && results.length === 0 && (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: C.muted, fontSize: 14 }}>
            No results for "<strong>{query}</strong>"
            <div style={{ fontSize: 12, marginTop: 6, color: C.faint }}>Try a company name, agency, NAICS code, or keyword</div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          padding: '8px 20px', background: '#FAFAFB', borderTop: `1px solid ${C.border}`,
          display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', gap: 14 }}>
            {[['↑↓', 'navigate'], ['↵', 'open'], ['esc', 'close']].map(([key, label]) => (
              <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <kbd style={{
                  fontSize: 11, color: C.faint, background: C.surface,
                  border: `1px solid ${C.border}`, borderRadius: 4, padding: '1px 6px',
                }}>{key}</kbd>
                <span style={{ fontSize: 11, color: C.faint }}>{label}</span>
              </span>
            ))}
          </div>
          <button onClick={viewAll} style={{
            fontSize: 12, color: C.indigo, background: 'none', border: 'none',
            cursor: 'pointer', fontWeight: 500,
          }}>Full search →</button>
        </div>
      </div>
    </>
  )
}
