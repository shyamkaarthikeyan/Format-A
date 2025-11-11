import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ZoomIn, ZoomOut, Download, FileText, Mail, RefreshCw, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { documentApi } from "@/lib/api";
import type { Document } from "@shared/schema";

// Utility functions for file handling
const base64ToBlob = (base64Data: string, contentType: string): Blob => {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
};

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// CSS to hide PDF browser controls while keeping interactivity
const pdfHideControlsCSS = `
  object[type="application/pdf"] {
    outline: none;
    border: none;
  }
  
  .pdf-preview-container {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
  }
  
  .pdf-preview-container iframe {
    pointer-events: auto !important;
  }
`;

// Inject the CSS into the document head
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = pdfHideControlsCSS;
  document.head.appendChild(style);
}

interface DocumentPreviewProps {
  document: Document;
  documentId: string | null;
}

// Helper function to record download with enhanced error handling and retry logic
async function recordDownload(documentData: any, format: string, fileSize: number = 0) {
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (!token) {
        console.warn('No auth token found - skipping download recording');
        return false;
      }

      console.log(`Recording download: ${documentData.title} (${format}) - attempt ${retryCount + 1}`);

      const response = await fetch('/api/record-download', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentTitle: documentData.title || 'Untitled Document',
          fileFormat: format,
          fileSize: fileSize,
          documentMetadata: {
            authors: documentData.authors?.map((a: any) => a.name).filter(Boolean) || [],
            authorsCount: documentData.authors?.length || 0,
            sections: documentData.sections?.length || 0,
            references: documentData.references?.length || 0,
            figures: documentData.figures?.length || 0,
            wordCount: estimateWordCount(documentData),
            generatedAt: new Date().toISOString(),
            source: 'frontend_api'
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('✅ Download recorded successfully:', result.data?.id);
          return true;
        } else {
          throw new Error(result.error?.message || 'Recording failed');
        }
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
    } catch (error) {
      retryCount++;
      console.warn(`Failed to record download (attempt ${retryCount}/${maxRetries}):`, error);
      
      if (retryCount >= maxRetries) {
        console.error('❌ Failed to record download after all retries:', error);
        return false;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
    }
  }
  
  return false;
}

// Helper function to estimate word count
function estimateWordCount(documentData: any): number {
  let wordCount = 0;
  
  if (documentData.abstract) {
    wordCount += documentData.abstract.split(' ').length;
  }
  
  if (documentData.sections) {
    documentData.sections.forEach((section: any) => {
      if (section.contentBlocks) {
        section.contentBlocks.forEach((block: any) => {
          if (block.type === 'text' && block.content) {
            wordCount += block.content.split(' ').length;
          }
        });
      }
    });
  }
  
  return wordCount;
}

export default function DocumentPreview({ document, documentId }: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(75);
  const [email, setEmail] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState<'download' | 'email' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Debugging to verify document data
  console.log("IEEE Word preview rendering with:", {
    title: document.title,
    hasAuthors: document.authors && document.authors.length > 0,
    hasAbstract: !!document.abstract,
    hasKeywords: !!document.keywords,
    sectionsCount: document.sections?.length || 0,
    sectionsData: document.sections?.map(s => ({
      title: s.title,
      contentBlocksCount: s.contentBlocks?.length || 0,
    })) || [],
    referencesCount: document.references?.length || 0,
    figuresCount: document.figures?.length || 0,
    tablesCount: document.tables?.length || 0
  });

  // DOCX Generation Mutation - Only for DOCX downloads
  const generateDocxMutation = useMutation({
    mutationKey: ['generateDocx'],
    mutationFn: async () => {
      if (!document.title) throw new Error("Please enter a title.");
      if (!document.authors?.some(author => author.name)) {
        throw new Error("Please add at least one author.");
      }

      console.log('Generating DOCX using Python backend API...');
      const result = await documentApi.generateDocx(document);
      
      if (!result.success || !result.file_data) {
        throw new Error(result.message || 'Failed to generate DOCX');
      }

      const docxBlob = base64ToBlob(result.file_data, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      
      if (!docxBlob || docxBlob.size === 0) {
        throw new Error('Generated DOCX file is empty');
      }

      downloadBlob(docxBlob, "ieee_paper.docx");
      
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Word Document Generated",
        description: "IEEE-formatted Word document has been downloaded successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Error",
        description: error instanceof Error ? error.message : "An error occurred while generating the document.",
        variant: "destructive"
      });
    }
  });

  // PDF Generation Mutation - Only Word→PDF conversion
  const generatePdfMutation = useMutation({
    mutationKey: ['generatePdf'],
    mutationFn: async () => {
      if (!document.title) throw new Error("Please enter a title.");
      if (!document.authors?.some(author => author.name)) {
        throw new Error("Please add at least one author.");
      }

      console.log('Generating PDF for download (Word→PDF conversion)...');

      // Use Word→PDF conversion pipeline
      const result = await documentApi.generatePdf(document, false); // false = download mode
      
      if (!result.success || !result.file_data) {
        throw new Error(result.message || 'Failed to generate PDF');
      }

      // Verify it's actually a PDF
      if (result.file_type !== 'application/pdf') {
        throw new Error('Server returned non-PDF format');
      }

      const pdfBlob = base64ToBlob(result.file_data, 'application/pdf');
      
      if (!pdfBlob || pdfBlob.size === 0) {
        throw new Error('Generated PDF file is empty');
      }

      downloadBlob(pdfBlob, "ieee_paper.pdf");
      
      return result;
    },
    onSuccess: () => {
      toast({
        title: "PDF Generated",
        description: "IEEE-formatted PDF document has been downloaded successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Error",
        description: error instanceof Error ? error.message : "An error occurred while generating the document.",
        variant: "destructive"
      });
    }
  });

  // Handle authentication required
  const handleAuthRequired = (action: 'download' | 'email') => {
    setPendingAction(action);
    setShowAuthPrompt(true);
  };

  // Handle download actions
  const handleDownloadDocx = () => {
    if (!isAuthenticated) {
      handleAuthRequired('download');
      return;
    }
    generateDocxMutation.mutate();
  };

  const handleDownloadPdf = () => {
    if (!isAuthenticated) {
      handleAuthRequired('download');
      return;
    }
    generatePdfMutation.mutate();
  };

  const handleEmailDocument = () => {
    if (!isAuthenticated) {
      handleAuthRequired('email');
      return;
    }
    
    toast({
      title: "Email Feature",
      description: "Email functionality will be implemented for authenticated users."
    });
  };

  // Generate PDF preview - Word→PDF conversion only
  const generatePdfPreview = async () => {
    if (!document.title || !document.authors?.some(author => author.name)) {
      setPreviewError("Please add a title and at least one author to generate preview");
      setPdfUrl(null);
      return;
    }

    setIsGeneratingPreview(true);
    setPreviewError(null);

    try {
      console.log('Generating PDF preview (Word→PDF conversion)...');

      // Use Word→PDF conversion pipeline for preview
      const result = await documentApi.generatePdf(document, true); // true = preview mode
      
      if (!result.success || !result.file_data) {
        throw new Error(result.message || 'Failed to generate PDF preview');
      }

      // Verify it's actually a PDF
      if (result.file_type !== 'application/pdf') {
        throw new Error('Server returned non-PDF format for preview');
      }

      const pdfBlob = base64ToBlob(result.file_data, 'application/pdf');

      if (!pdfBlob || pdfBlob.size === 0) {
        throw new Error('Generated PDF preview is empty');
      }

      // Clean up previous URL
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      // Create new blob URL for preview display
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);

      // Extract page count from PDF if possible
      try {
        const arrayBuffer = await pdfBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const text = new TextDecoder().decode(uint8Array);
        const pageMatches = text.match(/\/Count\s+(\d+)/);
        if (pageMatches) {
          setTotalPages(parseInt(pageMatches[1], 10));
        } else {
          setTotalPages(1);
        }
      } catch (e) {
        console.warn('Could not extract page count:', e);
        setTotalPages(1);
      }

      console.log('✅ PDF preview generated successfully (Word→PDF conversion)');

      toast({
        title: 'Preview Generated',
        description: 'PDF preview created using Word→PDF conversion',
      });

    } catch (error) {
      console.error('❌ PDF preview generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate PDF preview';
      setPreviewError(errorMessage);
      setPdfUrl(null);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Auto-generate preview when document changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (document.title && document.authors?.some(author => author.name)) {
        console.log('Triggering PDF preview generation...');
        generatePdfPreview();
      } else {
        console.log('Skipping PDF generation - missing title or authors');
        setPdfUrl(null);
        setPreviewError(null);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timer);
  }, [document.title, document.authors, document.sections, document.abstract, document.keywords, document.references]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  return (
    <div className="h-full flex flex-col">
      {/* Header with download buttons */}
      <Card className="bg-white/80 backdrop-blur-sm border-purple-200 shadow-lg mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-900">
              <Download className="w-5 h-5 text-purple-600" />
              Download Options
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleDownloadDocx}
              disabled={generateDocxMutation.isPending || !document.title}
              variant="outline"
              className="border-2 border-blue-500 text-blue-600 hover:bg-blue-50 hover:border-blue-600 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <FileText className="w-4 h-4 mr-2" />
              {generateDocxMutation.isPending ? "Generating..." : "Download Word"}
            </Button>
            
            <Button
              onClick={handleDownloadPdf}
              disabled={generatePdfMutation.isPending || !document.title}
              variant="outline"
              className="border-2 border-purple-500 text-purple-600 hover:bg-purple-50 hover:border-purple-600 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <FileText className="w-4 h-4 mr-2" />
              {generatePdfMutation.isPending ? "Generating..." : "Download PDF"}
            </Button>

            <Button
              onClick={handleEmailDocument}
              disabled={!document.title}
              variant="outline"
              className="border-2 border-green-500 text-green-600 hover:bg-green-50 hover:border-green-600 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <Mail className="w-4 h-4 mr-2" />
              Email Document
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PDF Preview Section */}
      <Card className="bg-white/80 backdrop-blur-sm border-purple-200 shadow-lg flex-1">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-900">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              Live PDF Preview (Word→PDF)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={generatePdfPreview}
                disabled={isGeneratingPreview || !document.title}
                className="text-purple-600 hover:text-purple-700"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isGeneratingPreview ? 'animate-spin' : ''}`} />
                {isGeneratingPreview ? 'Generating...' : 'Refresh'}
              </Button>
              
              {pdfUrl && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoom(Math.max(25, zoom - 25))}
                    disabled={zoom <= 25}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-600 min-w-[60px] text-center">{zoom}%</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoom(Math.min(200, zoom + 25))}
                    disabled={zoom >= 200}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <div className="h-full">
            {previewError ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-6">
                  <FileText className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-sm">{previewError}</p>
                  <Button
                    onClick={generatePdfPreview}
                    disabled={isGeneratingPreview}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isGeneratingPreview ? 'animate-spin' : ''}`} />
                    Try Again
                  </Button>
                </div>
              </div>
            ) : isGeneratingPreview ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-6">
                  <RefreshCw className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-600">Generating PDF preview using Word→PDF conversion...</p>
                  <p className="text-gray-500 text-sm mt-2">This may take a few seconds</p>
                </div>
              </div>
            ) : pdfUrl ? (
              <div className="h-full pdf-preview-container">
                <div 
                  className="h-full"
                  style={{ 
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top left',
                    width: `${10000 / zoom}%`,
                    height: `${10000 / zoom}%`
                  }}
                >
                  <iframe
                    src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&statusbar=0&messages=0&view=FitV&page=${currentPage}`}
                    className="w-full h-full border-0 shadow-lg"
                    style={{
                      outline: 'none',
                      border: 'none',
                      borderRadius: '4px',
                      pointerEvents: 'auto'
                    }}
                    title="PDF Preview"
                    key={`pdf-${currentPage}`}
                  >
                    {/* Fallback message */}
                    <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded">
                      <div className="text-center p-6">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">PDF Preview Not Available</p>
                        <p className="text-gray-500 text-sm">Please use the download buttons above to get your IEEE paper.</p>
                      </div>
                    </div>
                  </iframe>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-6">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No preview available</p>
                  <p className="text-gray-500 text-sm">Add a title and author to generate preview</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Authentication Prompt Modal */}
      {showAuthPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-purple-600" />
              <h3 className="text-lg font-semibold">Sign In Required</h3>
            </div>
            
            <p className="text-gray-600 mb-4">
              To {pendingAction} your document, please sign in to your account.
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
              <Button 
                onClick={() => window.location.href = '/signin'} 
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                Sign In
              </Button>
              <Button 
                onClick={() => setShowAuthPrompt(false)} 
                variant="outline" 
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}