/**
 * Maravilla Intelligence Design System
 * Color palette, typography, and component styles
 */

export const colors = {
  // Primary
  primary: '#0F3DFF', // Maravilla brand blue
  primaryLight: '#E7EDFF',
  primaryDark: '#0B2BB8',

  // Secondary
  secondary: '#612BF2', // Purple
  secondaryLight: '#F3EBFE',

  // Accent
  accent: '#00C7DE', // Cyan
  accentLight: '#E0F8FB',

  // Semantic
  success: '#10B981', // Emerald
  successLight: '#ECFDF5',
  error: '#EF4444', // Red
  errorLight: '#FEE2E2',
  warning: '#F59E0B', // Amber
  warningLight: '#FFFBEB',
  info: '#3B82F6', // Blue
  infoLight: '#EFF6FF',

  // Neutral
  white: '#FFFFFF',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
}

export const typography = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
}

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '2.5rem',
  '3xl': '3rem',
  '4xl': '4rem',
}

export const borderRadius = {
  none: '0',
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.25rem',
  full: '9999px',
}

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
}

export const transitions = {
  fast: '150ms ease-in-out',
  base: '200ms ease-in-out',
  slow: '300ms ease-in-out',
}

export const buttonStyles = {
  primary: `
    bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg
    hover:bg-blue-700 active:scale-95
    transition duration-200 ease-in-out
    disabled:bg-gray-400 disabled:cursor-not-allowed
    focus:outline-none focus:ring-4 focus:ring-blue-300
  `,
  secondary: `
    bg-gray-200 text-gray-900 font-semibold py-3 px-6 rounded-lg
    hover:bg-gray-300 active:scale-95
    transition duration-200 ease-in-out
    disabled:bg-gray-400 disabled:text-gray-600 disabled:cursor-not-allowed
    focus:outline-none focus:ring-4 focus:ring-gray-300
  `,
  outline: `
    bg-white border-2 border-blue-600 text-blue-600 font-semibold py-3 px-6 rounded-lg
    hover:bg-blue-50 active:scale-95
    transition duration-200 ease-in-out
    disabled:border-gray-400 disabled:text-gray-400 disabled:cursor-not-allowed
    focus:outline-none focus:ring-4 focus:ring-blue-300
  `,
  ghost: `
    bg-transparent text-blue-600 font-semibold py-3 px-6 rounded-lg
    hover:bg-blue-50 active:scale-95
    transition duration-200 ease-in-out
    disabled:text-gray-400 disabled:cursor-not-allowed
    focus:outline-none focus:ring-4 focus:ring-blue-300
  `,
}

export const cardStyles = `
  bg-white rounded-xl border border-gray-200 shadow-sm
  hover:shadow-md transition-shadow duration-200
  overflow-hidden
`

export const inputStyles = `
  w-full px-4 py-3 rounded-lg border border-gray-300
  bg-white text-gray-900 placeholder-gray-500
  focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent
  transition duration-200 ease-in-out
`
