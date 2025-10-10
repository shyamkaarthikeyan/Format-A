import React, { useState } from 'react';
import { FileText, Tag, BookOpen, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import SmartInput from '@/components/ui/smart-input';
import SmartTextarea from '@/components/ui/smart-textarea';
import { keywordSuggestions, getContextualSuggestions } from '@/lib/academic-suggestions';
import type { Document, UpdateDocument } from '@shared/schema';

interface SmartDocumentFormProps {
  document: Document;
  onUpdate: (updates: UpdateDocument) => void;
  className?: string;
}

export default function SmartDocumentForm({
  document,
  onUpdate,
  className,
}: SmartDocumentFormProps) {
  const [activeField, setActiveField] = useState<string | null>(null);

  // Generate title suggestions based on content
  const getTitleSuggestions = () => {
    const suggestions = [];
    
    // Extract keywords for title suggestions
    if (document.keywords) {
      const keywords = document.keywords.split(',').map(k => k.trim());
      suggestions.push(
        `A Study on ${keywords[0]}`,
        `Analysis of ${keywords[0]} in ${keywords[1] || 'Modern Context'}`,
        `${keywords[0]}: A Comprehensive Review`
      );
    }

    // Add generic academic title patterns
    suggestions.push(
      'A Novel Approach to',
      'An Investigation into',
      'Towards Better Understanding of',
      'The Impact of',
      'A Comparative Study of'
    );

    return suggestions;
  };

  // Generate keyword suggestions based on title and abstract
  const getSmartKeywordSuggestions = () => {
    const suggestions = [...keywordSuggestions];
    
    // Extract potential keywords from title
    if (document.title) {
      const titleWords = document.title.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3)
        .filter(word => !['the', 'and', 'for', 'with', 'from', 'into', 'that', 'this'].includes(word));
      
      suggestions.unshift(...titleWords);
    }

    // Extract from abstract
    if (document.abstract) {
      const abstractWords = document.abstract.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 4)
        .slice(0, 10); // Take first 10 meaningful words
      
      suggestions.unshift(...abstractWords);
    }

    // Remove duplicates and return
    return [...new Set(suggestions)];
  };

  const validateTitle = (title: string) => {
    if (title.length < 10) return 'Title should be at least 10 characters long';
    if (title.length > 200) return 'Title should be less than 200 characters';
    if (!/[A-Z]/.test(title)) return 'Title should contain at least one capital letter';
    return null;
  };

  const validateAbstract = (abstract: string) => {
    if (abstract.length < 100) return 'Abstract should be at least 100 characters long';
    if (abstract.length > 2000) return 'Abstract should be less than 2000 characters';
    const wordCount = abstract.trim().split(/\s+/).length;
    if (wordCount < 50) return 'Abstract should contain at least 50 words';
    if (wordCount > 300) return 'Abstract should contain less than 300 words';
    return null;
  };

  const validateKeywords = (keywords: string) => {
    if (!keywords.trim()) return 'Please add at least 3 keywords';
    const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k);
    if (keywordList.length < 3) return 'Please add at least 3 keywords';
    if (keywordList.length > 10) return 'Please limit to 10 keywords maximum';
    return null;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Title */}
      <EnhancedCard variant="glass" className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-600" />
            <label className="text-sm font-medium text-gray-700">Document Title</label>
          </div>
          
          <SmartInput
            value={document.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Enter a descriptive title for your document..."
            suggestions={getTitleSuggestions()}
            validation={{
              required: true,
              custom: validateTitle,
            }}
            className="text-lg font-medium"
            onFocus={() => setActiveField('title')}
            onBlur={() => setActiveField(null)}
          />
          
          {activeField === 'title' && (
            <div className="text-xs text-gray-500 space-y-1">
              <p>💡 Tips for a good title:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Be specific and descriptive</li>
                <li>Include key terms from your research</li>
                <li>Keep it under 200 characters</li>
                <li>Avoid abbreviations and jargon</li>
              </ul>
            </div>
          )}
        </div>
      </EnhancedCard>

      {/* Abstract */}
      <EnhancedCard variant="glass" className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <label className="text-sm font-medium text-gray-700">Abstract</label>
          </div>
          
          <SmartTextarea
            value={document.abstract || ''}
            onChange={(e) => onUpdate({ abstract: e.target.value })}
            placeholder="Write a concise summary of your research, including objectives, methods, results, and conclusions..."
            suggestions={getContextualSuggestions('abstract')}
            autoExpand={true}
            minHeight={120}
            maxHeight={300}
            showWordCount={true}
            showCharCount={true}
            onFocus={() => setActiveField('abstract')}
            onBlur={() => setActiveField(null)}
          />
          
          {activeField === 'abstract' && (
            <div className="text-xs text-gray-500 space-y-1">
              <p>📝 Abstract structure:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Background:</strong> Context and motivation</li>
                <li><strong>Objective:</strong> What you aimed to achieve</li>
                <li><strong>Methods:</strong> How you conducted the research</li>
                <li><strong>Results:</strong> Key findings</li>
                <li><strong>Conclusions:</strong> Implications and significance</li>
              </ul>
            </div>
          )}
        </div>
      </EnhancedCard>

      {/* Keywords */}
      <EnhancedCard variant="glass" className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-green-600" />
            <label className="text-sm font-medium text-gray-700">Keywords</label>
          </div>
          
          <SmartInput
            value={document.keywords || ''}
            onChange={(e) => onUpdate({ keywords: e.target.value })}
            placeholder="Enter keywords separated by commas (e.g., machine learning, artificial intelligence, neural networks)"
            suggestions={getSmartKeywordSuggestions()}
            validation={{
              custom: validateKeywords,
            }}
            onFocus={() => setActiveField('keywords')}
            onBlur={() => setActiveField(null)}
          />
          
          {activeField === 'keywords' && (
            <div className="text-xs text-gray-500 space-y-1">
              <p>🏷️ Keyword guidelines:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Use 3-10 relevant keywords</li>
                <li>Include both broad and specific terms</li>
                <li>Consider terms researchers might search for</li>
                <li>Separate with commas</li>
              </ul>
            </div>
          )}
          
          {document.keywords && (
            <div className="flex flex-wrap gap-1 mt-2">
              {document.keywords.split(',').map((keyword, index) => {
                const trimmed = keyword.trim();
                if (!trimmed) return null;
                return (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                  >
                    <Tag className="w-2 h-2" />
                    {trimmed}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </EnhancedCard>

      {/* Document Settings */}
      <EnhancedCard variant="glass" className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-600" />
            <label className="text-sm font-medium text-gray-700">Document Settings</label>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Font Size */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Font Size</label>
              <select
                value={document.settings.fontSize}
                onChange={(e) => onUpdate({ 
                  settings: { ...document.settings, fontSize: e.target.value }
                })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="9pt">9pt</option>
                <option value="10pt">10pt</option>
                <option value="11pt">11pt</option>
                <option value="12pt">12pt</option>
              </select>
            </div>

            {/* Columns */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Layout</label>
              <select
                value={document.settings.columns}
                onChange={(e) => onUpdate({ 
                  settings: { ...document.settings, columns: e.target.value }
                })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="1">Single Column</option>
                <option value="2">Two Columns</option>
              </select>
            </div>

            {/* Export Format */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Export Format</label>
              <select
                value={document.settings.exportFormat}
                onChange={(e) => onUpdate({ 
                  settings: { ...document.settings, exportFormat: e.target.value as 'docx' | 'latex' }
                })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="docx">Word Document (.docx)</option>
                <option value="latex">LaTeX (.tex)</option>
              </select>
            </div>

            {/* Page Numbers */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Options</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={document.settings.includePageNumbers}
                    onChange={(e) => onUpdate({ 
                      settings: { ...document.settings, includePageNumbers: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  Include page numbers
                </label>
                
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={document.settings.includeCopyright}
                    onChange={(e) => onUpdate({ 
                      settings: { ...document.settings, includeCopyright: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  Include copyright notice
                </label>
              </div>
            </div>
          </div>
        </div>
      </EnhancedCard>
    </div>
  );
}