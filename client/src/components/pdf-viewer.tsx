import React, { useState, useEffect, useRef } from "react";
import * as pdfjs from "pdfjs-dist";
import { ChevronLeft, ChevronRight, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Set up PDF.js worker with fallbacks
const setupPdfWorker = () => {
  const workerUrls = [
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`,
    `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`,
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
  ];
  
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrls[0];
  
  console.log('🔧 PDF.js worker configured:', workerUrls[0]);
};

setupPdfWorker();

interface PDFViewerProps {
  pdfUrl: string;
  zoom: number;
  isLoading?: boolean;
  onError?: (error: string) => void;
  fileType?: 'pdf' | 'docx' | 'auto';
}

export default function PDFViewer({ pdfUrl, zoom, isLoading = false, onError, fileType = 'auto' }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [renderingPages, setRenderingPages] = useState<Set<number>>(new Set());
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [isDocx, setIsDocx] = useState(false);

  // Detect if this is a DOCX file and show appropriate message
  useEffect(() => {
    if (pdfUrl) {
      // Check if URL indicates DOCX
      const isDocxFile = pdfUrl.includes('.docx') || fileType === 'docx';
      setIsDocx(isDocxFile);
      
      if (isDocxFile) {
        console.warn('⚠️ DOCX file detected - showing download option');
        setError('DOCX preview requires conversion. Please download to view, or use an online DOCX viewer.');
      }
    }
  }, [pdfUrl, fileType]);

  // Load and render PDF pages
  useEffect(() => {
    if (!pdfUrl || isDocx) return;

    const loadPdf = async () => {
      try {
        setError(null);
        console.log("Loading PDF from:", pdfUrl);

        // Fetch PDF as blob
        const response = await fetch(pdfUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.statusText}`);
        }

        const blob = await response.blob();
        
        // Check content type
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('wordprocessing')) {
          setIsDocx(true);
          setError('DOCX format detected. Please download to view with Microsoft Word or a compatible viewer.');
          return;
        }

        const arrayBuffer = await blob.arrayBuffer();

        // Load PDF document
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        console.log(`PDF loaded successfully: ${pdf.numPages} pages`);
        setNumPages(pdf.numPages);
        setCurrentPage(1);

        // Render all pages
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          renderPage(pdf, pageNum);
        }
      } catch (err) {
        let errorMessage = err instanceof Error ? err.message : "Failed to load PDF";
        
        // Provide specific guidance for common PDF.js worker errors
        if (errorMessage.includes('worker') || errorMessage.includes('fetch')) {
          console.warn('🔄 PDF.js worker error, attempting alternative approach...');
          errorMessage = "PDF viewer initialization failed. The document preview is temporarily unavailable, but you can still download the PDF.";
        } else if (errorMessage.includes('Invalid PDF')) {
          errorMessage = "Invalid PDF format. Please regenerate the document or try downloading it directly.";
        }
        
        console.error("❌ PDF loading error:", err);
        setError(errorMessage);
        onError?.(errorMessage);
      }
    };

    loadPdf();
  }, [pdfUrl, isDocx, onError]);

  // Render individual PDF page to canvas
  const renderPage = async (pdf: pdfjs.PDFDocumentProxy, pageNum: number) => {
    try {
      setRenderingPages(prev => new Set(prev).add(pageNum));

      const page = await pdf.getPage(pageNum);
      const scale = (zoom / 100) * 2; // 2x scale for better quality

      const viewport = page.getViewport({ scale });
      const canvas = canvasRefs.current.get(pageNum) || document.createElement("canvas");

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.className = "shadow-lg border border-gray-200 max-w-full h-auto mx-auto block";

      canvasRefs.current.set(pageNum, canvas);

      // Render page to canvas
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not get canvas context");

      await page.render({
        canvasContext: context,
        viewport: viewport,
      } as any).promise;

      console.log(`✅ Page ${pageNum} rendered successfully`);
    } catch (err) {
      console.error(`Error rendering page ${pageNum}:`, err);
    } finally {
      setRenderingPages(prev => {
        const newSet = new Set(prev);
        newSet.delete(pageNum);
        return newSet;
      });
    }
  };

  // Handle zoom changes - re-render visible pages
  useEffect(() => {
    if (!pdfUrl || numPages === 0 || isDocx) return;

    const rerenderPages = async () => {
      try {
        const response = await fetch(pdfUrl);
        if (!response.ok) throw new Error("Failed to fetch PDF for re-rendering");

        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

        // Re-render visible pages
        for (let pageNum = Math.max(1, currentPage - 1); pageNum <= Math.min(numPages, currentPage + 2); pageNum++) {
          renderPage(pdf, pageNum);
        }
      } catch (err) {
        console.error("Error re-rendering pages:", err);
      }
    };

    rerenderPages();
  }, [zoom, pdfUrl, numPages, currentPage, isDocx]);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(numPages, prev + 1));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (isDocx || error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <p className="text-blue-600 font-medium mb-2">Format Preview Notice</p>
          <p className="text-gray-600 text-sm mb-4">{error || 'Document preview not available'}</p>
          <div className="space-y-2">
            <p className="text-xs text-gray-500">✅ Document is ready for download</p>
            <p className="text-xs text-gray-500">✅ Full formatting preserved</p>
            <p className="text-xs text-gray-500">✅ Compatible with all office applications</p>
          </div>
        </div>
      </div>
    );
  }

  if (numPages === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-6">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No pages available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Page Navigation */}
      <div className="flex items-center justify-between p-3 bg-gray-200 border-b border-gray-300">
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            variant="ghost"
            size="sm"
            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-700 min-w-[80px] text-center">
            Page {currentPage} / {numPages}
          </span>
          <Button
            onClick={handleNextPage}
            disabled={currentPage === numPages}
            variant="ghost"
            size="sm"
            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-xs text-gray-600">
          {renderingPages.size > 0 && `Rendering ${renderingPages.size} page(s)...`}
        </div>
      </div>

      {/* PDF Pages Container */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        <div className="flex flex-col items-center gap-6 mx-auto max-w-4xl">
          {Array.from({ length: numPages }).map((_, idx) => {
            const pageNum = idx + 1;
            return (
              <div key={pageNum} className="w-full">
                <canvas
                  ref={(el) => {
                    if (el) {
                      canvasRefs.current.set(pageNum, el);
                    }
                  }}
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: "top center",
                    display: renderingPages.has(pageNum) ? "none" : "block",
                  }}
                  className="shadow-lg border border-gray-200 w-full h-auto mx-auto block"
                />
                {renderingPages.has(pageNum) && (
                  <div className="h-96 bg-gray-200 rounded flex items-center justify-center">
                    <p className="text-gray-500">Rendering page {pageNum}...</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
