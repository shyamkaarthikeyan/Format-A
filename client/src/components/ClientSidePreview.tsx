import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore - mammoth doesn't have perfect types
import mammoth from 'mammoth';
// @ts-ignore - docx-preview doesn't have types
import { renderAsync } from 'docx-preview';

interface ClientSidePreviewProps {
  documentUrl: string;
  documentType: 'pdf' | 'docx';
  className?: string;
  zoom?: number;
}

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const ClientSidePreview: React.FC<ClientSidePreviewProps> = ({
  documentUrl,
  documentType,
  className = '',
  zoom = 100
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(null);
        setHtmlContent('');
        setPdfPages([]);

        if (documentType === 'pdf') {
          await renderPDF(documentUrl);
        } else if (documentType === 'docx') {
          await renderDOCX(documentUrl);
        }
      } catch (err) {
        console.error('Document loading error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    if (documentUrl) {
      loadDocument();
    }
  }, [documentUrl, documentType]);

  // Re-render PDF when zoom changes
  useEffect(() => {
    if (documentType === 'pdf' && pdfPages.length > 0 && !loading) {
      renderPDFPages();
    }
  }, [zoom, documentType, pdfPages.length, loading]);

  const renderPDF = async (url: string) => {
    try {
      const loadingTask = pdfjsLib.getDocument(url);
      const pdf = await loadingTask.promise;
      
      // Initialize canvas refs array
      canvasRefs.current = new Array(pdf.numPages).fill(null);
      
      // Render all pages
      const pagePromises = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        pagePromises.push(pdf.getPage(i));
      }
      
      const pages = await Promise.all(pagePromises);
      setPdfPages(pages.map((_, index) => `page-${index}`));
      
      // Wait for next tick to ensure DOM is updated
      setTimeout(() => renderPDFPages(pages), 0);
    } catch (err) {
      throw new Error(`Failed to load PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const renderPDFPages = async (pages?: any[]) => {
    if (!pages && pdfPages.length === 0) return;
    
    try {
      // If pages not provided, re-fetch them (for zoom changes)
      if (!pages) {
        const loadingTask = pdfjsLib.getDocument(documentUrl);
        const pdf = await loadingTask.promise;
        const pagePromises = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          pagePromises.push(pdf.getPage(i));
        }
        pages = await Promise.all(pagePromises);
      }

      // Render each page to its canvas
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const canvas = canvasRefs.current[i];
        
        if (canvas) {
          const viewport = page.getViewport({ scale: zoom / 100 });
          const context = canvas.getContext('2d');
          
          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
              canvasContext: context,
              viewport: viewport
            }).promise;
          }
        }
      }
    } catch (err) {
      console.error('Error rendering PDF pages:', err);
    }
  };

  const renderDOCX = async (url: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      // Try docx-preview first (better formatting)
      if (docxContainerRef.current) {
        try {
          await renderAsync(arrayBuffer, docxContainerRef.current, undefined, {
            className: 'docx-wrapper',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            ignoreLastRenderedPageBreak: true,
            experimental: true,
            trimXmlDeclaration: true,
            useBase64URL: false,
            // useMathMLPolyfill: true, // This option may not be available in this version
            // showChanges: false, // This option may not be available in this version
            debug: false
          });
          return; // Success with docx-preview
        } catch (docxPreviewError) {
          console.warn('docx-preview failed, falling back to mammoth:', docxPreviewError);
        }
      }
      
      // Fallback to mammoth
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setHtmlContent(result.value);
      
      if (result.messages.length > 0) {
        console.warn('Mammoth conversion warnings:', result.messages);
      }
    } catch (err) {
      throw new Error(`Failed to load DOCX: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading document preview...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded ${className}`}>
        <p className="text-red-600">Error loading preview: {error}</p>
        <p className="text-sm text-gray-500 mt-2">
          Try refreshing the page or downloading the document directly.
        </p>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      {documentType === 'pdf' ? (
        <div className="bg-gray-100 p-4 space-y-4 max-h-96 overflow-auto">
          {pdfPages.map((_, index) => (
            <div key={index} className="bg-white shadow-lg border border-gray-200 mx-auto">
              <canvas
                ref={(el) => (canvasRefs.current[index] = el)}
                className="w-full h-auto block"
                style={{
                  maxWidth: '100%',
                  height: 'auto'
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white">
          <div 
            ref={docxContainerRef}
            className="p-4 prose max-w-none"
            style={{ 
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left',
              width: `${100 / (zoom / 100)}%`
            }}
          >
            {htmlContent && (
              <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};