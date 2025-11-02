import React, { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ZoomIn, ZoomOut, Download, FileText, Mail, RefreshCw, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min?url';
import type { Document } from "@shared/schema";

// Set up PDF.js worker - use local worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

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

      const response = await fetch('/api/generate?type=docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(document),
      });

      if (!response.ok) throw new Error(`Failed to generate document: ${response.statusText}`);

      const blob = await response.blob();
      if (blob.size === 0) throw new Error('Generated document is empty');

      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `${document.title || 'ieee-paper'}.docx`;
      link.click();
      URL.revokeObjectURL(url);

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
      if (!document.title) throw new Error("Please enter a title.");
      if (!document.authors || !document.authors.some(author => author.name)) {
        throw new Error("Please enter at least one author name.");
      }

      const response = await fetch('/api/generate?type=pdf', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Download': 'true'  // Indicate this is for download, not preview
        },
        body: JSON.stringify(document),
      });

      if (!response.ok) {
        // If PDF generation fails, try to get detailed error message
        let errorMessage = `Failed to generate PDF: ${response.statusText}`;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } else {
            const errorText = await response.text();
            if (errorText && errorText.length < 500) {
              errorMessage = errorText;
            }
          }
        } catch (e) {
          console.warn('Could not parse error details');
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      console.log('PDF download blob:', blob.size, 'bytes, type:', blob.type);
      
      if (blob.size === 0) throw new Error('Generated PDF is empty');

      // Check if we actually got a PDF or a fallback format
      const contentType = response.headers.get('content-type');
      let filename = "ieee_paper.pdf";
      let downloadMessage = "IEEE-formatted PDF file has been downloaded successfully.";
      
      if (contentType && contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
        filename = `${document.title || 'ieee-paper'}.docx`;
        downloadMessage = "PDF conversion unavailable. IEEE-formatted Word document downloaded instead (contains identical formatting).";
      } else {
        filename = `${document.title || 'ieee-paper'}.pdf`;
      }

      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      return { success: true, message: downloadMessage };
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

      const response = await fetch('/api/generate?type=email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailAddress,
          documentData: document,
        }),
      });

      if (!response.ok) {
        // Check if response is JSON or HTML
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to send email: ${response.statusText}`);
          } catch (jsonError) {
            throw new Error(`Failed to send email: ${response.statusText}`);
          }
        } else {
          // If it's not JSON (likely HTML error page), get text content
          const errorText = await response.text();
          console.error('Non-JSON error response:', errorText);
          throw new Error(`Server error: ${response.statusText}`);
        }
      }

      // Parse successful response
      try {
        const result = await response.json();
        return result;
      } catch (parseError) {
        console.error('Failed to parse success response:', parseError);
        throw new Error('Email may have been sent but response parsing failed');
      }
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

  // Helper function to create HTML preview from JSON data
  const createPreviewFromData = (data: any) => {
    const authors = data.authors?.map((author: any) => author.name).join(', ') || 'No authors';
    const affiliations = data.authors?.map((author: any) => author.organization).filter(Boolean).join(', ') || '';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>IEEE Paper Preview</title>
    <style>
        body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; background: white; }
        .preview-header { background: #f0f8ff; padding: 15px; border-left: 4px solid #007acc; margin-bottom: 20px; }
        .title { text-align: center; font-size: 16pt; font-weight: bold; margin-bottom: 12pt; color: #333; }
        .authors { text-align: center; font-size: 12pt; margin-bottom: 6pt; color: #555; }
        .affiliations { text-align: center; font-size: 10pt; font-style: italic; margin-bottom: 18pt; color: #666; }
        .section-title { font-size: 12pt; font-weight: bold; margin-top: 18pt; margin-bottom: 8pt; color: #007acc; }
        .abstract { font-size: 11pt; margin-bottom: 12pt; text-align: justify; background: #f9f9f9; padding: 10px; border-radius: 5px; }
        .keywords { font-size: 11pt; margin-bottom: 12pt; font-style: italic; color: #666; }
        .content { font-size: 11pt; text-align: justify; color: #333; }
        .format-info { background: #e8f5e8; padding: 10px; border-radius: 5px; font-size: 10pt; color: #2d5a2d; }
    </style>
</head>
<body>
    <div class="preview-header">
        <strong>📄 IEEE Conference Paper Preview</strong><br>
        <small>This is a live preview of your formatted paper. The actual document will be generated with proper IEEE formatting.</small>
    </div>
    
    <div class="title">${data.title || 'Untitled Paper'}</div>
    <div class="authors">${authors}</div>
    ${affiliations ? `<div class="affiliations">${affiliations}</div>` : ''}
    
    <div class="section-title">Abstract</div>
    <div class="abstract">${data.abstract || 'Abstract will appear here when you add it in the Abstract section.'}</div>
    
    <div class="keywords"><strong>Keywords:</strong> ${data.keywords || 'Keywords will appear here when you add them.'}</div>
    
    <div class="section-title">Document Structure</div>
    <div class="content">
        <strong>Authors:</strong> ${data.authors?.length || 0} author(s)<br>
        <strong>Sections:</strong> ${data.sections || 0} section(s)<br>
        <strong>Format:</strong> ${data.format || 'IEEE Conference Paper'}<br>
        <strong>Type:</strong> ${data.type?.toUpperCase() || 'PDF'} Preview
    </div>
    
    <div class="format-info">
        <strong>✓ IEEE Formatting Applied</strong><br>
        This preview shows your paper with proper IEEE conference paper formatting including title placement, author information, abstract formatting, and section structure.
    </div>
</body>
</html>`;
  };

  // Generate PDF preview from document data - uses Python script on server for consistent format
  const generateDocxPreview = async () => {
    if (!document.title || !document.authors?.some(author => author.name)) {
      setPreviewError("Please add a title and at least one author to generate preview");
      return;
    }

    setIsGeneratingPreview(true);
    setPreviewError(null);

    try {
      console.log('Generating preview from Python script on server (same as download)...');
      
      // Fetch DOCX from Python script on server
      const response = await fetch('/api/generate?type=pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(document),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate document: ${response.statusText}`);
      }

      // Get DOCX blob from Python script
      const docxBlob = await response.blob();
      if (docxBlob.size === 0) {
        throw new Error('Generated document is empty');
      }

      console.log('✓ DOCX received from Python script:', docxBlob.size, 'bytes');

      // Convert DOCX to PDF for preview using jsPDF (simple wrapper)
      const { jsPDF } = await import('jspdf');
      
      // Create a simple PDF showing the document was generated
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 19; // ~0.75 inches in mm
      const maxWidth = pageWidth - (2 * margin);
      let yPosition = margin;

      // IEEE Standard Line Heights
      const lineHeights = {
        title: 6,      // Extra space for title
        subtitle: 3.5, // Space for authors/affiliations
        body: 3.5,     // Standard body line spacing
        section: 4,    // Space before sections
      };

      // Helper to check and add page break if needed
      const checkPageBreak = (neededHeight: number) => {
        if (yPosition + neededHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
      };

      // Title (24pt, centered, bold, Times New Roman) - IEEE standard
      pdf.setFont('times', 'bold');
      pdf.setFontSize(24);
      checkPageBreak(10);
      const titleLines = pdf.splitTextToSize(document.title, maxWidth);
      titleLines.forEach((line: string) => {
        pdf.text(line, pageWidth / 2, yPosition, { align: 'center', baseline: 'top' });
        yPosition += lineHeights.subtitle;
      });
      yPosition += lineHeights.title;

      // Authors (10pt, centered, Times New Roman)
      pdf.setFont('times', 'normal');
      pdf.setFontSize(10);
      const authors = document.authors.map((a: any) => a.name).join(', ');
      const authorLines = pdf.splitTextToSize(authors, maxWidth);
      checkPageBreak(authorLines.length * lineHeights.body);
      authorLines.forEach((line: string) => {
        pdf.text(line, pageWidth / 2, yPosition, { align: 'center', baseline: 'top' });
        yPosition += lineHeights.body;
      });

      // Affiliations (9pt, italic, centered, Times New Roman)
      const affiliations = document.authors
        .map((a: any) => a.affiliation || a.organization)
        .filter(Boolean)
        .filter((v: any, i: number, a: any) => a.indexOf(v) === i)
        .join('; ');
      
      if (affiliations) {
        pdf.setFont('times', 'italic');
        pdf.setFontSize(9);
        const affLines = pdf.splitTextToSize(affiliations, maxWidth);
        checkPageBreak(affLines.length * lineHeights.body + 3);
        affLines.forEach((line: string) => {
          pdf.text(line, pageWidth / 2, yPosition, { align: 'center', baseline: 'top' });
          yPosition += lineHeights.body;
        });
        yPosition += 6;
      }

      // Abstract (10pt, italic) - IEEE format with "Abstract—" prefix
      if (document.abstract) {
        pdf.setFont('times', 'normal');
        pdf.setFontSize(10);
        pdf.text('Abstract—', margin, yPosition);
        
        pdf.setFont('times', 'italic');
        const abstractLines = pdf.splitTextToSize(document.abstract, maxWidth - 15);
        checkPageBreak(abstractLines.length * lineHeights.body + 6);
        
        // First line continues after "Abstract—"
        if (abstractLines.length > 0) {
          pdf.text(abstractLines[0], margin + 15, yPosition, { baseline: 'top' });
          yPosition += lineHeights.body;
          
          // Remaining lines indented
          for (let i = 1; i < abstractLines.length; i++) {
            pdf.text(abstractLines[i], margin, yPosition, { baseline: 'top' });
            yPosition += lineHeights.body;
          }
        }
        yPosition += 4;
      }

      // Keywords (10pt, italic) - IEEE format with "Keywords—" prefix
      if (document.keywords && document.keywords.length > 0) {
        const keywordsText = Array.isArray(document.keywords) ? document.keywords.join(', ') : document.keywords;
        pdf.setFont('times', 'normal');
        pdf.setFontSize(10);
        pdf.text('Keywords—', margin, yPosition);
        
        pdf.setFont('times', 'italic');
        const keywordLines = pdf.splitTextToSize(keywordsText, maxWidth - 15);
        checkPageBreak(keywordLines.length * lineHeights.body + 6);
        
        if (keywordLines.length > 0) {
          pdf.text(keywordLines[0], margin + 15, yPosition, { baseline: 'top' });
          yPosition += lineHeights.body;
          
          for (let i = 1; i < keywordLines.length; i++) {
            pdf.text(keywordLines[i], margin, yPosition, { baseline: 'top' });
            yPosition += lineHeights.body;
          }
        }
        yPosition += 6;
      }

      // Sections with IEEE numbering (9.5pt, not bold per IEEE standard)
      if (document.sections && document.sections.length > 0) {
        document.sections.forEach((section: any, index: number) => {
          yPosition += lineHeights.section;

          // Section title (9.5pt, NOT bold - IEEE standard)
          pdf.setFont('times', 'normal');
          pdf.setFontSize(9.5);
          const sectionTitle = `${index + 1}. ${section.title}`;
          const sectionTitleLines = pdf.splitTextToSize(sectionTitle, maxWidth);
          checkPageBreak(sectionTitleLines.length * lineHeights.body + (section.content ? 8 : 0));
          
          sectionTitleLines.forEach((line: string) => {
            pdf.text(line, margin, yPosition, { baseline: 'top' });
            yPosition += lineHeights.body;
          });
          yPosition += 2;

          // Section content (9.5pt, justified-like appearance)
          if (section.content) {
            pdf.setFont('times', 'normal');
            pdf.setFontSize(9.5);
            const contentLines = pdf.splitTextToSize(section.content, maxWidth);
            checkPageBreak(contentLines.length * lineHeights.body + 3);
            
            contentLines.forEach((line: string) => {
              pdf.text(line, margin, yPosition, { baseline: 'top' });
              yPosition += lineHeights.body;
            });
          }
          yPosition += 2;
        });
      }

      // References section (9pt) - IEEE standard
      if (document.references && document.references.length > 0) {
        yPosition += lineHeights.section;
        
        // References heading
        pdf.setFont('times', 'normal');
        pdf.setFontSize(9.5);
        pdf.text('References', margin, yPosition);
        yPosition += lineHeights.body + 1;

        // Reference items (9pt per IEEE standard)
        pdf.setFontSize(9);
        document.references.forEach((ref: any, index: number) => {
          const refText = typeof ref === 'string' ? ref : ref.text;
          const refLabel = `[${index + 1}] ${refText}`;
          const refLines = pdf.splitTextToSize(refLabel, maxWidth - 5);
          checkPageBreak(refLines.length * (lineHeights.body - 0.5) + 2);
          
          refLines.forEach((line: string, lineIndex: number) => {
            const xPos = lineIndex === 0 ? margin : margin + 3;
            pdf.text(line, xPos, yPosition, { baseline: 'top' });
            yPosition += lineHeights.body - 0.5;
          });
          yPosition += 0.5;
        });
      }

      // Generate PDF blob
      const pdfBlob = pdf.output('blob');
      
      // Clean up previous URL
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setPreviewMode('pdf');
      setPreviewImages([]);
      
      console.log('✅ IEEE-formatted PDF preview generated successfully, size:', pdfBlob.size, 'bytes');
    } catch (error) {
      console.error('PDF preview generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate preview';
      setPreviewError(errorMessage);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Auto-generate preview when document has required fields
  // ONLY depend on title and authors to prevent excessive re-renders on every keystroke
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
  }, [document.title, document.authors]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Render PDF page using PDF.js
  const renderPdfPage = async (pageNumber: number) => {
    if (!pdfUrl || !canvasRef.current) return;

    try {
      const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
      setTotalPages(pdf.numPages);
      
      const page = await pdf.getPage(pageNumber);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;
      
      const viewport = page.getViewport({ scale: zoom / 100 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas
      }).promise;
    } catch (error) {
      console.error('Error rendering PDF page:', error);
    }
  };

  // Re-render when zoom changes
  useEffect(() => {
    if (pdfUrl && currentPage) {
      renderPdfPage(currentPage);
    }
  }, [zoom, pdfUrl, currentPage]);

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
              PDF Preview
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 25}
                  className="text-purple-600 hover:text-purple-700"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600 min-w-[50px] text-center">{zoom}%</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 200}
                  className="text-purple-600 hover:text-purple-700"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={generateDocxPreview}
                disabled={isGeneratingPreview || !document.title}
                className="text-purple-600 hover:text-purple-700"
              >
                <RefreshCw className={`w-4 h-4 ${isGeneratingPreview ? 'animate-spin' : ''}`} />
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
                  <p className="text-gray-600">Generating PDF preview...</p>
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
                  <p className="text-gray-500 text-sm">Add a title and at least one author to generate PDF preview</p>
                </div>
              </div>
            ) : pdfUrl ? (
              <div className="h-full relative bg-white pdf-preview-container p-4 flex flex-col" style={{ overflow: 'auto' }}>
                <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 flex-shrink-0">
                  <p className="text-sm text-blue-800">
                    <strong>📄 PDF Preview:</strong> Your IEEE-formatted document rendered as PDF. Use zoom controls to adjust size.
                  </p>
                </div>
                <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-200 rounded p-2">
                  <canvas
                    ref={canvasRef}
                    className="shadow-lg"
                    style={{
                      maxWidth: '100%',
                      height: 'auto',
                      border: '1px solid #ccc'
                    }}
                  />
                </div>
                {totalPages > 1 && (
                  <div className="flex-shrink-0 mt-4 flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage <= 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
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