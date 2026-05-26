'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommandItem {
  id: string
  icon: string
  label: string
  hint?: string
  group: string
  action: string
  payload?: string
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onNavTab?: (tab: string) => void
  onApprove?: () => void
  onReject?: () => void
  onChangeScreen?: (screen: string) => void
}

// ─── Command definitions ──────────────────────────────────────────────────────

const ALL_COMMANDS: CommandItem[] = [
  // Screens
  { id: 'sc-discovery', icon: '🔍', label: 'Discovery', hint: undefined, group: 'Screens', action: 'screen', payload: '/discovery' },
  { id: 'sc-awards', icon: '🏆', label: 'Awards', group: 'Screens', action: 'screen', payload: '/awards' },
  { id: 'sc-queue', icon: '📋', label: 'Queue', group: 'Screens', action: 'screen', payload: '/queue' },
  { id: 'sc-prospect', icon: '👤', label: 'Prospect Profile', group: 'Screens', action: 'screen', payload: '/prospects' },
  { id: 'sc-findsubs', icon: '🏗️', label: 'Find Subs', group: 'Screens', action: 'screen', payload: '/find-subs' },
  { id: 'sc-contracts', icon: '📄', label: 'Contracts', group: 'Screens', action: 'screen', payload: '/contracts' },
  { id: 'sc-sequences', icon: '✉️', label: 'Sequences', group: 'Screens', action: 'screen', payload: '/sequences' },
  { id: 'sc-insights', icon: '📈', label: 'Insights', group: 'Screens', action: 'screen', payload: '/analytics' },

  // Actions
  { id: 'act-approve', icon: '✅', label: 'Approve prospect', hint: 'A', group: 'Actions', action: 'approve' },
  { id: 'act-reject', icon: '❌', label: 'Reject prospect', hint: 'R', group: 'Actions', action: 'reject' },
  { id: 'act-advance', icon: '→', label: 'Advance stage', group: 'Actions', action: 'advance' },
  { id: 'act-email', icon: '✍️', label: 'Generate email', group: 'Actions', action: 'email' },
  { id: 'act-copilot', icon: '✦', label: 'Open Copilot', hint: '⌘J', group: 'Actions', action: 'copilot' },

  // Tabs
  { id: 'tab-profile', icon: '👤', label: 'Profile', group: 'Tab navigation', action: 'tab', payload: 'profile' },
  { id: 'tab-signals', icon: '📡', label: 'Signals', group: 'Tab navigation', action: 'tab', payload: 'signals' },
  { id: 'tab-relationships', icon: '🤝', label: 'Relationships', group: 'Tab navigation', action: 'tab', payload: 'relationships' },
  { id: 'tab-market', icon: '🗺️', label: 'Market', group: 'Tab navigation', action: 'tab', payload: 'market' },
  { id: 'tab-compare', icon: '⚖️', label: 'Compare', group: 'Tab navigation', action: 'tab', payload: 'compare' },
  { id: 'tab-history', icon: '🕑', label: 'History', group: 'Tab navigation', action: 'tab', payload: 'history' },

  // Jump to
  { id: 'jump-1', icon: '🏢', label: 'Brickell Capital Group', group: 'Jump to', action: 'jump', payload: 'brickell-capital-group' },
  { id: 'jump-2', icon: '🏢', label: 'Miami Dade Medical Center', group: 'Jump to', action: 'jump', payload: 'miami-dade-medical' },
  { id: 'jump-3', icon: '🏢', label: 'Coral Gables Office Tower', group: 'Jump to', action: 'jump', payload: 'coral-gables-office' },
]

const GROUP_ORDER = ['Screens', 'Actions', 'Tab navigation', 'Jump to']

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommandPalette({
  open,
  onClose,
  onNavTab,
  onApprove,
  onReject,
  onChangeScreen,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handler(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Filter
  const filtered = query.trim()
    ? ALL_COMMANDS.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.group.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_COMMANDS

  // Flat list for keyboard navigation
  const flatList = filtered

  // Group by
  const grouped = GROUP_ORDER.reduce<Record<string, CommandItem[]>>((acc, g) => {
    const items = filtered.filter((c) => c.group === g)
    if (items.length > 0) acc[g] = items
    return acc
  }, {})

  const executeItem = (item: CommandItem) => {
    onClose()
    switch (item.action) {
      case 'screen':
        if (item.payload && onChangeScreen) onChangeScreen(item.payload)
        else if (item.payload) window.location.href = item.payload
        break
      case 'approve':
        onApprove?.()
        break
      case 'reject':
        onReject?.()
        break
      case 'tab':
        if (item.payload && onNavTab) onNavTab(item.payload)
        break
      case 'copilot':
        // parent handles via onNavTab or custom
        onNavTab?.('copilot')
        break
      default:
        break
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, flatList.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flatList[activeIndex]) executeItem(flatList[activeIndex])
    }
  }

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (!open) return null

  // Build index map for each item in flatList
  const itemIndex = (item: CommandItem) => flatList.findIndex((c) => c.id === item.id)

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.40)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          zIndex: 60,
        }}
      />

      {/* Palette */}
      <div
        style={{
          position: 'fixed',
          top: '18vh',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 560,
          maxWidth: 'calc(100vw - 32px)',
          background: '#FFF',
          border: '1px solid #E7E5E4',
          borderRadius: 14,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          zIndex: 61,
          overflow: 'hidden',
          animation: 'cmdkPop 140ms cubic-bezier(.2,.8,.2,1)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 16px',
            borderBottom: '1px solid #E7E5E4',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="7" cy="7" r="5" stroke="#A8A29E" strokeWidth="1.5" />
            <path d="M11.5 11.5L14 14" stroke="#A8A29E" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search or command…"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 15,
              color: '#1C1917',
              background: 'transparent',
              fontFamily: 'inherit',
            }}
          />
          <kbd
            style={{
              fontSize: 11,
              background: '#F5F5F4',
              border: '1px solid #E7E5E4',
              borderRadius: 5,
              padding: '2px 6px',
              color: '#78716C',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          style={{ maxHeight: 400, overflowY: 'auto', padding: '6px 0' }}
        >
          {Object.keys(grouped).length === 0 ? (
            <p
              style={{
                textAlign: 'center',
                fontSize: 13,
                color: '#A8A29E',
                padding: '24px 16px',
              }}
            >
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                {/* Group label */}
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#A8A29E',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    padding: '8px 16px 4px',
                    margin: 0,
                  }}
                >
                  {group}
                </p>

                {items.map((item) => {
                  const idx = itemIndex(item)
                  const isActive = idx === activeIndex
                  return (
                    <div
                      key={item.id}
                      data-idx={idx}
                      onClick={() => executeItem(item)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 16px',
                        cursor: 'pointer',
                        background: isActive ? '#F5F3FF' : 'transparent',
                        transition: 'background 80ms',
                      }}
                    >
                      <span
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          background: '#F5F5F4',
                          border: '1px solid #E7E5E4',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          flexShrink: 0,
                        }}
                      >
                        {item.icon}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          fontSize: 13,
                          color: '#1C1917',
                          fontWeight: isActive ? 500 : 400,
                        }}
                      >
                        {item.label}
                      </span>
                      {item.hint && (
                        <kbd
                          style={{
                            fontSize: 11,
                            background: '#F5F5F4',
                            border: '1px solid #E7E5E4',
                            borderRadius: 5,
                            padding: '1px 6px',
                            color: '#78716C',
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {item.hint}
                        </kbd>
                      )}
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '8px 16px',
            borderTop: '1px solid #E7E5E4',
            background: '#FAFAF9',
          }}
        >
          {[
            { key: '↑↓', label: 'navigate' },
            { key: '↵', label: 'select' },
            { key: 'Esc', label: 'close' },
          ].map(({ key, label }) => (
            <span
              key={key}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#A8A29E' }}
            >
              <kbd
                style={{
                  background: '#FFF',
                  border: '1px solid #E7E5E4',
                  borderRadius: 4,
                  padding: '1px 5px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: '#78716C',
                }}
              >
                {key}
              </kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </>
  )
}
