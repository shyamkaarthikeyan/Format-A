import React, { useState, useEffect, useRef } from 'react';
import { 
  Eye, 
  FileText, 
  Printer, 
  Smartphone, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Download,
  Share2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { documentApi } from '@/lib/api';
import DocumentStructureVisualizer from './document-structure-visualizer';
import type { Document } from '@shared/schema';

interface EnhancedPreviewSystemProps {
  document: Document;
  className?: string;
}

type PreviewMode = 'live' | 'outline' | 'print' | 'mobile';

export default function EnhancedPreviewSystem({
  document,
  className,
}: EnhancedPreviewSystemProps) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>('live');
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const previewRef = useRef<HTMLDivElement>(null);

  const zoomLevels = [50, 75, 100, 125, 150, 200];

  // Generate PDF preview with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (document.title && document.authors?.some(author => author.name)) {
        generatePreview();
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [document.title, document.authors, document.sections, document.abstract]);

  const generatePreview = async () => {
    if (!document.title || !document.authors?.some(author => author.name)) {
      return;
    }

    setIsGenerating(true);
    try {
      console.log('Generating preview using Python backend API...');
      const result = await documentApi.generatePdf(document, true); // true = preview mode
      
      if (result.file_data) {
        // Convert base64 to blob for preview
        const byteCharacters = atob(result.file_data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
        }
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
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
          body: JSON.stringify(document),
        });

        if (response.ok) {
          const blob = await response.blob();
          if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
          }
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
        }
      } catch (fallbackError) {
        console.error('Fallback preview generation also failed:', fallbackError);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleZoomIn = () => {
    const currentIndex = zoomLevels.indexOf(zoom);
    if (currentIndex < zoomLevels.length - 1) {
      setZoom(zoomLevels[currentIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    const currentIndex = zoomLevels.indexOf(zoom);
    if (currentIndex > 0) {
      setZoom(zoomLevels[currentIndex - 1]);
    }
  };

  const handleZoomReset = () => {
    setZoom(100);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const renderPreviewContent = () => {
    switch (previewMode) {
      case 'live':
        return (
          <div className="h-full bg-gray-100 overflow-auto">
            {isGenerating ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3">
                  <LoadingSpinner size="lg" />
                  <p className="text-sm text-gray-600">Generating preview...</p>
                </div>
              </div>
            ) : !document.title || !document.authors?.some(author => author.name) ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-6">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Preview Ready</p>
                  <p className="text-gray-500 text-sm">Add a title and author to generate preview</p>
                </div>
              </div>
            ) : pdfUrl ? (
              <div className="flex justify-center items-start h-full overflow-auto p-4">
                <div
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.2s ease-in-out',
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
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-6">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No preview available</p>
                </div>
              </div>
            )}
          </div>
        );

      case 'outline':
        return (
          <div className="h-full overflow-auto p-4">
            <DocumentStructureVisualizer document={document} />
          </div>
        );

      case 'print':
        return (
          <div className="h-full bg-white overflow-auto">
            <div className="max-w-4xl mx-auto p-8 space-y-6">
              {/* Print Preview Header */}
              <div className="border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Print Preview</span>
                  <span>Page {currentPage} of {totalPages}</span>
                </div>
              </div>

              {/* Document Content */}
              <div className="space-y-6">
                {/* Title */}
                {document.title && (
                  <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                      {document.title}
                    </h1>
                  </div>
                )}

                {/* Authors */}
                {document.authors.length > 0 && (
                  <div className="text-center text-sm text-gray-700">
                    {document.authors.map(author => author.name).join(', ')}
                  </div>
                )}

                {/* Abstract */}
                {document.abstract && (
                  <div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      <strong className="font-bold">Abstract—{document.abstract}</strong>
                    </p>
                  </div>
                )}

                {/* Keywords */}
                {document.keywords && (
                  <div>
                    <p className="text-sm text-gray-700">
                      <strong className="font-bold">Keywords—{document.keywords}</strong>
                    </p>
                  </div>
                )}

                {/* Sections */}
                {document.sections.map((section, index) => (
                  <div key={section.id} className="space-y-3">
                    <h2 className="text-lg font-semibold text-gray-900 text-center">
                      {index + 1}. {section.title.toUpperCase()}
                    </h2>
                    
                    {section.contentBlocks.map(block => (
                      <div key={block.id} className="text-sm text-gray-700 leading-relaxed">
                        {block.type === 'text' && block.content && (
                          <p>{block.content}</p>
                        )}
                        {block.type === 'image' && (
                          <div className="my-4 p-4 border border-gray-200 rounded text-center">
                            <p className="text-gray-500">[Image: {block.caption || 'Untitled'}]</p>
                          </div>
                        )}
                        {block.type === 'table' && (
                          <div className="my-4 p-4 border border-gray-200 rounded text-center">
                            <p className="text-gray-500">[Table: {block.tableName || 'Untitled'}]</p>
                          </div>
                        )}
                        {block.type === 'equation' && (
                          <div className="my-4 p-4 border border-gray-200 rounded text-center font-mono">
                            <p className="text-gray-700">{block.content || '[Equation]'}</p>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Subsections */}
                    {section.subsections.map(subsection => (
                      <div key={subsection.id} className="ml-4 space-y-2">
                        <h3 className="text-base font-semibold text-gray-900">
                          {index + 1}.{subsection.order + 1} {subsection.title}
                        </h3>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {subsection.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ))}

                {/* References */}
                {document.references.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">References</h2>
                    <div className="space-y-2">
                      {document.references.map((ref, index) => (
                        <p key={ref.id} className="text-sm text-gray-700">
                          [{index + 1}] {ref.text}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Page Break Indicators */}
              <div className="border-t-2 border-dashed border-gray-300 pt-4 mt-8">
                <div className="text-center text-xs text-gray-500">
                  — Page Break —
                </div>
              </div>
            </div>
          </div>
        );

      case 'mobile':
        return (
          <div className="h-full bg-gray-100 flex items-center justify-center">
            <div className="w-80 h-[600px] bg-white rounded-3xl shadow-2xl overflow-hidden border-8 border-gray-800">
              <div className="h-full overflow-auto p-4 text-sm">
                {/* Mobile-optimized content */}
                <div className="space-y-4">
                  {document.title && (
                    <h1 className="text-lg font-bold text-gray-900 leading-tight">
                      {document.title}
                    </h1>
                  )}
                  
                  {document.authors.length > 0 && (
                    <div className="text-xs text-gray-600">
                      {document.authors.map(author => author.name).join(', ')}
                    </div>
                  )}

                    {document.abstract && (
                      <div>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          <strong className="font-bold">Abstract—{document.abstract}</strong>
                        </p>
                      </div>
                    )}

                    {document.keywords && (
                      <div>
                        <p className="text-xs text-gray-700">
                          <strong className="font-bold">Keywords—{document.keywords}</strong>
                        </p>
                      </div>
                    )}                  {document.sections.map((section, index) => (
                    <div key={section.id} className="space-y-2">
                      <h2 className="text-sm font-semibold text-gray-900 text-center">
                        {index + 1}. {section.title.toUpperCase()}
                      </h2>
                      {section.contentBlocks.map(block => (
                        <div key={block.id}>
                          {block.type === 'text' && block.content && (
                            <p className="text-xs text-gray-700 leading-relaxed">
                              {block.content}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const previewModes = [
    { id: 'live' as PreviewMode, label: 'Live Preview', icon: Eye },
    { id: 'outline' as PreviewMode, label: 'Outline', icon: FileText },
    { id: 'print' as PreviewMode, label: 'Print Preview', icon: Printer },
    { id: 'mobile' as PreviewMode, label: 'Mobile View', icon: Smartphone },
  ];

  return (
    <div className={cn(
      'flex flex-col h-full bg-white',
      isFullscreen && 'fixed inset-0 z-50',
      className
    )}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        {/* Preview Mode Selector */}
        <div className="flex items-center gap-1">
          {previewModes.map(mode => {
            const Icon = mode.icon;
            return (
              <EnhancedButton
                key={mode.id}
                variant={previewMode === mode.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPreviewMode(mode.id)}
                className="h-8 text-xs"
              >
                <Icon className="w-3 h-3 mr-1" />
                {mode.label}
              </EnhancedButton>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          {/* Zoom Controls (for live and print modes) */}
          {(previewMode === 'live' || previewMode === 'print') && (
            <>
              <EnhancedButton
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= zoomLevels[0]}
                className="h-8 w-8 p-0"
              >
                <ZoomOut className="w-3 h-3" />
              </EnhancedButton>
              
              <span className="text-xs text-gray-600 min-w-[40px] text-center">
                {zoom}%
              </span>
              
              <EnhancedButton
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= zoomLevels[zoomLevels.length - 1]}
                className="h-8 w-8 p-0"
              >
                <ZoomIn className="w-3 h-3" />
              </EnhancedButton>
              
              <EnhancedButton
                variant="ghost"
                size="sm"
                onClick={handleZoomReset}
                className="h-8 w-8 p-0"
                title="Reset zoom"
              >
                <RotateCcw className="w-3 h-3" />
              </EnhancedButton>
            </>
          )}

          {/* Page Navigation (for print mode) */}
          {previewMode === 'print' && totalPages > 1 && (
            <>
              <div className="w-px h-4 bg-gray-300 mx-1" />
              <EnhancedButton
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-3 h-3" />
              </EnhancedButton>
              
              <span className="text-xs text-gray-600 px-2">
                {currentPage} / {totalPages}
              </span>
              
              <EnhancedButton
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-3 h-3" />
              </EnhancedButton>
            </>
          )}

          {/* Action Buttons */}
          <div className="w-px h-4 bg-gray-300 mx-1" />
          
          <EnhancedButton
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="h-8 w-8 p-0"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </EnhancedButton>

          <EnhancedButton
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Preview settings"
          >
            <Settings className="w-3 h-3" />
          </EnhancedButton>
        </div>
      </div>

      {/* Preview Content */}
      <div ref={previewRef} className="flex-1 overflow-hidden">
        {renderPreviewContent()}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>Mode: {previewModes.find(m => m.id === previewMode)?.label}</span>
          {previewMode === 'live' && (
            <span className={cn(
              'flex items-center gap-1',
              isGenerating ? 'text-blue-600' : 'text-green-600'
            )}>
              <div className={cn(
                'w-2 h-2 rounded-full',
                isGenerating ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
              )} />
              {isGenerating ? 'Generating...' : 'Live'}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {document.sections.length > 0 && (
            <span>{document.sections.length} sections</span>
          )}
          {document.authors.length > 0 && (
            <span>{document.authors.length} authors</span>
          )}
        </div>
      </div>
    </div>
  );
}