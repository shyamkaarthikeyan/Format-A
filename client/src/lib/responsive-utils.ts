import { useState, useEffect, useCallback } from 'react';

// Breakpoint definitions
export const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

// Screen size detection
export function useScreenSize() {
  const [screenSize, setScreenSize] = useState<{
    width: number;
    height: number;
    breakpoint: Breakpoint;
  }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    breakpoint: 'lg',
  });

  const getBreakpoint = useCallback((width: number): Breakpoint => {
    if (width >= BREAKPOINTS['2xl']) return '2xl';
    if (width >= BREAKPOINTS.xl) return 'xl';
    if (width >= BREAKPOINTS.lg) return 'lg';
    if (width >= BREAKPOINTS.md) return 'md';
    if (width >= BREAKPOINTS.sm) return 'sm';
    return 'xs';
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setScreenSize({
        width,
        height,
        breakpoint: getBreakpoint(width),
      });
    };

    handleResize(); // Set initial size
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getBreakpoint]);

  return screenSize;
}

// Enhanced mobile detection with device type
export function useDeviceType() {
  const [deviceType, setDeviceType] = useState<{
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isTouchDevice: boolean;
    orientation: 'portrait' | 'landscape';
  }>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    orientation: 'landscape',
  });

  useEffect(() => {
    const updateDeviceType = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      const isMobile = width < BREAKPOINTS.md;
      const isTablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg && isTouchDevice;
      const isDesktop = width >= BREAKPOINTS.lg || (!isTouchDevice && width >= BREAKPOINTS.md);
      const orientation = height > width ? 'portrait' : 'landscape';

      setDeviceType({
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        orientation,
      });
    };

    updateDeviceType();
    window.addEventListener('resize', updateDeviceType);
    window.addEventListener('orientationchange', updateDeviceType);
    
    return () => {
      window.removeEventListener('resize', updateDeviceType);
      window.removeEventListener('orientationchange', updateDeviceType);
    };
  }, []);

  return deviceType;
}

// Responsive value hook
export function useResponsiveValue<T>(values: Partial<Record<Breakpoint, T>>, defaultValue: T): T {
  const { breakpoint } = useScreenSize();
  
  // Find the appropriate value for current breakpoint
  const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  
  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp]!;
    }
  }
  
  return defaultValue;
}

// Touch gesture detection
export function useTouchGestures() {
  const [touchState, setTouchState] = useState({
    isSwipeLeft: false,
    isSwipeRight: false,
    isSwipeUp: false,
    isSwipeDown: false,
    isPinching: false,
    scale: 1,
  });

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    let startDistance = 0;

    if (e.touches.length === 2) {
      const touch2 = e.touches[1];
      startDistance = Math.hypot(
        touch2.clientX - touch.clientX,
        touch2.clientY - touch.clientY
      );
    }

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length === 2) {
        const touch1 = moveEvent.touches[0];
        const touch2 = moveEvent.touches[1];
        const currentDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        const scale = currentDistance / startDistance;
        
        setTouchState(prev => ({
          ...prev,
          isPinching: true,
          scale,
        }));
      } else {
        const currentTouch = moveEvent.touches[0];
        const deltaX = currentTouch.clientX - startX;
        const deltaY = currentTouch.clientY - startY;
        const threshold = 50;

        if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
          setTouchState(prev => ({
            ...prev,
            isSwipeLeft: deltaX < -threshold,
            isSwipeRight: deltaX > threshold,
            isSwipeUp: deltaY < -threshold,
            isSwipeDown: deltaY > threshold,
          }));
        }
      }
    };

    const handleTouchEnd = () => {
      setTouchState({
        isSwipeLeft: false,
        isSwipeRight: false,
        isSwipeUp: false,
        isSwipeDown: false,
        isPinching: false,
        scale: 1,
      });
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  }, []);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart);
    return () => document.removeEventListener('touchstart', handleTouchStart);
  }, [handleTouchStart]);

  return touchState;
}

// Responsive layout utilities
export function getResponsiveClasses(
  baseClasses: string,
  responsiveClasses: Partial<Record<Breakpoint, string>>
): string {
  const classes = [baseClasses];
  
  Object.entries(responsiveClasses).forEach(([breakpoint, className]) => {
    if (className) {
      const prefix = breakpoint === 'xs' ? '' : `${breakpoint}:`;
      classes.push(`${prefix}${className}`);
    }
  });
  
  return classes.join(' ');
}

// Adaptive spacing based on screen size
export function useAdaptiveSpacing() {
  const { breakpoint } = useScreenSize();
  
  const spacing = {
    xs: { padding: 'p-2', margin: 'm-2', gap: 'gap-2' },
    sm: { padding: 'p-3', margin: 'm-3', gap: 'gap-3' },
    md: { padding: 'p-4', margin: 'm-4', gap: 'gap-4' },
    lg: { padding: 'p-6', margin: 'm-6', gap: 'gap-6' },
    xl: { padding: 'p-8', margin: 'm-8', gap: 'gap-8' },
    '2xl': { padding: 'p-10', margin: 'm-10', gap: 'gap-10' },
  };
  
  return spacing[breakpoint];
}

// Responsive font sizes
export function useResponsiveFontSize() {
  const { breakpoint } = useScreenSize();
  
  const fontSizes = {
    xs: {
      h1: 'text-2xl',
      h2: 'text-xl',
      h3: 'text-lg',
      body: 'text-sm',
      caption: 'text-xs',
    },
    sm: {
      h1: 'text-3xl',
      h2: 'text-2xl',
      h3: 'text-xl',
      body: 'text-base',
      caption: 'text-sm',
    },
    md: {
      h1: 'text-4xl',
      h2: 'text-3xl',
      h3: 'text-2xl',
      body: 'text-base',
      caption: 'text-sm',
    },
    lg: {
      h1: 'text-5xl',
      h2: 'text-4xl',
      h3: 'text-3xl',
      body: 'text-lg',
      caption: 'text-base',
    },
    xl: {
      h1: 'text-6xl',
      h2: 'text-5xl',
      h3: 'text-4xl',
      body: 'text-lg',
      caption: 'text-base',
    },
    '2xl': {
      h1: 'text-7xl',
      h2: 'text-6xl',
      h3: 'text-5xl',
      body: 'text-xl',
      caption: 'text-lg',
    },
  };
  
  return fontSizes[breakpoint];
}

// Viewport utilities
export function useViewportSize() {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    availableHeight: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    const updateViewport = () => {
      // Account for mobile browser UI (address bar, etc.)
      const availableHeight = window.visualViewport?.height || window.innerHeight;
      
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        availableHeight,
      });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('resize', updateViewport);
    
    return () => {
      window.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('resize', updateViewport);
    };
  }, []);

  return viewport;
}