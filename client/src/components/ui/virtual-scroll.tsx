import React, { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useAdvancedVirtualScrolling, withPerformanceOptimization } from '@/lib/performance-utils';

interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
}

export function VirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className,
  onScroll,
}: VirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;
  
  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  return (
    <div
      ref={scrollElementRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
              className="flex-shrink-0"
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Specialized virtual scroll for sections
interface VirtualSectionScrollProps {
  sections: any[];
  renderSection: (section: any, index: number) => React.ReactNode;
  className?: string;
  estimatedItemHeight?: number;
}

export const VirtualSectionScroll = React.memo<VirtualSectionScrollProps>(({
  sections,
  renderSection,
  className,
  estimatedItemHeight = 200,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  return (
    <div ref={containerRef} className={cn('h-full', className)}>
      <VirtualScroll
        items={sections}
        itemHeight={estimatedItemHeight}
        containerHeight={containerHeight}
        renderItem={renderSection}
        overscan={2}
      />
    </div>
  );
});

VirtualSectionScroll.displayName = 'VirtualSectionScroll';

// Advanced virtual scroll with dynamic heights
interface AdvancedVirtualScrollProps<T> {
  items: T[];
  estimatedItemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number, updateHeight: (height: number) => void) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  getItemHeight?: (item: T, index: number) => number;
}

export function AdvancedVirtualScroll<T>({
  items,
  estimatedItemHeight,
  containerHeight,
  renderItem,
  keyExtractor,
  overscan = 5,
  className,
  onScroll,
  getItemHeight,
}: AdvancedVirtualScrollProps<T>) {
  const {
    scrollElementRef,
    visibleRange,
    totalHeight,
    handleScroll,
    updateItemHeight,
    getItemOffset,
  } = useAdvancedVirtualScrolling({
    items,
    estimatedItemHeight,
    containerHeight,
    overscan,
    getItemHeight,
  });

  const visibleItems = items.slice(visibleRange.start, visibleRange.end + 1);

  const handleScrollWithCallback = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    handleScroll(e);
    onScroll?.(e.currentTarget.scrollTop);
  }, [handleScroll, onScroll]);

  return (
    <div
      ref={scrollElementRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScrollWithCallback}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => {
          const actualIndex = visibleRange.start + index;
          const offset = getItemOffset(actualIndex);
          
          return (
            <div
              key={keyExtractor(item, actualIndex)}
              style={{
                position: 'absolute',
                top: offset,
                left: 0,
                right: 0,
              }}
            >
              {renderItem(item, actualIndex, (height) => updateItemHeight(actualIndex, height))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Performance-optimized document sections virtual scroll
interface OptimizedDocumentSectionsProps {
  sections: any[];
  renderSection: (section: any, index: number) => React.ReactNode;
  className?: string;
  estimatedSectionHeight?: number;
}

export const OptimizedDocumentSections = withPerformanceOptimization<OptimizedDocumentSectionsProps>(
  ({ sections, renderSection, className, estimatedSectionHeight = 250 }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState(600);

    useEffect(() => {
      const updateHeight = () => {
        if (containerRef.current) {
          setContainerHeight(containerRef.current.clientHeight);
        }
      };

      updateHeight();
      const resizeObserver = new ResizeObserver(updateHeight);
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      return () => resizeObserver.disconnect();
    }, []);

    const keyExtractor = useCallback((section: any, index: number) => 
      section.id || `section-${index}`, []);

    const renderOptimizedSection = useCallback((section: any, index: number, updateHeight: (height: number) => void) => {
      return (
        <div
          ref={(el) => {
            if (el) {
              const height = el.getBoundingClientRect().height;
              if (height > 0) {
                updateHeight(height);
              }
            }
          }}
        >
          {renderSection(section, index)}
        </div>
      );
    }, [renderSection]);

    return (
      <div ref={containerRef} className={cn('h-full', className)}>
        <AdvancedVirtualScroll
          items={sections}
          estimatedItemHeight={estimatedSectionHeight}
          containerHeight={containerHeight}
          renderItem={renderOptimizedSection}
          keyExtractor={keyExtractor}
          overscan={3}
        />
      </div>
    );
  },
  {
    displayName: 'OptimizedDocumentSections',
    shouldUpdate: (prev, next) => 
      prev.sections !== next.sections || 
      prev.renderSection !== next.renderSection ||
      prev.estimatedSectionHeight !== next.estimatedSectionHeight
  }
);