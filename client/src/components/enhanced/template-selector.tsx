import React, { useState } from 'react';
import { 
  FileText, 
  BookOpen, 
  GraduationCap, 
  Users, 
  Clock, 
  Tag,
  Sparkles,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { documentTemplates, contentSnippets, type DocumentTemplate, type ContentSnippet } from '@/lib/document-templates';

interface TemplateSelectorProps {
  onSelectTemplate: (template: DocumentTemplate) => void;
  onSelectSnippet: (snippet: ContentSnippet) => void;
  onClose: () => void;
  className?: string;
}

const categoryIcons = {
  research: FileText,
  conference: Users,
  journal: BookOpen,
  thesis: GraduationCap,
};

const categoryColors = {
  research: 'from-blue-500 to-blue-600',
  conference: 'from-green-500 to-green-600',
  journal: 'from-purple-500 to-purple-600',
  thesis: 'from-orange-500 to-orange-600',
};

const snippetCategoryColors = {
  introduction: 'from-blue-500 to-blue-600',
  methodology: 'from-green-500 to-green-600',
  results: 'from-purple-500 to-purple-600',
  discussion: 'from-orange-500 to-orange-600',
  conclusion: 'from-red-500 to-red-600',
};

export default function TemplateSelector({
  onSelectTemplate,
  onSelectSnippet,
  onClose,
  className,
}: TemplateSelectorProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'snippets'>('templates');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredTemplates = selectedCategory === 'all' 
    ? documentTemplates 
    : documentTemplates.filter(t => t.category === selectedCategory);

  const filteredSnippets = selectedCategory === 'all'
    ? contentSnippets
    : contentSnippets.filter(s => s.category === selectedCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <EnhancedCard
        variant="elevated"
        className={cn(
          'relative w-full max-w-4xl max-h-[80vh] mx-4 overflow-hidden',
          className
        )}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-violet-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Content Library</h2>
                <p className="text-sm text-gray-600">Choose from templates and snippets to get started quickly</p>
              </div>
            </div>
            
            <EnhancedButton
              variant="ghost"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </EnhancedButton>
          </div>

          {/* Tabs */}
          <div className="flex mt-4 bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('templates')}
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200',
                activeTab === 'templates'
                  ? 'bg-purple-100 text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Document Templates
            </button>
            <button
              onClick={() => setActiveTab('snippets')}
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200',
                activeTab === 'snippets'
                  ? 'bg-purple-100 text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Content Snippets
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[60vh]">
          {/* Sidebar - Categories */}
          <div className="w-64 border-r border-gray-200 bg-gray-50 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Categories</h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm rounded-md transition-colors',
                  selectedCategory === 'all'
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                All {activeTab === 'templates' ? 'Templates' : 'Snippets'}
              </button>
              
              {activeTab === 'templates' ? (
                Object.entries(categoryIcons).map(([category, Icon]) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2',
                      selectedCategory === category
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))
              ) : (
                ['introduction', 'methodology', 'results', 'discussion', 'conclusion'].map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm rounded-md transition-colors',
                      selectedCategory === category
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'templates' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredTemplates.map(template => {
                  const Icon = categoryIcons[template.category];
                  return (
                    <EnhancedCard
                      key={template.id}
                      variant="interactive"
                      className="p-4 cursor-pointer hover:shadow-lg transition-all duration-200"
                      onClick={() => onSelectTemplate(template)}
                    >
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center text-white bg-gradient-to-br',
                            categoryColors[template.category]
                          )}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{template.name}</h3>
                            <p className="text-xs text-gray-500 capitalize">{template.category}</p>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {template.description}
                        </p>

                        {/* Metadata */}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {template.sections.length} sections
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {template.estimatedLength}
                          </div>
                        </div>

                        {/* Keywords */}
                        <div className="flex flex-wrap gap-1">
                          {template.suggestedKeywords.slice(0, 3).map(keyword => (
                            <span
                              key={keyword}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded"
                            >
                              <Tag className="w-2 h-2" />
                              {keyword}
                            </span>
                          ))}
                        </div>

                        {/* Action */}
                        <div className="pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1 text-xs text-purple-600 font-medium">
                            <Plus className="w-3 h-3" />
                            Use this template
                          </div>
                        </div>
                      </div>
                    </EnhancedCard>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSnippets.map(snippet => (
                  <EnhancedCard
                    key={snippet.id}
                    variant="interactive"
                    className="p-4 cursor-pointer hover:shadow-md transition-all duration-200"
                    onClick={() => onSelectSnippet(snippet)}
                  >
                    <div className="space-y-2">
                      {/* Header */}
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center text-white bg-gradient-to-br text-xs font-bold',
                          snippetCategoryColors[snippet.category]
                        )}>
                          {snippet.category.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{snippet.name}</h4>
                          <p className="text-xs text-gray-500 capitalize">{snippet.category}</p>
                        </div>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                          {snippet.type}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-600">{snippet.description}</p>

                      {/* Preview */}
                      <div className="bg-gray-50 rounded p-3 text-xs text-gray-700 font-mono">
                        {snippet.content.substring(0, 120)}...
                      </div>

                      {/* Action */}
                      <div className="flex items-center gap-1 text-xs text-purple-600 font-medium">
                        <Plus className="w-3 h-3" />
                        Insert snippet
                      </div>
                    </div>
                  </EnhancedCard>
                ))}
              </div>
            )}
          </div>
        </div>
      </EnhancedCard>
    </div>
  );
}