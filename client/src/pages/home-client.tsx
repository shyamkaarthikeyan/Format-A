import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ArrowLeft, Sparkles, FileText, Users, BookOpen, Image, Link } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

import DocumentForm from "@/components/document-form";
import DocumentPreview from "@/components/document-preview";
import AuthorForm from "@/components/author-form";
import SectionForm from "@/components/section-form";
import ReferenceForm from "@/components/reference-form";
import FigureForm from "@/components/figure-form";

import { clientStorage } from "@/lib/localStorage";
import { generateSimpleDocx, generateSimplePdf } from "@/lib/simpleGenerator";
import type { Document, InsertDocument, UpdateDocument } from "../../../shared/schema-client.js";

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

export default function HomeClient() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
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
    // Check if we already have 2 documents (maximum allowed)
    if (documents.length >= 2) {
      toast({
        title: "Document Limit Reached",
        description: "Maximum of 2 documents allowed. Please delete a document before creating a new one.",
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
  };

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

  const handleGenerateDocx = async () => {
    if (!currentDocument) return;
    
    setIsGenerating(true);
    try {
      const result = await generateSimpleDocx(currentDocument);
      if (result.success) {
        toast({
          title: "Word Document Generated",
          description: "Your IEEE document has been downloaded successfully."
        });
      } else {
        toast({
          title: "Generation Failed",
          description: result.error || "Failed to generate Word document.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Generation Error",
        description: "An error occurred while generating the document.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!currentDocument) return;
    
    setIsGenerating(true);
    try {
      const result = await generateSimplePdf(currentDocument);
      if (result.success) {
        toast({
          title: "PDF Generated",
          description: "Your IEEE document has been downloaded successfully."
        });
      } else {
        toast({
          title: "Generation Failed",
          description: result.error || "Failed to generate PDF document.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Generation Error",
        description: "An error occurred while generating the document.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
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
                  <SectionForm 
                    sections={documentToDisplay.sections} 
                    onUpdate={(sections) => handleUpdateDocument({ sections })} 
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
                  <CardTitle className="flex items-center gap-2 text-gray-900 text-sm font-medium">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    Live Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[calc(100%-60px)] overflow-hidden p-0">
                  <DocumentPreview document={documentToDisplay} documentId={currentDocument?.id || null} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
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