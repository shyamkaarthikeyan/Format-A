import React, { useState, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  User, 
  Plus, 
  Trash2, 
  GripVertical, 
  Upload, 
  Download, 
  Copy, 
  Building, 
  Mail, 
  MapPin,
  UserPlus,
  FileText,
  Settings
} from 'lucide-react';
import { EnhancedCard, CardHeader, CardTitle, CardContent } from '@/components/ui/enhanced-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SmartInput from '@/components/ui/smart-input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getSuggestions } from '@/lib/academic-suggestions';
import type { Author, CustomField } from '@shared/schema';

interface AuthorManagementProps {
  authors: Author[];
  onUpdate: (authors: Author[]) => void;
}

interface AuthorTemplate {
  id: string;
  name: string;
  department: string;
  organization: string;
  city: string;
  state: string;
  email: string;
}

interface SortableAuthorCardProps {
  author: Author;
  index: number;
  onUpdate: (authorId: string, field: keyof Author, value: any) => void;
  onRemove: (authorId: string) => void;
  onDuplicate: (authorId: string) => void;
  onAddCustomField: (authorId: string) => void;
  onRemoveCustomField: (authorId: string, fieldId: string) => void;
  onUpdateCustomField: (authorId: string, fieldId: string, field: keyof CustomField, value: string) => void;
  institutionSuggestions: string[];
  departmentSuggestions: string[];
}

const authorTemplates: AuthorTemplate[] = [
  {
    id: 'template_1',
    name: '',
    department: 'Department of Computer Science',
    organization: 'Massachusetts Institute of Technology',
    city: 'Cambridge',
    state: 'MA',
    email: ''
  },
  {
    id: 'template_2',
    name: '',
    department: 'Department of Electrical Engineering',
    organization: 'Stanford University',
    city: 'Stanford',
    state: 'CA',
    email: ''
  },
  {
    id: 'template_3',
    name: '',
    department: 'School of Engineering',
    organization: 'University of California, Berkeley',
    city: 'Berkeley',
    state: 'CA',
    email: ''
  }
];

function SortableAuthorCard({
  author,
  index,
  onUpdate,
  onRemove,
  onDuplicate,
  onAddCustomField,
  onRemoveCustomField,
  onUpdateCustomField,
  institutionSuggestions,
  departmentSuggestions
}: SortableAuthorCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: author.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <EnhancedCard
      ref={setNodeRef}
      style={style}
      variant={isDragging ? "elevated" : "default"}
      className={cn(
        "transition-all duration-200",
        isDragging && "rotate-2 scale-105"
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="flex flex-col items-center justify-center p-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-5 h-5" />
            <span className="text-xs font-medium mt-1">#{index + 1}</span>
          </div>

          {/* Author Content */}
          <div className="flex-1 space-y-4">
            {/* Header with actions */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {author.name ? author.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {author.name || 'Unnamed Author'}
                  </h4>
                  {author.organization && (
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      {author.organization}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDuplicate(author.id)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(author.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Author Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Name *</Label>
                <SmartInput
                  value={author.name}
                  onChange={(e) => onUpdate(author.id, 'name', e.target.value)}
                  placeholder="Author Name"
                  validation={{ required: true, minLength: 2 }}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <SmartInput
                  type="email"
                  value={author.email || ''}
                  onChange={(e) => onUpdate(author.id, 'email', e.target.value)}
                  placeholder="author@institution.edu"
                  validation={{ 
                    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                  }}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium">Department</Label>
                <SmartInput
                  value={author.department || ''}
                  onChange={(e) => onUpdate(author.id, 'department', e.target.value)}
                  placeholder="Department"
                  suggestions={departmentSuggestions}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium">Organization</Label>
                <SmartInput
                  value={author.organization || ''}
                  onChange={(e) => onUpdate(author.id, 'organization', e.target.value)}
                  placeholder="Institution or Company"
                  suggestions={institutionSuggestions}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium">City</Label>
                <SmartInput
                  value={author.city || ''}
                  onChange={(e) => onUpdate(author.id, 'city', e.target.value)}
                  placeholder="City"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium">State/Province</Label>
                <SmartInput
                  value={author.state || ''}
                  onChange={(e) => onUpdate(author.id, 'state', e.target.value)}
                  placeholder="State or Province"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Custom Fields */}
            {author.customFields.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Custom Fields
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAddCustomField(author.id)}
                      className="text-purple-600 hover:text-purple-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Field
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {author.customFields.map((field) => (
                      <div key={field.id} className="flex gap-2">
                        <Input
                          placeholder="Field name"
                          value={field.name}
                          onChange={(e) => onUpdateCustomField(author.id, field.id, 'name', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Field value"
                          value={field.value}
                          onChange={(e) => onUpdateCustomField(author.id, field.id, 'value', e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveCustomField(author.id, field.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Add Custom Field Button */}
            {author.customFields.length === 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAddCustomField(author.id)}
                className="text-purple-600 hover:text-purple-700 w-fit"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Custom Field
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </EnhancedCard>
  );
}

export default function AuthorManagement({ authors, onUpdate }: AuthorManagementProps) {
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const institutionSuggestions = getSuggestions('institutions');
  const departmentSuggestions = getSuggestions('departments');

  const addAuthor = (template?: AuthorTemplate) => {
    const newAuthor: Author = {
      id: `author_${Date.now()}`,
      name: template?.name || '',
      department: template?.department || '',
      organization: template?.organization || '',
      city: template?.city || '',
      state: template?.state || '',
      email: template?.email || '',
      customFields: []
    };
    onUpdate([...authors, newAuthor]);
    
    if (template) {
      toast({
        title: "Author template applied",
        description: "Author added with institutional template",
      });
    }
  };

  const removeAuthor = (authorId: string) => {
    onUpdate(authors.filter(author => author.id !== authorId));
    toast({
      title: "Author removed",
      description: "Author has been removed from the document",
    });
  };

  const updateAuthor = (authorId: string, field: keyof Author, value: any) => {
    onUpdate(authors.map(author => 
      author.id === authorId ? { ...author, [field]: value } : author
    ));
  };

  const duplicateAuthor = (authorId: string) => {
    const authorToDuplicate = authors.find(a => a.id === authorId);
    if (authorToDuplicate) {
      const duplicatedAuthor: Author = {
        ...authorToDuplicate,
        id: `author_${Date.now()}`,
        name: `${authorToDuplicate.name} (Copy)`,
        customFields: authorToDuplicate.customFields.map(field => ({
          ...field,
          id: `field_${Date.now()}_${Math.random()}`
        }))
      };
      onUpdate([...authors, duplicatedAuthor]);
      toast({
        title: "Author duplicated",
        description: "Author has been duplicated successfully",
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = authors.findIndex((author) => author.id === active.id);
      const newIndex = authors.findIndex((author) => author.id === over?.id);

      const reorderedAuthors = arrayMove(authors, oldIndex, newIndex);
      onUpdate(reorderedAuthors);
      toast({
        title: "Authors reordered",
        description: "Author order has been updated",
      });
    }
  };

  const addCustomField = (authorId: string) => {
    const newField: CustomField = {
      id: `field_${Date.now()}`,
      name: '',
      value: ''
    };
    updateAuthor(authorId, 'customFields', [
      ...authors.find(a => a.id === authorId)?.customFields || [],
      newField
    ]);
  };

  const removeCustomField = (authorId: string, fieldId: string) => {
    const author = authors.find(a => a.id === authorId);
    if (author) {
      updateAuthor(authorId, 'customFields', 
        author.customFields.filter(f => f.id !== fieldId)
      );
    }
  };

  const updateCustomField = (authorId: string, fieldId: string, field: keyof CustomField, value: string) => {
    const author = authors.find(a => a.id === authorId);
    if (author) {
      updateAuthor(authorId, 'customFields',
        author.customFields.map(f => 
          f.id === fieldId ? { ...f, [field]: value } : f
        )
      );
    }
  };

  const handleBulkImport = () => {
    try {
      const lines = bulkImportText.trim().split('\n');
      const newAuthors: Author[] = [];

      lines.forEach((line, index) => {
        const parts = line.split(',').map(part => part.trim());
        if (parts.length >= 1 && parts[0]) {
          const newAuthor: Author = {
            id: `author_${Date.now()}_${index}`,
            name: parts[0] || '',
            department: parts[1] || '',
            organization: parts[2] || '',
            city: parts[3] || '',
            state: parts[4] || '',
            email: parts[5] || '',
            customFields: []
          };
          newAuthors.push(newAuthor);
        }
      });

      if (newAuthors.length > 0) {
        onUpdate([...authors, ...newAuthors]);
        setBulkImportText('');
        setShowBulkImport(false);
        toast({
          title: "Authors imported",
          description: `Successfully imported ${newAuthors.length} authors`,
        });
      }
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Please check the format and try again",
        variant: "destructive",
      });
    }
  };

  const exportAuthors = () => {
    const csvContent = authors.map(author => 
      [author.name, author.department, author.organization, author.city, author.state, author.email].join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'authors.csv';
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Authors exported",
      description: "Author list has been exported to CSV",
    });
  };

  return (
    <EnhancedCard variant="gradient" className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2" gradient>
            <User className="w-5 h-5" />
            Author Management
          </CardTitle>
          <div className="flex items-center gap-2">
            <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Import
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Bulk Import Authors</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Import Format</Label>
                    <p className="text-sm text-gray-600 mb-2">
                      Enter one author per line in CSV format: Name, Department, Organization, City, State, Email
                    </p>
                    <Textarea
                      placeholder="John Doe, Computer Science, MIT, Cambridge, MA, john@mit.edu&#10;Jane Smith, Electrical Engineering, Stanford, Stanford, CA, jane@stanford.edu"
                      value={bulkImportText}
                      onChange={(e) => setBulkImportText(e.target.value)}
                      rows={8}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowBulkImport(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleBulkImport}>
                      Import Authors
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" size="sm" onClick={exportAuthors}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Choose template" />
              </SelectTrigger>
              <SelectContent>
                {authorTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.organization}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              onClick={() => {
                const template = authorTemplates.find(t => t.id === selectedTemplate);
                addAuthor(template);
                setSelectedTemplate('');
              }}
              size="sm"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Author
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {authors.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No authors added yet</h3>
            <p className="text-gray-600 mb-6">
              Add authors to your document using the button above or bulk import from CSV
            </p>
            <Button onClick={() => addAuthor()}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Your First Author
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={authors.map(a => a.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {authors.map((author, index) => (
                  <SortableAuthorCard
                    key={author.id}
                    author={author}
                    index={index}
                    onUpdate={updateAuthor}
                    onRemove={removeAuthor}
                    onDuplicate={duplicateAuthor}
                    onAddCustomField={addCustomField}
                    onRemoveCustomField={removeCustomField}
                    onUpdateCustomField={updateCustomField}
                    institutionSuggestions={institutionSuggestions}
                    departmentSuggestions={departmentSuggestions}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </EnhancedCard>
  );
}