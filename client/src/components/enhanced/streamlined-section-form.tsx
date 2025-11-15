import React, { useState } from 'react';
import { 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Type, 
  Image as ImageIcon, 
  Table, 
  Calculator, 
  Edit3, 
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  MoreHorizontal
} from 'lucide-react';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import ContentBlock from '@/components/content-block';
import NestedSubsectionManager from './nested-subsection-manager';
import type { Section, ContentBlock as ContentBlockType } from '@shared/schema';

interface StreamlinedSectionFormProps {
  sections: Section[];
  onUpdate: (sections: Section[]) => void;
  className?: string;
}

interface SectionItemProps {
  section: Section;
  index: number;
  onUpdate: (updates: Partial<Section>) => void;
  onDelete: () => void;
  className?: string;
}

const SectionItem: React.FC<SectionItemProps> = ({
  section,
  index,
  onUpdate,
  onDelete,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed for better overview
  const [isEditing, setIsEditing] = useState(!section.title.trim());
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'subsections'>('content');

  const contentBlocks = section.contentBlocks || [];
  const subsections = section.subsections || [];
  const hasContent = contentBlocks.length > 0 || subsections.length > 0;

  // Add content block
  const addContentBlock = (type: ContentBlockType['type']) => {
    // Calculate equation number if this is an equation block
    let equationNumber: number | undefined;
    if (type === 'equation') {
      // Count existing equations across all sections to get the next number
      const existingEquations = contentBlocks.filter(b => b.type === 'equation').length;
      equationNumber = existingEquations + 1;
    }

    const newBlock: ContentBlockType = {
      id: `block_${Date.now()}_${Math.random()}`,
      type,
      content: '',
      order: contentBlocks.length,
      ...(equationNumber !== undefined && { equationNumber })
    };

    onUpdate({
      contentBlocks: [...contentBlocks, newBlock]
    });
    setShowAddOptions(false);
    setActiveTab('content');
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
    const updatedBlocks = contentBlocks.filter(block => block.id !== blockId);
    
    // Renumber equations after removal
    let equationCounter = 1;
    const renumberedBlocks = updatedBlocks.map(block => {
      if (block.type === 'equation') {
        return { ...block, equationNumber: equationCounter++ };
      }
      return block;
    });
    
    onUpdate({
      contentBlocks: renumberedBlocks
    });
  };

  // Update subsections
  const updateSubsections = (newSubsections: typeof subsections) => {
    onUpdate({ subsections: newSubsections });
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (!section.title.trim()) {
      onDelete();
    } else {
      setIsEditing(false);
    }
  };

  return (
    <div className={cn('relative group', className)}>
      <EnhancedCard 
        variant="default" 
        className="overflow-hidden transition-all duration-200 hover:shadow-lg"
      >
        {/* Section Header */}
        <div className="bg-gradient-to-r from-purple-50 to-white border-b-2 border-purple-200 p-6 border-l-4 border-l-purple-600">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-purple-50/50 -m-2 p-2 rounded transition-colors"
              onClick={() => !isEditing && setIsExpanded(!isExpanded)}
            >
              <div className="h-8 w-8 flex items-center justify-center">
                {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </div>
              
              <div className="flex items-center gap-3">
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                  {index + 1}
                </span>
                
                {!isEditing && section.title && (
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {section.title}
                  </h3>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Content indicators */}
              {!isEditing && hasContent && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  {contentBlocks.length > 0 && (
                    <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded">
                      {contentBlocks.length} block{contentBlocks.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {subsections.length > 0 && (
                    <span className="bg-green-100 text-green-600 px-2 py-1 rounded">
                      {subsections.length} sub{subsections.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}

              {!isEditing && (
                <EnhancedButton
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit3 className="w-4 h-4" />
                </EnhancedButton>
              )}
              
              <EnhancedButton
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </EnhancedButton>
            </div>
          </div>

          {/* Edit Form */}
          {isEditing && (
            <div className="mt-6 space-y-4">
              <Input
                value={section.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder="Enter section title..."
                className="text-xl font-semibold h-14 px-5"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') handleCancel();
                }}
                autoFocus
              />
              
              <div className="flex gap-3">
                <EnhancedButton
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  className="px-4 py-2"
                >
                  Save Section
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
        </div>

        {/* Section Content - Only when expanded */}
        {isExpanded && !isEditing && (
          <div className="p-8 space-y-8 bg-gradient-to-br from-white to-purple-50/20">
            {/* Content Blocks */}
            {contentBlocks.length > 0 && (
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-purple-900 flex items-center gap-3 pb-3 border-b-2 border-purple-200">
                  <Type className="w-5 h-5" />
                  Content Blocks ({contentBlocks.length})
                </h4>
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

            {/* Subsections */}
            {subsections.length > 0 && (
              <div className="space-y-6 mt-8">
                <h4 className="text-lg font-semibold text-purple-900 flex items-center gap-3 pb-3 border-b-2 border-purple-200">
                  <Plus className="w-5 h-5" />
                  Subsections ({subsections.length})
                </h4>
                <NestedSubsectionManager
                  subsections={subsections}
                  sectionId={section.id}
                  sectionIndex={index}
                  onUpdate={updateSubsections}
                />
              </div>
            )}

            {/* Simple Add Content - Only when no content exists */}
            {!hasContent && (
              <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Sparkles className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-4">This section is empty</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <EnhancedButton
                    onClick={() => addContentBlock('text')}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Type className="w-4 h-4" />
                    Add Text
                  </EnhancedButton>
                  <EnhancedButton
                    onClick={() => addContentBlock('image')}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Add Image
                  </EnhancedButton>
                  <EnhancedButton
                    onClick={() => addContentBlock('table')}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                  >
                    <Table className="w-4 h-4" />
                    Add Table
                  </EnhancedButton>
                  <EnhancedButton
                    onClick={() => addContentBlock('equation')}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Calculator className="w-4 h-4" />
                    Add Equation
                  </EnhancedButton>
                </div>
              </div>
            )}

            {/* Add More Content - Only when content already exists */}
            {hasContent && (
              <div className="border-t pt-4">
                <div className="flex flex-wrap justify-center gap-2">
                  <EnhancedButton
                    onClick={() => addContentBlock('text')}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Text
                  </EnhancedButton>
                  <EnhancedButton
                    onClick={() => addContentBlock('image')}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Image
                  </EnhancedButton>
                  <EnhancedButton
                    onClick={() => addContentBlock('table')}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                  >
                    <Table className="w-4 h-4" />
                    Add Table
                  </EnhancedButton>
                  <EnhancedButton
                    onClick={() => addContentBlock('equation')}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Equation
                  </EnhancedButton>
                  <EnhancedButton
                    onClick={() => {
                      const newSubsection = {
                        id: `subsection_${Date.now()}_${Math.random()}`,
                        title: '',
                        content: '',
                        order: subsections.length,
                        level: 1
                      };
                      updateSubsections([...subsections, newSubsection]);
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Subsection
                  </EnhancedButton>
                </div>
              </div>
            )}
          </div>
        )}
      </EnhancedCard>
    </div>
  );
};

export default function StreamlinedSectionForm({
  sections,
  onUpdate,
  className
}: StreamlinedSectionFormProps) {
  // Add new section
  const addSection = () => {
    const newSection: Section = {
      id: `section_${Date.now()}_${Math.random()}`,
      title: '',
      contentBlocks: [],
      subsections: [],
      order: sections.length,
    };

    onUpdate([...sections, newSection]);
  };

  // Update section
  const updateSection = (sectionId: string, updates: Partial<Section>) => {
    onUpdate(
      sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    );
  };

  // Delete section
  const deleteSection = (sectionId: string) => {
    onUpdate(sections.filter(section => section.id !== sectionId));
  };

  const hasSections = sections.length > 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Document Sections</h2>
          {hasSections && (
            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
              {sections.length} section{sections.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        <EnhancedButton
          variant="default"
          size="sm"
          onClick={addSection}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Section
        </EnhancedButton>
      </div>

      {/* Sections */}
      {hasSections ? (
        <div className="space-y-4">
          {sections.map((section, index) => (
            <SectionItem
              key={section.id}
              section={section}
              index={index}
              onUpdate={(updates) => updateSection(section.id, updates)}
              onDelete={() => deleteSection(section.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-purple-50 rounded-xl border-2 border-dashed border-gray-300">
          <div className="max-w-sm mx-auto">
            <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Sparkles className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to start writing?</h3>
            <p className="text-gray-600 mb-4">Create your first section to begin building your IEEE paper.</p>
            <EnhancedButton
              variant="default"
              onClick={addSection}
              className="flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Create First Section
            </EnhancedButton>
          </div>
        </div>
      )}

      {/* Help Text */}
      {hasSections && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
              <Sparkles className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">✨ Pro Tips</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Use <strong>Text blocks</strong> for paragraphs and main content</li>
                <li>• Add <strong>Images</strong> for figures and diagrams</li>
                <li>• Create <strong>Tables</strong> for data presentation</li>
                <li>• Include <strong>Equations</strong> for mathematical content</li>
                <li>• Use <strong>Subsections</strong> to organize complex topics</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}