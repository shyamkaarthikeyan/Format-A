import React, { useRef, useCallback, useState } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  Edit3, 
  Eye, 
  Columns, 
  Focus,
  Settings2,
  Save,
  RotateCcw,
  Monitor,
  ChevronLeft,
  ChevronRight,
  Layout,
  Expand
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { useWorkspace, type ViewMode } from '@/contexts/workspace-context';
import ApplicationHeader from './application-header';
import SidebarNavigation from './sidebar-navigation';
import type { Document } from '@shared/schema';

interface WorkspaceLayoutProps {
  documents: Document[];
  activeDocument: Document | null;
  onTabClick: (documentId: string) => void;
  onTabClose: (documentId: string) => void;
  onTabReorder?: (fromIndex: number, toIndex: number) => void;
  onNewDocument: () => void;
  onSectionClick: (sectionId: string) => void;
  onSubsectionClick: (sectionId: string, subsectionId: string) => void;
  editorContent: React.ReactNode;
  previewContent: React.ReactNode;
  documentStatuses?: Record<string, import('./document-tabs').DocumentStatus>;
  className?: string;
}

export default function WorkspaceLayout({
  documents,
  activeDocument,
  onTabClick,
  onTabClose,
  onTabReorder,
  onNewDocument,
  onSectionClick,
  onSubsectionClick,
  editorContent,
  previewContent,
  documentStatuses,
  className,
}: WorkspaceLayoutProps) {
  const { state, actions } = useWorkspace();
  const resizeRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const [showLayoutPanel, setShowLayoutPanel] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    e.preventDefault();

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current || !resizeRef.current) return;

      const container = resizeRef.current.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const newEditorWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      
      // Clamp between 20% and 80%
      const clampedWidth = Math.max(20, Math.min(80, newEditorWidth));
      
      actions.setPanelSizes({
        editor: clampedWidth,
        preview: 100 - clampedWidth,
      });
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [actions]);

  const getViewModeIcon = (mode: ViewMode) => {
    switch (mode) {
      case 'edit-only':
        return <Edit3 className="w-4 h-4" />;
      case 'preview-only':
        return <Eye className="w-4 h-4" />;
      case 'split':
        return <Columns className="w-4 h-4" />;
      case 'fullscreen-preview':
        return <Expand className="w-4 h-4" />;
    }
  };

  const viewModes: { mode: ViewMode; label: string; shortcut: string }[] = [
    { mode: 'edit-only', label: 'Edit Only', shortcut: 'Ctrl+1' },
    { mode: 'preview-only', label: 'Preview Only', shortcut: 'Ctrl+2' },
    { mode: 'split', label: 'Split View', shortcut: 'Ctrl+3' },
    { mode: 'fullscreen-preview', label: 'Fullscreen Preview', shortcut: 'F12' },
  ];

  const handleSaveLayout = () => {
    if (newLayoutName.trim()) {
      actions.saveCurrentLayout(newLayoutName.trim());
      setNewLayoutName('');
      setShowLayoutPanel(false);
    }
  };

  const handlePanelAdjustment = (panel: 'editor' | 'preview', delta: number) => {
    actions.adjustPanelSize(panel, delta);
  };

  return (
    <div className={cn('flex flex-col h-screen bg-gray-50', className)}>
      {/* Application Header */}
      <ApplicationHeader
        documents={documents}
        activeDocument={activeDocument}
        onTabClick={onTabClick}
        onTabClose={onTabClose}
        onTabReorder={onTabReorder}
        onNewDocument={onNewDocument}
        onSectionClick={onSectionClick}
        onSubsectionClick={onSubsectionClick}
        documentStatuses={documentStatuses}
      />

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        {!state.distractionFreeMode && (
          <SidebarNavigation
            document={activeDocument}
            isCollapsed={state.sidebarCollapsed}
            onToggleCollapse={() => actions.setSidebarCollapsed(!state.sidebarCollapsed)}
            activeSection={state.activeSection || undefined}
            activeSubsection={state.activeSubsection || undefined}
            onSectionClick={(sectionId) => {
              actions.setActiveSection(sectionId);
              onSectionClick(sectionId);
            }}
            onSubsectionClick={(sectionId, subsectionId) => {
              actions.setActiveSubsection(subsectionId);
              onSubsectionClick(sectionId, subsectionId);
            }}
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          {!state.distractionFreeMode && (
            <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
              {/* View Mode Controls */}
              <div className="flex items-center gap-1">
                {viewModes.map(({ mode, label, shortcut }) => (
                  <EnhancedButton
                    key={mode}
                    variant={state.viewMode === mode ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => actions.setViewMode(mode)}
                    className="h-8"
                    title={`${label} (${shortcut})`}
                  >
                    {getViewModeIcon(mode)}
                    <span className="hidden sm:inline ml-1">{label}</span>
                  </EnhancedButton>
                ))}
              </div>

              {/* Panel Size Controls */}
              {state.viewMode === 'split' && (
                <div className="flex items-center gap-1 mx-4">
                  <EnhancedButton
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePanelAdjustment('editor', 10)}
                    className="h-8"
                    title="Expand Editor"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </EnhancedButton>
                  <span className="text-xs text-gray-500 min-w-[60px] text-center">
                    {Math.round(state.panelSizes.editor)}% | {Math.round(state.panelSizes.preview)}%
                  </span>
                  <EnhancedButton
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePanelAdjustment('preview', 10)}
                    className="h-8"
                    title="Expand Preview"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </EnhancedButton>
                </div>
              )}

              {/* Workspace Controls */}
              <div className="flex items-center gap-1">
                <EnhancedButton
                  variant="ghost"
                  size="sm"
                  onClick={() => actions.toggleViewMode()}
                  className="h-8"
                  title="Toggle View Mode (Tab)"
                >
                  <Monitor className="w-4 h-4" />
                </EnhancedButton>

                <EnhancedButton
                  variant="ghost"
                  size="sm"
                  onClick={() => actions.setDistractionFreeMode(!state.distractionFreeMode)}
                  className="h-8"
                  title="Toggle Distraction-Free Mode (F11)"
                >
                  <Focus className="w-4 h-4" />
                </EnhancedButton>

                <div className="relative">
                  <EnhancedButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowLayoutPanel(!showLayoutPanel)}
                    className="h-8"
                    title="Layout Management"
                  >
                    <Layout className="w-4 h-4" />
                  </EnhancedButton>

                  {/* Layout Management Panel */}
                  {showLayoutPanel && (
                    <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900">Layout Management</h3>
                          <EnhancedButton
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowLayoutPanel(false)}
                            className="h-6 w-6 p-0"
                          >
                            ×
                          </EnhancedButton>
                        </div>

                        {/* Current Layout Info */}
                        <div className="text-sm text-gray-600">
                          <div>Current: {state.currentLayoutName || 'Custom'}</div>
                          <div>Mode: {state.viewMode}</div>
                          <div>Panels: {Math.round(state.panelSizes.editor)}% | {Math.round(state.panelSizes.preview)}%</div>
                        </div>

                        {/* Save Current Layout */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Save Current Layout</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newLayoutName}
                              onChange={(e) => setNewLayoutName(e.target.value)}
                              placeholder="Layout name..."
                              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveLayout()}
                            />
                            <EnhancedButton
                              variant="default"
                              size="sm"
                              onClick={handleSaveLayout}
                              disabled={!newLayoutName.trim()}
                              title="Save Layout"
                            >
                              <Save className="w-3 h-3" />
                            </EnhancedButton>
                          </div>
                        </div>

                        {/* Saved Layouts */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Saved Layouts</label>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {state.savedLayouts.map((layout) => (
                              <div
                                key={layout.name}
                                className={cn(
                                  "flex items-center justify-between p-2 rounded text-sm",
                                  state.currentLayoutName === layout.name
                                    ? "bg-purple-50 border border-purple-200"
                                    : "bg-gray-50 hover:bg-gray-100"
                                )}
                              >
                                <div className="flex-1">
                                  <div className="font-medium">{layout.name}</div>
                                  <div className="text-xs text-gray-500">{layout.viewMode}</div>
                                </div>
                                <div className="flex gap-1">
                                  <EnhancedButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => actions.loadLayout(layout.name)}
                                    className="h-6 px-2"
                                  >
                                    Load
                                  </EnhancedButton>
                                  {!['Default Split', 'Writing Focus', 'Review Mode'].includes(layout.name) && (
                                    <EnhancedButton
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => actions.deleteLayout(layout.name)}
                                      className="h-6 px-2 text-red-600 hover:text-red-700"
                                    >
                                      ×
                                    </EnhancedButton>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-2 pt-2 border-t border-gray-200">
                          <EnhancedButton
                            variant="ghost"
                            size="sm"
                            onClick={() => actions.resetLayout()}
                            className="flex-1"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Reset
                          </EnhancedButton>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Content Panels */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Editor Panel */}
            {state.viewMode !== 'preview-only' && state.viewMode !== 'fullscreen-preview' && (
              <div 
                className="bg-white border-r border-gray-200 overflow-hidden"
                style={{ 
                  width: state.viewMode === 'edit-only' ? '100%' : `${state.panelSizes.editor}%` 
                }}
              >
                {editorContent}
              </div>
            )}

            {/* Resize Handle */}
            {state.viewMode === 'split' && (
              <div
                ref={resizeRef}
                className="w-1 bg-gray-200 hover:bg-purple-300 cursor-col-resize transition-colors duration-200 relative group"
                onMouseDown={handleMouseDown}
              >
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-8 bg-gray-400 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
            )}

            {/* Preview Panel */}
            {(state.viewMode === 'preview-only' || state.viewMode === 'split' || state.viewMode === 'fullscreen-preview') && (
              <div 
                className={cn(
                  "bg-gray-50 overflow-hidden",
                  state.viewMode === 'fullscreen-preview' && "fixed inset-0 z-40 bg-white"
                )}
                style={{ 
                  width: state.viewMode === 'preview-only' || state.viewMode === 'fullscreen-preview' ? '100%' : `${state.panelSizes.preview}%` 
                }}
              >
                {previewContent}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Distraction-Free Mode Overlay */}
      {state.distractionFreeMode && (
        <div className="fixed top-4 right-4 z-50">
          <EnhancedButton
            variant="glass"
            size="sm"
            onClick={() => actions.setDistractionFreeMode(false)}
            className="shadow-lg"
          >
            <Minimize2 className="w-4 h-4 mr-1" />
            Exit Focus Mode
          </EnhancedButton>
        </div>
      )}

      {/* Fullscreen Preview Overlay Controls */}
      {state.viewMode === 'fullscreen-preview' && (
        <div className="fixed top-4 right-4 z-50 flex gap-2">
          <EnhancedButton
            variant="glass"
            size="sm"
            onClick={() => actions.setViewMode('split')}
            className="shadow-lg"
          >
            <Columns className="w-4 h-4 mr-1" />
            Split View
          </EnhancedButton>
          <EnhancedButton
            variant="glass"
            size="sm"
            onClick={() => actions.setViewMode('preview-only')}
            className="shadow-lg"
          >
            <Minimize2 className="w-4 h-4 mr-1" />
            Exit Fullscreen
          </EnhancedButton>
        </div>
      )}

      {/* Keyboard Shortcuts Handler */}
      <KeyboardShortcuts />
    </div>
  );
}

// Keyboard shortcuts component
function KeyboardShortcuts() {
  const { state, actions } = useWorkspace();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // View mode shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            actions.setViewMode('edit-only');
            break;
          case '2':
            e.preventDefault();
            actions.setViewMode('preview-only');
            break;
          case '3':
            e.preventDefault();
            actions.setViewMode('split');
            break;
          case '[':
            e.preventDefault();
            actions.adjustPanelSize('editor', 10);
            break;
          case ']':
            e.preventDefault();
            actions.adjustPanelSize('preview', 10);
            break;
        }
      }

      // Tab key for view mode cycling
      if (e.key === 'Tab' && e.altKey) {
        e.preventDefault();
        actions.toggleViewMode();
      }

      // Function keys
      if (e.key === 'F11') {
        e.preventDefault();
        actions.setDistractionFreeMode(!state.distractionFreeMode);
      }

      if (e.key === 'F12') {
        e.preventDefault();
        actions.setViewMode(state.viewMode === 'fullscreen-preview' ? 'split' : 'fullscreen-preview');
      }

      // Escape key handling
      if (e.key === 'Escape') {
        if (state.viewMode === 'fullscreen-preview') {
          actions.setViewMode('split');
        } else if (state.distractionFreeMode) {
          actions.setDistractionFreeMode(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [actions, state.distractionFreeMode, state.viewMode]);

  return null;
}