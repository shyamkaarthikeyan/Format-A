import React, { useState, useRef, useEffect } from 'react';
import { X, FileText, Circle, CheckCircle2, Loader2, GripVertical, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { animations, focusRing } from '@/lib/ui-utils';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import type { Document } from '@shared/schema';

export type DocumentStatus = 'saved' | 'modified' | 'generating' | 'error' | 'new';

interface DocumentTab {
  id: string;
  title: string;
  status: DocumentStatus;
  isActive: boolean;
  lastModified?: Date;
  hasUnsavedChanges?: boolean;
  isGenerating?: boolean;
}

interface DocumentTabsProps {
  documents: Document[];
  activeDocumentId: string | null;
  onTabClick: (documentId: string) => void;
  onTabClose: (documentId: string) => void;
  onTabReorder?: (fromIndex: number, toIndex: number) => void;
  onNewDocument: () => void;
  documentStatuses?: Record<string, DocumentStatus>;
  maxTabs?: number;
  className?: string;
}

// Enhanced status icon with animations and better visual feedback
const getStatusIcon = (status: DocumentTab['status'], isActive: boolean) => {
  const baseClasses = "w-3 h-3 transition-all duration-200";
  
  switch (status) {
    case 'saved':
      return <CheckCircle2 className={cn(baseClasses, "text-green-500", isActive && "scale-110")} />;
    case 'modified':
      return <Circle className={cn(baseClasses, "text-amber-500 fill-current animate-pulse")} />;
    case 'generating':
      return <Loader2 className={cn(baseClasses, "text-blue-500 animate-spin")} />;
    case 'error':
      return <AlertCircle className={cn(baseClasses, "text-red-500 animate-bounce")} />;
    case 'new':
      return <Circle className={cn(baseClasses, "text-purple-500 fill-current")} />;
    default:
      return <Circle className={cn(baseClasses, "text-gray-400")} />;
  }
};

// Enhanced status colors with better visual hierarchy
const getStatusColor = (status: DocumentTab['status'], isActive: boolean, isDragging: boolean) => {
  const baseClasses = "transition-all duration-200";
  
  if (isDragging) {
    return cn(baseClasses, "bg-purple-100 border-purple-300 text-purple-800 shadow-lg scale-105 rotate-2");
  }
  
  if (isActive) {
    return cn(baseClasses, "bg-white border-purple-500 text-purple-700 shadow-md ring-2 ring-purple-500/20");
  }
  
  switch (status) {
    case 'saved':
      return cn(baseClasses, "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300");
    case 'modified':
      return cn(baseClasses, "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-300");
    case 'generating':
      return cn(baseClasses, "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100 hover:border-blue-300");
    case 'error':
      return cn(baseClasses, "bg-red-50 border-red-200 text-red-800 hover:bg-red-100 hover:border-red-300");
    case 'new':
      return cn(baseClasses, "bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100 hover:border-purple-300");
    default:
      return cn(baseClasses, "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300");
  }
};

// Get status tooltip text
const getStatusTooltip = (status: DocumentTab['status'], lastModified?: Date) => {
  const timeAgo = lastModified ? formatTimeAgo(lastModified) : '';
  
  switch (status) {
    case 'saved':
      return `Saved${timeAgo ? ` ${timeAgo}` : ''}`;
    case 'modified':
      return 'Unsaved changes';
    case 'generating':
      return 'Generating document...';
    case 'error':
      return 'Error occurred';
    case 'new':
      return 'New document';
    default:
      return 'Unknown status';
  }
};

// Format time ago helper
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

export default function DocumentTabs({
  documents,
  activeDocumentId,
  onTabClick,
  onTabClose,
  onTabReorder,
  onNewDocument,
  documentStatuses = {},
  maxTabs = 5,
  className,
}: DocumentTabsProps) {
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Convert documents to tabs with enhanced status tracking
  const tabs: DocumentTab[] = documents.map((doc, index) => {
    const status = documentStatuses[doc.id] || getDocumentStatus(doc);
    return {
      id: doc.id,
      title: doc.title || 'Untitled Document',
      status,
      isActive: doc.id === activeDocumentId,
      lastModified: new Date(), // TODO: Get actual last modified date
      hasUnsavedChanges: status === 'modified',
      isGenerating: status === 'generating',
    };
  });

  const canAddMore = documents.length < maxTabs;

  // Determine document status based on document content
  const getDocumentStatus = (doc: Document): DocumentStatus => {
    if (!doc.title && doc.sections.length === 0 && doc.authors.length === 0) {
      return 'new';
    }
    // TODO: Implement actual status logic based on save state, generation state, etc.
    return 'saved';
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, tabId: string, index: number) => {
    if (!onTabReorder) return;
    
    setDraggedTab(tabId);
    setIsReordering(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tabId);
    
    // Create custom drag image
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.transform = 'rotate(5deg)';
    dragImage.style.opacity = '0.8';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!onTabReorder || !draggedTab) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drag over if we're leaving the tabs container
    if (!tabsContainerRef.current?.contains(e.relatedTarget as Node)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    if (!onTabReorder || !draggedTab) return;
    
    e.preventDefault();
    const draggedIndex = tabs.findIndex(tab => tab.id === draggedTab);
    
    if (draggedIndex !== -1 && draggedIndex !== dropIndex) {
      onTabReorder(draggedIndex, dropIndex);
    }
    
    setDraggedTab(null);
    setDragOverIndex(null);
    setIsReordering(false);
  };

  const handleDragEnd = () => {
    setDraggedTab(null);
    setDragOverIndex(null);
    setIsReordering(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const currentIndex = tabs.findIndex(tab => tab.isActive);
        
        switch (e.key) {
          case 'Tab':
            e.preventDefault();
            const nextIndex = e.shiftKey 
              ? (currentIndex - 1 + tabs.length) % tabs.length
              : (currentIndex + 1) % tabs.length;
            if (tabs[nextIndex]) {
              onTabClick(tabs[nextIndex].id);
            }
            break;
          case 'w':
            e.preventDefault();
            if (tabs.length > 1 && currentIndex !== -1) {
              onTabClose(tabs[currentIndex].id);
            }
            break;
          case 't':
            e.preventDefault();
            if (canAddMore) {
              onNewDocument();
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [tabs, onTabClick, onTabClose, onNewDocument, canAddMore]);

  return (
    <div className={cn(
      "flex items-center gap-1 bg-gray-100/50 p-1 rounded-lg border border-gray-200/50",
      animations.smooth,
      className
    )}>
      {/* Document Tabs */}
      <div 
        ref={tabsContainerRef}
        className="flex items-center gap-1 overflow-x-auto scrollbar-hide"
        onDragLeave={handleDragLeave}
      >
        {tabs.map((tab, index) => {
          const isDragging = draggedTab === tab.id;
          const isDragOver = dragOverIndex === index;
          
          return (
            <div
              key={tab.id}
              draggable={onTabReorder ? true : false}
              className={cn(
                "group relative flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer min-w-0 max-w-48",
                getStatusColor(tab.status, tab.isActive, isDragging),
                focusRing.default,
                isDragOver && "ring-2 ring-purple-400 ring-offset-1",
                isDragging && "opacity-50",
                isReordering && !isDragging && "transition-transform duration-200"
              )}
              onClick={() => !isDragging && onTabClick(tab.id)}
              onDragStart={(e) => handleDragStart(e, tab.id, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              title={getStatusTooltip(tab.status, tab.lastModified)}
              tabIndex={0}
              role="tab"
              aria-selected={tab.isActive}
              aria-label={`${tab.title} - ${getStatusTooltip(tab.status)}`}
            >
              {/* Drag Handle */}
              {onTabReorder && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-3 h-3 text-gray-400" />
                </div>
              )}

              {/* Tab Icon */}
              <FileText className="w-4 h-4 flex-shrink-0 text-gray-500" />
              
              {/* Tab Title */}
              <span className="text-sm font-medium truncate flex-1 min-w-0">
                {tab.title}
              </span>
              
              {/* Status Indicator */}
              <div className="flex-shrink-0">
                {getStatusIcon(tab.status, tab.isActive)}
              </div>
              
              {/* Close Button */}
              {documents.length > 1 && (
                <EnhancedButton
                  variant="ghost"
                  size="xs"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-5 w-5 p-0 hover:bg-red-100 hover:text-red-600 ml-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                  title="Close tab (Ctrl+W)"
                >
                  <X className="w-3 h-3" />
                </EnhancedButton>
              )}
              
              {/* Active Tab Indicator */}
              {tab.isActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full" />
              )}

              {/* Unsaved Changes Indicator */}
              {tab.hasUnsavedChanges && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              )}
            </div>
          );
        })}
      </div>
      
      {/* New Document Button */}
      {canAddMore && (
        <EnhancedButton
          variant="ghost"
          size="sm"
          onClick={onNewDocument}
          className="flex-shrink-0 text-gray-600 hover:text-purple-600 hover:bg-purple-50 border border-dashed border-gray-300 hover:border-purple-300"
          title="New document (Ctrl+T)"
        >
          <span className="text-lg leading-none">+</span>
        </EnhancedButton>
      )}
      
      {/* Tab Limit Indicator */}
      {!canAddMore && (
        <div className="flex-shrink-0 text-xs text-gray-500 px-2" title="Maximum tabs reached">
          {documents.length}/{maxTabs}
        </div>
      )}

      {/* Keyboard Shortcuts Hint */}
      <div className="hidden lg:block flex-shrink-0 text-xs text-gray-400 px-2 border-l border-gray-300">
        Ctrl+Tab to switch • Ctrl+W to close • Ctrl+T to add
      </div>
    </div>
  );
}