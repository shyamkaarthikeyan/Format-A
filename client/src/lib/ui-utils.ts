/**
 * UI Utility functions for the enhanced design system
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { designSystem } from "./design-system";

// Enhanced cn function with design system integration
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Animation utilities
export const animations = {
  // Smooth transitions for interactive elements
  smooth: "transition-all duration-300 ease-out",
  fast: "transition-all duration-150 ease-out",
  slow: "transition-all duration-500 ease-out",
  
  // Hover effects
  hover: {
    scale: "hover:scale-105 active:scale-95",
    lift: "hover:-translate-y-1 hover:shadow-lg",
    glow: "hover:shadow-xl hover:shadow-purple-500/25",
  },
  
  // Loading states
  pulse: "animate-pulse",
  spin: "animate-spin",
  bounce: "animate-bounce",
};

// Focus ring utilities
export const focusRing = {
  default: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2",
  inset: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-inset",
  none: "focus-visible:outline-none",
};

// Gradient utilities
export const gradients = {
  primary: "bg-gradient-to-r from-purple-500 to-violet-600",
  secondary: "bg-gradient-to-r from-violet-500 to-fuchsia-600",
  accent: "bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600",
  subtle: "bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50",
  glass: "bg-gradient-to-br from-white/80 via-purple-50/30 to-violet-50/30",
};

// Shadow utilities
export const shadows = {
  soft: "shadow-sm",
  medium: "shadow-md",
  large: "shadow-lg",
  xl: "shadow-xl",
  colored: "shadow-lg shadow-purple-500/25",
  glow: "shadow-2xl shadow-purple-500/20",
};

// Border utilities
export const borders = {
  subtle: "border border-gray-200",
  accent: "border border-purple-200",
  strong: "border-2 border-purple-500",
  gradient: "border border-transparent bg-gradient-to-r from-purple-500 to-violet-600 bg-clip-border",
};

// Typography utilities
export const typography = {
  heading: {
    h1: "text-4xl font-bold tracking-tight",
    h2: "text-3xl font-semibold tracking-tight",
    h3: "text-2xl font-semibold tracking-tight",
    h4: "text-xl font-semibold tracking-tight",
    h5: "text-lg font-semibold tracking-tight",
    h6: "text-base font-semibold tracking-tight",
  },
  body: {
    large: "text-lg leading-relaxed",
    default: "text-base leading-relaxed",
    small: "text-sm leading-relaxed",
    xs: "text-xs leading-relaxed",
  },
  gradient: "bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent",
};

// Layout utilities
export const layout = {
  container: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
  section: "py-12 lg:py-16",
  grid: {
    cols1: "grid grid-cols-1",
    cols2: "grid grid-cols-1 md:grid-cols-2",
    cols3: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    cols4: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  },
  flex: {
    center: "flex items-center justify-center",
    between: "flex items-center justify-between",
    start: "flex items-center justify-start",
    end: "flex items-center justify-end",
  },
};

// Responsive utilities
export const responsive = {
  hide: {
    mobile: "hidden sm:block",
    tablet: "hidden md:block",
    desktop: "hidden lg:block",
  },
  show: {
    mobile: "block sm:hidden",
    tablet: "block md:hidden",
    desktop: "block lg:hidden",
  },
};

// State utilities
export const states = {
  disabled: "opacity-50 cursor-not-allowed pointer-events-none",
  loading: "opacity-75 cursor-wait",
  success: "text-green-600 bg-green-50 border-green-200",
  warning: "text-yellow-600 bg-yellow-50 border-yellow-200",
  error: "text-red-600 bg-red-50 border-red-200",
  info: "text-blue-600 bg-blue-50 border-blue-200",
};

// Helper functions
export const helpers = {
  // Generate consistent spacing classes
  spacing: (size: keyof typeof designSystem.spacing) => `p-${size}`,
  margin: (size: keyof typeof designSystem.spacing) => `m-${size}`,
  
  // Generate consistent color classes
  textColor: (color: string) => `text-${color}`,
  bgColor: (color: string) => `bg-${color}`,
  borderColor: (color: string) => `border-${color}`,
  
  // Conditional classes
  conditional: (condition: boolean, trueClass: string, falseClass = "") =>
    condition ? trueClass : falseClass,
};

// Component composition utilities
export const compose = {
  button: {
    base: cn(
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium",
      animations.smooth,
      focusRing.default,
      "disabled:pointer-events-none disabled:opacity-50"
    ),
    primary: cn(gradients.primary, "text-white shadow-lg", animations.hover.scale),
    secondary: cn("bg-gray-100 text-gray-900 hover:bg-gray-200", animations.hover.scale),
    outline: cn(borders.strong, "bg-transparent text-purple-600 hover:bg-purple-50", animations.hover.scale),
  },
  
  card: {
    base: cn("rounded-lg bg-white", borders.subtle, shadows.soft, animations.smooth),
    elevated: cn("rounded-lg bg-white", borders.subtle, shadows.large),
    glass: cn("rounded-lg backdrop-blur-sm", "bg-white/80 border border-gray-200/50", shadows.large),
    interactive: cn("cursor-pointer", animations.hover.lift),
  },
  
  input: {
    base: cn(
      "flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm",
      animations.smooth,
      focusRing.default,
      "placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
    ),
  },
};