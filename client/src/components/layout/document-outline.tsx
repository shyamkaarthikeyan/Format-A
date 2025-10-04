import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  Users, 
  BookOpen, 
  Link, 
  Search,
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  Target,
  TrendingUp,
  Filter,
  X,
  Eye,
  Edit3,
  Plus,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { animations, focusRing } from '@/lib/ui-utils';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { Input } from '@/components/ui/input';
import type { Document, Section, Subsection } from '@shared/schema';

interface DocumentOutlineProps {
  document: Document | null;
  activeSection?: string;
  activeSubsection?: string;
  onSectionClick: (sectionId: string) => void;
  onSubsectionClick: (sectionId: string, subsectionId: string) => void;
  onSectionAdd?: () => void;
  onSectionEdit?: (sectionId: string) => void;
  onSectionDelete?: (sectionId: string) => void;
  className?: string;
}

interface OutlineItemProps {
  id: string;
  title: string;
  level: number;
  isActive: boolean;
  isComplete: boolean;
  hasIssues: boolean;
  progress: number;
  wordCount?: number;
  estimatedTime?: string;
  children?: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  type: 'section' | 'subsection';
  sectionId?: string;
  path: string[];
  matchScore: number;
}

type FilterType = 'all' | 'incomplete' | 'complete' | 'issues';

// Enhanced outline item with better visual hierarchy and progress indicators
const OutlineItem: React.FC<OutlineItemProps> = ({
  id,
  title,
  level,
  isActive,
  isComplete,
  hasIssues,
  progress,
  wordCount,
  estimatedTime,
  children,
  onEdit,
  onDelete,
  onClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showActions, setShowActions] = useState(false);
  const hasChildren = React.Children.count(children) > 0;

  const getStatusIcon = () => {
    const baseClasses = "w-3 h-3 transition-all duration-200";
    
    if (hasIssues) {
      return <AlertCircle className={cn(baseClasses, "text-amber-500 animate-pulse")} />;
    }
    if (isComplete) {
      return <CheckCircle2 className={cn(baseClasses, "text-green-500")} />;
    }
    if (progress > 0) {
      return <Clock className={cn(baseClasses, "text-blue-500")} />;
    }
    return <Circle className={cn(baseClasses, "text-gray-400")} />;
  };

  const getProgressColor = () => {
    if (hasIssues) return 'bg-amber-400';
    if (isComplete) return 'bg-green-400';
    if (progress > 50) return 'bg-blue-400';
    return 'bg-purple-400';
  };

  const indentClass = level === 0 ? '' : level === 1 ? 'ml-4' : level === 2 ? 'ml-8' : 'ml-12';

  return (
    <div className={cn('select-none', indentClass)}>
      <div
        className={cn(
          'group relative flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer',
          animations.smooth,
          focusRing.default,
          isActive 
            ? 'bg-purple-100 text-purple-700 shadow-sm ring-2 ring-purple-500/20' 
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:shadow-sm'
        )}
        onClick={onClick}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Expand/Collapse Button */}
        {hasChildren && (
          <EnhancedButton
            variant="ghost"
            size="xs"
            className="h-4 w-4 p-0 hover:bg-gray-200"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </EnhancedButton>
        )}
        
        {/* Status Icon */}
        <div className="flex-shrink-0">
          {getStatusIcon()}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-center gap-2">
            <span className={cn(
              'truncate',
              level === 0 && 'text-sm font-medium',
              level === 1 && 'text-sm font-normal',
              level >= 2 && 'text-xs font-normal'
            )}>
              {title || 'Untitled'}
            </span>
            
            {/* Section Number */}
            {level === 0 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
                {id.split('-')[1] || '1'}
              </span>
            )}
          </div>
          
          {/* Progress Bar */}
          {progress > 0 && (
            <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
              <div 
                className={cn("h-1 rounded-full transition-all duration-500", getProgressColor())}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          
          {/* Metadata */}
          {(wordCount || estimatedTime) && (
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              {wordCount && (
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {wordCount} words
                </span>
              )}
              {estimatedTime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {estimatedTime}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Actions */}
        {showActions && (onEdit || onDelete) && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {onEdit && (
              <EnhancedButton
                variant="ghost"
                size="xs"
                className="h-6 w-6 p-0 hover:bg-blue-100 hover:text-blue-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                title="Edit section"
              >
                <Edit3 className="w-3 h-3" />
              </EnhancedButton>
            )}
            
            {onDelete && (
              <EnhancedButton
                variant="ghost"
                size="xs"
                className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                title="Delete section"
              >
                <X className="w-3 h-3" />
              </EnhancedButton>
            )}
          </div>
        )}
        
        {/* Active Indicator */}
        {isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-violet-600 rounded-r" />
        )}
      </div>
      
      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
};

export default function DocumentOutline({
  document,
  activeSection,
  activeSubsection,
  onSectionClick,
  onSubsectionClick,
  onSectionAdd,
  onSectionEdit,
  onSectionDelete,
  className,
}: DocumentOutlineProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Enhanced search functionality with fuzzy matching
  const performSearch = useCallback((query: string) => {
    if (!document || !query.trim()) {
      setSearchResults([]);
      return;
    }

    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    // Search sections
    document.sections.forEach((section, sectionIndex) => {
      const titleMatch = section.title.toLowerCase().includes(queryLower);
      const contentMatch = section.contentBlocks.some(block => 
        block.content?.toLowerCase().includes(queryLower)
      );

      if (titleMatch || contentMatch) {
        results.push({
          id: section.id,
          title: section.title || `Section ${sectionIndex + 1}`,
          type: 'section',
          path: [section.title || `Section ${sectionIndex + 1}`],
          matchScore: titleMatch ? 100 : 50,
        });
      }

      // Search subsections
      section.subsections.forEach((subsection) => {
        const subTitleMatch = subsection.title.toLowerCase().includes(queryLower);
        const subContentMatch = subsection.content?.toLowerCase().includes(queryLower);

        if (subTitleMatch || subContentMatch) {
          results.push({
            id: subsection.id,
            title: subsection.title,
            type: 'subsection',
            sectionId: section.id,
            path: [section.title || `Section ${sectionIndex + 1}`, subsection.title],
            matchScore: subTitleMatch ? 90 : 40,
          });
        }
      });
    });

    // Sort by match score
    results.sort((a, b) => b.matchScore - a.matchScore);
    setSearchResults(results);
  }, [document]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  // Helper functions with enhanced logic
  const calculateSectionProgress = useCallback((section: Section): number => {
    let completed = 0;
    let total = 0;

    // Title
    total++;
    if (section.title.trim()) completed++;

    // Content blocks
    if (section.contentBlocks.length > 0) {
      total += section.contentBlocks.length;
      completed += section.contentBlocks.filter(block => 
        block.content?.trim() || block.data?.trim()
      ).length;
    } else {
      total++; // Expect at least one content block
    }

    // Subsections
    section.subsections.forEach(sub => {
      total += 2; // Title and content
      if (sub.title.trim()) completed++;
      if (sub.content?.trim()) completed++;
    });

    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, []);

  const calculateWordCount = useCallback((section: Section): number => {
    let wordCount = 0;
    
    section.contentBlocks.forEach(block => {
      if (block.content) {
        wordCount += block.content.split(/\s+/).filter(word => word.length > 0).length;
      }
    });

    section.subsections.forEach(sub => {
      if (sub.content) {
        wordCount += sub.content.split(/\s+/).filter(word => word.length > 0).length;
      }
    });

    return wordCount;
  }, []);

  const estimateReadingTime = useCallback((wordCount: number): string => {
    const wordsPerMinute = 200;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return minutes === 1 ? '1 min read' : `${minutes} min read`;
  }, []);

  const isSectionComplete = useCallback((section: Section): boolean => {
    const progress = calculateSectionProgress(section);
    return progress >= 80; // Consider 80%+ as complete
  }, [calculateSectionProgress]);

  const sectionHasIssues = useCallback((section: Section): boolean => {
    return !section.title.trim() || 
           (section.contentBlocks.length === 0 && section.subsections.length === 0);
  }, []);

  const isSubsectionComplete = useCallback((subsection: Subsection): boolean => {
    return subsection.title.trim() !== '' && (subsection.content?.trim() || '') !== '';
  }, []);

  // Filter sections based on current filter
  const getFilteredSections = useCallback(() => {
    if (!document) return [];

    let sections = document.sections;

    // Apply search filter
    if (searchQuery.trim()) {
      const matchingIds = new Set(searchResults.map(r => r.type === 'section' ? r.id : r.sectionId));
      sections = sections.filter(section => matchingIds.has(section.id));
    }

    // Apply status filter
    switch (filter) {
      case 'complete':
        return sections.filter(isSectionComplete);
      case 'incomplete':
        return sections.filter(section => !isSectionComplete(section));
      case 'issues':
        return sections.filter(sectionHasIssues);
      default:
        return sections;
    }
  }, [document, searchQuery, searchResults, filter, isSectionComplete, sectionHasIssues]);

  const filteredSections = getFilteredSections();

  // Document progress calculation
  const documentProgress = useMemo(() => {
    if (!document) return { hasTitle: false, hasAuthors: false, hasAbstract: false, hasSections: false, hasReferences: false };

    return {
      hasTitle: document.title.trim() !== '',
      hasAuthors: document.authors.length > 0,
      hasAbstract: document.abstract && document.abstract.trim() !== '',
      hasSections: document.sections.length > 0,
      hasReferences: document.references.length > 0,
    };
  }, [document]);

  const completionPercentage = useMemo(() => {
    const values = Object.values(documentProgress);
    return Math.round((values.filter(Boolean).length / values.length) * 100);
  }, [documentProgress]);

  const handleSearchResultClick = useCallback((result: SearchResult) => {
    if (result.type === 'section') {
      onSectionClick(result.id);
    } else if (result.sectionId) {
      onSubsectionClick(result.sectionId, result.id);
    }
    setSearchQuery(''); // Clear search after selection
  }, [onSectionClick, onSubsectionClick]);

  if (!document) {
    return (
      <div className={cn('p-4 text-center text-gray-500', className)}>
        <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm">No document selected</p>
        <p className="text-xs mt-1">Open a document to see its outline</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full bg-gray-50/50', className)}>
      {/* Enhanced Header */}
      <div className="p-4 border-b border-gray-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Document Outline</h3>
          {onSectionAdd && (
            <EnhancedButton
              variant="ghost"
              size="xs"
              onClick={onSectionAdd}
              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add
            </EnhancedButton>
          )}
        </div>
        
        {/* Enhanced Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search sections and content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-8 text-sm"
          />
          {searchQuery && (
            <EnhancedButton
              variant="ghost"
              size="xs"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 p-0"
            >
              <X className="w-3 h-3" />
            </EnhancedButton>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1">
          {(['all', 'incomplete', 'complete', 'issues'] as FilterType[]).map((filterType) => (
            <EnhancedButton
              key={filterType}
              variant={filter === filterType ? 'default' : 'ghost'}
              size="xs"
              onClick={() => setFilter(filterType)}
              className="text-xs capitalize"
            >
              {filterType === 'all' ? 'All' : 
               filterType === 'incomplete' ? 'Todo' :
               filterType === 'complete' ? 'Done' : 'Issues'}
            </EnhancedButton>
          ))}
        </div>
        
        {/* Enhanced Progress Indicator */}
        <EnhancedCard variant="glass" className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700">Document Progress</span>
            <span className="text-xs font-bold text-purple-600">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-violet-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className={cn("w-2 h-2 rounded-full", documentProgress.hasSections ? "bg-green-400" : "bg-gray-300")} />
              <span className="text-gray-600">{document.sections.length} sections</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={cn("w-2 h-2 rounded-full", documentProgress.hasAuthors ? "bg-green-400" : "bg-gray-300")} />
              <span className="text-gray-600">{document.authors.length} authors</span>
            </div>
          </div>
        </EnhancedCard>
      </div>

      {/* Search Results */}
      {searchQuery && searchResults.length > 0 && (
        <div className="border-b border-gray-200 bg-blue-50/50">
          <div className="p-2">
            <div className="text-xs font-medium text-blue-700 mb-2">
              Search Results ({searchResults.length})
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {searchResults.slice(0, 5).map((result) => (
                <div
                  key={`${result.type}-${result.id}`}
                  className="flex items-center gap-2 p-2 rounded-md bg-white hover:bg-blue-50 cursor-pointer transition-colors duration-150"
                  onClick={() => handleSearchResultClick(result)}
                >
                  <div className="flex-shrink-0">
                    {result.type === 'section' ? (
                      <BookOpen className="w-3 h-3 text-blue-500" />
                    ) : (
                      <FileText className="w-3 h-3 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-900 truncate">
                      {result.title}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {result.path.join(' › ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Document Structure Overview */}
      <div className="p-4 border-b border-gray-200">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <FileText className="w-3 h-3" />
            <span className={documentProgress.hasTitle ? 'text-green-600' : 'text-gray-500'}>
              Title {documentProgress.hasTitle ? '✓' : '○'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="w-3 h-3" />
            <span className={documentProgress.hasAuthors ? 'text-green-600' : 'text-gray-500'}>
              Authors {documentProgress.hasAuthors ? '✓' : '○'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <BookOpen className="w-3 h-3" />
            <span className={documentProgress.hasAbstract ? 'text-green-600' : 'text-gray-500'}>
              Abstract {documentProgress.hasAbstract ? '✓' : '○'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Link className="w-3 h-3" />
            <span className={documentProgress.hasReferences ? 'text-green-600' : 'text-gray-500'}>
              References {documentProgress.hasReferences ? '✓' : '○'}
            </span>
          </div>
        </div>
      </div>

      {/* Enhanced Sections List */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredSections.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BookOpen className="w-6 h-6 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">
              {searchQuery ? 'No sections match your search' : 
               filter !== 'all' ? `No ${filter} sections found` :
               'No sections added yet'}
            </p>
            {!searchQuery && filter === 'all' && onSectionAdd && (
              <EnhancedButton
                variant="outline"
                size="sm"
                onClick={onSectionAdd}
                className="mt-3"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add First Section
              </EnhancedButton>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredSections.map((section, index) => {
              const progress = calculateSectionProgress(section);
              const wordCount = calculateWordCount(section);
              const estimatedTime = wordCount > 0 ? estimateReadingTime(wordCount) : undefined;

              return (
                <OutlineItem
                  key={section.id}
                  id={section.id}
                  title={section.title || `Section ${index + 1}`}
                  level={0}
                  isActive={activeSection === section.id}
                  isComplete={isSectionComplete(section)}
                  hasIssues={sectionHasIssues(section)}
                  progress={progress}
                  wordCount={wordCount > 0 ? wordCount : undefined}
                  estimatedTime={estimatedTime}
                  onEdit={onSectionEdit ? () => onSectionEdit(section.id) : undefined}
                  onDelete={onSectionDelete ? () => onSectionDelete(section.id) : undefined}
                  onClick={() => onSectionClick(section.id)}
                >
                  {/* Enhanced Subsections */}
                  {section.subsections
                    .filter(sub => !sub.level || sub.level === 1)
                    .map((subsection) => {
                      const subWordCount = subsection.content ? 
                        subsection.content.split(/\s+/).filter(word => word.length > 0).length : 0;
                      const subProgress = isSubsectionComplete(subsection) ? 100 : 
                        subsection.title.trim() ? 50 : 0;

                      return (
                        <OutlineItem
                          key={subsection.id}
                          id={subsection.id}
                          title={subsection.title}
                          level={1}
                          isActive={activeSubsection === subsection.id}
                          isComplete={isSubsectionComplete(subsection)}
                          hasIssues={!isSubsectionComplete(subsection)}
                          progress={subProgress}
                          wordCount={subWordCount > 0 ? subWordCount : undefined}
                          onClick={() => onSubsectionClick(section.id, subsection.id)}
                        >
                          {/* Nested subsections */}
                          {section.subsections
                            .filter(sub => sub.parentId === subsection.id)
                            .map((nestedSub) => {
                              const nestedWordCount = nestedSub.content ? 
                                nestedSub.content.split(/\s+/).filter(word => word.length > 0).length : 0;
                              const nestedProgress = isSubsectionComplete(nestedSub) ? 100 : 
                                nestedSub.title.trim() ? 50 : 0;

                              return (
                                <OutlineItem
                                  key={nestedSub.id}
                                  id={nestedSub.id}
                                  title={nestedSub.title}
                                  level={2}
                                  isActive={activeSubsection === nestedSub.id}
                                  isComplete={isSubsectionComplete(nestedSub)}
                                  hasIssues={!isSubsectionComplete(nestedSub)}
                                  progress={nestedProgress}
                                  wordCount={nestedWordCount > 0 ? nestedWordCount : undefined}
                                  onClick={() => onSubsectionClick(section.id, nestedSub.id)}
                                />
                              );
                            })}
                        </OutlineItem>
                      );
                    })}
                </OutlineItem>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Stats Footer */}
      {document.sections.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50/50">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>{document.sections.length} sections</span>
            <span>
              {document.sections.reduce((acc, section) => acc + calculateWordCount(section), 0)} words total
            </span>
          </div>
        </div>
      )}
    </div>
  );
}