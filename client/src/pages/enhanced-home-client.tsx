import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ThemeProvider } from '@/contexts/theme-context';
import { WorkspaceProvider, useWorkspace } from '@/contexts/workspace-context';
import { useDebounce } from '@/lib/performance-utils';
import WorkspaceLayout from '@/components/layout/workspace-layout';
import DocumentForm from '@/components/document-form';
import EnhancedPreviewSystem from '@/components/enhanced/enhanced-preview-system';
import SmartAuthorForm from '@/components/enhanced/smart-author-form';
import DocumentPreview from '@/components/document-preview';
import EnhancedSectionForm from '@/components/enhanced/enhanced-section-form';
import ReferenceForm from '@/components/reference-form';
import SmartDocumentForm from '@/components/enhanced/smart-document-form';
import DocumentSetupWizard from '@/components/enhanced/document-setup-wizard';
import { OptimizedPreview } from '@/components/enhanced/optimized-preview';
import { EnhancedCard, CardHeader, CardTitle, CardContent } from '@/components/ui/enhanced-card';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { LoadingState } from '@/components/ui/loading-spinner';
import { LazyComponent } from '@/components/ui/lazy-component';
import { PerformanceMonitor } from '@/components/ui/performance-monitor';
import { clientStorage } from '@/lib/localStorage';
import type { Document, InsertDocument, UpdateDocument } from '@shared/schema';
import { FileText, Users, BookOpen, Link } from 'lucide-react';

// Main component wrapped with providers
export default function EnhancedHomeClient() {
  return (
    <ThemeProvider>
      <WorkspaceProvider>
        <EnhancedHomeClientInner />
      </WorkspaceProvider>
    </ThemeProvider>
  );
}

// Inner component that uses the workspace context
const EnhancedHomeClientInner = React.memo(() => {
  const { toast } = useToast();
  const { state, actions } = useWorkspace();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [documentStatuses, setDocumentStatuses] = useState<Record<string, import('@/components/layout/document-tabs').DocumentStatus>>({});

  // Load documents from localStorage on mount
  useEffect(() => {
    const loadDocuments = async () => {
      setIsLoading(true);
      try {
        const loadedDocuments = clientStorage.getAllDocuments();
        setDocuments(loadedDocuments);
        
        // Auto-create a document if none exist
        if (loadedDocuments.length === 0) {
          setShowWizard(true);
        } else {
          setCurrentDocument(loadedDocuments[0]);
        }
      } catch (error) {
        console.error('Failed to load documents:', error);
        toast({
          title: "Error Loading Documents",
          description: "Failed to load your documents. Please try refreshing the page.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, [toast]);

  const handleCreateDocument = useCallback(() => {
    // Check if we already have 5 documents (maximum allowed for tabs)
    if (documents.length >= 5) {
      toast({
        title: "Document Limit Reached",
        description: "Maximum of 5 documents allowed. Please close a document before creating a new one.",
        variant: "destructive"
      });
      return;
    }

    const newDocumentData: InsertDocument = {
      title: "",
      abstract: null,
      keywords: null,
      authors: [],
      sections: [],
      references: [],
      figures: [],
      settings: {
        fontSize: "10pt",
        columns: "2",
        exportFormat: "docx",
        includePageNumbers: true,
        includeCopyright: false
      }
    };

    const newDocument = clientStorage.createDocument(newDocumentData);
    setDocuments(prev => [...prev, newDocument]);
    setCurrentDocument(newDocument);
    
    toast({
      title: "Document Created",
      description: "New IEEE document ready for editing."
    });
  }, [documents.length, toast]);

  const handleUpdateDocument = (updates: UpdateDocument) => {
    if (!currentDocument) return;

    const updatedDocument = clientStorage.updateDocument(currentDocument.id, updates);
    if (updatedDocument) {
      setDocuments(prev => prev.map(doc => 
        doc.id === currentDocument.id ? updatedDocument : doc
      ));
      setCurrentDocument(updatedDocument);
    }
  };

  const handleDeleteDocument = (id: string) => {
    const success = clientStorage.deleteDocument(id);
    if (success) {
      setDocuments(prev => prev.filter(doc => doc.id !== id));
      if (currentDocument?.id === id) {
        const remaining = documents.filter(doc => doc.id !== id);
        setCurrentDocument(remaining.length > 0 ? remaining[0] : null);
      }
      
      toast({
        title: "Document Deleted",
        description: "Document removed successfully."
      });
    }
  };

  const handleTabClick = (documentId: string) => {
    const doc = documents.find(d => d.id === documentId);
    if (doc) {
      setCurrentDocument(doc);
    }
  };

  const handleTabReorder = useCallback((fromIndex: number, toIndex: number) => {
    setDocuments(prev => {
      const newDocuments = [...prev];
      const [movedDocument] = newDocuments.splice(fromIndex, 1);
      newDocuments.splice(toIndex, 0, movedDocument);
      return newDocuments;
    });

    toast({
      title: "Tabs Reordered",
      description: "Document tabs have been reordered successfully.",
    });
  }, [toast]);

  const handleSectionClick = (sectionId: string) => {
    // Scroll to section or focus on it
    console.log('Section clicked:', sectionId);
  };

  const handleSubsectionClick = (sectionId: string, subsectionId: string) => {
    // Handle subsection navigation
    console.log('Subsection clicked:', sectionId, subsectionId);
  };

  // Update document status when document changes
  useEffect(() => {
    if (currentDocument) {
      const status = getDocumentStatus(currentDocument);
      setDocumentStatuses(prev => ({
        ...prev,
        [currentDocument.id]: status
      }));
    }
  }, [currentDocument]);

  // Helper function to determine document status
  const getDocumentStatus = (doc: Document): import('@/components/layout/document-tabs').DocumentStatus => {
    // New document
    if (!doc.title && doc.sections.length === 0 && doc.authors.length === 0) {
      return 'new';
    }
    
    // Check if document has unsaved changes (simplified logic)
    // In a real app, this would track actual save state
    const hasContent = doc.title || doc.abstract || doc.sections.length > 0 || doc.authors.length > 0;
    
    if (hasContent) {
      // For demo purposes, randomly show some documents as modified
      const isModified = Math.random() > 0.7; // 30% chance of being modified
      return isModified ? 'modified' : 'saved';
    }
    
    return 'saved';
  };

  const documentToDisplay: Document = currentDocument || {
    id: "",
    title: "",
    abstract: null,
    keywords: null,
    authors: [],
    sections: [],
    references: [],
    figures: [],
    settings: {
      fontSize: "10pt",
      columns: "2",
      exportFormat: "docx",
      includePageNumbers: true,
      includeCopyright: false
    }
  };

  // Editor content with enhanced forms
  const editorContent = (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Document Info */}
        <EnhancedCard variant="glass" padding="none">
          <CardHeader compact>
            <CardTitle size="sm" className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              Document Information
            </CardTitle>
          </CardHeader>
          <CardContent compact>
            <DocumentForm 
              document={documentToDisplay} 
              onUpdate={handleUpdateDocument} 
            />
          </CardContent>
        </EnhancedCard>

        {/* Authors */}
        <EnhancedCard variant="glass" padding="none">
          <CardHeader compact>
            <CardTitle size="sm" className="flex items-center gap-2">
              <Users className="w-4 h-4 text-fuchsia-600" />
              Authors
            </CardTitle>
          </CardHeader>
          <CardContent compact>
            <SmartAuthorForm 
              authors={documentToDisplay.authors} 
              onUpdate={(authors) => handleUpdateDocument({ authors })} 
            />
          </CardContent>
        </EnhancedCard>

        {/* Enhanced Sections */}
        <EnhancedCard variant="glass" padding="none">
          <CardHeader compact>
            <CardTitle size="sm" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-violet-600" />
              Document Sections
            </CardTitle>
          </CardHeader>
          <CardContent compact>
            <EnhancedSectionForm 
              sections={documentToDisplay.sections} 
              onUpdate={(sections) => handleUpdateDocument({ sections })}
              activeSection={state.activeSection}
              onSectionClick={actions.setActiveSection}
            />
          </CardContent>
        </EnhancedCard>

        {/* References */}
        <EnhancedCard variant="glass" padding="none">
          <CardHeader compact>
            <CardTitle size="sm" className="flex items-center gap-2">
              <Link className="w-4 h-4 text-pink-600" />
              References
            </CardTitle>
          </CardHeader>
          <CardContent compact>
            <ReferenceForm 
              references={documentToDisplay.references} 
              onUpdate={(references) => handleUpdateDocument({ references })} 
            />
          </CardContent>
        </EnhancedCard>
      </div>
    </div>
  );

  // Preview content with lazy loading and optimization
  const previewContent = useMemo(() => (
    <div className="h-full">
      <LazyComponent fallback={<LoadingState isLoading={true} children={<></>} />}>
        <OptimizedPreview 
          document={documentToDisplay} 
          className="h-full"
          debounceDelay={1500}
        />
      </LazyComponent>
    </div>
  ), [documentToDisplay]);

  return (
    <div className="h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-violet-100">
      <WorkspaceLayout
        documents={documents}
        activeDocument={currentDocument}
        onTabClick={handleTabClick}
        onTabClose={handleDeleteDocument}
        onTabReorder={handleTabReorder}
        onNewDocument={handleCreateDocument}
        onSectionClick={handleSectionClick}
        onSubsectionClick={handleSubsectionClick}
        editorContent={editorContent}
        previewContent={previewContent}
        documentStatuses={documentStatuses}
      />
      
      {/* Performance Monitor for development */}
      <PerformanceMonitor enabled={process.env.NODE_ENV === 'development'} />
    </div>
  );
});