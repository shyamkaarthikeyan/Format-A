import React, { useState, useRef } from 'react';
import { Plus, Trash2, Image as ImageIcon, Table, Calculator, Link2, BookOpen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import RichTextEditor from '@/components/rich-text-editor';
import FileUpload from '@/components/file-upload';
import TableBlockEditor from '@/components/table-block-editor';
import LaTeXEquationEditor from '@/components/latex-equation-editor';
import type { Section, ContentBlock as ContentBlockType, Reference } from '@shared/schema';

interface ResearchWriterSectionFormProps {
  sections: Section[];
  onUpdate: (sections: Section[]) => void;
  references?: Reference[];
  className?: string;
}

// Cross-Reference Modal Component
interface CrossRefModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (ref: string) => void;
  type: 'figure' | 'table' | 'equation';
  items: Array<{ id: string; caption?: string; number: number }>;
}

const CrossRefModal: React.FC<CrossRefModalProps> = ({ isOpen, onClose, onSelect, type, items }) => {
  if (!isOpen) return null;

  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  const emoji = type === 'figure' ? '📷' : type === 'table' ? '📊' : '🔢';
  const colorClass = type === 'figure' ? 'blue' : type === 'table' ? 'purple' : 'orange';
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl transform animate-slideUp" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">{emoji}</span>
            Insert {typeLabel} Reference
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Click on a {type} below to insert its reference at your cursor position
        </p>
        
        {items.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-4xl mb-3">{emoji}</div>
            <p className="text-gray-700 font-medium mb-2">No {type}s found</p>
            <p className="text-sm text-gray-500">
              Add a {type} to your document first, then you can reference it here.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelect(`${typeLabel} ${item.number}`);
                  onClose();
                }}
                className={`w-full text-left p-4 border-2 border-${colorClass}-200 rounded-lg hover:bg-${colorClass}-50 hover:border-${colorClass}-400 hover:shadow-md transition-all group`}
              >
                <div className={`font-bold text-${colorClass}-600 text-lg mb-1 group-hover:text-${colorClass}-700`}>
                  {emoji} {typeLabel} {item.number}
                </div>
                {item.caption && (
                  <div className="text-sm text-gray-600 line-clamp-2">{item.caption}</div>
                )}
                <div className="text-xs text-gray-400 mt-2">Click to insert reference</div>
              </button>
            ))}
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            💡 Tip: The reference will be inserted where your cursor is in the text editor
          </p>
        </div>
      </div>
    </div>
  );
};

export default function ResearchWriterSectionForm({
  sections,
  onUpdate,
  references = [],
  className
}: ResearchWriterSectionFormProps) {
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

  const updateSection = (sectionId: string, updates: Partial<Section>) => {
    onUpdate(
      sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    );
  };

  const deleteSection = (sectionId: string) => {
    onUpdate(sections.filter(section => section.id !== sectionId));
  };

  return (
    <div className={cn('space-y-6', className)}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              ✍️ Write Your Research Paper
              {sections.length > 0 && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({sections.length} {sections.length === 1 ? 'section' : 'sections'})
                </span>
              )}
            </h2>
          </div>
          <Button 
            onClick={addSection} 
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Section
          </Button>
        </div>

        {/* Sections */}
        {sections.length > 0 ? (
          <div className="space-y-6">
            {sections.map((section, index) => (
              <div key={section.id} id={`section-${section.id}`}>
                <SectionEditor
                  section={section}
                  index={index}
                  onUpdate={(updates) => updateSection(section.id, updates)}
                  onDelete={() => deleteSection(section.id)}
                  allSections={sections}
                  references={references}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Writing Your Paper</h3>
            <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
              Create sections like Introduction, Methodology, Results, and Conclusion.
            </p>
            <Button 
              onClick={addSection} 
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Section
            </Button>
          </div>
        )}
    </div>
  );
}

// Citation Modal Component
interface CitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (citation: string) => void;
  references: Reference[];
}

const CitationModal: React.FC<CitationModalProps> = ({ isOpen, onClose, onSelect, references }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen) return null;

  const filteredRefs = references.filter(ref =>
    ref.text?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-3xl w-full mx-4 shadow-2xl max-h-[85vh] overflow-hidden flex flex-col transform animate-slideUp" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">📚</span>
            Insert Citation
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Search and select a reference to insert its citation (e.g., [1], [2]) at your cursor position
        </p>
        
        <div className="relative mb-4">
          <Input
            placeholder="🔍 Search references by title, author, or keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-4 pr-10 h-12 text-base border-2 border-purple-200 focus:border-purple-400"
            autoFocus
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {filteredRefs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-5xl mb-4">📚</div>
            {references.length === 0 ? (
              <>
                <p className="text-gray-700 font-medium mb-2">No references found</p>
                <p className="text-sm text-gray-500 mb-4">
                  Add references in the <strong>References tab</strong> first, then you can cite them here.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto text-left">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> Go to the References tab and add your bibliography entries. Then come back here to cite them!
                  </p>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-700 font-medium mb-2">No matching references</p>
                <p className="text-sm text-gray-500">
                  Try a different search term or clear the search to see all references
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="text-xs text-gray-500 mb-2 flex items-center justify-between">
              <span>Found {filteredRefs.length} {filteredRefs.length === 1 ? 'reference' : 'references'}</span>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-purple-600 hover:text-purple-700 font-medium"
                >
                  Clear search
                </button>
              )}
            </div>
            <div className="space-y-2 overflow-y-auto flex-1 pr-2">
              {filteredRefs.map((ref, index) => (
                <button
                  key={ref.id}
                  onClick={() => {
                    onSelect(`[${index + 1}]`);
                    onClose();
                  }}
                  className="w-full text-left p-4 border-2 border-purple-200 rounded-lg hover:bg-purple-50 hover:border-purple-400 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-purple-100 text-purple-700 font-bold px-3 py-1 rounded-md text-sm flex-shrink-0 group-hover:bg-purple-200">
                      [{index + 1}]
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 leading-relaxed">{ref.text}</div>
                      <div className="text-xs text-gray-400 mt-2">Click to insert citation</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            💡 Tip: The citation number [1], [2], etc. will be inserted where your cursor is in the text editor
          </p>
        </div>
      </div>
    </div>
  );
};

// Inline Content Component
interface InlineContentProps {
  block: ContentBlockType;
  onUpdate: (updates: Partial<ContentBlockType>) => void;
  onRemove: () => void;
}

const InlineContent: React.FC<InlineContentProps> = ({ block, onUpdate, onRemove }) => {
  if (block.type === 'image') {
    return (
      <div className="my-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-blue-700 font-medium">
            <ImageIcon className="w-4 h-4" />
            <span className="text-sm">Image</span>
          </div>
          <Button onClick={onRemove} variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <FileUpload
          onFileSelect={(file, base64) => {
            onUpdate({ 
              imageId: `img_${Date.now()}`,
              data: base64.split(',')[1],
              fileName: file.name,
              caption: block.caption || "",
              size: block.size || "medium"
            });
          }}
          onClear={() => {
            onUpdate({ imageId: undefined, data: undefined, fileName: undefined });
          }}
          accept="image/*"
          maxSize={10 * 1024 * 1024}
          currentFile={block.imageId ? { 
            name: block.fileName || 'Uploaded Image',
            preview: block.data ? `data:image/png;base64,${block.data}` : undefined 
          } : undefined}
          compact={true}
        />
        {block.imageId && (
          <div className="mt-3 space-y-2">
            <Input placeholder="Image caption" value={block.caption || ""} onChange={(e) => onUpdate({ caption: e.target.value })} className="text-sm" />
            <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm" value={block.size || "medium"} onChange={(e) => onUpdate({ size: e.target.value as any })}>
              <option value="extra-small">Extra Small (1.0")</option>
              <option value="small">Small (1.5")</option>
              <option value="medium">Medium (2.0")</option>
              <option value="large">Large (2.5")</option>
              <option value="extra-large">Extra Large (3.0")</option>
            </select>
          </div>
        )}
      </div>
    );
  }

  if (block.type === 'table') {
    return (
      <div className="my-4 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-purple-700 font-medium">
            <Table className="w-4 h-4" />
            <span className="text-sm">📊 Table</span>
          </div>
          <Button onClick={onRemove} variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <TableBlockEditor block={block} onUpdate={onUpdate} />
      </div>
    );
  }

  if (block.type === 'equation') {
    return (
      <div className="my-4 p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-orange-700 font-medium">
            <Calculator className="w-4 h-4" />
            <span className="text-sm">🔢 Equation {block.equationNumber ? `(${block.equationNumber})` : ''}</span>
          </div>
          <Button onClick={onRemove} variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <LaTeXEquationEditor value={block.content || ""} onChange={(content) => onUpdate({ content })} equationNumber={block.equationNumber} />
      </div>
    );
  }

  return null;
};

// Section Editor Component
interface SectionEditorProps {
  section: Section;
  index: number;
  onUpdate: (updates: Partial<Section>) => void;
  onDelete: () => void;
  allSections: Section[];
  references: Reference[];
}

const SectionEditor: React.FC<SectionEditorProps> = ({ section, index, onUpdate, onDelete, allSections, references }) => {
  const [showCrossRefModal, setShowCrossRefModal] = useState(false);
  const [showCitationModal, setShowCitationModal] = useState(false);
  const [crossRefType, setCrossRefType] = useState<'figure' | 'table' | 'equation'>('figure');
  const [subsectionsCollapsed, setSubsectionsCollapsed] = useState(false);
  
  const contentBlocks = section.contentBlocks || [];
  const textBlock = contentBlocks.find(b => b.type === 'text');
  const otherBlocks = contentBlocks.filter(b => b.type !== 'text');
  const subsections = section.subsections || [];

  // Count words
  const wordCount = (textBlock?.content || '').trim().split(/\s+/).filter(w => w.length > 0).length;

  // Get all figures, tables, equations from all sections
  const getAllItems = (type: 'figure' | 'table' | 'equation') => {
    const blockType: 'image' | 'table' | 'equation' = type === 'figure' ? 'image' : type;
    const items: Array<{ id: string; caption?: string; number: number }> = [];
    let counter = 1;
    
    allSections.forEach(sec => {
      (sec.contentBlocks || []).forEach(block => {
        if (block.type === blockType) {
          items.push({
            id: block.id,
            caption: block.caption || block.content?.substring(0, 50),
            number: counter++
          });
        }
      });
    });
    
    return items;
  };

  // Insert text at end of content (since we can't easily access cursor in contentEditable)
  const insertAtCursor = (text: string) => {
    const currentText = textBlock?.content || '';
    const newText = currentText + (currentText ? ' ' : '') + text;
    updateTextContent(newText);
  };

  const addContentBlock = (type: ContentBlockType['type']) => {
    let equationNumber: number | undefined;
    if (type === 'equation') {
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

    onUpdate({ contentBlocks: [...contentBlocks, newBlock] });
  };

  const updateContentBlock = (blockId: string, updates: Partial<ContentBlockType>) => {
    onUpdate({
      contentBlocks: contentBlocks.map(block =>
        block.id === blockId ? { ...block, ...updates } : block
      )
    });
  };

  const removeContentBlock = (blockId: string) => {
    const updatedBlocks = contentBlocks.filter(block => block.id !== blockId);
    let equationCounter = 1;
    const renumberedBlocks = updatedBlocks.map(block => {
      if (block.type === 'equation') {
        return { ...block, equationNumber: equationCounter++ };
      }
      return block;
    });
    onUpdate({ contentBlocks: renumberedBlocks });
  };

  const updateTextContent = (content: string) => {
    if (textBlock) {
      updateContentBlock(textBlock.id, { content });
    } else {
      const newTextBlock: ContentBlockType = {
        id: `block_${Date.now()}_${Math.random()}`,
        type: 'text',
        content,
        order: 0
      };
      onUpdate({ contentBlocks: [newTextBlock, ...contentBlocks] });
    }
  };

  const addSubsection = () => {
    const newSubsection = {
      id: `subsection_${Date.now()}_${Math.random()}`,
      title: '',
      content: '',
      order: subsections.length,
      level: 1
    };
    onUpdate({ subsections: [...subsections, newSubsection] });
  };

  const updateSubsection = (subId: string, updates: any) => {
    onUpdate({
      subsections: subsections.map(sub => sub.id === subId ? { ...sub, ...updates } : sub)
    });
  };

  const deleteSubsection = (subId: string) => {
    // Delete subsection and all its children recursively
    const toDelete = new Set([subId]);
    const findChildren = (parentId: string) => {
      subsections.forEach(sub => {
        if (sub.parentId === parentId) {
          toDelete.add(sub.id);
          findChildren(sub.id);
        }
      });
    };
    findChildren(subId);
    onUpdate({ subsections: subsections.filter(sub => !toDelete.has(sub.id)) });
  };

  const addChildSubsection = (parentId: string, parentLevel: number) => {
    const newSubsection = {
      id: `subsection_${Date.now()}_${Math.random()}`,
      title: '',
      content: '',
      order: subsections.length,
      level: parentLevel + 1,
      parentId: parentId
    };
    onUpdate({ subsections: [...subsections, newSubsection] });
  };

  // Calculate subsection numbering
  const getSubsectionNumber = (sub: any, sectionIndex: number): string => {
    if (!sub.parentId) {
      // Top level subsection
      const topLevelSubs = subsections.filter(s => !s.parentId);
      const idx = topLevelSubs.findIndex(s => s.id === sub.id);
      return `${sectionIndex + 1}.${idx + 1}`;
    } else {
      // Nested subsection
      const parent = subsections.find(s => s.id === sub.parentId);
      if (parent) {
        const parentNumber = getSubsectionNumber(parent, sectionIndex);
        const siblings = subsections.filter(s => s.parentId === sub.parentId);
        const idx = siblings.findIndex(s => s.id === sub.id);
        return `${parentNumber}.${idx + 1}`;
      }
    }
    return '';
  };

  // Render subsection recursively
  const renderSubsection = (sub: any, subIdx: number, sectionIndex: number, level: number): React.ReactNode => {
    const children = subsections.filter(s => s.parentId === sub.id);
    const subsectionNumber = getSubsectionNumber(sub, sectionIndex);
    const canAddChild = level < 5; // Max 5 levels deep

    return (
      <div key={sub.id}>
        <div className="bg-gradient-to-r from-green-50 to-white border-2 border-green-200 rounded-lg p-5 mb-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-md shadow-sm">
              {subsectionNumber}
            </span>
            <Input
              value={sub.title}
              onChange={(e) => updateSubsection(sub.id, { title: e.target.value })}
              placeholder="Subsection title"
              className="flex-1 h-10 text-base font-medium"
            />
            {canAddChild && (
              <Button 
                onClick={() => addChildSubsection(sub.id, level)} 
                variant="outline" 
                size="sm" 
                className="h-9 w-9 p-0 hover:bg-green-50"
                title="Add nested subsection"
              >
                <Plus className="w-4 h-4" />
              </Button>
            )}
            <Button 
              onClick={() => deleteSubsection(sub.id)} 
              variant="outline" 
              size="sm" 
              className="h-9 w-9 p-0 text-red-600 hover:bg-red-50 hover:border-red-300"
              title="Delete subsection"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <RichTextEditor
            value={sub.content}
            onChange={(content) => updateSubsection(sub.id, { content })}
            placeholder="Write subsection content with formatting..."
            rows={6}
            className="text-base"
          />
        </div>
        {children.length > 0 && (
          <div>
            {children.map((child, childIdx) => renderSubsection(child, childIdx, sectionIndex, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all">
        {/* Section Header */}
        <div className="bg-gradient-to-r from-purple-50 to-white border-b-2 border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-600 text-white rounded-full font-bold text-xl flex-shrink-0 shadow-md">
              {index + 1}
            </div>
            <Input
              value={section.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Section Title (e.g., Introduction, Methodology, Results...)"
              className="flex-1 text-xl font-semibold border-0 bg-transparent focus:bg-white focus:border-2 focus:border-purple-300 transition-all py-3"
            />
            <Button onClick={onDelete} variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 p-3">
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Section Body */}
        <div className="p-8">
          <div className="space-y-6">
            {/* Text Editor with Helper Buttons */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-base font-semibold text-gray-800">
                  ✍️ Write your content ({wordCount} words)
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      setCrossRefType('figure');
                      setShowCrossRefModal(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-sm hover:bg-blue-50 hover:border-blue-300"
                    title="Reference a figure"
                  >
                    📷 Figure
                  </Button>
                  <Button
                    onClick={() => {
                      setCrossRefType('table');
                      setShowCrossRefModal(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-sm hover:bg-purple-50 hover:border-purple-300"
                    title="Reference a table"
                  >
                    📊 Table
                  </Button>
                  <Button
                    onClick={() => {
                      setCrossRefType('equation');
                      setShowCrossRefModal(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-sm hover:bg-orange-50 hover:border-orange-300"
                    title="Reference an equation"
                  >
                    🔢 Equation
                  </Button>
                  <Button
                    onClick={() => setShowCitationModal(true)}
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-sm hover:bg-green-50 hover:border-green-300"
                    title="Insert citation"
                  >
                    📚 Cite
                  </Button>
                </div>
              </div>
              
              <RichTextEditor
                value={textBlock?.content || ""}
                onChange={(content) => updateTextContent(content)}
                placeholder="Start writing your content here... Write naturally and use the emoji buttons above to insert references. Use the formatting toolbar for bold, italic, underline, lists, and alignment."
                rows={18}
                className="min-h-[350px]"
              />
            </div>

            {/* Inline Content Blocks */}
            {otherBlocks.map((block) => (
              <InlineContent
                key={block.id}
                block={block}
                onUpdate={(updates) => updateContentBlock(block.id, updates)}
                onRemove={() => removeContentBlock(block.id)}
              />
            ))}

            {/* Insert Toolbar */}
            <div className="flex items-center gap-3 pt-6 border-t-2 border-gray-200">
              <span className="text-sm font-medium text-gray-700">📎 Add to section:</span>
              <Button 
                onClick={() => addContentBlock('image')} 
                variant="outline" 
                size="sm" 
                className="h-10 px-4 hover:bg-blue-50 hover:border-blue-300"
              >
                📷 Image
              </Button>
              <Button 
                onClick={() => addContentBlock('table')} 
                variant="outline" 
                size="sm" 
                className="h-10 px-4 hover:bg-purple-50 hover:border-purple-300"
              >
                📊 Table
              </Button>
              <Button 
                onClick={() => addContentBlock('equation')} 
                variant="outline" 
                size="sm" 
                className="h-10 px-4 hover:bg-orange-50 hover:border-orange-300"
              >
                🔢 Equation
              </Button>
            </div>

            {/* Subsections - Collapsible */}
            <div className="pt-6 border-t-2 border-gray-200 mt-6">
              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={() => setSubsectionsCollapsed(!subsectionsCollapsed)}
                  className="flex items-center gap-3 text-base font-semibold text-gray-800 hover:text-purple-600 transition-colors"
                >
                  <span className={`transform transition-transform text-purple-600 ${subsectionsCollapsed ? '' : 'rotate-90'}`}>
                    ▶
                  </span>
                  <span>
                    📑 Subsections {subsections.length > 0 && `(${subsections.length})`}
                  </span>
                  <span className="text-sm text-gray-500 font-normal">- click to {subsectionsCollapsed ? 'expand' : 'collapse'}</span>
                </button>
                <Button 
                  onClick={addSubsection} 
                  variant="outline" 
                  size="sm" 
                  className="h-10 px-4 bg-purple-50 hover:bg-purple-100 border-purple-300"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Subsection
                </Button>
              </div>
              
              {!subsectionsCollapsed && (
                <>
                  {subsections.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      No subsections yet. Click "Add" to create one.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {subsections.filter(s => !s.parentId).map((sub, subIdx) => 
                        renderSubsection(sub, subIdx, index, 1)
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CrossRefModal
        isOpen={showCrossRefModal}
        onClose={() => setShowCrossRefModal(false)}
        onSelect={(ref) => insertAtCursor(ref)}
        type={crossRefType}
        items={getAllItems(crossRefType)}
      />
      
      <CitationModal
        isOpen={showCitationModal}
        onClose={() => setShowCitationModal(false)}
        onSelect={(citation) => insertAtCursor(citation)}
        references={references}
      />
    </>
  );
};
