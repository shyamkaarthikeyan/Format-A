import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, User, Building, Mail, MapPin } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import SmartInput from '@/components/ui/smart-input';
import { institutionSuggestions, departmentSuggestions } from '@/lib/academic-suggestions';
import type { Author } from '@shared/schema';

interface SmartAuthorFormProps {
  authors: Author[];
  onUpdate: (authors: Author[]) => void;
  className?: string;
}

interface DraggableAuthorCardProps {
  author: Author;
  index: number;
  onUpdate: (updates: Partial<Author>) => void;
  onDelete: () => void;
}

function DraggableAuthorCard({ author, index, onUpdate, onDelete }: DraggableAuthorCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: author.id,
    data: { type: 'author', author },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Common email domains for suggestions
  const emailSuggestions = [
    '@gmail.com',
    '@university.edu',
    '@mit.edu',
    '@stanford.edu',
    '@berkeley.edu',
    '@harvard.edu',
    '@research.org',
    '@ieee.org',
    '@acm.org',
  ];

  const getEmailSuggestions = (value: string) => {
    if (!value.includes('@') && value.length > 0) {
      return emailSuggestions.map(domain => value + domain);
    }
    return [];
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group transition-all duration-200',
        isDragging && 'opacity-50 scale-105 z-50'
      )}
    >
      <EnhancedCard
        variant={isDragging ? 'elevated' : 'glass'}
        className={cn(
          'overflow-hidden transition-all duration-200',
          isDragging && 'shadow-2xl shadow-purple-500/25'
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50/50 to-violet-50/50">
          <div className="flex items-center gap-3">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors"
            >
              <GripVertical className="w-4 h-4" />
            </div>

            {/* Author Number */}
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-purple-700">{index + 1}</span>
            </div>

            {/* Author Name */}
            <div className="flex-1">
              <SmartInput
                value={author.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="Author name"
                className="font-medium border-none bg-transparent p-0 h-auto focus-visible:ring-0"
                validation={{
                  required: true,
                  minLength: 2,
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <EnhancedButton
                variant="ghost"
                size="xs"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-7 w-7 p-0 text-gray-500"
              >
                {isExpanded ? '−' : '+'}
              </EnhancedButton>
              
              <EnhancedButton
                variant="ghost"
                size="xs"
                onClick={onDelete}
                className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-3 h-3" />
              </EnhancedButton>
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="p-4 space-y-4 bg-white/50">
            {/* Email */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <SmartInput
                type="email"
                value={author.email || ''}
                onChange={(e) => onUpdate({ email: e.target.value })}
                placeholder="author@university.edu"
                suggestions={getEmailSuggestions(author.email || '')}
                validation={{
                  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                }}
              />
            </div>

            {/* Institution */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Building className="w-4 h-4" />
                Institution
              </label>
              <SmartInput
                value={author.organization || ''}
                onChange={(e) => onUpdate({ organization: e.target.value })}
                placeholder="University or Organization"
                suggestions={institutionSuggestions}
              />
            </div>

            {/* Department */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <User className="w-4 h-4" />
                Department
              </label>
              <SmartInput
                value={author.department || ''}
                onChange={(e) => onUpdate({ department: e.target.value })}
                placeholder="Department or School"
                suggestions={departmentSuggestions}
              />
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <MapPin className="w-4 h-4" />
                  City
                </label>
                <SmartInput
                  value={author.city || ''}
                  onChange={(e) => onUpdate({ city: e.target.value })}
                  placeholder="City"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">State/Country</label>
                <SmartInput
                  value={author.state || ''}
                  onChange={(e) => onUpdate({ state: e.target.value })}
                  placeholder="State or Country"
                />
              </div>
            </div>

            {/* Custom Fields */}
            {author.customFields.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Additional Information</label>
                <div className="space-y-2">
                  {author.customFields.map((field, fieldIndex) => (
                    <div key={field.id} className="flex gap-2">
                      <SmartInput
                        value={field.name}
                        onChange={(e) => {
                          const updatedFields = [...author.customFields];
                          updatedFields[fieldIndex] = { ...field, name: e.target.value };
                          onUpdate({ customFields: updatedFields });
                        }}
                        placeholder="Field name"
                        className="w-1/3"
                      />
                      <SmartInput
                        value={field.value}
                        onChange={(e) => {
                          const updatedFields = [...author.customFields];
                          updatedFields[fieldIndex] = { ...field, value: e.target.value };
                          onUpdate({ customFields: updatedFields });
                        }}
                        placeholder="Value"
                        className="flex-1"
                      />
                      <EnhancedButton
                        variant="ghost"
                        size="xs"
                        onClick={() => {
                          const updatedFields = author.customFields.filter((_, i) => i !== fieldIndex);
                          onUpdate({ customFields: updatedFields });
                        }}
                        className="h-9 w-9 p-0 text-red-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </EnhancedButton>
                    </div>
                  ))}
                </div>
                
                <EnhancedButton
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newField = {
                      id: `field_${Date.now()}`,
                      name: '',
                      value: '',
                    };
                    onUpdate({ customFields: [...author.customFields, newField] });
                  }}
                  className="text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Field
                </EnhancedButton>
              </div>
            )}
          </div>
        )}

        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-purple-500/10 border-2 border-purple-500 border-dashed rounded-lg pointer-events-none" />
        )}
      </EnhancedCard>
    </div>
  );
}

export default function SmartAuthorForm({ authors, onUpdate, className }: SmartAuthorFormProps) {
  const addAuthor = () => {
    const newAuthor: Author = {
      id: `author_${Date.now()}`,
      name: '',
      customFields: [],
    };
    onUpdate([...authors, newAuthor]);
  };

  const updateAuthor = (authorId: string, updates: Partial<Author>) => {
    onUpdate(
      authors.map(author =>
        author.id === authorId ? { ...author, ...updates } : author
      )
    );
  };

  const deleteAuthor = (authorId: string) => {
    onUpdate(authors.filter(author => author.id !== authorId));
  };

  const duplicateAuthor = (authorId: string) => {
    const author = authors.find(a => a.id === authorId);
    if (!author) return;

    const duplicatedAuthor: Author = {
      ...author,
      id: `author_${Date.now()}`,
      name: `${author.name} (Copy)`,
    };

    onUpdate([...authors, duplicatedAuthor]);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-700">Authors</h3>
          <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
            {authors.length}
          </span>
        </div>
        
        <EnhancedButton
          onClick={addAuthor}
          size="sm"
          className="h-7 text-xs"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Author
        </EnhancedButton>
      </div>

      {/* Authors List */}
      {authors.length === 0 ? (
        <EnhancedCard variant="glass" className="p-8 text-center">
          <div className="space-y-3">
            <div className="w-12 h-12 mx-auto bg-gradient-to-br from-purple-100 to-violet-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">No authors added</h4>
              <p className="text-sm text-gray-600 mb-4">Add authors to your document</p>
              <EnhancedButton onClick={addAuthor} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add First Author
              </EnhancedButton>
            </div>
          </div>
        </EnhancedCard>
      ) : (
        <div className="space-y-3">
          {authors.map((author, index) => (
            <DraggableAuthorCard
              key={author.id}
              author={author}
              index={index}
              onUpdate={(updates) => updateAuthor(author.id, updates)}
              onDelete={() => deleteAuthor(author.id)}
            />
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {authors.length > 0 && (
        <div className="flex gap-2 pt-2 border-t border-gray-200">
          <EnhancedButton
            variant="outline"
            size="sm"
            onClick={addAuthor}
            className="text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Another
          </EnhancedButton>
          
          {authors.length > 1 && (
            <EnhancedButton
              variant="ghost"
              size="sm"
              className="text-xs text-gray-500"
              onClick={() => {
                // Sort authors alphabetically
                const sortedAuthors = [...authors].sort((a, b) => a.name.localeCompare(b.name));
                onUpdate(sortedAuthors);
              }}
            >
              Sort A-Z
            </EnhancedButton>
          )}
        </div>
      )}
    </div>
  );
}