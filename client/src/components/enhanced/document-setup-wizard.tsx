import React, { useState } from 'react';
import { 
  FileText, 
  Users, 
  BookOpen, 
  Settings, 
  ChevronRight, 
  ChevronLeft,
  Check,
  Sparkles,
  Target,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import SmartDocumentForm from './smart-document-form';
import SmartAuthorForm from './smart-author-form';
import TemplateSelector from './template-selector';
import { documentTemplates, applyTemplate, type DocumentTemplate } from '@/lib/document-templates';
import type { Document, InsertDocument } from '@shared/schema';

interface DocumentSetupWizardProps {
  onComplete: (document: InsertDocument) => void;
  onCancel: () => void;
  className?: string;
}

type WizardStep = 'template' | 'basic-info' | 'authors' | 'structure' | 'review';

interface WizardState {
  currentStep: WizardStep;
  document: Partial<Document>;
  selectedTemplate: DocumentTemplate | null;
  completedSteps: Set<WizardStep>;
}

export default function DocumentSetupWizard({
  onComplete,
  onCancel,
  className,
}: DocumentSetupWizardProps) {
  const [state, setState] = useState<WizardState>({
    currentStep: 'template',
    document: {
      title: '',
      abstract: null,
      keywords: null,
      authors: [],
      sections: [],
      references: [],
      figures: [],
      settings: {
        fontSize: '10pt',
        columns: '2',
        exportFormat: 'docx',
        includePageNumbers: true,
        includeCopyright: false,
      },
    },
    selectedTemplate: null,
    completedSteps: new Set(),
  });

  const steps = [
    {
      id: 'template' as WizardStep,
      label: 'Choose Template',
      description: 'Select a document template',
      icon: Sparkles,
      status: state.completedSteps.has('template') ? 'completed' : 
              state.currentStep === 'template' ? 'current' : 'pending',
    },
    {
      id: 'basic-info' as WizardStep,
      label: 'Basic Information',
      description: 'Title, abstract, and keywords',
      icon: FileText,
      status: state.completedSteps.has('basic-info') ? 'completed' : 
              state.currentStep === 'basic-info' ? 'current' : 'pending',
    },
    {
      id: 'authors' as WizardStep,
      label: 'Authors',
      description: 'Add document authors',
      icon: Users,
      status: state.completedSteps.has('authors') ? 'completed' : 
              state.currentStep === 'authors' ? 'current' : 'pending',
    },
    {
      id: 'structure' as WizardStep,
      label: 'Document Structure',
      description: 'Configure sections and settings',
      icon: BookOpen,
      status: state.completedSteps.has('structure') ? 'completed' : 
              state.currentStep === 'structure' ? 'current' : 'pending',
    },
    {
      id: 'review' as WizardStep,
      label: 'Review & Create',
      description: 'Review and finalize',
      icon: Target,
      status: state.completedSteps.has('review') ? 'completed' : 
              state.currentStep === 'review' ? 'current' : 'pending',
    },
  ];

  const updateDocument = (updates: Partial<Document>) => {
    setState(prev => ({
      ...prev,
      document: { ...prev.document, ...updates },
    }));
  };

  const markStepCompleted = (step: WizardStep) => {
    setState(prev => ({
      ...prev,
      completedSteps: new Set([...prev.completedSteps, step]),
    }));
  };

  const goToStep = (step: WizardStep) => {
    setState(prev => ({ ...prev, currentStep: step }));
  };

  const nextStep = () => {
    const currentIndex = steps.findIndex(s => s.id === state.currentStep);
    if (currentIndex < steps.length - 1) {
      markStepCompleted(state.currentStep);
      goToStep(steps[currentIndex + 1].id);
    }
  };

  const prevStep = () => {
    const currentIndex = steps.findIndex(s => s.id === state.currentStep);
    if (currentIndex > 0) {
      goToStep(steps[currentIndex - 1].id);
    }
  };

  const canProceed = () => {
    switch (state.currentStep) {
      case 'template':
        return state.selectedTemplate !== null;
      case 'basic-info':
        return state.document.title && state.document.title.trim().length > 0;
      case 'authors':
        return state.document.authors && state.document.authors.length > 0;
      case 'structure':
        return true; // Structure is optional
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const handleTemplateSelect = (template: DocumentTemplate) => {
    const templateData = applyTemplate(template);
    setState(prev => ({
      ...prev,
      selectedTemplate: template,
      document: { ...prev.document, ...templateData },
    }));
  };

  const handleComplete = () => {
    const finalDocument: InsertDocument = {
      title: state.document.title || '',
      abstract: state.document.abstract || null,
      keywords: state.document.keywords || null,
      authors: state.document.authors || [],
      sections: state.document.sections || [],
      references: state.document.references || [],
      figures: state.document.figures || [],
      settings: state.document.settings || {
        fontSize: '10pt',
        columns: '2',
        exportFormat: 'docx',
        includePageNumbers: true,
        includeCopyright: false,
      },
    };
    
    onComplete(finalDocument);
  };

  const renderStepContent = () => {
    switch (state.currentStep) {
      case 'template':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold text-gray-900">Choose Your Starting Point</h2>
              <p className="text-gray-600">
                Select a template that matches your document type, or start with a blank document
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Blank Document Option */}
              <EnhancedCard
                variant="interactive"
                className={cn(
                  'p-6 cursor-pointer transition-all duration-200',
                  !state.selectedTemplate && 'ring-2 ring-purple-500 bg-purple-50'
                )}
                onClick={() => setState(prev => ({ ...prev, selectedTemplate: null }))}
              >
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                    <FileText className="w-8 h-8 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Blank Document</h3>
                    <p className="text-sm text-gray-600">Start from scratch</p>
                  </div>
                </div>
              </EnhancedCard>

              {/* Template Options */}
              {documentTemplates.slice(0, 3).map(template => {
                const isSelected = state.selectedTemplate?.id === template.id;
                return (
                  <EnhancedCard
                    key={template.id}
                    variant="interactive"
                    className={cn(
                      'p-6 cursor-pointer transition-all duration-200',
                      isSelected && 'ring-2 ring-purple-500 bg-purple-50'
                    )}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{template.name}</h3>
                          <p className="text-xs text-gray-500 capitalize">{template.category}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{template.description}</p>
                      <div className="text-xs text-gray-500">
                        {template.sections.length} sections • {template.estimatedLength}
                      </div>
                    </div>
                  </EnhancedCard>
                );
              })}
            </div>

            <div className="text-center">
              <EnhancedButton
                variant="ghost"
                onClick={() => {
                  // Show full template selector
                }}
                className="text-purple-600"
              >
                View all templates
              </EnhancedButton>
            </div>
          </div>
        );

      case 'basic-info':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold text-gray-900">Document Information</h2>
              <p className="text-gray-600">
                Provide the basic information about your document
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <SmartDocumentForm
                document={state.document as Document}
                onUpdate={updateDocument}
              />
            </div>
          </div>
        );

      case 'authors':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold text-gray-900">Document Authors</h2>
              <p className="text-gray-600">
                Add the authors and their affiliations
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <SmartAuthorForm
                authors={state.document.authors || []}
                onUpdate={(authors) => updateDocument({ authors })}
              />
            </div>
          </div>
        );

      case 'structure':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold text-gray-900">Document Structure</h2>
              <p className="text-gray-600">
                Review and customize your document structure
              </p>
            </div>

            <div className="max-w-2xl mx-auto space-y-4">
              {state.selectedTemplate && (
                <EnhancedCard variant="glass" className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-gray-900">Template Structure</h3>
                  </div>
                  <div className="space-y-2">
                    {state.selectedTemplate.sections.map((section, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </span>
                        <span className="text-gray-700">{section.title}</span>
                      </div>
                    ))}
                  </div>
                </EnhancedCard>
              )}

              <EnhancedCard variant="glass" className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Settings className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Document Settings</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Font Size:</span>
                    <span className="ml-2 font-medium">{state.document.settings?.fontSize}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Layout:</span>
                    <span className="ml-2 font-medium">
                      {state.document.settings?.columns === '2' ? 'Two Columns' : 'Single Column'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Format:</span>
                    <span className="ml-2 font-medium">
                      {state.document.settings?.exportFormat?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Page Numbers:</span>
                    <span className="ml-2 font-medium">
                      {state.document.settings?.includePageNumbers ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </EnhancedCard>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold text-gray-900">Review & Create</h2>
              <p className="text-gray-600">
                Review your document setup and create your new document
              </p>
            </div>

            <div className="max-w-2xl mx-auto space-y-4">
              {/* Document Summary */}
              <EnhancedCard variant="gradient" className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {state.document.title || 'Untitled Document'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {state.selectedTemplate?.name || 'Blank Document'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Authors:</span>
                      <span className="ml-2 font-medium">{state.document.authors?.length || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Sections:</span>
                      <span className="ml-2 font-medium">{state.document.sections?.length || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Abstract:</span>
                      <span className="ml-2 font-medium">
                        {state.document.abstract ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Keywords:</span>
                      <span className="ml-2 font-medium">
                        {state.document.keywords ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              </EnhancedCard>

              {/* Success Message */}
              <EnhancedCard variant="glass" className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-green-800">Ready to Create</h4>
                    <p className="text-sm text-green-700">
                      Your document is configured and ready to be created
                    </p>
                  </div>
                </div>
              </EnhancedCard>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <EnhancedCard
        variant="elevated"
        className={cn(
          'w-full max-w-4xl max-h-[90vh] mx-4 overflow-hidden',
          className
        )}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-violet-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Document Setup Wizard</h1>
                <p className="text-sm text-gray-600">Create your IEEE document step by step</p>
              </div>
            </div>
            
            <EnhancedButton
              variant="ghost"
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </EnhancedButton>
          </div>

          {/* Progress Indicator */}
          <ProgressIndicator
            steps={steps}
            orientation="horizontal"
            showLabels={false}
          />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <EnhancedButton
              variant="ghost"
              onClick={prevStep}
              disabled={state.currentStep === 'template'}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </EnhancedButton>

            <div className="flex items-center gap-3">
              <EnhancedButton
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </EnhancedButton>

              {state.currentStep === 'review' ? (
                <EnhancedButton
                  onClick={handleComplete}
                  className="flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Create Document
                </EnhancedButton>
              ) : (
                <EnhancedButton
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </EnhancedButton>
              )}
            </div>
          </div>
        </div>
      </EnhancedCard>
    </div>
  );
}