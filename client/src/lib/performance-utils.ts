import React, { useCallback, useRef, useEffect, useMemo } from 'react';

/**
 * Debounce hook for performance optimization
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;
}

/**
 * Throttle hook for performance optimization
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());
  
  return useCallback((...args: Parameters<T>) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = Date.now();
    }
  }, [callback, delay]) as T;
}

/**
 * Virtual scrolling hook for large lists
 */
export function useVirtualScrolling({
  itemCount,
  itemHeight,
  containerHeight,
  overscan = 5,
}: {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const scrollTop = useRef(0);
  
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop.current / itemHeight);
    const endIndex = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop.current + containerHeight) / itemHeight)
    );
    
    return {
      start: Math.max(0, startIndex - overscan),
      end: Math.min(itemCount - 1, endIndex + overscan),
    };
  }, [itemCount, itemHeight, containerHeight, overscan]);
  
  const handleScroll = useThrottle((e: Event) => {
    const target = e.target as HTMLDivElement;
    scrollTop.current = target.scrollTop;
  }, 16); // ~60fps
  
  useEffect(() => {
    const element = scrollElementRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);
  
  return {
    scrollElementRef,
    visibleRange,
    totalHeight: itemCount * itemHeight,
    offsetY: visibleRange.start * itemHeight,
  };
}

/**
 * Intersection Observer hook for lazy loading
 */
export function useIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
) {
  const targetRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    
    const observer = new IntersectionObserver(callback, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options,
    });
    
    observer.observe(target);
    
    return () => {
      observer.unobserve(target);
      observer.disconnect();
    };
  }, [callback, options]);
  
  return targetRef;
}

/**
 * Memoized component wrapper for performance
 */
export function createMemoizedComponent<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  areEqual?: (prevProps: T, nextProps: T) => boolean
) {
  return React.memo(Component, areEqual);
}

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitor(name: string) {
  const startTime = useRef<number>();
  
  useEffect(() => {
    startTime.current = performance.now();
    
    return () => {
      if (startTime.current) {
        const duration = performance.now() - startTime.current;
        console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
      }
    };
  });
}

/**
 * Optimized state update hook
 */
export function useOptimizedState<T>(
  initialState: T,
  equalityFn?: (prev: T, next: T) => boolean
) {
  const [state, setState] = React.useState(initialState);
  const prevState = useRef(initialState);
  
  const optimizedSetState = useCallback((newState: T | ((prev: T) => T)) => {
    setState(prev => {
      const next = typeof newState === 'function' ? (newState as (prev: T) => T)(prev) : newState;
      
      // Use custom equality function or shallow comparison
      const isEqual = equalityFn ? equalityFn(prev, next) : Object.is(prev, next);
      
      if (isEqual) {
        return prev; // Prevent unnecessary re-renders
      }
      
      prevState.current = prev;
      return next;
    });
  }, [equalityFn]);
  
  return [state, optimizedSetState] as const;
}

/**
 * Batch updates hook for multiple state changes
 */
export function useBatchedUpdates() {
  const updates = useRef<(() => void)[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const batchUpdate = useCallback((updateFn: () => void) => {
    updates.current.push(updateFn);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      React.unstable_batchedUpdates(() => {
        updates.current.forEach(fn => fn());
        updates.current = [];
      });
    }, 0);
  }, []);
  
  return batchUpdate;
}

/**
 * Advanced virtual scrolling with dynamic heights
 */
export function useAdvancedVirtualScrolling<T>({
  items,
  estimatedItemHeight,
  containerHeight,
  overscan = 5,
  getItemHeight,
}: {
  items: T[];
  estimatedItemHeight: number;
  containerHeight: number;
  overscan?: number;
  getItemHeight?: (item: T, index: number) => number;
}) {
  const [scrollTop, setScrollTop] = React.useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const itemHeights = useRef<Map<number, number>>(new Map());
  const totalHeight = useRef(0);

  // Calculate item positions and total height
  const itemPositions = useMemo(() => {
    const positions: number[] = [];
    let currentPosition = 0;
    
    for (let i = 0; i < items.length; i++) {
      positions[i] = currentPosition;
      const height = getItemHeight ? getItemHeight(items[i], i) : 
                    itemHeights.current.get(i) || estimatedItemHeight;
      currentPosition += height;
    }
    
    totalHeight.current = currentPosition;
    return positions;
  }, [items, estimatedItemHeight, getItemHeight]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    let startIndex = 0;
    let endIndex = items.length - 1;

    // Binary search for start index
    let left = 0, right = items.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (itemPositions[mid] < scrollTop) {
        startIndex = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    // Find end index
    const viewportBottom = scrollTop + containerHeight;
    for (let i = startIndex; i < items.length; i++) {
      if (itemPositions[i] > viewportBottom) {
        endIndex = i - 1;
        break;
      }
    }

    return {
      start: Math.max(0, startIndex - overscan),
      end: Math.min(items.length - 1, endIndex + overscan),
    };
  }, [scrollTop, containerHeight, itemPositions, items.length, overscan]);

  const handleScroll = useThrottle((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, 16);

  const updateItemHeight = useCallback((index: number, height: number) => {
    itemHeights.current.set(index, height);
  }, []);

  return {
    scrollElementRef,
    visibleRange,
    totalHeight: totalHeight.current,
    handleScroll,
    updateItemHeight,
    getItemOffset: (index: number) => itemPositions[index] || 0,
  };
}

/**
 * Optimized component re-rendering with shallow comparison
 */
export function useShallowMemo<T>(value: T): T {
  const ref = useRef<T>(value);
  
  const isEqual = useMemo(() => {
    if (typeof value !== 'object' || value === null) {
      return Object.is(ref.current, value);
    }
    
    const prevKeys = Object.keys(ref.current as any);
    const nextKeys = Object.keys(value as any);
    
    if (prevKeys.length !== nextKeys.length) {
      return false;
    }
    
    for (const key of nextKeys) {
      if (!Object.is((ref.current as any)[key], (value as any)[key])) {
        return false;
      }
    }
    
    return true;
  }, [value]);
  
  if (!isEqual) {
    ref.current = value;
  }
  
  return ref.current;
}

/**
 * Debounced preview updates for smooth performance
 */
export function useDebouncedPreview<T>(
  value: T,
  delay: number,
  generatePreview: (value: T) => Promise<void>
) {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const generationCountRef = useRef(0);

  const debouncedGenerate = useDebounce(async (val: T) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const currentGeneration = ++generationCountRef.current;
    abortControllerRef.current = new AbortController();
    
    setIsGenerating(true);
    
    try {
      await generatePreview(val);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Preview generation failed:', error);
      }
    } finally {
      if (currentGeneration === generationCountRef.current) {
        setIsGenerating(false);
      }
    }
  }, delay);

  useEffect(() => {
    debouncedGenerate(value);
  }, [value, debouncedGenerate]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { isGenerating };
}

/**
 * Optimized list rendering with memoization
 */
export function useOptimizedList<T>(
  items: T[],
  keyExtractor: (item: T, index: number) => string,
  renderItem: (item: T, index: number) => React.ReactNode,
  dependencies: React.DependencyList = []
) {
  const memoizedItems = useMemo(() => {
    return items.map((item, index) => ({
      key: keyExtractor(item, index),
      element: renderItem(item, index),
      item,
      index,
    }));
  }, [items, keyExtractor, renderItem, ...dependencies]);

  return memoizedItems;
}

/**
 * Performance-optimized component wrapper
 */
export function withPerformanceOptimization<P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  options: {
    displayName?: string;
    areEqual?: (prevProps: P, nextProps: P) => boolean;
    shouldUpdate?: (prevProps: P, nextProps: P) => boolean;
  } = {}
) {
  const { displayName, areEqual, shouldUpdate } = options;
  
  const OptimizedComponent = React.memo(Component, areEqual || ((prev, next) => {
    if (shouldUpdate) {
      return !shouldUpdate(prev, next);
    }
    
    // Default shallow comparison
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);
    
    if (prevKeys.length !== nextKeys.length) {
      return false;
    }
    
    for (const key of prevKeys) {
      if (!Object.is(prev[key], next[key])) {
        return false;
      }
    }
    
    return true;
  }));

  OptimizedComponent.displayName = displayName || `Optimized(${Component.displayName || Component.name})`;
  
  return OptimizedComponent;
}