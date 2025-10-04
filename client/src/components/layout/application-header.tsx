import React from 'react';
import { ArrowLeft, Settings, Moon, Sun, Monitor, Save, Download, Share2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { useTheme } from '@/contexts/theme-context';
import { useWorkspace } from '@/contexts/workspace-context';
import DocumentTabs from './document-tabs';
import BreadcrumbNavigation from '@/components/enhanced/breadcrumb-navigation';
import SectionNavigation from '@/components/enhanced/section-navigation';
import { cn } from '@/lib/utils';
import type { Document } from '@shared/schema';

interface ApplicationHeaderProps {
  documents: Document[];
  activeDocument: Document | null;
  onTabClick: (documentId: string) => void;
  onTabClose: (documentId: string) => void;
  onTabReorder?: (fromIndex: number, toIndex: number) => void;
  onNewDocument: () => void;
  onSectionClick?: (sectionId: string) => void;
  onSubsectionClick?: (sectionId: string, subsectionId: string) => void;
  onSave?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  documentStatuses?: Record<string, import('./document-tabs').DocumentStatus>;
  className?: string;
}

export default function ApplicationHeader({
  documents,
  activeDocument,
  onTabClick,
  onTabClose,
  onTabReorder,
  onNewDocument,
  onSectionClick,
  onSubsectionClick,
  onSave,
  onExport,
  onShare,
  documentStatuses,
  className,
}: ApplicationHeaderProps) {
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const { state, actions } = useWorkspace();

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-4 h-4" />;
      case 'dark':
        return <Moon className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <header className={cn(
      "bg-white/95 backdrop-blur-sm border-b border-gray-200/50 shadow-sm",
      "sticky top-0 z-50 transition-all duration-300",
      className
    )}>
      <div className="px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left Section - Navigation & Branding */}
          <div className="flex items-center gap-4 min-w-0">
            <EnhancedButton
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/')}
              className="text-gray-600 hover:text-purple-600"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </EnhancedButton>
            
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-lg font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                Format A
              </span>
              <span className="text-sm text-gray-500 hidden md:block">
                IEEE Document Engine
              </span>
            </div>
          </div>

          {/* Center Section - Document Tabs */}
          <div className="flex-1 max-w-4xl mx-4">
            <DocumentTabs
              documents={documents}
              activeDocumentId={activeDocument?.id || null}
              onTabClick={onTabClick}
              onTabClose={onTabClose}
              onTabReorder={onTabReorder}
              onNewDocument={onNewDocument}
              documentStatuses={documentStatuses}
            />
          </div>

          {/* Right Section - Actions & Settings */}
          <div className="flex items-center gap-2">
            {/* Quick Actions */}
            {activeDocument && (
              <div className="hidden sm:flex items-center gap-1">
                {onSave && (
                  <EnhancedButton
                    variant="ghost"
                    size="sm"
                    onClick={onSave}
                    className="text-gray-600 hover:text-green-600"
                  >
                    <Save className="w-4 h-4" />
                  </EnhancedButton>
                )}
                
                {onExport && (
                  <EnhancedButton
                    variant="ghost"
                    size="sm"
                    onClick={onExport}
                    className="text-gray-600 hover:text-blue-600"
                  >
                    <Download className="w-4 h-4" />
                  </EnhancedButton>
                )}
                
                {onShare && (
                  <EnhancedButton
                    variant="ghost"
                    size="sm"
                    onClick={onShare}
                    className="text-gray-600 hover:text-purple-600"
                  >
                    <Share2 className="w-4 h-4" />
                  </EnhancedButton>
                )}
              </div>
            )}

            {/* Theme Toggle */}
            <EnhancedButton
              variant="ghost"
              size="sm"
              onClick={cycleTheme}
              className="text-gray-600 hover:text-purple-600"
            >
              {getThemeIcon()}
            </EnhancedButton>

            {/* Settings */}
            <EnhancedButton
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-purple-600"
            >
              <Settings className="w-4 h-4" />
            </EnhancedButton>
          </div>
        </div>

        {/* Enhanced Navigation Bar */}
        {activeDocument && (
          <div className="mt-3 flex items-center justify-between gap-4 border-t border-gray-100 pt-3">
            {/* Breadcrumb Navigation */}
            <div className="flex-1 min-w-0">
              <BreadcrumbNavigation
                document={activeDocument}
                activeSection={state.activeSection}
                activeSubsection={state.activeSubsection}
                onNavigate={({ section, subsection }) => {
                  if (section) {
                    actions.setActiveSection(section);
                    onSectionClick?.(section);
                  }
                  if (subsection) {
                    actions.setActiveSubsection(subsection);
                    onSubsectionClick?.(section || state.activeSection || '', subsection);
                  }
                  if (!section && !subsection) {
                    actions.setActiveSection(null);
                    actions.setActiveSubsection(null);
                  }
                }}
              />
            </div>

            {/* Compact Section Navigation */}
            {activeDocument.sections.length > 0 && (
              <div className="flex-shrink-0">
                <SectionNavigation
                  document={activeDocument}
                  activeSection={state.activeSection}
                  onSectionChange={(sectionId) => {
                    actions.setActiveSection(sectionId);
                    onSectionClick?.(sectionId);
                  }}
                  mode="compact"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}