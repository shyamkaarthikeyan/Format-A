import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Type, Image as ImageIcon, Plus, Table, Calculator } from "lucide-react";
import FileUpload from "./file-upload";
import RichTextEditor from "./rich-text-editor";
import TableBlockEditor from "./table-block-editor";
import LaTeXEquationEditor from "./latex-equation-editor";
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
      <CardContent className="p-2">
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
          <div className="space-y-2">
            <RichTextEditor
              rows={15}
              placeholder="Enter text content"
              value={block.content || ""}
              onChange={(content) => onUpdate({ content })}
            />
            
            {showImageSection ? (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-medium text-gray-600">
                    Add Image (Optional)
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
                    className="text-red-600 hover:text-red-800 h-5 w-5 p-0"
                    title="Remove image section"
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
                  compact={true}
                />
                {block.imageId && (
                  <div className="mt-1.5 space-y-1.5">
                    <div className="p-1.5 bg-green-50 border border-green-200 rounded text-xs text-green-800 flex justify-between items-center">
                      <span>✅ {block.fileName || 'Image uploaded'}</span>
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
                        className="text-red-600 hover:text-red-800 h-5 w-5 p-0"
                        title="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Caption"
                      value={block.caption || ""}
                      onChange={(e) => onUpdate({ caption: e.target.value })}
                      className="text-xs h-7"
                    />
                    <select
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs h-7"
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
            ) : null}
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
          <div className="space-y-2">
            <LaTeXEquationEditor
              value={block.content || ""}
              onChange={(content) => onUpdate({ content })}
              equationNumber={block.equationNumber}
            />
            
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-600">
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
                compact={true}
              />
              {block.imageId && (
                <div className="p-1.5 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                  ✅ {block.fileName || 'Equation image uploaded'}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
