import React, { Suspense, lazy } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { LazyComponent } from '@/components/ui/lazy-component';

// Lazy load non-critical components
const LazySettingsPanel = lazy(() => 
  import('./settings-panel').then(module => ({ default: module.SettingsPanel }))
);

const LazyAuthorManagement = lazy(() => 
  import('./author-management').then(module => ({ default: module.AuthorManagement }))
);

const LazySmartReferenceSystem = lazy(() => 
  import('./smart-reference-system').then(module => ({ default: module.SmartReferenceSystem }))
);

const LazyDocumentStructureVisualizer = lazy(() => 
  import('./document-structure-visualizer').then(module => ({ default: module.DocumentStructureVisualizer }))
);

const LazyTemplateSelector = lazy(() => 
  import('./template-selector').then(module => ({ default: module.TemplateSelector }))
);

const LazyAnnotationSystem = lazy(() => 
  import('./annotation-system').then(module => ({ default: module.AnnotationSystem }))
);

// Fallback component for lazy loading
const LazyLoadingFallback = ({ name }: { name: string }) => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center space-y-3">
      <LoadingSpinner size="md" />
      <p className="text-sm text-gray-600">Loading {name}...</p>
    </div>
  </div>
);

// Lazy component wrappers with error boundaries
export const LazySettingsPanelWrapper = React.memo<any>((props) => (
  <LazyComponent threshold={0.1} rootMargin="100px">
    <Suspense fallback={<LazyLoadingFallback name="Settings Panel" />}>
      <LazySettingsPanel {...props} />
    </Suspense>
  </LazyComponent>
));

export const LazyAuthorManagementWrapper = React.memo<any>((props) => (
  <LazyComponent threshold={0.1} rootMargin="100px">
    <Suspense fallback={<LazyLoadingFallback name="Author Management" />}>
      <LazyAuthorManagement {...props} />
    </Suspense>
  </LazyComponent>
));

export const LazySmartReferenceSystemWrapper = React.memo<any>((props) => (
  <LazyComponent threshold={0.1} rootMargin="100px">
    <Suspense fallback={<LazyLoadingFallback name="Reference System" />}>
      <LazySmartReferenceSystem {...props} />
    </Suspense>
  </LazyComponent>
));

export const LazyDocumentStructureVisualizerWrapper = React.memo<any>((props) => (
  <LazyComponent threshold={0.1} rootMargin="100px">
    <Suspense fallback={<LazyLoadingFallback name="Document Structure" />}>
      <LazyDocumentStructureVisualizer {...props} />
    </Suspense>
  </LazyComponent>
));

export const LazyTemplateSelectorWrapper = React.memo<any>((props) => (
  <LazyComponent threshold={0.1} rootMargin="100px">
    <Suspense fallback={<LazyLoadingFallback name="Template Selector" />}>
      <LazyTemplateSelector {...props} />
    </Suspense>
  </LazyComponent>
));

export const LazyAnnotationSystemWrapper = React.memo<any>((props) => (
  <LazyComponent threshold={0.1} rootMargin="100px">
    <Suspense fallback={<LazyLoadingFallback name="Annotation System" />}>
      <LazyAnnotationSystem {...props} />
    </Suspense>
  </LazyComponent>
));

// Preload functions for better UX
export const preloadSettingsPanel = () => import('./settings-panel');
export const preloadAuthorManagement = () => import('./author-management');
export const preloadSmartReferenceSystem = () => import('./smart-reference-system');
export const preloadDocumentStructureVisualizer = () => import('./document-structure-visualizer');
export const preloadTemplateSelector = () => import('./template-selector');
export const preloadAnnotationSystem = () => import('./annotation-system');

// Preload all non-critical components on idle
export const preloadAllNonCriticalComponents = () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      preloadSettingsPanel();
      preloadAuthorManagement();
      preloadSmartReferenceSystem();
      preloadDocumentStructureVisualizer();
      preloadTemplateSelector();
      preloadAnnotationSystem();
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      preloadSettingsPanel();
      preloadAuthorManagement();
      preloadSmartReferenceSystem();
      preloadDocumentStructureVisualizer();
      preloadTemplateSelector();
      preloadAnnotationSystem();
    }, 2000);
  }
};

LazySettingsPanelWrapper.displayName = 'LazySettingsPanelWrapper';
LazyAuthorManagementWrapper.displayName = 'LazyAuthorManagementWrapper';
LazySmartReferenceSystemWrapper.displayName = 'LazySmartReferenceSystemWrapper';
LazyDocumentStructureVisualizerWrapper.displayName = 'LazyDocumentStructureVisualizerWrapper';
LazyTemplateSelectorWrapper.displayName = 'LazyTemplateSelectorWrapper';
LazyAnnotationSystemWrapper.displayName = 'LazyAnnotationSystemWrapper';