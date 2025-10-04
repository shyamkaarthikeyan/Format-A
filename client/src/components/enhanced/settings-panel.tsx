import React, { useState } from 'react';
import { useTheme } from '@/contexts/theme-context';
import { useAccessibility } from '@/contexts/accessibility-context';
import { useUserPreferences } from '@/contexts/user-preferences-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Settings, 
  Palette, 
  Layout, 
  Keyboard, 
  Eye, 
  Volume2, 
  Download, 
  Upload, 
  RotateCcw,
  Monitor,
  Sun,
  Moon,
  Contrast,
  MousePointer,
  Type,
  Code,
  Save,
  Zap
} from 'lucide-react';

interface SettingsPanelProps {
  trigger?: React.ReactNode;
}

export function SettingsPanel({ trigger }: SettingsPanelProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { preferences: accessibilityPrefs, updatePreference: updateAccessibilityPref } = useAccessibility();
  const { 
    preferences, 
    updateLayoutPreferences, 
    updateBehaviorPreferences, 
    updateEditorPreferences,
    resetPreferences,
    exportPreferences,
    importPreferences
  } = useUserPreferences();

  const [isOpen, setIsOpen] = useState(false);
  const [importData, setImportData] = useState('');
  const [importError, setImportError] = useState('');

  const handleExport = () => {
    const data = exportPreferences();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'format-a-preferences.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    setImportError('');
    if (importPreferences(importData)) {
      setImportData('');
      setIsOpen(false);
    } else {
      setImportError('Invalid preferences data. Please check the format and try again.');
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setImportData(content);
      };
      reader.readAsText(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings & Preferences
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="appearance" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="layout" className="flex items-center gap-2">
              <Layout className="h-4 w-4" />
              Layout
            </TabsTrigger>
            <TabsTrigger value="behavior" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Behavior
            </TabsTrigger>
            <TabsTrigger value="accessibility" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Accessibility
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Theme & Colors
                </CardTitle>
                <CardDescription>
                  Customize the visual appearance of the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select value={theme} onValueChange={(value: 'light' | 'dark' | 'auto') => setTheme(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="h-4 w-4" />
                          Light
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="h-4 w-4" />
                          Dark
                        </div>
                      </SelectItem>
                      <SelectItem value="auto">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          System
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Current: {resolvedTheme} theme
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>High Contrast Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Increase contrast for better visibility
                    </p>
                  </div>
                  <Switch
                    checked={accessibilityPrefs.highContrast}
                    onCheckedChange={(checked) => updateAccessibilityPref('highContrast', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Compact Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Reduce spacing for more content on screen
                    </p>
                  </div>
                  <Switch
                    checked={preferences.layout.compactMode}
                    onCheckedChange={(checked) => updateLayoutPreferences({ compactMode: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Typography
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Font Size</Label>
                  <div className="flex items-center space-x-4">
                    <Slider
                      value={[preferences.editor.fontSize]}
                      onValueChange={([value]) => updateEditorPreferences({ fontSize: value })}
                      min={10}
                      max={24}
                      step={1}
                      className="flex-1"
                    />
                    <Badge variant="secondary">{preferences.editor.fontSize}px</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Font Family</Label>
                  <Select
                    value={preferences.editor.fontFamily}
                    onValueChange={(value) => updateEditorPreferences({ fontFamily: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="JetBrains Mono, Consolas, Monaco, monospace">JetBrains Mono</SelectItem>
                      <SelectItem value="Fira Code, Consolas, Monaco, monospace">Fira Code</SelectItem>
                      <SelectItem value="Source Code Pro, Consolas, Monaco, monospace">Source Code Pro</SelectItem>
                      <SelectItem value="Consolas, Monaco, monospace">Consolas</SelectItem>
                      <SelectItem value="Monaco, monospace">Monaco</SelectItem>
                      <SelectItem value="system-ui, -apple-system, sans-serif">System UI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Line Height</Label>
                  <div className="flex items-center space-x-4">
                    <Slider
                      value={[preferences.editor.lineHeight]}
                      onValueChange={([value]) => updateEditorPreferences({ lineHeight: value })}
                      min={1.0}
                      max={2.0}
                      step={0.1}
                      className="flex-1"
                    />
                    <Badge variant="secondary">{preferences.editor.lineHeight}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Layout Tab */}
          <TabsContent value="layout" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  Workspace Layout
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Default Preview Mode</Label>
                  <Select
                    value={preferences.layout.previewMode}
                    onValueChange={(value: 'split' | 'preview-only' | 'edit-only') => 
                      updateLayoutPreferences({ previewMode: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="split">Split View</SelectItem>
                      <SelectItem value="edit-only">Editor Only</SelectItem>
                      <SelectItem value="preview-only">Preview Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sidebar Width</Label>
                  <div className="flex items-center space-x-4">
                    <Slider
                      value={[preferences.layout.panelSizes.sidebar]}
                      onValueChange={([value]) => 
                        updateLayoutPreferences({ 
                          panelSizes: { ...preferences.layout.panelSizes, sidebar: value }
                        })
                      }
                      min={200}
                      max={400}
                      step={10}
                      className="flex-1"
                    />
                    <Badge variant="secondary">{preferences.layout.panelSizes.sidebar}px</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Line Numbers</Label>
                    <p className="text-sm text-muted-foreground">
                      Display line numbers in the editor
                    </p>
                  </div>
                  <Switch
                    checked={preferences.layout.showLineNumbers}
                    onCheckedChange={(checked) => updateLayoutPreferences({ showLineNumbers: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Word Wrap</Label>
                    <p className="text-sm text-muted-foreground">
                      Wrap long lines in the editor
                    </p>
                  </div>
                  <Switch
                    checked={preferences.layout.wordWrap}
                    onCheckedChange={(checked) => updateLayoutPreferences({ wordWrap: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Behavior Tab */}
          <TabsContent value="behavior" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Save className="h-5 w-5" />
                  Auto-Save & Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Save</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically save changes as you type
                    </p>
                  </div>
                  <Switch
                    checked={preferences.behavior.autoSave}
                    onCheckedChange={(checked) => updateBehaviorPreferences({ autoSave: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Preview</Label>
                    <p className="text-sm text-muted-foreground">
                      Update preview automatically as you edit
                    </p>
                  </div>
                  <Switch
                    checked={preferences.behavior.autoPreview}
                    onCheckedChange={(checked) => updateBehaviorPreferences({ autoPreview: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Complete</Label>
                    <p className="text-sm text-muted-foreground">
                      Show suggestions while typing
                    </p>
                  </div>
                  <Switch
                    checked={preferences.behavior.autoComplete}
                    onCheckedChange={(checked) => updateBehaviorPreferences({ autoComplete: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Spell Check</Label>
                    <p className="text-sm text-muted-foreground">
                      Check spelling in text fields
                    </p>
                  </div>
                  <Switch
                    checked={preferences.behavior.spellCheck}
                    onCheckedChange={(checked) => updateBehaviorPreferences({ spellCheck: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MousePointer className="h-5 w-5" />
                  User Interface
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Tooltips</Label>
                    <p className="text-sm text-muted-foreground">
                      Display helpful tooltips on hover
                    </p>
                  </div>
                  <Switch
                    checked={preferences.behavior.showTooltips}
                    onCheckedChange={(checked) => updateBehaviorPreferences({ showTooltips: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Animations</Label>
                    <p className="text-sm text-muted-foreground">
                      Show smooth transitions and animations
                    </p>
                  </div>
                  <Switch
                    checked={preferences.behavior.enableAnimations}
                    onCheckedChange={(checked) => updateBehaviorPreferences({ enableAnimations: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Confirm Before Delete</Label>
                    <p className="text-sm text-muted-foreground">
                      Ask for confirmation before deleting items
                    </p>
                  </div>
                  <Switch
                    checked={preferences.behavior.confirmBeforeDelete}
                    onCheckedChange={(checked) => updateBehaviorPreferences({ confirmBeforeDelete: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Accessibility Tab */}
          <TabsContent value="accessibility" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Keyboard className="h-5 w-5" />
                  Keyboard & Navigation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Keyboard Navigation</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable keyboard navigation throughout the app
                    </p>
                  </div>
                  <Switch
                    checked={accessibilityPrefs.keyboardNavigation}
                    onCheckedChange={(checked) => updateAccessibilityPref('keyboardNavigation', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Keyboard Shortcuts</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable keyboard shortcuts for common actions
                    </p>
                  </div>
                  <Switch
                    checked={preferences.behavior.keyboardShortcuts}
                    onCheckedChange={(checked) => updateBehaviorPreferences({ keyboardShortcuts: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Focus Indicators</Label>
                    <p className="text-sm text-muted-foreground">
                      Show clear focus indicators for keyboard navigation
                    </p>
                  </div>
                  <Switch
                    checked={accessibilityPrefs.focusVisible}
                    onCheckedChange={(checked) => updateAccessibilityPref('focusVisible', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Visual & Motion
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Reduced Motion</Label>
                    <p className="text-sm text-muted-foreground">
                      Minimize animations and transitions
                    </p>
                  </div>
                  <Switch
                    checked={accessibilityPrefs.reducedMotion}
                    onCheckedChange={(checked) => updateAccessibilityPref('reducedMotion', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Screen Reader Optimized</Label>
                    <p className="text-sm text-muted-foreground">
                      Optimize interface for screen readers
                    </p>
                  </div>
                  <Switch
                    checked={accessibilityPrefs.screenReaderOptimized}
                    onCheckedChange={(checked) => updateAccessibilityPref('screenReaderOptimized', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Announcements</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable screen reader announcements for actions
                    </p>
                  </div>
                  <Switch
                    checked={accessibilityPrefs.announcements}
                    onCheckedChange={(checked) => updateAccessibilityPref('announcements', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Editor Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tab Size</Label>
                  <div className="flex items-center space-x-4">
                    <Slider
                      value={[preferences.editor.tabSize]}
                      onValueChange={([value]) => updateEditorPreferences({ tabSize: value })}
                      min={2}
                      max={8}
                      step={1}
                      className="flex-1"
                    />
                    <Badge variant="secondary">{preferences.editor.tabSize} spaces</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Insert Spaces</Label>
                    <p className="text-sm text-muted-foreground">
                      Use spaces instead of tabs for indentation
                    </p>
                  </div>
                  <Switch
                    checked={preferences.editor.insertSpaces}
                    onCheckedChange={(checked) => updateEditorPreferences({ insertSpaces: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Trim Trailing Whitespace</Label>
                    <p className="text-sm text-muted-foreground">
                      Remove trailing whitespace on save
                    </p>
                  </div>
                  <Switch
                    checked={preferences.editor.trimTrailingWhitespace}
                    onCheckedChange={(checked) => updateEditorPreferences({ trimTrailingWhitespace: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Highlight Current Line</Label>
                    <p className="text-sm text-muted-foreground">
                      Highlight the line containing the cursor
                    </p>
                  </div>
                  <Switch
                    checked={preferences.editor.highlightCurrentLine}
                    onCheckedChange={(checked) => updateEditorPreferences({ highlightCurrentLine: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Import & Export</CardTitle>
                <CardDescription>
                  Backup and restore your preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button onClick={handleExport} variant="outline" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Export Settings
                  </Button>
                  <Button onClick={resetPreferences} variant="outline" className="flex-1">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Defaults
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Import Settings</Label>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept=".json"
                      onChange={handleFileImport}
                      className="flex-1"
                    />
                    <Button onClick={handleImport} disabled={!importData}>
                      <Upload className="h-4 w-4 mr-2" />
                      Import
                    </Button>
                  </div>
                  {importError && (
                    <p className="text-sm text-destructive">{importError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Or paste JSON data:</Label>
                  <Textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="Paste exported settings JSON here..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}