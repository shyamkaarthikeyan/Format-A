import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useDeviceType } from '@/lib/responsive-utils';
import { Button } from './button';
import { Sheet, SheetContent, SheetTrigger } from './sheet';
import { Menu, X } from 'lucide-react';

interface MobileNavigationProps {
  children: React.ReactNode;
  trigger?: React.ReactNode;
  className?: string;
  side?: 'left' | 'right' | 'top' | 'bottom';
}

export const MobileNavigation = React.memo<MobileNavigationProps>(({
  children,
  trigger,
  className,
  side = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isMobile, isTablet } = useDeviceType();

  // Don't render mobile navigation on desktop
  if (!isMobile && !isTablet) {
    return <div className={className}>{children}</div>;
  }

  const defaultTrigger = (
    <Button
      variant="ghost"
      size="sm"
      className="p-2"
      aria-label="Open navigation menu"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || defaultTrigger}
      </SheetTrigger>
      <SheetContent
        side={side}
        className={cn(
          'w-[300px] sm:w-[400px] p-0',
          'flex flex-col',
          className
        )}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Navigation</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
});

MobileNavigation.displayName = 'MobileNavigation';