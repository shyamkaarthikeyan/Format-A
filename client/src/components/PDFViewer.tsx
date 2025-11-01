import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Download, FileText, RefreshCw } from 'lucide-react';

interface PDFViewerProps {
  pdfUrl: string | null;
  className?: string;
  onError?: (error: string) => void;
}

export default function PDFViewer({ pdfUrl, className = '', onError }: PDFViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (pdfUrl) {
      setIsLoading(true);
      setError(null);
      
      // Simple timeout to handle loading state
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 2000);

      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
      setError(null);
    }
  }, [pdfUrl]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = 'ieee-paper.pdf';
      link.click();
    }
  };

  const handleRefresh = () => {
    if (iframeRef.current && pdfUrl) {
      iframeRef.current.src = pdfUrl;
    }
  };

  if (!pdfUrl) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-100 ${className}`}>
        <div className="text-center p-6">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-500 mb-2">No PDF to display</div>
          <div className="text-sm text-gray-400">Generate a document to see the preview</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-100 ${className}`}>
        <div className="text-center p-6">
          <FileText className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <div className="text-red-600 mb-2">PDF Viewer Error</div>
          <div className="text-sm text-gray-600 mb-4">{error}</div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-gray-100 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">PDF Preview</span>
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
              Loading...
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 50}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          
          <span className="text-sm text-gray-600 min-w-[50px] text-center">
            {zoom}%
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 200}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>

          {/* Download button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
          >
            <Download className="w-4 h-4" />
          </Button>

          {/* Refresh button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF Display */}
      <div className="flex-1 overflow-hidden bg-gray-200 p-4">
        <div className="h-full bg-white shadow-lg rounded">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <div className="text-gray-600">Loading PDF...</div>
              </div>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH&zoom=${zoom}`}
              className="w-full h-full border-0 rounded"
              title="PDF Preview"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setError('Failed to load PDF preview');
                onError?.('Failed to load PDF preview');
                setIsLoading(false);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}