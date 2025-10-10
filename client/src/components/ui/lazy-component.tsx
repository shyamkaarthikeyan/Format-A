import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { LoadingSpinner } from './loading-spinner';
import { useIntersectionObserver } from '@/lib/performance-utils';

interface LazyComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  className?: string;
}

/**
 * Lazy loading wrapper that only renders children when in viewport
 */
export function LazyComponent({
  children,
  fallback = <LoadingSpinner />,
  threshold = 0.1,
  rootMargin = '50px',
  className,
}: LazyComponentProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  const targetRef = useIntersectionObserver(
    (entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && !hasBeenVisible) {
        setIsVisible(true);
        setHasBeenVisible(true);
      }
    },
    { threshold, rootMargin }
  );

  return (
    <div ref={targetRef} className={className}>
      {isVisible || hasBeenVisible ? children : fallback}
    </div>
  );
}

/**
 * Higher-order component for lazy loading React components
 */
export function withLazyLoading<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  const LazyWrappedComponent = React.forwardRef<any, P>((props, ref) => (
    <LazyComponent fallback={fallback}>
      <Component {...(props as P)} />
    </LazyComponent>
  ));

  LazyWrappedComponent.displayName = `LazyLoaded(${Component.displayName || Component.name})`;
  
  return LazyWrappedComponent;
}

/**
 * Dynamic import wrapper with loading state
 */
interface DynamicImportProps {
  importFn: () => Promise<{ default: React.ComponentType<any> }>;
  props?: any;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

export function DynamicImport({
  importFn,
  props = {},
  fallback = <LoadingSpinner />,
  errorFallback = <div>Failed to load component</div>,
}: DynamicImportProps) {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    importFn()
      .then((module) => {
        if (isMounted) {
          setComponent(() => module.default);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [importFn]);

  if (error) {
    return <>{errorFallback}</>;
  }

  if (isLoading || !Component) {
    return <>{fallback}</>;
  }

  return <Component {...props} />;
}

/**
 * Preload component for better UX
 */
export function preloadComponent(importFn: () => Promise<{ default: React.ComponentType<any> }>) {
  return importFn();
}

/**
 * Lazy section component specifically for document sections
 */
interface LazySectionProps {
  isVisible: boolean;
  children: React.ReactNode;
  placeholder?: React.ReactNode;
}

export const LazySection = React.memo<LazySectionProps>(({
  isVisible,
  children,
  placeholder = (
    <div className="h-32 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
      <LoadingSpinner size="sm" />
    </div>
  ),
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);

  useEffect(() => {
    if (isVisible && !shouldRender) {
      // Add a small delay to batch renders
      const timer = setTimeout(() => setShouldRender(true), 50);
      return () => clearTimeout(timer);
    }
  }, [isVisible, shouldRender]);

  return shouldRender ? <>{children}</> : <>{placeholder}</>;
});

LazySection.displayName = 'LazySection';