import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import DocumentForm from "@/components/document-form";
import DocumentPreview from "@/components/document-preview";
import AuthorForm from "@/components/author-form";
import SectionForm from "@/components/section-form";
import ReferenceForm from "@/components/reference-form";
import FigureForm from "@/components/figure-form";

import { clientStorage } from "@/lib/localStorage";
import { generateClientDocx, generateClientPdf } from "@/lib/clientGenerator";
import type { Document, InsertDocument, UpdateDocument } from "../../../shared/schema-client.js";

export default function HomeClient() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load documents from localStorage on mount
  useEffect(() => {
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
      const result = await generateClientDocx(currentDocument);
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
      const result = await generateClientPdf(currentDocument);
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
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            IEEE Research Paper Generator
          </h1>
          <p className="text-gray-600">
            Create professional IEEE-formatted research papers with ease
          </p>
        </div>

        {/* Document Management */}
        <div className="mb-6 flex gap-4 items-center">
          <Button onClick={handleCreateDocument} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Document
          </Button>
          
          {documents.length > 1 && (
            <select 
              value={currentDocument?.id || ""} 
              onChange={(e) => {
                const doc = documents.find(d => d.id === e.target.value);
                if (doc) setCurrentDocument(doc);
              }}
              className="px-3 py-2 border rounded-md"
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
              variant="destructive"
              onClick={() => handleDeleteDocument(currentDocument.id)}
              size="sm"
            >
              Delete Current
            </Button>
          )}
        </div>

        {/* Export Buttons */}
        <div className="mb-6 flex gap-4">
          <Button 
            onClick={handleGenerateDocx}
            disabled={isGenerating || !currentDocument}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {isGenerating ? "Generating..." : "Download Word"}
          </Button>
          
          <Button 
            onClick={handleGeneratePdf}
            disabled={isGenerating || !currentDocument}
            variant="outline"
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            {isGenerating ? "Generating..." : "Download PDF"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Forms */}
          <div className="space-y-6">
            {/* Document Info */}
            <Card>
              <CardHeader>
                <CardTitle>Document Information</CardTitle>
              </CardHeader>
              <CardContent>
                <DocumentForm 
                  document={documentToDisplay} 
                  onUpdate={handleUpdateDocument} 
                />
              </CardContent>
            </Card>

            {/* Authors */}
            <Card>
              <CardHeader>
                <CardTitle>Authors</CardTitle>
              </CardHeader>
              <CardContent>
                <AuthorForm 
                  authors={documentToDisplay.authors} 
                  onUpdate={(authors) => handleUpdateDocument({ authors })} 
                />
              </CardContent>
            </Card>

            {/* Sections */}
            <Card>
              <CardHeader>
                <CardTitle>Sections</CardTitle>
              </CardHeader>
              <CardContent>
                <SectionForm 
                  sections={documentToDisplay.sections} 
                  onUpdate={(sections) => handleUpdateDocument({ sections })} 
                />
              </CardContent>
            </Card>

            {/* References */}
            <Card>
              <CardHeader>
                <CardTitle>References</CardTitle>
              </CardHeader>
              <CardContent>
                <ReferenceForm 
                  references={documentToDisplay.references} 
                  onUpdate={(references) => handleUpdateDocument({ references })} 
                />
              </CardContent>
            </Card>

            {/* Figures */}
            <Card>
              <CardHeader>
                <CardTitle>Figures</CardTitle>
              </CardHeader>
              <CardContent>
                <FigureForm 
                  figures={documentToDisplay.figures} 
                  documentId={currentDocument?.id || null}
                  sections={documentToDisplay.sections}
                  onUpdate={(figures) => handleUpdateDocument({ figures })} 
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Preview */}
          <div>
            <DocumentPreview 
              document={documentToDisplay} 
              documentId={currentDocument?.id || null} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}