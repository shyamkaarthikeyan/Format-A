import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Type, Image as ImageIcon, Plus } from "lucide-react";
import FileUpload from "./file-upload";
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
            ) : (
              <>
                <ImageIcon className="w-3 h-3 mr-1" />
                IMAGE BLOCK
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
            <Textarea
              rows={4}
              placeholder="Enter text content"
              value={block.content || ""}
              onChange={(e) => onUpdate({ content: e.target.value })}
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
                      size: "very-small" // Set default size to very-small
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
                      value={block.size || "very-small"}
                      onChange={(e) => onUpdate({ size: e.target.value as any })}
                    >
                      <option value="very-small">Very Small (1.2")</option>
                      <option value="small">Small (1.8")</option>
                      <option value="medium">Medium (2.5")</option>
                      <option value="large">Large (3.2")</option>
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
        ) : (
          <div className="space-y-2">
            <FileUpload
              onFileSelect={(file, base64) => {
                // Store both imageId and data for backend compatibility
                onUpdate({ 
                  type: "image", // Ensure type is explicitly set
                  imageId: `img_${Date.now()}`,
                  data: base64.split(',')[1], // Remove data:image/png;base64, prefix
                  fileName: file.name
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
            />
            {block.imageId && (
              <>
                <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                  ✅ Image uploaded: {block.fileName || 'Uploaded Image'}
                </div>
                <Textarea
                  rows={2}
                  placeholder="Figure caption"
                  value={block.caption || ""}
                  onChange={(e) => onUpdate({ caption: e.target.value })}
                />
                <select
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  value={block.size || "very-small"}
                  onChange={(e) => onUpdate({ size: e.target.value as any })}
                >
                  <option value="very-small">Very Small (1.2")</option>
                  <option value="small">Small (1.8")</option>
                  <option value="medium">Medium (2.5")</option>
                  <option value="large">Large (3.2")</option>
                </select>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
