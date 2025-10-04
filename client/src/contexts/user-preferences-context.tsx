import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface LayoutPreferences {
  sidebarCollapsed: boolean;
  previewMode: 'split' | 'preview-only' | 'edit-only';
  panelSizes: {
    sidebar: number;
    editor: number;
    preview: number;
  };
  compactMode: boolean;
  showLineNumbers: boolean;
  wordWrap: boolean;
}

export interface BehaviorPreferences {
  autoSave: boolean;
  autoPreview: boolean;
  confirmBeforeDelete: boolean;
  showTooltips: boolean;
  enableAnimations: boolean;
  enableSounds: boolean;
  keyboardShortcuts: boolean;
  autoComplete: boolean;
  spellCheck: boolean;
}

export interface EditorPreferences {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  tabSize: number;
  insertSpaces: boolean;
  trimTrailingWhitespace: boolean;
  insertFinalNewline: boolean;
  highlightCurrentLine: boolean;
  showInvisibles: boolean;
}

export interface UserPreferences {
  layout: LayoutPreferences;
  behavior: BehaviorPreferences;
  editor: EditorPreferences;
  lastUpdated: string;
  version: string;
}

interface UserPreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  updateLayoutPreferences: (updates: Partial<LayoutPreferences>) => void;
  updateBehaviorPreferences: (updates: Partial<BehaviorPreferences>) => void;
  updateEditorPreferences: (updates: Partial<EditorPreferences>) => void;
  resetPreferences: () => void;
  exportPreferences: () => string;
  importPreferences: (data: string) => boolean;
  isLoading: boolean;
}

const defaultPreferences: UserPreferences = {
  layout: {
    sidebarCollapsed: false,
    previewMode: 'split',
    panelSizes: {
      sidebar: 250,
      editor: 50,
      preview: 50,
    },
    compactMode: false,
    showLineNumbers: true,
    wordWrap: true,
  },
  behavior: {
    autoSave: true,
    autoPreview: true,
    confirmBeforeDelete: true,
    showTooltips: true,
    enableAnimations: true,
    enableSounds: false,
    keyboardShortcuts: true,
    autoComplete: true,
    spellCheck: true,
  },
  editor: {
    fontSize: 14,
    fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
    lineHeight: 1.5,
    tabSize: 2,
    insertSpaces: true,
    trimTrailingWhitespace: true,
    insertFinalNewline: true,
    highlightCurrentLine: true,
    showInvisibles: false,
  },
  lastUpdated: new Date().toISOString(),
  version: '1.0.0',
};

const STORAGE_KEY = 'format-a-user-preferences';
const PREFERENCES_VERSION = '1.0.0';

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Migrate old preferences if needed
        const migrated = migratePreferences(parsed);
        
        setPreferences({
          ...defaultPreferences,
          ...migrated,
          version: PREFERENCES_VERSION,
          lastUpdated: migrated.lastUpdated || new Date().toISOString(),
        });
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
      setPreferences(defaultPreferences);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save preferences to localStorage
  const savePreferences = useCallback((newPreferences: UserPreferences) => {
    try {
      const toSave = {
        ...newPreferences,
        lastUpdated: new Date().toISOString(),
        version: PREFERENCES_VERSION,
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      setPreferences(toSave);
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  }, []);

  // Update all preferences
  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  // Update layout preferences
  const updateLayoutPreferences = useCallback((updates: Partial<LayoutPreferences>) => {
    const newPreferences = {
      ...preferences,
      layout: { ...preferences.layout, ...updates },
    };
    savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  // Update behavior preferences
  const updateBehaviorPreferences = useCallback((updates: Partial<BehaviorPreferences>) => {
    const newPreferences = {
      ...preferences,
      behavior: { ...preferences.behavior, ...updates },
    };
    savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  // Update editor preferences
  const updateEditorPreferences = useCallback((updates: Partial<EditorPreferences>) => {
    const newPreferences = {
      ...preferences,
      editor: { ...preferences.editor, ...updates },
    };
    savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  // Reset to defaults
  const resetPreferences = useCallback(() => {
    const resetPrefs = {
      ...defaultPreferences,
      lastUpdated: new Date().toISOString(),
      version: PREFERENCES_VERSION,
    };
    savePreferences(resetPrefs);
  }, [savePreferences]);

  // Export preferences as JSON string
  const exportPreferences = useCallback(() => {
    return JSON.stringify(preferences, null, 2);
  }, [preferences]);

  // Import preferences from JSON string
  const importPreferences = useCallback((data: string) => {
    try {
      const parsed = JSON.parse(data);
      const migrated = migratePreferences(parsed);
      
      // Validate the structure
      if (validatePreferences(migrated)) {
        savePreferences({
          ...defaultPreferences,
          ...migrated,
          version: PREFERENCES_VERSION,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import preferences:', error);
      return false;
    }
  }, [savePreferences]);

  // Apply CSS custom properties based on preferences
  useEffect(() => {
    const root = document.documentElement;
    
    // Editor preferences
    root.style.setProperty('--editor-font-size', `${preferences.editor.fontSize}px`);
    root.style.setProperty('--editor-font-family', preferences.editor.fontFamily);
    root.style.setProperty('--editor-line-height', preferences.editor.lineHeight.toString());
    root.style.setProperty('--editor-tab-size', preferences.editor.tabSize.toString());
    
    // Layout preferences
    root.style.setProperty('--sidebar-width', `${preferences.layout.panelSizes.sidebar}px`);
    
    // Behavior preferences
    if (!preferences.behavior.enableAnimations) {
      root.classList.add('no-animations');
    } else {
      root.classList.remove('no-animations');
    }
    
    if (preferences.layout.compactMode) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }
  }, [preferences]);

  const value = {
    preferences,
    updatePreferences,
    updateLayoutPreferences,
    updateBehaviorPreferences,
    updateEditorPreferences,
    resetPreferences,
    exportPreferences,
    importPreferences,
    isLoading,
  };

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
}

// Migration function for backwards compatibility
function migratePreferences(preferences: any): Partial<UserPreferences> {
  // Handle version migrations here
  if (!preferences.version || preferences.version < '1.0.0') {
    // Migrate from older versions
    return {
      ...preferences,
      version: PREFERENCES_VERSION,
    };
  }
  
  return preferences;
}

// Validation function
function validatePreferences(preferences: any): boolean {
  try {
    // Basic structure validation
    return (
      typeof preferences === 'object' &&
      preferences !== null &&
      (preferences.layout === undefined || typeof preferences.layout === 'object') &&
      (preferences.behavior === undefined || typeof preferences.behavior === 'object') &&
      (preferences.editor === undefined || typeof preferences.editor === 'object')
    );
  } catch {
    return false;
  }
}

// Hook for specific preference categories
export function useLayoutPreferences() {
  const { preferences, updateLayoutPreferences } = useUserPreferences();
  return {
    layout: preferences.layout,
    updateLayout: updateLayoutPreferences,
  };
}

export function useBehaviorPreferences() {
  const { preferences, updateBehaviorPreferences } = useUserPreferences();
  return {
    behavior: preferences.behavior,
    updateBehavior: updateBehaviorPreferences,
  };
}

export function useEditorPreferences() {
  const { preferences, updateEditorPreferences } = useUserPreferences();
  return {
    editor: preferences.editor,
    updateEditor: updateEditorPreferences,
  };
}