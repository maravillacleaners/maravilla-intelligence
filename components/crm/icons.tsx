'use client'

export const IconExternal = ({ size = 11 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 2H2v8h8V7"/><path d="M7 2h3v3"/><path d="M5.5 6.5L10 2"/>
  </svg>
)

export const IconCopy = ({ size = 11 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><path d="M2 8V2h6"/>
  </svg>
)

export const IconCheck = ({ size = 11 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 6.5L5 9.5L10.5 3"/>
  </svg>
)

export const IconArrowRight = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h6M6.5 3L9.5 6L6.5 9"/>
  </svg>
)

export const IconX = ({ size = 11 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="M3 3l6 6M9 3l-6 6"/>
  </svg>
)

export const IconChevron = ({
  size = 10,
  dir = 'right',
}: {
  size?: number
  dir?: 'right' | 'down' | 'left' | 'up'
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transform:
        dir === 'down'
          ? 'rotate(90deg)'
          : dir === 'left'
          ? 'rotate(180deg)'
          : dir === 'up'
          ? 'rotate(-90deg)'
          : 'none',
    }}
  >
    <path d="M4 2l4 4-4 4"/>
  </svg>
)

export const IconSearch = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="7" cy="7" r="5"/><path d="M11 11l3 3" strokeLinecap="round"/>
  </svg>
)

export const IconBell = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2a5 5 0 0 1 5 5v3l1 2H2l1-2V7a5 5 0 0 1 5-5z"/><path d="M6.5 13.5a1.5 1.5 0 0 0 3 0"/>
  </svg>
)

export const IconSparkle = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 0l1.5 5.5L15 7l-5.5 1.5L8 16l-1.5-7.5L0 7l6.5-1.5z"/>
  </svg>
)
