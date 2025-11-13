import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Download, FileText, Mail, RefreshCw, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { documentApi } from "@/lib/api";
import type { Document } from "@shared/schema";
import { usePDFGeneration } from "@/hooks/use-pdf-generation";
import { PDFGenerationProgress, PDFGenerationModal } from "@/components/pdf-generation-progress";

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
}





export default function DocumentPreview({ document }: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(100);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfKey, setPdfKey] = useState<string>(''); // Force iframe re-render
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState<'download' | 'email' | null>(null);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  
  // PDF generation state management
  const pdfGeneration = usePDFGeneration();
  const [showProgressModal, setShowProgressModal] = useState(false);

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

      // Show progress modal and set initial state
      setShowProgressModal(true);
      pdfGeneration.setGeneratingWord();

      try {
        // Use Word→PDF conversion pipeline
        const result = await documentApi.generatePdf(document, false); // false = download mode

        // Update to converting state (this happens quickly in the API)
        pdfGeneration.setConvertingPdf();

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

        // Set complete state
        pdfGeneration.setComplete();
        
        // Close modal after a short delay
        setTimeout(() => {
          setShowProgressModal(false);
          pdfGeneration.reset();
        }, 2000);

        return result;
      } catch (error) {
        // Set error state
        pdfGeneration.setError(error as Error);
        throw error;
      }
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
    
    // Set generating state for preview
    pdfGeneration.setGeneratingWord();

    try {
      console.log('Generating PDF preview (Word→PDF conversion)...');
      console.log('📋 Full Document data being sent:', {
        title: document.title,
        authors: document.authors,
        abstract: document.abstract,
        keywords: document.keywords,
        sections: document.sections,
        references: document.references,
        tables: document.tables,
        figures: document.figures
      });

      // Clean up previous URL BEFORE generating new one
      if (pdfUrl) {
        console.log('🧹 Cleaning up previous PDF URL...');
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }

      // Use Word→PDF conversion pipeline for preview
      const result = await documentApi.generatePdf(document, true); // true = preview mode

      // Update to converting state
      pdfGeneration.setConvertingPdf();

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

      console.log(`✅ PDF blob created: ${pdfBlob.size} bytes`);

      // FIXED DEBUG: Inspect PDF content properly as binary data
      const reader = new FileReader();
      reader.onload = function (e) {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Check PDF header (first 4 bytes should be '%PDF')
        const pdfHeader = String.fromCharCode(...uint8Array.slice(0, 4));
        const isValidPDF = pdfHeader === '%PDF';

        console.log('🔍 PDF Content Analysis:', {
          size: arrayBuffer.byteLength,
          isValidPDF: isValidPDF,
          pdfHeader: pdfHeader,
          firstAuthorName: document.authors?.[0]?.name || 'No author',
          documentTitle: document.title || 'No title'
        });
        
        if (isValidPDF) {
          console.log('✅ Valid PDF format detected');
        }
      };
      reader.readAsArrayBuffer(pdfBlob);

      // Create new blob URL with aggressive cache-busting
      const url = URL.createObjectURL(pdfBlob);
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const urlWithCacheBuster = `${url}#t=${timestamp}&r=${random}&nocache=true`;

      console.log('🔗 New PDF URL created:', urlWithCacheBuster);
      console.log('📊 PDF blob details:', {
        size: pdfBlob.size,
        type: pdfBlob.type,
        timestamp: timestamp,
        random: random
      });

      setPdfUrl(urlWithCacheBuster);
      setPdfKey(`pdf-${timestamp}-${random}`); // Force iframe re-render

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
    // Clear any existing preview error when document changes
    setPreviewError(null);

    const timer = setTimeout(() => {
      if (document.title && document.authors?.some(author => author.name)) {
        console.log('Triggering PDF preview generation...');
        generatePdfPreview();
      } else {
        console.log('Skipping PDF generation - missing title or authors');
        // Clean up previous URL when requirements not met
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
          setPdfUrl(null);
        }
        setPreviewError(null);
      }
    }, 1000); // Reduced to 1 second for better responsiveness

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
                    onClick={() => setZoom(Math.max(50, zoom - 25))}
                    disabled={zoom <= 50}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-600 min-w-[60px] text-center">{zoom}%</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoom(Math.min(150, zoom + 25))}
                    disabled={zoom >= 150}
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
              <div className="h-full pdf-preview-container overflow-auto bg-gray-50">
                <div className="flex justify-center py-6 px-4 min-h-full">
                  <div
                    className="shadow-2xl rounded-lg overflow-hidden bg-white border border-gray-200 transition-transform duration-200"
                    style={{
                      transform: `scale(${zoom / 100})`,
                      transformOrigin: 'top center',
                      width: '8.5in',
                      height: '11in',
                      maxWidth: '100%'
                    }}
                  >
                    <iframe
                      key={pdfKey || pdfUrl} // Force re-render with unique key
                      src={`${pdfUrl.split('#')[0]}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&view=FitH&zoom=100`}
                      className="w-full h-full border-0 rounded-lg"
                      style={{
                        width: '100%',
                        height: '100%',
                        outline: 'none',
                        border: 'none'
                      }}
                      title="PDF Preview"
                      onLoad={() => console.log('📄 PDF iframe loaded successfully with key:', pdfKey)}
                      onError={() => console.error('❌ PDF iframe failed to load')}
                    />
                  </div>
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