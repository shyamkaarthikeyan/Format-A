import React from 'react';
import { 
  FileText, 
  Users, 
  BookOpen, 
  Link, 
  CheckCircle2, 
  Circle, 
  AlertCircle,
  TrendingUp,
  Target,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { CircularProgress, LinearProgress } from '@/components/ui/progress-indicator';
import type { Document } from '@shared/schema';

interface DocumentStructureVisualizerProps {
  document: Document;
  className?: string;
}

interface StructureItem {
  id: string;
  label: string;
  status: 'complete' | 'partial' | 'missing';
  importance: 'critical' | 'important' | 'optional';
  count?: number;
  suggestions?: string[];
}

export default function DocumentStructureVisualizer({
  document,
  className,
}: DocumentStructureVisualizerProps) {
  // Analyze document structure
  const analyzeStructure = (): StructureItem[] => {
    const items: StructureItem[] = [
      {
        id: 'title',
        label: 'Title',
        status: document.title.trim() ? 'complete' : 'missing',
        importance: 'critical',
        suggestions: !document.title.trim() ? ['Add a descriptive title for your document'] : undefined,
      },
      {
        id: 'authors',
        label: 'Authors',
        status: document.authors.length > 0 ? 'complete' : 'missing',
        importance: 'critical',
        count: document.authors.length,
        suggestions: document.authors.length === 0 ? ['Add at least one author'] : undefined,
      },
      {
        id: 'abstract',
        label: 'Abstract',
        status: document.abstract && document.abstract.trim() ? 'complete' : 'missing',
        importance: 'critical',
        suggestions: !document.abstract?.trim() ? ['Write an abstract summarizing your research'] : undefined,
      },
      {
        id: 'keywords',
        label: 'Keywords',
        status: document.keywords && document.keywords.trim() ? 'complete' : 'missing',
        importance: 'important',
        suggestions: !document.keywords?.trim() ? ['Add relevant keywords for discoverability'] : undefined,
      },
      {
        id: 'sections',
        label: 'Sections',
        status: document.sections.length > 0 ? 'complete' : 'missing',
        importance: 'critical',
        count: document.sections.length,
        suggestions: document.sections.length === 0 ? ['Add sections to structure your document'] : undefined,
      },
      {
        id: 'references',
        label: 'References',
        status: document.references.length > 0 ? 'complete' : 'missing',
        importance: 'important',
        count: document.references.length,
        suggestions: document.references.length === 0 ? ['Add references to support your work'] : undefined,
      },
    ];

    return items;
  };

  const structureItems = analyzeStructure();
  
  // Calculate completion metrics
  const criticalItems = structureItems.filter(item => item.importance === 'critical');
  const completedCritical = criticalItems.filter(item => item.status === 'complete').length;
  const criticalCompletion = (completedCritical / criticalItems.length) * 100;

  const allItems = structureItems;
  const completedAll = allItems.filter(item => item.status === 'complete').length;
  const overallCompletion = (completedAll / allItems.length) * 100;

  // Content analysis
  const totalContentBlocks = document.sections.reduce((sum, section) => sum + section.contentBlocks.length, 0);
  const totalSubsections = document.sections.reduce((sum, section) => sum + section.subsections.length, 0);
  const sectionsWithContent = document.sections.filter(section => 
    section.contentBlocks.length > 0 || section.subsections.length > 0
  ).length;

  const getStatusIcon = (status: StructureItem['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'partial':
        return <Circle className="w-4 h-4 text-yellow-500 fill-current" />;
      case 'missing':
        return <Circle className="w-4 h-4 text-red-500" />;
    }
  };

  const getImportanceColor = (importance: StructureItem['importance']) => {
    switch (importance) {
      case 'critical':
        return 'border-l-red-500';
      case 'important':
        return 'border-l-yellow-500';
      case 'optional':
        return 'border-l-gray-300';
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EnhancedCard variant="glass" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overall Progress</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(overallCompletion)}%</p>
            </div>
            <CircularProgress
              value={overallCompletion}
              size={60}
              strokeWidth={6}
              showValue={false}
              color="purple"
            />
          </div>
        </EnhancedCard>

        <EnhancedCard variant="glass" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Critical Items</p>
              <p className="text-2xl font-bold text-gray-900">{completedCritical}/{criticalItems.length}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Target className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </EnhancedCard>

        <EnhancedCard variant="glass" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Content Blocks</p>
              <p className="text-2xl font-bold text-gray-900">{totalContentBlocks}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </EnhancedCard>
      </div>

      {/* Structure Checklist */}
      <EnhancedCard variant="glass" className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Document Structure</h3>
        </div>

        <div className="space-y-3">
          {structureItems.map(item => (
            <div
              key={item.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border-l-4 bg-white/50',
                getImportanceColor(item.importance)
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getStatusIcon(item.status)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{item.label}</span>
                  {item.count !== undefined && (
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                      {item.count}
                    </span>
                  )}
                  <span className={cn(
                    'text-xs px-2 py-1 rounded',
                    item.importance === 'critical' && 'bg-red-100 text-red-700',
                    item.importance === 'important' && 'bg-yellow-100 text-yellow-700',
                    item.importance === 'optional' && 'bg-gray-100 text-gray-600'
                  )}>
                    {item.importance}
                  </span>
                </div>
                
                {item.suggestions && (
                  <div className="mt-1 space-y-1">
                    {item.suggestions.map((suggestion, index) => (
                      <p key={index} className="text-sm text-gray-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                        {suggestion}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </EnhancedCard>

      {/* Content Analysis */}
      <EnhancedCard variant="glass" className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Content Analysis</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section Completion */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Section Completion</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Sections with content</span>
                <span>{sectionsWithContent}/{document.sections.length}</span>
              </div>
              <LinearProgress
                value={document.sections.length > 0 ? (sectionsWithContent / document.sections.length) * 100 : 0}
                color="green"
                className="h-2"
              />
            </div>
          </div>

          {/* Content Distribution */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Content Distribution</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Content blocks</span>
                <span>{totalContentBlocks}</span>
              </div>
              <div className="flex justify-between">
                <span>Subsections</span>
                <span>{totalSubsections}</span>
              </div>
              <div className="flex justify-between">
                <span>References</span>
                <span>{document.references.length}</span>
              </div>
            </div>
          </div>
        </div>
      </EnhancedCard>

      {/* Recommendations */}
      {structureItems.some(item => item.suggestions) && (
        <EnhancedCard variant="glass" className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Next Steps</h3>
          </div>

          <div className="space-y-2">
            {structureItems
              .filter(item => item.suggestions)
              .slice(0, 3) // Show top 3 recommendations
              .map((item, index) => (
                <div key={item.id} className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <p className="text-sm text-gray-700">{item.suggestions?.[0]}</p>
                </div>
              ))}
          </div>
        </EnhancedCard>
      )}
    </div>
  );
}