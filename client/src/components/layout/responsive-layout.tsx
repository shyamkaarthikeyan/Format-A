import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useDeviceType, useViewportSize } from '@/lib/responsive-utils';
import { MobileNavigation } from '@/components/ui/mobile-navigation';
import { Button } from '@/components/ui/button';
import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  sidebarCollapsible?: boolean;
  sidebarDefaultCollapsed?: boolean;
}

export const ResponsiveLayout = React.memo<ResponsiveLayoutProps>(({
  children,
  sidebar,
  header,
  footer,
  className,
  sidebarCollapsible = true,
  sidebarDefaultCollapsed = false,
}) => {
  const { isMobile, isTablet } = useDeviceType();
  const { availableHeight } = useViewportSize();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(sidebarDefaultCollapsed);

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  // Mobile layout
  if (isMobile) {
    return (
      <div 
        className={cn('flex flex-col', className)}
        style={{ minHeight: availableHeight }}
      >
        {/* Mobile Header */}
        {header && (
          <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              {sidebar && (
                <MobileNavigation side="left">
                  {sidebar}
                </MobileNavigation>
              )}
              <div className="flex-1 ml-4">
                {header}
              </div>
            </div>
          </header>
        )}

        {/* Mobile Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4">
            {children}
          </div>
        </main>

        {/* Mobile Footer */}
        {footer && (
          <footer className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
            {footer}
          </footer>
        )}
      </div>
    );
  }

  // Tablet layout
  if (isTablet) {
    return (
      <div 
        className={cn('flex flex-col h-screen', className)}
        style={{ height: availableHeight }}
      >
        {/* Tablet Header */}
        {header && (
          <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              {sidebar && sidebarCollapsible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSidebar}
                  className="mr-4"
                  aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}
              <div className="flex-1">
                {header}
              </div>
            </div>
          </header>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Tablet Sidebar */}
          {sidebar && (
            <aside className={cn(
              'bg-gray-50 border-r border-gray-200 transition-all duration-300',
              sidebarCollapsed ? 'w-16' : 'w-64'
            )}>
              <div className="h-full overflow-auto p-4">
                {sidebar}
              </div>
            </aside>
          )}

          {/* Tablet Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-6">
              {children}
            </div>
          </main>
        </div>

        {/* Tablet Footer */}
        {footer && (
          <footer className="bg-white border-t border-gray-200 p-4">
            {footer}
          </footer>
        )}
      </div>
    );
  }

  // Desktop layout
  return (
    <div className={cn('flex h-screen', className)}>
      {/* Desktop Sidebar */}
      {sidebar && (
        <aside className={cn(
          'bg-gray-50 border-r border-gray-200 transition-all duration-300 flex flex-col',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}>
          {sidebarCollapsible && (
            <div className="p-2 border-b border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="w-full justify-center"
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
          <div className="flex-1 overflow-auto p-4">
            {sidebar}
          </div>
        </aside>
      )}

      {/* Desktop Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop Header */}
        {header && (
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            {header}
          </header>
        )}

        {/* Desktop Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>

        {/* Desktop Footer */}
        {footer && (
          <footer className="bg-white border-t border-gray-200 p-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
});

ResponsiveLayout.displayName = 'ResponsiveLayout';