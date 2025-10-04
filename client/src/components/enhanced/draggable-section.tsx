import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  GripVertical, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Edit3,
  Eye,
  EyeOff,
  Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { Input } from '@/components/ui/input';
import type { Section } from '@shared/schema';

interface DraggableSectionProps {
  section: Section;
  index: number;
  isExpanded: boolean;
  isActive: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<Section>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAddContentBlock: (type: 'text' | 'image' | 'table' | 'equation') => void;
  onAddSubsection: () => void;
  children?: React.ReactNode;
  className?: string;
}

const DraggableSection = React.memo<DraggableSectionProps>(({
  section,
  index,
  isExpanded,
  isActive,
  onToggleExpand,
  onUpdate,
  onDelete,
  onDuplicate,
  onAddContentBlock,
  onAddSubsection,
  children,
  className,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(section.title);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.id,
    data: {
      type: 'section',
      section,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleTitleSubmit = () => {
    onUpdate({ title: tempTitle });
    setIsEditing(false);
  };

  const handleTitleCancel = () => {
    setTempTitle(section.title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  };

  // Calculate section completeness
  const hasContent = section.contentBlocks.length > 0 || section.subsections.length > 0;
  const hasTitle = section.title.trim() !== '';
  const isComplete = hasTitle && hasContent;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative transition-all duration-200',
        isDragging && 'opacity-50 scale-105 rotate-1 z-50',
        isActive && 'ring-2 ring-purple-500/20',
        className
      )}
    >
      <EnhancedCard
        variant={isDragging ? 'elevated' : isActive ? 'gradient' : 'default'}
        padding="none"
        className={cn(
          'overflow-hidden transition-all duration-200',
          isDragging && 'shadow-2xl shadow-purple-500/25',
          isActive && 'border-purple-300'
        )}
      >
        {/* Section Header */}
        <div className={cn(
          'flex items-center gap-3 p-4 border-b border-gray-100',
          isActive && 'bg-purple-50/50'
        )}>
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors"
          >
            <GripVertical className="w-5 h-5" />
          </div>

          {/* Expand/Collapse Button */}
          <EnhancedButton
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </EnhancedButton>

          {/* Section Number */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
              {index + 1}
            </span>

            {/* Section Title */}
            {isEditing ? (
              <Input
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={handleKeyDown}
                className="flex-1 h-8 text-base font-medium"
                placeholder="Section title..."
                autoFocus
              />
            ) : (
              <h3
                className={cn(
                  'flex-1 text-base font-medium cursor-pointer truncate',
                  hasTitle ? 'text-gray-900' : 'text-gray-400 italic'
                )}
                onClick={() => setIsEditing(true)}
              >
                {section.title || 'Untitled Section'}
              </h3>
            )}
          </div>

          {/* Status Indicators */}
          <div className="flex items-center gap-2">
            {/* Completion Status */}
            <div className={cn(
              'w-2 h-2 rounded-full',
              isComplete ? 'bg-green-500' : hasTitle ? 'bg-yellow-500' : 'bg-gray-300'
            )} />

            {/* Content Count */}
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {section.contentBlocks.length + section.subsections.length}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <EnhancedButton
              variant="ghost"
              size="xs"
              onClick={() => setIsEditing(true)}
              className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600"
              title="Edit title"
            >
              <Edit3 className="w-3 h-3" />
            </EnhancedButton>

            <EnhancedButton
              variant="ghost"
              size="xs"
              onClick={onDuplicate}
              className="h-7 w-7 p-0 text-gray-500 hover:text-green-600"
              title="Duplicate section"
            >
              <Copy className="w-3 h-3" />
            </EnhancedButton>

            <EnhancedButton
              variant="ghost"
              size="xs"
              onClick={onDelete}
              className="h-7 w-7 p-0 text-gray-500 hover:text-red-600"
              title="Delete section"
            >
              <Trash2 className="w-3 h-3" />
            </EnhancedButton>
          </div>
        </div>

        {/* Section Content */}
        {isExpanded && (
          <div className="p-4 space-y-4">
            {/* Quick Add Buttons */}
            <div className="flex flex-wrap gap-2">
              <EnhancedButton
                variant="outline"
                size="sm"
                onClick={() => onAddContentBlock('text')}
                className="h-8 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Text
              </EnhancedButton>
              
              <EnhancedButton
                variant="outline"
                size="sm"
                onClick={() => onAddContentBlock('image')}
                className="h-8 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Image
              </EnhancedButton>
              
              <EnhancedButton
                variant="outline"
                size="sm"
                onClick={() => onAddContentBlock('table')}
                className="h-8 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Table
              </EnhancedButton>
              
              <EnhancedButton
                variant="outline"
                size="sm"
                onClick={() => onAddContentBlock('equation')}
                className="h-8 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Equation
              </EnhancedButton>
              
              <EnhancedButton
                variant="outline"
                size="sm"
                onClick={onAddSubsection}
                className="h-8 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Subsection
              </EnhancedButton>
            </div>

            {/* Section Content */}
            {children}

            {/* Empty State */}
            {!hasContent && (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                <Plus className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Add content to this section</p>
                <p className="text-xs text-gray-400">Use the buttons above to get started</p>
              </div>
            )}
          </div>
        )}

        {/* Drag Overlay Indicator */}
        {isDragging && (
          <div className="absolute inset-0 bg-purple-500/10 border-2 border-purple-500 border-dashed rounded-lg pointer-events-none" />
        )}
      </EnhancedCard>
    </div>
  );
});

DraggableSection.displayName = 'DraggableSection';

export default DraggableSection;