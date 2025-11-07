import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDebounce, useThrottle, useDebouncedPreview, withPerformanceOptimization } from '@/lib/performance-utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { documentApi } from '@/lib/api';
import type { Document } from '@shared/schema';

interface OptimizedPreviewProps {
  document: Document;
  className?: string;
  debounceDelay?: number;
  onPreviewGenerated?: (url: string) => void;
}

export const OptimizedPreview = withPerformanceOptimization<OptimizedPreviewProps>(
  ({
    document,
    className,
    debounceDelay = 1000,
    onPreviewGenerated,
  }) => {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Memoize document hash for change detection
    const documentHash = useMemo(() => {
      return JSON.stringify({
        title: document.title,
        authors: document.authors?.map(a => ({ name: a.name, affiliation: a.department || a.organization })),
        abstract: document.abstract,
        keywords: document.keywords,
        sections: document.sections?.map(s => ({
          id: s.id,
          title: s.title,
          contentBlocks: s.contentBlocks?.map(b => ({ type: b.type, content: b.content })),
        })),
        references: document.references?.map(r => ({ text: r.text })),
      });
    }, [document]);

    // Preview generation function
    const generatePreview = useCallback(async (doc: Document) => {
      // Check if document has minimum required content
      if (!doc.title || !doc.authors?.some(author => author.name)) {
        setError("Please add a title and at least one author to generate preview");
        return;
      }

      setError(null);

      try {
        console.log('Generating preview using Python backend API...');
        const result = await documentApi.generatePdf(doc, true); // true = preview mode
        
        if (result.file_data) {
          // Convert base64 to blob for preview
          const byteCharacters = atob(result.file_data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          
          // Clean up previous URL
          if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
          }

          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
          onPreviewGenerated?.(url);
        } else {
          throw new Error('Invalid response format from preview generation service');
        }
      } catch (error) {
        console.error('Python backend preview failed, trying fallback:', error);
        
        // Fallback to Node.js endpoint
        try {
          const response = await fetch('/api/generate/docx-to-pdf?preview=true', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(doc),
          });

          if (!response.ok) {
            throw new Error(`Failed to generate PDF: ${response.statusText}`);
          }

          const blob = await response.blob();
          if (blob.size === 0) {
            throw new Error('Generated PDF is empty');
          }

          // Clean up previous URL
          if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
          }

          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
          onPreviewGenerated?.(url);
        } catch (fallbackError) {
          console.error('Fallback preview generation also failed:', fallbackError);
          throw fallbackError;
        }
      }
    }, [pdfUrl, onPreviewGenerated]);

    // Use debounced preview hook
    const { isGenerating } = useDebouncedPreview(document, debounceDelay, generatePreview);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
        }
      };
    }, [pdfUrl]);

  const renderContent = () => {
    if (isGenerating) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-600">Generating preview...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-6">
            <div className="w-12 h-12 text-red-400 mx-auto mb-4">⚠️</div>
            <p className="text-red-600 mb-2">Preview Error</p>
            <p className="text-gray-600 text-sm">{error}</p>
          </div>
        </div>
      );
    }

    if (!pdfUrl) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-6">
            <div className="w-12 h-12 text-gray-400 mx-auto mb-4">📄</div>
            <p className="text-gray-600 mb-2">Ready for Preview</p>
            <p className="text-gray-500 text-sm">
              Add content to generate preview
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full bg-gray-100 overflow-auto">
        <div className="flex justify-center items-start h-full overflow-auto p-4">
          <div
            style={{
              width: '8.5in',
              minWidth: '8.5in',
              backgroundColor: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
              style={{
                width: '100%',
                height: '11in',
                border: 'none',
                backgroundColor: 'white'
              }}
              title="PDF Preview"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={className}>
      {renderContent()}
    </div>
  );
  },
  {
    displayName: 'OptimizedPreview',
    shouldUpdate: (prev, next) => 
      prev.document !== next.document || 
      prev.debounceDelay !== next.debounceDelay ||
      prev.onPreviewGenerated !== next.onPreviewGenerated
  }
);