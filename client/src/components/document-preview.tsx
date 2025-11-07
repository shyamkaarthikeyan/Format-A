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
import jsPDF from "jspdf";

// CSS to hide PDF browser controls
const pdfHideControlsCSS = `
  object[type="application/pdf"] {
    outline: none;
    border: none;
  }
  
  /* Hide context menu and selection */
  .pdf-preview-container {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
  }
  
  .pdf-preview-container * {
    pointer-events: none !important;
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

// Client-side PDF generation function using jsPDF
function generateClientSidePDF(document: Document): Blob {
  try {
    // Validate document data
    if (!document) {
      throw new Error('Document data is missing');
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 54; // 0.75 inch margin
    const contentWidth = pageWidth - 2 * margin;
    let currentY = margin;

  // Helper function to add text with word wrapping
  const addText = (text: string, fontSize: number, fontStyle: string = 'normal', align: 'left' | 'center' = 'left') => {
    try {
      if (!text || typeof text !== 'string') {
        console.warn('Invalid text provided to addText:', text);
        return currentY;
      }

      pdf.setFontSize(fontSize);
      pdf.setFont('times', fontStyle);
      
      const lines = pdf.splitTextToSize(text, contentWidth);
      
      for (let i = 0; i < lines.length; i++) {
        // Check if we need a new page
        if (currentY + fontSize > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }
        
        if (align === 'center') {
          const textWidth = pdf.getTextWidth(lines[i]);
          pdf.text(lines[i], (pageWidth - textWidth) / 2, currentY);
        } else {
          pdf.text(lines[i], margin, currentY);
        }
        
        currentY += fontSize + 4; // Add line spacing
      }
      
      return currentY;
    } catch (error) {
      console.error('Error in addText:', error);
      return currentY;
    }
  };

  // Title
  if (document.title && typeof document.title === 'string') {
    try {
      pdf.setFontSize(24);
      pdf.setFont('times', 'bold');
      const titleWidth = pdf.getTextWidth(document.title);
      pdf.text(document.title, (pageWidth - titleWidth) / 2, currentY);
      currentY += 40;
    } catch (error) {
      console.error('Error adding title:', error);
    }
  }

  // Authors - IEEE format with proper spacing
  if (document.authors && Array.isArray(document.authors) && document.authors.length > 0) {
    try {
      const validAuthors = document.authors.filter(author => author && author.name && typeof author.name === 'string');
      
      if (validAuthors.length > 0) {
        // Calculate spacing for multiple authors
        const authorSpacing = contentWidth / validAuthors.length;
        let currentX = margin;
        
        validAuthors.forEach((author, index) => {
          // Author name in bold
          pdf.setFontSize(12);
          pdf.setFont('times', 'bold');
          const authorName = author.name;
          const nameWidth = pdf.getTextWidth(authorName);
          const centerX = currentX + (authorSpacing - nameWidth) / 2;
          pdf.text(authorName, centerX, currentY);
          
          // Author details in italic (if available)
          let detailY = currentY + 15;
          pdf.setFontSize(10);
          pdf.setFont('times', 'italic');
          
          // Add department, organization, etc.
          const details = [];
          if (author.department) details.push(author.department);
          if (author.organization) details.push(author.organization);
          if (author.city) details.push(author.city);
          if (author.state) details.push(author.state);
          
          details.forEach(detail => {
            if (detail) {
              const detailWidth = pdf.getTextWidth(detail);
              const detailCenterX = currentX + (authorSpacing - detailWidth) / 2;
              pdf.text(detail, detailCenterX, detailY);
              detailY += 12;
            }
          });
          
          currentX += authorSpacing;
        });
        
        currentY = detailY + 10; // Move past all author details
      }
    } catch (error) {
      console.error('Error adding authors:', error);
    }
  }

  // Abstract
  if (document.abstract && typeof document.abstract === 'string') {
    try {
      currentY += 10;
      pdf.setFontSize(10);
      
      // Add "Abstract—" in italic and abstract content on SAME line
      pdf.setFont('times', 'italic');
      const abstractTitle = 'Abstract—';
      pdf.text(abstractTitle, margin, currentY);
      
      // Calculate position for content right after title (same line)
      const titleWidth = pdf.getTextWidth(abstractTitle);
      const contentStartX = margin + titleWidth;
      
      // Add abstract content in normal font on same line
      pdf.setFont('times', 'normal');
      const remainingWidth = contentWidth - titleWidth;
      const abstractLines = pdf.splitTextToSize(document.abstract, remainingWidth);
      
      // First line goes on same line as title
      if (abstractLines.length > 0) {
        pdf.text(abstractLines[0], contentStartX, currentY);
        currentY += 12;
        
        // Remaining lines on subsequent lines
        for (let i = 1; i < abstractLines.length; i++) {
          if (currentY + 10 > pageHeight - margin) {
            pdf.addPage();
            currentY = margin;
          }
          pdf.text(abstractLines[i], margin, currentY);
          currentY += 12;
        }
      }
      currentY += 10;
    } catch (error) {
      console.error('Error adding abstract:', error);
    }
  }

  // Keywords
  if (document.keywords && typeof document.keywords === 'string') {
    try {
      pdf.setFontSize(10);
      
      // Add "Keywords—" in italic and keywords content on SAME line
      pdf.setFont('times', 'italic');
      const keywordsTitle = 'Keywords—';
      pdf.text(keywordsTitle, margin, currentY);
      
      // Calculate position for content right after title (same line)
      const titleWidth = pdf.getTextWidth(keywordsTitle);
      const contentStartX = margin + titleWidth;
      
      // Add keywords content in normal font on same line
      pdf.setFont('times', 'normal');
      const remainingWidth = contentWidth - titleWidth;
      const keywordLines = pdf.splitTextToSize(document.keywords, remainingWidth);
      
      // First line goes on same line as title
      if (keywordLines.length > 0) {
        pdf.text(keywordLines[0], contentStartX, currentY);
        currentY += 12;
        
        // Remaining lines on subsequent lines
        for (let i = 1; i < keywordLines.length; i++) {
          if (currentY + 10 > pageHeight - margin) {
            pdf.addPage();
            currentY = margin;
          }
          pdf.text(keywordLines[i], margin, currentY);
          currentY += 12;
        }
      }
      currentY += 20;
    } catch (error) {
      console.error('Error adding keywords:', error);
    }
  }

  // Sections
  if (document.sections && Array.isArray(document.sections) && document.sections.length > 0) {
    try {
      document.sections.forEach((section, index) => {
        if (section && section.title && typeof section.title === 'string') {
          try {
            // Section title - IEEE format: bold, centered, uppercase
            currentY += 10;
            pdf.setFontSize(12);
            pdf.setFont('times', 'bold');
            const sectionTitle = `${index + 1}. ${section.title.toUpperCase()}`;
            
            if (currentY + 12 > pageHeight - margin) {
              pdf.addPage();
              currentY = margin;
            }
            
            // Center the section title
            const titleWidth = pdf.getTextWidth(sectionTitle);
            const centerX = (pageWidth - titleWidth) / 2;
            pdf.text(sectionTitle, centerX, currentY);
            currentY += 20;
            
            // Section content (check both 'content' and 'body' properties)
            const sectionContent = (section as any).content || (section as any).body;
            if (sectionContent && typeof sectionContent === 'string') {
              pdf.setFontSize(10);
              pdf.setFont('times', 'normal');
              const contentLines = pdf.splitTextToSize(sectionContent, contentWidth);
              contentLines.forEach((line: string) => {
                if (currentY + 10 > pageHeight - margin) {
                  pdf.addPage();
                  currentY = margin;
                }
                pdf.text(line, margin, currentY);
                currentY += 12;
              });
              currentY += 10;
            }
          } catch (sectionError) {
            console.error('Error adding section:', section.title, sectionError);
          }
        }
      });
    } catch (error) {
      console.error('Error adding sections:', error);
    }
  }

  // References
  if (document.references && Array.isArray(document.references) && document.references.length > 0) {
    try {
      currentY += 20;
      
      // References heading
      pdf.setFontSize(12);
      pdf.setFont('times', 'bold');
      
      if (currentY + 12 > pageHeight - margin) {
        pdf.addPage();
        currentY = margin;
      }
      
      pdf.text('References', margin, currentY);
      currentY += 20;
      
      // Reference list
      pdf.setFontSize(9);
      pdf.setFont('times', 'normal');
      
      document.references.forEach((ref, index) => {
        if (ref && ref.text && typeof ref.text === 'string') {
          try {
            const refText = `[${index + 1}] ${ref.text}`;
            const refLines = pdf.splitTextToSize(refText, contentWidth);
            
            refLines.forEach((line: string) => {
              if (currentY + 9 > pageHeight - margin) {
                pdf.addPage();
                currentY = margin;
              }
              pdf.text(line, margin, currentY);
              currentY += 11;
            });
            currentY += 5;
          } catch (refError) {
            console.error('Error adding reference:', ref.text, refError);
          }
        }
      });
    } catch (error) {
      console.error('Error adding references:', error);
    }
  }

    return pdf.output('blob');
  } catch (error) {
    console.error('Error in generateClientSidePDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export default function DocumentPreview({ document, documentId }: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(75);
  const [email, setEmail] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [previewImages, setPreviewImages] = useState<any[]>([]);
  const [previewMode, setPreviewMode] = useState<'pdf' | 'images'>('pdf');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState<'download' | 'email' | null>(null);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Debugging to verify document data
  console.log("IEEE Word preview rendering with:", {
    title: document.title,
    hasAuthors: document.authors && document.authors.length > 0,
    hasAbstract: !!document.abstract,
    hasKeywords: !!document.keywords,
    sectionsCount: document.sections?.length || 0,
    referencesCount: document.references?.length || 0,
  });

  // Mutations for generating and emailing documents
  const generateDocxMutation = useMutation({
    mutationFn: async () => {
      if (!document.title) throw new Error("Please enter a title.");
      if (!document.authors || !document.authors.some(author => author.name)) {
        throw new Error("Please enter at least one author name.");
      }

      console.log('Generating PDF for download (client-side)...');
      
      // Since Python backend DOCX generation is not yet implemented for downloads,
      // use client-side PDF generation which already works perfectly
      const pdfBlob = generateClientSidePDF(document);
      
      if (!pdfBlob || pdfBlob.size === 0) {
        throw new Error('Failed to generate PDF document');
      }
      
      // Download as PDF instead of DOCX for now - provides better formatting
      const url = URL.createObjectURL(pdfBlob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = "ieee_paper.pdf";
      link.click();
      URL.revokeObjectURL(url);

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "PDF Document Generated",
        description: "IEEE-formatted PDF document has been downloaded successfully.",
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
      if (!document.title) throw new Error("Please enter a title.");
      if (!document.authors || !document.authors.some(author => author.name)) {
        throw new Error("Please enter at least one author name.");
      }

      console.log('Generating PDF for download (client-side)...');
      
      // Use client-side PDF generation for reliable downloads
      const pdfBlob = generateClientSidePDF(document);
      
      if (!pdfBlob || pdfBlob.size === 0) {
        throw new Error('Failed to generate PDF document');
      }
      
      // Download the generated PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = "ieee_paper.pdf";
      link.click();
      URL.revokeObjectURL(url);

      return { 
        success: true, 
        message: "IEEE-formatted PDF file has been downloaded successfully." 
      };
    },
    onSuccess: (data) => {
      toast({
        title: "Document Generated",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (emailAddress: string) => {
      if (!document.title) throw new Error("Please enter a title.");
      if (!document.authors || !document.authors.some(author => author.name)) {
        throw new Error("Please enter at least one author name.");
      }
      if (!emailAddress) throw new Error("Please enter an email address.");

      console.log('Sending email using Python backend API...');
      const result = await documentApi.generateEmail({
        email: emailAddress,
        documentData: document,
      });

      return result;
    },
    onSuccess: () => {
      toast({
        title: "Email Sent Successfully!",
        description: `IEEE paper has been sent to ${email}`,
      });
      setEmail("");
    },
    onError: (error: Error) => {
      toast({
        title: "Email Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Auth handlers
  const handleAuthRequired = (action: 'download' | 'email') => {
    setPendingAction(action);
    setShowAuthPrompt(true);
  };

  const handleSignIn = () => {
    window.location.href = '/signin';
  };

  const handleCancelAuth = () => {
    setShowAuthPrompt(false);
    setPendingAction(null);
  };

  // Download handlers - now work without authentication
  const handleDownloadWord = () => {
    console.log('Download Word clicked, isAuthenticated:', isAuthenticated);
    console.log('Generating DOCX (authentication not required)');
    generateDocxMutation.mutate();
  };

  const handleDownloadPdf = () => {
    console.log('Download PDF clicked, isAuthenticated:', isAuthenticated);
    console.log('Generating PDF (authentication not required)');
    generatePdfMutation.mutate();
  };

  const handleSendEmail = () => {
    if (!isAuthenticated) {
      handleAuthRequired('email');
      return;
    }
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }
    sendEmailMutation.mutate(email.trim());
  };

  // Generate PDF preview (client-side - fast and reliable)
  const generateDocxPreview = async () => {
    if (!document.title || !document.authors?.some(author => author.name)) {
      setPreviewError("Please add a title and at least one author to generate preview");
      return;
    }

    setIsGeneratingPreview(true);
    setPreviewError(null);

    try {
      console.log('Generating PDF preview (client-side)...');
      
      // Use client-side PDF generation for preview
      const pdfBlob = generateClientSidePDF(document);
      
      if (!pdfBlob || pdfBlob.size === 0) {
        throw new Error('Failed to generate PDF preview');
      }
      
      // Clean up previous URL
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      // Create new blob URL for preview display
      const url = URL.createObjectURL(pdfBlob);
      setPreviewMode('pdf');
      setPreviewImages([]);
      setPdfUrl(url);
      
      console.log('✅ PDF preview generated successfully (client-side)');
      
      toast({
        title: 'Preview Generated',
        description: 'PDF preview created successfully',
      });
      
    } catch (error) {
      console.error('❌ PDF preview generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate PDF preview';
      setPreviewError(errorMessage);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Auto-generate preview when document has required fields
  useEffect(() => {
    console.log('Document changed, checking for preview generation:', {
      hasTitle: !!document.title,
      hasAuthors: document.authors?.some(author => author.name),
      title: document.title,
      authors: document.authors
    });

    const timer = setTimeout(() => {
      if (document.title && document.authors?.some(author => author.name)) {
        console.log('Triggering PDF preview generation...');
        generateDocxPreview();
      } else {
        console.log('Skipping PDF generation - missing title or authors');
        setPdfUrl(null);
        setPreviewImages([]);
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

  const handleZoomIn = () => setZoom(prev => Math.min(200, prev + 25));
  const handleZoomOut = () => setZoom(prev => Math.max(25, prev - 25));





  return (
    <div className="space-y-6">
      <Card className="bg-white/80 backdrop-blur-sm border-purple-200 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center justify-center">
            <Button
              onClick={handleDownloadWord}
              disabled={generateDocxMutation.isPending || !document.title}
              className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <Download className="w-4 h-4 mr-2" />
              {generateDocxMutation.isPending ? "Generating..." : "Download PDF"}
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
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/80 backdrop-blur-sm border-purple-200 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Mail className="w-5 h-5 text-purple-600" />
            Send via Email
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={sendEmailMutation.isPending}
                className="border-purple-200 focus:border-purple-400 focus:ring-purple-200"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendEmail();
                  }
                }}
              />
            </div>
            <Button
              onClick={handleSendEmail}
              disabled={sendEmailMutation.isPending || (!isAuthenticated && !email.trim()) || !document.title}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              {!isAuthenticated && <Lock className="w-4 h-4 mr-2" />}
              {isAuthenticated && <Mail className="w-4 h-4 mr-2" />}
              {sendEmailMutation.isPending ? "Sending..." : !isAuthenticated ? "Sign in to Email" : "Send to Email"}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Your IEEE paper will be generated and sent as a PDF attachment
          </p>
        </CardContent>
      </Card>

      {/* PDF Preview Section */}
      <Card className="bg-white/80 backdrop-blur-sm border-purple-200 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-900">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              Live PDF Preview
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={generateDocxPreview}
                disabled={isGeneratingPreview || !document.title}
                className="text-purple-600 hover:text-purple-700"
              >
                <RefreshCw className={`w-4 h-4 ${isGeneratingPreview ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={zoom <= 25}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs text-gray-500 min-w-[40px] text-center">{zoom}%</span>
              <Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={zoom >= 200}>
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="bg-gray-100 overflow-auto" style={{ height: "70vh" }}>
            {isGeneratingPreview ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
                  <p className="text-gray-600">Generating document preview...</p>
                </div>
              </div>
            ) : previewError ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-6">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-red-600 mb-2">Preview Error</p>
                  <p className="text-gray-600 text-sm">{previewError}</p>
                  <Button
                    onClick={generateDocxPreview}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    disabled={!document.title || !document.authors?.some(author => author.name)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </div>
            ) : !document.title || !document.authors?.some(author => author.name) ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-6">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Ready for Preview</p>
                  <p className="text-gray-500 text-sm">Add a title and at least one author to generate document preview</p>
                </div>
              </div>
            ) : previewMode === 'images' && previewImages.length > 0 ? (
              <div className="h-full relative overflow-auto bg-white">
                <div 
                  className="flex flex-col items-center space-y-4 p-4"
                  style={{ 
                    transform: `scale(${zoom / 100})`, 
                    transformOrigin: 'top center',
                  }}
                >
                  {previewImages.map((image, index) => (
                    <div key={index} className="shadow-lg border border-gray-200">
                      <img
                        src={image.data}
                        alt={`Page ${image.page}`}
                        className="max-w-full h-auto"
                        style={{
                          userSelect: 'none',
                          pointerEvents: 'none'
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : pdfUrl ? (
              <div className="h-full relative bg-white pdf-preview-container" style={{ overflow: 'auto' }}>
                {/* Clean PDF Viewer with working zoom controls */}
                <div 
                  className="w-full h-full relative"
                  style={{ 
                    transform: `scale(${zoom / 100})`, 
                    transformOrigin: 'top center',
                    minWidth: `${zoom}%`,
                    minHeight: `${zoom}%`,
                    padding: zoom > 100 ? '20px' : '0px'
                  }}
                >
                  <object
                    data={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&view=FitH&zoom=${zoom}`}
                    type="application/pdf"
                    className="w-full h-full border-0"
                    style={{
                      outline: 'none',
                      border: 'none',
                      width: '100%',
                      height: '600px',
                      minHeight: '600px'
                    }}
                  >
                    {/* Fallback message */}
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                      <div className="text-center p-6">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">PDF Preview Not Available</p>
                        <p className="text-gray-500 text-sm">Please use the download buttons above to get your IEEE paper.</p>
                      </div>
                    </div>
                  </object>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-6">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No preview available</p>
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
              <Button onClick={handleSignIn} className="flex-1 bg-purple-600 hover:bg-purple-700">
                Sign In
              </Button>
              <Button onClick={handleCancelAuth} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}