import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  User, 
  Building, 
  Mail, 
  MapPin, 
  GripVertical, 
  Edit3, 
  Trash2, 
  Copy,
  ChevronDown,
  ChevronUp,
  Phone,
  Globe,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Author } from '@shared/schema';

interface AuthorCardProps {
  author: Author;
  index: number;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  className?: string;
}

export function AuthorCard({
  author,
  index,
  isExpanded = false,
  onToggleExpanded,
  onEdit,
  onDelete,
  onDuplicate,
  className
}: AuthorCardProps) {
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

  // Generate initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get author's primary affiliation
  const getPrimaryAffiliation = () => {
    if (author.organization && author.department) {
      return `${author.department}, ${author.organization}`;
    }
    return author.organization || author.department || 'No affiliation';
  };

  // Get location string
  const getLocation = () => {
    if (author.city && author.state) {
      return `${author.city}, ${author.state}`;
    }
    return author.city || author.state || '';
  };

  // Get custom field by name
  const getCustomField = (fieldName: string) => {
    return author.customFields.find(field => 
      field.name.toLowerCase() === fieldName.toLowerCase()
    )?.value;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group transition-all duration-200',
        isDragging && 'opacity-50 scale-105 z-50',
        className
      )}
    >
      <EnhancedCard
        variant={isDragging ? 'elevated' : 'glass'}
        className={cn(
          'overflow-hidden transition-all duration-200',
          isDragging && 'shadow-2xl shadow-purple-500/25',
          isExpanded && 'ring-2 ring-purple-200'
        )}
      >
        {/* Main Card Content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors mt-1"
            >
              <GripVertical className="w-4 h-4" />
            </div>

            {/* Author Avatar */}
            <Avatar className="w-12 h-12 border-2 border-purple-100">
              <AvatarImage src={getCustomField('photo')} alt={author.name} />
              <AvatarFallback className="bg-gradient-to-br from-purple-100 to-violet-100 text-purple-700 font-semibold">
                {getInitials(author.name || 'A')}
              </AvatarFallback>
            </Avatar>

            {/* Author Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Author Name and Position */}
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {author.name || 'Unnamed Author'}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      #{index + 1}
                    </Badge>
                  </div>

                  {/* Primary Affiliation */}
                  <p className="text-sm text-gray-600 truncate mb-2">
                    {getPrimaryAffiliation()}
                  </p>

                  {/* Quick Info Row */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {author.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        <span className="truncate max-w-32">{author.email}</span>
                      </div>
                    )}
                    {getLocation() && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{getLocation()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onToggleExpanded && (
                    <EnhancedButton
                      variant="ghost"
                      size="xs"
                      onClick={onToggleExpanded}
                      className="h-7 w-7 p-0 text-gray-500"
                    >
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </EnhancedButton>
                  )}
                  
                  {onEdit && (
                    <EnhancedButton
                      variant="ghost"
                      size="xs"
                      onClick={onEdit}
                      className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700"
                    >
                      <Edit3 className="w-3 h-3" />
                    </EnhancedButton>
                  )}
                  
                  {onDuplicate && (
                    <EnhancedButton
                      variant="ghost"
                      size="xs"
                      onClick={onDuplicate}
                      className="h-7 w-7 p-0 text-green-500 hover:text-green-700"
                    >
                      <Copy className="w-3 h-3" />
                    </EnhancedButton>
                  )}
                  
                  {onDelete && (
                    <EnhancedButton
                      variant="ghost"
                      size="xs"
                      onClick={onDelete}
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </EnhancedButton>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <>
            <Separator />
            <div className="p-4 bg-gray-50/50 space-y-4">
              {/* Contact Information */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Contact Information
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {author.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <a 
                        href={`mailto:${author.email}`}
                        className="text-blue-600 hover:text-blue-800 truncate"
                      >
                        {author.email}
                      </a>
                    </div>
                  )}
                  
                  {getCustomField('phone') && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">{getCustomField('phone')}</span>
                    </div>
                  )}
                  
                  {getCustomField('website') && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <a 
                        href={getCustomField('website')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 truncate"
                      >
                        {getCustomField('website')}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Institutional Affiliation */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Institutional Affiliation
                </h4>
                
                <div className="space-y-2 text-sm">
                  {author.department && (
                    <div>
                      <span className="text-gray-500">Department:</span>
                      <span className="ml-2 text-gray-700">{author.department}</span>
                    </div>
                  )}
                  
                  {author.organization && (
                    <div>
                      <span className="text-gray-500">Organization:</span>
                      <span className="ml-2 text-gray-700">{author.organization}</span>
                    </div>
                  )}
                  
                  {getLocation() && (
                    <div>
                      <span className="text-gray-500">Location:</span>
                      <span className="ml-2 text-gray-700">{getLocation()}</span>
                    </div>
                  )}
                  
                  {getCustomField('position') && (
                    <div>
                      <span className="text-gray-500">Position:</span>
                      <span className="ml-2 text-gray-700">{getCustomField('position')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              {author.customFields.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Additional Information
                  </h4>
                  
                  <div className="space-y-2 text-sm">
                    {author.customFields
                      .filter(field => !['phone', 'website', 'position', 'photo'].includes(field.name.toLowerCase()))
                      .map((field) => (
                        <div key={field.id}>
                          <span className="text-gray-500 capitalize">{field.name}:</span>
                          <span className="ml-2 text-gray-700">{field.value}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-purple-500/10 border-2 border-purple-500 border-dashed rounded-lg pointer-events-none" />
        )}
      </EnhancedCard>
    </div>
  );
}

export default AuthorCard;