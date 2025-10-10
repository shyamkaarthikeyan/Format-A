import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  MoreHorizontal,
  Eye,
  Edit3,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { animations, focusRing, gradients } from '@/lib/ui-utils';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import type { Document, Section } from '@shared/schema';

interface SectionNavigationProps {
  document: Document | null;
  activeSection?: string;
  onSectionChange: (sectionId: string) => void;
  onSectionAdd?: () => void;
  onSectionDelete?: (sectionId: string) => void;
  onSectionMove?: (sectionId: string, direction: 'up' | 'down') => void;
  mode?: 'compact' | 'full';
  className?: string;
}

export default function SectionNavigation({
  document,
  activeSection,
  onSectionChange,
  onSectionAdd,
  onSectionDelete,
  onSectionMove,
  mode = 'full',
  className,
}: SectionNavigationProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [showActions, setShowActions] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const sections = document?.sections || [];
  const currentIndex = sections.findIndex(s => s.id === activeSection);
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < sections.length - 1;

  // Handle section navigation with smooth transition
  const handleSectionChange = async (sectionId: string) => {
    if (isTransitioning || sectionId === activeSection) return;

    setIsTransitioning(true);
    
    // Add transition effect
    await new Promise(resolve => setTimeout(resolve, 150));
    
    onSectionChange(sectionId);
    
    // Scroll to section in navigation
    scrollToSection(sectionId);
    
    setTimeout(() => setIsTransitioning(false), 300);
  };

  // Navigate to previous section
  const goToPrevious = () => {
    if (canGoPrevious && !isTransitioning) {
      const previousSection = sections[currentIndex - 1];
      handleSectionChange(previousSection.id);
    }
  };

  // Navigate to next section
  const goToNext = () => {
    if (canGoNext && !isTransitioning) {
      const nextSection = sections[currentIndex + 1];
      handleSectionChange(nextSection.id);
    }
  };

  // Scroll to section in navigation list
  const scrollToSection = (sectionId: string) => {
    if (!scrollContainerRef.current) return;

    const sectionElement = scrollContainerRef.current.querySelector(
      `[data-section-id="${sectionId}"]`
    );
    
    if (sectionElement) {
      sectionElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't interfere with form inputs
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            goToPrevious();
            break;
          case 'ArrowRight':
            e.preventDefault();
            goToNext();
            break;
        }
      }
    };

    if (typeof window !== 'undefined' && window.document) {
      window.document.addEventListener('keydown', handleKeyDown);
      return () => window.document.removeEventListener('keydown', handleKeyDown);
    }
  }, [currentIndex, sections.length, isTransitioning]);

  if (!document || sections.length === 0) {
    return (
      <div className={cn("flex items-center justify-center p-4", className)}>
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-2">No sections yet</p>
          {onSectionAdd && (
            <EnhancedButton
              variant="outline"
              size="sm"
              onClick={onSectionAdd}
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add First Section
            </EnhancedButton>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'compact') {
    return (
      <CompactSectionNavigation
        sections={sections}
        activeSection={activeSection}
        currentIndex={currentIndex}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        isTransitioning={isTransitioning}
        onPrevious={goToPrevious}
        onNext={goToNext}
        onSectionChange={handleSectionChange}
        className={className}
      />
    );
  }

  return (
    <EnhancedCard variant="glass" className={cn("p-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">
          Section Navigation
        </h3>
        
        {onSectionAdd && (
          <EnhancedButton
            variant="ghost"
            size="xs"
            onClick={onSectionAdd}
            className="text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add
          </EnhancedButton>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-2 mb-4">
        <EnhancedButton
          variant="outline"
          size="sm"
          onClick={goToPrevious}
          disabled={!canGoPrevious || isTransitioning}
          className="flex-1"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </EnhancedButton>

        <div className="px-3 py-1 bg-gray-100 rounded-md text-xs font-medium text-gray-600">
          {currentIndex + 1} of {sections.length}
        </div>

        <EnhancedButton
          variant="outline"
          size="sm"
          onClick={goToNext}
          disabled={!canGoNext || isTransitioning}
          className="flex-1"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </EnhancedButton>
      </div>

      {/* Section List */}
      <div 
        ref={scrollContainerRef}
        className="space-y-2 max-h-64 overflow-y-auto"
      >
        {sections.map((section, index) => {
          const isActive = section.id === activeSection;
          const isHovered = hoveredSection === section.id;
          const showSectionActions = showActions === section.id;

          return (
            <div
              key={section.id}
              data-section-id={section.id}
              className={cn(
                "group relative rounded-lg p-3 transition-all duration-200 cursor-pointer",
                animations.smooth,
                focusRing.default,
                isActive && "bg-purple-50 border-2 border-purple-200 shadow-sm",
                !isActive && isHovered && "bg-gray-50 shadow-sm",
                isTransitioning && isActive && "animate-pulse"
              )}
              onClick={() => handleSectionChange(section.id)}
              onMouseEnter={() => setHoveredSection(section.id)}
              onMouseLeave={() => setHoveredSection(null)}
            >
              {/* Section Content */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Section Number and Title */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "flex-shrink-0 w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center",
                      isActive 
                        ? "bg-purple-600 text-white" 
                        : "bg-gray-200 text-gray-600"
                    )}>
                      {index + 1}
                    </span>
                    
                    <h4 className={cn(
                      "font-medium text-sm truncate",
                      isActive ? "text-purple-800" : "text-gray-800"
                    )}>
                      {section.title || 'Untitled Section'}
                    </h4>
                  </div>

                  {/* Section Progress */}
                  <div className="ml-8">
                    <SectionProgress section={section} />
                  </div>
                </div>

                {/* Actions */}
                <div className={cn(
                  "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                  isActive && "opacity-100"
                )}>
                  <EnhancedButton
                    variant="ghost"
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowActions(showSectionActions ? null : section.id);
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <MoreHorizontal className="w-3 h-3" />
                  </EnhancedButton>
                </div>
              </div>

              {/* Active Indicator */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-violet-600 rounded-l-lg" />
              )}

              {/* Actions Dropdown */}
              {showSectionActions && (
                <div className="absolute right-0 top-8 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="p-1">
                    {onSectionMove && index > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSectionMove(section.id, 'up');
                          setShowActions(null);
                        }}
                        className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-gray-50 flex items-center gap-2"
                      >
                        <ArrowUp className="w-3 h-3" />
                        Move Up
                      </button>
                    )}
                    
                    {onSectionMove && index < sections.length - 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSectionMove(section.id, 'down');
                          setShowActions(null);
                        }}
                        className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-gray-50 flex items-center gap-2"
                      >
                        <ArrowDown className="w-3 h-3" />
                        Move Down
                      </button>
                    )}
                    
                    {onSectionDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSectionDelete(section.id);
                          setShowActions(null);
                        }}
                        className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-red-50 text-red-600 flex items-center gap-2"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-500 text-center">
        Use Ctrl+← → to navigate sections
      </div>
    </EnhancedCard>
  );
}

// Compact navigation for toolbar/header use
interface CompactSectionNavigationProps {
  sections: Section[];
  activeSection?: string;
  currentIndex: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  isTransitioning: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSectionChange: (sectionId: string) => void;
  className?: string;
}

function CompactSectionNavigation({
  sections,
  activeSection,
  currentIndex,
  canGoPrevious,
  canGoNext,
  isTransitioning,
  onPrevious,
  onNext,
  onSectionChange,
  className,
}: CompactSectionNavigationProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const currentSection = sections[currentIndex];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Previous Button */}
      <EnhancedButton
        variant="ghost"
        size="sm"
        onClick={onPrevious}
        disabled={!canGoPrevious || isTransitioning}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="w-4 h-4" />
      </EnhancedButton>

      {/* Current Section Dropdown */}
      <div className="relative">
        <EnhancedButton
          variant="ghost"
          size="sm"
          onClick={() => setShowDropdown(!showDropdown)}
          className="h-8 px-3 max-w-48"
        >
          <span className="truncate">
            {currentSection?.title || 'Select Section'}
          </span>
          <ChevronRight 
            className={cn(
              "w-3 h-3 ml-1 transition-transform duration-200",
              showDropdown && "rotate-90"
            )} 
          />
        </EnhancedButton>

        {showDropdown && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-64 overflow-y-auto">
            <div className="p-1">
              {sections.map((section, index) => (
                <button
                  key={section.id}
                  onClick={() => {
                    onSectionChange(section.id);
                    setShowDropdown(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors duration-150",
                    "hover:bg-gray-50 focus:bg-gray-50 focus:outline-none",
                    section.id === activeSection 
                      ? "bg-purple-50 text-purple-700 font-medium" 
                      : "text-gray-700"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 text-purple-600 text-xs font-medium flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="truncate">{section.title || 'Untitled Section'}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Next Button */}
      <EnhancedButton
        variant="ghost"
        size="sm"
        onClick={onNext}
        disabled={!canGoNext || isTransitioning}
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="w-4 h-4" />
      </EnhancedButton>

      {/* Section Counter */}
      <div className="text-xs text-gray-500 ml-2">
        {currentIndex + 1}/{sections.length}
      </div>
    </div>
  );
}

// Section progress indicator
interface SectionProgressProps {
  section: Section;
}

function SectionProgress({ section }: SectionProgressProps) {
  const progress = React.useMemo(() => {
    let completed = 0;
    let total = 0;

    // Check title
    total++;
    if (section.title?.trim()) completed++;

    // Check content blocks
    if (section.contentBlocks.length > 0) {
      total += section.contentBlocks.length;
      completed += section.contentBlocks.filter(block => 
        block.content?.trim() || block.data?.trim()
      ).length;
    } else {
      total++; // At least one content block expected
    }

    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [section]);

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
        <div 
          className={cn(
            "h-1.5 rounded-full transition-all duration-500 ease-out",
            progress === 100 ? "bg-green-400" : "bg-purple-400"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 font-medium">
        {progress}%
      </span>
    </div>
  );
}