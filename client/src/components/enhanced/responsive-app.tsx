import React, { useEffect, useMemo } from 'react';
import { withPerformanceOptimization, useShallowMemo } from '@/lib/performance-utils';
import { useDeviceType, useViewportSize } from '@/lib/responsive-utils';
import { PerformanceMonitor } from '@/components/ui/performance-monitor';
import { ResponsiveDocumentForm } from './responsive-document-form';
import { ResponsivePreview } from './responsive-preview';
import { ResponsiveLayout } from '@/components/layout/responsive-layout';
import { preloadAllNonCriticalComponents } from './lazy-component-manager';
import { DocumentTabs } from '@/components/layout/document-tabs';
import { SidebarNavigation } from '@/components/layout/sidebar-navigation';
import { cn } from '@/lib/utils';
import type { Document } from '@shared/schema';

interface ResponsiveAppProps {
  document: Document;
  onDocumentChange: (document: Document) => void;
  className?: string;
  showPerformanceMonitor?: boolean;
}

export const ResponsiveApp = withPerformanceOptimization<ResponsiveAppProps>(
  ({ 
    document, 
    onDocumentChange, 
    className,
    showPerformanceMonitor = process.env.NODE_ENV === 'development'
  }) => {
    const { isMobile, isTablet } = useDeviceType();
    const { availableHeight } = useViewportSize();

    // Preload non-critical components on mount
    useEffect(() => {
      preloadAllNonCriticalComponents();
    }, []);

    // Memoize document for performance
    const memoizedDocument = useShallowMemo(document);

    // Responsive layout configuration
    const layoutConfig = useMemo(() => ({
      sidebarCollapsible: true,
      sidebarDefaultCollapsed: isMobile || isTablet,
    }), [isMobile, isTablet]);

    // Mobile layout
    if (isMobile) {
      return (
        <div 
          className={cn('flex flex-col', className)}
          style={{ minHeight: availableHeight }}
        >
          {/* Performance Monitor (development only) */}
          {showPerformanceMonitor && (
            <PerformanceMonitor 
              enabled={true}
              className="fixed bottom-4 right-4 z-50"
            />
          )}

          {/* Mobile Header with Tabs */}
          <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
            <DocumentTabs
              documents={[memoizedDocument]}
              activeDocumentId={memoizedDocument.id || 'current'}
              onTabChange={(documentId) => {
                console.log('Switch to document:', documentId);
              }}
            />
          </header>

          {/* Mobile Main Content - Tabbed Interface */}
          <main className="flex-1 overflow-hidden">
            <div className="h-full">
              {/* Tab Content */}
              <div className="flex h-full">
                {/* Document Editor Tab */}
                <div className="w-full h-full overflow-auto">
                  <div className="p-4">
                    <ResponsiveDocumentForm
                      document={memoizedDocument}
                      onDocumentChange={onDocumentChange}
                    />
                  </div>
                </div>
              </div>
              
              {/* Mobile Preview - Separate Screen/Modal */}
              <div className="fixed inset-0 z-30 bg-white transform translate-x-full transition-transform">
                <ResponsivePreview
                  document={memoizedDocument}
                  className="h-full"
                  debounceDelay={1000}
                  onPreviewGenerated={(url) => {
                    console.log('Preview generated:', url);
                  }}
                />
              </div>
            </div>
          </main>
        </div>
      );
    }

    // Tablet layout
    if (isTablet) {
      return (
        <div className={className}>
          {/* Performance Monitor (development only) */}
          {showPerformanceMonitor && (
            <PerformanceMonitor 
              enabled={true}
              className="fixed bottom-4 right-4 z-50"
            />
          )}

          <ResponsiveLayout
            header={
              <DocumentTabs
                documents={[memoizedDocument]}
                activeDocumentId={memoizedDocument.id || 'current'}
                onTabChange={(documentId) => {
                  console.log('Switch to document:', documentId);
                }}
              />
            }
            sidebar={
              <SidebarNavigation 
                document={memoizedDocument}
                onSectionSelect={(sectionId) => {
                  console.log('Navigate to section:', sectionId);
                }}
              />
            }
            sidebarCollapsible={true}
            sidebarDefaultCollapsed={false}
          >
            {/* Tablet Split View */}
            <div className="flex flex-col h-full">
              {/* Document Editor */}
              <div className="flex-1 overflow-auto mb-4">
                <ResponsiveDocumentForm
                  document={memoizedDocument}
                  onDocumentChange={onDocumentChange}
                />
              </div>

              {/* Document Preview */}
              <div className="h-1/2 border-t border-gray-200 pt-4">
                <ResponsivePreview
                  document={memoizedDocument}
                  className="h-full"
                  debounceDelay={1000}
                  onPreviewGenerated={(url) => {
                    console.log('Preview generated:', url);
                  }}
                />
              </div>
            </div>
          </ResponsiveLayout>
        </div>
      );
    }

    // Desktop layout
    return (
      <div className={className}>
        {/* Performance Monitor (development only) */}
        {showPerformanceMonitor && (
          <PerformanceMonitor 
            enabled={true}
            className="fixed bottom-4 right-4 z-50"
          />
        )}

        <ResponsiveLayout
          header={
            <DocumentTabs
              documents={[memoizedDocument]}
              activeDocumentId={memoizedDocument.id || 'current'}
              onTabChange={(documentId) => {
                console.log('Switch to document:', documentId);
              }}
            />
          }
          sidebar={
            <SidebarNavigation 
              document={memoizedDocument}
              onSectionSelect={(sectionId) => {
                console.log('Navigate to section:', sectionId);
              }}
            />
          }
          sidebarCollapsible={true}
          sidebarDefaultCollapsed={false}
        >
          {/* Desktop Split View */}
          <div className="flex h-full">
            {/* Document Editor */}
            <div className="flex-1 overflow-auto pr-4">
              <ResponsiveDocumentForm
                document={memoizedDocument}
                onDocumentChange={onDocumentChange}
              />
            </div>

            {/* Document Preview */}
            <div className="flex-1 border-l border-gray-200 pl-4">
              <ResponsivePreview
                document={memoizedDocument}
                className="h-full"
                debounceDelay={1000}
                onPreviewGenerated={(url) => {
                  console.log('Preview generated:', url);
                }}
              />
            </div>
          </div>
        </ResponsiveLayout>
      </div>
    );
  },
  {
    displayName: 'ResponsiveApp',
    shouldUpdate: (prev, next) => 
      prev.document !== next.document || 
      prev.onDocumentChange !== next.onDocumentChange ||
      prev.showPerformanceMonitor !== next.showPerformanceMonitor
  }
);