import React, { useState, useRef, useCallback } from 'react';
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
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  FileText, 
  Plus, 
  Trash2, 
  GripVertical, 
  Upload, 
  Download, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertCircle,
  Copy,
  Wand2,
  BookOpen,
  Link,
  Search,
  Filter,
  Settings
} from 'lucide-react';
import { EnhancedCard, CardHeader, CardTitle, CardContent } from '@/components/ui/enhanced-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { citationStyles } from '@/lib/academic-suggestions';
import type { Reference } from '@shared/schema';

interface SmartReferenceSystemProps {
  references: Reference[];
  onUpdate: (references: Reference[]) => void;
}

interface CitationFormat {
  id: string;
  name: string;
  example: string;
  pattern: RegExp;
  validator: (text: string) => ReferenceValidation;
  formatter: (text: string) => string;
}

interface ReferenceValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

interface SortableReferenceCardProps {
  reference: Reference;
  index: number;
  selectedFormat: string;
  showPreview: boolean;
  onUpdate: (referenceId: string, text: string) => void;
  onRemove: (referenceId: string) => void;
  onDuplicate: (referenceId: string) => void;
  onFormat: (referenceId: string) => void;
  validation: ReferenceValidation;
}

const citationFormats: CitationFormat[] = [
  {
    id: 'ieee',
    name: 'IEEE',
    example: '[1] A. Smith and B. Johnson, "Title of Paper," Journal Name, vol. 1, no. 2, pp. 10-20, Jan. 2021.',
    pattern: /^\[\d+\]\s+[A-Z]\.\s+\w+.*,\s*".*,"\s*.*,\s*vol\.\s*\d+.*,\s*pp\.\s*\d+-\d+.*,\s*\w+\.\s*\d{4}\.$/,
    validator: (text: string) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      if (!text.match(/^\[\d+\]/)) errors.push('Missing reference number in brackets [1]');
      if (!text.includes('"') || text.split('"').length < 3) errors.push('Title should be in quotes');
      if (!text.match(/vol\.\s*\d+/)) warnings.push('Volume number may be missing');
      if (!text.match(/pp\.\s*\d+-\d+/)) warnings.push('Page numbers may be missing');
      if (!text.match(/\d{4}/)) warnings.push('Year may be missing');
      if (!text.endsWith('.')) errors.push('Reference should end with a period');
      
      return { isValid: errors.length === 0, errors, warnings, suggestions: [] };
    },
    formatter: (text: string) => {
      // Basic IEEE formatting cleanup
      let formatted = text.trim();
      if (!formatted.endsWith('.')) formatted += '.';
      return formatted;
    }
  },
  {
    id: 'apa',
    name: 'APA',
    example: 'Smith, A., & Johnson, B. (2021). Title of paper. Journal Name, 1(2), 10-20.',
    pattern: /^[A-Z]\w+,\s+[A-Z]\.\s*.*\(\d{4}\)\.\s+.*\.\s+.*,\s*\d+.*,\s*\d+-\d+\.$/,
    validator: (text: string) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      if (!text.match(/^[A-Z]\w+,\s+[A-Z]\./)) errors.push('Should start with "LastName, F."');
      if (!text.match(/\(\d{4}\)/)) errors.push('Year should be in parentheses (2021)');
      if (!text.endsWith('.')) errors.push('Reference should end with a period');
      
      return { isValid: errors.length === 0, errors, warnings, suggestions: [] };
    },
    formatter: (text: string) => {
      let formatted = text.trim();
      if (!formatted.endsWith('.')) formatted += '.';
      return formatted;
    }
  },
  {
    id: 'mla',
    name: 'MLA',
    example: 'Smith, John, and Bob Johnson. "Title of Paper." Journal Name, vol. 1, no. 2, 2021, pp. 10-20.',
    pattern: /^[A-Z]\w+,\s+[A-Z]\w+.*\.\s+".*\."\s+.*,\s*vol\.\s*\d+.*,\s*\d{4},\s*pp\.\s*\d+-\d+\.$/,
    validator: (text: string) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      if (!text.match(/^[A-Z]\w+,\s+[A-Z]\w+/)) errors.push('Should start with "LastName, FirstName"');
      if (!text.includes('"') || text.split('"').length < 3) errors.push('Title should be in quotes');
      if (!text.endsWith('.')) errors.push('Reference should end with a period');
      
      return { isValid: errors.length === 0, errors, warnings, suggestions: [] };
    },
    formatter: (text: string) => {
      let formatted = text.trim();
      if (!formatted.endsWith('.')) formatted += '.';
      return formatted;
    }
  }
];

function SortableReferenceCard({
  reference,
  index,
  selectedFormat,
  showPreview,
  onUpdate,
  onRemove,
  onDuplicate,
  onFormat,
  validation
}: SortableReferenceCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: reference.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const format = citationFormats.find(f => f.id === selectedFormat) || citationFormats[0];

  return (
    <EnhancedCard
      ref={setNodeRef}
      style={style}
      variant={isDragging ? "elevated" : "default"}
      className={cn(
        "transition-all duration-200",
        isDragging && "rotate-1 scale-105",
        validation.isValid ? "border-green-200" : validation.errors.length > 0 ? "border-red-200" : "border-gray-200"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="flex flex-col items-center justify-center p-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-4 h-4" />
            <span className="text-xs font-medium mt-1">[{index + 1}]</span>
          </div>

          {/* Reference Content */}
          <div className="flex-1 space-y-3">
            {/* Header with validation status */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-900">Reference {index + 1}</h4>
                {validation.isValid ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Valid
                  </Badge>
                ) : validation.errors.length > 0 ? (
                  <Badge variant="destructive">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {validation.errors.length} Error{validation.errors.length > 1 ? 's' : ''}
                  </Badge>
                ) : null}
                {validation.warnings.length > 0 && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {validation.warnings.length} Warning{validation.warnings.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFormat(reference.id)}
                  className="text-purple-600 hover:text-purple-700"
                  title="Auto-format reference"
                >
                  <Wand2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDuplicate(reference.id)}
                  className="text-gray-500 hover:text-gray-700"
                  title="Duplicate reference"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(reference.id)}
                  className="text-red-500 hover:text-red-700"
                  title="Remove reference"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Reference Input */}
            <div>
              <Textarea
                value={reference.text}
                onChange={(e) => onUpdate(reference.id, e.target.value)}
                placeholder={`Enter ${format.name} format reference...`}
                rows={3}
                className={cn(
                  "transition-colors",
                  validation.isValid ? "border-green-300 focus:border-green-500" :
                  validation.errors.length > 0 ? "border-red-300 focus:border-red-500" : ""
                )}
              />
            </div>

            {/* Format Example */}
            {showPreview && (
              <div className="bg-gray-50 p-3 rounded-md">
                <Label className="text-xs font-medium text-gray-600 mb-1 block">
                  {format.name} Format Example:
                </Label>
                <p className="text-xs text-gray-700 font-mono">{format.example}</p>
              </div>
            )}

            {/* Validation Messages */}
            {(validation.errors.length > 0 || validation.warnings.length > 0) && (
              <div className="space-y-2">
                {validation.errors.map((error, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                ))}
                {validation.warnings.map((warning, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm text-yellow-600">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </EnhancedCard>
  );
}

export default function SmartReferenceSystem({ references, onUpdate }: SmartReferenceSystemProps) {
  const [selectedFormat, setSelectedFormat] = useState('ieee');
  const [showPreview, setShowPreview] = useState(true);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValid, setFilterValid] = useState<'all' | 'valid' | 'invalid'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const validateReference = useCallback((reference: Reference): ReferenceValidation => {
    const format = citationFormats.find(f => f.id === selectedFormat) || citationFormats[0];
    if (!reference.text.trim()) {
      return { isValid: false, errors: ['Reference text is required'], warnings: [], suggestions: [] };
    }
    return format.validator(reference.text);
  }, [selectedFormat]);

  const addReference = () => {
    const newReference: Reference = {
      id: `reference_${Date.now()}`,
      text: '',
      order: references.length
    };
    onUpdate([...references, newReference]);
  };

  const removeReference = (referenceId: string) => {
    onUpdate(references.filter(ref => ref.id !== referenceId));
    toast({
      title: "Reference removed",
      description: "Reference has been removed from the document",
    });
  };

  const updateReference = (referenceId: string, text: string) => {
    onUpdate(references.map(ref => 
      ref.id === referenceId ? { ...ref, text } : ref
    ));
  };

  const duplicateReference = (referenceId: string) => {
    const refToDuplicate = references.find(r => r.id === referenceId);
    if (refToDuplicate) {
      const duplicatedRef: Reference = {
        ...refToDuplicate,
        id: `reference_${Date.now()}`,
        text: refToDuplicate.text + ' (Copy)',
        order: references.length
      };
      onUpdate([...references, duplicatedRef]);
      toast({
        title: "Reference duplicated",
        description: "Reference has been duplicated successfully",
      });
    }
  };

  const formatReference = (referenceId: string) => {
    const reference = references.find(r => r.id === referenceId);
    if (reference) {
      const format = citationFormats.find(f => f.id === selectedFormat) || citationFormats[0];
      const formatted = format.formatter(reference.text);
      updateReference(referenceId, formatted);
      toast({
        title: "Reference formatted",
        description: `Applied ${format.name} formatting`,
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = references.findIndex((ref) => ref.id === active.id);
      const newIndex = references.findIndex((ref) => ref.id === over?.id);

      const reorderedRefs = arrayMove(references, oldIndex, newIndex);
      // Update order property
      const updatedRefs = reorderedRefs.map((ref, index) => ({ ...ref, order: index }));
      onUpdate(updatedRefs);
      toast({
        title: "References reordered",
        description: "Reference order has been updated",
      });
    }
  };

  const handleBulkImport = () => {
    try {
      const lines = bulkImportText.trim().split('\n').filter(line => line.trim());
      const newReferences: Reference[] = [];

      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          // Remove existing numbering if present
          const cleanedLine = trimmedLine.replace(/^\[\d+\]\s*/, '');
          const newRef: Reference = {
            id: `reference_${Date.now()}_${index}`,
            text: cleanedLine,
            order: references.length + index
          };
          newReferences.push(newRef);
        }
      });

      if (newReferences.length > 0) {
        onUpdate([...references, ...newReferences]);
        setBulkImportText('');
        setShowBulkImport(false);
        toast({
          title: "References imported",
          description: `Successfully imported ${newReferences.length} references`,
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

  const exportReferences = () => {
    const format = citationFormats.find(f => f.id === selectedFormat) || citationFormats[0];
    const exportContent = references
      .map((ref, index) => `[${index + 1}] ${ref.text}`)
      .join('\n\n');
    
    const blob = new Blob([exportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `references_${format.name.toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "References exported",
      description: `References exported in ${format.name} format`,
    });
  };

  const autoFormatAll = () => {
    const format = citationFormats.find(f => f.id === selectedFormat) || citationFormats[0];
    const formattedRefs = references.map(ref => ({
      ...ref,
      text: format.formatter(ref.text)
    }));
    onUpdate(formattedRefs);
    toast({
      title: "All references formatted",
      description: `Applied ${format.name} formatting to all references`,
    });
  };

  // Filter references based on search and validation
  const filteredReferences = references.filter(ref => {
    const matchesSearch = searchQuery === '' || 
      ref.text.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filterValid === 'all') return true;
    
    const validation = validateReference(ref);
    if (filterValid === 'valid') return validation.isValid;
    if (filterValid === 'invalid') return !validation.isValid;
    
    return true;
  });

  const validationStats = references.reduce((stats, ref) => {
    const validation = validateReference(ref);
    if (validation.isValid) stats.valid++;
    else stats.invalid++;
    return stats;
  }, { valid: 0, invalid: 0 });

  return (
    <EnhancedCard variant="gradient" className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2" gradient>
            <BookOpen className="w-5 h-5" />
            Smart Reference System
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700">
              {validationStats.valid} Valid
            </Badge>
            {validationStats.invalid > 0 && (
              <Badge variant="outline" className="bg-red-50 text-red-700">
                {validationStats.invalid} Invalid
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Citation Style:</Label>
            <Select value={selectedFormat} onValueChange={setSelectedFormat}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {citationFormats.map((format) => (
                  <SelectItem key={format.id} value={format.id}>
                    {format.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              id="show-preview"
              checked={showPreview}
              onCheckedChange={setShowPreview}
            />
            <Label htmlFor="show-preview" className="text-sm">
              Show Examples
            </Label>
          </div>
          
          <div className="flex items-center gap-2 ml-auto">
            <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Import
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Bulk Import References</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="paste" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="paste">Paste Text</TabsTrigger>
                    <TabsTrigger value="file">Import File</TabsTrigger>
                  </TabsList>
                  <TabsContent value="paste" className="space-y-4">
                    <div>
                      <Label>Paste References</Label>
                      <p className="text-sm text-gray-600 mb-2">
                        Paste your references, one per line. Existing numbering will be removed.
                      </p>
                      <Textarea
                        placeholder="A. Smith, &quot;Paper Title,&quot; Journal Name, vol. 1, pp. 1-10, 2021.&#10;B. Johnson, &quot;Another Paper,&quot; Conference, pp. 20-30, 2022."
                        value={bulkImportText}
                        onChange={(e) => setBulkImportText(e.target.value)}
                        rows={10}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowBulkImport(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleBulkImport}>
                        Import References
                      </Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="file" className="space-y-4">
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">
                        Import from bibliography management tools (BibTeX, EndNote, etc.)
                      </p>
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        Choose File
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".bib,.enw,.ris,.txt"
                        className="hidden"
                        onChange={(e) => {
                          // File import logic would go here
                          toast({
                            title: "Feature coming soon",
                            description: "File import will be available in a future update",
                          });
                        }}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" size="sm" onClick={exportReferences}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            
            <Button variant="outline" size="sm" onClick={autoFormatAll}>
              <Wand2 className="w-4 h-4 mr-2" />
              Format All
            </Button>
            
            <Button onClick={addReference} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Reference
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        {references.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search references..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterValid} onValueChange={(value: 'all' | 'valid' | 'invalid') => setFilterValid(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="valid">Valid Only</SelectItem>
                <SelectItem value="invalid">Invalid Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* References List */}
        {filteredReferences.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {references.length === 0 ? 'No references added yet' : 'No references match your search'}
            </h3>
            <p className="text-gray-600 mb-6">
              {references.length === 0 
                ? 'Add references to your document using the button above or bulk import'
                : 'Try adjusting your search terms or filters'
              }
            </p>
            {references.length === 0 && (
              <Button onClick={addReference}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Reference
              </Button>
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={filteredReferences.map(r => r.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {filteredReferences.map((reference, index) => (
                  <SortableReferenceCard
                    key={reference.id}
                    reference={reference}
                    index={index}
                    selectedFormat={selectedFormat}
                    showPreview={showPreview}
                    onUpdate={updateReference}
                    onRemove={removeReference}
                    onDuplicate={duplicateReference}
                    onFormat={formatReference}
                    validation={validateReference(reference)}
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