'use client'

import { useEffect, useState, useCallback } from 'react'
import TopBar from '@/components/crm/top-bar'

const C = {
  bg: '#FAFAF9', surface: '#FFFFFF', border: '#E7E5E4',
  text: '#1C1917', muted: '#78716C', xmuted: '#A8A29E',
  indigo: '#4F46E5', indigoBg: '#EEF2FF', indigoBorder: '#C7D2FE',
  green: '#059669', greenBg: '#ECFDF5', greenBorder: '#A7F3D0',
  amber: '#D97706', amberBg: '#FFFBEB', amberBorder: '#FDE68A',
  red: '#DC2626', redBg: '#FEF2F2', redBorder: '#FECACA',
}

function relTime(iso: string | null): string {
  if (!iso) return 'never'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 2) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

// Integration config — maps API integration IDs to display info
const INTEGRATIONS: { id: string; name: string; icon: string; desc: string; hasSync: boolean; category: string }[] = [
  { id: 'sam',         name: 'SAM.gov',          icon: '🏛️', desc: 'Federal contract opportunities. Free API, refreshes every 4h.', hasSync: true,  category: 'Government Data' },
  { id: 'usaspending', name: 'USASpending.gov',   icon: '💰', desc: 'Federal spending awards. Public API, no key required.',          hasSync: true,  category: 'Government Data' },
  { id: 'highergov',   name: 'HigherGov',         icon: '🔍', desc: 'Premium procurement contacts: contracting officers, buyers.',    hasSync: true,  category: 'Government Data' },
  { id: 'airtable',    name: 'Airtable',          icon: '📊', desc: 'Database: leads, avatars, events, tasks.',                      hasSync: false, category: 'Database' },
  { id: 'gmail',       name: 'Gmail',             icon: '📧', desc: 'Email procurement signals — RFPs, bids, solicitations.',         hasSync: true,  category: 'Email' },
]

type TestResult = { connected: boolean; response_ms?: number; error?: string; sample_data?: any[]; sample_contacts?: any[] }

function StatusDot({ connected, configured }: { connected: boolean; configured: boolean }) {
  const color = connected ? C.green : configured ? C.amber : '#D6D3D1'
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
}

function IntegCard({
  intg, status, testing, syncing, result,
  onTest, onSync,
}: {
  intg: typeof INTEGRATIONS[0]
  status: any
  testing: boolean
  syncing: boolean
  result: TestResult | null
  onTest: () => void
  onSync: () => void
}) {
  const connected  = result?.connected ?? status?.connected ?? false
  const configured = status?.configured ?? false
  const lastSync   = status?.last_sync_age_minutes != null
    ? (status.last_sync_age_minutes < 60 ? `${status.last_sync_age_minutes}m ago` : `${Math.round(status.last_sync_age_minutes / 60)}h ago`)
    : null
  const records    = status?.records_created != null
    ? `${status.records_created} records in last run`
    : null

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 22, lineHeight: 1 }}>{intg.icon}</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{intg.name}</span>
              <StatusDot connected={connected} configured={configured} />
              <span style={{ fontSize: 11, color: connected ? C.green : configured ? C.amber : C.xmuted, fontWeight: 600 }}>
                {connected ? 'Connected' : configured ? 'Configured' : 'Not set'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{intg.desc}</div>
          </div>
        </div>
        <a href="/settings" style={{ fontSize: 11, color: C.indigo, textDecoration: 'none', flexShrink: 0 }}>Configure →</a>
      </div>

      {/* Provenance row */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        {lastSync && (
          <span style={{ fontSize: 11, color: C.muted, background: '#F5F5F4', padding: '2px 8px', borderRadius: 6 }}>
            Last sync: {lastSync}
          </span>
        )}
        {records && (
          <span style={{ fontSize: 11, color: C.muted, background: '#F5F5F4', padding: '2px 8px', borderRadius: 6 }}>
            {records}
          </span>
        )}
        {!configured && !status?.always_available && (
          <span style={{ fontSize: 11, color: C.amber, background: C.amberBg, border: `1px solid ${C.amberBorder}`, padding: '2px 8px', borderRadius: 6 }}>
            API key needed → Settings
          </span>
        )}
      </div>

      {/* Test result */}
      {result && (
        <div style={{
          marginBottom: 12, padding: '10px 12px',
          background: result.connected ? C.greenBg : C.redBg,
          border: `1px solid ${result.connected ? C.greenBorder : C.redBorder}`,
          borderRadius: 8, fontSize: 11,
        }}>
          <div style={{ color: result.connected ? C.green : C.red, fontWeight: 600, marginBottom: 4 }}>
            {result.connected ? '✓ Connected' : '✗ Failed'} · {result.response_ms}ms
          </div>
          {result.error && <div style={{ color: C.red }}>{result.error}</div>}
          {(result.sample_data || result.sample_contacts || []).slice(0,2).map((s: any, i: number) => (
            <div key={i} style={{ color: C.green, marginTop: 2 }}>
              · {s.entity_name || s.title || s.name || s.contact_name || JSON.stringify(s).slice(0,60)}
            </div>
          ))}
        </div>
      )}

      {/* Sync result if syncing just completed */}
      {syncing && (
        <div style={{ marginBottom: 12, padding: '10px 12px', background: C.indigoBg, border: `1px solid ${C.indigoBorder}`, borderRadius: 8, fontSize: 11, color: C.indigo }}>
          Syncing…
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onTest}
          disabled={testing || syncing}
          style={{
            padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500,
            background: testing ? '#F5F5F4' : C.surface,
            border: `1px solid ${C.border}`,
            color: testing ? C.xmuted : C.muted,
            cursor: testing ? 'not-allowed' : 'pointer',
          }}
        >
          {testing ? 'Testing…' : 'Test connection'}
        </button>
        {intg.hasSync && (
          <button
            onClick={onSync}
            disabled={testing || syncing || !configured}
            style={{
              padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500,
              background: syncing ? C.indigoBg : (configured ? C.indigoBg : '#F5F5F4'),
              border: `1px solid ${configured ? C.indigoBorder : C.border}`,
              color: syncing ? C.indigo : (configured ? C.indigo : C.xmuted),
              cursor: (testing || syncing || !configured) ? 'not-allowed' : 'pointer',
            }}
          >
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function IntegrationsPage() {
  const [statuses, setStatuses] = useState<Record<string, any>>({})
  const [testing,  setTesting]  = useState<Record<string, boolean>>({})
  const [syncing,  setSyncing]  = useState<Record<string, boolean>>({})
  const [results,  setResults]  = useState<Record<string, TestResult>>({})
  const [notifs, setNotifs] = useState<any[]>([])

  const loadStatuses = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/integrations')
      const data = await res.json()
      const map: Record<string, any> = {}
      for (const intg of (data.integrations || [])) map[intg.id] = intg
      setStatuses(map)
    } catch { /* noop */ }
  }, [])

  useEffect(() => { loadStatuses() }, [loadStatuses])

  async function runTest(id: string) {
    setTesting(prev => ({ ...prev, [id]: true }))
    try {
      const res = await fetch(`/api/test/${id}`)
      const data = await res.json()
      setResults(prev => ({ ...prev, [id]: data }))
    } catch (e: any) {
      setResults(prev => ({ ...prev, [id]: { connected: false, error: e.message } }))
    }
    setTesting(prev => ({ ...prev, [id]: false }))
  }

  async function runSync(id: string) {
    setSyncing(prev => ({ ...prev, [id]: true }))
    try {
      const res = await fetch(`/api/test/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      setResults(prev => ({ ...prev, [id]: data }))
      await loadStatuses()
    } catch (e: any) {
      setResults(prev => ({ ...prev, [id]: { connected: false, error: e.message } }))
    }
    setSyncing(prev => ({ ...prev, [id]: false }))
  }

  // Group by category
  const categories = [...new Set(INTEGRATIONS.map(i => i.category))]
  const totalConfigured = INTEGRATIONS.filter(i => statuses[i.id]?.configured || statuses[i.id]?.always_available).length

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif', color: C.text }}>
      <TopBar screen="Integrations" notifications={notifs} onMarkAllRead={() => setNotifs([])} onClickNotif={() => {}} onOpenCopilot={() => {}} onOpenCmdK={() => {}} />

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>Integrations</h1>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>
              Data sources connected to the pipeline · {totalConfigured}/{INTEGRATIONS.length} configured
            </div>
          </div>
          <a
            href="/settings"
            style={{ padding: '8px 16px', background: C.indigoBg, border: `1px solid ${C.indigoBorder}`, borderRadius: 8, color: C.indigo, fontSize: 12, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}
          >
            Manage Keys →
          </a>
        </div>

        {/* Progress bar */}
        <div style={{ background: C.border, borderRadius: 4, height: 6, marginBottom: 28, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: `linear-gradient(90deg, ${C.green}, ${C.indigo})`, borderRadius: 4, width: `${Math.round(totalConfigured / INTEGRATIONS.length * 100)}%`, transition: 'width 0.4s' }} />
        </div>

        {/* Integration groups */}
        {categories.map(cat => {
          const items = INTEGRATIONS.filter(i => i.category === cat)
          return (
            <div key={cat} style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.xmuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{cat}</span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {items.map(intg => (
                  <IntegCard
                    key={intg.id}
                    intg={intg}
                    status={statuses[intg.id]}
                    testing={testing[intg.id] || false}
                    syncing={syncing[intg.id] || false}
                    result={results[intg.id] || null}
                    onTest={() => runTest(intg.id)}
                    onSync={() => runSync(intg.id)}
                  />
                ))}
              </div>
            </div>
          )
        })}

        {/* Footer note */}
        <div style={{ padding: '16px 20px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, marginTop: 8 }}>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
            <strong style={{ color: C.text }}>Pipeline runs automatically</strong> — SAM.gov syncs every 4h, USASpending every 8h, HigherGov on-demand. Cron jobs run on the VPS at 6AM ET daily.
            Data is stored in Airtable and visible in Leads, Intelligence, and Activity.
          </div>
        </div>
      </div>
    </div>
  )
}
