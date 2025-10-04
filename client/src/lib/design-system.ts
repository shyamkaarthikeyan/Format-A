/**
 * Enhanced Design System for Format A
 * Provides consistent design tokens, colors, spacing, and typography
 */

// Color System - Extended purple-violet gradient with semantic roles
export const colors = {
  // Primary brand colors
  brand: {
    50: '#faf7ff',
    100: '#f3ecff',
    200: '#e9d8ff',
    300: '#d8b9ff',
    400: '#c084fc',
    500: '#a855f7', // Primary brand color
    600: '#9333ea',
    700: '#7c3aed',
    800: '#6b21a8',
    900: '#581c87',
    950: '#3b0764',
  },
  
  // Secondary accent colors
  accent: {
    50: '#fdf4ff',
    100: '#fae8ff',
    200: '#f5d0fe',
    300: '#f0abfc',
    400: '#e879f9',
    500: '#d946ef', // Secondary accent
    600: '#c026d3',
    700: '#a21caf',
    800: '#86198f',
    900: '#701a75',
    950: '#4a044e',
  },
  
  // Semantic colors
  semantic: {
    success: {
      50: '#f0fdf4',
      500: '#22c55e',
      600: '#16a34a',
    },
    warning: {
      50: '#fffbeb',
      500: '#f59e0b',
      600: '#d97706',
    },
    error: {
      50: '#fef2f2',
      500: '#ef4444',
      600: '#dc2626',
    },
    info: {
      50: '#eff6ff',
      500: '#3b82f6',
      600: '#2563eb',
    },
  },
  
  // Neutral grays
  neutral: {
    0: '#ffffff',
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
} as const;

// Spacing System - 8px grid system
export const spacing = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',
  40: '160px',
  48: '192px',
  56: '224px',
  64: '256px',
} as const;

// Typography System
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    serif: ['Crimson Text', 'Georgia', 'serif'],
    mono: ['JetBrains Mono', 'Consolas', 'monospace'],
  },
  
  fontSize: {
    xs: ['12px', { lineHeight: '16px', letterSpacing: '0.025em' }],
    sm: ['14px', { lineHeight: '20px', letterSpacing: '0.025em' }],
    base: ['16px', { lineHeight: '24px', letterSpacing: '0em' }],
    lg: ['18px', { lineHeight: '28px', letterSpacing: '-0.025em' }],
    xl: ['20px', { lineHeight: '28px', letterSpacing: '-0.025em' }],
    '2xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.025em' }],
    '3xl': ['30px', { lineHeight: '36px', letterSpacing: '-0.025em' }],
    '4xl': ['36px', { lineHeight: '40px', letterSpacing: '-0.05em' }],
    '5xl': ['48px', { lineHeight: '1', letterSpacing: '-0.05em' }],
    '6xl': ['60px', { lineHeight: '1', letterSpacing: '-0.05em' }],
  },
  
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
} as const;

// Border Radius System
export const borderRadius = {
  none: '0px',
  sm: '4px',
  base: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  full: '9999px',
} as const;

// Shadow System
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
} as const;

// Animation System
export const animations = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
  
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
} as const;

// Breakpoints for responsive design
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Z-index scale
export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const;

// Component variants for consistent styling
export const componentVariants = {
  button: {
    size: {
      xs: 'px-2 py-1 text-xs',
      sm: 'px-3 py-1.5 text-sm',
      base: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
      xl: 'px-8 py-4 text-xl',
    },
    
    variant: {
      primary: 'bg-gradient-to-r from-brand-500 to-accent-500 text-white hover:from-brand-600 hover:to-accent-600',
      secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 border border-neutral-300',
      outline: 'border-2 border-brand-500 text-brand-600 hover:bg-brand-50',
      ghost: 'text-neutral-700 hover:bg-neutral-100',
      danger: 'bg-semantic-error-500 text-white hover:bg-semantic-error-600',
    },
  },
  
  card: {
    variant: {
      default: 'bg-white border border-neutral-200 shadow-base',
      elevated: 'bg-white border border-neutral-200 shadow-lg',
      glass: 'bg-white/80 backdrop-blur-sm border border-neutral-200/50 shadow-lg',
      gradient: 'bg-gradient-to-br from-white via-brand-50/30 to-accent-50/30 border border-brand-200/50 shadow-lg',
    },
  },
} as const;

// Utility functions for design system
export const designSystem = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  animations,
  breakpoints,
  zIndex,
  componentVariants,
  
  // Helper functions
  getColor: (path: string) => {
    const keys = path.split('.');
    let value: any = colors;
    for (const key of keys) {
      value = value[key];
    }
    return value;
  },
  
  getSpacing: (size: keyof typeof spacing) => spacing[size],
  
  getShadow: (size: keyof typeof shadows) => shadows[size],
} as const;

export type DesignSystem = typeof designSystem;
export type ColorPath = keyof typeof colors;
export type SpacingSize = keyof typeof spacing;
export type ShadowSize = keyof typeof shadows;