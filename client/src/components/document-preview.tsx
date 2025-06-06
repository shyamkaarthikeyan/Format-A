import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ZoomIn, ZoomOut, Download, FileText, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Document } from "@shared/schema";

interface DocumentPreviewProps {
  document: Document;
  documentId: number | null;
}

export default function DocumentPreview({ document, documentId }: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(75);
  const [previewMode, setPreviewMode] = useState<"ieee" | "raw">("ieee");
  const { toast } = useToast();

  const generateDocxMutation = useMutation({
    mutationFn: async () => {
      if (!documentId) throw new Error("No document ID");
      const res = await apiRequest("POST", `/api/documents/${documentId}/generate/docx`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "DOCX Generated",
        description: "Document has been generated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate DOCX document.",
        variant: "destructive",
      });
    },
  });

  const generateLatexMutation = useMutation({
    mutationFn: async () => {
      if (!documentId) throw new Error("No document ID");
      const res = await apiRequest("POST", `/api/documents/${documentId}/generate/latex`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "LaTeX Generated",
        description: "LaTeX document has been generated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate LaTeX document.",
        variant: "destructive",
      });
    },
  });

  const handleZoomIn = () => {
    setZoom(Math.min(150, zoom + 25));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(50, zoom - 25));
  };

  const renderIEEEPreview = () => {
    return (
      <div 
        className="bg-white p-6 shadow-sm min-h-[500px]"
        style={{ 
          transform: `scale(${zoom / 100})`,
          transformOrigin: "top left",
          width: `${100 / (zoom / 100)}%`,
          height: `${100 / (zoom / 100)}%`,
          fontFamily: "'Times New Roman', serif",
          fontSize: "12px",
          lineHeight: "1.4"
        }}
      >
        {/* Title */}
        {document.title && (
          <h1 className="text-center text-lg font-bold mb-4 leading-tight">
            {document.title}
          </h1>
        )}

        {/* Authors */}
        {document.authors && document.authors.length > 0 && (
          <div className="text-center mb-4 space-y-2">
            {document.authors.map((author, index) => (
              <div key={author.id}>
                <div className="font-semibold">{author.name}</div>
                {author.department && (
                  <div className="text-xs italic">{author.department}</div>
                )}
                {author.organization && (
                  <div className="text-xs italic">{author.organization}</div>
                )}
                {(author.city || author.state) && (
                  <div className="text-xs italic">
                    {author.city}{author.city && author.state && ", "}{author.state}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Abstract */}
        {document.abstract && (
          <div className="mb-4 text-justify text-xs leading-relaxed">
            <span className="italic font-semibold">Abstract—</span>
            {document.abstract}
          </div>
        )}

        {/* Keywords */}
        {document.keywords && (
          <div className="mb-4 text-xs leading-relaxed">
            <span className="font-semibold">Keywords: </span>
            {document.keywords}
          </div>
        )}

        {/* Sections */}
        {document.sections && document.sections.length > 0 && (
          <div className="space-y-3">
            {document.sections.map((section, index) => (
              <div key={section.id}>
                {section.title && (
                  <h2 className="font-bold text-xs mb-2">
                    {index + 1}. {section.title.toUpperCase()}
                  </h2>
                )}
                
                {/* Content Blocks */}
                {section.contentBlocks.map((block) => (
                  <div key={block.id} className="mb-2">
                    {block.type === "text" && block.content && (
                      <p className="text-justify text-xs">{block.content}</p>
                    )}
                    {block.type === "image" && block.imageId && (
                      <div className="my-4 text-center">
                        {block.content && (
                          <img 
                            src={block.content} 
                            alt={block.caption || "Figure"} 
                            className="max-w-full h-auto mx-auto border border-gray-300"
                            style={{ maxWidth: "200px" }}
                          />
                        )}
                        {block.caption && (
                          <p className="text-xs mt-2 italic">
                            Fig. {index + 1}. {block.caption}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Subsections */}
                {section.subsections.map((subsection) => (
                  <div key={subsection.id} className="mb-2">
                    {subsection.title && (
                      <h3 className="font-bold text-xs mb-1">
                        {String.fromCharCode(65 + subsection.order)}. {subsection.title}
                      </h3>
                    )}
                    {subsection.content && (
                      <p className="text-justify text-xs">{subsection.content}</p>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* References */}
        {document.references && document.references.length > 0 && (
          <div className="mt-6">
            <h3 className="font-bold text-xs mb-2">REFERENCES</h3>
            <div className="text-xs space-y-1">
              {document.references.map((ref, index) => (
                <div key={ref.id}>
                  [{index + 1}] {ref.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Preview Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Document Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button
              variant={previewMode === "ieee" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setPreviewMode("ieee")}
            >
              IEEE Format
            </Button>
            <Button
              variant={previewMode === "raw" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setPreviewMode("raw")}
            >
              Raw Content
            </Button>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => generateDocxMutation.mutate()}
              disabled={generateDocxMutation.isPending || !documentId}
            >
              <FileText className="w-4 h-4 mr-2 text-blue-600" />
              {generateDocxMutation.isPending ? "Generating..." : "DOCX"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => generateLatexMutation.mutate()}
              disabled={generateLatexMutation.isPending || !documentId}
            >
              <Code className="w-4 h-4 mr-2 text-green-600" />
              {generateLatexMutation.isPending ? "Generating..." : "LaTeX"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardContent className="p-0">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Live Preview</span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 50}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs text-gray-500 min-w-[40px] text-center">
                  {zoom}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 150}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-gray-100 max-h-96 overflow-auto">
            {previewMode === "ieee" ? (
              renderIEEEPreview()
            ) : (
              <div className="bg-white p-6 shadow-sm text-sm">
                <pre className="whitespace-pre-wrap font-mono text-xs">
                  {JSON.stringify(document, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Options */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Font Size</Label>
            <Select
              value={document.settings?.fontSize || "9.5pt"}
              onValueChange={(value) => {
                // In a real implementation, this would update the document settings
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="9pt">9pt</SelectItem>
                <SelectItem value="9.5pt">9.5pt (IEEE Standard)</SelectItem>
                <SelectItem value="10pt">10pt</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Column Layout</Label>
            <Select
              value={document.settings?.columns || "double"}
              onValueChange={(value) => {
                // In a real implementation, this would update the document settings
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Column</SelectItem>
                <SelectItem value="double">Two Column (IEEE)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="pageNumbers" 
                checked={document.settings?.includePageNumbers !== false}
              />
              <Label htmlFor="pageNumbers">Include page numbers</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="copyright" 
                checked={document.settings?.includeCopyright !== false}
              />
              <Label htmlFor="copyright">IEEE copyright notice</Label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
