import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  AlertCircle,
  Clock,
  ArrowRight,
  FileText,
  Users,
  BookOpen,
  Link,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { animations, focusRing, gradients } from '@/lib/ui-utils';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import type { Document } from '@shared/schema';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'completed' | 'current' | 'pending' | 'warning';
  progress: number; // 0-100
  estimatedTime?: string;
  dependencies?: string[];
}

interface WorkflowNavigationProps {
  document: Document | null;
  activeStep?: string;
  onStepClick: (stepId: string) => void;
  onStepComplete?: (stepId: string) => void;
  className?: string;
}

export default function WorkflowNavigation({
  document,
  activeStep,
  onStepClick,
  onStepComplete,
  className,
}: WorkflowNavigationProps) {
  const [animatingStep, setAnimatingStep] = useState<string | null>(null);
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);

  // Calculate workflow steps based on document state
  const workflowSteps: WorkflowStep[] = [
    {
      id: 'document-info',
      title: 'Document Information',
      description: 'Basic document details and settings',
      icon: FileText,
      status: getDocumentInfoStatus(document),
      progress: getDocumentInfoProgress(document),
      estimatedTime: '2 min',
    },
    {
      id: 'authors',
      title: 'Authors & Affiliations',
      description: 'Add authors and their institutional details',
      icon: Users,
      status: getAuthorsStatus(document),
      progress: getAuthorsProgress(document),
      estimatedTime: '3 min',
      dependencies: ['document-info'],
    },
    {
      id: 'content',
      title: 'Document Content',
      description: 'Write and organize your paper sections',
      icon: BookOpen,
      status: getContentStatus(document),
      progress: getContentProgress(document),
      estimatedTime: '30+ min',
      dependencies: ['document-info', 'authors'],
    },
    {
      id: 'references',
      title: 'References & Citations',
      description: 'Add bibliography and citations',
      icon: Link,
      status: getReferencesStatus(document),
      progress: getReferencesProgress(document),
      estimatedTime: '5 min',
      dependencies: ['content'],
    },
    {
      id: 'finalize',
      title: 'Review & Export',
      description: 'Final review and document generation',
      icon: Settings,
      status: getFinalizeStatus(document),
      progress: getFinalizeProgress(document),
      estimatedTime: '2 min',
      dependencies: ['document-info', 'authors', 'content', 'references'],
    },
  ];

  // Handle step click with animation
  const handleStepClick = (stepId: string) => {
    if (animatingStep) return; // Prevent clicks during animation

    setAnimatingStep(stepId);
    
    // Smooth transition animation
    setTimeout(() => {
      onStepClick(stepId);
      setAnimatingStep(null);
    }, 150);
  };

  // Get status icon with animation
  const getStatusIcon = (step: WorkflowStep) => {
    const isAnimating = animatingStep === step.id;
    const baseClasses = "w-5 h-5 transition-all duration-300";

    switch (step.status) {
      case 'completed':
        return (
          <CheckCircle2 
            className={cn(
              baseClasses,
              "text-green-600",
              isAnimating && "scale-110 rotate-12"
            )} 
          />
        );
      case 'current':
        return (
          <Circle 
            className={cn(
              baseClasses,
              "text-purple-600 fill-purple-100",
              isAnimating && "scale-110 animate-pulse"
            )} 
          />
        );
      case 'warning':
        return (
          <AlertCircle 
            className={cn(
              baseClasses,
              "text-amber-600",
              isAnimating && "scale-110 animate-bounce"
            )} 
          />
        );
      default:
        return (
          <Circle 
            className={cn(
              baseClasses,
              "text-gray-400",
              isAnimating && "scale-110"
            )} 
          />
        );
    }
  };

  // Get step connector line
  const getConnectorLine = (index: number, step: WorkflowStep) => {
    if (index === workflowSteps.length - 1) return null;

    const isCompleted = step.status === 'completed';
    const nextStep = workflowSteps[index + 1];
    const isNextActive = nextStep.status === 'current' || nextStep.status === 'completed';

    return (
      <div className="flex items-center justify-center py-2">
        <div 
          className={cn(
            "w-0.5 h-8 transition-all duration-500 ease-out",
            isCompleted && isNextActive 
              ? "bg-gradient-to-b from-green-400 to-purple-400" 
              : isCompleted 
                ? "bg-green-400" 
                : "bg-gray-200"
          )}
        />
      </div>
    );
  };

  return (
    <EnhancedCard 
      variant="glass" 
      className={cn("p-6", className)}
    >
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Document Workflow
        </h3>
        <p className="text-sm text-gray-600">
          Follow these steps to create your IEEE document
        </p>
      </div>

      {/* Progress Overview */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm text-gray-600">
            {Math.round(getOverallProgress(workflowSteps))}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={cn(
              "h-2 rounded-full transition-all duration-700 ease-out",
              gradients.primary
            )}
            style={{ width: `${getOverallProgress(workflowSteps)}%` }}
          />
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="space-y-1">
        {workflowSteps.map((step, index) => {
          const Icon = step.icon;
          const isActive = activeStep === step.id;
          const isHovered = hoveredStep === step.id;
          const isClickable = isStepClickable(step, workflowSteps);

          return (
            <React.Fragment key={step.id}>
              <div
                className={cn(
                  "group relative rounded-lg p-4 transition-all duration-300 ease-out cursor-pointer",
                  animations.smooth,
                  focusRing.default,
                  isActive && "bg-purple-50 border-2 border-purple-200 shadow-md",
                  !isActive && isHovered && "bg-gray-50 shadow-sm",
                  !isClickable && "opacity-60 cursor-not-allowed",
                  isClickable && "hover:shadow-md hover:-translate-y-0.5"
                )}
                onClick={() => isClickable && handleStepClick(step.id)}
                onMouseEnter={() => setHoveredStep(step.id)}
                onMouseLeave={() => setHoveredStep(null)}
                tabIndex={isClickable ? 0 : -1}
                role="button"
                aria-label={`${step.title} - ${step.status}`}
              >
                {/* Step Content */}
                <div className="flex items-start gap-4">
                  {/* Status Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getStatusIcon(step)}
                  </div>

                  {/* Step Icon */}
                  <div className={cn(
                    "flex-shrink-0 p-2 rounded-lg transition-all duration-300",
                    step.status === 'completed' && "bg-green-100 text-green-600",
                    step.status === 'current' && "bg-purple-100 text-purple-600",
                    step.status === 'warning' && "bg-amber-100 text-amber-600",
                    step.status === 'pending' && "bg-gray-100 text-gray-400",
                    isHovered && step.status !== 'pending' && "scale-105"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Step Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={cn(
                        "font-medium transition-colors duration-200",
                        step.status === 'completed' && "text-green-800",
                        step.status === 'current' && "text-purple-800",
                        step.status === 'warning' && "text-amber-800",
                        step.status === 'pending' && "text-gray-600"
                      )}>
                        {step.title}
                      </h4>
                      
                      {step.estimatedTime && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {step.estimatedTime}
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-2">
                      {step.description}
                    </p>

                    {/* Progress Bar */}
                    {step.progress > 0 && (
                      <div className="mb-2">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={cn(
                              "h-1.5 rounded-full transition-all duration-500 ease-out",
                              step.status === 'completed' && "bg-green-400",
                              step.status === 'current' && "bg-purple-400",
                              step.status === 'warning' && "bg-amber-400",
                              step.status === 'pending' && "bg-gray-300"
                            )}
                            style={{ width: `${step.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Dependencies */}
                    {step.dependencies && step.dependencies.length > 0 && (
                      <div className="text-xs text-gray-500">
                        Requires: {step.dependencies.map(dep => 
                          workflowSteps.find(s => s.id === dep)?.title
                        ).join(', ')}
                      </div>
                    )}
                  </div>

                  {/* Navigation Arrow */}
                  {isClickable && (
                    <div className={cn(
                      "flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200",
                      isActive && "opacity-100"
                    )}>
                      <ArrowRight className="w-4 h-4 text-purple-600" />
                    </div>
                  )}
                </div>

                {/* Active Step Indicator */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-violet-600 rounded-l-lg" />
                )}
              </div>

              {/* Connector Line */}
              {getConnectorLine(index, step)}
            </React.Fragment>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex gap-2">
          <EnhancedButton
            variant="outline"
            size="sm"
            onClick={() => {
              const nextStep = getNextIncompleteStep(workflowSteps);
              if (nextStep) handleStepClick(nextStep.id);
            }}
            disabled={!getNextIncompleteStep(workflowSteps)}
            className="flex-1"
          >
            Continue Workflow
          </EnhancedButton>
          
          <EnhancedButton
            variant="ghost"
            size="sm"
            onClick={() => {
              const currentStep = workflowSteps.find(s => s.status === 'current');
              if (currentStep && onStepComplete) {
                onStepComplete(currentStep.id);
              }
            }}
            disabled={!workflowSteps.some(s => s.status === 'current')}
          >
            Mark Complete
          </EnhancedButton>
        </div>
      </div>
    </EnhancedCard>
  );
}

// Helper functions for calculating step status and progress
function getDocumentInfoStatus(document: Document | null): WorkflowStep['status'] {
  if (!document) return 'pending';
  if (document.title && document.title.trim().length > 0) return 'completed';
  return 'current';
}

function getDocumentInfoProgress(document: Document | null): number {
  if (!document) return 0;
  let progress = 0;
  if (document.title?.trim()) progress += 50;
  if (document.abstract?.trim()) progress += 30;
  if (document.keywords?.trim()) progress += 20;
  return Math.min(100, progress);
}

function getAuthorsStatus(document: Document | null): WorkflowStep['status'] {
  if (!document) return 'pending';
  if (document.authors.length === 0) return getDocumentInfoStatus(document) === 'completed' ? 'current' : 'pending';
  if (document.authors.some(author => !author.name?.trim() || (!author.department?.trim() && !author.organization?.trim()))) return 'warning';
  return 'completed';
}

function getAuthorsProgress(document: Document | null): number {
  if (!document || document.authors.length === 0) return 0;
  const totalFields = document.authors.length * 3; // name, department/organization, email
  const completedFields = document.authors.reduce((acc, author) => {
    let fields = 0;
    if (author.name?.trim()) fields++;
    if (author.department?.trim() || author.organization?.trim()) fields++;
    if (author.email?.trim()) fields++;
    return acc + fields;
  }, 0);
  return Math.round((completedFields / totalFields) * 100);
}

function getContentStatus(document: Document | null): WorkflowStep['status'] {
  if (!document) return 'pending';
  const authorsComplete = getAuthorsStatus(document) === 'completed';
  if (!authorsComplete) return 'pending';
  if (document.sections.length === 0) return 'current';
  if (document.sections.some(section => !section.title?.trim())) return 'warning';
  return 'completed';
}

function getContentProgress(document: Document | null): number {
  if (!document || document.sections.length === 0) return 0;
  const sectionsWithContent = document.sections.filter(section => 
    section.title?.trim() && section.contentBlocks.length > 0
  ).length;
  return Math.round((sectionsWithContent / document.sections.length) * 100);
}

function getReferencesStatus(document: Document | null): WorkflowStep['status'] {
  if (!document) return 'pending';
  const contentComplete = getContentStatus(document) === 'completed';
  if (!contentComplete) return 'pending';
  if (document.references.length === 0) return 'current';
  return 'completed';
}

function getReferencesProgress(document: Document | null): number {
  if (!document || document.references.length === 0) return 0;
  const completeRefs = document.references.filter(ref => 
    ref.text?.trim()
  ).length;
  return Math.round((completeRefs / document.references.length) * 100);
}

function getFinalizeStatus(document: Document | null): WorkflowStep['status'] {
  if (!document) return 'pending';
  const allComplete = [
    getDocumentInfoStatus(document),
    getAuthorsStatus(document),
    getContentStatus(document),
    getReferencesStatus(document)
  ].every(status => status === 'completed');
  
  return allComplete ? 'current' : 'pending';
}

function getFinalizeProgress(document: Document | null): number {
  if (!document) return 0;
  const statuses = [
    getDocumentInfoStatus(document),
    getAuthorsStatus(document),
    getContentStatus(document),
    getReferencesStatus(document)
  ];
  const completed = statuses.filter(status => status === 'completed').length;
  return Math.round((completed / statuses.length) * 100);
}

function getOverallProgress(steps: WorkflowStep[]): number {
  const totalProgress = steps.reduce((acc, step) => acc + step.progress, 0);
  return totalProgress / steps.length;
}

function isStepClickable(step: WorkflowStep, allSteps: WorkflowStep[]): boolean {
  if (!step.dependencies || step.dependencies.length === 0) return true;
  
  return step.dependencies.every(depId => {
    const depStep = allSteps.find(s => s.id === depId);
    return depStep?.status === 'completed';
  });
}

function getNextIncompleteStep(steps: WorkflowStep[]): WorkflowStep | null {
  return steps.find(step => 
    step.status !== 'completed' && isStepClickable(step, steps)
  ) || null;
}