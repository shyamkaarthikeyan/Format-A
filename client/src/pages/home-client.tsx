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
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className={`mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="flex items-center gap-4 mb-6">
              <Button
                onClick={() => setLocation("/")}
                variant="outline"
                className="border-purple-300 text-purple-600 hover:bg-purple-50 hover:border-purple-400 transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
              
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-purple-600 animate-pulse">
                <Sparkles className="w-4 h-4" />
                <span className="font-semibold">AI-Powered IEEE Generator</span>
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 font-serif mb-3">
              IEEE Paper Generator
            </h1>
            <p className="text-lg text-gray-700 max-w-2xl">
              Create professional IEEE-formatted research papers with intelligent formatting and real-time preview
            </p>
          </div>

          {/* Document Management */}
          <div className={`mb-8 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
            <Card className="bg-white/80 backdrop-blur-sm border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex flex-wrap gap-4 items-center">
                  <Button 
                    onClick={handleCreateDocument} 
                    className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Document
                  </Button>
                  
                  {documents.length > 1 && (
                    <select 
                      value={currentDocument?.id || ""} 
                      onChange={(e) => {
                        const doc = documents.find(d => d.id === e.target.value);
                        if (doc) setCurrentDocument(doc);
                      }}
                      className="px-4 py-2 border-2 border-purple-200 rounded-lg bg-white/80 backdrop-blur-sm text-gray-700 font-medium focus:border-purple-400 focus:ring-2 focus:ring-purple-200 transition-all duration-300"
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
                      variant="outline"
                      onClick={() => handleDeleteDocument(currentDocument.id)}
                      className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 transition-all duration-300"
                    >
                      Delete Current
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Left Column - Forms */}
            <div className={`space-y-6 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
              {/* Document Info */}
              <Card className="group bg-white/80 backdrop-blur-sm border-purple-200 shadow-lg hover:shadow-xl hover:border-purple-300 transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-violet-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-gray-900 group-hover:text-purple-800 transition-colors duration-300">
                    <FileText className="w-5 h-5 text-purple-600" />
                    Document Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DocumentForm 
                    document={documentToDisplay} 
                    onUpdate={handleUpdateDocument} 
                  />
                </CardContent>
              </Card>

              {/* Sections */}
              <Card className="group bg-white/80 backdrop-blur-sm border-purple-200 shadow-lg hover:shadow-xl hover:border-purple-300 transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-gray-900 group-hover:text-purple-800 transition-colors duration-300">
                    <BookOpen className="w-5 h-5 text-violet-600" />
                    Sections
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SectionForm 
                    sections={documentToDisplay.sections} 
                    onUpdate={(sections) => handleUpdateDocument({ sections })} 
                  />
                </CardContent>
              </Card>

              {/* Authors */}
              <Card className="group bg-white/80 backdrop-blur-sm border-purple-200 shadow-lg hover:shadow-xl hover:border-purple-300 transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-fuchsia-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-gray-900 group-hover:text-purple-800 transition-colors duration-300">
                    <Users className="w-5 h-5 text-fuchsia-600" />
                    Authors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AuthorForm 
                    authors={documentToDisplay.authors} 
                    onUpdate={(authors) => handleUpdateDocument({ authors })} 
                  />
                </CardContent>
              </Card>

              {/* References */}
              <Card className="group bg-white/80 backdrop-blur-sm border-purple-200 shadow-lg hover:shadow-xl hover:border-purple-300 transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-gray-900 group-hover:text-purple-800 transition-colors duration-300">
                    <Link className="w-5 h-5 text-pink-600" />
                    References
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ReferenceForm 
                    references={documentToDisplay.references} 
                    onUpdate={(references) => handleUpdateDocument({ references })} 
                  />
                </CardContent>
              </Card>

              {/* Figures */}
              <Card className="group bg-white/80 backdrop-blur-sm border-purple-200 shadow-lg hover:shadow-xl hover:border-purple-300 transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-violet-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-gray-900 group-hover:text-purple-800 transition-colors duration-300">
                    <Image className="w-5 h-5 text-purple-600" />
                    Figures
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FigureForm 
                    figures={documentToDisplay.figures} 
                    onUpdate={(figures) => handleUpdateDocument({ figures })} 
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Preview */}
            <div className={`transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
              <Card className="h-[calc(100vh-180px)] bg-white/90 backdrop-blur-sm border-purple-200 shadow-xl sticky top-6">
                <CardHeader className="pb-4 border-b border-purple-100">
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    Live Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[calc(100%-80px)] overflow-hidden p-0">
                  <DocumentPreview document={documentToDisplay} />
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