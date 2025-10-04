import React, { useState, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  GripVertical, 
  Type, 
  Image as ImageIcon, 
  Table, 
  Calculator, 
  Trash2, 
  Copy, 
  Edit3,
  Upload,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import SmartTextarea from '@/components/ui/smart-textarea';
import { getContextualSuggestions } from '@/lib/academic-suggestions';
import type { ContentBlock } from '@shared/schema';

interface ContentBlockEditorProps {
  block: ContentBlock;
  index: number;
  onUpdate: (updates: Partial<ContentBlock>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  className?: string;
}

const getBlockIcon = (type: ContentBlock['type']) => {
  switch (type) {
    case 'text':
      return <Type className="w-4 h-4" />;
    case 'image':
      return <ImageIcon className="w-4 h-4" />;
    case 'table':
      return <Table className="w-4 h-4" />;
    case 'equation':
      return <Calculator className="w-4 h-4" />;
  }
};

const getBlockTypeLabel = (type: ContentBlock['type']) => {
  switch (type) {
    case 'text':
      return 'Text Block';
    case 'image':
      return 'Image';
    case 'table':
      return 'Table';
    case 'equation':
      return 'Equation';
  }
};

const getBlockColor = (type: ContentBlock['type']) => {
  switch (type) {
    case 'text':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'image':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'table':
      return 'text-purple-600 bg-purple-50 border-purple-200';
    case 'equation':
      return 'text-orange-600 bg-orange-50 border-orange-200';
  }
};

export default function ContentBlockEditor({
  block,
  index,
  onUpdate,
  onDelete,
  onDuplicate,
  className,
}: ContentBlockEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.id,
    data: {
      type: 'content-block',
      block,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onUpdate({
        data: result,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const renderContentEditor = () => {
    switch (block.type) {
      case 'text':
        return (
          <div className="space-y-3">
            <SmartTextarea
              value={block.content || ''}
              onChange={(e) => onUpdate({ content: e.target.value })}
              placeholder="Enter your text content here..."
              className="border-blue-200 focus:border-blue-400 focus:ring-blue-200"
              autoExpand={true}
              minHeight={120}
              maxHeight={400}
              suggestions={getContextualSuggestions('text')}
              showWordCount={true}
              showCharCount={true}
            />
          </div>
        );

      case 'image':
        return (
          <div className="space-y-3">
            <div className="border-2 border-dashed border-green-200 rounded-lg p-6 text-center">
              {block.data ? (
                <div className="space-y-3">
                  <img
                    src={block.data}
                    alt={block.caption || 'Uploaded image'}
                    className="max-w-full h-32 object-contain mx-auto rounded"
                  />
                  <p className="text-sm text-green-600">✓ {block.fileName}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <ImageIcon className="w-12 h-12 text-green-400 mx-auto" />
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Upload an image</p>
                    <EnhancedButton
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Choose File
                    </EnhancedButton>
                  </div>
                </div>
              )}
            </div>
            
            <Input
              value={block.caption || ''}
              onChange={(e) => onUpdate({ caption: e.target.value })}
              placeholder="Image caption..."
              className="border-green-200 focus:border-green-400 focus:ring-green-200"
            />
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        );

      case 'table':
        return (
          <div className="space-y-3">
            <Input
              value={block.tableName || ''}
              onChange={(e) => onUpdate({ tableName: e.target.value })}
              placeholder="Table name..."
              className="border-purple-200 focus:border-purple-400 focus:ring-purple-200"
            />
            
            <div className="border-2 border-dashed border-purple-200 rounded-lg p-6 text-center">
              <Table className="w-12 h-12 text-purple-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-2">Table editor coming soon</p>
              <p className="text-xs text-gray-500">Advanced table editing will be available in the next update</p>
            </div>
          </div>
        );

      case 'equation':
        return (
          <div className="space-y-3">
            <Input
              value={block.content || ''}
              onChange={(e) => onUpdate({ content: e.target.value })}
              placeholder="LaTeX equation (e.g., E = mc^2)"
              className="font-mono border-orange-200 focus:border-orange-400 focus:ring-orange-200"
            />
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">Preview</span>
              </div>
              <div className="text-center py-2 font-mono text-lg">
                {block.content || 'Enter equation above'}
              </div>
              <p className="text-xs text-orange-600 mt-2">
                LaTeX rendering will be available in the preview
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative transition-all duration-200',
        isDragging && 'opacity-50 scale-105 z-50',
        className
      )}
    >
      <EnhancedCard
        variant={isDragging ? 'elevated' : 'default'}
        padding="none"
        className={cn(
          'overflow-hidden transition-all duration-200',
          isDragging && 'shadow-2xl',
          getBlockColor(block.type).split(' ')[2] // Get border color
        )}
      >
        {/* Block Header */}
        <div className={cn(
          'flex items-center gap-3 p-3 border-b',
          getBlockColor(block.type)
        )}>
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Block Type Icon */}
          <div className="flex items-center gap-2">
            {getBlockIcon(block.type)}
            <span className="text-sm font-medium">
              {getBlockTypeLabel(block.type)}
            </span>
          </div>

          {/* Block Index */}
          <span className="text-xs bg-white/50 px-2 py-1 rounded">
            {index + 1}
          </span>

          <div className="flex-1" />

          {/* Action Buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <EnhancedButton
              variant="ghost"
              size="xs"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </EnhancedButton>

            <EnhancedButton
              variant="ghost"
              size="xs"
              onClick={onDuplicate}
              className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
              title="Duplicate block"
            >
              <Copy className="w-3 h-3" />
            </EnhancedButton>

            <EnhancedButton
              variant="ghost"
              size="xs"
              onClick={onDelete}
              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
              title="Delete block"
            >
              <Trash2 className="w-3 h-3" />
            </EnhancedButton>
          </div>
        </div>

        {/* Block Content */}
        {isExpanded && (
          <div className="p-4">
            {renderContentEditor()}
          </div>
        )}

        {/* Drag Overlay Indicator */}
        {isDragging && (
          <div className="absolute inset-0 bg-blue-500/10 border-2 border-blue-500 border-dashed rounded-lg pointer-events-none" />
        )}
      </EnhancedCard>
    </div>
  );
}