import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Plus,
  User,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { EnhancedCard } from '@/components/ui/enhanced-card';

export interface Annotation {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content: string;
  author: string;
  timestamp: Date;
  type: 'comment' | 'highlight' | 'edit';
  resolved?: boolean;
}

interface AnnotationSystemProps {
  annotations: Annotation[];
  onAddAnnotation: (annotation: Omit<Annotation, 'id' | 'timestamp'>) => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  enabled: boolean;
  className?: string;
  children: React.ReactNode;
}

export default function AnnotationSystem({
  annotations,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  enabled,
  className,
  children
}: AnnotationSystemProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newAnnotation, setNewAnnotation] = useState<{
    x: number;
    y: number;
    type: Annotation['type'];
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (!enabled || isCreating) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setNewAnnotation({ x, y, type: 'comment' });
    setIsCreating(true);
    setSelectedId(null);
  }, [enabled, isCreating]);

  const handleCreateAnnotation = useCallback((content: string, type: Annotation['type']) => {
    if (!newAnnotation) return;

    onAddAnnotation({
      x: newAnnotation.x,
      y: newAnnotation.y,
      content,
      author: 'Current User', // This would come from auth context
      type,
      resolved: false
    });

    setNewAnnotation(null);
    setIsCreating(false);
  }, [newAnnotation, onAddAnnotation]);

  const handleCancelCreate = useCallback(() => {
    setNewAnnotation(null);
    setIsCreating(false);
  }, []);

  const handleAnnotationClick = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(selectedId === id ? null : id);
  }, [selectedId]);

  const handleEditAnnotation = useCallback((id: string) => {
    setEditingId(id);
    setSelectedId(null);
  }, []);

  const handleSaveEdit = useCallback((id: string, content: string) => {
    onUpdateAnnotation(id, { content });
    setEditingId(null);
  }, [onUpdateAnnotation]);

  const handleToggleResolved = useCallback((id: string, resolved: boolean) => {
    onUpdateAnnotation(id, { resolved });
  }, [onUpdateAnnotation]);

  // Close annotation when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setSelectedId(null);
        setEditingId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full',
        enabled && 'cursor-crosshair',
        className
      )}
      onClick={handleContainerClick}
    >
      {children}

      {/* Existing Annotations */}
      {annotations.map(annotation => (
        <AnnotationMarker
          key={annotation.id}
          annotation={annotation}
          isSelected={selectedId === annotation.id}
          isEditing={editingId === annotation.id}
          onClick={(e) => handleAnnotationClick(e, annotation.id)}
          onEdit={() => handleEditAnnotation(annotation.id)}
          onSave={(content) => handleSaveEdit(annotation.id, content)}
          onDelete={() => onDeleteAnnotation(annotation.id)}
          onToggleResolved={(resolved) => handleToggleResolved(annotation.id, resolved)}
        />
      ))}

      {/* New Annotation Creator */}
      {newAnnotation && isCreating && (
        <AnnotationCreator
          x={newAnnotation.x}
          y={newAnnotation.y}
          onSave={handleCreateAnnotation}
          onCancel={handleCancelCreate}
        />
      )}

      {/* Annotation Panel */}
      {enabled && annotations.length > 0 && (
        <AnnotationPanel
          annotations={annotations}
          selectedId={selectedId}
          onSelectAnnotation={setSelectedId}
          onEditAnnotation={handleEditAnnotation}
          onDeleteAnnotation={onDeleteAnnotation}
          onToggleResolved={handleToggleResolved}
        />
      )}
    </div>
  );
}

interface AnnotationMarkerProps {
  annotation: Annotation;
  isSelected: boolean;
  isEditing: boolean;
  onClick: (e: React.MouseEvent) => void;
  onEdit: () => void;
  onSave: (content: string) => void;
  onDelete: () => void;
  onToggleResolved: (resolved: boolean) => void;
}

function AnnotationMarker({
  annotation,
  isSelected,
  isEditing,
  onClick,
  onEdit,
  onSave,
  onDelete,
  onToggleResolved
}: AnnotationMarkerProps) {
  const [editContent, setEditContent] = useState(annotation.content);

  const getMarkerIcon = () => {
    switch (annotation.type) {
      case 'comment':
        return MessageSquare;
      case 'edit':
        return Edit3;
      case 'highlight':
        return MessageSquare;
      default:
        return MessageSquare;
    }
  };

  const getMarkerColor = () => {
    if (annotation.resolved) return 'bg-green-500';
    switch (annotation.type) {
      case 'comment':
        return 'bg-blue-500';
      case 'edit':
        return 'bg-orange-500';
      case 'highlight':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  const Icon = getMarkerIcon();

  return (
    <>
      {/* Annotation Marker */}
      <div
        className={cn(
          'absolute w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transform -translate-x-1/2 -translate-y-1/2 z-10',
          getMarkerColor(),
          isSelected && 'ring-2 ring-white ring-offset-2',
          annotation.resolved && 'opacity-60'
        )}
        style={{
          left: `${annotation.x}%`,
          top: `${annotation.y}%`
        }}
        onClick={onClick}
      >
        <Icon className="w-3 h-3 text-white" />
      </div>

      {/* Annotation Popup */}
      {isSelected && (
        <EnhancedCard
          className={cn(
            'absolute z-20 w-64 p-3 shadow-lg',
            annotation.x > 50 ? 'right-0' : 'left-0'
          )}
          style={{
            left: annotation.x > 50 ? 'auto' : `${annotation.x}%`,
            right: annotation.x > 50 ? `${100 - annotation.x}%` : 'auto',
            top: `${Math.max(0, annotation.y - 10)}%`
          }}
        >
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">{annotation.author}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                {annotation.timestamp.toLocaleDateString()}
              </div>
            </div>

            {/* Content */}
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-2 text-sm border border-gray-300 rounded resize-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-1">
                  <EnhancedButton
                    size="sm"
                    onClick={() => onSave(editContent)}
                    className="h-7"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Save
                  </EnhancedButton>
                  <EnhancedButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditContent(annotation.content)}
                    className="h-7"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Cancel
                  </EnhancedButton>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-700">{annotation.content}</p>
                <div className="flex items-center gap-1">
                  <EnhancedButton
                    variant="ghost"
                    size="sm"
                    onClick={onEdit}
                    className="h-7"
                  >
                    <Edit3 className="w-3 h-3 mr-1" />
                    Edit
                  </EnhancedButton>
                  <EnhancedButton
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleResolved(!annotation.resolved)}
                    className="h-7"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    {annotation.resolved ? 'Unresolve' : 'Resolve'}
                  </EnhancedButton>
                  <EnhancedButton
                    variant="ghost"
                    size="sm"
                    onClick={onDelete}
                    className="h-7 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </EnhancedButton>
                </div>
              </div>
            )}
          </div>
        </EnhancedCard>
      )}
    </>
  );
}

interface AnnotationCreatorProps {
  x: number;
  y: number;
  onSave: (content: string, type: Annotation['type']) => void;
  onCancel: () => void;
}

function AnnotationCreator({ x, y, onSave, onCancel }: AnnotationCreatorProps) {
  const [content, setContent] = useState('');
  const [type, setType] = useState<Annotation['type']>('comment');

  const handleSave = () => {
    if (content.trim()) {
      onSave(content.trim(), type);
    }
  };

  return (
    <EnhancedCard
      className={cn(
        'absolute z-20 w-64 p-3 shadow-lg',
        x > 50 ? 'right-0' : 'left-0'
      )}
      style={{
        left: x > 50 ? 'auto' : `${x}%`,
        right: x > 50 ? `${100 - x}%` : 'auto',
        top: `${Math.max(0, y - 10)}%`
      }}
    >
      <div className="space-y-3">
        <div className="flex gap-1">
          {(['comment', 'edit', 'highlight'] as const).map(annotationType => (
            <EnhancedButton
              key={annotationType}
              variant={type === annotationType ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setType(annotationType)}
              className="h-7 capitalize"
            >
              {annotationType}
            </EnhancedButton>
          ))}
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add your comment..."
          className="w-full p-2 text-sm border border-gray-300 rounded resize-none"
          rows={3}
          autoFocus
        />

        <div className="flex gap-1">
          <EnhancedButton
            size="sm"
            onClick={handleSave}
            disabled={!content.trim()}
            className="h-7"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add
          </EnhancedButton>
          <EnhancedButton
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-7"
          >
            <X className="w-3 h-3 mr-1" />
            Cancel
          </EnhancedButton>
        </div>
      </div>
    </EnhancedCard>
  );
}

interface AnnotationPanelProps {
  annotations: Annotation[];
  selectedId: string | null;
  onSelectAnnotation: (id: string) => void;
  onEditAnnotation: (id: string) => void;
  onDeleteAnnotation: (id: string) => void;
  onToggleResolved: (id: string, resolved: boolean) => void;
}

function AnnotationPanel({
  annotations,
  selectedId,
  onSelectAnnotation,
  onEditAnnotation,
  onDeleteAnnotation,
  onToggleResolved
}: AnnotationPanelProps) {
  const unresolvedCount = annotations.filter(a => !a.resolved).length;

  return (
    <EnhancedCard className="absolute top-4 right-4 w-72 max-h-96 overflow-hidden z-30 shadow-lg">
      <div className="p-3 border-b border-gray-200">
        <h3 className="font-medium text-sm">
          Annotations ({unresolvedCount} unresolved)
        </h3>
      </div>
      
      <div className="max-h-80 overflow-y-auto">
        {annotations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No annotations yet
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {annotations.map(annotation => (
              <div
                key={annotation.id}
                className={cn(
                  'p-3 cursor-pointer hover:bg-gray-50 transition-colors',
                  selectedId === annotation.id && 'bg-blue-50',
                  annotation.resolved && 'opacity-60'
                )}
                onClick={() => onSelectAnnotation(annotation.id)}
              >
                <div className="flex items-start gap-2">
                  <div className={cn(
                    'w-4 h-4 rounded-full flex-shrink-0 mt-0.5',
                    annotation.resolved ? 'bg-green-500' : 'bg-blue-500'
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-900">
                        {annotation.author}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">
                        {annotation.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {annotation.content}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditAnnotation(annotation.id);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleResolved(annotation.id, !annotation.resolved);
                        }}
                        className="text-xs text-green-600 hover:text-green-700"
                      >
                        {annotation.resolved ? 'Unresolve' : 'Resolve'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteAnnotation(annotation.id);
                        }}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </EnhancedCard>
  );
}