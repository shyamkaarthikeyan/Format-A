import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDebouncedPreview, withPerformanceOptimization } from '@/lib/performance-utils';
import { useDeviceType, useViewportSize, useResponsiveFontSize } from '@/lib/responsive-utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { TouchFriendlyButton } from '@/components/ui/touch-friendly-button';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Document } from '@shared/schema';

interface ResponsivePreviewProps {
  document: Document;
  className?: string;
  debounceDelay?: number;
  onPreviewGenerated?: (url: string) => void;
}

export const ResponsivePreview = withPerformanceOptimization<ResponsivePreviewProps>(
  ({
    document,
    className,
    debounceDelay = 1000,
    onPreviewGenerated,
  }) => {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const { isMobile, isTablet, orientation } = useDeviceType();
    const { availableHeight } = useViewportSize();
    const fontSizes = useResponsiveFontSize();
    const containerRef = useRef<HTMLDivElement>(null);

    // Responsive zoom levels
    const zoomLevels = isMobile 
      ? [0.5, 0.75, 1, 1.25, 1.5] 
      : [0.5, 0.75, 1, 1.25, 1.5, 2];

    // Preview generation function
    const generatePreview = useCallback(async (doc: Document) => {
      // Check if document has minimum required content
      if (!doc.title || !doc.authors?.some(author => author.name)) {
        setError("Please add a title and at least one author to generate preview");
        return;
      }

      setError(null);

      const response = await fetch('/api/generate/docx-to-pdf', {
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
    }, [pdfUrl, onPreviewGenerated]);

    // Use debounced preview hook
    const { isGenerating } = useDebouncedPreview(document, debounceDelay, generatePreview);

    // Zoom controls
    const handleZoomIn = useCallback(() => {
      const currentIndex = zoomLevels.indexOf(zoom);
      if (currentIndex < zoomLevels.length - 1) {
        setZoom(zoomLevels[currentIndex + 1]);
      }
    }, [zoom, zoomLevels]);

    const handleZoomOut = useCallback(() => {
      const currentIndex = zoomLevels.indexOf(zoom);
      if (currentIndex > 0) {
        setZoom(zoomLevels[currentIndex - 1]);
      }
    }, [zoom, zoomLevels]);

    const handleResetZoom = useCallback(() => {
      setZoom(1);
    }, []);

    const toggleFullscreen = useCallback(() => {
      if (!isFullscreen && containerRef.current) {
        (containerRef.current as any).requestFullscreen?.();
        setIsFullscreen(true);
      } else if ((document as any).fullscreenElement) {
        (document as any).exitFullscreen?.();
        setIsFullscreen(false);
      }
    }, [isFullscreen]);

    // Handle fullscreen change
    useEffect(() => {
      const handleFullscreenChange = () => {
        setIsFullscreen(!!(document as any).fullscreenElement);
      };

      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
        }
      };
    }, [pdfUrl]);

    // Calculate preview dimensions
    const previewDimensions = useMemo(() => {
      if (isMobile) {
        return {
          width: orientation === 'portrait' ? '100%' : '70%',
          height: orientation === 'portrait' ? '60vh' : '80vh',
        };
      }
      if (isTablet) {
        return {
          width: '80%',
          height: '70vh',
        };
      }
      return {
        width: '8.5in',
        height: '11in',
      };
    }, [isMobile, isTablet, orientation]);

    const renderControls = () => (
      <div className={cn(
        'flex items-center justify-between p-3 bg-white border-b border-gray-200',
        isMobile && 'flex-wrap gap-2'
      )}>
        <div className="flex items-center gap-2">
          <TouchFriendlyButton
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= zoomLevels[0]}
            touchSize={isMobile ? 'md' : 'sm'}
          >
            <ZoomOut className="h-4 w-4" />
          </TouchFriendlyButton>
          
          <span className={cn('text-gray-600 min-w-[60px] text-center', fontSizes.caption)}>
            {Math.round(zoom * 100)}%
          </span>
          
          <TouchFriendlyButton
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= zoomLevels[zoomLevels.length - 1]}
            touchSize={isMobile ? 'md' : 'sm'}
          >
            <ZoomIn className="h-4 w-4" />
          </TouchFriendlyButton>
          
          <TouchFriendlyButton
            variant="ghost"
            size="sm"
            onClick={handleResetZoom}
            touchSize={isMobile ? 'md' : 'sm'}
          >
            <RotateCcw className="h-4 w-4" />
          </TouchFriendlyButton>
        </div>

        {!isMobile && (
          <TouchFriendlyButton
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            touchSize="sm"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </TouchFriendlyButton>
        )}
      </div>
    );

    const renderContent = () => {
      if (isGenerating) {
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <LoadingSpinner size="lg" />
              <p className={cn('text-gray-600', fontSizes.body)}>
                Generating preview...
              </p>
            </div>
          </div>
        );
      }

      if (error) {
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-6">
              <div className="w-12 h-12 text-red-400 mx-auto mb-4">⚠️</div>
              <p className={cn('text-red-600 mb-2', fontSizes.body)}>
                Preview Error
              </p>
              <p className={cn('text-gray-600', fontSizes.caption)}>
                {error}
              </p>
            </div>
          </div>
        );
      }

      if (!pdfUrl) {
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-6">
              <div className="w-12 h-12 text-gray-400 mx-auto mb-4">📄</div>
              <p className={cn('text-gray-600 mb-2', fontSizes.body)}>
                Ready for Preview
              </p>
              <p className={cn('text-gray-500', fontSizes.caption)}>
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
                width: previewDimensions.width,
                minWidth: isMobile ? 'auto' : previewDimensions.width,
                backgroundColor: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease-in-out',
              }}
            >
              <iframe
                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                style={{
                  width: '100%',
                  height: previewDimensions.height,
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
      <ResponsiveContainer className={className}>
        <div 
          ref={containerRef}
          className={cn(
            'border border-gray-200 rounded-lg overflow-hidden bg-white',
            isFullscreen && 'fixed inset-0 z-50 rounded-none'
          )}
          style={{
            height: isFullscreen ? '100vh' : isMobile ? availableHeight - 100 : '70vh'
          }}
        >
          {renderControls()}
          <div className="flex-1 overflow-hidden">
            {renderContent()}
          </div>
        </div>
      </ResponsiveContainer>
    );
  },
  {
    displayName: 'ResponsivePreview',
    shouldUpdate: (prev, next) => 
      prev.document !== next.document || 
      prev.debounceDelay !== next.debounceDelay ||
      prev.onPreviewGenerated !== next.onPreviewGenerated
  }
);