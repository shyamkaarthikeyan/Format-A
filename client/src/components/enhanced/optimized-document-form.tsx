import React, { useMemo, useCallback } from 'react';
import { useDebounce, withPerformanceOptimization, useShallowMemo } from '@/lib/performance-utils';
import { LazyComponent } from '@/components/ui/lazy-component';
import { OptimizedDocumentSections } from '@/components/ui/virtual-scroll';
import type { Document, Section } from '@shared/schema';

interface OptimizedDocumentFormProps {
  document: Document;
  onDocumentChange: (document: Document) => void;
  className?: string;
}

// Memoized section component
const OptimizedSectionComponent = withPerformanceOptimization<{
  section: Section;
  index: number;
  onSectionChange: (section: Section) => void;
  onSectionDelete: (index: number) => void;
}>(
  ({ section, index, onSectionChange, onSectionDelete }) => {
    const handleTitleChange = useCallback((title: string) => {
      onSectionChange({ ...section, title });
    }, [section, onSectionChange]);

    const handleContentChange = useCallback((contentBlocks: any[]) => {
      onSectionChange({ ...section, contentBlocks });
    }, [section, onSectionChange]);

    return (
      <LazyComponent
        fallback={
          <div className="h-48 bg-gray-100 animate-pulse rounded-lg" />
        }
      >
        <div className="border rounded-lg p-4 space-y-4 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={section.title || ''}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder={`Section ${index + 1} Title`}
              className="text-lg font-semibold bg-transparent border-none outline-none flex-1"
            />
            <button
              onClick={() => onSectionDelete(index)}
              className="text-red-500 hover:text-red-700 p-1"
              aria-label="Delete section"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-2">
            {section.contentBlocks?.map((block, blockIndex) => (
              <div key={blockIndex} className="p-3 bg-gray-50 rounded">
                <div className="text-sm text-gray-600 mb-1">
                  {block.type || 'Text'}
                </div>
                <textarea
                  value={block.content || ''}
                  onChange={(e) => {
                    const newBlocks = [...(section.contentBlocks || [])];
                    newBlocks[blockIndex] = { ...block, content: e.target.value };
                    handleContentChange(newBlocks);
                  }}
                  className="w-full p-2 border rounded resize-none"
                  rows={3}
                  placeholder="Enter content..."
                />
              </div>
            ))}
            
            <button
              onClick={() => {
                const newBlocks = [...(section.contentBlocks || []), { type: 'text', content: '' }];
                handleContentChange(newBlocks);
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              + Add Content Block
            </button>
          </div>
        </div>
      </LazyComponent>
    );
  },
  {
    displayName: 'OptimizedSectionComponent',
    shouldUpdate: (prev, next) => 
      prev.section !== next.section || 
      prev.index !== next.index
  }
);

export const OptimizedDocumentForm = withPerformanceOptimization<OptimizedDocumentFormProps>(
  ({ document, onDocumentChange, className }) => {
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
      <OptimizedSectionComponent
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
      <div className={className}>
        {/* Document Metadata */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={documentMetadata.title || ''}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter document title..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Abstract
            </label>
            <textarea
              value={documentMetadata.abstract || ''}
              onChange={(e) => handleAbstractChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={4}
              placeholder="Enter abstract..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Keywords
            </label>
            <input
              type="text"
              value={documentMetadata.keywords || ''}
              onChange={(e) => handleKeywordsChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter keywords separated by commas..."
            />
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Sections</h3>
            <button
              onClick={handleAddSection}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Add Section
            </button>
          </div>

          {sections.length > 0 ? (
            <OptimizedDocumentSections
              sections={sections}
              renderSection={renderSection}
              className="min-h-[400px]"
              estimatedSectionHeight={200}
            />
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No sections yet. Click "Add Section" to get started.</p>
            </div>
          )}
        </div>
      </div>
    );
  },
  {
    displayName: 'OptimizedDocumentForm',
    shouldUpdate: (prev, next) => 
      prev.document !== next.document || 
      prev.onDocumentChange !== next.onDocumentChange
  }
);