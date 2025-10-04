import React, { useState } from 'react';
import { 
  Type, 
  Image as ImageIcon, 
  Table, 
  Calculator, 
  Plus,
  Sparkles,
  FileText,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import type { ContentBlock } from '@shared/schema';

interface ContentTypeSelectorProps {
  onSelect: (type: ContentBlock['type']) => void;
  className?: string;
}

interface ContentTypeOption {
  type: ContentBlock['type'];
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  shortcut?: string;
}

const contentTypes: ContentTypeOption[] = [
  {
    type: 'text',
    label: 'Text Block',
    description: 'Add paragraphs, lists, and formatted text content',
    icon: <Type className="w-6 h-6" />,
    color: 'from-blue-500 to-blue-600',
    shortcut: 'T',
  },
  {
    type: 'image',
    label: 'Image',
    description: 'Upload and insert images with captions',
    icon: <ImageIcon className="w-6 h-6" />,
    color: 'from-green-500 to-green-600',
    shortcut: 'I',
  },
  {
    type: 'table',
    label: 'Table',
    description: 'Create structured data tables and charts',
    icon: <Table className="w-6 h-6" />,
    color: 'from-purple-500 to-purple-600',
    shortcut: 'B',
  },
  {
    type: 'equation',
    label: 'Equation',
    description: 'Add mathematical equations using LaTeX',
    icon: <Calculator className="w-6 h-6" />,
    color: 'from-orange-500 to-orange-600',
    shortcut: 'E',
  },
];

export default function ContentTypeSelector({
  onSelect,
  className,
}: ContentTypeSelectorProps) {
  const [hoveredType, setHoveredType] = useState<ContentBlock['type'] | null>(null);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Add Content</h3>
        </div>
        <p className="text-sm text-gray-600">
          Choose the type of content you want to add to your section
        </p>
      </div>

      {/* Content Type Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {contentTypes.map((contentType) => (
          <EnhancedCard
            key={contentType.type}
            variant="interactive"
            padding="none"
            className={cn(
              'cursor-pointer transition-all duration-300 group',
              'hover:scale-105 hover:shadow-lg',
              hoveredType === contentType.type && 'ring-2 ring-purple-500/20'
            )}
            onMouseEnter={() => setHoveredType(contentType.type)}
            onMouseLeave={() => setHoveredType(null)}
            onClick={() => onSelect(contentType.type)}
          >
            <div className="p-4 space-y-3">
              {/* Icon and Shortcut */}
              <div className="flex items-center justify-between">
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center text-white',
                  'bg-gradient-to-br transition-all duration-300 group-hover:scale-110',
                  contentType.color
                )}>
                  {contentType.icon}
                </div>
                
                {contentType.shortcut && (
                  <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded font-mono">
                    {contentType.shortcut}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="space-y-1">
                <h4 className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
                  {contentType.label}
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {contentType.description}
                </p>
              </div>

              {/* Hover Effect */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex items-center gap-1 text-xs text-purple-600 font-medium">
                  <Plus className="w-3 h-3" />
                  Click to add
                </div>
              </div>
            </div>
          </EnhancedCard>
        ))}
      </div>

      {/* Quick Templates */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-gray-700">Quick Templates</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <EnhancedButton
            variant="outline"
            size="sm"
            onClick={() => onSelect('text')}
            className="text-xs"
          >
            <FileText className="w-3 h-3 mr-1" />
            Introduction
          </EnhancedButton>
          
          <EnhancedButton
            variant="outline"
            size="sm"
            onClick={() => onSelect('text')}
            className="text-xs"
          >
            <FileText className="w-3 h-3 mr-1" />
            Methodology
          </EnhancedButton>
          
          <EnhancedButton
            variant="outline"
            size="sm"
            onClick={() => onSelect('text')}
            className="text-xs"
          >
            <FileText className="w-3 h-3 mr-1" />
            Results
          </EnhancedButton>
          
          <EnhancedButton
            variant="outline"
            size="sm"
            onClick={() => onSelect('text')}
            className="text-xs"
          >
            <FileText className="w-3 h-3 mr-1" />
            Conclusion
          </EnhancedButton>
        </div>
      </div>

      {/* Keyboard Shortcuts Info */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          Tip: Use keyboard shortcuts (T, I, B, E) for quick content addition
        </p>
      </div>
    </div>
  );
}