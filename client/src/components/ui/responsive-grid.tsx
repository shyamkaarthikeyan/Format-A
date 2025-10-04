import React from 'react';
import { cn } from '@/lib/utils';
import { useScreenSize, getResponsiveClasses, type Breakpoint } from '@/lib/responsive-utils';

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: Partial<Record<Breakpoint, number>>;
  gap?: Partial<Record<Breakpoint, string>>;
  autoFit?: boolean;
  minItemWidth?: string;
}

export const ResponsiveGrid = React.memo<ResponsiveGridProps>(({
  children,
  className,
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = { xs: 'gap-4', sm: 'gap-6', md: 'gap-8' },
  autoFit = false,
  minItemWidth = '250px',
}) => {
  const { breakpoint } = useScreenSize();

  const getGridColumns = () => {
    if (autoFit) {
      return `repeat(auto-fit, minmax(${minItemWidth}, 1fr))`;
    }
    
    // Find the appropriate column count for current breakpoint
    const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = breakpointOrder.indexOf(breakpoint);
    
    for (let i = currentIndex; i < breakpointOrder.length; i++) {
      const bp = breakpointOrder[i];
      if (columns[bp] !== undefined) {
        return `repeat(${columns[bp]}, 1fr)`;
      }
    }
    
    return 'repeat(1, 1fr)';
  };

  const gapClasses = getResponsiveClasses('', gap);

  return (
    <div
      className={cn('grid', gapClasses, className)}
      style={{
        gridTemplateColumns: getGridColumns(),
      }}
    >
      {children}
    </div>
  );
});

ResponsiveGrid.displayName = 'ResponsiveGrid';