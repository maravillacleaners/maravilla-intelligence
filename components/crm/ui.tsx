'use client'

import React, { useState, useCallback, useRef, useEffect, CSSProperties, ReactNode } from 'react'
import type { ToneName, SizeName, VariantName, Toast } from './types'
import { IconX, IconCheck, IconChevron } from './icons'

// ---------------------------------------------------------------------------
// Color palettes per tone
// ---------------------------------------------------------------------------
const TONE_COLORS: Record<ToneName, { bg: string; text: string; border: string; dot: string }> = {
  neutral: { bg: '#F5F5F4', text: '#57534E', border: '#E7E5E4', dot: '#A8A29E' },
  indigo:  { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE', dot: '#6366F1' },
  emerald: { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', dot: '#10B981' },
  amber:   { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A', dot: '#F59E0B' },
  red:     { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', dot: '#EF4444' },
  blue:    { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', dot: '#3B82F6' },
  mono:    { bg: '#FAFAF9', text: '#1C1917', border: '#E7E5E4', dot: '#78716C' },
  dark:    { bg: '#1C1917', text: '#F5F5F4', border: '#44403C', dot: '#A8A29E' },
}

const SIZE_MAP: Record<SizeName, { px: number; py: number; fontSize: number; gap: number }> = {
  sm: { px: 8,  py: 3,  fontSize: 11, gap: 4 },
  md: { px: 12, py: 5,  fontSize: 12.5, gap: 6 },
  lg: { px: 16, py: 8,  fontSize: 14, gap: 8 },
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------
export const fmt = {
  money: (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n),
  moneyMo: (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n) + '/mo',
  pct: (n: number) => `${Math.round(n)}%`,
  phone: (s: string) => {
    const d = s.replace(/\D/g, '')
    if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
    if (d.length === 11 && d[0] === '1') return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
    return s
  },
  relDays: (days: number) => {
    if (days === 0) return 'today'
    if (days === 1) return '1 day ago'
    if (days < 30) return `${days} days ago`
    if (days < 365) return `${Math.floor(days / 30)}mo ago`
    return `${Math.floor(days / 365)}y ago`
  },
}

export function relTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  if (sec < 86400 * 30) return `${Math.floor(sec / 86400)}d ago`
  return `${Math.floor(sec / (86400 * 30))}mo ago`
}

export function stageTone(stage: string): ToneName {
  if (stage === 'Won') return 'emerald'
  if (stage === 'Lost' || stage === 'Rejected') return 'red'
  if (stage === 'Approved' || stage === 'Active') return 'indigo'
  if (stage === 'Contacted' || stage === 'Replied') return 'blue'
  if (stage === 'Proposal sent') return 'amber'
  return 'neutral'
}

// ---------------------------------------------------------------------------
// LetterAvatar
// ---------------------------------------------------------------------------
export function LetterAvatar({
  name,
  size = 32,
  style,
}: {
  name: string
  size?: number
  style?: CSSProperties
}) {
  const letter = (name || '?')[0].toUpperCase()
  const hue = (name.charCodeAt(0) * 47) % 360
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `hsl(${hue} 60% 88%)`,
        color: `hsl(${hue} 60% 32%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.42,
        fontWeight: 700,
        flexShrink: 0,
        userSelect: 'none',
        ...style,
      }}
    >
      {letter}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chip
// ---------------------------------------------------------------------------
export function Chip({
  children,
  tone = 'neutral',
  size = 'sm',
  icon,
  style,
}: {
  children: ReactNode
  tone?: ToneName
  size?: SizeName
  icon?: ReactNode
  style?: CSSProperties
}) {
  const c = TONE_COLORS[tone]
  const s = SIZE_MAP[size]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        borderRadius: 99,
        padding: `${s.py}px ${s.px}px`,
        fontSize: s.fontSize,
        fontWeight: 500,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {icon}
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// StatusDot
// ---------------------------------------------------------------------------
export function StatusDot({
  tone = 'neutral',
  size = 8,
  pulse,
}: {
  tone?: ToneName
  size?: number
  pulse?: boolean
}) {
  const c = TONE_COLORS[tone]
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: c.dot,
        flexShrink: 0,
        animation: pulse ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : undefined,
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
export function Card({
  children,
  style,
  pad = 16,
  hoverable,
  onClick,
}: {
  children: ReactNode
  style?: CSSProperties
  pad?: number
  hoverable?: boolean
  onClick?: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#FFFFFF',
        border: '1px solid #E7E5E4',
        borderRadius: 12,
        padding: pad,
        boxShadow: hoverable && hovered
          ? '0 4px 16px rgba(0,0,0,0.08)'
          : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
        transform: hoverable && hovered ? 'translateY(-1px)' : 'none',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SectionHeader
// ---------------------------------------------------------------------------
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  right?: ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
      <div>
        {eyebrow && (
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#A8A29E', marginBottom: 4 }}>
            {eyebrow}
          </div>
        )}
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1917', lineHeight: 1.3 }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 12.5, color: '#78716C', marginTop: 3 }}>{subtitle}</div>
        )}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// KV
// ---------------------------------------------------------------------------
export function KV({
  k,
  v,
  mono,
  muted,
}: {
  k: string
  v: ReactNode
  mono?: boolean
  muted?: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 12.5 }}>
      <span style={{ color: '#A8A29E', flexShrink: 0, minWidth: 80 }}>{k}</span>
      <span
        style={{
          color: muted ? '#A8A29E' : '#1C1917',
          fontFamily: mono ? 'JetBrains Mono, Consolas, monospace' : undefined,
          fontSize: mono ? 11.5 : undefined,
          wordBreak: 'break-all',
        }}
      >
        {v}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bar
// ---------------------------------------------------------------------------
export function Bar({
  value,
  max = 100,
  tone = 'indigo',
  height = 6,
  marker,
  range,
}: {
  value: number
  max?: number
  tone?: ToneName
  height?: number
  marker?: number
  range?: [number, number]
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const c = TONE_COLORS[tone]
  return (
    <div
      style={{
        position: 'relative',
        height,
        background: '#F5F5F4',
        borderRadius: height,
        overflow: 'visible',
      }}
    >
      {range && (
        <div
          style={{
            position: 'absolute',
            left: `${(range[0] / max) * 100}%`,
            width: `${((range[1] - range[0]) / max) * 100}%`,
            top: 0,
            bottom: 0,
            background: c.border,
            borderRadius: height,
          }}
        />
      )}
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: c.dot,
          borderRadius: height,
          transition: 'width 0.4s ease',
        }}
      />
      {marker !== undefined && (
        <div
          style={{
            position: 'absolute',
            left: `${(marker / max) * 100}%`,
            top: -2,
            width: 2,
            height: height + 4,
            background: '#1C1917',
            borderRadius: 2,
            transform: 'translateX(-50%)',
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
const VARIANT_STYLES: Record<VariantName, CSSProperties> = {
  primary:   { background: '#4F46E5', color: '#FFFFFF', border: '1px solid #4F46E5' },
  secondary: { background: '#FFFFFF', color: '#1C1917', border: '1px solid #E7E5E4' },
  ghost:     { background: 'transparent', color: '#57534E', border: '1px solid transparent' },
  danger:    { background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' },
  dark:      { background: '#1C1917', color: '#F5F5F4', border: '1px solid #1C1917' },
}

const BUTTON_SIZE_MAP: Record<SizeName, { px: number; py: number; fontSize: number; gap: number }> = {
  sm: { px: 10, py: 5,  fontSize: 12,   gap: 5 },
  md: { px: 14, py: 8,  fontSize: 13.5, gap: 6 },
  lg: { px: 18, py: 11, fontSize: 15,   gap: 8 },
}

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  onClick,
  icon,
  iconRight,
  disabled,
  full,
  style,
}: {
  children: ReactNode
  variant?: VariantName
  size?: SizeName
  onClick?: () => void
  icon?: ReactNode
  iconRight?: ReactNode
  disabled?: boolean
  full?: boolean
  style?: CSSProperties
}) {
  const [hovered, setHovered] = useState(false)
  const vs = VARIANT_STYLES[variant]
  const sz = BUTTON_SIZE_MAP[size]
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: sz.gap,
        padding: `${sz.py}px ${sz.px}px`,
        fontSize: sz.fontSize,
        fontWeight: 500,
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease',
        width: full ? '100%' : undefined,
        outline: 'none',
        lineHeight: 1,
        boxShadow: hovered && !disabled ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
        ...vs,
        ...(hovered && !disabled && variant === 'primary' ? { background: '#4338CA' } : {}),
        ...(hovered && !disabled && variant === 'secondary' ? { background: '#FAFAF9' } : {}),
        ...(hovered && !disabled && variant === 'ghost' ? { background: '#F5F5F4', borderColor: '#E7E5E4' } : {}),
        ...style,
      }}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------
export function Tooltip({ tip, children }: { tip: string; children: ReactNode }) {
  const [visible, setVisible] = useState(false)
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1C1917',
            color: '#F5F5F4',
            fontSize: 11,
            fontWeight: 500,
            padding: '4px 8px',
            borderRadius: 6,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 999,
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          }}
        >
          {tip}
          <span
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid #1C1917',
            }}
          />
        </span>
      )}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Kbd
// ---------------------------------------------------------------------------
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        background: '#F5F5F4',
        border: '1px solid #E7E5E4',
        borderRadius: 3,
        padding: '1px 5px',
        fontSize: 10.5,
        fontFamily: 'JetBrains Mono, monospace',
      }}
    >
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// useToasts + ToastStack
// ---------------------------------------------------------------------------
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { ...t, id }])
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4500)
  }, [])
  const dismiss = useCallback((id: string) => setToasts(prev => prev.filter(x => x.id !== id)), [])
  return { toasts, push, dismiss }
}

const TOAST_TONE_MAP: Record<NonNullable<Toast['tone']>, { border: string; icon: ReactNode }> = {
  success: { border: '#10B981', icon: <span style={{ color: '#10B981', fontSize: 14 }}>✓</span> },
  danger:  { border: '#EF4444', icon: <span style={{ color: '#EF4444', fontSize: 14 }}>✕</span> },
  info:    { border: '#6366F1', icon: <span style={{ color: '#6366F1', fontSize: 14 }}>i</span> },
  warning: { border: '#F59E0B', icon: <span style={{ color: '#F59E0B', fontSize: 14 }}>!</span> },
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const tm = toast.tone ? TOAST_TONE_MAP[toast.tone] : null
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E7E5E4',
        borderLeft: `4px solid ${tm?.border ?? '#E7E5E4'}`,
        borderRadius: 10,
        padding: '12px 14px',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        animation: 'slideInRight 0.25s ease',
        minWidth: 280,
      }}
    >
      {tm?.icon && <div style={{ flexShrink: 0, marginTop: 1 }}>{tm.icon}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1917' }}>{toast.title}</div>
        {toast.body && <div style={{ fontSize: 12, color: '#78716C', marginTop: 3 }}>{toast.body}</div>}
        {toast.actionLabel && toast.onAction && (
          <button
            onClick={toast.onAction}
            style={{
              marginTop: 8,
              fontSize: 12,
              fontWeight: 600,
              color: '#4F46E5',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {toast.actionLabel}
          </button>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#A8A29E', padding: 2, lineHeight: 1 }}
      >
        <IconX size={11} />
      </button>
    </div>
  )
}

export function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (!toasts.length) return null
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxWidth: 380,
      }}
    >
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FilterPill — dropdown filter pill
// ---------------------------------------------------------------------------
export function FilterPill({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const active = value !== '' && value !== 'All'
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '5px 10px',
          fontSize: 12,
          fontWeight: 500,
          background: active ? '#EEF2FF' : '#FFFFFF',
          color: active ? '#4338CA' : '#57534E',
          border: `1px solid ${active ? '#C7D2FE' : '#E7E5E4'}`,
          borderRadius: 99,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
        {active && value !== 'All' && (
          <span style={{ fontWeight: 700 }}>: {value}</span>
        )}
        <IconChevron size={9} dir={open ? 'up' : 'down'} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            background: '#FFFFFF',
            border: '1px solid #E7E5E4',
            borderRadius: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            zIndex: 200,
            minWidth: 160,
            padding: '6px 4px',
            overflow: 'hidden',
          }}
        >
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '7px 10px',
                fontSize: 12.5,
                background: value === opt ? '#EEF2FF' : 'transparent',
                color: value === opt ? '#4338CA' : '#1C1917',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                borderRadius: 6,
              }}
            >
              {value === opt && <IconCheck size={10} />}
              {value !== opt && <span style={{ width: 10 }} />}
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Checkbox
// ---------------------------------------------------------------------------
export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  disabled?: boolean
}) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        userSelect: 'none',
        fontSize: 13,
      }}
    >
      <div
        onClick={() => !disabled && onChange(!checked)}
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          border: `1.5px solid ${checked ? '#4F46E5' : '#D6D3D1'}`,
          background: checked ? '#4F46E5' : '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 0.12s ease, border-color 0.12s ease',
        }}
      >
        {checked && <IconCheck size={10} />}
      </div>
      {label && <span style={{ color: '#1C1917' }}>{label}</span>}
    </label>
  )
}
