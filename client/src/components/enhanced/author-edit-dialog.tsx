import React, { useState, useEffect } from 'react';
import { 
  User, 
  Building, 
  Mail, 
  MapPin, 
  Phone, 
  Globe, 
  Plus, 
  X,
  Save,
  Camera
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import SmartInput from '@/components/ui/smart-input';
import SmartTextarea from '@/components/ui/smart-textarea';
import { institutionSuggestions, departmentSuggestions } from '@/lib/academic-suggestions';
import type { Author, CustomField } from '@shared/schema';

interface AuthorEditDialogProps {
  author: Author;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Author>) => void;
}

export function AuthorEditDialog({ 
  author, 
  isOpen, 
  onClose, 
  onSave 
}: AuthorEditDialogProps) {
  const [formData, setFormData] = useState<Author>(author);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData(author);
    setErrors({});
  }, [author]);

  const updateField = (field: keyof Author, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addCustomField = () => {
    const newField: CustomField = {
      id: `field_${Date.now()}`,
      name: '',
      value: '',
    };
    updateField('customFields', [...formData.customFields, newField]);
  };

  const updateCustomField = (fieldId: string, updates: Partial<CustomField>) => {
    updateField('customFields', 
      formData.customFields.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    );
  };

  const removeCustomField = (fieldId: string) => {
    updateField('customFields', 
      formData.customFields.filter(field => field.id !== fieldId)
    );
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Author name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPhotoUrl = () => {
    return formData.customFields.find(field => 
      field.name.toLowerCase() === 'photo'
    )?.value;
  };

  const setPhotoUrl = (url: string) => {
    const existingPhoto = formData.customFields.find(field => 
      field.name.toLowerCase() === 'photo'
    );

    if (existingPhoto) {
      updateCustomField(existingPhoto.id, { value: url });
    } else {
      const photoField: CustomField = {
        id: `field_${Date.now()}`,
        name: 'photo',
        value: url,
      };
      updateField('customFields', [...formData.customFields, photoField]);
    }
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Edit Author
          </DialogTitle>
          <DialogDescription>
            Update author information and institutional details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Section */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center gap-2">
              <Avatar className="w-20 h-20 border-2 border-purple-100">
                <AvatarImage src={getPhotoUrl()} alt={formData.name} />
                <AvatarFallback className="bg-gradient-to-br from-purple-100 to-violet-100 text-purple-700 font-semibold text-lg">
                  {getInitials(formData.name || 'A')}
                </AvatarFallback>
              </Avatar>
              
              <EnhancedButton
                variant="outline"
                size="xs"
                onClick={() => {
                  const url = prompt('Enter photo URL:');
                  if (url) setPhotoUrl(url);
                }}
                className="text-xs"
              >
                <Camera className="w-3 h-3 mr-1" />
                Photo
              </EnhancedButton>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium">
                  Full Name *
                </Label>
                <SmartInput
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Enter full name"
                  validation={{
                    required: true,
                    minLength: 2,
                  }}
                  error={errors.name}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <SmartInput
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="author@university.edu"
                  suggestions={getEmailSuggestions(formData.email || '')}
                  validation={{
                    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  }}
                  error={errors.email}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Institutional Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Building className="w-4 h-4" />
              Institutional Affiliation
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="organization" className="text-sm font-medium">
                  Organization/Institution
                </Label>
                <SmartInput
                  id="organization"
                  value={formData.organization || ''}
                  onChange={(e) => updateField('organization', e.target.value)}
                  placeholder="University or Organization"
                  suggestions={institutionSuggestions}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="department" className="text-sm font-medium">
                  Department/School
                </Label>
                <SmartInput
                  id="department"
                  value={formData.department || ''}
                  onChange={(e) => updateField('department', e.target.value)}
                  placeholder="Department or School"
                  suggestions={departmentSuggestions}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="city" className="text-sm font-medium">
                  City
                </Label>
                <SmartInput
                  id="city"
                  value={formData.city || ''}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="City"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="state" className="text-sm font-medium">
                  State/Country
                </Label>
                <SmartInput
                  id="state"
                  value={formData.state || ''}
                  onChange={(e) => updateField('state', e.target.value)}
                  placeholder="State or Country"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Custom Fields */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">
                Additional Information
              </h3>
              <EnhancedButton
                variant="outline"
                size="sm"
                onClick={addCustomField}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Field
              </EnhancedButton>
            </div>

            {formData.customFields.length === 0 ? (
              <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                <p className="text-sm">No additional fields added</p>
                <p className="text-xs text-gray-400 mt-1">
                  Add custom fields for position, phone, website, etc.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {formData.customFields.map((field) => (
                  <div key={field.id} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <SmartInput
                        value={field.name}
                        onChange={(e) => updateCustomField(field.id, { name: e.target.value })}
                        placeholder="Field name (e.g., Position, Phone, Website)"
                        className="mb-2"
                      />
                      <SmartInput
                        value={field.value}
                        onChange={(e) => updateCustomField(field.id, { value: e.target.value })}
                        placeholder="Field value"
                      />
                    </div>
                    <EnhancedButton
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCustomField(field.id)}
                      className="text-red-500 hover:text-red-700 mt-1"
                    >
                      <X className="w-4 h-4" />
                    </EnhancedButton>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <EnhancedButton
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </EnhancedButton>
          <EnhancedButton
            onClick={handleSave}
            className="ml-2"
          >
            <Save className="w-4 h-4 mr-1" />
            Save Changes
          </EnhancedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AuthorEditDialog;