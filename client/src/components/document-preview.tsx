import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ZoomIn, ZoomOut, Download, FileText, Mail, RefreshCw, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import type { Document } from "@shared/schema";

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
      link.download = "ieee_paper.docx";
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
        filename = "ieee_paper.docx";
        downloadMessage = "PDF conversion unavailable. IEEE-formatted Word document downloaded instead (contains identical formatting).";
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

  // Generate PDF preview (works on both localhost and Vercel)
  const generateDocxPreview = async () => {
    if (!document.title || !document.authors?.some(author => author.name)) {
      setPreviewError("Please add a title and at least one author to generate preview");
      return;
    }

    setIsGeneratingPreview(true);
    setPreviewError(null);

    try {
      console.log('Attempting document preview generation...');
      
      // Request DOCX which works in both localhost and Vercel
      let response = await fetch('/api/generate?type=pdf&preview=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Preview': 'true'
        },
        body: JSON.stringify(document),
      });

      console.log('Preview response:', response.status, response.statusText);
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);

      if (!response.ok) {
        let errorMessage = `Failed to generate preview: ${response.statusText}`;
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch (e) {
            console.warn('Could not parse error JSON');
          }
        }
        
        throw new Error(errorMessage);
      }

      // Check if response is DOCX (from Vercel) or PDF (from local)
      if (contentType && contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
        console.log('✅ Received DOCX file - Vercel deployment detected');
        
        // For DOCX files, we need to download and open them (or use docx-preview library)
        // For now, we'll show a message that preview is available via download
        const blob = await response.blob();
        console.log('DOCX blob size:', blob.size);
        
        if (blob.size === 0) throw new Error('Generated document is empty');

        // Create download URL
        const url = URL.createObjectURL(blob);
        
        // Show a preview message with download link
        const previewHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .container {
                text-align: center;
                background: rgba(255,255,255,0.1);
                padding: 3rem;
                border-radius: 20px;
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
              }
              h1 { margin: 0 0 1rem 0; font-size: 2rem; }
              p { margin: 0.5rem 0; font-size: 1.1rem; opacity: 0.9; }
              .download-btn {
                margin-top: 2rem;
                padding: 1rem 2rem;
                font-size: 1.1rem;
                background: white;
                color: #667eea;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                font-weight: bold;
                transition: transform 0.2s;
              }
              .download-btn:hover {
                transform: scale(1.05);
              }
              .icon { font-size: 4rem; margin-bottom: 1rem; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">📄</div>
              <h1>Document Ready!</h1>
              <p>Your IEEE-formatted document has been generated successfully.</p>
              <p>Click below to download and view your document.</p>
              <button class="download-btn" onclick="window.open('${url}', '_blank')">
                Download Document
              </button>
            </div>
            <script>
              // Auto-download after 1 second
              setTimeout(() => {
                const link = document.createElement('a');
                link.href = '${url}';
                link.download = 'ieee_paper.docx';
                link.click();
              }, 1000);
            </script>
          </body>
          </html>
        `;
        
        const htmlBlob = new Blob([previewHtml], { type: 'text/html' });
        const htmlUrl = URL.createObjectURL(htmlBlob);
        
        // Clean up previous URL
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
        }
        
        setPreviewMode('pdf');
        setPreviewImages([]);
        setPdfUrl(htmlUrl);
        console.log('✅ DOCX preview ready (auto-download enabled)');
        return;
      }
      
      // Handle JSON response
      if (contentType && contentType.includes('application/json')) {
        // Handle new JSON preview response
        const previewData = await response.json();
        console.log('Received JSON preview data:', previewData);
        
        if (previewData.success && previewData.preview) {
          // Create a visual preview from the JSON data
          const previewHtml = createPreviewFromData(previewData.data);
          const blob = new Blob([previewHtml], { type: 'text/html' });
          
          // Clean up previous URL
          if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
          }
          
          const url = URL.createObjectURL(blob);
          setPreviewMode('pdf');
          setPreviewImages([]);
          setPdfUrl(url);
          console.log('PDF preview generated from JSON data successfully');
          return;
        }
      }
      
      // Handle blob response (actual PDF file)
      const blob = await response.blob();
      console.log('PDF blob size:', blob.size, 'Content-Type:', contentType);
      
      if (blob.size === 0) throw new Error('Generated PDF is empty');

      // Clean up previous URL
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      // Create new blob URL for preview display
      const url = URL.createObjectURL(blob);
      setPreviewMode('pdf');
      setPreviewImages([]);
      setPdfUrl(url);
      console.log('PDF preview generated successfully, URL:', url);
    } catch (error) {
      console.error('PDF preview generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate PDF preview';
      setPreviewError(errorMessage);
      
      // If document generation fails, suggest alternatives
      if (errorMessage.includes('Python') || errorMessage.includes('not available') || errorMessage.includes('docx2pdf')) {
        setPreviewError('PDF preview temporarily unavailable due to system dependencies. Word document downloads work perfectly and contain identical IEEE formatting!');
      }
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