import React, { useState, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  Users, 
  AlertCircle, 
  CheckCircle, 
  X,
  Download,
  Copy
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Author } from '@shared/schema';

interface AuthorImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (authors: Author[]) => void;
}

interface ParsedAuthor {
  name: string;
  email?: string;
  organization?: string;
  department?: string;
  city?: string;
  state?: string;
  [key: string]: any;
}

export function AuthorImportDialog({ 
  isOpen, 
  onClose, 
  onImport 
}: AuthorImportDialogProps) {
  const [activeTab, setActiveTab] = useState('json');
  const [importData, setImportData] = useState('');
  const [parsedAuthors, setParsedAuthors] = useState<ParsedAuthor[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);

  const resetState = () => {
    setImportData('');
    setParsedAuthors([]);
    setErrors([]);
    setIsValid(false);
  };

  const parseJsonData = useCallback((data: string) => {
    try {
      const parsed = JSON.parse(data);
      const authors = Array.isArray(parsed) ? parsed : [parsed];
      
      const validAuthors: ParsedAuthor[] = [];
      const newErrors: string[] = [];

      authors.forEach((author, index) => {
        if (typeof author !== 'object' || author === null) {
          newErrors.push(`Item ${index + 1}: Must be an object`);
          return;
        }

        if (!author.name || typeof author.name !== 'string') {
          newErrors.push(`Item ${index + 1}: Missing or invalid name field`);
          return;
        }

        validAuthors.push({
          name: author.name.trim(),
          email: author.email || '',
          organization: author.organization || author.institution || '',
          department: author.department || '',
          city: author.city || '',
          state: author.state || author.country || '',
          ...author
        });
      });

      setParsedAuthors(validAuthors);
      setErrors(newErrors);
      setIsValid(validAuthors.length > 0);
    } catch (error) {
      setErrors(['Invalid JSON format']);
      setParsedAuthors([]);
      setIsValid(false);
    }
  }, []);

  const parseCsvData = useCallback((data: string) => {
    try {
      const lines = data.trim().split('\n');
      if (lines.length < 2) {
        setErrors(['CSV must have at least a header row and one data row']);
        setParsedAuthors([]);
        setIsValid(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const nameIndex = headers.findIndex(h => h.includes('name'));
      
      if (nameIndex === -1) {
        setErrors(['CSV must have a column containing "name"']);
        setParsedAuthors([]);
        setIsValid(false);
        return;
      }

      const validAuthors: ParsedAuthor[] = [];
      const newErrors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        
        if (values.length !== headers.length) {
          newErrors.push(`Row ${i + 1}: Column count mismatch`);
          continue;
        }

        const name = values[nameIndex];
        if (!name) {
          newErrors.push(`Row ${i + 1}: Missing name`);
          continue;
        }

        const author: ParsedAuthor = { name };
        
        headers.forEach((header, index) => {
          const value = values[index];
          if (value && header !== 'name') {
            if (header.includes('email')) author.email = value;
            else if (header.includes('organization') || header.includes('institution')) author.organization = value;
            else if (header.includes('department')) author.department = value;
            else if (header.includes('city')) author.city = value;
            else if (header.includes('state') || header.includes('country')) author.state = value;
            else author[header] = value;
          }
        });

        validAuthors.push(author);
      }

      setParsedAuthors(validAuthors);
      setErrors(newErrors);
      setIsValid(validAuthors.length > 0);
    } catch (error) {
      setErrors(['Error parsing CSV data']);
      setParsedAuthors([]);
      setIsValid(false);
    }
  }, []);

  const parseTextData = useCallback((data: string) => {
    try {
      const lines = data.trim().split('\n').filter(line => line.trim());
      const validAuthors: ParsedAuthor[] = [];
      const newErrors: string[] = [];

      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        // Try to parse different formats
        // Format 1: "Name <email@domain.com>"
        const emailMatch = trimmedLine.match(/^(.+?)\s*<(.+@.+)>$/);
        if (emailMatch) {
          validAuthors.push({
            name: emailMatch[1].trim(),
            email: emailMatch[2].trim()
          });
          return;
        }

        // Format 2: "Name, Organization"
        const orgMatch = trimmedLine.match(/^(.+?),\s*(.+)$/);
        if (orgMatch) {
          validAuthors.push({
            name: orgMatch[1].trim(),
            organization: orgMatch[2].trim()
          });
          return;
        }

        // Format 3: Just name
        if (trimmedLine.length > 1) {
          validAuthors.push({
            name: trimmedLine
          });
        } else {
          newErrors.push(`Line ${index + 1}: Invalid format`);
        }
      });

      setParsedAuthors(validAuthors);
      setErrors(newErrors);
      setIsValid(validAuthors.length > 0);
    } catch (error) {
      setErrors(['Error parsing text data']);
      setParsedAuthors([]);
      setIsValid(false);
    }
  }, []);

  const handleDataChange = useCallback((value: string) => {
    setImportData(value);
    
    if (!value.trim()) {
      resetState();
      return;
    }

    switch (activeTab) {
      case 'json':
        parseJsonData(value);
        break;
      case 'csv':
        parseCsvData(value);
        break;
      case 'text':
        parseTextData(value);
        break;
    }
  }, [activeTab, parseJsonData, parseCsvData, parseTextData]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    if (importData.trim()) {
      // Re-parse with new format
      setTimeout(() => handleDataChange(importData), 0);
    }
  }, [importData, handleDataChange]);

  const handleImport = () => {
    const authors: Author[] = parsedAuthors.map((parsed, index) => ({
      id: `author_${Date.now()}_${index}`,
      name: parsed.name,
      email: parsed.email,
      organization: parsed.organization,
      department: parsed.department,
      city: parsed.city,
      state: parsed.state,
      customFields: Object.entries(parsed)
        .filter(([key]) => !['name', 'email', 'organization', 'department', 'city', 'state'].includes(key))
        .map(([key, value]) => ({
          id: `field_${Date.now()}_${key}`,
          name: key,
          value: String(value || '')
        }))
    }));

    onImport(authors);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportData(content);
      handleDataChange(content);
    };
    reader.readAsText(file);
  };

  const getExampleData = () => {
    switch (activeTab) {
      case 'json':
        return JSON.stringify([
          {
            name: "John Doe",
            email: "john.doe@university.edu",
            organization: "MIT",
            department: "Computer Science",
            city: "Cambridge",
            state: "MA"
          },
          {
            name: "Jane Smith",
            email: "jane.smith@research.org",
            organization: "Stanford University",
            department: "Electrical Engineering"
          }
        ], null, 2);
      
      case 'csv':
        return `name,email,organization,department,city,state
John Doe,john.doe@university.edu,MIT,Computer Science,Cambridge,MA
Jane Smith,jane.smith@research.org,Stanford University,Electrical Engineering,Stanford,CA`;
      
      case 'text':
        return `John Doe <john.doe@university.edu>
Jane Smith, Stanford University
Robert Johnson
Alice Brown <alice@research.org>`;
      
      default:
        return '';
    }
  };

  const copyExample = () => {
    const example = getExampleData();
    navigator.clipboard.writeText(example);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Authors
          </DialogTitle>
          <DialogDescription>
            Import multiple authors from JSON, CSV, or plain text formats.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="json" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                JSON
              </TabsTrigger>
              <TabsTrigger value="csv" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                CSV
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Text
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {/* File Upload */}
              <div className="flex items-center gap-2">
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <EnhancedButton variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-1" />
                      Upload File
                    </span>
                  </EnhancedButton>
                </Label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".json,.csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                <EnhancedButton
                  variant="ghost"
                  size="sm"
                  onClick={copyExample}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy Example
                </EnhancedButton>
              </div>

              {/* Data Input */}
              <div className="space-y-2">
                <Label>Paste or type your data:</Label>
                <Textarea
                  value={importData}
                  onChange={(e) => handleDataChange(e.target.value)}
                  placeholder={`Paste your ${activeTab.toUpperCase()} data here...`}
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>

              {/* Example */}
              <EnhancedCard variant="glass" className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Example Format:</h4>
                  <EnhancedButton
                    variant="ghost"
                    size="xs"
                    onClick={copyExample}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </EnhancedButton>
                </div>
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                  {getExampleData()}
                </pre>
              </EnhancedCard>
            </TabsContent>
          </Tabs>

          {/* Validation Results */}
          {importData && (
            <div className="space-y-3">
              <Separator />
              
              {/* Status */}
              <div className="flex items-center gap-2">
                {isValid ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
                <span className="font-medium">
                  {isValid ? 'Data Valid' : 'Validation Failed'}
                </span>
                {parsedAuthors.length > 0 && (
                  <Badge variant="secondary">
                    {parsedAuthors.length} author{parsedAuthors.length !== 1 ? 's' : ''} found
                  </Badge>
                )}
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {errors.slice(0, 5).map((error, index) => (
                        <div key={index} className="text-sm">{error}</div>
                      ))}
                      {errors.length > 5 && (
                        <div className="text-sm text-gray-600">
                          ... and {errors.length - 5} more errors
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview */}
              {parsedAuthors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Preview ({parsedAuthors.length} authors)
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {parsedAuthors.slice(0, 10).map((author, index) => (
                      <EnhancedCard key={index} variant="glass" className="p-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">
                            {index + 1}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {author.name}
                            </div>
                            <div className="text-xs text-gray-600 truncate">
                              {[author.email, author.organization, author.department]
                                .filter(Boolean)
                                .join(' • ')}
                            </div>
                          </div>
                        </div>
                      </EnhancedCard>
                    ))}
                    {parsedAuthors.length > 10 && (
                      <div className="text-center text-sm text-gray-500 py-2">
                        ... and {parsedAuthors.length - 10} more authors
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <EnhancedButton variant="outline" onClick={onClose}>
            Cancel
          </EnhancedButton>
          <EnhancedButton
            onClick={handleImport}
            disabled={!isValid || parsedAuthors.length === 0}
          >
            <Users className="w-4 h-4 mr-1" />
            Import {parsedAuthors.length} Author{parsedAuthors.length !== 1 ? 's' : ''}
          </EnhancedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AuthorImportDialog;