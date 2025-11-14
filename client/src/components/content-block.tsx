import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Type, Image as ImageIcon, Plus, Table, Calculator } from "lucide-react";
import FileUpload from "./file-upload";
import RichTextEditor from "./rich-text-editor";
import TableBlockEditor from "./table-block-editor";
import type { ContentBlock as ContentBlockType } from "@shared/schema";
import { useState } from "react";

interface ContentBlockProps {
  block: ContentBlockType;
  onUpdate: (updates: Partial<ContentBlockType>) => void;
  onRemove: () => void;
}

export default function ContentBlock({ block, onUpdate, onRemove }: ContentBlockProps) {
  const [showImageSection, setShowImageSection] = useState(true);

  return (
    <Card className="bg-white border border-gray-200">
      <CardContent className="p-3">
        <div className="flex justify-between items-start mb-2">
          <Badge variant="secondary" className="text-xs">
            {block.type === "text" ? (
              <>
                <Type className="w-3 h-3 mr-1" />
                TEXT BLOCK
              </>
            ) : block.type === "image" ? (
              <>
                <ImageIcon className="w-3 h-3 mr-1" />
                IMAGE BLOCK
              </>
            ) : block.type === "table" ? (
              <>
                <Table className="w-3 h-3 mr-1" />
                TABLE BLOCK
              </>
            ) : (
              <>
                <Calculator className="w-3 h-3 mr-1" />
                EQUATION BLOCK
              </>
            )}
          </Badge>
          <Button
            onClick={onRemove}
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {block.type === "text" ? (
          <div className="space-y-3">
            <RichTextEditor
              rows={4}
              placeholder="Enter text content"
              value={block.content || ""}
              onChange={(content) => onUpdate({ content })}
            />
            
            {showImageSection ? (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Add Image to This Text Block (Optional)
                  </label>
                  <Button
                    onClick={() => {
                      // Hide the entire image section and clear any image data
                      setShowImageSection(false);
                      onUpdate({ 
                        imageId: undefined,
                        data: undefined,
                        fileName: undefined,
                        caption: undefined,
                        size: undefined
                      });
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-800 h-6 w-6 p-0"
                    title="Remove image section from this text block"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <FileUpload
                  onFileSelect={(file, base64) => {
                    // Store both imageId and data for backend compatibility
                    onUpdate({ 
                      imageId: `img_${Date.now()}`,
                      data: base64.split(',')[1], // Remove data:image/png;base64, prefix
                      fileName: file.name,
                      content: block.content || "",
                      caption: block.caption || "",
                      size: "medium" // Set default size to medium
                    });
                  }}
                  onClear={() => {
                    // Clear all image-related data completely
                    onUpdate({ 
                      imageId: undefined,
                      data: undefined,
                      fileName: undefined,
                      caption: undefined,
                      size: undefined
                    });
                  }}
                  accept="image/*"
                  maxSize={10 * 1024 * 1024}
                  currentFile={block.imageId ? { 
                    name: block.fileName || 'Uploaded Image',
                    preview: block.data ? `data:image/png;base64,${block.data}` : undefined 
                  } : undefined}
                />
                {block.imageId && (
                  <div className="mt-2">
                    <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800 flex justify-between items-center">
                      <span>✅ Image uploaded: {block.fileName || 'Uploaded Image'}</span>
                      <Button
                        onClick={() => {
                          // Remove only the image data, keep the text content
                          onUpdate({ 
                            imageId: undefined,
                            data: undefined,
                            fileName: undefined,
                            caption: undefined,
                            size: undefined
                          });
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-800 h-6 w-6 p-0"
                        title="Remove image from this text block"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <Textarea
                      rows={2}
                      placeholder="Image caption"
                      value={block.caption || ""}
                      onChange={(e) => onUpdate({ caption: e.target.value })}
                      className="mb-2"
                    />
                    <select
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      value={block.size || "medium"}
                      onChange={(e) => onUpdate({ size: e.target.value as any })}
                    >
                      <option value="extra-small">Extra Small (1.0")</option>
                      <option value="small">Small (1.5")</option>
                      <option value="medium">Medium (2.0")</option>
                      <option value="large">Large (2.5")</option>
                      <option value="extra-large">Extra Large (3.0")</option>
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-3">
                <Button
                  onClick={() => setShowImageSection(true)}
                  variant="outline"
                  size="sm"
                  className="text-gray-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Image Section
                </Button>
              </div>
            )}
          </div>
        ) : block.type === "image" ? (
          <div className="space-y-1.5">
            <div className="text-xs text-gray-600 mb-1">Upload Image</div>
            <FileUpload
              onFileSelect={(file, base64) => {
                // Store both imageId and data for backend compatibility
                onUpdate({ 
                  type: "image", // Ensure type is explicitly set
                  imageId: `img_${Date.now()}`,
                  data: base64.split(',')[1], // Remove data:image/png;base64, prefix
                  fileName: file.name,
                  caption: block.caption || "", // REQUIRED: Backend needs caption to render image
                  size: block.size || "medium" // Set default size
                });
              }}
              onClear={() => {
                // Clear all image-related data completely
                onUpdate({ 
                  imageId: undefined,
                  data: undefined,
                  fileName: undefined,
                  caption: undefined,
                  size: undefined
                });
              }}
              accept="image/*"
              maxSize={10 * 1024 * 1024} // 10MB
              currentFile={block.imageId ? { 
                name: block.fileName || 'Uploaded Image',
                preview: block.data ? `data:image/png;base64,${block.data}` : undefined 
              } : undefined}
              compact={true}
            />
            {block.imageId && (
              <>
                <div className="p-1.5 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                  ✅ {block.fileName || 'Image uploaded'}
                </div>
                <Input
                  placeholder="Caption"
                  value={block.caption || ""}
                  onChange={(e) => onUpdate({ caption: e.target.value })}
                  className="text-sm h-8"
                />
                <select
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs h-8"
                  value={block.size || "medium"}
                  onChange={(e) => onUpdate({ size: e.target.value as any })}
                >
                  <option value="extra-small">Extra Small (1.0")</option>
                  <option value="small">Small (1.5")</option>
                  <option value="medium">Medium (2.0")</option>
                  <option value="large">Large (2.5")</option>
                  <option value="extra-large">Extra Large (3.0")</option>
                </select>
              </>
            )}
          </div>
        ) : block.type === "table" ? (
          <TableBlockEditor block={block} onUpdate={onUpdate} />
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Equation Content (LaTeX Format)
              </label>
              <div className="text-xs text-gray-500 mb-2">
                You can copy and paste equations from any source. Common LaTeX symbols: \frac{`{a}`}{`{b}`}, \sqrt{`{x}`}, \sum, \int, \alpha, \beta, etc.
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => onUpdate({ content: (block.content || "") + "\\frac{1}{2}" })}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Add Fraction
                </Button>
                <Button
                  onClick={() => onUpdate({ content: (block.content || "") + "\\sqrt{x}" })}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Add Square Root
                </Button>
                <Button
                  onClick={() => onUpdate({ content: (block.content || "") + "\\sum_{i=1}^{n}" })}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Add Summation
                </Button>
                <Button
                  onClick={() => onUpdate({ content: (block.content || "") + "\\int_{a}^{b}" })}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Add Integral
                </Button>
              </div>
              <Textarea
                rows={4}
                placeholder="Paste or type your equation here (LaTeX format). Example: E = mc^2 or \frac{-b \pm \sqrt{b^2-4ac}}{2a}"
                value={block.content || ""}
                onChange={(e) => {
                  // Preserve the original content without any transformations
                  const rawContent = e.target.value;
                  onUpdate({ content: rawContent });
                }}
                className="font-mono text-sm"
                style={{ fontFamily: 'monospace' }}
              />
              <div className="text-xs text-gray-500">
                Will be numbered as ({block.equationNumber || 0}). Supports standard LaTeX syntax.
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Or Upload Equation Image
              </label>
              <FileUpload
                onFileSelect={(file, base64) => {
                  onUpdate({ 
                    imageId: `eq_${Date.now()}`,
                    data: base64.split(',')[1],
                    fileName: file.name
                  });
                }}
                onClear={() => {
                  onUpdate({ 
                    imageId: undefined,
                    data: undefined,
                    fileName: undefined
                  });
                }}
                accept="image/*"
                maxSize={10 * 1024 * 1024}
                currentFile={block.imageId ? { 
                  name: block.fileName || 'Equation Image',
                  preview: block.data ? `data:image/png;base64,${block.data}` : undefined 
                } : undefined}
              />
              {block.imageId && (
                <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                  ✅ Equation image uploaded: {block.fileName || 'Equation Image'}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
