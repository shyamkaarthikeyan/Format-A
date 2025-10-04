import React from 'react';
import { cn } from '@/lib/utils';
import { useScreenSize, useDeviceType, getResponsiveClasses, type Breakpoint } from '@/lib/responsive-utils';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: Partial<Record<Breakpoint, string>>;
  padding?: Partial<Record<Breakpoint, string>>;
  margin?: Partial<Record<Breakpoint, string>>;
  as?: keyof JSX.IntrinsicElements;
}

export const ResponsiveContainer = React.memo<ResponsiveContainerProps>(({
  children,
  className,
  maxWidth = { xs: 'max-w-full', sm: 'max-w-full', md: 'max-w-4xl', lg: 'max-w-6xl', xl: 'max-w-7xl' },
  padding = { xs: 'px-4', sm: 'px-6', md: 'px-8', lg: 'px-12' },
  margin = { xs: 'mx-auto' },
  as: Component = 'div',
}) => {
  const { breakpoint } = useScreenSize();
  
  const responsiveClasses = getResponsiveClasses('', {
    ...maxWidth,
    ...padding,
    ...margin,
  });

  return (
    <Component className={cn(responsiveClasses, className)}>
      {children}
    </Component>
  );
});

ResponsiveContainer.displayName = 'ResponsiveContainer';