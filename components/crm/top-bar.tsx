'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NotificationBell, type Notification } from './notifications'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TopBarProps {
  screen?: string
  prospectName?: string
  notifications: Notification[]
  onMarkAllRead: () => void
  onClickNotif: (notif: Notification) => void
  onOpenCopilot: () => void
  onOpenCmdK: () => void
}

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_TABS = [
  { label: 'Discovery', href: '/discovery' },
  { label: 'Awards', href: '/awards' },
  { label: 'Queue', href: '/queue' },
  { label: 'Prospect', href: '/prospects' },
  { label: 'Find subs', href: '/find-subs' },
  { label: 'Subs', href: '/subs' },
  { label: 'Contracts', href: '/contracts' },
  { label: 'Sequences', href: '/sequences' },
  { label: 'Insights', href: '/analytics' },
]

// ─── Breadcrumb helper ────────────────────────────────────────────────────────

function buildBreadcrumb(pathname: string, prospectName?: string): string[] | null {
  if (pathname.startsWith('/prospects') && prospectName) {
    return ['Prospects', prospectName]
  }
  if (pathname.startsWith('/contracts')) return ['Contracts']
  if (pathname.startsWith('/subs')) return ['Subs']
  if (pathname.startsWith('/analytics')) return ['Insights']
  return null
}

// ─── CmdK Trigger ────────────────────────────────────────────────────────────

function CmdKTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 10px',
        height: 32,
        background: '#F5F5F4',
        border: '1px solid #E7E5E4',
        borderRadius: 8,
        cursor: 'pointer',
        color: '#A8A29E',
        fontSize: 13,
        minWidth: 180,
        transition: 'border-color 150ms',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#C7C3C0'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#E7E5E4'
      }}
    >
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="5.5" cy="5.5" r="4" stroke="#A8A29E" strokeWidth="1.3" />
        <path d="M9 9L12 12" stroke="#A8A29E" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      <span style={{ flex: 1, textAlign: 'left' }}>Search or command…</span>
      <kbd
        style={{
          fontSize: 10,
          background: '#FFF',
          border: '1px solid #E7E5E4',
          borderRadius: 4,
          padding: '1px 5px',
          color: '#A8A29E',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        ⌘K
      </kbd>
    </button>
  )
}

// ─── Copilot Trigger ──────────────────────────────────────────────────────────

function CopilotTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 12px',
        height: 32,
        background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        color: '#FFF',
        fontSize: 13,
        fontWeight: 500,
        boxShadow: '0 1px 4px rgba(79,70,229,0.28)',
        transition: 'opacity 150ms',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.opacity = '0.88'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
      }}
      title="Open Copilot (⌘J)"
    >
      <span style={{ fontSize: 12 }}>✦</span>
      <span>Copilot</span>
      <kbd
        style={{
          fontSize: 10,
          background: 'rgba(255,255,255,0.20)',
          borderRadius: 4,
          padding: '1px 5px',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: 0,
        }}
      >
        ⌘J
      </kbd>
    </button>
  )
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export default function TopBar({
  screen,
  prospectName,
  notifications,
  onMarkAllRead,
  onClickNotif,
  onOpenCopilot,
  onOpenCmdK,
}: TopBarProps) {
  const pathname = usePathname()
  const breadcrumbs = buildBreadcrumb(pathname, prospectName)

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: '#FFF',
        borderBottom: '1px solid #E7E5E4',
        padding: '0 80px',
        height: 52,
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* ── Left side ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, flex: 1, minWidth: 0 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: '#1C1917',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: -0.5,
            }}
          >
            M
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1917', letterSpacing: -0.2 }}>
            Maravilla CRM
          </span>
        </div>

        {/* Separator */}
        <div
          style={{
            width: 1,
            height: 18,
            background: '#E7E5E4',
            margin: '0 16px',
            flexShrink: 0,
          }}
        />

        {/* Nav Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          {NAV_TABS.map((tab) => {
            const isActive =
              pathname === tab.href ||
              (tab.href !== '/' && pathname.startsWith(tab.href))
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? '#1C1917' : '#78716C',
                  background: isActive ? '#F5F5F4' : 'transparent',
                  textDecoration: 'none',
                  transition: 'background 120ms, color 120ms',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    ;(e.currentTarget as HTMLAnchorElement).style.background = '#F9F9F8'
                    ;(e.currentTarget as HTMLAnchorElement).style.color = '#1C1917'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    ;(e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLAnchorElement).style.color = '#78716C'
                  }
                }}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>

        {/* Breadcrumb (if applicable) */}
        {breadcrumbs && (
          <>
            <div
              style={{
                width: 1,
                height: 18,
                background: '#E7E5E4',
                margin: '0 16px',
                flexShrink: 0,
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
              {breadcrumbs.map((crumb, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {i > 0 && (
                    <span style={{ color: '#D6D3D1', fontSize: 12 }}>›</span>
                  )}
                  <span
                    style={{
                      fontSize: 13,
                      color: i === breadcrumbs.length - 1 ? '#1C1917' : '#78716C',
                      fontWeight: i === breadcrumbs.length - 1 ? 500 : 400,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: 200,
                    }}
                  >
                    {crumb}
                  </span>
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Right side ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <CmdKTrigger onClick={onOpenCmdK} />
        <CopilotTrigger onClick={onOpenCopilot} />

        <div
          style={{
            width: 1,
            height: 18,
            background: '#E7E5E4',
            margin: '0 2px',
          }}
        />

        <NotificationBell
          notifications={notifications}
          onMarkAllRead={onMarkAllRead}
          onClickNotif={onClickNotif}
        />

        <div
          style={{
            width: 1,
            height: 18,
            background: '#E7E5E4',
            margin: '0 2px',
          }}
        />

        {/* Avatar */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFF',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: 0.3,
          }}
          title="Rosangel Herrera"
        >
          RH
        </div>
      </div>
    </header>
  )
}
