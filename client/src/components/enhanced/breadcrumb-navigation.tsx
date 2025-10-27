import React from 'react';
import { ChevronRight, Home, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { animations, focusRing } from '@/lib/ui-utils';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import type { Document } from '@shared/schema';

interface BreadcrumbItem {
  id: string;
  label: string;
  href?: string;
  isActive?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

interface BreadcrumbNavigationProps {
  document: Document | null;
  activeSection?: string;
  activeSubsection?: string;
  onNavigate: (path: { section?: string; subsection?: string }) => void;
  className?: string;
}

export default function BreadcrumbNavigation({
  document,
  activeSection,
  activeSubsection,
  onNavigate,
  className,
}: BreadcrumbNavigationProps) {
  // Build breadcrumb items based on current location
  const breadcrumbItems: BreadcrumbItem[] = React.useMemo(() => {
    const items: BreadcrumbItem[] = [
      {
        id: 'home',
        label: 'Document',
        icon: Home,
        isActive: !activeSection && !activeSubsection,
      },
    ];

    if (document) {
      // Add document title
      items.push({
        id: 'document',
        label: document.title || 'Untitled Document',
        icon: FileText,
        isActive: !activeSection && !activeSubsection,
      });

      // Add active section
      if (activeSection) {
        const section = document.sections.find(s => s.id === activeSection);
        if (section) {
          items.push({
            id: activeSection,
            label: section.title || 'Untitled Section',
            isActive: !activeSubsection,
          });

          // Add active subsection
          if (activeSubsection) {
            const subsection = section.subsections?.find(s => s.id === activeSubsection);
            if (subsection) {
              items.push({
                id: activeSubsection,
                label: subsection.title || 'Untitled Subsection',
                isActive: true,
              });
            }
          }
        }
      }
    }

    return items;
  }, [document, activeSection, activeSubsection]);

  const handleItemClick = (item: BreadcrumbItem) => {
    switch (item.id) {
      case 'home':
      case 'document':
        onNavigate({});
        break;
      default:
        if (item.id === activeSection) {
          onNavigate({ section: activeSection });
        } else if (item.id === activeSubsection) {
          onNavigate({ section: activeSection, subsection: activeSubsection });
        } else {
          // Navigate to section
          onNavigate({ section: item.id });
        }
    }
  };

  return (
    <nav 
      className={cn(
        "flex items-center space-x-1 text-sm",
        className
      )}
      aria-label="Breadcrumb navigation"
    >
      <ol className="flex items-center space-x-1">
        {breadcrumbItems.map((item, index) => {
          const Icon = item.icon;
          const isLast = index === breadcrumbItems.length - 1;

          return (
            <li key={item.id} className="flex items-center">
              {/* Breadcrumb Item */}
              <EnhancedButton
                variant="ghost"
                size="sm"
                onClick={() => handleItemClick(item)}
                className={cn(
                  "h-8 px-2 py-1 text-sm font-medium transition-all duration-200",
                  animations.smooth,
                  focusRing.default,
                  item.isActive 
                    ? "text-purple-700 bg-purple-50 hover:bg-purple-100" 
                    : "text-gray-600 hover:text-purple-600 hover:bg-gray-50",
                  "max-w-[200px] truncate"
                )}
                title={item.label}
              >
                {Icon && (
                  <Icon className="w-4 h-4 mr-1 flex-shrink-0" />
                )}
                <span className="truncate">{item.label}</span>
              </EnhancedButton>

              {/* Separator */}
              {!isLast && (
                <ChevronRight 
                  className="w-4 h-4 mx-1 text-gray-400 flex-shrink-0" 
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Quick Navigation Dropdown */}
      {document && document.sections.length > 0 && (
        <div className="ml-4 pl-4 border-l border-gray-200">
          <QuickNavigationDropdown
            document={document}
            activeSection={activeSection}
            activeSubsection={activeSubsection}
            onNavigate={onNavigate}
          />
        </div>
      )}
    </nav>
  );
}

// Quick navigation dropdown for jumping to any section
interface QuickNavigationDropdownProps {
  document: Document;
  activeSection?: string;
  activeSubsection?: string;
  onNavigate: (path: { section?: string; subsection?: string }) => void;
}

function QuickNavigationDropdown({
  document,
  activeSection,
  activeSubsection,
  onNavigate,
}: QuickNavigationDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (typeof document !== 'undefined') {
      (document as any).addEventListener('mousedown', handleClickOutside);
      return () => (document as any).removeEventListener('mousedown', handleClickOutside);
    }
  }, []);

  const handleSectionClick = (sectionId: string, subsectionId?: string) => {
    onNavigate({ section: sectionId, subsection: subsectionId });
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <EnhancedButton
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 px-2 text-sm text-gray-600 hover:text-purple-600"
      >
        Jump to...
        <ChevronRight 
          className={cn(
            "w-3 h-3 ml-1 transition-transform duration-200",
            isOpen && "rotate-90"
          )} 
        />
      </EnhancedButton>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={cn(
          "absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50",
          "max-h-80 overflow-y-auto",
          animations.smooth
        )}>
          <div className="p-2">
            {document.sections.map((section) => (
              <div key={section.id}>
                {/* Section Item */}
                <button
                  onClick={() => handleSectionClick(section.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors duration-150",
                    "hover:bg-gray-50 focus:bg-gray-50 focus:outline-none",
                    activeSection === section.id && !activeSubsection 
                      ? "bg-purple-50 text-purple-700 font-medium" 
                      : "text-gray-700"
                  )}
                >
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-purple-400 mr-2 flex-shrink-0" />
                    <span className="truncate">{section.title || 'Untitled Section'}</span>
                  </div>
                </button>

                {/* Subsections */}
                {section.subsections && section.subsections.length > 0 && (
                  <div className="ml-4 mt-1 space-y-1">
                    {section.subsections.map((subsection) => (
                      <button
                        key={subsection.id}
                        onClick={() => handleSectionClick(section.id, subsection.id)}
                        className={cn(
                          "w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors duration-150",
                          "hover:bg-gray-50 focus:bg-gray-50 focus:outline-none",
                          activeSection === section.id && activeSubsection === subsection.id
                            ? "bg-purple-50 text-purple-700 font-medium"
                            : "text-gray-600"
                        )}
                      >
                        <div className="flex items-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-2 flex-shrink-0" />
                          <span className="truncate">{subsection.title || 'Untitled Subsection'}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}