import React, { useMemo, useCallback } from 'react';
import { useDebounce, withPerformanceOptimization, useShallowMemo } from '@/lib/performance-utils';
import { useDeviceType, useAdaptiveSpacing, useResponsiveFontSize } from '@/lib/responsive-utils';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { ResponsiveGrid } from '@/components/ui/responsive-grid';
import { ResponsiveInput } from '@/components/ui/responsive-input';
import { ResponsiveTextarea } from '@/components/ui/responsive-textarea';
import { TouchFriendlyButton } from '@/components/ui/touch-friendly-button';
import { LazyComponent } from '@/components/ui/lazy-component';
import { OptimizedDocumentSections } from '@/components/ui/virtual-scroll';
import { cn } from '@/lib/utils';
import type { Document, Section } from '@shared/schema';

interface ResponsiveDocumentFormProps {
  document: Document;
  onDocumentChange: (document: Document) => void;
  className?: string;
}

// Memoized responsive section component
const ResponsiveSectionComponent = withPerformanceOptimization<{
  section: Section;
  index: number;
  onSectionChange: (section: Section) => void;
  onSectionDelete: (index: number) => void;
}>(
  ({ section, index, onSectionChange, onSectionDelete }) => {
    const { isMobile } = useDeviceType();
    const spacing = useAdaptiveSpacing();
    const fontSizes = useResponsiveFontSize();

    const handleTitleChange = useCallback((title: string) => {
      onSectionChange({ ...section, title });
    }, [section, onSectionChange]);

    const handleContentChange = useCallback((contentBlocks: any[]) => {
      onSectionChange({ ...section, contentBlocks });
    }, [section, onSectionChange]);

    return (
      <LazyComponent
        fallback={
          <div className={cn(
            'bg-gray-100 animate-pulse rounded-lg',
            isMobile ? 'h-32' : 'h-48'
          )} />
        }
      >
        <div className={cn(
          'border rounded-lg bg-white shadow-sm',
          spacing.padding,
          spacing.gap
        )}>
          <div className="flex items-center justify-between mb-4">
            <ResponsiveInput
              value={section.title || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTitleChange(e.target.value)}
              placeholder={`Section ${index + 1} Title`}
              className={cn(
                'border-none bg-transparent font-semibold flex-1 mr-2',
                fontSizes.h3
              )}
            />
            <TouchFriendlyButton
              variant="ghost"
              size="sm"
              onClick={() => onSectionDelete(index)}
              className="text-red-500 hover:text-red-700 shrink-0"
              aria-label="Delete section"
            >
              ×
            </TouchFriendlyButton>
          </div>
          
          <div className={cn('space-y-3', spacing.gap)}>
            {section.contentBlocks?.map((block, blockIndex) => (
              <div key={blockIndex} className="p-3 bg-gray-50 rounded">
                <div className={cn('text-gray-600 mb-2', fontSizes.caption)}>
                  {block.type || 'Text'}
                </div>
                <ResponsiveTextarea
                  value={block.content || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                    const newBlocks = [...(section.contentBlocks || [])];
                    newBlocks[blockIndex] = { ...block, content: e.target.value };
                    handleContentChange(newBlocks);
                  }}
                  placeholder="Enter content..."
                  autoResize={true}
                  rows={isMobile ? 2 : 3}
                />
              </div>
            ))}
            
            <TouchFriendlyButton
              variant="ghost"
              size="sm"
              onClick={() => {
                const newBlocks = [...(section.contentBlocks || []), { type: 'text', content: '' }];
                handleContentChange(newBlocks);
              }}
              className="text-blue-600 hover:text-blue-800 w-full justify-center"
            >
              + Add Content Block
            </TouchFriendlyButton>
          </div>
        </div>
      </LazyComponent>
    );
  },
  {
    displayName: 'ResponsiveSectionComponent',
    shouldUpdate: (prev, next) => 
      prev.section !== next.section || 
      prev.index !== next.index
  }
);

export const ResponsiveDocumentForm = withPerformanceOptimization<ResponsiveDocumentFormProps>(
  ({ document, onDocumentChange, className }) => {
    const { isMobile, isTablet } = useDeviceType();
    const spacing = useAdaptiveSpacing();
    const fontSizes = useResponsiveFontSize();

    // Memoize document metadata to prevent unnecessary re-renders
    const documentMetadata = useShallowMemo({
      title: document.title,
      abstract: document.abstract,
      keywords: document.keywords,
    });

    // Debounced document updates
    const debouncedDocumentChange = useDebounce(onDocumentChange, 300);

    // Memoized handlers
    const handleTitleChange = useCallback((title: string) => {
      const updatedDocument = { ...document, title };
      debouncedDocumentChange(updatedDocument);
    }, [document, debouncedDocumentChange]);

    const handleAbstractChange = useCallback((abstract: string) => {
      const updatedDocument = { ...document, abstract };
      debouncedDocumentChange(updatedDocument);
    }, [document, debouncedDocumentChange]);

    const handleKeywordsChange = useCallback((keywords: string) => {
      const updatedDocument = { ...document, keywords };
      debouncedDocumentChange(updatedDocument);
    }, [document, debouncedDocumentChange]);

    const handleSectionChange = useCallback((index: number, section: Section) => {
      const newSections = [...(document.sections || [])];
      newSections[index] = section;
      const updatedDocument = { ...document, sections: newSections };
      onDocumentChange(updatedDocument);
    }, [document, onDocumentChange]);

    const handleSectionDelete = useCallback((index: number) => {
      const newSections = [...(document.sections || [])];
      newSections.splice(index, 1);
      const updatedDocument = { ...document, sections: newSections };
      onDocumentChange(updatedDocument);
    }, [document, onDocumentChange]);

    const handleAddSection = useCallback(() => {
      const newSection: Section = {
        id: `section-${Date.now()}`,
        title: '',
        contentBlocks: [{ type: 'text', content: '' }],
      };
      const newSections = [...(document.sections || []), newSection];
      const updatedDocument = { ...document, sections: newSections };
      onDocumentChange(updatedDocument);
    }, [document, onDocumentChange]);

    // Memoized section renderer
    const renderSection = useCallback((section: Section, index: number) => (
      <ResponsiveSectionComponent
        key={section.id || `section-${index}`}
        section={section}
        index={index}
        onSectionChange={(updatedSection) => handleSectionChange(index, updatedSection)}
        onSectionDelete={handleSectionDelete}
      />
    ), [handleSectionChange, handleSectionDelete]);

    // Memoized sections list
    const sections = useMemo(() => document.sections || [], [document.sections]);

    return (
      <ResponsiveContainer className={className}>
        <div className={cn('space-y-6', spacing.gap)}>
          {/* Document Metadata */}
          <ResponsiveGrid
            columns={{ xs: 1, md: 1 }}
            gap={{ xs: 'gap-4', md: 'gap-6' }}
          >
            <div>
              <label className={cn(
                'block font-medium text-gray-700 mb-2',
                fontSizes.body
              )}>
                Title
              </label>
              <ResponsiveInput
                value={documentMetadata.title || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTitleChange(e.target.value)}
                placeholder="Enter document title..."
                className="w-full"
              />
            </div>

            <div>
              <label className={cn(
                'block font-medium text-gray-700 mb-2',
                fontSizes.body
              )}>
                Abstract
              </label>
              <ResponsiveTextarea
                value={documentMetadata.abstract || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleAbstractChange(e.target.value)}
                placeholder="Enter abstract..."
                rows={isMobile ? 3 : 4}
                autoResize={true}
              />
            </div>

            <div>
              <label className={cn(
                'block font-medium text-gray-700 mb-2',
                fontSizes.body
              )}>
                Keywords
              </label>
              <ResponsiveInput
                value={documentMetadata.keywords || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleKeywordsChange(e.target.value)}
                placeholder="Enter keywords separated by commas..."
                className="w-full"
              />
            </div>
          </ResponsiveGrid>

          {/* Sections */}
          <div className={cn('space-y-4', spacing.gap)}>
            <div className="flex items-center justify-between">
              <h3 className={cn('font-semibold text-gray-900', fontSizes.h3)}>
                Sections
              </h3>
              <TouchFriendlyButton
                onClick={handleAddSection}
                className="bg-purple-600 text-white hover:bg-purple-700"
                touchSize={isMobile ? 'lg' : 'md'}
              >
                Add Section
              </TouchFriendlyButton>
            </div>

            {sections.length > 0 ? (
              <OptimizedDocumentSections
                sections={sections}
                renderSection={renderSection}
                className="min-h-[400px]"
                estimatedSectionHeight={isMobile ? 150 : 200}
              />
            ) : (
              <div className={cn(
                'text-center py-12 text-gray-500',
                spacing.padding
              )}>
                <p className={fontSizes.body}>
                  No sections yet. Click "Add Section" to get started.
                </p>
              </div>
            )}
          </div>
        </div>
      </ResponsiveContainer>
    );
  },
  {
    displayName: 'ResponsiveDocumentForm',
    shouldUpdate: (prev, next) => 
      prev.document !== next.document || 
      prev.onDocumentChange !== next.onDocumentChange
  }
);