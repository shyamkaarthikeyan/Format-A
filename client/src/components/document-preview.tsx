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

export default function DocumentPreview({ document, documentId }: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(75);
  const [email, setEmail] = useState("");
  const { toast } = useToast();

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

      const response = await fetch('/api/generate/docx-to-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(document),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate PDF: ${response.statusText} - ${errorText}`);
      }

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
          documentData: document,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to send email: ${response.statusText}`);
      }

      const result = await response.json();
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

  // Create figure element matching IEEE Word document
  const createFigure = (imageData: string, caption?: string, size?: string, figureNumber?: number) => {
    if (!imageData) return null;

    try {
      const base64Data = imageData.replace(/^data:image\/[^;]+;base64,/, '');
      if (!base64Data || base64Data.length < 10) return null;

      let mimeType = 'image/png';
      if (base64Data.startsWith('/9j/')) mimeType = 'image/jpeg';
      else if (base64Data.startsWith('iVBORw0KGgo')) mimeType = 'image/png';
      else if (base64Data.startsWith('R0lGODlh')) mimeType = 'image/gif';
      else if (base64Data.startsWith('UklGRg')) mimeType = 'image/webp';

      return (
        <div key={`figure-${figureNumber}`} className="word-figure">
          <div className="word-figure-container">
            <img
              src={`data:${mimeType};base64,${base64Data}`}
              alt={caption || `Figure ${figureNumber}`}
              className={`word-figure-image size-${size || 'medium'}`}
            />
          </div>
          {caption && (
            <div className="word-figure-caption">
              Fig. {figureNumber}: {caption}
            </div>
          )}
        </div>
      );
    } catch (error) {
      return (
        <div key={`figure-${figureNumber}`} className="word-figure">
          <div className="word-figure-placeholder">
            [Image: {caption || 'No caption'}]
          </div>
          {caption && (
            <div className="word-figure-caption">
              Fig. {figureNumber}: {caption}
            </div>
          )}
        </div>
      );
    }
  };

  // Render accurate IEEE Word preview
  const renderWordPreview = useMemo(() => {
    let figureCounter = 0;

    // IEEE configuration matching python-docx settings
    const IEEE_CONFIG = {
      margin: '0.75in',
      fontName: 'Times New Roman',
      fontSizeTitle: '24pt',
      fontSizeBody: '9.5pt',
      fontSizeCaption: '9pt',
      lineSpacing: '10pt',
      columnWidth: '3.375in',
      columnSpacing: '0.25in',
      figureSizes: {
        'very-small': '1.2in',
        small: '1.8in',
        medium: '2.5in',
        large: '3.2in',
      },
      maxFigureHeight: '4.0in',
    };

    // Header content (single-column, only on first page)
    const headerContent: React.ReactNode[] = [];

    if (document.title) {
      headerContent.push(
        <div key="title" className="word-title">
          {document.title}
        </div>
      );
    }

    if (document.authors && document.authors.length > 0) {
      headerContent.push(
        <div key="authors" className="word-authors">
          {document.authors.map((author, idx) => (
            <div key={author.id || idx} className="word-author">
              {author.name && <div className="word-author-name">{author.name}</div>}
              {author.department && <div className="word-author-detail">{author.department}</div>}
              {author.organization && <div className="word-author-detail">{author.organization}</div>}
              {(author.city || author.state) && (
                <div className="word-author-detail">
                  {[author.city, author.state].filter(Boolean).join(', ')}
                </div>
              )}
              {author.customFields?.map((field, fIdx) =>
                field.value ? (
                  <div key={fIdx} className="word-author-detail">{field.value}</div>
                ) : null
              )}
            </div>
          ))}
        </div>
      );
    }

    if (document.abstract) {
      headerContent.push(
        <div key="abstract" className="word-abstract">
          <span className="word-abstract-label">Abstract—</span>
          {document.abstract}
        </div>
      );
    }

    if (document.keywords) {
      headerContent.push(
        <div key="keywords" className="word-keywords">
          <span className="word-keywords-label">Index Terms—</span>
          {document.keywords}
        </div>
      );
    }

    // Collect all body content blocks
    const bodyContent: { node: React.ReactNode; lines: number; type: string }[] = [];

    if (document.sections) {
      document.sections.forEach((section, sectionIndex) => {
        const sectionNumber = sectionIndex + 1;

        if (section.title) {
          bodyContent.push({
            node: (
              <div key={`section-${sectionIndex}`} className="word-section-title">
                {sectionNumber}. {section.title.toUpperCase()}
              </div>
            ),
            lines: Math.ceil(section.title.length / 50) + 2,
            type: 'section-title',
          });
        }

        if (section.contentBlocks) {
          section.contentBlocks.forEach((block, blockIndex) => {
            if (block.type === 'text' && block.content) {
              const paragraphs = block.content.split('\n\n').filter(p => p.trim());
              paragraphs.forEach((para, paraIndex) => {
                bodyContent.push({
                  node: (
                    <div
                      key={`section-${sectionIndex}-block-${blockIndex}-para-${paraIndex}`}
                      className="word-paragraph"
                      dangerouslySetInnerHTML={{ __html: para }}
                    />
                  ),
                  lines: Math.ceil(para.replace(/<[^>]*>/g, '').length / 50) + 1, // Strip HTML tags for line calculation
                  type: 'paragraph',
                });
              });
            }

            if ((block.type === 'image' || block.type === 'text') && block.data && block.caption) {
              figureCounter++;
              const figure = createFigure(block.data, block.caption, block.size, figureCounter);
              if (figure) {
                // Adjust line counts based on figure size and caption
                const figureHeightIn = {
                  'very-small': 1.2,
                  small: 1.8,
                  medium: 2.5,
                  large: 3.2,
                }[block.size || 'medium'];
                const captionLines = block.caption ? Math.ceil(block.caption.length / 50) + 1 : 0;
                const figureLines = Math.ceil((figureHeightIn * 72) / 10) + captionLines; // 72pt per inch, 10pt per line
                bodyContent.push({
                  node: figure,
                  lines: figureLines,
                  type: 'figure',
                });
              }
            }
          });
        }

        if (section.subsections) {
          section.subsections.forEach((subsection, subIndex) => {
            if (subsection.title) {
              bodyContent.push({
                node: (
                  <div
                    key={`section-${sectionIndex}-subsection-${subIndex}`}
                    className="word-subsection-title"
                  >
                    {sectionNumber}.{subIndex + 1} {subsection.title}
                  </div>
                ),
                lines: Math.ceil(subsection.title.length / 50) + 2,
                type: 'subsection-title',
              });
            }

            if (subsection.content) {
              const paragraphs = subsection.content.split('\n\n').filter(p => p.trim());
              paragraphs.forEach((para, paraIndex) => {
                bodyContent.push({
                  node: (
                    <div
                      key={`section-${sectionIndex}-subsection-${subIndex}-para-${paraIndex}`}
                      className="word-paragraph"
                    >
                      {para}
                    </div>
                  ),
                  lines: Math.ceil(para.length / 50) + 1,
                  type: 'paragraph',
                });
              });
            }
          });
        }
      });
    }

    if (document.references && document.references.length > 0) {
      bodyContent.push({
        node: (
          <div key="references" className="word-section-title">
            REFERENCES
          </div>
        ),
        lines: 2,
        type: 'section-title',
      });

      document.references.forEach((ref, refIndex) => {
        if (ref.text) {
          bodyContent.push({
            node: (
              <div key={`reference-${refIndex}`} className="word-reference">
                [{refIndex + 1}] {ref.text}
              </div>
            ),
            lines: Math.ceil(ref.text.length / 50) + 1,
            type: 'reference',
          });
        }
      });
    }

    // Distribute content across pages
    const LINES_PER_COLUMN_PAGE1 = 40; // For page 1 with header
    const LINES_PER_COLUMN_PAGE2 = 54; // For full pages
    const MAX_PREVIEW_PAGES = 2;
    const pages: { header?: React.ReactNode[]; left: React.ReactNode[]; right: React.ReactNode[] }[] = [
      { header: headerContent, left: [], right: [] },
    ];
    let currentPageIndex = 0;
    let currentColumn: 'left' | 'right' = 'left';
    let linesInCurrentColumn = 0;
    let contentIndex = 0;

    // Helper function to split paragraph text
    const splitParagraph = (text: string, remainingLines: number) => {
      const charsPerLine = 50;
      
      // Handle case where text might be undefined or null
      if (!text || typeof text !== 'string') {
        return { firstPart: '', secondPart: '' };
      }
      
      const totalLines = Math.ceil(text.length / charsPerLine);
      if (totalLines <= remainingLines) {
        return { firstPart: text, secondPart: '' };
      }

      const splitPoint = remainingLines * charsPerLine;
      let splitIndex = splitPoint;
      while (splitIndex > 0 && text[splitIndex] !== ' ') {
        splitIndex--;
      }
      if (splitIndex === 0) splitIndex = splitPoint;

      return {
        firstPart: text.slice(0, splitIndex),
        secondPart: text.slice(splitIndex).trim(),
      };
    };

    // Helper function to extract text content from JSX element (handles HTML content)
    const extractTextFromNode = (node: React.ReactNode): string => {
      if (typeof node === 'string') {
        return node;
      }
      if (React.isValidElement(node)) {
        const props = node.props;
        if (props.dangerouslySetInnerHTML && props.dangerouslySetInnerHTML.__html) {
          // Strip HTML tags to get plain text for length calculation
          return props.dangerouslySetInnerHTML.__html.replace(/<[^>]*>/g, '');
        }
        if (typeof props.children === 'string') {
          return props.children;
        }
      }
      return '';
    };

    // Process body content
    while (contentIndex < bodyContent.length && currentPageIndex < MAX_PREVIEW_PAGES) {
      const linesPerColumn = currentPageIndex === 0 ? LINES_PER_COLUMN_PAGE1 : LINES_PER_COLUMN_PAGE2;
      const remainingLines = linesPerColumn - linesInCurrentColumn;

      const content = bodyContent[contentIndex];

      if (content.type === 'figure' && content.lines > remainingLines && remainingLines >= 1) {
        // Figure doesn't fit; try to place subsequent text content first
        let placedText = false;
        for (let nextIndex = contentIndex + 1; nextIndex < bodyContent.length; nextIndex++) {
          const nextContent = bodyContent[nextIndex];
          if (nextContent.type === 'paragraph' && nextContent.lines <= remainingLines) {
            pages[currentPageIndex][currentColumn].push(nextContent.node);
            linesInCurrentColumn += nextContent.lines;
            bodyContent.splice(nextIndex, 1); // Remove placed content
            placedText = true;
            break;
          }
        }

        if (!placedText) {
          // No suitable text to fill gap; move to next column or page
          if (currentColumn === 'left') {
            currentColumn = 'right';
            linesInCurrentColumn = 0;
          } else {
            currentColumn = 'left';
            linesInCurrentColumn = 0;
            if (currentPageIndex + 1 < MAX_PREVIEW_PAGES) {
              currentPageIndex++;
              pages.push({ left: [], right: [] });
            } else {
              break;
            }
          }
          continue;
        }
      } else if (content.type === 'paragraph' && content.lines > remainingLines && remainingLines >= 1) {
        // Split paragraph - handle both plain text and HTML content
        const textContent = extractTextFromNode(content.node);
        const { firstPart, secondPart } = splitParagraph(textContent, remainingLines);

        if (firstPart) {
          // Create new paragraph with same formatting as original
          const originalNode = content.node as JSX.Element;
          const newNode = React.cloneElement(originalNode, {
            key: originalNode.props.key,
            dangerouslySetInnerHTML: originalNode.props.dangerouslySetInnerHTML 
              ? { __html: firstPart } 
              : undefined,
            children: originalNode.props.dangerouslySetInnerHTML 
              ? undefined 
              : firstPart
          });
          
          pages[currentPageIndex][currentColumn].push(newNode);
          linesInCurrentColumn += Math.ceil(firstPart.length / 50) + 1;
        }

        if (secondPart) {
          // Create continuation paragraph
          const originalNode = content.node as JSX.Element;
          const contNode = React.cloneElement(originalNode, {
            key: `${originalNode.props.key}-cont`,
            dangerouslySetInnerHTML: originalNode.props.dangerouslySetInnerHTML 
              ? { __html: secondPart } 
              : undefined,
            children: originalNode.props.dangerouslySetInnerHTML 
              ? undefined 
              : secondPart
          });
          
          bodyContent.splice(contentIndex, 1, {
            node: contNode,
            lines: Math.ceil(secondPart.length / 50) + 1,
            type: 'paragraph',
          });
          // Move to next column or page
          if (currentColumn === 'left') {
            currentColumn = 'right';
            linesInCurrentColumn = 0;
          } else {
            currentColumn = 'left';
            linesInCurrentColumn = 0;
            if (currentPageIndex + 1 < MAX_PREVIEW_PAGES) {
              currentPageIndex++;
              pages.push({ left: [], right: [] });
            } else {
              break;
            }
          }
        } else {
          contentIndex++;
        }
      } else if (content.lines <= remainingLines || content.type !== 'paragraph') {
        // Place entire content block
        pages[currentPageIndex][currentColumn].push(content.node);
        linesInCurrentColumn += content.lines;
        contentIndex++;
      } else {
        // Move to next column or page
        if (currentColumn === 'left') {
          currentColumn = 'right';
          linesInCurrentColumn = 0;
        } else {
          currentColumn = 'left';
          linesInCurrentColumn = 0;
          if (currentPageIndex + 1 < MAX_PREVIEW_PAGES) {
            currentPageIndex++;
            pages.push({ left: [], right: [] });
          } else {
            break;
          }
        }
        continue;
      }

      // Check if column is full
      if (linesInCurrentColumn >= linesPerColumn) {
        if (currentColumn === 'left') {
          currentColumn = 'right';
          linesInCurrentColumn = 0;
        } else {
          currentColumn = 'left';
          linesInCurrentColumn = 0;
          if (currentPageIndex + 1 < MAX_PREVIEW_PAGES) {
            currentPageIndex++;
            pages.push({ left: [], right: [] });
          } else {
            break;
          }
        }
      }
    }

    // If content remains, add notice
    const hasMoreContent = contentIndex < bodyContent.length;

    return (
      <>
        {pages.map((page, index) => (
          <div key={`page-${index + 1}`} className="word-page">
            {index === 0 && page.header && <div className="word-header">{page.header}</div>}
            <div className="word-columns">
              <div className="word-column word-column-left">{page.left}</div>
              <div className="word-column word-column-right">{page.right}</div>
            </div>
          </div>
        ))}
        {hasMoreContent && (
          <div className="preview-limitation-notice">
            <div className="notice-content">
              <p>
                <strong>Preview Limited:</strong> Showing pages 1-{MAX_PREVIEW_PAGES} of document.
              </p>
              <p>Download the full document to see all content.</p>
            </div>
          </div>
        )}
      </>
    );
  }, [document]);

  const handleZoomIn = () => setZoom(prev => Math.min(200, prev + 25));
  const handleZoomOut = () => setZoom(prev => Math.max(25, prev - 25));

  return (
    <div className="space-y-6">
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

      <Card>
        <CardContent className="p-0">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Live Preview
              </span>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={zoom <= 25}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs text-gray-500 min-w-[40px] text-center">{zoom}%</span>
                <Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={zoom >= 200}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Caution message */}
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 text-amber-600 mt-0.5">
                ⚠️
              </div>
              <div className="text-sm text-amber-800">
                <strong>Caution:</strong> This live preview is for reference only. The generated Word document follows the official IEEE format.
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-100 overflow-auto" style={{ maxHeight: "80vh" }}>
            <div
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease-in-out',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                alignItems: 'center',
              }}
            >
              <style>{`
                .word-page {
                  width: 8.27in;
                  height: 11.69in;
                  margin: 0 auto;
                  padding: 0.75in;
                  background: white;
                  font-family: 'Times New Roman', serif;
                  font-size: 9.5pt;
                  line-height: 10pt;
                  color: black;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                  box-sizing: border-box;
                  display: flex;
                  flex-direction: column;
                  overflow: hidden;
                  page-break-after: always;
                }

                .word-header {
                  width: 100%;
                  margin-bottom: 12pt;
                  flex-shrink: 0;
                }

                .word-title {
                  text-align: center;
                  font-weight: bold;
                  font-size: 24pt;
                  line-height: 1.2;
                  margin-bottom: 12pt;
                }

                .word-authors {
                  display: flex;
                  justify-content: center;
                  gap: 1in;
                  margin-bottom: 12pt;
                  flex-wrap: wrap;
                }

                .word-author {
                  text-align: center;
                  min-width: 100px;
                  max-width: 180px;
                }

                .word-author-name {
                  font-weight: bold;
                  font-size: 9.5pt;
                  margin-bottom: 2pt;
                }

                .word-author-detail {
                  font-size: 9pt;
                  font-style: italic;
                  margin-bottom: 2pt;
                  line-height: 1.1;
                }

                .word-abstract {
                  text-align: justify;
                  font-size: 9.5pt;
                  line-height: 10pt;
                  margin-bottom: 12pt;
                  hyphens: auto;
                }

                .word-abstract-label {
                  font-style: italic;
                }

                .word-keywords {
                  text-align: justify;
                  font-size: 9.5pt;
                  line-height: 10pt;
                  margin-bottom: 12pt;
                  hyphens: auto;
                }

                .word-keywords-label {
                  font-style: italic;
                }

                .word-columns {
                  display: flex;
                  gap: 0.25in;
                  flex: 1;
                  overflow: hidden;
                }

                .word-column {
                  flex: 1;
                  width: 3.375in;
                  overflow: hidden;
                }

                .word-column-left {
                  padding-right: 0.125in;
                }

                .word-column-right {
                  padding-left: 0.125in;
                }

                .word-section-title {
                  font-size: 9.5pt;
                  font-weight: bold;
                  text-transform: uppercase;
                  margin: 10pt 0 0 0;
                  line-height: 10pt;
                }

                .word-subsection-title {
                  font-size: 9.5pt;
                  font-weight: bold;
                  margin: 6pt 0 0 0;
                  line-height: 10pt;
                }

                .word-paragraph {
                  text-align: justify;
                  font-size: 9.5pt;
                  line-height: 10pt;
                  margin-bottom: 12pt;
                  text-indent: 0;
                  hyphens: auto;
                }

                .word-figure {
                  text-align: center;
                  margin: 6pt 0;
                }

                .word-figure-container {
                  margin-bottom: 2pt;
                }

                .word-figure-image {
                  max-width: 100%;
                  height: auto;
                  display: block;
                  margin: 0 auto;
                  border: 1px solid #ddd;
                }

                .word-figure-image.size-very-small { max-width: 1.2in; }
                .word-figure-image.size-small { max-width: 1.8in; }
                .word-figure-image.size-medium { max-width: 2.5in; }
                .word-figure-image.size-large { max-width: 3.2in; }

                .word-figure-placeholder {
                  width: 1.5in;
                  height: 1in;
                  border: 2px dashed #ccc;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto;
                  background-color: #f9f9f9;
                  color: #666;
                  font-size: 8pt;
                }

                .word-figure-caption {
                  font-size: 9pt;
                  text-align: center;
                  margin-top: 2pt;
                  line-height: 1.1;
                }

                .word-reference {
                  font-size: 9.5pt;
                  line-height: 10pt;
                  margin-bottom: 12pt;
                  text-align: justify;
                  text-indent: -0.25in;
                  padding-left: 0.45in;
                  hyphens: auto;
                }

                .preview-limitation-notice {
                  width: 8.27in;
                  margin: 20px auto 0;
                  padding: 16px;
                  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                  border: 2px solid #f59e0b;
                  border-radius: 8px;
                  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
                }

                .notice-content {
                  text-align: center;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .notice-content p {
                  margin: 4px 0;
                  font-size: 14px;
                  color: #92400e;
                  line-height: 1.4;
                }

                .notice-content p:first-child {
                  font-weight: 600;
                }

                @media print {
                  .word-page {
                    margin: 0;
                    box-shadow: none;
                    page-break-after: always;
                  }
                }
              `}</style>
              {renderWordPreview}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}