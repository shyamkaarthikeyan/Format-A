import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
  restrictToWindowEdges,
} from '@dnd-kit/modifiers';
import { 
  Plus, 
  Users, 
  Upload, 
  Download, 
  Search, 
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  List,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AuthorCard from './author-card';
import AuthorEditDialog from './author-edit-dialog';
import AuthorImportDialog from './author-import-dialog';
import type { Author } from '@shared/schema';

interface VisualAuthorManagerProps {
  authors: Author[];
  onUpdate: (authors: Author[]) => void;
  className?: string;
}

type ViewMode = 'list' | 'grid';
type SortMode = 'order' | 'name' | 'organization';
type SortDirection = 'asc' | 'desc';

export function VisualAuthorManager({ 
  authors, 
  onUpdate, 
  className 
}: VisualAuthorManagerProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expandedAuthors, setExpandedAuthors] = useState<Set<string>>(new Set());
  const [editingAuthor, setEditingAuthor] = useState<Author | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortMode, setSortMode] = useState<SortMode>('order');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter and sort authors
  const filteredAndSortedAuthors = React.useMemo(() => {
    let filtered = authors.filter(author => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        author.name.toLowerCase().includes(query) ||
        author.organization?.toLowerCase().includes(query) ||
        author.department?.toLowerCase().includes(query) ||
        author.email?.toLowerCase().includes(query)
      );
    });

    // Sort authors
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortMode) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'organization':
          comparison = (a.organization || '').localeCompare(b.organization || '');
          break;
        case 'order':
        default:
          comparison = authors.indexOf(a) - authors.indexOf(b);
          break;
      }
      
      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [authors, searchQuery, sortMode, sortDirection]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = authors.findIndex(author => author.id === active.id);
      const newIndex = authors.findIndex(author => author.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        onUpdate(arrayMove(authors, oldIndex, newIndex));
      }
    }

    setActiveId(null);
  }, [authors, onUpdate]);

  const addAuthor = useCallback(() => {
    const newAuthor: Author = {
      id: `author_${Date.now()}`,
      name: '',
      customFields: [],
    };
    onUpdate([...authors, newAuthor]);
    setEditingAuthor(newAuthor);
  }, [authors, onUpdate]);

  const duplicateAuthor = useCallback((authorId: string) => {
    const author = authors.find(a => a.id === authorId);
    if (!author) return;

    const duplicatedAuthor: Author = {
      ...author,
      id: `author_${Date.now()}`,
      name: `${author.name} (Copy)`,
    };

    onUpdate([...authors, duplicatedAuthor]);
  }, [authors, onUpdate]);

  const deleteAuthor = useCallback((authorId: string) => {
    onUpdate(authors.filter(author => author.id !== authorId));
    setExpandedAuthors(prev => {
      const next = new Set(prev);
      next.delete(authorId);
      return next;
    });
  }, [authors, onUpdate]);

  const updateAuthor = useCallback((authorId: string, updates: Partial<Author>) => {
    onUpdate(
      authors.map(author =>
        author.id === authorId ? { ...author, ...updates } : author
      )
    );
  }, [authors, onUpdate]);

  const toggleExpanded = useCallback((authorId: string) => {
    setExpandedAuthors(prev => {
      const next = new Set(prev);
      if (next.has(authorId)) {
        next.delete(authorId);
      } else {
        next.add(authorId);
      }
      return next;
    });
  }, []);

  const handleSort = useCallback((mode: SortMode) => {
    if (sortMode === mode) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortMode(mode);
      setSortDirection('asc');
    }
  }, [sortMode]);

  const exportAuthors = useCallback(() => {
    const dataStr = JSON.stringify(authors, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'authors.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [authors]);

  const activeAuthor = activeId ? authors.find(author => author.id === activeId) : null;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Authors</h2>
          </div>
          <Badge variant="secondary" className="text-xs">
            {authors.length} {authors.length === 1 ? 'author' : 'authors'}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <EnhancedButton
            variant="outline"
            size="sm"
            onClick={() => setShowImportDialog(true)}
            className="text-xs"
          >
            <Upload className="w-3 h-3 mr-1" />
            Import
          </EnhancedButton>
          
          {authors.length > 0 && (
            <EnhancedButton
              variant="outline"
              size="sm"
              onClick={exportAuthors}
              className="text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              Export
            </EnhancedButton>
          )}
          
          <EnhancedButton
            onClick={addAuthor}
            size="sm"
            className="text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Author
          </EnhancedButton>
        </div>
      </div>

      {/* Controls */}
      {authors.length > 0 && (
        <EnhancedCard variant="glass" className="p-4">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search authors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
              </div>
            </div>

            {/* Sort Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <EnhancedButton variant="outline" size="sm" className="text-xs">
                  {sortDirection === 'asc' ? <SortAsc className="w-3 h-3 mr-1" /> : <SortDesc className="w-3 h-3 mr-1" />}
                  Sort
                </EnhancedButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleSort('order')}>
                  Order {sortMode === 'order' && (sortDirection === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('name')}>
                  Name {sortMode === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort('organization')}>
                  Organization {sortMode === 'organization' && (sortDirection === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-md">
              <EnhancedButton
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="xs"
                onClick={() => setViewMode('list')}
                className="rounded-r-none border-r"
              >
                <List className="w-3 h-3" />
              </EnhancedButton>
              <EnhancedButton
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="xs"
                onClick={() => setViewMode('grid')}
                className="rounded-l-none"
              >
                <Grid className="w-3 h-3" />
              </EnhancedButton>
            </div>

            {/* More Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <EnhancedButton variant="outline" size="sm" className="text-xs">
                  <MoreHorizontal className="w-3 h-3" />
                </EnhancedButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setExpandedAuthors(new Set(authors.map(a => a.id)))}>
                  Expand All
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setExpandedAuthors(new Set())}>
                  Collapse All
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowImportDialog(true)}>
                  Import Authors
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportAuthors}>
                  Export Authors
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </EnhancedCard>
      )}

      {/* Authors List */}
      {filteredAndSortedAuthors.length === 0 ? (
        <EnhancedCard variant="glass" className="p-12 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-100 to-violet-100 rounded-full flex items-center justify-center">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">
                {searchQuery ? 'No authors found' : 'No authors added'}
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {searchQuery 
                  ? `No authors match "${searchQuery}". Try adjusting your search.`
                  : 'Add authors to your document to get started.'
                }
              </p>
              {!searchQuery && (
                <div className="flex items-center justify-center gap-2">
                  <EnhancedButton onClick={addAuthor} size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add First Author
                  </EnhancedButton>
                  <EnhancedButton 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowImportDialog(true)}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Import Authors
                  </EnhancedButton>
                </div>
              )}
            </div>
          </div>
        </EnhancedCard>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
        >
          <SortableContext
            items={filteredAndSortedAuthors.map(author => author.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className={cn(
              'space-y-3',
              viewMode === 'grid' && 'grid grid-cols-1 md:grid-cols-2 gap-4 space-y-0'
            )}>
              {filteredAndSortedAuthors.map((author, index) => (
                <AuthorCard
                  key={author.id}
                  author={author}
                  index={authors.indexOf(author)}
                  isExpanded={expandedAuthors.has(author.id)}
                  onToggleExpanded={() => toggleExpanded(author.id)}
                  onEdit={() => setEditingAuthor(author)}
                  onDelete={() => deleteAuthor(author.id)}
                  onDuplicate={() => duplicateAuthor(author.id)}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeAuthor && (
              <AuthorCard
                author={activeAuthor}
                index={authors.indexOf(activeAuthor)}
                isExpanded={false}
                className="rotate-3 shadow-2xl"
              />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Edit Dialog */}
      {editingAuthor && (
        <AuthorEditDialog
          author={editingAuthor}
          isOpen={!!editingAuthor}
          onClose={() => setEditingAuthor(null)}
          onSave={(updates) => {
            updateAuthor(editingAuthor.id, updates);
            setEditingAuthor(null);
          }}
        />
      )}

      {/* Import Dialog */}
      <AuthorImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={(importedAuthors) => {
          onUpdate([...authors, ...importedAuthors]);
          setShowImportDialog(false);
        }}
      />
    </div>
  );
}

export default VisualAuthorManager;