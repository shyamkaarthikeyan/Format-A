import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ZoomIn, ZoomOut, Download, FileText, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SimplePaginatedPreview from "./simple-paginated-preview";
import type { Document } from "@shared/schema";

interface DocumentPreviewProps {
  document: Document;
  documentId: string | null;
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
      
      const response = await fetch('/api/generate/docx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(document),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate document: ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('Blob size:', blob.size, 'bytes');
      console.log('Blob type:', blob.type);
      
      if (blob.size === 0) {
        throw new Error('Generated document is empty');
      }
      
      const url = URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const link = window.document.createElement('a');
      link.href = url;
      link.download = "ieee_paper.docx";
      link.style.display = 'none';
      window.document.body.appendChild(link);
      
      // Force download with a slight delay
      setTimeout(() => {
        link.click();
        window.document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      return { success: true };
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
      
      const response = await fetch('/api/generate/latex', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(document),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate PDF document: ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('PDF Blob size:', blob.size, 'bytes');
      console.log('PDF Blob type:', blob.type);
      
      if (blob.size === 0) {
        throw new Error('Generated PDF document is empty');
      }
      
      const url = URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const link = window.document.createElement('a');
      link.href = url;
      link.download = "ieee_paper.pdf";
      link.style.display = 'none';
      window.document.body.appendChild(link);
      
      // Force download with a slight delay
      setTimeout(() => {
        link.click();
        window.document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      return { success: true };
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

  const renderContent = () => {
    if (previewMode === "ieee") {
      return (
        <div 
          style={{ 
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top left",
            width: `${100 / (zoom / 100)}%`,
            height: `${100 / (zoom / 100)}%`,
          }}
        >
          <SimplePaginatedPreview document={document} />
        </div>
      );
    } else {
      return (
        <div 
          className="bg-white shadow-sm min-h-[500px] p-6"
          style={{ 
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top left",
            width: `${100 / (zoom / 100)}%`,
            height: `${100 / (zoom / 100)}%`,
          }}
        >
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(document, null, 2)}
          </pre>
        </div>
      );
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Document Preview</CardTitle>
          <div className="flex items-center space-x-2">
            <Select value={previewMode} onValueChange={(value: "ieee" | "raw") => setPreviewMode(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ieee">IEEE</SelectItem>
                <SelectItem value="raw">Raw</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 50}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 min-w-[3rem] text-center">
              {zoom}%
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 150}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateDocxMutation.mutate()}
              disabled={generateDocxMutation.isPending}
            >
              <FileText className="h-4 w-4 mr-1" />
              {generateDocxMutation.isPending ? "Generating..." : "Word"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generatePdfMutation.mutate()}
              disabled={generatePdfMutation.isPending}
            >
              <Download className="h-4 w-4 mr-1" />
              {generatePdfMutation.isPending ? "Generating..." : "PDF"}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-auto p-4">
        <div className="min-h-full">
          {renderContent()}
        </div>
      </CardContent>
    </Card>
  );
}