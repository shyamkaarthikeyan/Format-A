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
      // Validation based on Streamlit implementation
      if (!document.title) {
        throw new Error("Please enter a title.");
      }
      if (!document.authors || !document.authors.some(author => author.name)) {
        throw new Error("Please enter at least one author name.");
      }
      
      const { generateDocxDocument, downloadFile } = await import("@/lib/document-generator");
      const result = await generateDocxDocument(document);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to generate document");
      }
      
      if (result.downloadUrl) {
        downloadFile(result.downloadUrl, "ieee_paper.docx");
      }
      
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Word Document Generated",
        description: "IEEE-formatted Word document has been downloaded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generatePdfMutation = useMutation({
    mutationFn: async () => {
      // Validation based on Streamlit implementation
      if (!document.title) {
        throw new Error("Please enter a title.");
      }
      if (!document.authors || !document.authors.some(author => author.name)) {
        throw new Error("Please enter at least one author name.");
      }
      
      const { generateLatexDocument, downloadFile } = await import("@/lib/document-generator");
      const result = await generateLatexDocument(document);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to generate document");
      }
      
      if (result.downloadUrl) {
        downloadFile(result.downloadUrl, "ieee_paper.pdf");
      }
      
      return result;
    },
    onSuccess: () => {
      toast({
        title: "PDF Document Generated",
        description: "IEEE-formatted PDF file has been downloaded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
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
        className="bg-white shadow-sm min-h-[500px] ieee-format"
        style={{ 
          transform: `scale(${zoom / 100})`,
          transformOrigin: "top left",
          width: `${100 / (zoom / 100)}%`,
          height: `${100 / (zoom / 100)}%`,
          fontFamily: "'Times New Roman', serif",
          fontSize: "9.5px",
          lineHeight: "10px",
          padding: "0.75in",
          margin: 0,
          textAlign: "justify",
          columnCount: 2,
          columnGap: "0.25in"
        }}
      >
        {/* Title */}
        {document.title && (
          <div 
            className="text-center font-bold mb-3"
            style={{ 
              fontSize: "24px", 
              lineHeight: "26px",
              columnSpan: "all",
              marginBottom: "12px"
            }}
          >
            {document.title}
          </div>
        )}

        {/* Authors */}
        {document.authors && document.authors.length > 0 && (
          <div 
            className="text-center mb-4"
            style={{ 
              columnSpan: "all",
              marginBottom: "12px"
            }}
          >
            <div className="flex justify-center space-x-8">
              {document.authors.map((author, index) => (
                <div key={author.id} className="text-center">
                  <div className="font-bold">{author.name}</div>
                  {author.department && (
                    <div className="italic text-xs">{author.department}</div>
                  )}
                  {author.organization && (
                    <div className="italic text-xs">{author.organization}</div>
                  )}
                  {(author.city || author.state) && (
                    <div className="italic text-xs">
                      {author.city}{author.city && author.state && ", "}{author.state}
                    </div>
                  )}
                  {author.email && (
                    <div className="text-xs">{author.email}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Abstract - Single Column Layout */}
        {document.abstract && (
          <div 
            className="mb-3 text-xs"
            style={{ 
              textAlign: "justify",
              marginBottom: "12px",
              marginLeft: "0.5in",
              marginRight: "0.5in",
              lineHeight: "1.2",
              wordSpacing: "normal",
              hyphens: "auto"
            }}
          >
            <span className="italic font-bold">Abstract—</span>
            {document.abstract}
          </div>
        )}

        {/* Keywords */}
        {document.keywords && (
          <div 
            className="mb-4"
            style={{ 
              textAlign: "justify",
              marginBottom: "10px",
              textIndent: "0.2in",
              marginLeft: "0.2in",
              marginRight: "0.2in"
            }}
          >
            <span className="font-bold">Keywords: </span>
            {document.keywords}
          </div>
        )}

        {/* Sections - Two Column Layout */}
        {document.sections && document.sections.length > 0 && (
          <div 
            className="space-y-3"
            style={{
              columnCount: 2,
              columnGap: "0.25in",
              columnFill: "balance"
            }}
          >
            {document.sections.map((section, index) => (
              <div key={section.id} className="break-inside-avoid">
                {section.title && (
                  <h2 className="font-bold text-xs mb-2" style={{ breakAfter: "avoid" }}>
                    {index + 1}. {section.title.toUpperCase()}
                  </h2>
                )}
                
                {/* Content Blocks */}
                {section.contentBlocks.map((block) => (
                  <div key={block.id} className="mb-2 break-inside-avoid">
                    {block.type === "text" && block.content && (
                      <p 
                        className="text-justify text-xs"
                        style={{
                          textIndent: "0.125in",
                          lineHeight: "1.2",
                          wordSpacing: "normal",
                          hyphens: "auto"
                        }}
                      >
                        {block.content}
                      </p>
                    )}
                    {block.type === "image" && block.content && (
                      <div className="text-center my-2 break-inside-avoid">
                        <img 
                          src={block.content} 
                          alt={block.caption || "Figure"} 
                          className="mx-auto border border-gray-300"
                          style={{ 
                            maxWidth: block.size === "very-small" ? "1.2in" :
                                     block.size === "small" ? "1.8in" :
                                     block.size === "large" ? "3.2in" : "2.5in",
                            maxHeight: "3in"
                          }}
                        />
                        {block.caption && (
                          <div 
                            className="mt-1"
                            style={{ 
                              fontSize: "9px",
                              textAlign: "center"
                            }}
                          >
                            Fig. {index + 1}: {block.caption}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Subsections */}
                {section.subsections.map((subsection, subIndex) => (
                  <div key={subsection.id} className="mb-2 break-inside-avoid">
                    {subsection.title && (
                      <h3 className="font-bold text-xs mb-1" style={{ breakAfter: "avoid" }}>
                        {index + 1}.{subIndex + 1} {subsection.title}
                      </h3>
                    )}
                    {subsection.content && (
                      <div 
                        className="text-xs"
                        style={{ 
                          textAlign: "justify",
                          textIndent: "0.125in",
                          lineHeight: "1.2",
                          wordSpacing: "normal",
                          marginBottom: "12px",
                          hyphens: "auto"
                        }}
                      >
                        {subsection.content}
                      </div>
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
              size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => generateDocxMutation.mutate()}
              disabled={generateDocxMutation.isPending}
            >
              <FileText className="w-4 h-4 mr-2" />
              {generateDocxMutation.isPending ? "Generating..." : "Download Word"}
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              onClick={() => generatePdfMutation.mutate()}
              disabled={generatePdfMutation.isPending}
            >
              <FileText className="w-4 h-4 mr-2" />
              {generatePdfMutation.isPending ? "Generating..." : "Download PDF"}
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
            {renderIEEEPreview()}
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
