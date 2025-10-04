import React, { useState } from 'react';
import { 
  Building, 
  Users, 
  Plus, 
  Star, 
  Search,
  Filter,
  BookOpen,
  Award,
  Globe
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Author } from '@shared/schema';

interface AuthorTemplate {
  id: string;
  name: string;
  category: 'university' | 'research' | 'industry' | 'government';
  organization: string;
  department?: string;
  city?: string;
  state?: string;
  country?: string;
  website?: string;
  commonPositions: string[];
  emailDomain?: string;
  isPopular?: boolean;
}

interface AuthorTemplateSystemProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: AuthorTemplate) => void;
}

const authorTemplates: AuthorTemplate[] = [
  // Universities
  {
    id: 'mit',
    name: 'Massachusetts Institute of Technology',
    category: 'university',
    organization: 'Massachusetts Institute of Technology',
    city: 'Cambridge',
    state: 'MA',
    country: 'USA',
    website: 'https://mit.edu',
    emailDomain: '@mit.edu',
    commonPositions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Research Scientist', 'Postdoc', 'Graduate Student'],
    isPopular: true
  },
  {
    id: 'stanford',
    name: 'Stanford University',
    category: 'university',
    organization: 'Stanford University',
    city: 'Stanford',
    state: 'CA',
    country: 'USA',
    website: 'https://stanford.edu',
    emailDomain: '@stanford.edu',
    commonPositions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Research Scientist', 'Postdoc'],
    isPopular: true
  },
  {
    id: 'berkeley',
    name: 'UC Berkeley',
    category: 'university',
    organization: 'University of California, Berkeley',
    city: 'Berkeley',
    state: 'CA',
    country: 'USA',
    website: 'https://berkeley.edu',
    emailDomain: '@berkeley.edu',
    commonPositions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Research Scientist'],
    isPopular: true
  },
  {
    id: 'cmu',
    name: 'Carnegie Mellon University',
    category: 'university',
    organization: 'Carnegie Mellon University',
    city: 'Pittsburgh',
    state: 'PA',
    country: 'USA',
    website: 'https://cmu.edu',
    emailDomain: '@cmu.edu',
    commonPositions: ['Professor', 'Associate Professor', 'Assistant Professor', 'Research Scientist'],
    isPopular: true
  },
  {
    id: 'cambridge',
    name: 'University of Cambridge',
    category: 'university',
    organization: 'University of Cambridge',
    city: 'Cambridge',
    country: 'UK',
    website: 'https://cam.ac.uk',
    emailDomain: '@cam.ac.uk',
    commonPositions: ['Professor', 'Reader', 'Senior Lecturer', 'Lecturer', 'Research Associate'],
    isPopular: true
  },
  {
    id: 'oxford',
    name: 'University of Oxford',
    category: 'university',
    organization: 'University of Oxford',
    city: 'Oxford',
    country: 'UK',
    website: 'https://ox.ac.uk',
    emailDomain: '@ox.ac.uk',
    commonPositions: ['Professor', 'Reader', 'Senior Lecturer', 'Lecturer', 'Research Fellow'],
    isPopular: true
  },

  // Research Institutions
  {
    id: 'google-research',
    name: 'Google Research',
    category: 'research',
    organization: 'Google Research',
    city: 'Mountain View',
    state: 'CA',
    country: 'USA',
    website: 'https://research.google',
    emailDomain: '@google.com',
    commonPositions: ['Research Scientist', 'Senior Research Scientist', 'Principal Research Scientist', 'Research Engineer'],
    isPopular: true
  },
  {
    id: 'microsoft-research',
    name: 'Microsoft Research',
    category: 'research',
    organization: 'Microsoft Research',
    city: 'Redmond',
    state: 'WA',
    country: 'USA',
    website: 'https://research.microsoft.com',
    emailDomain: '@microsoft.com',
    commonPositions: ['Principal Research Manager', 'Senior Principal Research Manager', 'Research Scientist', 'Principal Research Scientist'],
    isPopular: true
  },
  {
    id: 'openai',
    name: 'OpenAI',
    category: 'research',
    organization: 'OpenAI',
    city: 'San Francisco',
    state: 'CA',
    country: 'USA',
    website: 'https://openai.com',
    emailDomain: '@openai.com',
    commonPositions: ['Research Scientist', 'Senior Research Scientist', 'Research Engineer', 'Applied AI Researcher'],
    isPopular: true
  },
  {
    id: 'deepmind',
    name: 'DeepMind',
    category: 'research',
    organization: 'DeepMind',
    city: 'London',
    country: 'UK',
    website: 'https://deepmind.com',
    emailDomain: '@deepmind.com',
    commonPositions: ['Research Scientist', 'Senior Research Scientist', 'Staff Research Scientist', 'Research Engineer'],
    isPopular: true
  },

  // Government Labs
  {
    id: 'nist',
    name: 'NIST',
    category: 'government',
    organization: 'National Institute of Standards and Technology',
    city: 'Gaithersburg',
    state: 'MD',
    country: 'USA',
    website: 'https://nist.gov',
    emailDomain: '@nist.gov',
    commonPositions: ['Research Scientist', 'Research Engineer', 'Research Physicist', 'Research Chemist'],
  },
  {
    id: 'nasa-jpl',
    name: 'NASA JPL',
    category: 'government',
    organization: 'NASA Jet Propulsion Laboratory',
    city: 'Pasadena',
    state: 'CA',
    country: 'USA',
    website: 'https://jpl.nasa.gov',
    emailDomain: '@jpl.nasa.gov',
    commonPositions: ['Research Scientist', 'Principal Engineer', 'Senior Research Scientist', 'Technical Group Supervisor'],
  },

  // Industry
  {
    id: 'apple',
    name: 'Apple',
    category: 'industry',
    organization: 'Apple Inc.',
    city: 'Cupertino',
    state: 'CA',
    country: 'USA',
    website: 'https://apple.com',
    emailDomain: '@apple.com',
    commonPositions: ['Machine Learning Engineer', 'Senior Machine Learning Engineer', 'Research Scientist', 'Software Engineer'],
  },
  {
    id: 'meta',
    name: 'Meta',
    category: 'industry',
    organization: 'Meta Platforms, Inc.',
    city: 'Menlo Park',
    state: 'CA',
    country: 'USA',
    website: 'https://meta.com',
    emailDomain: '@meta.com',
    commonPositions: ['Research Scientist', 'Senior Research Scientist', 'Research Engineer', 'Software Engineer'],
  },
];

export function AuthorTemplateSystem({ 
  isOpen, 
  onClose, 
  onSelectTemplate 
}: AuthorTemplateSystemProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredTemplates = React.useMemo(() => {
    return authorTemplates.filter(template => {
      const matchesSearch = !searchQuery || 
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.organization.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const popularTemplates = filteredTemplates.filter(t => t.isPopular);
  const otherTemplates = filteredTemplates.filter(t => !t.isPopular);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'university': return <BookOpen className="w-4 h-4" />;
      case 'research': return <Award className="w-4 h-4" />;
      case 'industry': return <Building className="w-4 h-4" />;
      case 'government': return <Globe className="w-4 h-4" />;
      default: return <Building className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'university': return 'bg-blue-100 text-blue-700';
      case 'research': return 'bg-purple-100 text-purple-700';
      case 'industry': return 'bg-green-100 text-green-700';
      case 'government': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleSelectTemplate = (template: AuthorTemplate) => {
    onSelectTemplate(template);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Author Templates
          </DialogTitle>
          <DialogDescription>
            Choose from pre-configured institutional templates to quickly add authors.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search institutions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="university">Universities</TabsTrigger>
                <TabsTrigger value="research">Research</TabsTrigger>
                <TabsTrigger value="industry">Industry</TabsTrigger>
                <TabsTrigger value="government">Government</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Popular Templates */}
          {popularTemplates.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <h3 className="font-medium text-gray-900">Popular Institutions</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {popularTemplates.map((template) => (
                  <EnhancedCard
                    key={template.id}
                    variant="glass"
                    className="p-4 cursor-pointer hover:ring-2 hover:ring-purple-200 transition-all"
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-violet-100 rounded-lg flex items-center justify-center">
                        {getCategoryIcon(template.category)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900 truncate">
                            {template.name}
                          </h4>
                          <Badge className={getCategoryColor(template.category)}>
                            {template.category}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 truncate mb-2">
                          {template.organization}
                        </p>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {template.city && template.state && (
                            <span>{template.city}, {template.state}</span>
                          )}
                          {template.city && template.country && !template.state && (
                            <span>{template.city}, {template.country}</span>
                          )}
                          {template.emailDomain && (
                            <span>• {template.emailDomain}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </EnhancedCard>
                ))}
              </div>
            </div>
          )}

          {/* Other Templates */}
          {otherTemplates.length > 0 && (
            <>
              {popularTemplates.length > 0 && <Separator />}
              
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">All Institutions</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {otherTemplates.map((template) => (
                    <EnhancedCard
                      key={template.id}
                      variant="glass"
                      className="p-3 cursor-pointer hover:ring-2 hover:ring-purple-200 transition-all"
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded flex items-center justify-center">
                          {getCategoryIcon(template.category)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-1">
                            <h4 className="font-medium text-sm text-gray-900 truncate">
                              {template.name}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {template.category}
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-gray-600 truncate">
                            {template.city && template.state 
                              ? `${template.city}, ${template.state}`
                              : template.city && template.country
                              ? `${template.city}, ${template.country}`
                              : template.country
                            }
                          </p>
                        </div>
                      </div>
                    </EnhancedCard>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* No Results */}
          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">No templates found</h3>
              <p className="text-sm text-gray-600">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <EnhancedButton variant="outline" onClick={onClose}>
            Cancel
          </EnhancedButton>
          <EnhancedButton
            variant="ghost"
            onClick={() => {
              // Create a custom template
              const customTemplate: AuthorTemplate = {
                id: 'custom',
                name: 'Custom Institution',
                category: 'university',
                organization: '',
                commonPositions: ['Professor', 'Associate Professor', 'Assistant Professor']
              };
              handleSelectTemplate(customTemplate);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Create Custom
          </EnhancedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AuthorTemplateSystem;