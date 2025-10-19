import React, { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Shuffle, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { VirtualSectionScroll } from '@/components/ui/virtual-scroll';
import { LazySection } from '@/components/ui/lazy-component';
import DraggableSection from './draggable-section';
import ContentBlockEditor from './content-block-editor';
import NestedSubsectionManager from './nested-subsection-manager';
import ContentTypeSelector from './content-type-selector';
import type { Section, ContentBlock, Subsection } from '@shared/schema';

interface EnhancedSectionFormProps {
  sections: Section[];
  onUpdate: (sections: Section[]) => void;
  activeSection?: string;
  onSectionClick?: (sectionId: string) => void;
  className?: string;
}

const EnhancedSectionForm = React.memo<EnhancedSectionFormProps>(({
  sections,
  onUpdate,
  activeSection,
  onSectionClick,
  className,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map(s => s.id))
  );
  const [draggedSection, setDraggedSection] = useState<Section | null>(null);
  const [showReorderMode, setShowReorderMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const section = sections.find(s => s.id === active.id);
    setDraggedSection(section || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedSection(null);

    if (active.id !== over?.id) {
      const oldIndex = sections.findIndex(s => s.id === active.id);
      const newIndex = sections.findIndex(s => s.id === over?.id);

      const reorderedSections = arrayMove(sections, oldIndex, newIndex).map(
        (section, index) => ({ ...section, order: index })
      );

      onUpdate(reorderedSections);
    }
  };

  const addSection = useCallback(() => {
    const newSection: Section = {
      id: `section_${Date.now()}`,
      title: '',
      contentBlocks: [],
      subsections: [],
      order: sections.length,
    };

    onUpdate([...sections, newSection]);
    setExpandedSections(prev => new Set([...prev, newSection.id]));
  }, [sections, onUpdate]);

  const updateSection = useCallback((sectionId: string, updates: Partial<Section>) => {
    onUpdate(
      sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    );
  }, [sections, onUpdate]);

  const deleteSection = useCallback((sectionId: string) => {
    onUpdate(sections.filter(section => section.id !== sectionId));
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      newSet.delete(sectionId);
      return newSet;
    });
  }, [sections, onUpdate]);

  const duplicateSection = useCallback((sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const duplicatedSection: Section = {
      ...section,
      id: `section_${Date.now()}`,
      title: `${section.title} (Copy)`,
      order: sections.length,
      contentBlocks: section.contentBlocks.map(block => ({
        ...block,
        id: `block_${Date.now()}_${Math.random()}`,
      })),
      subsections: section.subsections.map(sub => ({
        ...sub,
        id: `subsection_${Date.now()}_${Math.random()}`,
      })),
    };

    onUpdate([...sections, duplicatedSection]);
    setExpandedSections(prev => new Set([...prev, duplicatedSection.id]));
  }, [sections, onUpdate]);

  const toggleSectionExpansion = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const addContentBlock = (sectionId: string, type: ContentBlock['type']) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const newBlock: ContentBlock = {
      id: `block_${Date.now()}`,
      type,
      content: type === 'text' ? '' : undefined,
      tableName: type === 'table' ? 'Table Name' : undefined,
      order: section.contentBlocks.length,
    };

    updateSection(sectionId, {
      contentBlocks: [...section.contentBlocks, newBlock],
    });
  };

  const addSubsection = (sectionId: string, parentId?: string, level: number = 1) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const newSubsection: Subsection = {
      id: `subsection_${Date.now()}_${Math.random()}`,
      title: '',
      content: '',
      order: section.subsections.length,
      level,
      parentId,
    };

    updateSection(sectionId, {
      subsections: [...section.subsections, newSubsection],
    });
  };

  const updateSubsections = (sectionId: string, subsections: Subsection[]) => {
    updateSection(sectionId, { subsections });
  };

  const toggleExpandAll = () => {
    if (expandedSections.size === sections.length) {
      setExpandedSections(new Set());
    } else {
      setExpandedSections(new Set(sections.map(s => s.id)));
    }
  };

  const handleContentBlockDragEnd = (event: DragEndEvent, sectionId: string) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const section = sections.find(s => s.id === sectionId);
      if (!section) return;

      const oldIndex = section.contentBlocks.findIndex(b => b.id === active.id);
      const newIndex = section.contentBlocks.findIndex(b => b.id === over?.id);

      const reorderedBlocks = arrayMove(section.contentBlocks, oldIndex, newIndex).map(
        (block, index) => ({ ...block, order: index })
      );

      updateSection(sectionId, { contentBlocks: reorderedBlocks });
    }
  };

  const updateContentBlock = (sectionId: string, blockId: string, updates: Partial<ContentBlock>) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    updateSection(sectionId, {
      contentBlocks: section.contentBlocks.map(block =>
        block.id === blockId ? { ...block, ...updates } : block
      ),
    });
  };

  const deleteContentBlock = (sectionId: string, blockId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    updateSection(sectionId, {
      contentBlocks: section.contentBlocks.filter(block => block.id !== blockId),
    });
  };

  const duplicateContentBlock = (sectionId: string, blockId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const block = section.contentBlocks.find(b => b.id === blockId);
    if (!block) return;

    const duplicatedBlock: ContentBlock = {
      ...block,
      id: `block_${Date.now()}_${Math.random()}`,
      order: section.contentBlocks.length,
    };

    updateSection(sectionId, {
      contentBlocks: [...section.contentBlocks, duplicatedBlock],
    });
  };

  const allExpanded = expandedSections.size === sections.length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">Sections</h3>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {sections.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <EnhancedButton
            variant="ghost"
            size="sm"
            onClick={toggleExpandAll}
            className="text-gray-600"
          >
            {allExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </EnhancedButton>

          <EnhancedButton
            variant="ghost"
            size="sm"
            onClick={() => setShowReorderMode(!showReorderMode)}
            className={cn(
              'text-gray-600',
              showReorderMode && 'bg-purple-100 text-purple-700'
            )}
          >
            <Shuffle className="w-4 h-4" />
            Reorder
          </EnhancedButton>

          <EnhancedButton
            variant="default"
            size="sm"
            onClick={addSection}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Section
          </EnhancedButton>
        </div>
      </div>

      {/* Reorder Mode Notice */}
      {showReorderMode && (
        <EnhancedCard variant="glass" className="p-3">
          <div className="flex items-center gap-2 text-sm text-purple-700">
            <Shuffle className="w-4 h-4" />
            <span>Drag sections by their handles to reorder them</span>
          </div>
        </EnhancedCard>
      )}

      {/* Sections List */}
      {sections.length === 0 ? (
        <EnhancedCard variant="glass" className="p-8 text-center">
          <div className="space-y-3">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-100 to-violet-100 rounded-2xl flex items-center justify-center">
              <Plus className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-1">
                No sections yet
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                Start building your document by adding your first section
              </p>
              <EnhancedButton onClick={addSection}>
                <Plus className="w-4 h-4 mr-1" />
                Add Your First Section
              </EnhancedButton>
            </div>
          </div>
        </EnhancedCard>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sections.map(s => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {sections.map((section, index) => (
                <DraggableSection
                  key={section.id}
                  section={section}
                  index={index}
                  isExpanded={expandedSections.has(section.id)}
                  isActive={activeSection === section.id}
                  onToggleExpand={() => toggleSectionExpansion(section.id)}
                  onUpdate={(updates) => updateSection(section.id, updates)}
                  onDelete={() => deleteSection(section.id)}
                  onDuplicate={() => duplicateSection(section.id)}
                  onAddContentBlock={(type) => addContentBlock(section.id, type)}
                  onAddSubsection={() => addSubsection(section.id)}
                  onClick={() => onSectionClick?.(section.id)}
                >
                  {/* Content Blocks */}
                  {section.contentBlocks.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        Content Blocks
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {section.contentBlocks.length}
                        </span>
                      </h4>
                      
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => handleContentBlockDragEnd(event, section.id)}
                      >
                        <SortableContext
                          items={section.contentBlocks.map(b => b.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {section.contentBlocks.map((block, blockIndex) => (
                              <ContentBlockEditor
                                key={block.id}
                                block={block}
                                index={blockIndex}
                                onUpdate={(updates: Partial<ContentBlock>) => updateContentBlock(section.id, block.id, updates)}
                                onDelete={() => deleteContentBlock(section.id, block.id)}
                                onDuplicate={() => duplicateContentBlock(section.id, block.id)}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                  )}

                  {/* Subsections */}
                  <NestedSubsectionManager
                    subsections={section.subsections}
                    sectionId={section.id}
                    sectionIndex={sections.findIndex(s => s.id === section.id)}
                    onUpdate={(subsections) => updateSubsections(section.id, subsections)}
                  />
                </DraggableSection>
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {draggedSection ? (
              <EnhancedCard variant="elevated" className="opacity-90 rotate-3">
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {sections.findIndex(s => s.id === draggedSection.id) + 1}
                    </span>
                    <span className="font-medium">
                      {draggedSection.title || 'Untitled Section'}
                    </span>
                  </div>
                </div>
              </EnhancedCard>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
});

EnhancedSectionForm.displayName = 'EnhancedSectionForm';

export default EnhancedSectionForm;