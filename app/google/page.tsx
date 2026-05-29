'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export default function GoogleDashboard() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState('')
  const [gmail, setGmail] = useState<any>(null)
  const [calendar, setCalendar] = useState<any>(null)
  const [loadingGmail, setLoadingGmail] = useState(false)
  const [loadingCal, setLoadingCal] = useState(false)
  const [tab, setTab] = useState<'gmail' | 'calendar'>('gmail')
  const [toast, setToast] = useState('')
  const [gmailQuery, setGmailQuery] = useState('in:inbox')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('mi_selected_user') : ''
    fetch('/api/settings/users').then(r => r.json()).then(d => {
      setUsers(d.users || [])
      const su = stored || d.users?.[0]?.id || ''
      setSelectedUser(su)
    })
  }, [])

  const fetchGmail = useCallback(async (user_id: string, q = 'in:inbox') => {
    if (!user_id) return
    setLoadingGmail(true)
    const res = await fetch(`/api/google/gmail?user_id=${user_id}&max=20&q=${encodeURIComponent(q)}`)
    const data = await res.json()
    if (data.error) { showToast(`Gmail: ${data.error}`); setLoadingGmail(false); return }
    setGmail(data)
    setLoadingGmail(false)
  }, [])

  const fetchCalendar = useCallback(async (user_id: string) => {
    if (!user_id) return
    setLoadingCal(true)
    const res = await fetch(`/api/google/calendar?user_id=${user_id}&days=14`)
    const data = await res.json()
    if (data.error) { showToast(`Calendar: ${data.error}`); setLoadingCal(false); return }
    setCalendar(data)
    setLoadingCal(false)
  }, [])

  useEffect(() => {
    if (!selectedUser) return
    fetchGmail(selectedUser, gmailQuery)
    fetchCalendar(selectedUser)
  }, [selectedUser, fetchGmail, fetchCalendar])

  const currentUser = users.find(u => u.id === selectedUser)

  const NAICS_TERMS = ['janitorial', 'cleaning', 'custodial', '561720', 'rfp', 'rfq', 'bid', 'proposal', 'procurement', 'openGov', 'bonfire', 'demandstar']

  return (
    <div style={{ background: '#030712', minHeight: '100vh', fontFamily: 'monospace', color: '#F9FAFB' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: '#1F2937', border: '1px solid #374151', color: '#F9FAFB', padding: '10px 20px', borderRadius: 8, fontSize: 13, zIndex: 999 }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ borderBottom: '1px solid #111827', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, background: '#030712', zIndex: 10 }}>
        <button onClick={() => router.push('/daily-brief')} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 13 }}>← Daily Brief</button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Google Workspace</h1>
        <div style={{ flex: 1 }} />

        {/* User selector */}
        <div style={{ display: 'flex', gap: 8 }}>
          {users.map(u => (
            <button key={u.id} onClick={() => { setSelectedUser(u.id); localStorage.setItem('mi_selected_user', u.id) }} style={{
              padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12,
              background: selectedUser === u.id ? '#3B82F622' : 'none',
              border: `1px solid ${selectedUser === u.id ? '#3B82F6' : '#374151'}`,
              color: selectedUser === u.id ? '#3B82F6' : '#6B7280',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: u.google_connected ? '#10B981' : '#374151', display: 'inline-block' }} />
              {u.name}
            </button>
          ))}
          <button onClick={() => router.push('/settings#users')} style={{ padding: '6px 14px', background: 'none', border: '1px dashed #374151', borderRadius: 20, color: '#4B5563', fontSize: 12, cursor: 'pointer' }}>
            + User
          </button>
        </div>
      </div>

      {!currentUser?.google_connected ? (
        <div style={{ textAlign: 'center', padding: '80px 32px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>G</div>
          <h2 style={{ color: '#9CA3AF', marginBottom: 8 }}>Google not connected</h2>
          <p style={{ color: '#4B5563', marginBottom: 24, fontSize: 14 }}>
            {currentUser ? `${currentUser.name} hasn't connected Google yet.` : 'Select a user above.'}
          </p>
          {currentUser && (
            <button
              onClick={() => router.push(`/settings`)}
              style={{ background: '#4285F4', border: 'none', borderRadius: 8, color: '#fff', padding: '12px 24px', fontSize: 14, cursor: 'pointer' }}
            >
              Go to Settings → Connect Google
            </button>
          )}
        </div>
      ) : (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 32px' }}>

          {/* Stats bar */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Inbox', value: gmail?.total_fetched ?? '—', color: '#4285F4' },
              { label: 'Lead signals', value: gmail?.lead_signals ?? '—', color: '#F59E0B' },
              { label: 'Today events', value: calendar?.today_count ?? '—', color: '#10B981' },
              { label: 'Sales meetings', value: calendar?.sales_events_count ?? '—', color: '#8B5CF6' },
            ].map(s => (
              <div key={s.label} style={{ background: '#0D1117', border: '1px solid #1F2937', borderRadius: 10, padding: '14px 20px', flex: 1 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid #111827' }}>
            {(['gmail', 'calendar'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '10px 24px', background: 'none', border: 'none', cursor: 'pointer',
                color: tab === t ? '#F9FAFB' : '#6B7280',
                borderBottom: tab === t ? '2px solid #4285F4' : '2px solid transparent',
                fontSize: 13, textTransform: 'capitalize',
              }}>{t === 'gmail' ? '📧 Gmail' : '📅 Calendar'}</button>
            ))}
          </div>

          {/* Gmail tab */}
          {tab === 'gmail' && (
            <div>
              {/* Search bar */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                  value={gmailQuery}
                  onChange={e => setGmailQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchGmail(selectedUser, gmailQuery)}
                  placeholder="Gmail search query (e.g. in:inbox rfp OR bid)"
                  style={{ flex: 1, background: '#111827', border: '1px solid #374151', borderRadius: 6, color: '#F9FAFB', padding: '10px 14px', fontSize: 13, fontFamily: 'monospace' }}
                />
                <button onClick={() => fetchGmail(selectedUser, 'rfp OR rfq OR bid OR solicitation OR janitorial')}
                  style={{ padding: '10px 16px', background: '#F59E0B22', border: '1px solid #F59E0B44', borderRadius: 6, color: '#F59E0B', fontSize: 12, cursor: 'pointer' }}>
                  🔍 Lead signals
                </button>
                <button onClick={() => fetchGmail(selectedUser, gmailQuery)}
                  style={{ padding: '10px 16px', background: '#3B82F622', border: '1px solid #3B82F644', borderRadius: 6, color: '#3B82F6', fontSize: 12, cursor: 'pointer' }}>
                  {loadingGmail ? 'Loading...' : 'Search'}
                </button>
              </div>

              {/* Lead signals highlight */}
              {gmail?.lead_emails?.length > 0 && (
                <div style={{ background: '#0D1117', border: '1px solid #F59E0B44', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                  <div style={{ color: '#F59E0B', fontSize: 11, fontWeight: 700, marginBottom: 10, letterSpacing: 1 }}>
                    ⚡ {gmail.lead_emails.length} LEAD SIGNALS DETECTED
                  </div>
                  {gmail.lead_emails.map((m: any) => (
                    <div key={m.id} style={{ padding: '10px 0', borderBottom: '1px solid #1F2937' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#F9FAFB', marginBottom: 4 }}>{m.subject}</div>
                          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>{m.from} · {m.date}</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {m.signals.map((s: string) => (
                              <span key={s} style={{ background: '#F59E0B22', color: '#F59E0B', padding: '2px 8px', borderRadius: 20, fontSize: 10 }}>{s}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span style={{ background: '#3B82F622', color: '#3B82F6', padding: '3px 10px', borderRadius: 20, fontSize: 11 }}>{m.lead_type}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: '#4B5563', marginTop: 6 }}>{m.snippet?.slice(0, 120)}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* All threads */}
              <div>
                {loadingGmail ? (
                  <div style={{ color: '#4B5563', padding: 24, textAlign: 'center' }}>Fetching emails...</div>
                ) : (gmail?.threads || []).map((m: any) => (
                  <div key={m.id} style={{
                    padding: '12px 16px', background: '#0D1117',
                    border: `1px solid ${m.is_lead ? '#F59E0B33' : '#1F2937'}`,
                    borderLeft: `3px solid ${m.is_lead ? '#F59E0B' : '#1F2937'}`,
                    borderRadius: 8, marginBottom: 8,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#F9FAFB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.subject}</div>
                        <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{m.from?.slice(0, 60)}</div>
                        <div style={{ fontSize: 12, color: '#4B5563', marginTop: 4 }}>{m.snippet?.slice(0, 100)}</div>
                      </div>
                      <div style={{ flexShrink: 0, textAlign: 'right', fontSize: 11, color: '#4B5563' }}>
                        {m.date?.slice(0, 11)}
                        {m.is_lead && <div style={{ color: '#F59E0B', marginTop: 4 }}>⚡ lead signal</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Calendar tab */}
          {tab === 'calendar' && (
            <div>
              {loadingCal ? (
                <div style={{ color: '#4B5563', padding: 24, textAlign: 'center' }}>Fetching calendar...</div>
              ) : (
                <>
                  {calendar?.today_events?.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ color: '#10B981', fontSize: 11, fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>TODAY</div>
                      {calendar.today_events.map((ev: any) => (
                        <EventCard key={ev.id} ev={ev} />
                      ))}
                    </div>
                  )}
                  <div>
                    <div style={{ color: '#6B7280', fontSize: 11, fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>NEXT 14 DAYS</div>
                    {(calendar?.events || []).filter((e: any) => !calendar?.today_events?.find((t: any) => t.id === e.id)).map((ev: any) => (
                      <EventCard key={ev.id} ev={ev} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EventCard({ ev }: { ev: any }) {
  const start = ev.start ? new Date(ev.start) : null
  const dateStr = start ? start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''
  const timeStr = start && ev.start.includes('T') ? start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'All day'

  return (
    <div style={{
      padding: '14px 16px', background: '#0D1117',
      border: `1px solid ${ev.is_sales ? '#8B5CF644' : '#1F2937'}`,
      borderLeft: `3px solid ${ev.is_sales ? '#8B5CF6' : '#374151'}`,
      borderRadius: 8, marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#F9FAFB', marginBottom: 4 }}>{ev.summary}</div>
          {ev.location && <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>📍 {ev.location}</div>}
          {ev.attendees?.length > 0 && (
            <div style={{ fontSize: 11, color: '#4B5563' }}>
              {ev.attendees.slice(0, 3).map((a: any) => a.email).join(', ')}
              {ev.attendees.length > 3 && ` +${ev.attendees.length - 3}`}
            </div>
          )}
          {ev.is_sales && ev.signals?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {ev.signals.slice(0, 3).map((s: string) => (
                <span key={s} style={{ background: '#8B5CF622', color: '#8B5CF6', padding: '2px 8px', borderRadius: 20, fontSize: 10 }}>{s}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: '#D1D5DB', fontWeight: 600 }}>{dateStr}</div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{timeStr}</div>
          {ev.is_sales && <div style={{ fontSize: 10, color: '#8B5CF6', marginTop: 4 }}>sales</div>}
        </div>
      </div>
    </div>
  )
}
