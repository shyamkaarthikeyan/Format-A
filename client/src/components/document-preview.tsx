import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ZoomIn, ZoomOut, Download, FileText, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Document } from "@shared/schema";

interface DocumentPreviewProps {
  document: Document;
  documentId: string | null;
}

// EXACT IEEE measurements matching Word document at 72 DPI (1 inch = 72px)
const IEEE_MEASUREMENTS = {
  // Page size: 8.5" x 11" at 72 DPI
  pageWidth: 612,  // 8.5 * 72
  pageHeight: 792, // 11 * 72
  
  // Margins: 0.75" at 72 DPI
  marginTop: 54,    // 0.75 * 72
  marginBottom: 54,
  marginLeft: 54,
  marginRight: 54,
  
  // Content area
  contentWidth: 504,  // 612 - 108 (margins)
  contentHeight: 684, // 792 - 108 (margins)
  
  // Font sizes: exact pt to px conversion (1pt = 4/3 px)
  titleFontSize: 32,    // 24pt * 4/3
  bodyFontSize: 12.67,  // 9.5pt * 4/3
  captionFontSize: 12,  // 9pt * 4/3
  
  // Line spacing: 10pt exact
  lineHeight: 13.33,    // 10pt * 4/3
  
  // Spacing: exact pt conversions
  paragraphSpaceAfter: 16,  // 12pt * 4/3
  sectionSpaceBefore: 13.33, // 10pt * 4/3
  subsectionSpaceBefore: 8,  // 6pt * 4/3
  textIndent: 14.4,     // 0.2" * 72 for paragraph indentation
  
  // Column layout: exact measurements from IEEE_CONFIG
  columnCount: 2,
  columnGap: 18,      // 0.25" * 72
  columnWidth: 243,   // 3.375" * 72
  columnIndent: 14.4, // 0.2" * 72
  
  // Figure sizes: exact measurements from IEEE_CONFIG
  figureSizes: {
    'very-small': 86.4,  // 1.2" * 72
    'small': 129.6,      // 1.8" * 72
    'medium': 180,       // 2.5" * 72
    'large': 230.4,      // 3.2" * 72
  },
  maxFigureHeight: 288, // 4.0" * 72
};

// Helper function to preserve exact user text formatting
function preserveUserFormatting(text: string): React.ReactNode[] {
  if (!text) return [];
  
  // Split by double newlines for paragraphs, preserve everything else exactly
  const paragraphs = text.split(/\n\s*\n/);
  
  return paragraphs.map((paragraph, paraIndex) => {
    const trimmedPara = paragraph.trim();
    
    if (trimmedPara === '') {
      return (
        <div key={`empty-${paraIndex}`} className="ieee-empty-paragraph" />
      );
    }
    
    // Preserve exact line breaks within paragraphs
    return (
      <div key={`para-${paraIndex}`} className="ieee-content-text">
        {trimmedPara.split('\n').map((line, lineIndex, lines) => (
          <span key={`line-${lineIndex}`}>
            {line}
            {lineIndex < lines.length - 1 && <br />}
          </span>
        ))}
      </div>
    );
  });
}

// Helper function to calculate author block height
function calculateAuthorHeight(authors: any[]): number {
  if (!authors || authors.length === 0) return 0;
  
  const maxLines = Math.max(...authors.map(author => {
    let lines = 1; // name
    if (author.department) lines++;
    if (author.organization) lines++;
    if (author.city || author.state) lines++;
    if (author.email) lines++;
    return lines;
  }));
  
  return (maxLines * IEEE_MEASUREMENTS.lineHeight) + 16;
}

export default function DocumentPreview({ document, documentId }: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(75);
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const generateDocxMutation = useMutation({
    mutationFn: async () => {
      if (!document.title) throw new Error("Please enter a title.");
      if (!document.authors || !document.authors.some(author => author.name)) {
        throw new Error("Please enter at least one author name.");
      }
      
      const response = await fetch('/api/generate/docx', {
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
      
      const response = await fetch('/api/generate/latex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(document),
      });

      if (!response.ok) throw new Error(`Failed to generate PDF: ${response.statusText}`);

      const blob = await response.blob();
      if (blob.size === 0) throw new Error('Generated PDF is empty');
      
      const url = URL.createObjectURL(blob);
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

  const sendEmailMutation = useMutation({
    mutationFn: async (emailAddress: string) => {
      if (!document.title) throw new Error("Please enter a title.");
      if (!document.authors || !document.authors.some(author => author.name)) {
        throw new Error("Please enter at least one author name.");
      }
      if (!emailAddress) throw new Error("Please enter an email address.");
      
      const response = await fetch('/api/generate/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: emailAddress,
          documentData: document 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to send email: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Email Sent Successfully!",
        description: `IEEE paper has been sent to ${email}`,
      });
      setEmail(""); // Clear email input
    },
    onError: (error: Error) => {
      toast({
        title: "Email Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendEmail = () => {
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

  // Calculate exact layout with proper column flow and automatic pagination
  const calculatePages = useMemo(() => {
    const pages: React.ReactNode[] = [];
    
    // Available height for content after header
    const availableContentHeight = IEEE_MEASUREMENTS.contentHeight;
    
    // Header section - FULL WIDTH above columns
    let headerHeight = 0;
    let headerElements: React.ReactNode[] = [];

    // Title
    if (document.title) {
      const titleHeight = IEEE_MEASUREMENTS.titleFontSize + 4;
      headerHeight += titleHeight + 16;
      headerElements.push(
        <div key="title" className="ieee-header-title">
          {document.title}
        </div>
      );
    }

    // Authors
    if (document.authors && document.authors.length > 0) {
      const authorHeight = calculateAuthorHeight(document.authors);
      headerHeight += authorHeight;
      
      headerElements.push(
        <div key="authors" className="ieee-header-authors">
          {document.authors.map((author) => (
            <div key={author.id} className="ieee-author">
              <div className="ieee-author-name">{author.name}</div>
              {author.department && <div className="ieee-author-detail">{author.department}</div>}
              {author.organization && <div className="ieee-author-detail">{author.organization}</div>}
              {(author.city || author.state) && (
                <div className="ieee-author-detail">
                  {author.city}{author.city && author.state && ", "}{author.state}
                </div>
              )}
              {author.email && <div className="ieee-author-detail">{author.email}</div>}
            </div>
          ))}
        </div>
      );
    }

    // Abstract
    if (document.abstract) {
      headerHeight += 60;
      headerElements.push(
        <div key="abstract" className="ieee-header-abstract">
          <span className="ieee-abstract-label">Abstract—</span>
          {document.abstract}
        </div>
      );
    }

    // Keywords
    if (document.keywords) {
      headerHeight += 40;
      headerElements.push(
        <div key="keywords" className="ieee-header-keywords">
          <span className="ieee-keywords-label">Index Terms—</span>
          {document.keywords}
        </div>
      );
    }

    // Calculate remaining height for body content on first page
    const firstPageBodyHeight = availableContentHeight - headerHeight - 20; // 20px buffer
    
    // Collect all body content for two-column layout
    let allBodyContent: React.ReactNode[] = [];
    let figureCounter = 0;

    // Process sections in order
    if (document.sections) {
      document.sections.forEach((section, sectionIndex) => {
        const sectionNumber = sectionIndex + 1;
        
        // Section heading
        if (section.title) {
          allBodyContent.push(
            <h2 key={`section-${sectionNumber}-title`} className="ieee-section-title">
              {sectionNumber}. {section.title.toUpperCase()}
            </h2>
          );
        }

        // Section content blocks
        section.contentBlocks?.forEach((block, blockIndex) => {
          if (block.type === 'text' && block.content) {
            // Preserve EXACT user formatting
            const formattedContent = preserveUserFormatting(block.content);
            allBodyContent.push(...formattedContent);
            
            // If text block has image, add it after the text
            if (block.data && block.caption) {
              figureCounter++;
              const figureSize = block.size || 'medium';
              const maxWidth = IEEE_MEASUREMENTS.figureSizes[figureSize];
              
              allBodyContent.push(
                <div key={`section-${sectionNumber}-text-image-${blockIndex}`} className="ieee-figure">
                  <div className="ieee-figure-container">
                    <img 
                      src={`data:image/png;base64,${block.data}`}
                      alt={block.caption}
                      className="ieee-figure-image"
                      style={{ 
                        maxWidth: `${maxWidth}px`,
                        maxHeight: `${IEEE_MEASUREMENTS.maxFigureHeight}px`
                      }}
                    />
                  </div>
                  <div className="ieee-figure-caption">
                    Fig. {figureCounter}: {block.caption}
                  </div>
                </div>
              );
            }
          }
          
          if (block.type === 'image' && (block.data || block.caption)) {
            figureCounter++;
            const figureSize = block.size || 'medium';
            const maxWidth = IEEE_MEASUREMENTS.figureSizes[figureSize];
            
            allBodyContent.push(
              <div key={`section-${sectionNumber}-image-${blockIndex}`} className="ieee-figure">
                <div className="ieee-figure-container">
                  {block.data ? (
                    <img 
                      src={`data:image/png;base64,${block.data}`}
                      alt={block.caption || 'Figure'}
                      className="ieee-figure-image"
                      style={{ 
                        maxWidth: `${maxWidth}px`,
                        maxHeight: `${IEEE_MEASUREMENTS.maxFigureHeight}px`
                      }}
                    />
                  ) : (
                    <div 
                      className="ieee-figure-placeholder"
                      style={{ 
                        width: `${maxWidth}px`,
                        height: '100px'
                      }}
                    >
                      [Image: {block.caption || 'No caption'}]
                    </div>
                  )}
                </div>
                {block.caption && (
                  <div className="ieee-figure-caption">
                    Fig. {figureCounter}: {block.caption}
                  </div>
                )}
              </div>
            );
          }
        });

        // Subsections
        section.subsections?.forEach((subsection, subIndex) => {
          if (subsection.title) {
            allBodyContent.push(
              <h3 key={`subsection-${sectionNumber}-${subIndex}-title`} className="ieee-subsection-title">
                {sectionNumber}.{subIndex + 1} {subsection.title}
              </h3>
            );
          }

          if (subsection.content) {
            const formattedContent = preserveUserFormatting(subsection.content);
            allBodyContent.push(...formattedContent);
          }
        });
      });
    }

    // References
    if (document.references && document.references.length > 0) {
      allBodyContent.push(
        <h2 key="references-title" className="ieee-section-title">
          REFERENCES
        </h2>
      );

      document.references.forEach((ref, refIndex) => {
        if (ref.text) {
          allBodyContent.push(
            <div key={`ref-${refIndex}`} className="ieee-reference">
              [{refIndex + 1}] {ref.text}
            </div>
          );
        }
      });
    }

    // Improved height estimation function
    const estimateElementHeight = (element: React.ReactNode): number => {
      if (!element || typeof element !== 'object') return IEEE_MEASUREMENTS.lineHeight;
      
      const key = (element as any).key || '';
      const props = (element as any).props || {};
      
      if (key.includes('section-') && key.includes('title')) {
        return IEEE_MEASUREMENTS.lineHeight * 1.5 + IEEE_MEASUREMENTS.sectionSpaceBefore;
      }
      if (key.includes('subsection-') && key.includes('title')) {
        return IEEE_MEASUREMENTS.lineHeight * 1.2 + IEEE_MEASUREMENTS.subsectionSpaceBefore;
      }
      if (key.includes('figure') || key.includes('image')) {
        // More accurate figure height estimation
        if (props.style && props.style.maxHeight) {
          return parseInt(props.style.maxHeight) + 60; // Add caption space
        }
        return 150; // Default figure height
      }
      if (key.includes('ref-')) {
        return IEEE_MEASUREMENTS.lineHeight * 1.5;
      }
      
      // For text content, better estimation based on actual content
      if (props && props.children) {
        let text = '';
        if (typeof props.children === 'string') {
          text = props.children;
        } else if (Array.isArray(props.children)) {
          text = props.children.join('');
        }
        
        // Account for column width (half page width)
        const charsPerLine = Math.floor(IEEE_MEASUREMENTS.columnWidth / 7); // ~7px per char
        const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
        return (lines * IEEE_MEASUREMENTS.lineHeight) + IEEE_MEASUREMENTS.paragraphSpaceAfter;
      }
      
      return IEEE_MEASUREMENTS.lineHeight + IEEE_MEASUREMENTS.paragraphSpaceAfter;
    };

    // Split content into pages with better height tracking
    const contentPerPage: React.ReactNode[][] = [];
    let currentPageContent: React.ReactNode[] = [];
    let currentPageHeight = 0;
    let isFirstPage = true;
    
    allBodyContent.forEach((element, index) => {
      const elementHeight = estimateElementHeight(element);
      const maxPageHeight = isFirstPage ? firstPageBodyHeight : availableContentHeight - 40; // Leave buffer
      
      // Check if we need a new page (with minimum content per page)
      if (currentPageHeight + elementHeight > maxPageHeight && currentPageContent.length > 0) {
        contentPerPage.push([...currentPageContent]);
        currentPageContent = [element];
        currentPageHeight = elementHeight;
        isFirstPage = false;
      } else {
        currentPageContent.push(element);
        currentPageHeight += elementHeight;
      }
    });

    // Add remaining content
    if (currentPageContent.length > 0) {
      contentPerPage.push(currentPageContent);
    }

    // If no content, create at least one page
    if (contentPerPage.length === 0) {
      contentPerPage.push([]);
    }

    // Create pages with improved layout
    contentPerPage.forEach((pageContent, pageIndex) => {
      const isFirst = pageIndex === 0;
      
      pages.push(
        <div key={`page-${pageIndex + 1}`} className="ieee-page">
          {/* Header section - only on first page */}
          {isFirst && headerElements.length > 0 && (
            <div className="ieee-header-section">
              {headerElements}
            </div>
          )}
          
          {/* Body content - TWO COLUMNS with proper flow */}
          <div 
            className="ieee-body-section"
            style={{
              minHeight: isFirst ? `${firstPageBodyHeight}px` : `${availableContentHeight - 40}px`,
              maxHeight: isFirst ? `${firstPageBodyHeight}px` : `${availableContentHeight - 40}px`,
            }}
          >
            {pageContent}
          </div>
        </div>
      );
    });

    return pages;
  }, [document]);

  const handleZoomIn = () => setZoom(Math.min(150, zoom + 25));
  const handleZoomOut = () => setZoom(Math.max(50, zoom - 25));

  return (
    <div className="space-y-6">
      {/* Download Buttons */}
      <Card className="bg-white/80 backdrop-blur-sm border-purple-200 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center justify-center">
            <Button 
              onClick={() => generateDocxMutation.mutate()}
              disabled={generateDocxMutation.isPending || !document.title}
              className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <Download className="w-4 h-4 mr-2" />
              {generateDocxMutation.isPending ? "Generating..." : "Download Word"}
            </Button>
            
            <Button 
              onClick={() => generatePdfMutation.mutate()}
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

      {/* Email Section */}
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
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSendEmail();
                  }
                }}
              />
            </div>
            <Button 
              onClick={handleSendEmail}
              disabled={sendEmailMutation.isPending || !email.trim() || !document.title}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <Mail className="w-4 h-4 mr-2" />
              {sendEmailMutation.isPending ? "Sending..." : "Send to Email"}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Your IEEE paper will be generated and sent as a PDF attachment
          </p>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardContent className="p-0">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Live Preview</span>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={zoom <= 50}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs text-gray-500 min-w-[40px] text-center">{zoom}%</span>
                <Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={zoom >= 150}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-gray-100 overflow-auto" style={{ maxHeight: "80vh" }}>
            <style>{`
              /* EXACT Word document styling with proper column flow */
              .ieee-page {
                width: ${IEEE_MEASUREMENTS.pageWidth}px;
                height: ${IEEE_MEASUREMENTS.pageHeight}px;
                background: white;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                margin-bottom: 30px;
                padding: ${IEEE_MEASUREMENTS.marginTop}px ${IEEE_MEASUREMENTS.marginRight}px ${IEEE_MEASUREMENTS.marginBottom}px ${IEEE_MEASUREMENTS.marginLeft}px;
                transform: scale(${zoom / 100});
                transform-origin: top left;
                margin-right: ${(IEEE_MEASUREMENTS.pageWidth * (100 - zoom)) / 100}px;
                overflow: hidden;
                font-family: 'Times New Roman', serif;
                font-size: ${IEEE_MEASUREMENTS.bodyFontSize}px;
                line-height: ${IEEE_MEASUREMENTS.lineHeight}px;
                color: #000;
                position: relative;
                display: flex;
                flex-direction: column;
              }

              /* Page wrapper for proper spacing */
              .ieee-page-wrapper {
                margin-bottom: ${30 + (IEEE_MEASUREMENTS.pageHeight * (100 - zoom)) / 100}px;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
              }

              /* Page number styling */
              .ieee-page-number {
                margin-top: 10px;
                text-align: center;
                width: ${IEEE_MEASUREMENTS.pageWidth}px;
                transform: scale(${zoom / 100});
                transform-origin: top left;
                font-family: Arial, sans-serif;
                font-size: 12px;
                color: #666;
              }

              /* Ensure page container scales properly */
              .ieee-pages-container {
                transform-origin: top left;
                width: fit-content;
                min-height: fit-content;
              }

              /* Header section - FULL WIDTH above columns */
              .ieee-header-section {
                width: 100%;
                margin-bottom: ${IEEE_MEASUREMENTS.lineHeight * 2}px;
                flex-shrink: 0;
              }

              /* Title: 24pt, centered, bold, FULL WIDTH */
              .ieee-header-title {
                text-align: center;
                font-weight: bold;
                font-size: ${IEEE_MEASUREMENTS.titleFontSize}px;
                line-height: ${IEEE_MEASUREMENTS.titleFontSize + 4}px;
                margin-bottom: 16px;
                width: 100%;
                font-family: 'Times New Roman', serif;
              }

              /* Authors: centered table layout, FULL WIDTH */
              .ieee-header-authors {
                text-align: center;
                margin-bottom: 16px;
                display: flex;
                justify-content: center;
                gap: 40px;
                width: 100%;
                flex-wrap: wrap;
              }

              .ieee-author {
                text-align: center;
                min-width: 120px;
              }

              .ieee-author-name {
                font-weight: bold;
                font-size: ${IEEE_MEASUREMENTS.bodyFontSize}px;
                line-height: ${IEEE_MEASUREMENTS.lineHeight}px;
                margin-bottom: 2px;
                font-family: 'Times New Roman', serif;
              }

              .ieee-author-detail {
                font-style: italic;
                font-size: ${IEEE_MEASUREMENTS.bodyFontSize}px;
                line-height: ${IEEE_MEASUREMENTS.lineHeight}px;
                margin-bottom: 2px;
                font-family: 'Times New Roman', serif;
              }

              /* Abstract: justified, FULL WIDTH */
              .ieee-header-abstract {
                text-align: justify;
                text-justify: inter-word;
                margin-bottom: ${IEEE_MEASUREMENTS.lineHeight}px;
                font-size: ${IEEE_MEASUREMENTS.bodyFontSize}px;
                line-height: ${IEEE_MEASUREMENTS.lineHeight}px;
                width: 100%;
                font-family: 'Times New Roman', serif;
                white-space: pre-wrap;
              }

              .ieee-abstract-label {
                font-style: italic;
              }

              /* Keywords: justified, FULL WIDTH */
              .ieee-header-keywords {
                text-align: justify;
                text-justify: inter-word;
                margin-bottom: ${IEEE_MEASUREMENTS.lineHeight * 2}px;
                font-size: ${IEEE_MEASUREMENTS.bodyFontSize}px;
                line-height: ${IEEE_MEASUREMENTS.lineHeight}px;
                width: 100%;
                font-family: 'Times New Roman', serif;
                white-space: pre-wrap;
              }

              .ieee-keywords-label {
                font-style: italic;
              }

              /* IEEE Body Section - Two-column layout with proper flow */
              .ieee-body-section {
                column-count: 2;
                column-gap: ${IEEE_MEASUREMENTS.columnGap}px;
                column-fill: auto;
                overflow: hidden;
                text-align: justify;
                hyphens: auto;
                word-wrap: break-word;
                
                /* Improved column balancing */
                orphans: 2;
                widows: 2;
                
                /* Better column break control */
                column-rule: none;
              }

              /* Section titles */
              .ieee-section-title {
                font-weight: bold;
                font-size: ${IEEE_MEASUREMENTS.bodyFontSize}px;
                line-height: ${IEEE_MEASUREMENTS.lineHeight}px;
                margin: ${IEEE_MEASUREMENTS.sectionSpaceBefore}px 0 ${IEEE_MEASUREMENTS.paragraphSpaceAfter}px 0;
                text-align: left;
                text-indent: 0;
                break-after: avoid;
                page-break-after: avoid;
                column-break-after: avoid;
                break-inside: avoid;
                page-break-inside: avoid;
                column-break-inside: avoid;
                font-family: 'Times New Roman', serif;
              }

              .ieee-subsection-title {
                font-style: italic;
                font-size: ${IEEE_MEASUREMENTS.bodyFontSize}px;
                line-height: ${IEEE_MEASUREMENTS.lineHeight}px;
                margin: ${IEEE_MEASUREMENTS.subsectionSpaceBefore}px 0 ${IEEE_MEASUREMENTS.paragraphSpaceAfter}px 0;
                text-align: left;
                text-indent: 0;
                break-after: avoid;
                page-break-after: avoid;
                column-break-after: avoid;
                break-inside: avoid;
                page-break-inside: avoid;
                column-break-inside: avoid;
                font-family: 'Times New Roman', serif;
              }

              /* Content text */
              .ieee-content-text {
                margin: 0 0 ${IEEE_MEASUREMENTS.paragraphSpaceAfter}px 0;
                text-indent: ${IEEE_MEASUREMENTS.textIndent}px;
                line-height: ${IEEE_MEASUREMENTS.lineHeight}px;
                text-align: justify;
                font-family: 'Times New Roman', serif;
                font-size: ${IEEE_MEASUREMENTS.bodyFontSize}px;
                orphans: 2;
                widows: 2;
              }

              .ieee-empty-paragraph {
                height: ${IEEE_MEASUREMENTS.lineHeight}px;
                margin: 0;
              }

              /* Keep figures together */
              .ieee-figure {
                break-inside: avoid;
                page-break-inside: avoid;
                column-break-inside: avoid;
                display: inline-block;
                width: 100%;
                margin: 8px 0;
                text-align: center;
              }

              .ieee-figure-container {
                margin-bottom: 4px;
                text-align: center;
              }

              .ieee-figure-image {
                display: block;
                margin: 0 auto;
                max-width: 100%;
                height: auto;
              }

              .ieee-figure-placeholder {
                background: #f5f5f5;
                border: 1px dashed #ccc;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #666;
                font-size: 10px;
                margin: 0 auto;
              }

              .ieee-figure-caption {
                font-size: ${IEEE_MEASUREMENTS.captionFontSize}px;
                line-height: ${IEEE_MEASUREMENTS.lineHeight}px;
                text-align: center;
                margin-top: 4px;
                font-family: 'Times New Roman', serif;
              }

              /* Better reference formatting in columns */
              .ieee-reference {
                margin: 0 0 4px 0;
                text-indent: -18px;
                padding-left: 18px;
                break-inside: avoid;
                page-break-inside: avoid;
                column-break-inside: avoid;
                font-size: ${IEEE_MEASUREMENTS.bodyFontSize}px;
                line-height: ${IEEE_MEASUREMENTS.lineHeight}px;
                font-family: 'Times New Roman', serif;
              }

              /* Enhanced typography */
              .ieee-page * {
                text-rendering: optimizeLegibility;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
              }

              @media screen {
                .document-preview {
                  /* For screen display, show content flowing normally */
                  max-height: none;
                  overflow: visible;
                }
              }
              
              @media print {
                .document-preview {
                  /* For print, enable proper page breaks */
                  page-break-inside: auto;
                  orphans: 2;
                  widows: 2;
                }
                
                .document-preview > div {
                  page-break-inside: auto;
                  page-break-after: auto;
                }
              }
              
              /* Force visible scrolling and pagination */
              .document-preview {
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
              }
            `}</style>
            
            <div className="ieee-pages-container">
              {calculatePages.map((page, index) => (
                <div key={`page-wrapper-${index}`} className="ieee-page-wrapper">
                  {page}
                  <div className="ieee-page-number">
                    Page {index + 1} of {calculatePages.length}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
