import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Save, Users, BookOpen, Image, Quote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DocumentForm from "@/components/document-form";
import AuthorForm from "@/components/author-form";
import SectionForm from "@/components/section-form";
import FigureForm from "@/components/figure-form";
import ReferenceForm from "@/components/reference-form";
import DocumentPreview from "@/components/document-preview";
import { apiRequest } from "@/lib/queryClient";
import type { Document, InsertDocument, UpdateDocument } from "@shared/schema";

export default function Home() {
  const { id } = useParams<{ id?: string }>();
  const [documentId, setDocumentId] = useState<number | null>(id ? parseInt(id) : null);
  const [activeTab, setActiveTab] = useState("metadata");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch document if ID exists
  const { data: document, isLoading } = useQuery({
    queryKey: [`/api/documents/${documentId}`],
    enabled: !!documentId,
  });

  // Create document mutation
  const createDocumentMutation = useMutation({
    mutationFn: async (data: InsertDocument) => {
      const res = await apiRequest("POST", "/api/documents", data);
      return await res.json();
    },
    onSuccess: (newDocument: Document) => {
      setDocumentId(newDocument.id);
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Document created",
        description: "New document has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create document.",
        variant: "destructive",
      });
    },
  });

  // Update document mutation
  const updateDocumentMutation = useMutation({
    mutationFn: async (data: UpdateDocument) => {
      const res = await apiRequest("PATCH", `/api/documents/${documentId}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save document.",
        variant: "destructive",
      });
    },
  });

  // Auto-save functionality
  const saveDocument = (data: Partial<UpdateDocument>) => {
    if (documentId) {
      updateDocumentMutation.mutate(data);
    } else {
      // Create new document if doesn't exist
      const newDocument: InsertDocument = {
        title: data.title || "Untitled Document",
        abstract: data.abstract || "",
        keywords: data.keywords || "",
        authors: data.authors || [],
        sections: data.sections || [],
        references: data.references || [],
        figures: data.figures || [],
        settings: data.settings || {
          fontSize: "9.5pt",
          columns: "double",
          exportFormat: "docx",
          includePageNumbers: true,
          includeCopyright: true
        },
        ...data
      };
      createDocumentMutation.mutate(newDocument);
    }
  };

  // Initialize with empty document if no ID
  useEffect(() => {
    if (!id && !documentId) {
      const initialData: InsertDocument = {
        title: "",
        abstract: "",
        keywords: "",
        authors: [],
        sections: [],
        references: [],
        figures: [],
        settings: {
          fontSize: "9.5pt",
          columns: "double",
          exportFormat: "docx",
          includePageNumbers: true,
          includeCopyright: true
        }
      };
      createDocumentMutation.mutate(initialData);
    }
  }, [id, documentId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  const currentDocument: Document = document || {
    id: 0,
    title: "",
    abstract: null,
    keywords: null,
    authors: [],
    sections: [],
    references: [],
    figures: [],
    settings: {
      fontSize: "9.5pt",
      columns: "double",
      exportFormat: "docx",
      includePageNumbers: true,
      includeCopyright: true
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    receivedDate: null,
    revisedDate: null,
    acceptedDate: null,
    funding: null,
    doi: null,
    acknowledgments: null
  };

  return (
    <div className="min-h-screen bg-gray-50 font-roboto">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">IEEE Document Generator</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={updateDocumentMutation.isPending ? "secondary" : "default"}>
                {updateDocumentMutation.isPending ? "Saving..." : "Saved"}
              </Badge>
              <Button
                onClick={() => saveDocument(currentDocument)}
                disabled={updateDocumentMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Panel */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="metadata" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">Metadata</span>
                  </TabsTrigger>
                  <TabsTrigger value="authors" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">Authors</span>
                  </TabsTrigger>
                  <TabsTrigger value="content" className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span className="hidden sm:inline">Content</span>
                  </TabsTrigger>
                  <TabsTrigger value="figures" className="flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    <span className="hidden sm:inline">Figures</span>
                  </TabsTrigger>
                  <TabsTrigger value="references" className="flex items-center gap-2">
                    <Quote className="w-4 h-4" />
                    <span className="hidden sm:inline">References</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="metadata" className="mt-6">
                  <DocumentForm
                    document={currentDocument}
                    onUpdate={saveDocument}
                  />
                </TabsContent>

                <TabsContent value="authors" className="mt-6">
                  <AuthorForm
                    authors={currentDocument.authors || []}
                    onUpdate={(authors) => saveDocument({ authors })}
                  />
                </TabsContent>

                <TabsContent value="content" className="mt-6">
                  <SectionForm
                    sections={currentDocument.sections || []}
                    onUpdate={(sections) => saveDocument({ sections })}
                  />
                </TabsContent>

                <TabsContent value="figures" className="mt-6">
                  <FigureForm
                    figures={currentDocument.figures || []}
                    documentId={documentId}
                    sections={currentDocument.sections || []}
                    onUpdate={(figures) => saveDocument({ figures })}
                  />
                </TabsContent>

                <TabsContent value="references" className="mt-6">
                  <ReferenceForm
                    references={currentDocument.references || []}
                    onUpdate={(references) => saveDocument({ references })}
                  />
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <DocumentPreview
                document={currentDocument}
                documentId={documentId}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
