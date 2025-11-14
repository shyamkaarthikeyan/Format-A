import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ArrowLeft, Sparkles, FileText, Users, BookOpen, Image, Link, History, Download, Mail, Lock, Table } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { documentApi } from "@/lib/api";

import DocumentForm from "@/components/document-form";
import DocumentPreview from "@/components/document-preview";
import AuthorForm from "@/components/author-form";
import StreamlinedSectionForm from "@/components/enhanced/streamlined-section-form";
import ReferenceForm from "@/components/reference-form";
import FigureForm from "@/components/figure-form";
import TableForm from "@/components/table-form";

import { DownloadHistory } from "@/components/download-history";
import AuthDebug from "@/components/auth-debug";

import { clientStorage } from "@/lib/localStorage";
import type { Document, InsertDocument, UpdateDocument } from "@shared/schema";

// Floating particles component
const FloatingParticle = ({ delay }: { delay: number }) => (
  <div 
    className="absolute w-2 h-2 bg-purple-300 rounded-full opacity-30 animate-pulse"
    style={{
      animation: `float ${3 + Math.random() * 2}s ease-in-out infinite ${delay}s`,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
    }}
  />
);

// Authentication prompt component
const AuthPrompt = ({ isOpen, onClose, onSignIn, action }: {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: () => void;
  action: 'download' | 'email';
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <Lock className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold">Sign In Required</h3>
        </div>
        
        <p className="text-gray-600 mb-4">
          To {action} your document, please sign in to your account.
        </p>
        
        <div className="space-y-2 mb-6">
          <h4 className="font-medium text-gray-900">Benefits of signing in:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Download PDF and DOCX files</li>
            <li>• Email documents to yourself or collaborators</li>
            <li>• Save document history</li>
            <li>• Access advanced features</li>
          </ul>
        </div>
        
        <div className="flex gap-3">
          <Button onClick={onSignIn} className="flex-1 bg-purple-600 hover:bg-purple-700">
            Sign In
          </Button>
          <Button onClick={onClose} variant="outline" className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

// Main component
export default function HomeClient() {
  const { toast } = useToast();
  const { isAuthenticated, user, isAdmin } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocument, setCurrentDocumentState] = useState<Document | null>(null);

  // Safe setter that ensures arrays are never undefined
  const setCurrentDocument = (doc: Document | null) => {
    if (!doc) {
      setCurrentDocumentState(null);
      return;
    }
    
    const safeDoc: Document = {
      ...doc,
      authors: Array.isArray(doc.authors) ? doc.authors : [],
      sections: Array.isArray(doc.sections) ? doc.sections : [],
      references: Array.isArray(doc.references) ? doc.references : [],
      figures: Array.isArray(doc.figures) ? doc.figures : [],
      tables: Array.isArray(doc.tables) ? doc.tables : [],
    };
    
    setCurrentDocumentState(safeDoc);
  };
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showDownloadHistory, setShowDownloadHistory] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState<'download' | 'email' | null>(null);
  const [, setLocation] = useLocation();

  // Load documents from localStorage on mount
  useEffect(() => {
    setIsVisible(true);
    const loadedDocuments = clientStorage.getAllDocuments();
    setDocuments(loadedDocuments);
    
    // Auto-create a document if none exist
    if (loadedDocuments.length === 0) {
      handleCreateDocument();
    } else {
      setCurrentDocument(loadedDocuments[0]);
    }
  }, []);

  const handleCreateDocument = () => {
    // Check if we already have 1 document (maximum allowed)
    if (documents.length >= 1) {
      toast({
        title: "Document Limit Reached",
        description: "Only 1 document allowed at a time. Please delete the current document before creating a new one.",
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
      tables: [],
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
  };

  const handleUpdateDocument = (updates: UpdateDocument) => {
    if (!currentDocument) return;

    // Ensure arrays are never undefined
    const safeUpdates = {
      ...updates,
      authors: Array.isArray(updates.authors) ? updates.authors : currentDocument.authors || [],
      sections: Array.isArray(updates.sections) ? updates.sections : currentDocument.sections || [],
      references: Array.isArray(updates.references) ? updates.references : currentDocument.references || [],
      figures: Array.isArray(updates.figures) ? updates.figures : currentDocument.figures || [],
      tables: Array.isArray(updates.tables) ? updates.tables : currentDocument.tables || [],
    };

    const updatedDocument = clientStorage.updateDocument(currentDocument.id, safeUpdates);
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

  const handleAuthRequired = (action: 'download' | 'email') => {
    setPendingAction(action);
    setShowAuthPrompt(true);
  };

  const handleSignIn = () => {
    setLocation('/signin');
  };

  const handleCancelAuth = () => {
    setShowAuthPrompt(false);
    setPendingAction(null);
  };



  const handleGenerateDocx = async () => {
    if (!currentDocument) return;
    
    // Check authentication for download
    if (!isAuthenticated) {
      handleAuthRequired('download');
      return;
    }
    
    // Get the latest document data from storage to ensure we have all form updates
    const latestDocument = clientStorage.getDocument(currentDocument.id);
    if (!latestDocument) {
      toast({
        title: "Document Error",
        description: "Could not load document data.",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    try {
      // Import table validation
      const { validateDocumentTables, sanitizeDocumentTables } = await import('@/lib/table-validation');
      
      // Validate and sanitize table data
      const validation = validateDocumentTables(latestDocument);
      if (validation.warnings.length > 0) {
        console.warn('Table validation warnings:', validation.warnings);
      }
      
      let documentToSend = latestDocument;
      if (!validation.isValid) {
        console.warn('Table validation errors found, attempting to fix:', validation.errors);
        documentToSend = sanitizeDocumentTables(latestDocument);
        
        // Re-validate after sanitization
        const revalidation = validateDocumentTables(documentToSend);
        if (!revalidation.isValid) {
          throw new Error(`Table validation failed: ${revalidation.errors.join('; ')}`);
        }
        console.log('Table data sanitized successfully');
      }
      
      console.log('Generating DOCX using Python backend API...');
      console.log('Document data being sent:', JSON.stringify(documentToSend, null, 2));
      const result = await documentApi.generateDocx(documentToSend);
      
      // Handle the response - it should contain download URL or blob data
      if (result.download_url) {
        // If we get a download URL, trigger download
        const link = window.document.createElement('a');
        link.href = result.download_url;
        link.download = "ieee_paper.docx";
        link.click();
      } else if (result.file_data) {
        // If we get base64 data, convert to blob and download
        const byteCharacters = atob(result.file_data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        
        const url = URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = "ieee_paper.docx";
        link.click();
        URL.revokeObjectURL(url);
      } else {
        throw new Error('Invalid response format from document generation service');
      }

      toast({
        title: "Word Document Generated",
        description: "IEEE-formatted Word document has been downloaded successfully."
      });
    } catch (error) {
      toast({
        title: "Generation Error",
        description: error instanceof Error ? error.message : "An error occurred while generating the document.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!currentDocument) return;
    
    // Check authentication for download
    if (!isAuthenticated) {
      handleAuthRequired('download');
      return;
    }
    
    // Get the latest document data from storage to ensure we have all form updates
    const latestDocument = clientStorage.getDocument(currentDocument.id);
    if (!latestDocument) {
      toast({
        title: "Document Error",
        description: "Could not load document data.",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    try {
      // Import table validation
      const { validateDocumentTables, sanitizeDocumentTables } = await import('@/lib/table-validation');
      
      // Validate and sanitize table data
      const validation = validateDocumentTables(latestDocument);
      if (validation.warnings.length > 0) {
        console.warn('Table validation warnings:', validation.warnings);
      }
      
      let documentToSend = latestDocument;
      if (!validation.isValid) {
        console.warn('Table validation errors found, attempting to fix:', validation.errors);
        documentToSend = sanitizeDocumentTables(latestDocument);
        
        // Re-validate after sanitization
        const revalidation = validateDocumentTables(documentToSend);
        if (!revalidation.isValid) {
          throw new Error(`Table validation failed: ${revalidation.errors.join('; ')}`);
        }
        console.log('Table data sanitized successfully');
      }
      
      console.log('Generating PDF using Python backend API...');
      console.log('Document data being sent:', JSON.stringify(documentToSend, null, 2));
      const result = await documentApi.generatePdf(documentToSend, false); // false = download mode
      
      // Handle the response - it should contain download URL or blob data
      if (result.download_url) {
        // If we get a download URL, trigger download
        const link = window.document.createElement('a');
        link.href = result.download_url;
        link.download = "ieee_paper.pdf";
        link.click();
      } else if (result.file_data) {
        // If we get base64 data, convert to blob and download
        const byteCharacters = atob(result.file_data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        const url = URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = "ieee_paper.pdf";
        link.click();
        URL.revokeObjectURL(url);
      } else {
        throw new Error('Invalid response format from PDF generation service');
      }

      toast({
        title: "PDF Generated",
        description: "IEEE-formatted PDF document has been downloaded successfully."
      });
    } catch (error) {
      toast({
        title: "Generation Error",
        description: error instanceof Error ? error.message : "An error occurred while generating the document.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEmailDocument = () => {
    if (!isAuthenticated) {
      handleAuthRequired('email');
      return;
    }
    
    // TODO: Implement email functionality for authenticated users
    toast({
      title: "Email Feature",
      description: "Email functionality will be implemented for authenticated users."
    });
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
    tables: [],
    settings: {
      fontSize: "10pt",
      columns: "2",
      exportFormat: "docx",
      includePageNumbers: true,
      includeCopyright: false
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-violet-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <FloatingParticle key={i} delay={i * 0.3} />
        ))}
      </div>

      {/* Background Shapes */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
      <div className="absolute top-40 right-10 w-72 h-72 bg-violet-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-20 left-20 w-72 h-72 bg-fuchsia-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>

      <div className="relative z-10 p-6">
        <div className="max-w-8xl mx-auto">
          {/* Compact Header */}
          <div className={`mb-4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="flex items-center justify-between bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-purple-200">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => setLocation("/")}
                  variant="ghost"
                  size="sm"
                  className="text-purple-600 hover:text-purple-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-purple-600">Format A</span>
                  <span className="text-sm text-gray-600">IEEE Document Engine</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Admin Panel Button - Only visible for admin users */}
                {isAdmin && (
                  <Button
                    onClick={() => setLocation('/admin')}
                    variant="outline"
                    size="sm"
                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  >
                    <Users className="w-4 h-4 mr-1" />
                    Admin Panel
                  </Button>
                )}

                <Button
                  onClick={() => setShowDownloadHistory(!showDownloadHistory)}
                  variant="outline"
                  size="sm"
                  className="text-purple-600 border-purple-300 hover:bg-purple-50"
                >
                  <History className="w-4 h-4 mr-1" />
                  {showDownloadHistory ? 'Hide History' : 'Download History'}
                </Button>
                
                <Button 
                  onClick={handleCreateDocument} 
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New
                </Button>
                
                {documents.length > 1 && (
                  <select 
                    value={currentDocument?.id || ""} 
                    onChange={(e) => {
                      const doc = documents.find(d => d.id === e.target.value);
                      if (doc) setCurrentDocument(doc);
                    }}
                    className="px-3 py-1 text-sm border border-purple-200 rounded bg-white text-gray-700 focus:border-purple-400 focus:ring-1 focus:ring-purple-200"
                  >
                    {documents.map(doc => (
                      <option key={doc.id} value={doc.id}>
                        {doc.title || "Untitled Document"}
                      </option>
                    ))}
                  </select>
                )}
                
                {currentDocument && (
                  <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDocument(currentDocument.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </div>

          {showDownloadHistory ? (
            /* Download History View */
            <div className="h-[calc(100vh-120px)]">
              <Card className="h-full bg-white/95 backdrop-blur-sm border-2 border-purple-300 shadow-xl rounded-lg overflow-hidden">
                <CardHeader className="pb-2 pt-3 px-4 border-b border-purple-200 bg-white/80">
                  <CardTitle className="flex items-center gap-2 text-gray-900 text-sm font-medium">
                    <History className="w-4 h-4 text-purple-600" />
                    Download History
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[calc(100%-60px)] overflow-hidden p-4">
                  <DownloadHistory />
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex gap-4 h-[calc(100vh-120px)]">
              {/* Left Column - Forms (50% width, scrollable) */}
              <div className="w-[50%] space-y-4 overflow-y-auto pr-4 bg-white/70 backdrop-blur-sm rounded-lg p-5 shadow-lg border border-purple-200">
              {/* Document Info - Compact */}
              <Card className="bg-white/90 border border-purple-200 shadow-sm">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="flex items-center gap-2 text-gray-900 text-sm font-medium">
                    <FileText className="w-4 h-4 text-purple-600" />
                    Document
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <DocumentForm 
                    document={documentToDisplay} 
                    onUpdate={handleUpdateDocument} 
                  />
                </CardContent>
              </Card>

              {/* Authors - Compact */}
              <Card className="bg-white/90 border border-purple-200 shadow-sm">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="flex items-center gap-2 text-gray-900 text-sm font-medium">
                    <Users className="w-4 h-4 text-fuchsia-600" />
                    Authors
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <AuthorForm 
                    authors={documentToDisplay.authors} 
                    onUpdate={(authors) => handleUpdateDocument({ authors })} 
                  />
                </CardContent>
              </Card>

              {/* Sections - Compact */}
              <Card className="bg-white/90 border border-purple-200 shadow-sm">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="flex items-center gap-2 text-gray-900 text-sm font-medium">
                    <BookOpen className="w-4 h-4 text-violet-600" />
                    Sections
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <StreamlinedSectionForm 
                    sections={documentToDisplay.sections} 
                    onUpdate={(sections) => handleUpdateDocument({ sections })} 
                  />
                </CardContent>
              </Card>





              {/* Figures - Compact */}
              <Card className="bg-white/90 border border-purple-200 shadow-sm">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="flex items-center gap-2 text-gray-900 text-sm font-medium">
                    <Image className="w-4 h-4 text-green-600" />
                    Figures
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <FigureForm 
                    figures={documentToDisplay.figures} 
                    documentId={currentDocument?.id || null}
                    sections={documentToDisplay.sections}
                    onUpdate={(figures) => handleUpdateDocument({ figures })} 
                  />
                </CardContent>
              </Card>

              {/* Tables - Compact */}
              <Card className="bg-white/90 border border-purple-200 shadow-sm">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="flex items-center gap-2 text-gray-900 text-sm font-medium">
                    <Table className="w-4 h-4 text-blue-600" />
                    Tables
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <TableForm 
                    tables={documentToDisplay.tables} 
                    documentId={currentDocument?.id || null}
                    sections={documentToDisplay.sections}
                    onUpdate={(tables) => handleUpdateDocument({ tables })} 
                  />
                </CardContent>
              </Card>

              {/* References - Compact */}
              <Card className="bg-white/90 border border-purple-200 shadow-sm">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="flex items-center gap-2 text-gray-900 text-sm font-medium">
                    <Link className="w-4 h-4 text-pink-600" />
                    References
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <ReferenceForm 
                    references={documentToDisplay.references} 
                    onUpdate={(references) => handleUpdateDocument({ references })} 
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Preview (50% width) */}
            <div className="w-[50%] h-full">
              <Card className="h-full bg-white/95 backdrop-blur-sm border-2 border-purple-300 shadow-xl rounded-lg overflow-hidden">
                <CardHeader className="pb-2 pt-3 px-4 border-b border-purple-200 bg-white/80">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-gray-900 text-sm font-medium">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      Live Preview
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="h-[calc(100%-60px)] overflow-hidden p-0">
                  <DocumentPreview document={documentToDisplay} />
                </CardContent>
              </Card>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Authentication Prompt Modal */}
      <AuthPrompt
        isOpen={showAuthPrompt}
        action={pendingAction || 'download'}
        onSignIn={handleSignIn}
        onClose={handleCancelAuth}
      />

      {/* Custom Styles */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2000ms; }
        .animation-delay-4000 { animation-delay: 4000ms; }
      `}</style>
    </div>
  );
}