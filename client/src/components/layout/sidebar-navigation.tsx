import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  PanelLeftClose, 
  PanelLeftOpen,
  FileText,
  Settings,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import DocumentOutline from './document-outline';
import type { Document } from '@shared/schema';

interface SidebarNavigationProps {
  document: Document | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeSection?: string;
  activeSubsection?: string;
  onSectionClick: (sectionId: string) => void;
  onSubsectionClick: (sectionId: string, subsectionId: string) => void;
  onSectionAdd?: () => void;
  onSectionEdit?: (sectionId: string) => void;
  onSectionDelete?: (sectionId: string) => void;
  className?: string;
}

export default function SidebarNavigation({
  document,
  isCollapsed,
  onToggleCollapse,
  activeSection,
  activeSubsection,
  onSectionClick,
  onSubsectionClick,
  onSectionAdd,
  onSectionEdit,
  onSectionDelete,
  className,
}: SidebarNavigationProps) {
  const [activeTab, setActiveTab] = useState<'outline' | 'settings' | 'help'>('outline');

  const tabs = [
    {
      id: 'outline' as const,
      label: 'Outline',
      icon: FileText,
      content: (
        <DocumentOutline
          document={document}
          activeSection={activeSection}
          activeSubsection={activeSubsection}
          onSectionClick={onSectionClick}
          onSubsectionClick={onSubsectionClick}
          onSectionAdd={onSectionAdd}
          onSectionEdit={onSectionEdit}
          onSectionDelete={onSectionDelete}
        />
      ),
    },
    {
      id: 'settings' as const,
      label: 'Settings',
      icon: Settings,
      content: (
        <div className="p-4 text-center text-gray-500">
          <Settings className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">Document settings coming soon</p>
        </div>
      ),
    },
    {
      id: 'help' as const,
      label: 'Help',
      icon: HelpCircle,
      content: (
        <div className="p-4 text-center text-gray-500">
          <HelpCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">Help & documentation coming soon</p>
        </div>
      ),
    },
  ];

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className={cn(
      'relative bg-white border-r border-gray-200 transition-all duration-300 ease-in-out',
      'flex flex-col h-full',
      isCollapsed ? 'w-12' : 'w-80',
      className
    )}>
      {/* Collapse Toggle Button */}
      <div className="absolute -right-3 top-6 z-10">
        <EnhancedButton
          variant="outline"
          size="xs"
          onClick={onToggleCollapse}
          className="h-6 w-6 p-0 bg-white border-gray-300 shadow-sm hover:shadow-md"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-3 h-3" />
          ) : (
            <PanelLeftClose className="w-3 h-3" />
          )}
        </EnhancedButton>
      </div>

      {isCollapsed ? (
        /* Collapsed State - Icon Only */
        <div className="flex flex-col items-center py-4 space-y-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <EnhancedButton
                key={tab.id}
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveTab(tab.id);
                  onToggleCollapse(); // Expand when clicking a tab
                }}
                className={cn(
                  'h-8 w-8 p-0',
                  activeTab === tab.id 
                    ? 'bg-purple-100 text-purple-600' 
                    : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                )}
                title={tab.label}
              >
                <Icon className="w-4 h-4" />
              </EnhancedButton>
            );
          })}
        </div>
      ) : (
        /* Expanded State - Full Sidebar */
        <>
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 bg-gray-50/50">
            <div className="flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-all duration-200',
                      'border-b-2 border-transparent',
                      activeTab === tab.id
                        ? 'text-purple-600 border-purple-500 bg-white'
                        : 'text-gray-600 hover:text-purple-600 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:block">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTabContent}
          </div>
        </>
      )}

      {/* Resize Handle */}
      {!isCollapsed && (
        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-purple-300 transition-colors duration-200 group">
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-8 bg-gray-300 rounded-l opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </div>
      )}
    </div>
  );
}