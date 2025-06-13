import React, { useState, useMemo } from "react";
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

  // Calculate exact layout with proper column flow and automatic pagination - MIRRORING WORD DOCUMENT STRUCTURE
  const calculatePages = useMemo(() => {
    const pages: React.ReactNode[] = [];
    
    // Available height for content (matching Word document exactly)
    const availableContentHeight = IEEE_MEASUREMENTS.contentHeight;
    
    // PHASE 1: Single-column header section (like Word document)
    let headerHeight = 0;
    let headerElements: React.ReactNode[] = [];

    // Title - exactly like Word generator
    if (document.title) {
      const titleHeight = IEEE_MEASUREMENTS.titleFontSize + 4;
      headerHeight += titleHeight + 16; // matches Pt(12) from Word
      headerElements.push(
        <div key="title" className="ieee-header-title">
          {document.title}
        </div>
      );
    }

    // Authors table - exactly like Word generator table layout
    if (document.authors && document.authors.length > 0) {
      const authorHeight = calculateAuthorHeight(document.authors);
      headerHeight += authorHeight + 16; // matches doc.add_paragraph().paragraph_format.space_after = Pt(12)
      
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
              {author.email && (
                <div className="ieee-author-detail">
                  {author.email}
                </div>
              )}
              {author.customFields?.map((field, idx) => 
                field.value ? (
                  <div key={idx} className="ieee-author-detail">{field.value}</div>
                ) : null
              )}
            </div>
          ))}
        </div>
      );
    }

    // Abstract - exactly like Word generator
    if (document.abstract) {
      headerHeight += 60; // matches IEEE_CONFIG['line_spacing'] spacing
      headerElements.push(
        <div key="abstract" className="ieee-header-abstract">
          <span className="ieee-abstract-label">Abstract—</span>
          {document.abstract}
        </div>
      );
    }

    // Keywords - exactly like Word generator format
    if (document.keywords) {
      headerHeight += 40; // matches IEEE_CONFIG['line_spacing'] spacing
      headerElements.push(
        <div key="keywords" className="ieee-header-keywords">
          <span className="ieee-keywords-label">Keywords: </span>
          {document.keywords}
        </div>
      );
    }

    // PHASE 2: Two-column body section (matches Word's continuous section break)
    const firstPageBodyHeight = availableContentHeight - headerHeight - 20;
    
    // Collect all body content - EXACT order from Word generator
    let allBodyContent: React.ReactNode[] = [];
    let figureCounter = 0;

    // Process sections exactly like Word generator add_section function
    if (document.sections) {
      document.sections.forEach((section, sectionIndex) => {
        const sectionNumber = sectionIndex + 1;
        
        // Section heading - matches doc.add_heading format
        if (section.title) {
          allBodyContent.push(
            <h2 key={`section-${sectionNumber}-title`} className="ieee-section-title">
              {sectionNumber}. {section.title.toUpperCase()}
            </h2>
          );
        }

        // Process content blocks - matches Word generator contentBlocks processing
        section.contentBlocks?.forEach((block, blockIndex) => {
          if (block.type === 'text' && block.content) {
            // Text content with exact formatting from add_justified_paragraph
            const formattedContent = preserveUserFormatting(block.content);
            allBodyContent.push(...formattedContent.map((content, idx) => 
              React.cloneElement(content as React.ReactElement, {
                key: `section-${sectionNumber}-text-${blockIndex}-${idx}`
              })
            ));
            
            // Check if this text block has an image attached to it
            if (block.data && block.caption) {
              figureCounter++;
              const figureSize = block.size || 'medium';
              const maxWidth = IEEE_MEASUREMENTS.figureSizes[figureSize as keyof typeof IEEE_MEASUREMENTS.figureSizes];
              
              // Handle both base64 data with proper MIME type detection
              let imageSrc = '';
              let imageError = false;
              
              try {
                // Clean up base64 data and detect MIME type
                const base64Data = block.data.replace(/^data:image\/[^;]+;base64,/, '');
                
                // Detect MIME type from base64 signature
                let mimeType = 'image/png'; // default
                if (base64Data.startsWith('/9j/')) {
                  mimeType = 'image/jpeg';
                } else if (base64Data.startsWith('iVBORw0KGgo')) {
                  mimeType = 'image/png';
                } else if (base64Data.startsWith('R0lGODlh')) {
                  mimeType = 'image/gif';
                } else if (base64Data.startsWith('UklGRg')) {
                  mimeType = 'image/webp';
                }
                
                imageSrc = `data:${mimeType};base64,${base64Data}`;
              } catch (error) {
                console.error('Error processing image data for text block:', error);
                imageError = true;
              }
              
              allBodyContent.push(
                <div key={`section-${sectionNumber}-text-image-${blockIndex}`} className="ieee-figure ieee-text-attached-figure">
                  <div className="ieee-figure-container">
                    {imageSrc && !imageError ? (
                      <img 
                        src={imageSrc}
                        alt={block.caption || `Figure ${figureCounter}`}
                        className="ieee-figure-image"
                        style={{ 
                          maxWidth: `${maxWidth}px`,
                          maxHeight: `${IEEE_MEASUREMENTS.maxFigureHeight}px`,
                          width: 'auto',
                          height: 'auto',
                          display: 'block',
                          margin: '0 auto'
                        }}
                        onLoad={(e) => {
                          console.log(`Text block image ${figureCounter} loaded successfully`);
                        }}
                        onError={(e) => {
                          console.error(`Text block image ${figureCounter} failed to load`);
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const placeholder = target.parentElement?.querySelector('.ieee-figure-placeholder') as HTMLElement;
                          if (placeholder) {
                            placeholder.style.display = 'flex';
                          }
                        }}
                      />
                    ) : (
                      <div 
                        className="ieee-figure-placeholder"
                        style={{ 
                          width: `${maxWidth}px`,
                          height: '100px',
                          border: '2px dashed #ccc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#666',
                          fontSize: '14px',
                          backgroundColor: '#f9f9f9',
                          borderRadius: '4px',
                          margin: '0 auto'
                        }}
                      >
                        {imageError ? '[Image Error]' : `[Image: ${block.caption || 'Attached to text'}]`}
                      </div>
                    )}
                    {/* Hidden placeholder for error fallback */}
                    {imageSrc && !imageError && (
                      <div 
                        className="ieee-figure-placeholder"
                        style={{ 
                          width: `${maxWidth}px`,
                          height: '100px',
                          border: '2px dashed #ccc',
                          display: 'none',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#666',
                          fontSize: '14px',
                          backgroundColor: '#f9f9f9',
                          borderRadius: '4px',
                          margin: '0 auto'
                        }}
                      >
                        [Image Error: {block.caption || 'Attached to text'}]
                      </div>
                    )}
                  </div>
                  <div className="ieee-figure-caption">
                    Fig. {figureCounter}: {block.caption}
                  </div>
                </div>
              );
            }
          }
          
          if (block.type === 'image' && (block.data || block.caption)) {
            // Figure processing - matches Word generator image handling
            figureCounter++;
            const figureSize = block.size || 'medium';
            const maxWidth = IEEE_MEASUREMENTS.figureSizes[figureSize as keyof typeof IEEE_MEASUREMENTS.figureSizes];
            
            // Handle base64 data with proper MIME type detection
            let imageSrc = '';
            let imageError = false;
            
            if (block.data) {
              try {
                // Clean up base64 data and detect MIME type
                const base64Data = block.data.replace(/^data:image\/[^;]+;base64,/, '');
                
                // Detect MIME type from base64 signature
                let mimeType = 'image/png'; // default
                if (base64Data.startsWith('/9j/')) {
                  mimeType = 'image/jpeg';
                } else if (base64Data.startsWith('iVBORw0KGgo')) {
                  mimeType = 'image/png';
                } else if (base64Data.startsWith('R0lGODlh')) {
                  mimeType = 'image/gif';
                } else if (base64Data.startsWith('UklGRg')) {
                  mimeType = 'image/webp';
                }
                
                imageSrc = `data:${mimeType};base64,${base64Data}`;
              } catch (error) {
                console.error('Error processing standalone image data:', error);
                imageError = true;
              }
            }
            
            allBodyContent.push(
              <div key={`section-${sectionNumber}-image-${blockIndex}`} className="ieee-figure">
                <div className="ieee-figure-container">
                  {imageSrc && !imageError ? (
                    <img 
                      src={imageSrc}
                      alt={block.caption || `Figure ${figureCounter}`}
                      className="ieee-figure-image"
                      style={{ 
                        maxWidth: `${maxWidth}px`,
                        maxHeight: `${IEEE_MEASUREMENTS.maxFigureHeight}px`,
                        width: 'auto',
                        height: 'auto',
                        display: 'block',
                        margin: '0 auto'
                      }}
                      onLoad={(e) => {
                        console.log(`Standalone image ${figureCounter} loaded successfully`);
                      }}
                      onError={(e) => {
                        console.error(`Standalone image ${figureCounter} failed to load`);
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const placeholder = target.parentElement?.querySelector('.ieee-figure-placeholder') as HTMLElement;
                        if (placeholder) {
                          placeholder.style.display = 'flex';
                        }
                      }}
                    />
                  ) : (
                    <div 
                      className="ieee-figure-placeholder"
                      style={{ 
                        width: `${maxWidth}px`,
                        height: '100px',
                        border: '2px dashed #ccc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#666',
                        fontSize: '14px',
                        backgroundColor: '#f9f9f9',
                        borderRadius: '4px',
                        margin: '0 auto'
                      }}
                    >
                      [Image: {block.caption || 'No caption'}]
                    </div>
                  )}
                  {/* Hidden placeholder for error fallback */}
                  {imageSrc && !imageError && (
                    <div 
                      className="ieee-figure-placeholder"
                      style={{ 
                        width: `${maxWidth}px`,
                        height: '100px',
                        border: '2px dashed #ccc',
                        display: 'none',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#666',
                        fontSize: '14px',
                        backgroundColor: '#f9f9f9',
                        borderRadius: '4px',
                        margin: '0 auto'
                      }}
                    >
                      [Image Error: {block.caption || 'No caption'}]
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

        // Subsections - matches Word generator subsection handling
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
            allBodyContent.push(...formattedContent.map((content, idx) => 
              React.cloneElement(content as React.ReactElement, {
                key: `subsection-${sectionNumber}-${subIndex}-content-${idx}`
              })
            ));
          }
        });
      });
    }

    // References - matches Word generator add_references
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

    // PHASE 3: Enhanced height estimation matching Word's layout engine
    const estimateElementHeight = (element: React.ReactNode): number => {
      if (!element || typeof element !== 'object') return IEEE_MEASUREMENTS.lineHeight;
      
      const key = (element as any).key || '';
      const props = (element as any).props || {};
      
      // Section headings - matches Word generator spacing
      if (key.includes('section-') && key.includes('title')) {
        return IEEE_MEASUREMENTS.lineHeight * 1.5 + IEEE_MEASUREMENTS.sectionSpaceBefore;
      }
      if (key.includes('subsection-') && key.includes('title')) {
        return IEEE_MEASUREMENTS.lineHeight * 1.2 + IEEE_MEASUREMENTS.subsectionSpaceBefore;
      }
      
      // Figures - matches Word generator figure spacing
      if (key.includes('figure') || key.includes('image')) {
        if (props.style?.maxHeight) {
          return parseInt(props.style.maxHeight) + 60; // caption + spacing
        }
        return 150;
      }
      
      // References - matches Word generator reference spacing
      if (key.includes('ref-')) {
        return IEEE_MEASUREMENTS.lineHeight * 1.5;
      }
      
      // Text content - improved estimation for column width
      if (props?.children) {
        let text = '';
        if (typeof props.children === 'string') {
          text = props.children;
        } else if (Array.isArray(props.children)) {
          text = props.children.join('');
        }
        
        // Column width estimation (each column is ~243px, ~35 chars per line at 9.5pt)
        const charsPerLine = 35;
        const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
        return (lines * IEEE_MEASUREMENTS.lineHeight) + IEEE_MEASUREMENTS.paragraphSpaceAfter;
      }
      
      return IEEE_MEASUREMENTS.lineHeight + IEEE_MEASUREMENTS.paragraphSpaceAfter;
    };

    // PHASE 4: Enhanced page breaking with forced pagination for substantial content
    const contentPerPage: React.ReactNode[][] = [];
    let currentPageContent: React.ReactNode[] = [];
    let currentPageHeight = 0;
    let isFirstPage = true;
    
    // Debug: Add console log to track pagination
    console.log(`Total body content elements: ${allBodyContent.length}`);
    
    allBodyContent.forEach((element, index) => {
      const elementHeight = estimateElementHeight(element);
      const maxPageHeight = isFirstPage ? firstPageBodyHeight : availableContentHeight - 40;
      
      // More aggressive page breaking to ensure multiple pages
      const shouldBreakPage = currentPageHeight + elementHeight > maxPageHeight * 0.8 && currentPageContent.length > 0;
      
      // Page break logic - matches Word's column and page flow
      if (shouldBreakPage) {
        contentPerPage.push([...currentPageContent]);
        currentPageContent = [element];
        currentPageHeight = elementHeight;
        isFirstPage = false;
        
        // Debug log
        console.log(`Page break at element ${index}, starting new page ${contentPerPage.length + 1}`);
      } else {
        currentPageContent.push(element);
        currentPageHeight += elementHeight;
      }
    });

    // Add remaining content
    if (currentPageContent.length > 0) {
      contentPerPage.push(currentPageContent);
    }

    // Ensure at least one page exists
    if (contentPerPage.length === 0) {
      contentPerPage.push([]);
    }
    
    // CRITICAL: Force additional pages when there's substantial content
    // This ensures content overflow creates new pages like page 2
    if (allBodyContent.length > 8) { // If more than 8 content elements
      const targetPagesNeeded = Math.ceil(allBodyContent.length / 4); // Aim for ~4 elements per page
      
      if (contentPerPage.length < targetPagesNeeded) {
        console.log(`Forcing pagination: need ${targetPagesNeeded} pages for ${allBodyContent.length} elements`);
        
        // Redistribute content more evenly across pages
        const allContent = contentPerPage.flat();
        const newContentPerPage: React.ReactNode[][] = [];
        const elementsPerPage = Math.ceil(allContent.length / targetPagesNeeded);
        
        for (let i = 0; i < allContent.length; i += elementsPerPage) {
          newContentPerPage.push(allContent.slice(i, i + elementsPerPage));
        }
        
        // Replace original pagination with new distribution
        contentPerPage.length = 0;
        contentPerPage.push(...newContentPerPage);
      }
    }
    
    console.log(`Generated ${contentPerPage.length} pages (final count)`);

    // PHASE 5: Generate pages exactly matching Word document layout
    contentPerPage.forEach((pageContent, pageIndex) => {
      const isFirst = pageIndex === 0;
      
      pages.push(
        <div key={`page-${pageIndex + 1}`} className="ieee-page">
          {/* Single-column header - ONLY on first page, matches Word structure */}
          {isFirst && headerElements.length > 0 && (
            <div className="ieee-header-section">
              {headerElements}
            </div>
          )}
          
          {/* Two-column body section - exact same format for pages 2+ as page 2 */}
          <div 
            className="ieee-body-section"
            style={{
              minHeight: isFirst ? `${firstPageBodyHeight - 30}px` : `${availableContentHeight - 70}px`,
              maxHeight: isFirst ? `${firstPageBodyHeight - 30}px` : `${availableContentHeight - 70}px`,
            }}
          >
            {pageContent}
          </div>
          
          {/* Page number inside the page - with more space reserved */}
          <div className="ieee-page-number-inside">
            {pageIndex + 1}
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
          
          <div className="p-0 bg-gray-100 overflow-auto" style={{ maxHeight: "80vh" }}>
            <style>{`
              /* EXACT Word document styling with proper column flow */
              .ieee-page {
                width: ${IEEE_MEASUREMENTS.pageWidth}px;
                height: ${IEEE_MEASUREMENTS.pageHeight}px;
                background: white;
                box-shadow: none;
                margin: 0;
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
                display: block; /* Changed from flex to block */
                border: 1px solid #e5e5e5;
              }

              /* Page wrapper for proper spacing */
              .ieee-page-wrapper {
                margin: 0;
                padding: 0;
                display: block; /* Changed from flex to block */
                line-height: 0; /* Remove any line-height spacing */
              }

              /* Container with no spacing */
              .ieee-pages-container {
                transform-origin: top left;
                width: fit-content;
                min-height: fit-content;
                line-height: 0; /* Remove any line-height spacing */
                margin: 0;
                padding: 0;
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

              /* IEEE Body Section - Two-column layout with better column filling */
              .ieee-body-section {
                column-count: 2;
                column-gap: ${IEEE_MEASUREMENTS.columnGap}px;
                column-fill: balance; /* Changed from auto to balance for better column distribution */
                overflow: visible; /* Changed from hidden to visible */
                text-align: justify;
                hyphens: auto;
                word-wrap: break-word;
                
                /* Better column balancing */
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

              /* Figure styles - matches Word document figure formatting */
              .ieee-figure {
                margin: 12pt 0;
                text-align: center;
                page-break-inside: avoid;
                column-break-inside: avoid;
                break-inside: avoid;
                clear: both;
                width: 100%;
                display: block;
              }
              
              .ieee-text-attached-figure {
                margin: 8pt 0 12pt 0;
                text-align: center;
                page-break-inside: avoid;
                column-break-inside: avoid;
                break-inside: avoid;
                clear: both;
                width: 100%;
                display: block;
                /* Force the image to break to a new line after text */
                margin-top: 8pt;
                /* Ensure proper spacing from preceding text */
                border-top: none;
                /* Force column break if needed to keep image with text */
                page-break-before: avoid;
                column-break-before: avoid;
                break-before: avoid;
              }
              
              .ieee-figure-container {
                margin-bottom: 6pt;
                display: block;
                text-align: center;
                width: 100%;
                /* Prevent column breaks within figure container */
                page-break-inside: avoid;
                column-break-inside: avoid;
                break-inside: avoid;
                /* Ensure container takes full width and forces new line */
                clear: both;
              }
              
              .ieee-figure-image {
                max-width: 100%;
                height: auto;
                border: none;
                display: block;
                margin: 0 auto;
                /* Ensure image stays within column width */
                box-sizing: border-box;
                /* Force image to be a block element that takes full width */
                width: auto;
              }
              
              .ieee-figure-caption {
                font-family: 'Times New Roman', serif;
                font-size: 9pt;
                line-height: 1.2;
                text-align: center;
                margin-top: 6pt;
                font-weight: normal;
                color: #000;
                /* Keep caption with its figure */
                page-break-before: avoid;
                column-break-before: avoid;
                break-before: avoid;
                /* Ensure caption is on new line */
                display: block;
                width: 100%;
                clear: both;
              }
              
              .ieee-figure-placeholder {
                border: 2px dashed #ccc !important;
                background-color: #f9f9f9 !important;
                border-radius: 4px;
                font-family: 'Times New Roman', serif;
                font-size: 9pt;
                margin: 0 auto;
                display: block;
                text-align: center;
              }

              /* Enhanced typography */
              .ieee-page * {
                text-rendering: optimizeLegibility;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
              }

              /* Page number styling */
              .ieee-page-number {
                margin-top: 5px;
                text-align: center;
                width: ${IEEE_MEASUREMENTS.pageWidth}px;
                transform: scale(${zoom / 100});
                transform-origin: top left;
                font-family: Arial, sans-serif;
                font-size: 12px;
                color: #666;
                padding: 5px 0;
                background: #f9f9f9;
                border-top: 1px solid #e5e5e5;
              }

              .ieee-page-number-inside {
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 12px;
                color: #888;
                font-family: 'Times New Roman', serif;
                z-index: 10;
                font-weight: normal;
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
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
