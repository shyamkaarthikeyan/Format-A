import React, { useEffect, useMemo } from 'react';
import { withPerformanceOptimization, useShallowMemo } from '@/lib/performance-utils';
import { PerformanceMonitor } from '@/components/ui/performance-monitor';
import { OptimizedDocumentForm } from './optimized-document-form';
import { OptimizedPreview } from './optimized-preview';
import { preloadAllNonCriticalComponents } from './lazy-component-manager';
import WorkspaceLayout from '@/components/layout/workspace-layout';
import DocumentTabs from '@/components/layout/document-tabs';
import SidebarNavigation from '@/components/layout/sidebar-navigation';
import type { Document } from '@shared/schema';

interface OptimizedAppProps {
  document: Document;
  onDocumentChange: (document: Document) => void;
  className?: string;
  showPerformanceMonitor?: boolean;
}

export const OptimizedApp = withPerformanceOptimization<OptimizedAppProps>(
  ({ 
    document, 
    onDocumentChange, 
    className,
    showPerformanceMonitor = process.env.NODE_ENV === 'development'
  }) => {
    // Preload non-critical components on mount
    useEffect(() => {
      preloadAllNonCriticalComponents();
    }, []);

    // Memoize document for performance
    const memoizedDocument = useShallowMemo(document);

    // Memoized layout configuration
    const layoutConfig = useMemo(() => ({
      showSidebar: true,
      showTabs: true,
      splitView: true,
    }), []);

    return (
      <div className={className}>
        {/* Performance Monitor (development only) */}
        {showPerformanceMonitor && (
          <PerformanceMonitor 
            enabled={true}
            className="fixed bottom-4 right-4 z-50"
          />
        )}

        {/* Main Application Layout */}
        <div className="flex h-screen bg-gray-50">
          {/* Sidebar */}
          <div className="w-64 bg-white border-r border-gray-200">
            <SidebarNavigation 
              document={memoizedDocument}
              isCollapsed={false}
              onToggleCollapse={() => {}}
              onSectionClick={(sectionId: string) => {
                console.log('Navigate to section:', sectionId);
              }}
              onSubsectionClick={(sectionId: string, subsectionId: string) => {
                console.log('Navigate to subsection:', sectionId, subsectionId);
              }}
              onSectionDelete={(sectionId: string) => {
                console.log('Delete section:', sectionId);
              }}
            />
          </div>
          
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Tabs */}
            <div className="bg-white border-b border-gray-200">
              <DocumentTabs
                documents={[memoizedDocument]}
                activeDocumentId={memoizedDocument.id || 'current'}
                onTabClick={(documentId: string) => {
                  console.log('Tab clicked:', documentId);
                }}
                onTabClose={(documentId: string) => {
                  console.log('Tab closed:', documentId);
                }}
                onNewDocument={() => {
                  console.log('New document requested');
                }}
              />
            </div>
            
            {/* Document Content */}
            <div className="flex h-full">
              {/* Document Editor */}
              <div className="flex-1 p-6 overflow-auto">
                <OptimizedDocumentForm
                  document={memoizedDocument}
                  onDocumentChange={onDocumentChange}
                  className="max-w-4xl mx-auto"
                />
              </div>

              {/* Document Preview */}
              <div className="flex-1 border-l border-gray-200">
                <OptimizedPreview
                  document={memoizedDocument}
                  className="h-full"
                  debounceDelay={1000}
                  onPreviewGenerated={(url) => {
                    console.log('Preview generated:', url);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
  {
    displayName: 'OptimizedApp',
    shouldUpdate: (prev, next) => 
      prev.document !== next.document || 
      prev.onDocumentChange !== next.onDocumentChange ||
      prev.showPerformanceMonitor !== next.showPerformanceMonitor
  }
);