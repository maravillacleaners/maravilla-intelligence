'use client'

import { useEffect, useState, useCallback } from 'react'
import TopBar from '@/components/crm/top-bar'

// ── Types & constants ──────────────────────────────────────────────────────────

type Section = 'government' | 'contact' | 'outreach' | 'google' | 'ai' | 'infrastructure' | 'pipeline' | 'system' | 'users'

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'government',     label: 'Government Data',      icon: '🏛️' },
  { id: 'contact',        label: 'Contact Intelligence',  icon: '🔍' },
  { id: 'outreach',       label: 'Outreach & CRM',        icon: '📤' },
  { id: 'google',         label: 'Google Workspace',      icon: '📧' },
  { id: 'ai',             label: 'AI / LLM',              icon: '✦' },
  { id: 'infrastructure', label: 'Infrastructure',         icon: '⚙️' },
  { id: 'pipeline',       label: 'Pipeline Status',        icon: '⚡' },
  { id: 'system',         label: 'System',                icon: '🔧' },
  { id: 'users',          label: 'Users',                 icon: '👥' },
]

interface KeyStatus { configured: boolean; masked: string }

// ── IntegrationPanel (replaces old StatusCard) ────────────────────────────────

function IntegrationPanel({
  integration, data, onTest, onSync, testResult, testing, syncing,
}: {
  integration: string
  data: any
  onTest: (name: string) => void
  onSync: (name: string) => void
  testResult?: any
  testing?: boolean
  syncing?: boolean
}) {
  const dot = data?.connected ? '🟢' : data?.configured ? '🟡' : '⚫'
  const ageStr = data?.last_sync_age_minutes != null
    ? data.last_sync_age_minutes < 60 ? `${data.last_sync_age_minutes}m ago` : `${Math.round(data.last_sync_age_minutes / 60)}h ago`
    : 'Never synced'
  const hasSync = ['sam', 'usaspending', 'highergov', 'gmail'].includes(integration)

  return (
    <div style={{ background: '#F5F5F4', border: '1px solid #E7E5E4', borderRadius: 8, padding: '10px 14px', marginTop: 10, fontSize: 12 }}>
      {/* Status row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ color: '#78716C' }}>
          Last sync: <span style={{ color: '#57534E' }}>{ageStr}</span>
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: data?.connected ? '#059669' : data?.configured ? '#D97706' : '#A8A29E', fontSize: 11 }}>
            {dot} {data?.connected ? 'Connected' : data?.configured ? 'Configured' : 'Not configured'}
          </span>
          <button
            onClick={() => onTest(integration)}
            disabled={testing}
            style={{ padding: '3px 10px', background: '#FFFFFF', border: '1px solid #E7E5E4', borderRadius: 4, color: testing ? '#A8A29E' : '#57534E', fontSize: 11, cursor: testing ? 'not-allowed' : 'pointer' }}
          >
            {testing ? 'Testing…' : 'Test'}
          </button>
          {hasSync && (
            <button
              onClick={() => onSync(integration)}
              disabled={syncing || !data?.configured}
              style={{ padding: '3px 10px', background: syncing ? '#F5F5F4' : '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 4, color: syncing || !data?.configured ? '#A8A29E' : '#4F46E5', fontSize: 11, cursor: syncing || !data?.configured ? 'not-allowed' : 'pointer' }}
            >
              {syncing ? 'Syncing…' : 'Sync Now'}
            </button>
          )}
        </div>
      </div>

      {/* Records row */}
      {data?.records_created != null && (
        <div style={{ color: '#78716C', marginBottom: 4 }}>
          {data.records_created} created · {data.records_updated || 0} updated · {data.errors || 0} errors
        </div>
      )}
      {data?.next_run && <div style={{ color: '#A8A29E', fontSize: 11 }}>{data.next_run}</div>}
      {!data?.last_sync_age_minutes && data?.error && (
        <div style={{ color: '#DC2626', fontSize: 11, marginTop: 2 }}>{data.error}</div>
      )}

      {/* Test results panel */}
      {testResult && (
        <div style={{ marginTop: 10, background: '#FFFFFF', border: '1px solid #E7E5E4', borderRadius: 6, padding: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#78716C', fontSize: 11 }}>Test result — {new Date(testResult.tested_at || Date.now()).toLocaleTimeString()}</span>
            <span style={{ color: testResult.connected ? '#059669' : '#DC2626', fontSize: 11, fontWeight: 600 }}>
              {testResult.connected ? '✓ OPERATIONAL' : '✗ FAILED'}
            </span>
          </div>
          {testResult.raw_http_status && (
            <div style={{ color: '#64748b', fontSize: 11 }}>
              HTTP {testResult.raw_http_status} · {testResult.response_ms}ms
            </div>
          )}
          {testResult.error && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{testResult.error}</div>}

          {/* SAM sample */}
          {testResult.sample_records?.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ color: '#475569', fontSize: 10, marginBottom: 3 }}>SAMPLE RECORDS ({testResult.total_opportunities_fl_561720} total FL janitorial)</div>
              {testResult.sample_records.map((r: any, i: number) => (
                <div key={i} style={{ color: '#64748b', fontSize: 10, padding: '2px 0' }}>
                  • {r.title} — {r.poc_email || 'no POC email'}
                </div>
              ))}
            </div>
          )}

          {/* USASpending primes */}
          {testResult.sample_prime_contractors?.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ color: '#475569', fontSize: 10, marginBottom: 3 }}>SAMPLE PRIME CONTRACTORS</div>
              {testResult.sample_prime_contractors.map((r: any, i: number) => (
                <div key={i} style={{ color: '#64748b', fontSize: 10 }}>
                  • {r.recipient} — ${(r.amount || 0).toLocaleString()}
                </div>
              ))}
            </div>
          )}

          {/* Gmail status */}
          {testResult.gmail_profile && (
            <div style={{ marginTop: 6 }}>
              {testResult.gmail_profile.email && (
                <div style={{ color: '#22c55e', fontSize: 11 }}>✓ Gmail: {testResult.gmail_profile.email} ({testResult.gmail_profile.messages_total?.toLocaleString()} messages)</div>
              )}
              {testResult.gmail_profile.error && (
                <div style={{ color: '#ef4444', fontSize: 11 }}>Gmail API error: {testResult.gmail_profile.error}</div>
              )}
            </div>
          )}
          {testResult.token_info && (
            <div style={{ color: '#64748b', fontSize: 10, marginTop: 4 }}>
              Scopes: {testResult.token_info.scopes?.join(', ') || 'none'} | Gmail scope: {testResult.token_info.has_gmail_scope ? '✓' : '✗'}
            </div>
          )}
          {testResult.token_expiry && (
            <div style={{ color: testResult.token_expiry.expired ? '#ef4444' : '#64748b', fontSize: 10, marginTop: 2 }}>
              Token expires: {testResult.token_expiry.minutes_remaining}min remaining
              {testResult.token_expiry.needs_refresh ? ' ⚠ Needs refresh' : ''}
            </div>
          )}
          {testResult.refresh_token && (
            <div style={{ color: testResult.refresh_token.available ? '#22c55e' : '#f59e0b', fontSize: 10, marginTop: 2 }}>
              Refresh token: {testResult.refresh_token.available ? '✓ Available' : '⚠ Not available'}
            </div>
          )}
          {testResult.token_persists_restart && (
            <div style={{ color: testResult.token_persists_restart.token_in_env_file ? '#22c55e' : '#f59e0b', fontSize: 10, marginTop: 2 }}>
              Survives restart: {testResult.token_persists_restart.token_in_env_file ? '✓ Token in .env file' : '⚠ Token not in .env file'}
            </div>
          )}
          {testResult.inbox_scan_24h && (
            <div style={{ color: '#64748b', fontSize: 10, marginTop: 4 }}>
              Gmail scan: {testResult.inbox_scan_24h.procurement_emails_found} procurement emails in last 24h
            </div>
          )}
          {testResult.setup_instructions?.length > 0 && (
            <div style={{ marginTop: 6 }}>
              {testResult.setup_instructions.map((s: string, i: number) => (
                <div key={i} style={{ color: '#64748b', fontSize: 10, padding: '1px 0' }}>{s}</div>
              ))}
            </div>
          )}

          {/* Sync result */}
          {testResult.sync_result && (
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #1e293b' }}>
              <div style={{ color: '#475569', fontSize: 10, marginBottom: 2 }}>SYNC RESULT</div>
              <div style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(testResult.sync_result, null, 1).slice(0, 600)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Backward-compat alias (in case any stale references remain)
const StatusCard = ({ integration, data }: { integration: string; data: any }) => (
  <IntegrationPanel integration={integration} data={data} onTest={() => {}} onSync={() => {}} />
)

// ── Components ─────────────────────────────────────────────────────────────────

function StatusDot({ ok }: { ok: boolean }) {
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: ok ? '#10B981' : '#D6D3D1', flexShrink: 0 }} />
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1C1917' }}>{title}</h2>
      <p style={{ color: '#78716C', fontSize: 13, margin: '6px 0 0', lineHeight: 1.5 }}>{description}</p>
    </div>
  )
}

function Card({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E7E5E4', borderRadius: 10, padding: 24, marginBottom: 16 }}>
      {title && <div style={{ fontSize: 11, fontWeight: 600, color: '#A8A29E', marginBottom: 16, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{title}</div>}
      {children}
    </div>
  )
}

function KeyField({
  label, envKey, status, onQueue, onRemove, description, placeholder, docsUrl,
}: {
  label: string; envKey: string; status?: KeyStatus; onQueue: (k: string, v: string) => void;
  onRemove?: (k: string) => void;
  description?: string; placeholder?: string; docsUrl?: string;
}) {
  const [val, setVal] = useState('')
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const configured = status?.configured ?? false

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <StatusDot ok={configured} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#1C1917' }}>{label}</span>
        <code style={{ fontSize: 10, color: '#78716C', background: '#F5F5F4', padding: '1px 5px', borderRadius: 3 }}>{envKey}</code>
        {docsUrl && <a href={docsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#4F46E5', marginLeft: 'auto' }}>Docs ↗</a>}
      </div>
      {description && <div style={{ fontSize: 11, color: '#78716C', marginBottom: 6, marginLeft: 16 }}>{description}</div>}

      {/* Configured state: show masked + Change/Remove */}
      {configured && !editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 16 }}>
          <span style={{ flex: 1, padding: '8px 11px', background: '#F5F5F4', border: '1px solid #E7E5E4', borderRadius: 6, fontSize: 12, fontFamily: 'monospace', color: '#78716C' }}>
            {status?.masked || '••••••••'} <span style={{ color: '#10B981', marginLeft: 6 }}>✓ configured</span>
          </span>
          <button onClick={() => { setEditing(true); setConfirming(false) }}
            style={{ padding: '8px 12px', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 6, color: '#4F46E5', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
            Change
          </button>
          {onRemove && !confirming && (
            <button onClick={() => setConfirming(true)}
              style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, color: '#DC2626', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
              Remove
            </button>
          )}
          {onRemove && confirming && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#DC2626' }}>Confirm?</span>
              <button onClick={() => { onRemove(envKey); setConfirming(false) }}
                style={{ padding: '6px 10px', background: '#DC2626', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, cursor: 'pointer' }}>Yes, remove</button>
              <button onClick={() => setConfirming(false)}
                style={{ padding: '6px 10px', background: '#F5F5F4', border: '1px solid #E7E5E4', borderRadius: 6, color: '#78716C', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
            </div>
          )}
        </div>
      ) : (
        /* Input state: new key or editing */
        <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
          <input
            type="password"
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder={placeholder || `Paste ${label}…`}
            autoFocus={editing}
            style={{ flex: 1, background: '#FAFAF9', border: '1px solid #E7E5E4', borderRadius: 6, color: '#1C1917', padding: '8px 11px', fontSize: 12, fontFamily: 'monospace' }}
          />
          <button
            onClick={() => { if (val.trim()) { onQueue(envKey, val.trim()); setVal(''); setEditing(false) } }}
            disabled={!val.trim()}
            style={{ padding: '8px 14px', background: val.trim() ? '#EEF2FF' : 'transparent', border: `1px solid ${val.trim() ? '#C7D2FE' : '#E7E5E4'}`, borderRadius: 6, color: val.trim() ? '#4F46E5' : '#A8A29E', fontSize: 12, cursor: val.trim() ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' as const }}
          >Queue</button>
          {editing && (
            <button onClick={() => { setEditing(false); setVal('') }}
              style={{ padding: '8px 10px', background: '#F5F5F4', border: '1px solid #E7E5E4', borderRadius: 6, color: '#78716C', fontSize: 12, cursor: 'pointer' }}>✕</button>
          )}
        </div>
      )}
    </div>
  )
}

function TextField({
  label, envKey, status, onQueue, description, placeholder,
}: {
  label: string; envKey: string; status?: KeyStatus; onQueue: (k: string, v: string) => void;
  description?: string; placeholder?: string;
}) {
  const [val, setVal] = useState('')
  const configured = status?.configured ?? false

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <StatusDot ok={configured} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#1C1917' }}>{label}</span>
        <code style={{ fontSize: 10, color: '#78716C', background: '#F5F5F4', padding: '1px 5px', borderRadius: 3 }}>{envKey}</code>
      </div>
      {description && <div style={{ fontSize: 11, color: '#78716C', marginBottom: 6, marginLeft: 16 }}>{description}</div>}
      <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
        <input
          type="text"
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder={configured ? (status?.masked || '(set)') : (placeholder || '')}
          style={{ flex: 1, background: '#FAFAF9', border: '1px solid #E7E5E4', borderRadius: 6, color: '#1C1917', padding: '8px 11px', fontSize: 12, fontFamily: 'monospace' }}
        />
        <button
          onClick={() => { if (val.trim()) { onQueue(envKey, val.trim()); setVal('') } }}
          disabled={!val.trim()}
          style={{ padding: '8px 14px', background: val.trim() ? '#EEF2FF' : 'transparent', border: `1px solid ${val.trim() ? '#C7D2FE' : '#E7E5E4'}`, borderRadius: 6, color: val.trim() ? '#4F46E5' : '#A8A29E', fontSize: 12, cursor: val.trim() ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
        >
          Queue
        </button>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

// ── Gmail Accounts Component ───────────────────────────────────────────────────

const PERM_LABELS = [
  { key: 'auto_sync',     label: 'Auto-sync',     desc: 'Include in background 30min scan' },
  { key: 'create_leads',  label: 'Create leads',  desc: 'Convert qualifying emails to leads' },
  { key: 'create_tasks',  label: 'Create tasks',  desc: 'Create tasks when deadlines detected' },
]

function AccountRow({ account, onUpdate, onDisconnect }: {
  account: any
  onUpdate: (id: string, patch: Record<string, any>) => Promise<void>
  onDisconnect: (id: string, email: string) => Promise<void>
}) {
  const [confirming, setConfirming] = useState(false)
  const [updating, setUpdating] = useState(false)
  const isPrimary = account.role === 'primary'

  async function toggle(key: string, val: boolean) {
    setUpdating(true)
    await onUpdate(account.id, { [key]: val })
    setUpdating(false)
  }

  async function setRole(role: string) {
    setUpdating(true)
    await onUpdate(account.id, { role })
    setUpdating(false)
  }

  return (
    <div style={{ border: `1px solid ${isPrimary ? '#C7D2FE' : '#E7E5E4'}`, borderRadius: 10, padding: '14px 16px', marginBottom: 10, background: isPrimary ? '#FAFBFF' : '#FFFFFF' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: isPrimary ? '#EEF2FF' : '#F5F5F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            {isPrimary ? '⭐' : '📧'}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1917' }}>{account.email}</div>
            <div style={{ fontSize: 11, color: '#78716C', marginTop: 2 }}>
              {account.active !== false ? '● active' : '○ paused'}
              {account.last_sync ? ` · last sync ${new Date(account.last_sync).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ' · never synced'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {!isPrimary && (
            <button onClick={() => setRole('primary')} disabled={updating}
              style={{ padding: '4px 10px', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 6, color: '#4F46E5', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
              Set as primary
            </button>
          )}
          {isPrimary && (
            <span style={{ padding: '4px 10px', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 6, color: '#4F46E5', fontSize: 11, fontWeight: 700 }}>Primary</span>
          )}
          {!confirming ? (
            <button onClick={() => setConfirming(true)}
              style={{ padding: '4px 10px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, color: '#DC2626', fontSize: 11, cursor: 'pointer' }}>
              Disconnect
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#DC2626' }}>Sure?</span>
              <button onClick={() => { onDisconnect(account.id, account.email); setConfirming(false) }}
                style={{ padding: '3px 8px', background: '#DC2626', border: 'none', borderRadius: 5, color: '#fff', fontSize: 11, cursor: 'pointer' }}>Yes</button>
              <button onClick={() => setConfirming(false)}
                style={{ padding: '3px 8px', background: '#F5F5F4', border: '1px solid #E7E5E4', borderRadius: 5, color: '#78716C', fontSize: 11, cursor: 'pointer' }}>No</button>
            </div>
          )}
        </div>
      </div>

      {/* Permissions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
        {PERM_LABELS.map(p => {
          const enabled = account[p.key] !== false
          return (
            <button key={p.key} onClick={() => toggle(p.key, !enabled)} disabled={updating} title={p.desc}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                borderRadius: 99, fontSize: 12, cursor: updating ? 'not-allowed' : 'pointer', fontWeight: 500,
                background: enabled ? '#ECFDF5' : '#F5F5F4',
                color: enabled ? '#059669' : '#A8A29E',
                border: `1px solid ${enabled ? '#A7F3D0' : '#E7E5E4'}`,
                opacity: updating ? 0.6 : 1,
              }}>
              <span>{enabled ? '✓' : '○'}</span>
              {p.label}
            </button>
          )
        })}
        <button onClick={() => toggle('active', account.active === false)} disabled={updating}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
            borderRadius: 99, fontSize: 12, cursor: updating ? 'not-allowed' : 'pointer', fontWeight: 500,
            background: account.active !== false ? '#EFF6FF' : '#FEF2F2',
            color: account.active !== false ? '#2563EB' : '#DC2626',
            border: `1px solid ${account.active !== false ? '#BFDBFE' : '#FECACA'}`,
            opacity: updating ? 0.6 : 1,
          }}>
          {account.active !== false ? '▶ Active' : '⏸ Paused'}
        </button>
      </div>
    </div>
  )
}

function GmailAccountsCard({ hasCredentials, hasPrimaryToken, onShowToast, onRefreshKeys, integStatus, onTest, onSync, testResult, testing, syncing }: {
  hasCredentials: boolean
  hasPrimaryToken: boolean
  onShowToast: (msg: string, ok?: boolean) => void
  onRefreshKeys: () => void
  integStatus: any
  onTest: (name: string) => void
  onSync: (name: string) => void
  testResult?: any
  testing?: boolean
  syncing?: boolean
}) {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  const fetchAccounts = useCallback(async () => {
    setLoadingAccounts(true)
    try {
      const res = await fetch('/api/gmail/accounts')
      const data = await res.json()
      setAccounts(data.accounts || [])
    } catch { /* noop */ }
    setLoadingAccounts(false)
  }, [])

  useEffect(() => { if (hasPrimaryToken) fetchAccounts() }, [hasPrimaryToken, fetchAccounts])

  async function handleUpdate(id: string, patch: Record<string, any>) {
    await fetch(`/api/gmail/accounts/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    await fetchAccounts()
    if (patch.role === 'primary') onShowToast('Primary account updated — restart app to apply', true)
  }

  async function handleDisconnect(id: string, email: string) {
    await fetch(`/api/gmail/accounts/${id}`, { method: 'DELETE' })
    await fetchAccounts()
    onRefreshKeys()
    onShowToast(`${email} disconnected`, true)
  }

  return (
    <Card title="Step 2 — Gmail Accounts">
      <div style={{ fontSize: 13, color: '#78716C', marginBottom: 16, lineHeight: 1.7 }}>
        Connect one or more Gmail accounts. Set permissions per account — which ones create leads, tasks, and run on auto-sync.
      </div>

      {/* Account list */}
      {loadingAccounts ? (
        <div style={{ fontSize: 12, color: '#A8A29E', padding: '8px 0' }}>Loading accounts…</div>
      ) : accounts.length > 0 ? (
        <div style={{ marginBottom: 14 }}>
          {accounts.map(acc => (
            <AccountRow key={acc.id} account={acc} onUpdate={handleUpdate} onDisconnect={handleDisconnect} />
          ))}
        </div>
      ) : !hasPrimaryToken ? (
        <div style={{ marginBottom: 14, padding: '12px 16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, fontSize: 12, color: '#D97706' }}>
          No Gmail accounts connected yet.
        </div>
      ) : null}

      {/* Connect button */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' as const }}>
        <button
          onClick={() => { window.location.href = '/api/auth/google/oauth' }}
          disabled={!hasCredentials}
          style={{
            padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: hasCredentials ? 'pointer' : 'not-allowed',
            background: hasCredentials ? '#4285F4' : '#F5F5F4',
            color: hasCredentials ? '#fff' : '#A8A29E',
            border: 'none',
          }}>
          {accounts.length > 0 ? '+ Add Gmail Account' : 'Connect Gmail →'}
        </button>
        {accounts.length > 0 && (
          <span style={{ fontSize: 12, color: '#78716C' }}>
            {accounts.length} account{accounts.length > 1 ? 's' : ''} connected · scanning {accounts.filter(a => a.auto_sync !== false && a.active !== false).length} on auto-sync
          </span>
        )}
      </div>

      <IntegrationPanel integration="gmail" data={integStatus?.integrations?.gmail} onTest={onTest} onSync={onSync} testResult={testResult} testing={testing} syncing={syncing} />
    </Card>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [section, setSection]       = useState<Section>('government')
  const [keyStatus, setKeyStatus]   = useState<Record<string, KeyStatus>>({})
  const [samDaysLeft, setSamDaysLeft] = useState<number | null>(null)
  const [samExpiry, setSamExpiry]   = useState<string | null>(null)
  const [queued, setQueued]         = useState<Record<string, string>>({})
  const [saving, setSaving]         = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null)
  const [users, setUsers]           = useState<any[]>([])
  const [newUser, setNewUser]       = useState({ name: '', email: '', role: 'member' })
  const [creatingUser, setCreatingUser] = useState(false)
  const [integStatus, setIntegStatus]     = useState<any>({})
  const [testResults, setTestResults]     = useState<Record<string, any>>({})
  const [testing, setTesting]             = useState<Record<string, boolean>>({})
  const [syncing, setSyncing]             = useState<Record<string, boolean>>({})
  const [pipelineStatus, setPipelineStatus] = useState<any>(null)
  const [runningPipeline, setRunningPipeline] = useState(false)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 5000)
  }

  const loadKeyStatus = useCallback(async () => {
    try {
      const res  = await fetch('/api/settings/keys')
      const data = await res.json()
      setKeyStatus(data.status || {})
      setSamDaysLeft(data.sam_days_left)
      setSamExpiry(data.sam_expiry)
    } catch {}
  }, [])

  const loadUsers = useCallback(async () => {
    try {
      const res  = await fetch('/api/settings/users')
      const data = await res.json()
      setUsers(data.users || [])
    } catch {}
  }, [])

  const loadIntegStatus = useCallback(async () => {
    try {
      const res  = await fetch('/api/settings/status')
      const data = await res.json()
      setIntegStatus(data)
    } catch {}
  }, [])

  const loadPipelineStatus = useCallback(async () => {
    try {
      const res  = await fetch('/api/pipeline/status')
      const data = await res.json()
      setPipelineStatus(data)
    } catch {}
  }, [])

  useEffect(() => { loadKeyStatus(); loadUsers(); loadIntegStatus(); loadPipelineStatus() }, [loadKeyStatus, loadUsers, loadIntegStatus, loadPipelineStatus])

  function queueKey(k: string, v: string) {
    setQueued(prev => ({ ...prev, [k]: v }))
    showToast(`${k} queued — click "Save to .env" when ready`)
  }

  async function removeKey(envKey: string) {
    try {
      await fetch('/api/settings/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear: [envKey] }),
      })
      showToast(`${envKey} removed — restart app to apply`, true)
      await loadKeyStatus()
    } catch (e: any) {
      showToast(`Remove failed: ${e.message}`, false)
    }
  }

  async function saveQueued() {
    if (Object.keys(queued).length === 0) return
    setSaving(true)
    try {
      const res  = await fetch('/api/settings/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: queued }),
      })
      const data = await res.json()
      if (data.ok) {
        showToast(`${data.count} key(s) saved to .env. Restart the app to activate.`)
        setQueued({})
        await loadKeyStatus()
      } else {
        showToast(data.error || 'Save failed', false)
      }
    } catch (e: any) {
      showToast(`Error: ${e.message}`, false)
    } finally {
      setSaving(false)
    }
  }

  async function restartApp() {
    if (!confirm('Restart the app? It will be offline for ~15 seconds.')) return
    setRestarting(true)
    try {
      const res  = await fetch('/api/settings/restart', { method: 'POST' })
      const data = await res.json()
      showToast(data.message || 'Restarting…')
      setTimeout(() => { window.location.reload() }, 18000)
    } catch {
      showToast('Restart triggered — refresh in 15s', true)
      setTimeout(() => { window.location.reload() }, 18000)
    }
  }

  async function createSamRenewalTask() {
    try {
      const dueDate = samExpiry || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Task:       'Renew SAM.gov API Key — expires soon',
          Notes:      `Go to sam.gov → Sign In → Profile → API Keys → Remove old key → Generate New Key. Then go to Settings → Government Data → SAM.gov and enter the new key. Key expires: ${samExpiry || 'unknown'}`,
          Status:     'Open',
          Priority:   'High',
          Owner:      'Admin',
          Due_Date:   dueDate,
          Created_At: new Date().toISOString(),
        }),
      })
      showToast('SAM renewal task created in Tasks')
    } catch {
      showToast('Renewal reminder: sam.gov → Profile → API Keys → Generate New')
    }
  }

  async function runPipelineNow() {
    setRunningPipeline(true)
    showToast('Pipeline started — runs for ~6 minutes…')
    try {
      const res  = await fetch('/api/daily-run', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      showToast(data.success ? `Pipeline done in ${Math.round((data.duration_ms || 0) / 1000)}s` : 'Pipeline error — check logs', data.success)
      await loadPipelineStatus()
    } catch (e: any) {
      showToast(`Pipeline error: ${e.message}`, false)
    } finally {
      setRunningPipeline(false)
    }
  }

  async function runIntegrationTest(name: string) {
    setTesting(prev => ({ ...prev, [name]: true }))
    try {
      const res = await fetch(`/api/test/${name}`)
      const data = await res.json()
      setTestResults(prev => ({ ...prev, [name]: data }))
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, [name]: { error: e.message, connected: false, tested_at: new Date().toISOString() } }))
    } finally {
      setTesting(prev => ({ ...prev, [name]: false }))
    }
  }

  async function runIntegrationSync(name: string) {
    setSyncing(prev => ({ ...prev, [name]: true }))
    try {
      const res = await fetch(`/api/test/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      setTestResults(prev => ({ ...prev, [name]: data }))
      await loadIntegStatus()
      showToast(`${name} sync complete`)
    } catch (e: any) {
      showToast(`Sync error: ${e.message}`, false)
    } finally {
      setSyncing(prev => ({ ...prev, [name]: false }))
    }
  }

  const k = (envKey: string) => keyStatus[envKey]
  const queuedCount = Object.keys(queued).length

  return (
    <div style={{ background: '#FAFAF9', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1C1917', display: 'flex', flexDirection: 'column' }}>
      <TopBar screen="Settings" notifications={[]} onMarkAllRead={() => {}} onClickNotif={() => {}} onOpenCopilot={() => {}} onOpenCmdK={() => {}} />

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 999, background: toast.ok ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${toast.ok ? '#A7F3D0' : '#FECACA'}`, color: toast.ok ? '#065F46' : '#991B1B', padding: '10px 18px', borderRadius: 8, fontSize: 13, maxWidth: 400 }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ borderBottom: '1px solid #E7E5E4', padding: '14px 32px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/leads" style={{ color: '#78716C', fontSize: 13, textDecoration: 'none' }}>← Leads</a>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1C1917' }}>Settings</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {queuedCount > 0 && (
            <div style={{ fontSize: 12, color: '#F59E0B', background: '#78350F22', border: '1px solid #78350F', borderRadius: 6, padding: '5px 12px' }}>
              {queuedCount} key(s) queued
            </div>
          )}
          <button
            onClick={saveQueued}
            disabled={saving || queuedCount === 0}
            style={{ padding: '7px 16px', background: queuedCount > 0 ? '#4F46E5' : '#E7E5E4', border: 'none', borderRadius: 7, color: '#fff', fontSize: 13, fontWeight: 600, cursor: queuedCount > 0 ? 'pointer' : 'not-allowed' }}
          >
            {saving ? 'Saving…' : `Save to .env (${queuedCount})`}
          </button>
          <button
            onClick={restartApp}
            disabled={restarting}
            style={{ padding: '7px 14px', background: 'transparent', border: '1px solid #E7E5E4', borderRadius: 7, color: '#78716C', fontSize: 13, cursor: 'pointer' }}
          >
            {restarting ? 'Restarting…' : '⟳ Restart App'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <div style={{ width: 200, borderRight: '1px solid #E7E5E4', background: '#FFFFFF', padding: '20px 0', flexShrink: 0 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setSection(n.id)} style={{
              display: 'flex', alignItems: 'center', gap: 9, width: '100%',
              padding: '9px 18px', background: section === n.id ? '#F5F5F4' : 'none',
              border: 'none', borderLeft: `3px solid ${section === n.id ? '#4F46E5' : 'transparent'}`,
              color: section === n.id ? '#1C1917' : '#78716C', cursor: 'pointer', fontSize: 13, textAlign: 'left' as const,
            }}>
              <span>{n.icon}</span> {n.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '32px 48px', maxWidth: 780, overflowY: 'auto' }}>

          {/* ── Government Data ── */}
          {section === 'government' && (
            <div>
              <SectionHeader title="Government Data" description="APIs for federal and state contract intelligence. Keys are written to the .env file on the server." />

              {samDaysLeft !== null && samDaysLeft <= 20 && (
                <div style={{ background: '#78350F22', border: '1px solid #F59E0B', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#FCD34D' }}>⚠️ SAM.gov key expires in {samDaysLeft} days ({samExpiry})</div>
                    <div style={{ fontSize: 12, color: '#92400E', marginTop: 4 }}>sam.gov → Sign In → Profile → API Keys → Remove → Generate New → paste below</div>
                  </div>
                  <button onClick={createSamRenewalTask} style={{ padding: '7px 14px', background: '#F59E0B22', border: '1px solid #F59E0B44', borderRadius: 6, color: '#FCD34D', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Create Reminder Task
                  </button>
                </div>
              )}

              <Card title="SAM.gov">
                <KeyField label="SAM.gov API Key" envKey="SAM_GOV_API_KEY" status={k('SAM_GOV_API_KEY')} onQueue={queueKey}
                  description="Free — sam.gov → Sign In → Profile → API Keys. Expires every 90 days."
                  docsUrl="https://sam.gov" />
                <IntegrationPanel integration="sam" data={integStatus.integrations?.sam} onTest={runIntegrationTest} onSync={runIntegrationSync} testResult={testResults['sam']} testing={testing['sam']} syncing={syncing['sam']} />
              </Card>

              <Card title="HigherGov">
                <KeyField label="HigherGov API Key" envKey="HIGHERGOV_API_KEY" status={k('HIGHERGOV_API_KEY')} onQueue={queueKey}
                  description="Premium federal contract intelligence — persons, agencies, awardees, recompetes."
                  docsUrl="https://www.highergov.com" />
                <IntegrationPanel integration="highergov" data={integStatus.integrations?.highergov} onTest={runIntegrationTest} onSync={runIntegrationSync} testResult={testResults['highergov']} testing={testing['highergov']} syncing={syncing['highergov']} />
              </Card>

              <Card title="USASpending.gov">
                <div style={{ fontSize: 12, color: '#4B5563', marginBottom: 8 }}>Public API — no key required. Tracks federal award spending.</div>
                <IntegrationPanel integration="usaspending" data={integStatus.integrations?.usaspending} onTest={runIntegrationTest} onSync={runIntegrationSync} testResult={testResults['usaspending']} testing={testing['usaspending']} syncing={syncing['usaspending']} />
              </Card>

              <Card title="Florida Sunbiz">
                <div style={{ fontSize: 12, color: '#4B5563', marginBottom: 8 }}>Public records — no key required. Tracks registered Florida businesses.</div>
                <IntegrationPanel integration="sunbiz" data={integStatus.integrations?.sunbiz} onTest={runIntegrationTest} onSync={runIntegrationSync} testResult={testResults['sunbiz']} testing={testing['sunbiz']} syncing={syncing['sunbiz']} />
              </Card>
            </div>
          )}

          {/* ── Contact Intelligence ── */}
          {section === 'contact' && (
            <div>
              <SectionHeader title="Contact Intelligence" description="APIs for finding decision-maker emails, phones, and LinkedIn profiles." />

              <Card title="Hunter.io — Domain Search + Email Finder">
                <KeyField label="Hunter.io API Key" envKey="HUNTER_API_KEY" status={k('HUNTER_API_KEY')} onQueue={queueKey}
                  description="Find email addresses by company domain. Free: 25 searches/month."
                  docsUrl="https://hunter.io/api" />
                <IntegrationPanel integration="hunter" data={integStatus.integrations?.hunter} onTest={runIntegrationTest} onSync={runIntegrationSync} testResult={testResults['hunter']} testing={testing['hunter']} syncing={syncing['hunter']} />
              </Card>

              <Card title="Apollo.io — B2B Contact Database (200M+ profiles)">
                <KeyField label="Apollo.io API Key" envKey="APOLLO_API_KEY" status={k('APOLLO_API_KEY')} onQueue={queueKey}
                  description="Settings → Integrations → API. Best for management companies + commercial leads."
                  docsUrl="https://apolloio.github.io/apollo-api-docs/" />
                <IntegrationPanel integration="apollo" data={integStatus.integrations?.apollo} onTest={runIntegrationTest} onSync={runIntegrationSync} testResult={testResults['apollo']} testing={testing['apollo']} syncing={syncing['apollo']} />
              </Card>

              <Card title="Apify — LinkedIn Scraping">
                <KeyField label="Apify API Token" envKey="APIFY_API_KEY" status={k('APIFY_API_KEY')} onQueue={queueKey}
                  description="LinkedIn profiles, company pages, decision-maker research."
                  docsUrl="https://console.apify.com/account/integrations" />
              </Card>
            </div>
          )}

          {/* ── Outreach & CRM ── */}
          {section === 'outreach' && (
            <div>
              <SectionHeader title="Outreach & CRM" description="Keys for email campaigns, SMS, and CRM sync." />

              <Card title="GoHighLevel (GHL) — CRM + Sequences">
                <KeyField label="GHL API Key" envKey="GHL_API_KEY" status={k('GHL_API_KEY')} onQueue={queueKey}
                  description="Agency → Settings → Integrations → API Key." />
                <TextField label="GHL Location ID" envKey="GHL_LOCATION_ID" status={k('GHL_LOCATION_ID')} onQueue={queueKey}
                  description="Sub-account location ID from GHL settings." placeholder="location-id-here" />
              </Card>

              <Card title="Smartlead — Cold Email at Scale">
                <KeyField label="Smartlead API Key" envKey="SMARTLEAD_API_KEY" status={k('SMARTLEAD_API_KEY')} onQueue={queueKey}
                  description="Settings → API → Generate API key."
                  docsUrl="https://help.smartlead.ai" />
              </Card>

              <Card title="Instantly — Email Warm-up + Outreach">
                <KeyField label="Instantly API Key" envKey="INSTANTLY_API_KEY" status={k('INSTANTLY_API_KEY')} onQueue={queueKey}
                  description="Settings → Developers → API Keys."
                  docsUrl="https://app.instantly.ai" />
              </Card>

              <Card title="Twilio — SMS Notifications">
                <TextField label="Account SID" envKey="TWILIO_ACCOUNT_SID" status={k('TWILIO_ACCOUNT_SID')} onQueue={queueKey}
                  description="Twilio console → Account Info" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                <KeyField label="Auth Token" envKey="TWILIO_AUTH_TOKEN" status={k('TWILIO_AUTH_TOKEN')} onQueue={queueKey}
                  description="Twilio console → Account Info → Auth Token"
                  docsUrl="https://console.twilio.com" />
              </Card>

              <Card title="Meta / WhatsApp — Lead Forms + DM">
                <KeyField label="Meta Access Token" envKey="META_ACCESS_TOKEN" status={k('META_ACCESS_TOKEN')} onQueue={queueKey}
                  description="Meta Business Suite → Settings → Business Integrations → WhatsApp"
                  docsUrl="https://developers.facebook.com" />
              </Card>

              <Card title="Notifications">
                <TextField label="Slack Webhook URL" envKey="SLACK_WEBHOOK_URL" status={k('SLACK_WEBHOOK_URL')} onQueue={queueKey}
                  description="api.slack.com → Create App → Incoming Webhooks" placeholder="https://hooks.slack.com/services/…" />
              </Card>
            </div>
          )}

          {/* ── Google Workspace ── */}
          {section === 'google' && (
            <div>
              <SectionHeader title="Google Workspace" description="Connect Gmail accounts to scan procurement emails: RFPs, bids, solicitations. Primary + multiple secondary accounts supported." />

              {/* Step-by-step setup */}
              <Card title="Step 1 — Create OAuth credentials (5 min, no admin needed)">
                <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 8, padding: '14px 16px', marginBottom: 16, fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: '#4F46E5', marginBottom: 10 }}>Go to console.cloud.google.com with any Google account:</div>
                  <ol style={{ margin: 0, paddingLeft: 18, color: '#78716C', lineHeight: 2.2 }}>
                    <li>Create a new project (or use existing)</li>
                    <li><strong>APIs & Services → Library</strong> → search "Gmail API" → Enable</li>
                    <li><strong>APIs & Services → Credentials → + Create Credentials → OAuth 2.0 Client ID</strong></li>
                    <li>Application type: <strong>Web application</strong></li>
                    <li>Authorized redirect URIs → Add: <code style={{ background: '#F5F5F4', padding: '2px 6px', borderRadius: 3, fontSize: 11 }}>https://suppliers.maravillacleaners.com/api/auth/google/callback</code></li>
                    <li>Click Create → copy Client ID and Client Secret below</li>
                  </ol>
                </div>
                <TextField label="Google Client ID" envKey="GOOGLE_CLIENT_ID" status={k('GOOGLE_CLIENT_ID')} onQueue={queueKey} placeholder="123456789-xxxx.apps.googleusercontent.com" />
                <KeyField label="Google Client Secret" envKey="GOOGLE_CLIENT_SECRET" status={k('GOOGLE_CLIENT_SECRET')} onQueue={queueKey} onRemove={removeKey} />
                {(k('GOOGLE_CLIENT_ID')?.configured && k('GOOGLE_CLIENT_SECRET')?.configured) ? (
                  <div style={{ marginTop: 10, padding: '10px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, fontSize: 12, color: '#059669', fontWeight: 600 }}>
                    ✓ OAuth credentials configured — proceed to Step 2
                  </div>
                ) : (
                  <div style={{ marginTop: 10, padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, fontSize: 12, color: '#D97706' }}>
                    Paste both credentials above, click "Queue", then "Save to .env" in the header, then restart the app.
                  </div>
                )}
              </Card>

              <GmailAccountsCard
                hasCredentials={!!(k('GOOGLE_CLIENT_ID')?.configured && k('GOOGLE_CLIENT_SECRET')?.configured)}
                hasPrimaryToken={!!k('GOOGLE_GMAIL_TOKEN')?.configured}
                onShowToast={showToast}
                onRefreshKeys={loadKeyStatus}
                integStatus={integStatus}
                onTest={runIntegrationTest}
                onSync={runIntegrationSync}
                testResult={testResults['gmail']}
                testing={testing['gmail']}
                syncing={syncing['gmail']}
              />

              <Card title="Google Maps — Geocoding + Place Search">
                <KeyField label="Google Maps API Key" envKey="GOOGLE_MAPS_API_KEY" status={k('GOOGLE_MAPS_API_KEY')} onQueue={queueKey} onRemove={removeKey}
                  description="console.cloud.google.com → APIs → Maps JavaScript API → Credentials"
                  docsUrl="https://console.cloud.google.com" />
              </Card>
            </div>
          )}

          {/* ── AI / LLM ── */}
          {section === 'ai' && (
            <div>
              <SectionHeader title="AI / LLM" description="Keys for Claude (document analysis, email drafting) and OpenAI (embeddings, transcription)." />

              <Card title="Anthropic — Claude">
                <KeyField label="Anthropic API Key" envKey="ANTHROPIC_API_KEY" status={k('ANTHROPIC_API_KEY')} onQueue={queueKey}
                  description="console.anthropic.com → API Keys. Powers lead scoring explanations + outreach drafts."
                  docsUrl="https://console.anthropic.com" />
              </Card>

              <Card title="OpenAI — Embeddings + Transcription">
                <KeyField label="OpenAI API Key" envKey="OPENAI_API_KEY" status={k('OPENAI_API_KEY')} onQueue={queueKey}
                  description="platform.openai.com → API keys."
                  docsUrl="https://platform.openai.com/api-keys" />
              </Card>
            </div>
          )}

          {/* ── Infrastructure ── */}
          {section === 'infrastructure' && (
            <div>
              <SectionHeader title="Infrastructure" description="Database, automation, and server connections." />

              <Card title="n8n — Workflow Automation (74 active workflows)">
                <KeyField label="n8n API Key" envKey="N8N_API_KEY" status={k('N8N_API_KEY')} onQueue={queueKey}
                  description="n8n instance → Settings → API → API Keys"
                  docsUrl="https://n8n.srv1112587.hstgr.cloud" />
                <TextField label="n8n Webhook URL" envKey="N8N_WEBHOOK_URL" status={k('N8N_WEBHOOK_URL')} onQueue={queueKey} placeholder="https://n8n.srv1112587.hstgr.cloud/webhook/..." />
              </Card>

              <Card title="Supabase — PostgreSQL for payroll + analytics">
                <TextField label="Supabase URL" envKey="SUPABASE_URL" status={k('SUPABASE_URL')} onQueue={queueKey} placeholder="https://xxxxx.supabase.co" />
                <KeyField label="Supabase Service Key" envKey="SUPABASE_SERVICE_KEY" status={k('SUPABASE_SERVICE_KEY')} onQueue={queueKey}
                  description="Project Settings → API → service_role key"
                  docsUrl="https://supabase.com/dashboard" />
              </Card>
            </div>
          )}

          {/* ── Pipeline Status ── */}
          {section === 'pipeline' && (
            <div>
              <SectionHeader title="Pipeline Status" description="Daily ingestion pipeline: SAM.gov + USASpending → Leads → Events → Tasks. Runs automatically at 6AM ET via VPS cron." />

              {/* Run Now */}
              <Card title="Manual Trigger">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>
                      Trigger the full pipeline now — same as the 6AM cron job.<br />
                      No AI tokens used. Sources: SAM.gov, USASpending.gov, Lead Sweep.
                    </div>
                  </div>
                  <button
                    onClick={runPipelineNow}
                    disabled={runningPipeline}
                    style={{ padding: '10px 20px', background: runningPipeline ? '#1F2937' : '#3B82F622', border: `1px solid ${runningPipeline ? '#374151' : '#3B82F644'}`, borderRadius: 7, color: runningPipeline ? '#4B5563' : '#3B82F6', fontSize: 13, fontWeight: 600, cursor: runningPipeline ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {runningPipeline ? 'Running…' : '▶ Run Pipeline Now'}
                  </button>
                </div>
              </Card>

              {/* Schedule */}
              <Card title="Cron Schedule">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: '#111827', borderRadius: 8, padding: '12px 16px' }}>
                    <div style={{ fontSize: 10, color: '#4B5563', marginBottom: 4 }}>DAILY PIPELINE</div>
                    <div style={{ fontSize: 13, color: '#E5E7EB', fontWeight: 600 }}>6:00 AM ET every day</div>
                    <code style={{ fontSize: 10, color: '#4B5563' }}>0 6 * * * /root/run_daily_pipeline.sh</code>
                    <div style={{ fontSize: 11, color: '#4B5563', marginTop: 4 }}>SAM sync + USASpending + enrichment + sweep</div>
                  </div>
                  <div style={{ background: '#111827', borderRadius: 8, padding: '12px 16px' }}>
                    <div style={{ fontSize: 10, color: '#4B5563', marginBottom: 4 }}>HEALTH CHECK</div>
                    <div style={{ fontSize: 13, color: '#E5E7EB', fontWeight: 600 }}>Every hour</div>
                    <code style={{ fontSize: 10, color: '#4B5563' }}>0 * * * * /root/scripts/today_health.sh</code>
                    <div style={{ fontSize: 11, color: '#4B5563', marginTop: 4 }}>Snapshots /api/today → today_health.log</div>
                  </div>
                </div>
              </Card>

              {/* Last run details */}
              {pipelineStatus && (
                <>
                  <Card title="Last Run">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                      <div style={{ background: '#111827', borderRadius: 8, padding: '10px 14px' }}>
                        <div style={{ fontSize: 10, color: '#4B5563', marginBottom: 4 }}>STATUS</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: pipelineStatus.last_success ? '#10B981' : '#EF4444' }}>
                          {pipelineStatus.last_success ? '✓ Success' : '✗ Failed'} (exit {pipelineStatus.exit_code})
                        </div>
                      </div>
                      <div style={{ background: '#111827', borderRadius: 8, padding: '10px 14px' }}>
                        <div style={{ fontSize: 10, color: '#4B5563', marginBottom: 4 }}>LAST RUN</div>
                        <div style={{ fontSize: 12, color: '#E5E7EB' }}>
                          {pipelineStatus.last_run_minutes_ago != null
                            ? pipelineStatus.last_run_minutes_ago < 60
                              ? `${pipelineStatus.last_run_minutes_ago}m ago`
                              : `${Math.round(pipelineStatus.last_run_minutes_ago / 60)}h ago`
                            : 'Never'}
                        </div>
                        <div style={{ fontSize: 10, color: '#4B5563' }}>{pipelineStatus.last_run?.replace('EDT','').replace('EST','')}</div>
                      </div>
                      <div style={{ background: '#111827', borderRadius: 8, padding: '10px 14px' }}>
                        <div style={{ fontSize: 10, color: '#4B5563', marginBottom: 4 }}>NEXT RUN</div>
                        <div style={{ fontSize: 12, color: '#E5E7EB' }}>
                          {pipelineStatus.minutes_until_next_run != null
                            ? pipelineStatus.minutes_until_next_run < 60
                              ? `in ${pipelineStatus.minutes_until_next_run}m`
                              : `in ${Math.round(pipelineStatus.minutes_until_next_run / 60)}h`
                            : '6AM ET tomorrow'}
                        </div>
                        <div style={{ fontSize: 10, color: '#4B5563' }}>{pipelineStatus.next_run}</div>
                      </div>
                    </div>

                    {pipelineStatus.duration_ms && (
                      <div style={{ fontSize: 11, color: '#4B5563', marginBottom: 12 }}>
                        Duration: {Math.round(pipelineStatus.duration_ms / 1000)}s · Trigger: {pipelineStatus.trigger}
                      </div>
                    )}

                    {/* Steps breakdown */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      {Object.entries(pipelineStatus.steps || {}).map(([step, data]: [string, any]) => (
                        <div key={step} style={{ background: '#0D1117', border: '1px solid #1F2937', borderRadius: 6, padding: '8px 12px' }}>
                          <div style={{ fontSize: 10, color: '#4B5563', marginBottom: 4, textTransform: 'uppercase' }}>{step}</div>
                          {Object.entries(data).map(([k, v]: [string, any]) => (
                            <div key={k} style={{ fontSize: 11, color: (v as number) > 0 ? '#10B981' : '#374151' }}>
                              {k}: <span style={{ fontWeight: 600 }}>{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    {pipelineStatus.last_error && (
                      <div style={{ marginTop: 12, padding: '8px 12px', background: '#7F1D1D22', border: '1px solid #7F1D1D', borderRadius: 6 }}>
                        <div style={{ fontSize: 10, color: '#EF4444', marginBottom: 4 }}>LAST ERROR</div>
                        <div style={{ fontSize: 11, color: '#FCA5A5', fontFamily: 'monospace' }}>{pipelineStatus.last_error}</div>
                      </div>
                    )}
                  </Card>

                  {/* Health check snapshot */}
                  {pipelineStatus.health_check && (
                    <Card title="Latest Health Snapshot">
                      <div style={{ fontSize: 11, color: '#4B5563', marginBottom: 10 }}>
                        From {pipelineStatus.health_check.timestamp?.replace('EDT','').replace('EST','')} · checks every hour
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                        {Object.entries(pipelineStatus.health_check.summary || {}).map(([k, v]: [string, any]) => (
                          <div key={k} style={{ background: '#111827', borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: (v as number) > 0 ? '#10B981' : '#374151' }}>{String(v)}</div>
                            <div style={{ fontSize: 9, color: '#4B5563', marginTop: 2 }}>{k.replace(/_/g,' ')}</div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </>
              )}

              {!pipelineStatus && (
                <Card>
                  <div style={{ color: '#4B5563', fontSize: 13 }}>No pipeline run recorded yet. Click "Run Pipeline Now" to trigger the first run.</div>
                </Card>
              )}

              {/* Logs */}
              <Card title="Log Files">
                <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 2 }}>
                  <div><code style={{ color: '#4B5563' }}>/root/logs/daily_pipeline.log</code> — full output of each run</div>
                  <div><code style={{ color: '#4B5563' }}>/root/logs/today_health.log</code> — hourly health snapshots</div>
                  <div><code style={{ color: '#4B5563' }}>data/pipeline_status.json</code> — machine-readable last run status</div>
                </div>
              </Card>
            </div>
          )}

          {/* ── System ── */}
          {section === 'system' && (
            <div>
              <SectionHeader title="System" description="App restart, status, and diagnostics." />

              <Card title="Key Status Overview">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {Object.entries(keyStatus).map(([key, s]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#111827', borderRadius: 6 }}>
                      <StatusDot ok={s.configured} />
                      <code style={{ fontSize: 11, color: s.configured ? '#E5E7EB' : '#4B5563' }}>{key}</code>
                    </div>
                  ))}
                </div>
              </Card>

              {samDaysLeft !== null && (
                <Card title="SAM.gov Key Expiry">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, color: samDaysLeft <= 7 ? '#EF4444' : samDaysLeft <= 20 ? '#F59E0B' : '#10B981', fontWeight: 600 }}>
                        {samDaysLeft <= 0 ? 'EXPIRED' : `Expires in ${samDaysLeft} days`} — {samExpiry}
                      </div>
                      <div style={{ fontSize: 11, color: '#4B5563', marginTop: 4 }}>sam.gov → Sign In → Profile → API Keys → Generate New</div>
                    </div>
                    <button onClick={createSamRenewalTask} style={{ padding: '7px 14px', background: '#F59E0B22', border: '1px solid #F59E0B44', borderRadius: 6, color: '#FCD34D', fontSize: 12, cursor: 'pointer' }}>
                      Create Task
                    </button>
                  </div>
                </Card>
              )}

              <Card title="Restart App">
                <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 1.6 }}>
                  After saving keys to .env, the app must restart to load them into memory. This causes ~15 seconds of downtime. Docker automatically restarts the container.
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {queuedCount > 0 && (
                    <button onClick={saveQueued} disabled={saving}
                      style={{ padding: '9px 18px', background: '#3B82F6', border: 'none', borderRadius: 7, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      {saving ? 'Saving…' : `1. Save ${queuedCount} key(s)`}
                    </button>
                  )}
                  <button onClick={restartApp} disabled={restarting}
                    style={{ padding: '9px 18px', background: '#7F1D1D22', border: '1px solid #7F1D1D', borderRadius: 7, color: '#FCA5A5', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {restarting ? 'Restarting…' : `${queuedCount > 0 ? '2. ' : ''}Restart App`}
                  </button>
                </div>
              </Card>
            </div>
          )}

          {/* ── Users ── */}
          {section === 'users' && (
            <div>
              <SectionHeader title="Users" description="Team members with access to this system." />

              <Card>
                {users.length === 0 ? (
                  <div style={{ color: '#4B5563', fontSize: 13, padding: '12px 0' }}>No users yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {users.map(u => (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#111827', borderRadius: 8, border: '1px solid #1F2937' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1F2937', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#9CA3AF' }}>
                          {(u.name || '?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: '#4B5563' }}>{u.email} · {u.role}</div>
                        </div>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: u.google_connected ? '#10B98122' : '#1F2937', color: u.google_connected ? '#10B981' : '#4B5563' }}>
                          {u.google_connected ? 'Gmail ✓' : 'Gmail ✗'}
                        </span>
                        <a href={`/api/auth/google?user_id=${u.id}`} style={{ padding: '5px 10px', background: '#4285F411', border: '1px solid #4285F433', borderRadius: 6, color: '#4285F4', fontSize: 11, textDecoration: 'none' }}>
                          {u.google_connected ? 'Reconnect' : 'Connect Gmail'}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Add User">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <input value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} placeholder="Full name"
                    style={{ flex: 1, minWidth: 130, background: '#111827', border: '1px solid #374151', borderRadius: 6, color: '#F9FAFB', padding: '8px 11px', fontSize: 12 }} />
                  <input value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="Email"
                    style={{ flex: 1, minWidth: 180, background: '#111827', border: '1px solid #374151', borderRadius: 6, color: '#F9FAFB', padding: '8px 11px', fontSize: 12 }} />
                  <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                    style={{ background: '#111827', border: '1px solid #374151', borderRadius: 6, color: '#F9FAFB', padding: '8px 11px', fontSize: 12 }}>
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <button onClick={async () => {
                  if (!newUser.name || !newUser.email) return
                  setCreatingUser(true)
                  try {
                    const res = await fetch('/api/settings/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser) })
                    if (res.ok) { setNewUser({ name: '', email: '', role: 'member' }); loadUsers(); showToast('User created') }
                    else showToast('Failed', false)
                  } finally { setCreatingUser(false) }
                }} disabled={creatingUser || !newUser.name || !newUser.email}
                  style={{ padding: '8px 18px', background: '#3B82F622', border: '1px solid #3B82F644', borderRadius: 6, color: '#3B82F6', fontSize: 12, cursor: 'pointer' }}>
                  {creatingUser ? 'Creating…' : '+ Add User'}
                </button>
              </Card>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
