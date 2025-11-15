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
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Insert {typeLabel} Reference</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {items.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No {type}s found. Add a {type} first.
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelect(`${typeLabel} ${item.number}`);
                  onClose();
                }}
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all"
              >
                <div className="font-medium text-blue-600">{typeLabel} {item.number}</div>
                {item.caption && <div className="text-sm text-gray-600 mt-1">{item.caption}</div>}
              </button>
            ))}
          </div>
        )}
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
      <div className="flex items-center justify-between pb-4 border-b-2 border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">✍️ Write Your Research Paper</h2>
          <p className="text-sm text-gray-600 mt-1">
            Focus on writing. Add images, tables, and equations as you go. Use helper buttons to insert references and citations.
          </p>
        </div>
        <Button onClick={addSection} size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-6">
          <Plus className="w-5 h-5 mr-2" />
          Add Section
        </Button>
      </div>

      {/* Sections */}
      {sections.length > 0 ? (
        <div className="space-y-6">
          {sections.map((section, index) => (
            <SectionEditor
              key={section.id}
              section={section}
              index={index}
              onUpdate={(updates) => updateSection(section.id, updates)}
              onDelete={() => deleteSection(section.id)}
              allSections={sections}
              references={references}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gradient-to-br from-purple-50 to-white rounded-xl border-2 border-dashed border-gray-300">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Start Writing Your Paper</h3>
            <p className="text-gray-600 mb-6">
              Create sections like Introduction, Methodology, Results, and Conclusion. Each section gives you a large writing space with easy access to insert images, tables, equations, and citations.
            </p>
            <Button onClick={addSection} size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8">
              <Plus className="w-5 h-5 mr-2" />
              Create First Section
            </Button>
          </div>
        </div>
      )}

      {/* Writing Tips */}
      {sections.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-xl">✨</span>
            Writing Tips for Research Papers
          </h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <p className="font-medium mb-1">📝 Common Sections:</p>
              <ul className="space-y-1 text-gray-600">
                <li>• <strong>Abstract</strong> - Summary of your work</li>
                <li>• <strong>Introduction</strong> - Background & motivation</li>
                <li>• <strong>Related Work</strong> - Previous research</li>
                <li>• <strong>Methodology</strong> - Your approach</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1">📊 More Sections:</p>
              <ul className="space-y-1 text-gray-600">
                <li>• <strong>Results</strong> - Findings & data</li>
                <li>• <strong>Discussion</strong> - Interpretation</li>
                <li>• <strong>Conclusion</strong> - Summary & future work</li>
                <li>• <strong>References</strong> - Added in References tab</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
            <p className="text-sm text-gray-700">
              <strong>💡 Pro Tip:</strong> Use the helper buttons above the text editor to quickly insert references to your figures, tables, equations, and citations. No more manual tracking!
            </p>
          </div>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Insert Citation</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <Input
          placeholder="Search references..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
        />
        
        {filteredRefs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {references.length === 0 
              ? 'No references found. Add references in the References tab first.'
              : 'No matching references found.'}
          </p>
        ) : (
          <div className="space-y-2 overflow-y-auto flex-1">
            {filteredRefs.map((ref, index) => (
              <button
                key={ref.id}
                onClick={() => {
                  onSelect(`[${index + 1}]`);
                  onClose();
                }}
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-all"
              >
                <div className="font-medium text-purple-600">[{index + 1}]</div>
                <div className="text-sm text-gray-900 mt-1">{ref.text}</div>
              </button>
            ))}
          </div>
        )}
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
            <span className="text-sm">Table</span>
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
            <span className="text-sm">Equation {block.equationNumber ? `(${block.equationNumber})` : ''}</span>
          </div>
          <Button onClick={onRemove} variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <LaTeXEquationEditor value={block.content || ""} onChange={(content) => onUpdate({ content })} equationNumber={block.equationNumber} />
        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-600 mb-2">Or Upload Equation Image</label>
          <FileUpload
            onFileSelect={(file, base64) => {
              onUpdate({ imageId: `eq_${Date.now()}`, data: base64.split(',')[1], fileName: file.name });
            }}
            onClear={() => {
              onUpdate({ imageId: undefined, data: undefined, fileName: undefined });
            }}
            accept="image/*"
            maxSize={10 * 1024 * 1024}
            currentFile={block.imageId ? { 
              name: block.fileName || 'Equation Image',
              preview: block.data ? `data:image/png;base64,${block.data}` : undefined 
            } : undefined}
            compact={true}
          />
        </div>
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
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

  // Insert text at cursor position
  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textBlock?.content || '';
    const newText = currentText.substring(0, start) + text + currentText.substring(end);
    
    updateTextContent(newText);
    
    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
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
    onUpdate({ subsections: subsections.filter(sub => sub.id !== subId) });
  };

  return (
    <>
      <div className="bg-white rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        {/* Section Header */}
        <div className="bg-gradient-to-r from-purple-50 to-white border-b-2 border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-purple-600 text-white rounded-full font-bold text-lg flex-shrink-0">
              {index + 1}
            </div>
            <Input
              value={section.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Section Title (e.g., Introduction, Methodology, Results...)"
              className="flex-1 text-lg font-semibold border-0 bg-transparent focus:bg-white focus:border-2 focus:border-purple-300 transition-all"
            />
            <Button onClick={onDelete} variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Section Body */}
        <div className="p-6">
          <div className="space-y-4">
            {/* Text Editor with Helper Buttons */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Section Content</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{wordCount} words</span>
                  <Button
                    onClick={() => {
                      setCrossRefType('figure');
                      setShowCrossRefModal(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <Link2 className="w-3 h-3 mr-1" />
                    Figure
                  </Button>
                  <Button
                    onClick={() => {
                      setCrossRefType('table');
                      setShowCrossRefModal(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
                  >
                    <Link2 className="w-3 h-3 mr-1" />
                    Table
                  </Button>
                  <Button
                    onClick={() => {
                      setCrossRefType('equation');
                      setShowCrossRefModal(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    <Link2 className="w-3 h-3 mr-1" />
                    Equation
                  </Button>
                  <Button
                    onClick={() => setShowCitationModal(true)}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <BookOpen className="w-3 h-3 mr-1" />
                    Cite
                  </Button>
                </div>
              </div>
              
              <Textarea
                ref={textareaRef}
                value={textBlock?.content || ""}
                onChange={(e) => updateTextContent(e.target.value)}
                placeholder="Start writing your section content here... You have plenty of space to write paragraphs, explain concepts, and develop your ideas.

Use the buttons above to insert references to figures, tables, equations, or citations as you write."
                className="min-h-[400px] text-base leading-relaxed resize-y"
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
            <div className="flex items-center gap-2 pt-4 border-t-2 border-gray-100">
              <span className="text-sm text-gray-600 font-medium">Insert:</span>
              <Button onClick={() => addContentBlock('image')} variant="outline" size="sm" className="flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50">
                <ImageIcon className="w-4 h-4" />
                Image
              </Button>
              <Button onClick={() => addContentBlock('table')} variant="outline" size="sm" className="flex items-center gap-2 border-purple-300 text-purple-700 hover:bg-purple-50">
                <Table className="w-4 h-4" />
                Table
              </Button>
              <Button onClick={() => addContentBlock('equation')} variant="outline" size="sm" className="flex items-center gap-2 border-orange-300 text-orange-700 hover:bg-orange-50">
                <Calculator className="w-4 h-4" />
                Equation
              </Button>
            </div>

            {/* Subsections */}
            <div className="pt-6 border-t-2 border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    📑 Subsections
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">Organize your section into smaller parts (e.g., {index + 1}.1, {index + 1}.2)</p>
                </div>
                <Button onClick={addSubsection} variant="outline" size="sm" className="border-green-500 text-green-700 hover:bg-green-50 font-semibold">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Subsection
                </Button>
              </div>
              
              {subsections.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-sm text-gray-500 mb-2">No subsections yet</p>
                  <p className="text-xs text-gray-400">Break down complex sections for better organization</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {subsections.map((sub, subIdx) => (
                    <div key={sub.id} className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-all">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-green-500 text-white text-sm font-bold px-3 py-1 rounded-md min-w-[60px] text-center">
                          {index + 1}.{subIdx + 1}
                        </div>
                        <Input
                          value={sub.title}
                          onChange={(e) => updateSubsection(sub.id, { title: e.target.value })}
                          placeholder="Subsection title (e.g., Data Collection, Analysis Method...)"
                          className="flex-1 font-semibold bg-white"
                        />
                        <Button onClick={() => deleteSubsection(sub.id)} variant="ghost" size="sm" className="text-red-600 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Textarea
                        value={sub.content}
                        onChange={(e) => updateSubsection(sub.id, { content: e.target.value })}
                        placeholder="Write the content for this subsection..."
                        className="min-h-[150px] bg-white"
                      />
                    </div>
                  ))}
                </div>
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
