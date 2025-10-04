import React, { useState, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Image,
  Printer,
  Share2,
  MessageSquare,
  Edit3,
  Eye,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { EnhancedCard } from '@/components/ui/enhanced-card';

interface PreviewControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  annotationMode: boolean;
  onAnnotationModeToggle: () => void;
  onExport: (format: ExportFormat) => void;
  className?: string;
}

export type ExportFormat = 'pdf' | 'docx' | 'png' | 'print';

const ZOOM_PRESETS = [50, 75, 100, 125, 150];

export default function PreviewControls({
  zoom,
  onZoomChange,
  currentPage,
  totalPages,
  onPageChange,
  annotationMode,
  onAnnotationModeToggle,
  onExport,
  className
}: PreviewControlsProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleZoomIn = useCallback(() => {
    const currentIndex = ZOOM_PRESETS.indexOf(zoom);
    if (currentIndex < ZOOM_PRESETS.length - 1) {
      onZoomChange(ZOOM_PRESETS[currentIndex + 1]);
    }
  }, [zoom, onZoomChange]);

  const handleZoomOut = useCallback(() => {
    const currentIndex = ZOOM_PRESETS.indexOf(zoom);
    if (currentIndex > 0) {
      onZoomChange(ZOOM_PRESETS[currentIndex - 1]);
    }
  }, [zoom, onZoomChange]);

  const handleZoomReset = useCallback(() => {
    onZoomChange(100);
  }, [onZoomChange]);

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, onPageChange]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  }, [currentPage, totalPages, onPageChange]);

  const handleExportClick = useCallback((format: ExportFormat) => {
    onExport(format);
    setShowExportMenu(false);
  }, [onExport]);

  const exportOptions = [
    { format: 'pdf' as ExportFormat, label: 'Export as PDF', icon: FileText },
    { format: 'docx' as ExportFormat, label: 'Export as DOCX', icon: FileText },
    { format: 'png' as ExportFormat, label: 'Export as Image', icon: Image },
    { format: 'print' as ExportFormat, label: 'Print Document', icon: Printer },
  ];

  return (
    <div className={cn(
      'flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200',
      className
    )}>
      {/* Zoom Controls */}
      <div className="flex items-center gap-1">
        <EnhancedButton
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          disabled={zoom <= ZOOM_PRESETS[0]}
          className="h-8 w-8 p-0"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </EnhancedButton>
        
        <div className="flex items-center gap-1 px-2">
          <select
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="text-sm bg-transparent border-none outline-none cursor-pointer min-w-[60px] text-center"
          >
            {ZOOM_PRESETS.map(level => (
              <option key={level} value={level}>
                {level}%
              </option>
            ))}
          </select>
        </div>
        
        <EnhancedButton
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          disabled={zoom >= ZOOM_PRESETS[ZOOM_PRESETS.length - 1]}
          className="h-8 w-8 p-0"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </EnhancedButton>
        
        <EnhancedButton
          variant="ghost"
          size="sm"
          onClick={handleZoomReset}
          className="h-8 w-8 p-0"
          title="Reset zoom to 100%"
        >
          <RotateCcw className="w-4 h-4" />
        </EnhancedButton>
      </div>

      {/* Page Navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <EnhancedButton
            variant="ghost"
            size="sm"
            onClick={handlePreviousPage}
            disabled={currentPage <= 1}
            className="h-8 w-8 p-0"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </EnhancedButton>
          
          <div className="flex items-center gap-2 px-3">
            <input
              type="number"
              min="1"
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const page = Math.max(1, Math.min(totalPages, Number(e.target.value)));
                onPageChange(page);
              }}
              className="w-12 text-sm text-center bg-transparent border border-gray-300 rounded px-1 py-0.5"
            />
            <span className="text-sm text-gray-500">of {totalPages}</span>
          </div>
          
          <EnhancedButton
            variant="ghost"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="h-8 w-8 p-0"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </EnhancedButton>
        </div>
      )}

      {/* Action Controls */}
      <div className="flex items-center gap-1">
        {/* Annotation Mode Toggle */}
        <EnhancedButton
          variant={annotationMode ? 'default' : 'ghost'}
          size="sm"
          onClick={onAnnotationModeToggle}
          className="h-8"
          title={annotationMode ? 'Exit annotation mode' : 'Enter annotation mode'}
        >
          {annotationMode ? <Eye className="w-4 h-4 mr-1" /> : <MessageSquare className="w-4 h-4 mr-1" />}
          {annotationMode ? 'View' : 'Annotate'}
        </EnhancedButton>

        {/* Export Menu */}
        <div className="relative">
          <EnhancedButton
            variant="ghost"
            size="sm"
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="h-8"
            title="Export options"
          >
            <Download className="w-4 h-4 mr-1" />
            Export
          </EnhancedButton>

          {showExportMenu && (
            <EnhancedCard className="absolute right-0 top-full mt-1 w-48 p-1 z-50 shadow-lg">
              {exportOptions.map(option => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.format}
                    onClick={() => handleExportClick(option.format)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 rounded transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    {option.label}
                  </button>
                );
              })}
            </EnhancedCard>
          )}
        </div>

        {/* Settings */}
        <EnhancedButton
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Preview settings"
        >
          <Settings className="w-4 h-4" />
        </EnhancedButton>
      </div>
    </div>
  );
}