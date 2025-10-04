import React, { createContext, useContext, useEffect, useState } from 'react';

export type ViewMode = 'split' | 'edit-only' | 'preview-only' | 'fullscreen-preview';

export interface PanelSizes {
  sidebar: number;
  editor: number;
  preview: number;
}

export interface LayoutPreset {
  name: string;
  viewMode: ViewMode;
  panelSizes: PanelSizes;
  sidebarCollapsed: boolean;
}

interface WorkspaceState {
  // Layout preferences
  sidebarCollapsed: boolean;
  viewMode: ViewMode;
  panelSizes: PanelSizes;
  
  // UI preferences
  distractionFreeMode: boolean;
  fullscreenPreview: boolean;
  compactMode: boolean;
  showLineNumbers: boolean;
  autoSave: boolean;
  
  // Active states
  activeSection: string | null;
  activeSubsection: string | null;
  
  // Zoom and display
  previewZoom: number;
  editorFontSize: number;
  
  // Layout presets
  savedLayouts: LayoutPreset[];
  currentLayoutName: string | null;
  
  // Panel constraints
  minPanelSize: number;
  maxPanelSize: number;
}

interface WorkspaceContextType {
  state: WorkspaceState;
  actions: {
    setSidebarCollapsed: (collapsed: boolean) => void;
    setViewMode: (mode: ViewMode) => void;
    setPanelSizes: (sizes: Partial<WorkspaceState['panelSizes']>) => void;
    setDistractionFreeMode: (enabled: boolean) => void;
    setFullscreenPreview: (enabled: boolean) => void;
    setCompactMode: (enabled: boolean) => void;
    setShowLineNumbers: (show: boolean) => void;
    setAutoSave: (enabled: boolean) => void;
    setActiveSection: (sectionId: string | null) => void;
    setActiveSubsection: (subsectionId: string | null) => void;
    setPreviewZoom: (zoom: number) => void;
    setEditorFontSize: (size: number) => void;
    resetLayout: () => void;
    saveCurrentLayout: (name: string) => void;
    loadLayout: (name: string) => void;
    deleteLayout: (name: string) => void;
    toggleViewMode: () => void;
    adjustPanelSize: (panel: 'editor' | 'preview', delta: number) => void;
  };
}

const defaultState: WorkspaceState = {
  sidebarCollapsed: false,
  viewMode: 'split',
  panelSizes: {
    sidebar: 320,
    editor: 50,
    preview: 50,
  },
  distractionFreeMode: false,
  fullscreenPreview: false,
  compactMode: false,
  showLineNumbers: false,
  autoSave: true,
  activeSection: null,
  activeSubsection: null,
  previewZoom: 75,
  editorFontSize: 14,
  savedLayouts: [
    {
      name: 'Default Split',
      viewMode: 'split',
      panelSizes: { sidebar: 320, editor: 50, preview: 50 },
      sidebarCollapsed: false,
    },
    {
      name: 'Writing Focus',
      viewMode: 'edit-only',
      panelSizes: { sidebar: 280, editor: 100, preview: 0 },
      sidebarCollapsed: false,
    },
    {
      name: 'Review Mode',
      viewMode: 'preview-only',
      panelSizes: { sidebar: 280, editor: 0, preview: 100 },
      sidebarCollapsed: false,
    },
  ],
  currentLayoutName: 'Default Split',
  minPanelSize: 20,
  maxPanelSize: 80,
};

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkspaceState>(() => {
    // Load from localStorage
    const stored = localStorage.getItem('format-a-workspace');
    if (stored) {
      try {
        return { ...defaultState, ...JSON.parse(stored) };
      } catch {
        return defaultState;
      }
    }
    return defaultState;
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('format-a-workspace', JSON.stringify(state));
  }, [state]);

  const actions = {
    setSidebarCollapsed: (collapsed: boolean) => {
      setState(prev => ({ ...prev, sidebarCollapsed: collapsed }));
    },

    setViewMode: (mode: ViewMode) => {
      setState(prev => {
        const newPanelSizes = { ...prev.panelSizes };
        
        // Adjust panel sizes based on view mode
        switch (mode) {
          case 'edit-only':
            newPanelSizes.editor = 100;
            newPanelSizes.preview = 0;
            break;
          case 'preview-only':
            newPanelSizes.editor = 0;
            newPanelSizes.preview = 100;
            break;
          case 'split':
            newPanelSizes.editor = 50;
            newPanelSizes.preview = 50;
            break;
        }
        
        return { 
          ...prev, 
          viewMode: mode,
          panelSizes: newPanelSizes
        };
      });
    },

    setPanelSizes: (sizes: Partial<WorkspaceState['panelSizes']>) => {
      setState(prev => ({
        ...prev,
        panelSizes: { ...prev.panelSizes, ...sizes }
      }));
    },

    setDistractionFreeMode: (enabled: boolean) => {
      setState(prev => ({ 
        ...prev, 
        distractionFreeMode: enabled,
        // Auto-collapse sidebar in distraction-free mode
        sidebarCollapsed: enabled ? true : prev.sidebarCollapsed
      }));
    },

    setCompactMode: (enabled: boolean) => {
      setState(prev => ({ ...prev, compactMode: enabled }));
    },

    setShowLineNumbers: (show: boolean) => {
      setState(prev => ({ ...prev, showLineNumbers: show }));
    },

    setActiveSection: (sectionId: string | null) => {
      setState(prev => ({ 
        ...prev, 
        activeSection: sectionId,
        activeSubsection: null // Clear subsection when changing sections
      }));
    },

    setActiveSubsection: (subsectionId: string | null) => {
      setState(prev => ({ ...prev, activeSubsection: subsectionId }));
    },

    setPreviewZoom: (zoom: number) => {
      setState(prev => ({ 
        ...prev, 
        previewZoom: Math.max(25, Math.min(200, zoom)) // Clamp between 25% and 200%
      }));
    },

    setEditorFontSize: (size: number) => {
      setState(prev => ({ 
        ...prev, 
        editorFontSize: Math.max(10, Math.min(24, size)) // Clamp between 10px and 24px
      }));
    },

    resetLayout: () => {
      setState(defaultState);
    },

    setFullscreenPreview: (enabled: boolean) => {
      setState(prev => ({ 
        ...prev, 
        fullscreenPreview: enabled,
        // When entering fullscreen preview, switch to preview-only mode
        viewMode: enabled ? 'fullscreen-preview' : prev.viewMode === 'fullscreen-preview' ? 'split' : prev.viewMode
      }));
    },

    setAutoSave: (enabled: boolean) => {
      setState(prev => ({ ...prev, autoSave: enabled }));
    },

    saveCurrentLayout: (name: string) => {
      setState(prev => {
        const newLayout: LayoutPreset = {
          name,
          viewMode: prev.viewMode,
          panelSizes: { ...prev.panelSizes },
          sidebarCollapsed: prev.sidebarCollapsed,
        };

        const existingIndex = prev.savedLayouts.findIndex(layout => layout.name === name);
        const updatedLayouts = existingIndex >= 0 
          ? prev.savedLayouts.map((layout, index) => index === existingIndex ? newLayout : layout)
          : [...prev.savedLayouts, newLayout];

        return {
          ...prev,
          savedLayouts: updatedLayouts,
          currentLayoutName: name,
        };
      });
    },

    loadLayout: (name: string) => {
      setState(prev => {
        const layout = prev.savedLayouts.find(l => l.name === name);
        if (!layout) return prev;

        return {
          ...prev,
          viewMode: layout.viewMode,
          panelSizes: { ...layout.panelSizes },
          sidebarCollapsed: layout.sidebarCollapsed,
          currentLayoutName: name,
        };
      });
    },

    deleteLayout: (name: string) => {
      setState(prev => ({
        ...prev,
        savedLayouts: prev.savedLayouts.filter(layout => layout.name !== name),
        currentLayoutName: prev.currentLayoutName === name ? null : prev.currentLayoutName,
      }));
    },

    toggleViewMode: () => {
      setState(prev => {
        const modes: ViewMode[] = ['split', 'edit-only', 'preview-only'];
        const currentIndex = modes.indexOf(prev.viewMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        
        const newPanelSizes = { ...prev.panelSizes };
        
        // Adjust panel sizes based on view mode
        switch (nextMode) {
          case 'edit-only':
            newPanelSizes.editor = 100;
            newPanelSizes.preview = 0;
            break;
          case 'preview-only':
            newPanelSizes.editor = 0;
            newPanelSizes.preview = 100;
            break;
          case 'split':
            newPanelSizes.editor = 50;
            newPanelSizes.preview = 50;
            break;
        }
        
        return { 
          ...prev, 
          viewMode: nextMode,
          panelSizes: newPanelSizes
        };
      });
    },

    adjustPanelSize: (panel: 'editor' | 'preview', delta: number) => {
      setState(prev => {
        if (prev.viewMode !== 'split') return prev;

        const newSizes = { ...prev.panelSizes };
        const currentSize = newSizes[panel];
        const newSize = Math.max(prev.minPanelSize, Math.min(prev.maxPanelSize, currentSize + delta));
        
        if (panel === 'editor') {
          newSizes.editor = newSize;
          newSizes.preview = 100 - newSize;
        } else {
          newSizes.preview = newSize;
          newSizes.editor = 100 - newSize;
        }

        return {
          ...prev,
          panelSizes: newSizes,
        };
      });
    },
  };

  const value = {
    state,
    actions,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}