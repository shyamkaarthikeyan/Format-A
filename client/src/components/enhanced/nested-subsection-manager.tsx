import React, { useState } from 'react';
import { Plus, ChevronDown, ChevronRight, Edit3, Trash2, Type, Image as ImageIcon, Table, Calculator, GripVertical } from 'lucide-react';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import ContentBlock from '@/components/content-block';
import type { Subsection, ContentBlock as ContentBlockType } from '@shared/schema';

interface NestedSubsectionManagerProps {
  subsections: Subsection[];
  sectionId: string;
  sectionIndex: number;
  onUpdate: (subsections: Subsection[]) => void;
  className?: string;
}

interface SubsectionItemProps {
  subsection: Subsection;
  sectionIndex: number;
  level: number;
  numbering: string;
  children?: React.ReactNode;
  onUpdate: (updates: Partial<Subsection>) => void;
  onDelete: () => void;
  onAddChild: () => void;
  className?: string;
}

const SubsectionItem: React.FC<SubsectionItemProps> = ({
  subsection,
  sectionIndex,
  level,
  numbering,
  children,
  onUpdate,
  onDelete,
  onAddChild,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(!subsection.title.trim());
  const [showContentBlocks, setShowContentBlocks] = useState(false);

  // Initialize content blocks if they don't exist
  const contentBlocks = subsection.contentBlocks || [];

  const handleSave = () => {
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (!subsection.title.trim()) {
      onDelete();
    } else {
      setIsEditing(false);
    }
  };

  // Add content block
  const addContentBlock = (type: ContentBlockType['type']) => {
    const newBlock: ContentBlockType = {
      id: `block_${Date.now()}_${Math.random()}`,
      type,
      content: '',
      order: contentBlocks.length,
    };

    onUpdate({
      contentBlocks: [...contentBlocks, newBlock]
    });
    setShowContentBlocks(true);
  };

  // Update content block
  const updateContentBlock = (blockId: string, updates: Partial<ContentBlockType>) => {
    onUpdate({
      contentBlocks: contentBlocks.map(block =>
        block.id === blockId ? { ...block, ...updates } : block
      )
    });
  };

  // Remove content block
  const removeContentBlock = (blockId: string) => {
    onUpdate({
      contentBlocks: contentBlocks.filter(block => block.id !== blockId)
    });
  };

  const maxLevel = 5; // Maximum nesting depth
  const canAddChild = level < maxLevel;
  
  const indentClass = level === 1 ? '' : 
                     level === 2 ? 'ml-6' : 
                     level === 3 ? 'ml-12' : 
                     level === 4 ? 'ml-18' : 'ml-24';

  const hasContent = subsection.content || contentBlocks.length > 0;

  return (
    <div className={cn('relative', indentClass, className)}>
      {/* Connection lines for visual hierarchy */}
      {level > 1 && (
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-300" />
      )}
      
      <EnhancedCard 
        variant="glass" 
        className={cn(
          'border transition-all duration-200',
          level === 1 ? 'border-gray-200' : 
          level === 2 ? 'border-blue-200' : 
          level === 3 ? 'border-green-200' : 
          level === 4 ? 'border-yellow-200' : 'border-purple-200'
        )}
      >
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={cn(
                'flex-shrink-0 px-3 py-1 text-sm font-medium rounded-full',
                level === 1 ? 'bg-gray-100 text-gray-700' :
                level === 2 ? 'bg-blue-100 text-blue-700' :
                level === 3 ? 'bg-green-100 text-green-700' :
                level === 4 ? 'bg-yellow-100 text-yellow-700' : 'bg-purple-100 text-purple-700'
              )}>
                {numbering}
              </span>
              
              {!isEditing && subsection.title && (
                <h4 className="font-semibold text-gray-900 text-lg">
                  {subsection.title}
                </h4>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isEditing && (
                <>
                  <EnhancedButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="h-8 w-8 p-0"
                    title="Edit subsection"
                  >
                    <Edit3 className="w-4 h-4" />
                  </EnhancedButton>
                  
                  {canAddChild && (
                    <EnhancedButton
                      variant="ghost"
                      size="sm"
                      onClick={onAddChild}
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                      title="Add nested subsection"
                    >
                      <Plus className="w-4 h-4" />
                    </EnhancedButton>
                  )}
                </>
              )}
              
              <EnhancedButton
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                title="Delete subsection"
              >
                <Trash2 className="w-4 h-4" />
              </EnhancedButton>
            </div>
          </div>

          {/* Edit Form */}
          {isEditing && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subsection Title
                </label>
                <Input
                  value={subsection.title}
                  onChange={(e) => onUpdate({ title: e.target.value })}
                  placeholder="Enter subsection title..."
                  className="text-base"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') handleCancel();
                  }}
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Basic Content (Optional)
                </label>
                <Textarea
                  value={subsection.content}
                  onChange={(e) => onUpdate({ content: e.target.value })}
                  placeholder="Enter basic text content or use content blocks below for rich content..."
                  className="text-base min-h-[120px] resize-y"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave();
                    if (e.key === 'Escape') handleCancel();
                  }}
                />
              </div>
              
              <div className="flex gap-3">
                <EnhancedButton
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  className="px-4 py-2"
                >
                  Save Changes
                </EnhancedButton>
                <EnhancedButton
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="px-4 py-2"
                >
                  Cancel
                </EnhancedButton>
              </div>
            </div>
          )}

          {/* Content Display */}
          {!isEditing && (
            <div className="space-y-4">
              {/* Basic Text Content */}
              {subsection.content && (
                <div className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {subsection.content}
                </div>
              )}

              {/* Content Blocks */}
              {contentBlocks.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-medium text-gray-600">Rich Content</h5>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {contentBlocks.length} block{contentBlocks.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {contentBlocks.map((block) => (
                    <ContentBlock
                      key={block.id}
                      block={block}
                      onUpdate={(updates) => updateContentBlock(block.id, updates)}
                      onRemove={() => removeContentBlock(block.id)}
                    />
                  ))}
                </div>
              )}

              {/* Add Content Blocks */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-sm font-medium text-gray-600">Add Rich Content</h5>
                  {!showContentBlocks && contentBlocks.length === 0 && (
                    <EnhancedButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowContentBlocks(true)}
                      className="text-xs"
                    >
                      Show Options
                    </EnhancedButton>
                  )}
                </div>
                
                {(showContentBlocks || contentBlocks.length > 0) && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <EnhancedButton
                      variant="outline"
                      size="sm"
                      onClick={() => addContentBlock('text')}
                      className="flex items-center gap-2 p-3 h-auto"
                    >
                      <Type className="w-4 h-4 text-blue-600" />
                      <span className="text-xs">Text Block</span>
                    </EnhancedButton>
                    
                    <EnhancedButton
                      variant="outline"
                      size="sm"
                      onClick={() => addContentBlock('image')}
                      className="flex items-center gap-2 p-3 h-auto"
                    >
                      <ImageIcon className="w-4 h-4 text-green-600" />
                      <span className="text-xs">Image</span>
                    </EnhancedButton>
                    
                    <EnhancedButton
                      variant="outline"
                      size="sm"
                      onClick={() => addContentBlock('table')}
                      className="flex items-center gap-2 p-3 h-auto"
                    >
                      <Table className="w-4 h-4 text-purple-600" />
                      <span className="text-xs">Table</span>
                    </EnhancedButton>
                    
                    <EnhancedButton
                      variant="outline"
                      size="sm"
                      onClick={() => addContentBlock('equation')}
                      className="flex items-center gap-2 p-3 h-auto"
                    >
                      <Calculator className="w-4 h-4 text-orange-600" />
                      <span className="text-xs">Equation</span>
                    </EnhancedButton>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </EnhancedCard>

      {/* Child Subsections */}
      {children}
    </div>
  );
};

export default function NestedSubsectionManager({
  subsections,
  sectionId,
  sectionIndex,
  onUpdate,
  className
}: NestedSubsectionManagerProps) {
  // Helper function to calculate subsection numbering
  const getSubsectionNumbering = (subsection: Subsection): string => {
    if (!subsection.level || subsection.level === 1) {
      // Main subsection (e.g., 2.1)
      const mainSubs = subsections.filter(s => (!s.level || s.level === 1) && !s.parentId);
      const index = mainSubs.findIndex(s => s.id === subsection.id);
      return `${sectionIndex + 1}.${index + 1}`;
    } else {
      // Nested subsection - find parent and build number
      const parent = subsections.find(s => s.id === subsection.parentId);
      if (parent) {
        const parentNumber = getSubsectionNumbering(parent);
        const siblings = subsections.filter(s => s.parentId === subsection.parentId && s.level === subsection.level);
        const index = siblings.findIndex(s => s.id === subsection.id);
        return `${parentNumber}.${index + 1}`;
      }
    }
    return `${sectionIndex + 1}.?`;
  };

  // Add new subsection
  const addSubsection = (parentId?: string, level: number = 1) => {
    const newSubsection: Subsection = {
      id: `subsection_${Date.now()}_${Math.random()}`,
      title: '',
      content: '',
      order: subsections.length,
      level,
      parentId,
    };

    onUpdate([...subsections, newSubsection]);
  };

  // Update subsection
  const updateSubsection = (subsectionId: string, updates: Partial<Subsection>) => {
    onUpdate(
      subsections.map(sub =>
        sub.id === subsectionId ? { ...sub, ...updates } : sub
      )
    );
  };

  // Delete subsection and all children
  const deleteSubsection = (subsectionId: string) => {
    const toDelete = new Set([subsectionId]);
    
    // Find all children recursively
    const findChildren = (parentId: string) => {
      subsections.forEach(sub => {
        if (sub.parentId === parentId) {
          toDelete.add(sub.id);
          findChildren(sub.id);
        }
      });
    };
    
    findChildren(subsectionId);
    onUpdate(subsections.filter(sub => !toDelete.has(sub.id)));
  };

  // Render subsections recursively
  const renderSubsections = (parentId?: string, level: number = 1): React.ReactNode => {
    const currentLevelSubs = subsections.filter(
      sub => sub.parentId === parentId && (sub.level || 1) === level
    );

    return currentLevelSubs.map(subsection => {
      const numbering = getSubsectionNumbering(subsection);
      const childSubs = subsections.filter(sub => sub.parentId === subsection.id);
      
      return (
        <SubsectionItem
          key={subsection.id}
          subsection={subsection}
          sectionIndex={sectionIndex}
          level={level}
          numbering={numbering}
          onUpdate={(updates) => updateSubsection(subsection.id, updates)}
          onDelete={() => deleteSubsection(subsection.id)}
          onAddChild={() => addSubsection(subsection.id, level + 1)}
        >
          {childSubs.length > 0 && renderSubsections(subsection.id, level + 1)}
        </SubsectionItem>
      );
    });
  };

  const hasSubsections = subsections.length > 0;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          Subsections
          {hasSubsections && (
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
              {subsections.length}
            </span>
          )}
        </h4>
        
        <EnhancedButton
          variant="outline"
          size="sm"
          onClick={() => addSubsection()}
          className="h-7 text-xs"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Subsection
        </EnhancedButton>
      </div>

      {/* Subsections */}
      {hasSubsections ? (
        <div className="space-y-3">
          {renderSubsections()}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500">
          <p className="text-sm">No subsections yet</p>
          <p className="text-xs mt-1">Click "Add Subsection" to create your first subsection</p>
        </div>
      )}

      {/* Help Text */}
      {hasSubsections && (
        <div className="text-xs text-gray-500 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <p className="font-medium mb-2 text-gray-700">✨ Enhanced Subsection Features:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ul className="space-y-1">
              <li>• <strong>Rich Content:</strong> Add Text, Images, Tables & Equations</li>
              <li>• <strong>Nested Structure:</strong> Up to 5 levels (1.1.1.1.1)</li>
              <li>• <strong>Mixed Content:</strong> Combine basic text with rich blocks</li>
            </ul>
            <ul className="space-y-1">
              <li>• <strong>Easy Editing:</strong> Click edit icon to modify</li>
              <li>• <strong>Quick Actions:</strong> Enter to save, Escape to cancel</li>
              <li>• <strong>Smart Deletion:</strong> Removes all nested children</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
