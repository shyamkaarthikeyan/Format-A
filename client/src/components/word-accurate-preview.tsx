import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Document } from '@shared/schema';

interface WordAccuratePreviewProps {
  document: Document;
  onExportPDF?: () => void;
}

// Exact Word measurements (96 DPI web standard)
const WORD_CONFIG = {
  pageWidth: 816, // 8.5in × 96dpi
  pageHeight: 1056, // 11in × 96dpi
  marginTop: 72, // 0.75in × 96dpi
  marginRight: 72,
  marginBottom: 72,
  marginLeft: 72,
  contentWidth: 672, // 816 - 144 (both margins)
  contentHeight: 912, // 1056 - 144 (both margins)
  
  // Typography (exact pixel values)
  fontFamily: '"Times New Roman", Times, serif',
  titleSize: 32, // 24pt
  bodySize: 12.67, // 9.5pt
  captionSize: 12, // 9pt
  lineHeight: 13.33, // 10pt exact
  
  // Two-column layout
  columnWidth: 243, // 3.375in × 96dpi ÷ 2
  columnGap: 18, // 0.25in × 96dpi
  paragraphIndent: 14.4, // 0.2in × 96dpi
  hangingIndent: 18, // 0.25in for references
};

interface ContentElement {
  id: string;
  type: 'title' | 'authors' | 'abstract' | 'keywords' | 'section-heading' | 'paragraph' | 'subsection-heading' | 'reference-heading' | 'reference';
  content: string | JSX.Element;
  isFullWidth: boolean;
  estimatedHeight: number;
  breakBefore?: boolean;
  breakAfter?: boolean;
  keepWithNext?: boolean;
}

interface Page {
  elements: ContentElement[];
  singleColumnElements: ContentElement[];
  twoColumnElements: ContentElement[];
  usedHeight: number;
}

const WordAccuratePreview: React.FC<WordAccuratePreviewProps> = ({ document, onExportPDF }) => {
  const [pages, setPages] = useState<Page[]>([]);
  const measureRef = useRef<HTMLDivElement>(null);

  // Accurate height measurement using DOM
  const measureContentHeight = useCallback((content: string | JSX.Element, style: React.CSSProperties): number => {
    if (!measureRef.current) return 20;

    const tempElement = window.document.createElement('div');
    tempElement.style.position = 'absolute';
    tempElement.style.visibility = 'hidden';
    tempElement.style.width = (style.width as string) || `${WORD_CONFIG.contentWidth}px`;
    tempElement.style.fontFamily = WORD_CONFIG.fontFamily;
    tempElement.style.fontSize = `${WORD_CONFIG.bodySize}px`;
    tempElement.style.lineHeight = `${WORD_CONFIG.lineHeight}px`;
    
    // Apply specific styles
    Object.assign(tempElement.style, style);
    
    if (typeof content === 'string') {
      tempElement.textContent = content;
    } else {
      tempElement.innerHTML = content.toString();
    }

    window.document.body.appendChild(tempElement);
    const height = tempElement.getBoundingClientRect().height;
    window.document.body.removeChild(tempElement);

    return Math.ceil(height);
  }, []);

  // Generate structured content elements
  const generateContentElements = useCallback((): ContentElement[] => {
    const elements: ContentElement[] = [];

    // Title - full width
    if (document.title) {
      elements.push({
        id: 'title',
        type: 'title',
        content: document.title,
        isFullWidth: true,
        estimatedHeight: measureContentHeight(document.title, {
          fontSize: `${WORD_CONFIG.titleSize}px`,
          fontWeight: 'bold',
          textAlign: 'center',
          lineHeight: '1.2',
          marginBottom: '16px',
        }),
      });
    }

    // Authors - full width
    if (document.authors && document.authors.length > 0) {
      const authorsContent = (
        <div style={{ display: 'table', width: '100%', textAlign: 'center' }}>
          <div style={{ display: 'table-row' }}>
            {document.authors.map((author, idx) => (
              <div key={author.id} style={{ display: 'table-cell', verticalAlign: 'top', textAlign: 'center', padding: '0 8px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{author.name}</div>
                {author.department && <div style={{ fontStyle: 'italic', marginBottom: '2px' }}>{author.department}</div>}
                {author.organization && <div style={{ fontStyle: 'italic', marginBottom: '2px' }}>{author.organization}</div>}
                {(author.city || author.state) && (
                  <div style={{ fontStyle: 'italic', marginBottom: '2px' }}>
                    {[author.city, author.state].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );

      elements.push({
        id: 'authors',
        type: 'authors',
        content: authorsContent,
        isFullWidth: true,
        estimatedHeight: 60, // Approximate authors section height
      });
    }

    // Abstract - full width
    if (document.abstract) {
      const abstractContent = (
        <>
          <span style={{ fontStyle: 'italic' }}>Abstract—</span>
          {document.abstract}
        </>
      );

      elements.push({
        id: 'abstract',
        type: 'abstract',
        content: abstractContent,
        isFullWidth: true,
        estimatedHeight: measureContentHeight(document.abstract, {
          textAlign: 'justify',
          marginBottom: '16px',
        }),
      });
    }

    // Keywords - full width
    if (document.keywords) {
      const keywordsContent = (
        <>
          <span style={{ fontStyle: 'italic' }}>Index Terms—</span>
          {document.keywords}
        </>
      );

      elements.push({
        id: 'keywords',
        type: 'keywords',
        content: keywordsContent,
        isFullWidth: true,
        estimatedHeight: measureContentHeight(document.keywords, {
          textAlign: 'justify',
          marginBottom: '16px',
        }),
        breakAfter: true, // Force column break after keywords
      });
    }

    // Sections - two-column content
    document.sections?.forEach((section, sectionIdx) => {
      // Section heading
      if (section.title) {
        elements.push({
          id: `section-${section.id}`,
          type: 'section-heading',
          content: `${sectionIdx + 1}. ${section.title.toUpperCase()}`,
          isFullWidth: false,
          estimatedHeight: measureContentHeight(section.title, {
            fontSize: `${WORD_CONFIG.bodySize}px`,
            fontWeight: 'bold',
            width: `${WORD_CONFIG.columnWidth}px`,
          }),
          breakBefore: sectionIdx === 0,
        });
      }

      // Content blocks
      section.contentBlocks?.forEach((block) => {
        if (block.type === 'text' && block.content) {
          elements.push({
            id: `block-${block.id}`,
            type: 'paragraph',
            content: block.content,
            isFullWidth: false,
            estimatedHeight: measureContentHeight(block.content, {
              textAlign: 'justify',
              textIndent: `${WORD_CONFIG.paragraphIndent}px`,
              marginBottom: '16px',
              width: `${WORD_CONFIG.columnWidth}px`,
            }),
          });
        }
      });

      // Subsections
      section.subsections?.forEach((subsection, subIdx) => {
        if (subsection.title) {
          elements.push({
            id: `subsection-${subsection.id}`,
            type: 'subsection-heading',
            content: `${sectionIdx + 1}.${subIdx + 1} ${subsection.title}`,
            isFullWidth: false,
            estimatedHeight: measureContentHeight(subsection.title, {
              fontSize: `${WORD_CONFIG.bodySize}px`,
              fontWeight: 'bold',
              width: `${WORD_CONFIG.columnWidth}px`,
            }),
            keepWithNext: true,
          });
        }

        if (subsection.content) {
          elements.push({
            id: `subsection-content-${subsection.id}`,
            type: 'paragraph',
            content: subsection.content,
            isFullWidth: false,
            estimatedHeight: measureContentHeight(subsection.content, {
              textAlign: 'justify',
              textIndent: `${WORD_CONFIG.paragraphIndent}px`,
              marginBottom: '16px',
              width: `${WORD_CONFIG.columnWidth}px`,
            }),
          });
        }
      });
    });

    // References
    if (document.references && document.references.length > 0) {
      elements.push({
        id: 'references-heading',
        type: 'reference-heading',
        content: 'REFERENCES',
        isFullWidth: false,
        estimatedHeight: measureContentHeight('REFERENCES', {
          fontSize: `${WORD_CONFIG.bodySize}px`,
          fontWeight: 'bold',
          width: `${WORD_CONFIG.columnWidth}px`,
        }),
        breakBefore: true,
      });

      document.references.forEach((ref, idx) => {
        const refContent = `[${idx + 1}] ${ref.text}`;
        elements.push({
          id: `ref-${ref.id}`,
          type: 'reference',
          content: refContent,
          isFullWidth: false,
          estimatedHeight: measureContentHeight(refContent, {
            marginLeft: `${WORD_CONFIG.hangingIndent}px`,
            textIndent: `-${WORD_CONFIG.hangingIndent}px`,
            textAlign: 'justify',
            marginBottom: '8px',
            width: `${WORD_CONFIG.columnWidth}px`,
          }),
        });
      });
    }

    return elements;
  }, [document, measureContentHeight]);

  // Paginate content with Word-accurate breaking
  const paginateContent = useCallback((elements: ContentElement[]): Page[] => {
    const pages: Page[] = [];
    let currentPage: Page = {
      elements: [],
      singleColumnElements: [],
      twoColumnElements: [],
      usedHeight: 0,
    };

    let singleColumnHeight = 0;
    let twoColumnHeight = 0;
    let inTwoColumnMode = false;

    elements.forEach((element, index) => {
      const nextElement = elements[index + 1];
      
      // Handle page breaks
      if (element.breakBefore && currentPage.elements.length > 0) {
        pages.push(currentPage);
        currentPage = {
          elements: [],
          singleColumnElements: [],
          twoColumnElements: [],
          usedHeight: 0,
        };
        singleColumnHeight = 0;
        twoColumnHeight = 0;
      }

      if (element.isFullWidth) {
        // Single column content
        if (singleColumnHeight + element.estimatedHeight > WORD_CONFIG.contentHeight && currentPage.elements.length > 0) {
          pages.push(currentPage);
          currentPage = {
            elements: [],
            singleColumnElements: [],
            twoColumnElements: [],
            usedHeight: 0,
          };
          singleColumnHeight = 0;
          twoColumnHeight = 0;
        }

        currentPage.elements.push(element);
        currentPage.singleColumnElements.push(element);
        singleColumnHeight += element.estimatedHeight;
        currentPage.usedHeight = Math.max(singleColumnHeight, twoColumnHeight);
      } else {
        // Two column content
        inTwoColumnMode = true;
        
        // Check if element fits in current column (assuming balanced columns)
        const availableHeight = WORD_CONFIG.contentHeight - singleColumnHeight;
        const columnHeight = twoColumnHeight;

        if (columnHeight + element.estimatedHeight > availableHeight && currentPage.twoColumnElements.length > 0) {
          pages.push(currentPage);
          currentPage = {
            elements: [],
            singleColumnElements: [],
            twoColumnElements: [],
            usedHeight: 0,
          };
          singleColumnHeight = 0;
          twoColumnHeight = 0;
        }

        // Handle keep-with-next
        if (element.keepWithNext && nextElement) {
          const combinedHeight = element.estimatedHeight + nextElement.estimatedHeight;
          if (twoColumnHeight + combinedHeight > availableHeight && currentPage.twoColumnElements.length > 0) {
            pages.push(currentPage);
            currentPage = {
              elements: [],
              singleColumnElements: [],
              twoColumnElements: [],
              usedHeight: 0,
            };
            singleColumnHeight = 0;
            twoColumnHeight = 0;
          }
        }

        currentPage.elements.push(element);
        currentPage.twoColumnElements.push(element);
        twoColumnHeight += element.estimatedHeight;
        currentPage.usedHeight = Math.max(singleColumnHeight, twoColumnHeight);
      }

      // Handle page breaks after element
      if (element.breakAfter) {
        pages.push(currentPage);
        currentPage = {
          elements: [],
          singleColumnElements: [],
          twoColumnElements: [],
          usedHeight: 0,
        };
        singleColumnHeight = 0;
        twoColumnHeight = 0;
        inTwoColumnMode = true; // Switch to two-column mode after keywords
      }
    });

    // Add final page if not empty
    if (currentPage.elements.length > 0) {
      pages.push(currentPage);
    }

    return pages;
  }, []);

  // Update pagination when document changes
  useEffect(() => {
    const elements = generateContentElements();
    const paginatedPages = paginateContent(elements);
    setPages(paginatedPages);
  }, [document, generateContentElements, paginateContent]);

  // Render content element
  const renderElement = (element: ContentElement): JSX.Element => {
    const baseStyle: React.CSSProperties = {
      fontFamily: WORD_CONFIG.fontFamily,
      fontSize: `${WORD_CONFIG.bodySize}px`,
      lineHeight: `${WORD_CONFIG.lineHeight}px`,
      margin: 0,
    };

    switch (element.type) {
      case 'title':
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              fontSize: `${WORD_CONFIG.titleSize}px`,
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: '16px',
              lineHeight: '1.2',
            }}
          >
            {element.content}
          </div>
        );

      case 'authors':
        return (
          <div key={element.id} style={{ ...baseStyle, marginBottom: '16px' }}>
            {element.content}
          </div>
        );

      case 'abstract':
      case 'keywords':
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              textAlign: 'justify',
              marginBottom: '16px',
            }}
          >
            {element.content}
          </div>
        );

      case 'section-heading':
      case 'reference-heading':
        return (
          <h1
            key={element.id}
            style={{
              ...baseStyle,
              fontWeight: 'bold',
              textAlign: 'left',
              marginTop: element.type === 'section-heading' ? `${WORD_CONFIG.lineHeight}px` : '0',
              marginBottom: '0',
            }}
          >
            {element.content}
          </h1>
        );

      case 'subsection-heading':
        return (
          <h2
            key={element.id}
            style={{
              ...baseStyle,
              fontWeight: 'bold',
              textAlign: 'left',
              marginTop: `${WORD_CONFIG.lineHeight}px`,
              marginBottom: '0',
            }}
          >
            {element.content}
          </h2>
        );

      case 'paragraph':
        return (
          <p
            key={element.id}
            style={{
              ...baseStyle,
              textAlign: 'justify',
              textIndent: `${WORD_CONFIG.paragraphIndent}px`,
              marginBottom: '16px',
            }}
          >
            {element.content}
          </p>
        );

      case 'reference':
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              marginLeft: `${WORD_CONFIG.hangingIndent}px`,
              textIndent: `-${WORD_CONFIG.hangingIndent}px`,
              textAlign: 'justify',
              marginBottom: '8px',
            }}
          >
            {element.content}
          </div>
        );

      default:
        return <div key={element.id}>{element.content}</div>;
    }
  };

  return (
    <div className="word-accurate-preview">
      {/* Hidden measurement container */}
      <div
        ref={measureRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          width: `${WORD_CONFIG.contentWidth}px`,
          fontFamily: WORD_CONFIG.fontFamily,
          fontSize: `${WORD_CONFIG.bodySize}px`,
          lineHeight: `${WORD_CONFIG.lineHeight}px`,
        }}
      />

      {/* Paginated content */}
      <div className="pages-container">
        {pages.map((page, pageIndex) => (
          <div
            key={pageIndex}
            className="page"
            style={{
              width: `${WORD_CONFIG.pageWidth}px`,
              height: `${WORD_CONFIG.pageHeight}px`,
              backgroundColor: 'white',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              marginBottom: '20px',
              overflow: 'hidden',
              position: 'relative',
              pageBreakAfter: 'always',
            }}
          >
            <div
              className="page-content"
              style={{
                padding: `${WORD_CONFIG.marginTop}px ${WORD_CONFIG.marginRight}px ${WORD_CONFIG.marginBottom}px ${WORD_CONFIG.marginLeft}px`,
                height: '100%',
                boxSizing: 'border-box',
              }}
            >
              {/* Single column content */}
              <div className="single-column-section">
                {page.singleColumnElements.map(renderElement)}
              </div>

              {/* Two column content */}
              {page.twoColumnElements.length > 0 && (
                <div
                  className="two-column-section"
                  style={{
                    columnCount: 2,
                    columnWidth: `${WORD_CONFIG.columnWidth}px`,
                    columnGap: `${WORD_CONFIG.columnGap}px`,
                    columnFill: 'auto',
                    textAlign: 'justify',
                  }}
                >
                  {page.twoColumnElements.map(renderElement)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Print styles for exact PDF matching */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0 !important;
            padding: 0 !important;
          }

          .word-accurate-preview {
            margin: 0 !important;
            padding: 0 !important;
          }

          .pages-container {
            margin: 0 !important;
            padding: 0 !important;
          }

          .page {
            page-break-after: always !important;
            box-shadow: none !important;
            margin: 0 !important;
            width: 8.5in !important;
            height: 11in !important;
            overflow: visible !important;
          }

          .page:last-child {
            page-break-after: avoid !important;
          }
        }

        @page {
          size: 8.5in 11in;
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default WordAccuratePreview;