'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const C = {
  bg: '#FAFAF9', surface: '#FFFFFF', border: '#E7E5E4', text: '#1C1917',
  muted: '#78716C', faint: '#A8A29E', blue: '#4F46E5', blueLight: '#EEF2FF',
  green: '#16A34A', greenLight: '#F0FDF4', red: '#DC2626', redLight: '#FEF2F2',
  amber: '#D97706', amberLight: '#FFFBEB', radius: 10,
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

interface SyncRun {
  timestamp: string
  source: string
  naics?: string[]
  state?: string
  pages_fetched?: number
  records_fetched: number
  records_created: number
  records_skipped: number
  duration_sec: number
  status: string
  error?: string
}

interface AirtableStats {
  total: number
  mostRecent: string
  avgScore: number
  sources: Record<string, number>
}

interface SyncStatus {
  runs: SyncRun[]
  airtable: AirtableStats
  cron: {
    schedule: string
    lastRun: string | null
    lastRunAgeMinutes: number | null
    status: string
    nextSources: string[]
  }
  generated_at: string
}

interface SyncLogEntry {
  timestamp: string
  message: string
}

interface DataSource {
  id: string
  name: string
  type: string
  status: string
  records: string
  freq: string
  free: boolean
  icon: string
  endpoint: string
  description: string
}

const DATA_SOURCES: DataSource[] = [
  { id: 'national-sync', name: 'National Sync Engine', type: 'USASpending All 50 States', status: 'active', records: '3,344+', freq: 'Every 15 min', free: true, icon: '🔄', endpoint: '/api/sync/national', description: 'USASpending national pull — all 50 states, cleaning NAICS' },
  { id: 'intel-winners', name: 'Intelligence API — Winners', type: 'Contract Winner Targets', status: 'active', records: 'Live', freq: 'On demand', free: true, icon: '🎯', endpoint: '/api/intelligence/winners', description: 'Facilities management contract winners (client targets)' },
  { id: 'intel-companies', name: 'Intelligence API — Sector', type: 'Sector Competitors & Subs', status: 'active', records: '105+', freq: 'On demand', free: true, icon: '🏢', endpoint: '/api/intelligence/companies', description: 'National cleaning company directory (200+ companies)' },
  { id: 'pricing', name: 'Pricing Intelligence', type: 'Contract Benchmarks by State', status: 'active', records: '28 states', freq: 'On demand', free: true, icon: '📊', endpoint: '/api/intelligence/pricing', description: 'Contract benchmarks by state — 28 states, $5.75B market' },
  { id: 'opp-sync', name: 'Opportunities Sync', type: 'Recent Contract Awards', status: 'active', records: '300+', freq: 'On demand', free: true, icon: '🎯', endpoint: '/api/sync/opportunities', description: 'Sync recent cleaning awards into Opportunities table' },
  { id: 'samgov', name: 'SAM.gov Opportunities', type: 'Active Opportunities', status: 'active', records: 'Live', freq: 'Every 4h', free: true, icon: '📋', endpoint: '/api/sam/run', description: 'Live federal bid solicitations — NAICS 561720, FL + 7 states' },
]

function loadSyncLog(): SyncLogEntry[] {
  try {
    const raw = sessionStorage.getItem('sync_log')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function appendSyncLog(entry: SyncLogEntry) {
  try {
    const entries = loadSyncLog()
    entries.unshift(entry)
    sessionStorage.setItem('sync_log', JSON.stringify(entries.slice(0, 50)))
  } catch {}
}

export default function RunsPage() {
  const router = useRouter()
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'runs' | 'sources'>('sources')
  const [selectedRun, setSelectedRun] = useState<SyncRun | null>(null)
  const [syncLog, setSyncLog] = useState<SyncLogEntry[]>([])
  const [runningId, setRunningId] = useState<string | null>(null)
  const [runResults, setRunResults] = useState<Record<string, string>>({})

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) { router.push('/login'); return }
    fetch('/api/sync-status')
      .then(r => r.json())
      .then(d => { setStatus(d); setSelectedRun(d.runs?.[0] || null) })
      .catch(() => {})
      .finally(() => setLoading(false))
    setSyncLog(loadSyncLog())
  }, [router])

  async function handleRun(src: DataSource) {
    if (!src.endpoint) return
    setRunningId(src.id)
    const ts = new Date().toISOString()
    const label = src.name

    try {
      if (src.endpoint === '/api/sync/national') {
        setRunResults(r => ({ ...r, [src.id]: 'Syncing...' }))
        const res = await fetch(src.endpoint)
        if (res.ok) {
          const data = await res.json()
          const created = data.records_created ?? data.total ?? '?'
          const skipped = data.records_skipped ?? 0
          const result = `Synced ${created} records, skipped ${skipped} duplicates`
          setRunResults(r => ({ ...r, [src.id]: result }))
          appendSyncLog({ timestamp: ts, message: `[${ts.slice(0,19).replace('T',' ')}] ${label}: ${result}` })
        } else {
          setRunResults(r => ({ ...r, [src.id]: `Error: HTTP ${res.status}` }))
        }
      } else {
        setRunResults(r => ({ ...r, [src.id]: 'Checking...' }))
        const res = await fetch(src.endpoint)
        if (res.ok) {
          const data = await res.json()
          const count = data.total ?? data.winners?.length ?? data.companies?.length ?? src.records
          const result = `${count} records loaded`
          setRunResults(r => ({ ...r, [src.id]: result }))
          appendSyncLog({ timestamp: ts, message: `[${ts.slice(0,19).replace('T',' ')}] ${label}: ${result}` })
        } else {
          setRunResults(r => ({ ...r, [src.id]: `HTTP ${res.status}` }))
        }
      }
    } catch (err) {
      setRunResults(r => ({ ...r, [src.id]: 'Network error' }))
    } finally {
      setRunningId(null)
      setSyncLog(loadSyncLog())
    }
  }

  function cronHealthColor(s: string) {
    if (s === 'healthy') return C.green
    if (s === 'delayed') return C.amber
    if (s === 'stale') return C.red
    return C.faint
  }

  function statusColor(s: string) {
    if (s === 'success') return { bg: C.greenLight, text: C.green }
    if (s === 'failed') return { bg: C.redLight, text: C.red }
    return { bg: C.blueLight, text: C.blue }
  }

  function sourceStatusBadge(s: string) {
    if (s === 'active') return { label: 'Active', bg: C.greenLight, color: C.green }
    if (s === 'limited') return { label: 'Limited', bg: C.amberLight, color: C.amber }
    if (s === 'needs_key') return { label: 'Needs API Key', bg: C.amberLight, color: C.amber }
    return { label: 'Planned', bg: C.border, color: C.faint }
  }

  function fmtTime(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  // Compute live stats from status
  const totalRecords = status?.airtable?.total || 0
  const lastSync = status?.airtable?.mostRecent || status?.cron?.lastRun || null
  const nextSync = lastSync
    ? new Date(new Date(lastSync).getTime() + 15 * 60 * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '—'

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, fontFamily: C.font }}>
        <p style={{ color: C.muted }}>Loading sync status…</p>
      </div>
    )
  }

  const cron = status?.cron
  const airtable = status?.airtable
  const runs = status?.runs || []

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: C.font }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '16px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>Sync & Data Sources</h1>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
              Live pipeline status — {totalRecords} records in Airtable
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: cronHealthColor(cron?.status || '') }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: cronHealthColor(cron?.status || ''), display: 'inline-block' }} />
              <span style={{ fontWeight: 600 }}>
                {cron?.status === 'healthy' ? 'Cron healthy' :
                  cron?.status === 'no_data' ? 'Cron starting…' :
                  cron?.status === 'delayed' ? 'Cron delayed' : 'Cron stale'}
              </span>
              {cron?.lastRunAgeMinutes !== null && cron?.lastRunAgeMinutes !== undefined && (
                <span style={{ color: C.faint }}>· {cron.lastRunAgeMinutes}m ago</span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
          {(['sources', 'runs'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '6px 14px', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                border: `1px solid ${tab === t ? C.blue : C.border}`,
                background: tab === t ? C.blueLight : 'transparent',
                color: tab === t ? C.blue : C.muted,
              }}
            >
              {t === 'runs' ? 'Sync Runs' : 'Data Sources'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        {[
          { label: 'Total Records', value: totalRecords.toString() },
          { label: 'Avg Score', value: airtable?.avgScore ? `${airtable.avgScore}/100` : '—' },
          { label: 'Last Sync', value: lastSync ? fmtTime(lastSync) : '—' },
          { label: 'Next Sync', value: nextSync },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: '14px 20px', borderRight: i < 3 ? `1px solid ${C.border}` : 'none' }}>
            <p style={{ fontSize: 11, color: C.faint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: '4px 0 0' }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flex: 1, padding: 24, gap: 20 }}>

        {/* ── Sources Tab ── */}
        {tab === 'sources' && (
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
              All data sources available for ContractEdge Intelligence — all free, no paid subscriptions needed.
            </p>

            {/* Data sources table */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radius, overflow: 'hidden', marginBottom: 24 }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 100px 100px 80px 90px', background: '#FAFAFB', borderBottom: `1px solid ${C.border}`, padding: '10px 16px', gap: 12 }}>
                {['Source', 'Description', 'Status', 'Records', 'Freq', 'Action'].map(h => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</span>
                ))}
              </div>

              {DATA_SOURCES.map((src, i) => {
                const badge = sourceStatusBadge(src.status)
                const isRunning = runningId === src.id
                const result = runResults[src.id]
                const canRun = !!src.endpoint
                return (
                  <div
                    key={src.id}
                    style={{
                      display: 'grid', gridTemplateColumns: '2fr 1.5fr 100px 100px 80px 90px',
                      padding: '12px 16px', gap: 12, alignItems: 'center',
                      borderBottom: i < DATA_SOURCES.length - 1 ? `1px solid ${C.border}` : 'none',
                      background: isRunning ? C.blueLight : C.surface,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{src.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{src.name}</p>
                        <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{src.type}</p>
                      </div>
                    </div>
                    <p style={{ fontSize: 11, color: C.muted, margin: 0, lineHeight: 1.4 }}>{result || src.description}</p>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 5, background: badge.bg, color: badge.color, display: 'inline-block', width: 'fit-content' }}>
                      {badge.label}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{src.records}</span>
                    <span style={{ fontSize: 11, color: C.muted }}>{src.freq}</span>
                    <button
                      disabled={!canRun || isRunning}
                      onClick={() => handleRun(src)}
                      style={{
                        padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: canRun ? 'pointer' : 'default',
                        border: `1px solid ${canRun ? C.blue : C.border}`,
                        background: canRun ? (isRunning ? C.blueLight : C.blue) : 'transparent',
                        color: canRun ? (isRunning ? C.blue : '#FFF') : C.faint,
                        opacity: canRun ? 1 : 0.5,
                        transition: 'all 150ms',
                      }}
                    >
                      {isRunning ? 'Running…' : canRun ? 'Run' : '—'}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Sync History */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radius, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 14px' }}>Sync History</h3>
              {syncLog.length === 0 ? (
                <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>No sync runs yet this session. Click "Run" on any data source above to get started.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {syncLog.slice(0, 5).map((entry, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', background: C.bg, borderRadius: 6, fontSize: 12 }}>
                      <span style={{ color: C.faint, flexShrink: 0, fontFamily: 'monospace', fontSize: 11 }}>
                        {entry.timestamp.slice(0,19).replace('T',' ')}
                      </span>
                      <span style={{ color: C.text }}>{entry.message.replace(/^\[.*?\]\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Florida data advantage */}
            <div style={{ background: C.blueLight, border: `1px solid #C7D2FE`, borderRadius: C.radius, padding: 20, marginTop: 20 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.blue, margin: '0 0 8px' }}>Florida Data Advantage</p>
              <p style={{ fontSize: 12, color: '#3730A3', lineHeight: 1.6, margin: 0 }}>
                Florida has 67 counties, 400+ municipalities, and 1,500+ special districts — all with public procurement APIs.
                Together they represent tens of thousands of cleaning contracts per year.
                When fully connected, this system will see every government cleaning opportunity in FL before competitors.
              </p>
              <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 12, color: '#3730A3', fontWeight: 600 }}>
                <span>67 counties</span>
                <span>400+ cities</span>
                <span>1,500+ districts</span>
                <span>10,000+ annual cleaning contracts</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Runs Tab ── */}
        {tab === 'runs' && (
          <>
            {/* Run list */}
            <div style={{ width: 320, flexShrink: 0 }}>
              {runs.length === 0 ? (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radius, padding: 24, textAlign: 'center' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: '0 0 8px' }}>No runs yet</p>
                  <p style={{ fontSize: 12, color: C.muted }}>The enhanced sync script hasn't run yet. It will write logs here automatically.</p>
                  <button
                    onClick={() => setTab('sources')}
                    style={{ marginTop: 14, padding: '8px 16px', background: C.blue, color: '#FFF', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Trigger manual sync
                  </button>
                </div>
              ) : runs.map((run, i) => {
                const sc = statusColor(run.status)
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedRun(run)}
                    style={{
                      background: selectedRun === run ? C.blueLight : C.surface,
                      border: `1px solid ${selectedRun === run ? C.blue : C.border}`,
                      borderRadius: C.radius, padding: 16, marginBottom: 10, cursor: 'pointer',
                      transition: 'all 150ms',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{run.source}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: sc.bg, color: sc.text }}>
                        {run.status.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: C.muted, margin: '0 0 6px' }}>{fmtTime(run.timestamp)}</p>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: C.faint }}>
                      <span>+{run.records_created} new</span>
                      <span>{run.records_fetched} fetched</span>
                      <span>{run.duration_sec}s</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Run detail */}
            {selectedRun ? (
              <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.radius, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>{selectedRun.source}</h2>
                    <p style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{fmtTime(selectedRun.timestamp)}</p>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, alignSelf: 'flex-start',
                    ...statusColor(selectedRun.status),
                  }}>
                    {selectedRun.status.toUpperCase()}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                  {[
                    ['Records fetched', selectedRun.records_fetched],
                    ['Records created', selectedRun.records_created],
                    ['Skipped (dup)', selectedRun.records_skipped],
                    ['Pages fetched', selectedRun.pages_fetched || 1],
                    ['Duration', `${selectedRun.duration_sec}s`],
                    ['State', selectedRun.state || 'National'],
                  ].map(([label, val]) => (
                    <div key={label as string} style={{ background: C.bg, borderRadius: 8, padding: '12px 14px' }}>
                      <p style={{ fontSize: 10, color: C.faint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>{label}</p>
                      <p style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: '4px 0 0' }}>{val}</p>
                    </div>
                  ))}
                </div>

                {selectedRun.naics && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 6 }}>NAICS codes searched</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {selectedRun.naics.map(n => (
                        <span key={n} style={{ fontSize: 11, background: C.blueLight, color: C.blue, padding: '3px 8px', borderRadius: 5, fontWeight: 500 }}>{n}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedRun.error && (
                  <div style={{ background: C.redLight, border: `1px solid #FECACA`, borderRadius: 8, padding: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: C.red, margin: '0 0 4px' }}>Error</p>
                    <p style={{ fontSize: 12, color: C.red, margin: 0 }}>{selectedRun.error}</p>
                  </div>
                )}

                {airtable?.sources && (
                  <div style={{ marginTop: 20 }}>
                    <p style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 10 }}>Records by source (live)</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {Object.entries(airtable.sources).map(([src, count]) => (
                        <div key={src} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 12, color: C.text, minWidth: 120 }}>{src}</span>
                          <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.round((count / (airtable.total || 1)) * 100)}%`, background: C.blue, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 12, color: C.muted, minWidth: 30, textAlign: 'right' }}>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.faint, fontSize: 13 }}>
                Select a run to view details
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
