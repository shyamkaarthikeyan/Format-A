import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Type, Image as ImageIcon } from "lucide-react";
import FileUpload from "./file-upload";
import type { ContentBlock as ContentBlockType } from "@shared/schema";

interface ContentBlockProps {
  block: ContentBlockType;
  onUpdate: (updates: Partial<ContentBlockType>) => void;
  onRemove: () => void;
}

export default function ContentBlock({ block, onUpdate, onRemove }: ContentBlockProps) {
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
          </div>
        ) : (
          <div className="space-y-2">
            <FileUpload
              onFileSelect={(file, base64) => {
                // In a real implementation, this would upload to the server
                onUpdate({ 
                  imageId: `img_${Date.now()}`,
                  content: base64 
                });
              }}
              accept="image/*"
              maxSize={10 * 1024 * 1024} // 10MB
            />
            {block.imageId && (
              <>
                <Textarea
                  rows={2}
                  placeholder="Figure caption"
                  value={block.caption || ""}
                  onChange={(e) => onUpdate({ caption: e.target.value })}
                />
                <select
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  value={block.size || "medium"}
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
