import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Plus, Trash2, Type, Image as ImageIcon } from "lucide-react";
import ContentBlock from "./content-block";
import type { Section, ContentBlock as ContentBlockType, Subsection } from "@shared/schema";

interface SectionFormProps {
  sections: Section[];
  onUpdate: (sections: Section[]) => void;
}

export default function SectionForm({ sections, onUpdate }: SectionFormProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

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

  const addContentBlock = (sectionId: string, type: "text" | "image") => {
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      const newBlock: ContentBlockType = {
        id: `block_${Date.now()}`,
        type,
        content: type === "text" ? "" : undefined,
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

  const addSubsection = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      const newSubsection: Subsection = {
        id: `subsection_${Date.now()}`,
        title: "",
        content: "",
        order: section.subsections.length
      };
      updateSection(sectionId, "subsections", [...section.subsections, newSubsection]);
    }
  };

  const updateSubsection = (sectionId: string, subsectionId: string, field: keyof Subsection, value: string) => {
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
      updateSection(sectionId, "subsections", 
        section.subsections.filter(sub => sub.id !== subsectionId)
      );
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Document Sections</CardTitle>
          <Button onClick={addSection} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Section
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sections.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No sections added yet. Click "Add Section" to get started.</p>
          </div>
        ) : (
          sections.map((section, index) => {
            const isExpanded = expandedSections.has(section.id);
            return (
              <Card key={section.id} className="bg-gray-50">
                <Collapsible open={isExpanded} onOpenChange={() => toggleSection(section.id)}>
                  <div className="bg-gray-100 px-4 py-3 rounded-t-lg flex justify-between items-center">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center space-x-2 cursor-pointer flex-1">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <h4 className="text-md font-medium text-gray-900">
                          {section.title || `Section ${index + 1}`}
                        </h4>
                      </div>
                    </CollapsibleTrigger>
                    <Button
                      onClick={() => removeSection(section.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <CollapsibleContent>
                    <CardContent className="p-4 space-y-4">
                      <div>
                        <Label>Section Title</Label>
                        <Input
                          value={section.title}
                          onChange={(e) => updateSection(section.id, "title", e.target.value)}
                          placeholder="Section Title"
                        />
                      </div>

                      {/* Content Blocks */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-medium text-gray-700">Content Blocks</span>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => addContentBlock(section.id, "text")}
                              variant="outline"
                              size="sm"
                            >
                              <Type className="w-4 h-4 mr-1" />
                              Add Text
                            </Button>
                            <Button
                              onClick={() => addContentBlock(section.id, "image")}
                              variant="outline"
                              size="sm"
                            >
                              <ImageIcon className="w-4 h-4 mr-1" />
                              Add Image
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          {section.contentBlocks.map((block) => (
                            <ContentBlock
                              key={block.id}
                              block={block}
                              onUpdate={(updates) => updateContentBlock(section.id, block.id, updates)}
                              onRemove={() => removeContentBlock(section.id, block.id)}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Subsections */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-medium text-gray-700">Subsections</span>
                          <Button
                            onClick={() => addSubsection(section.id)}
                            variant="outline"
                            size="sm"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Subsection
                          </Button>
                        </div>
                        
                        <div className="space-y-2 ml-4">
                          {section.subsections.map((subsection) => (
                            <Card key={subsection.id} className="bg-white">
                              <CardContent className="p-3">
                                <div className="flex justify-between items-center mb-2">
                                  <Input
                                    placeholder="Subsection title"
                                    value={subsection.title}
                                    onChange={(e) => updateSubsection(section.id, subsection.id, "title", e.target.value)}
                                    className="flex-1 mr-2"
                                  />
                                  <Button
                                    onClick={() => removeSubsection(section.id, subsection.id)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                                <Textarea
                                  rows={3}
                                  placeholder="Subsection content"
                                  value={subsection.content}
                                  onChange={(e) => updateSubsection(section.id, subsection.id, "content", e.target.value)}
                                />
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
