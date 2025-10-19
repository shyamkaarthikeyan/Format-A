import React, { useState, useCallback, useEffect } from 'react';
import { 
  Eye, 
  FileText, 
  Printer, 
  Smartphone,
  Download,
  Share2,
  MessageSquare,
  Settings,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ToastSystem } from '@/components/ui/toast-system';
import PreviewControls, { type ExportFormat } from './preview-controls';
import AnnotationSystem, { type Annotation } from './annotation-system';
import DocumentStructureVisualizer from './document-structure-visualizer';
import type { Document } from '@shared/schema';

interface EnhancedPreviewNavigationProps {
  document: Document;
  className?: string;
}

type PreviewMode = 'live' | 'outline' | 'print' | 'mobile';

export default function EnhancedPreviewNavigation({
  document,
  className,
}: EnhancedPreviewNavigationProps) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>('live');
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [annotationMode, setAnnotationMode] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showToast, setShowToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Calculate total pages based on document content
  useEffect(() => {
    const estimatedPages = Math.max(1, Math.ceil(
      (document.sections.length * 0.5) + 
      (document.abstract ? 0.3 : 0) + 
      (document.references.length * 0.1) + 1
    ));
    setTotalPages(estimatedPages);
  }, [document]);

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
      const response = await fetch('/api/generate/docx-to-pdf', {
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
    } catch (error) {
      console.error('Preview generation failed:', error);
      setShowToast({
        message: 'Failed to generate preview',
        type: 'error'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = useCallback(async (format: ExportFormat) => {
    try {
      setShowToast({
        message: `Exporting as ${format.toUpperCase()}...`,
        type: 'info'
      });

      switch (format) {
        case 'pdf':
          if (pdfUrl && typeof window !== 'undefined') {
            const link = window.document.createElement('a');
            link.href = pdfUrl;
            link.download = `${document.title || 'document'}.pdf`;
            link.click();
            setShowToast({
              message: 'PDF exported successfully',
              type: 'success'
            });
          }
          break;

        case 'docx':
          const docxResponse = await fetch('/api/generate/docx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(document),
          });
          
          if (docxResponse.ok && typeof window !== 'undefined') {
            const blob = await docxResponse.blob();
            const url = URL.createObjectURL(blob);
            const link = window.document.createElement('a');
            link.href = url;
            link.download = `${document.title || 'document'}.docx`;
            link.click();
            URL.revokeObjectURL(url);
            setShowToast({
              message: 'DOCX exported successfully',
              type: 'success'
            });
          }
          break;

        case 'png':
          // Convert PDF to PNG (would need additional API endpoint)
          setShowToast({
            message: 'PNG export coming soon',
            type: 'info'
          });
          break;

        case 'print':
          if (pdfUrl) {
            const printWindow = window.open(pdfUrl);
            printWindow?.print();
            setShowToast({
              message: 'Print dialog opened',
              type: 'success'
            });
          }
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
      setShowToast({
        message: 'Export failed',
        type: 'error'
      });
    }
  }, [pdfUrl, document]);

  const handleAddAnnotation = useCallback((annotation: Omit<Annotation, 'id' | 'timestamp'>) => {
    const newAnnotation: Annotation = {
      ...annotation,
      id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    setAnnotations(prev => [...prev, newAnnotation]);
  }, []);

  const handleUpdateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    setAnnotations(prev => prev.map(annotation => 
      annotation.id === id ? { ...annotation, ...updates } : annotation
    ));
  }, []);

  const handleDeleteAnnotation = useCallback((id: string) => {
    setAnnotations(prev => prev.filter(annotation => annotation.id !== id));
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const renderPreviewContent = () => {
    const content = (() => {
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
                      src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&page=${currentPage}`}
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
              <div className="max-w-4xl mx-auto p-8 space-y-6" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
                {/* Print Preview Content */}
                <div className="border-b border-gray-200 pb-4">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Print Preview</span>
                    <span>Page {currentPage} of {totalPages}</span>
                  </div>
                </div>

                <div className="space-y-6">
                  {document.title && (
                    <div className="text-center">
                      <h1 className="text-2xl font-bold text-gray-900 mb-4">
                        {document.title}
                      </h1>
                    </div>
                  )}

                  {document.authors.length > 0 && (
                    <div className="text-center text-sm text-gray-700">
                      {document.authors.map(author => author.name).join(', ')}
                    </div>
                  )}

                  {document.abstract && (
                    <div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        <strong className="font-bold">Abstract—{document.abstract}</strong>
                      </p>
                    </div>
                  )}

                  {document.keywords && (
                    <div>
                      <p className="text-sm text-gray-700">
                        <strong className="font-bold">Keywords—{document.keywords}</strong>
                      </p>
                    </div>
                  )}

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

                {currentPage < totalPages && (
                  <div className="border-t-2 border-dashed border-gray-300 pt-4 mt-8">
                    <div className="text-center text-xs text-gray-500">
                      — Page Break —
                    </div>
                  </div>
                )}
              </div>
            </div>
          );

        case 'mobile':
          return (
            <div className="h-full bg-gray-100 flex items-center justify-center">
              <div className="w-80 h-[600px] bg-white rounded-3xl shadow-2xl overflow-hidden border-8 border-gray-800">
                <div className="h-full overflow-auto p-4 text-sm" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
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
                    )}

                    {document.sections.map((section, index) => (
                      <div key={section.id} className="space-y-2">
                        <h2 className="text-sm font-semibold text-gray-900">
                          {index + 1}. {section.title}
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
    })();

    // Wrap content with annotation system if in annotation mode
    if (annotationMode && (previewMode === 'live' || previewMode === 'print')) {
      return (
        <AnnotationSystem
          annotations={annotations}
          onAddAnnotation={handleAddAnnotation}
          onUpdateAnnotation={handleUpdateAnnotation}
          onDeleteAnnotation={handleDeleteAnnotation}
          enabled={annotationMode}
        >
          {content}
        </AnnotationSystem>
      );
    }

    return content;
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
      {/* Mode Selector */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
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

        <div className="flex items-center gap-1">
          <EnhancedButton
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="h-8 w-8 p-0"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </EnhancedButton>
        </div>
      </div>

      {/* Preview Controls */}
      <PreviewControls
        zoom={zoom}
        onZoomChange={setZoom}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        annotationMode={annotationMode}
        onAnnotationModeToggle={() => setAnnotationMode(!annotationMode)}
        onExport={handleExport}
      />

      {/* Preview Content */}
      <div className="flex-1 overflow-hidden">
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
          {annotationMode && (
            <span className="text-blue-600">
              {annotations.length} annotations
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {zoom !== 100 && <span>Zoom: {zoom}%</span>}
          {totalPages > 1 && <span>Page {currentPage} of {totalPages}</span>}
          {document.sections.length > 0 && (
            <span>{document.sections.length} sections</span>
          )}
        </div>
      </div>

      {/* Toast System */}
      {showToast && (
        <ToastSystem
          message={showToast.message}
          type={showToast.type}
          onClose={() => setShowToast(null)}
        />
      )}
    </div>
  );
}