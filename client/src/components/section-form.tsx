import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ChevronDown, ChevronRight, Type, Image as ImageIcon, Table, Calculator, Upload } from "lucide-react";
import type { Section, ContentBlock as ContentBlockType, Subsection } from "@shared/schema";



// Helper function to get subsection numbering
const getSubsectionNumber = (subsection: Subsection, sectionIndex: number, allSubsections: Subsection[]): string => {
  if (!subsection.level || subsection.level === 1) {
    // Main subsection (e.g., 2.1)
    const mainSubsections = allSubsections.filter(s => (!s.level || s.level === 1));
    const index = mainSubsections.findIndex(s => s.id === subsection.id);
    return `${sectionIndex + 1}.${index + 1}`;
  } else {
    // Nested subsection (e.g., 2.1.1)
    const parent = allSubsections.find(s => s.id === subsection.parentId);
    if (parent) {
      const parentNumber = getSubsectionNumber(parent, sectionIndex, allSubsections);
      const siblings = allSubsections.filter(s => s.parentId === subsection.parentId && s.level === subsection.level);
      const index = siblings.findIndex(s => s.id === subsection.id);
      return `${parentNumber}.${index + 1}`;
    }
  }
  return `${sectionIndex + 1}.?`;
};

interface SectionFormProps {
  sections: Section[];
  onUpdate: (sections: Section[]) => void;
}

// Compact Content Block Component
const CompactContentBlock = ({ 
  block, 
  onUpdate, 
  onRemove 
}: { 
  block: ContentBlockType; 
  onUpdate: (updates: Partial<ContentBlockType>) => void; 
  onRemove: () => void; 
}) => {
  if (block.type === "text") {
    return (
      <div className="border border-gray-200 rounded p-2 bg-white">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-500 font-medium">TEXT</span>
          <Button onClick={onRemove} variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
        <Textarea
          value={block.content || ""}
          onChange={(e) => onUpdate({ content: e.target.value })}
          placeholder="Enter your text content here..."
          className="min-h-[120px] text-sm resize-none border border-gray-200 p-2 focus-visible:ring-1 focus-visible:ring-purple-200"
        />
      </div>
    );
  }

  if (block.type === "image") {
    return (
      <div className="border border-gray-200 rounded p-2 bg-gray-50">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-500 font-medium">IMAGE</span>
          <Button onClick={onRemove} variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
        <div className="space-y-2">
          <Input
            value={block.caption || ""}
            onChange={(e) => onUpdate({ caption: e.target.value })}
            placeholder="Image caption"
            className="text-xs h-7"
          />
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      const base64 = e.target?.result as string;
                      onUpdate({ 
                        imageId: `img_${Date.now()}`,
                        data: base64.split(',')[1],
                        fileName: file.name
                      });
                    };
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }}
              variant="outline" 
              size="sm" 
              className="h-7 text-xs"
            >
              <Upload className="w-3 h-3 mr-1" />
              Upload
            </Button>
            <span className="text-xs text-gray-500">
              {block.imageId ? `✅ ${block.fileName || 'Image uploaded'}` : "No image"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (block.type === "table") {
    return (
      <div className="border border-gray-200 rounded p-2 bg-gray-50">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-500 font-medium">TABLE</span>
          <Button onClick={onRemove} variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
        <div className="space-y-2">
          <Input
            value={block.tableName || ""}
            onChange={(e) => onUpdate({ tableName: e.target.value })}
            placeholder="Table name"
            className="text-xs h-7"
          />
          <div className="text-xs text-gray-400">
            Will appear as "Table 1: {block.tableName || 'Table Name'}"
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      const base64 = e.target?.result as string;
                      onUpdate({ 
                        imageId: `table_${Date.now()}`,
                        data: base64.split(',')[1],
                        fileName: file.name
                      });
                    };
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }}
              variant="outline"
              size="sm"
              className="h-6 text-xs"
            >
              <Upload className="w-3 h-3 mr-1" />
              Upload Image
            </Button>
            {block.imageId && (
              <span className="text-xs text-green-600">✅ {block.fileName || 'Image uploaded'}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (block.type === "equation") {
    return (
      <div className="border border-gray-200 rounded p-2 bg-gray-50">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-500 font-medium">EQUATION</span>
          <Button onClick={onRemove} variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-gray-400">
            Enter LaTeX equation OR upload equation image:
          </div>
          <Input
            value={block.content || ""}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="LaTeX equation (e.g., E = mc^2 or \frac{a}{b})"
            className="text-xs h-7 font-mono"
          />
          <div className="text-xs text-gray-400 text-center">OR</div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      const base64 = e.target?.result as string;
                      onUpdate({ 
                        imageId: `eq_${Date.now()}`,
                        data: base64.split(',')[1],
                        fileName: file.name,
                        content: "" // Clear text when image is uploaded
                      });
                    };
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }}
              variant="outline"
              size="sm"
              className="h-6 text-xs"
            >
              <Upload className="w-3 h-3 mr-1" />
              Upload Equation Image
            </Button>
            {block.imageId && (
              <span className="text-xs text-green-600">✅ {block.fileName || 'Equation image uploaded'}</span>
            )}
          </div>
          <div className="text-xs text-gray-400">
            Will be numbered as (1), (2), etc.
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Subsection Component using proper schema structure
const SubsectionComponent = ({ 
  subsection, 
  sectionIndex,
  sectionId,
  allSubsections,
  onUpdateSubsection,
  onRemoveSubsection,
  onAddSubsection
}: {
  subsection: Subsection;
  sectionIndex: number;
  sectionId: string;
  allSubsections: Subsection[];
  onUpdateSubsection: (subsectionId: string, field: keyof Subsection, value: any) => void;
  onRemoveSubsection: (subsectionId: string) => void;
  onAddSubsection: (parentId: string, level: number) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const subsectionNumber = getSubsectionNumber(subsection, sectionIndex, allSubsections);
  const level = subsection.level || 1;
  const marginClass = level === 1 ? '' : level === 2 ? 'ml-4' : level === 3 ? 'ml-8' : level === 4 ? 'ml-12' : 'ml-16';
  
  // Get child subsections
  const childSubsections = allSubsections.filter(s => s.parentId === subsection.id);
  
  return (
    <div className={`border-l-2 border-gray-300 pl-3 ${marginClass}`}>
      <div className="bg-white border border-gray-200 rounded p-2 mb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </Button>
            <span className="text-xs font-medium text-gray-600">{subsectionNumber}</span>
          </div>
          <div className="flex gap-1">
            <Button 
              onClick={() => onAddSubsection(subsection.id, level + 1)} 
              variant="ghost" 
              size="sm" 
              className="h-5 w-5 p-0 text-blue-500"
            >
              <Plus className="w-3 h-3" />
            </Button>
            <Button 
              onClick={() => onRemoveSubsection(subsection.id)} 
              variant="ghost" 
              size="sm" 
              className="h-5 w-5 p-0 text-red-500"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        <Input
          value={subsection.title}
          onChange={(e) => onUpdateSubsection(subsection.id, "title", e.target.value)}
          placeholder="Subsection title"
          className="text-sm h-7 mb-2 font-medium"
        />
        
        {isExpanded && (
          <>
            <Textarea
              value={subsection.content}
              onChange={(e) => onUpdateSubsection(subsection.id, "content", e.target.value)}
              placeholder="Subsection content"
              className="text-sm min-h-[80px] resize-none border border-gray-200 p-2 focus-visible:ring-1 focus-visible:ring-purple-200"
            />
            
            {/* Child subsections */}
            {childSubsections.length > 0 && (
              <div className="mt-3 space-y-2">
                {childSubsections.map((childSub) => (
                  <SubsectionComponent
                    key={childSub.id}
                    subsection={childSub}
                    sectionIndex={sectionIndex}
                    sectionId={sectionId}
                    allSubsections={allSubsections}
                    onUpdateSubsection={onUpdateSubsection}
                    onRemoveSubsection={onRemoveSubsection}
                    onAddSubsection={onAddSubsection}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default function SectionForm({ sections, onUpdate }: SectionFormProps) {
  // Always keep all sections expanded - start with all sections expanded immediately
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    return new Set(sections.map(s => s.id));
  });
  
  // Ensure all sections are always expanded when sections change
  useEffect(() => {
    const allSectionIds = sections.map(s => s.id);
    setExpandedSections(new Set(allSectionIds));
  }, [sections]);

  const addSection = () => {
    const newSection: Section = {
      id: `section_${Date.now()}`,
      title: "",
      contentBlocks: [],
      subsections: [],
      order: sections.length
    };
    onUpdate([...sections, newSection]);
  };

  const removeSection = (sectionId: string) => {
    onUpdate(sections.filter(section => section.id !== sectionId));
  };

  const updateSection = (sectionId: string, field: keyof Section, value: any) => {
    onUpdate(sections.map(section => 
      section.id === sectionId ? { ...section, [field]: value } : section
    ));
  };

  const addContentBlock = (sectionId: string, type: "text" | "image" | "table" | "equation") => {
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      const newBlock: ContentBlockType = {
        id: `block_${Date.now()}`,
        type,
        content: type === "text" ? "" : undefined,
        tableName: type === "table" ? "Table Name" : undefined,
        order: section.contentBlocks.length
      };
      updateSection(sectionId, "contentBlocks", [...section.contentBlocks, newBlock]);
    }
  };

  const updateContentBlock = (sectionId: string, blockId: string, updates: Partial<ContentBlockType>) => {
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      updateSection(sectionId, "contentBlocks", 
        section.contentBlocks.map(block => 
          block.id === blockId ? { ...block, ...updates } : block
        )
      );
    }
  };

  const removeContentBlock = (sectionId: string, blockId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      updateSection(sectionId, "contentBlocks", 
        section.contentBlocks.filter(block => block.id !== blockId)
      );
    }
  };

  const addSubsection = (sectionId: string, parentId?: string, level: number = 1) => {
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      const newSubsection: Subsection = {
        id: `subsection_${Date.now()}`,
        title: "",
        content: "",
        order: section.subsections.length,
        level: level,
        parentId: parentId
      };
      updateSection(sectionId, "subsections", [...section.subsections, newSubsection]);
    }
  };

  const updateSubsection = (sectionId: string, subsectionId: string, field: keyof Subsection, value: any) => {
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      updateSection(sectionId, "subsections",
        section.subsections.map(sub => 
          sub.id === subsectionId ? { ...sub, [field]: value } : sub
        )
      );
    }
  };

  const removeSubsection = (sectionId: string, subsectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      // Also remove all child subsections
      const toRemove = new Set([subsectionId]);
      const findChildren = (parentId: string) => {
        section.subsections.forEach(sub => {
          if (sub.parentId === parentId) {
            toRemove.add(sub.id);
            findChildren(sub.id);
          }
        });
      };
      findChildren(subsectionId);
      
      updateSection(sectionId, "subsections", 
        section.subsections.filter(sub => !toRemove.has(sub.id))
      );
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    // Only expand sections, never collapse them once expanded
    if (!newExpanded.has(sectionId)) {
      newExpanded.add(sectionId);
      setExpandedSections(newExpanded);
    }
    // If already expanded, do nothing (stay expanded)
  };

  return (
    <div className="space-y-3">
      {/* Add Section Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700">Sections</h3>
        <Button onClick={addSection} size="sm" className="h-7 text-xs">
          <Plus className="w-3 h-3 mr-1" />
          Add Section
        </Button>
      </div>

      {sections.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No sections added yet.</p>
          <p className="text-xs">Click "Add Section" to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((section, index) => {
            const isExpanded = true; // Always show sections as expanded
            return (
              <div key={section.id} className="border border-gray-200 rounded bg-white">
                {/* Section Header */}
                <div className="p-3 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => toggleSection(section.id)}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </Button>
                      <span className="text-sm font-medium text-gray-700">{index + 1}.</span>
                    </div>
                    <Button onClick={() => removeSection(section.id)} variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <Input
                    value={section.title}
                    onChange={(e) => updateSection(section.id, "title", e.target.value)}
                    placeholder="Section Title"
                    className="text-sm h-8 font-medium"
                  />
                </div>

                {/* Section Content */}
                {isExpanded && (
                  <div className="p-3 space-y-3">
                    {/* Quick Add Buttons */}
                    <div className="flex gap-1 flex-wrap">
                      <Button onClick={() => addContentBlock(section.id, "text")} variant="outline" size="sm" className="h-6 text-xs">
                        <Type className="w-3 h-3 mr-1" />
                        Text
                      </Button>
                      <Button onClick={() => addContentBlock(section.id, "image")} variant="outline" size="sm" className="h-6 text-xs">
                        <ImageIcon className="w-3 h-3 mr-1" />
                        Image
                      </Button>
                      <Button onClick={() => addContentBlock(section.id, "table")} variant="outline" size="sm" className="h-6 text-xs">
                        <Table className="w-3 h-3 mr-1" />
                        Table
                      </Button>
                      <Button onClick={() => addContentBlock(section.id, "equation")} variant="outline" size="sm" className="h-6 text-xs">
                        <Calculator className="w-3 h-3 mr-1" />
                        Equation
                      </Button>
                      <Button onClick={() => addSubsection(section.id)} variant="outline" size="sm" className="h-6 text-xs">
                        <Plus className="w-3 h-3 mr-1" />
                        Subsection
                      </Button>
                    </div>

                    {/* Content Blocks */}
                    <div className="space-y-2">
                      {section.contentBlocks.map((block) => (
                        <CompactContentBlock
                          key={block.id}
                          block={block}
                          onUpdate={(updates) => updateContentBlock(section.id, block.id, updates)}
                          onRemove={() => removeContentBlock(section.id, block.id)}
                        />
                      ))}
                    </div>

                    {/* Subsections - Only show top-level ones (level 1 or no level) */}
                    {section.subsections.length > 0 && (
                      <div className="space-y-2">
                        {section.subsections
                          .filter(sub => !sub.level || sub.level === 1) // Only top-level subsections
                          .map((subsection) => (
                            <SubsectionComponent
                              key={subsection.id}
                              subsection={subsection}
                              sectionIndex={index}
                              sectionId={section.id}
                              allSubsections={section.subsections}
                              onUpdateSubsection={(subsectionId, field, value) => updateSubsection(section.id, subsectionId, field, value)}
                              onRemoveSubsection={(subsectionId) => removeSubsection(section.id, subsectionId)}
                              onAddSubsection={(parentId, level) => addSubsection(section.id, parentId, level)}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
