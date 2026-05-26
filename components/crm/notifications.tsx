'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotifType =
  | 'score'
  | 'building'
  | 'subgap'
  | 'contract'
  | 'system'
  | 'reply'
  | 'won'
  | 'optout'

export interface Notification {
  id: string
  type: NotifType
  title: string
  body: string
  timestamp: Date
  read: boolean
  priority?: 'high' | 'normal'
}

export interface Toast {
  id: string
  title: string
  body?: string
  type?: NotifType | 'success' | 'error' | 'info'
  duration?: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTIF_ICONS: Record<NotifType, string> = {
  score: '⟳',
  building: '🏢',
  subgap: '⚠️',
  contract: '📄',
  system: '⚙️',
  reply: '💬',
  won: '🏆',
  optout: '🚫',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(date: Date): string {
  const now = Date.now()
  const diff = Math.floor((now - date.getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ─── useToasts hook ───────────────────────────────────────────────────────────

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { ...toast, id }])
    const duration = toast.duration ?? 4500
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, push, dismiss }
}

// ─── ToastStack ───────────────────────────────────────────────────────────────

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 360,
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            background: '#FFF',
            border: '1px solid #E7E5E4',
            borderRadius: 10,
            padding: '12px 16px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            animation: 'cmdkFade 200ms ease',
          }}
        >
          {toast.type && NOTIF_ICONS[toast.type as NotifType] && (
            <span style={{ fontSize: 16, flexShrink: 0 }}>
              {NOTIF_ICONS[toast.type as NotifType]}
            </span>
          )}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1C1917', margin: 0 }}>
              {toast.title}
            </p>
            {toast.body && (
              <p style={{ fontSize: 12, color: '#78716C', margin: '2px 0 0' }}>{toast.body}</p>
            )}
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#A8A29E',
              fontSize: 14,
              padding: 0,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── NotificationBell ─────────────────────────────────────────────────────────

type NotifTab = 'all' | 'unread' | 'high'

interface NotificationBellProps {
  notifications: Notification[]
  onMarkAllRead: () => void
  onClickNotif: (notif: Notification) => void
}

export function NotificationBell({
  notifications,
  onMarkAllRead,
  onClickNotif,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<NotifTab>('all')
  const containerRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const filtered = notifications.filter((n) => {
    if (tab === 'unread') return !n.read
    if (tab === 'high') return n.priority === 'high'
    return true
  })

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'relative',
          width: 32,
          height: 32,
          borderRadius: 8,
          border: '1px solid #E7E5E4',
          background: open ? '#F5F5F4' : 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          color: '#78716C',
        }}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              background: '#EF4444',
              color: '#FFF',
              fontSize: 9,
              fontWeight: 700,
              borderRadius: 10,
              minWidth: 16,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
              border: '2px solid #FFF',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 0,
            width: 360,
            background: '#FFF',
            border: '1px solid #E7E5E4',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            zIndex: 100,
            overflow: 'hidden',
            animation: 'cmdkFade 150ms ease',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid #E7E5E4',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14, color: '#1C1917' }}>Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                style={{
                  fontSize: 12,
                  color: '#4F46E5',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #E7E5E4',
              padding: '0 16px',
            }}
          >
            {(['all', 'unread', 'high'] as NotifTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '8px 12px',
                  fontSize: 12,
                  fontWeight: 500,
                  background: 'none',
                  border: 'none',
                  borderBottom: tab === t ? '2px solid #4F46E5' : '2px solid transparent',
                  color: tab === t ? '#4F46E5' : '#78716C',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  marginBottom: -1,
                }}
              >
                {t === 'high' ? 'High priority' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* List */}
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <p
                style={{
                  textAlign: 'center',
                  fontSize: 13,
                  color: '#A8A29E',
                  padding: '24px 16px',
                }}
              >
                No notifications
              </p>
            ) : (
              filtered.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    onClickNotif(notif)
                    setOpen(false)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '12px 16px',
                    background: notif.read ? 'transparent' : '#F5F3FF',
                    borderBottom: '1px solid #F5F5F4',
                    cursor: 'pointer',
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLDivElement).style.background = '#F9F9F8')
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLDivElement).style.background = notif.read
                      ? 'transparent'
                      : '#F5F3FF')
                  }
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: '#F5F5F4',
                      border: '1px solid #E7E5E4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    {NOTIF_ICONS[notif.type]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 8,
                      }}
                    >
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: notif.read ? 400 : 600,
                          color: '#1C1917',
                          margin: 0,
                          lineHeight: 1.3,
                        }}
                      >
                        {notif.title}
                      </p>
                      <span
                        style={{
                          fontSize: 11,
                          color: '#A8A29E',
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        {relativeTime(notif.timestamp)}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: '#78716C',
                        margin: '2px 0 0',
                        lineHeight: 1.4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {notif.body}
                    </p>
                  </div>
                  {!notif.read && (
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#4F46E5',
                        flexShrink: 0,
                        marginTop: 6,
                      }}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
