import React, { useEffect, useRef, useState } from 'react';
import type { Document } from '@shared/schema';

interface PaginatedIEEEPreviewProps {
  document: Document;
}

// Page constants matching Word exactly
const PAGE_CONFIG = {
  // Physical page size (8.5 x 11 inches)
  pageWidthInches: 8.5,
  pageHeightInches: 11,
  
  // Margins (0.75 inches)
  marginInches: 0.75,
  
  // Convert to pixels at 96 DPI (standard web DPI)
  dpiScale: 96,
  
  get pageWidthPx() { return this.pageWidthInches * this.dpiScale; },
  get pageHeightPx() { return this.pageHeightInches * this.dpiScale; },
  get marginPx() { return this.marginInches * this.dpiScale; },
  get contentWidthPx() { return this.pageWidthPx - (this.marginPx * 2); },
  get contentHeightPx() { return this.pageHeightPx - (this.marginPx * 2); },
  
  // Typography (matching backend exactly)
  fontFamily: '"Times New Roman", Times, serif',
  titleFontSize: '32px', // 24pt
  bodyFontSize: '12.67px', // 9.5pt
  captionFontSize: '12px', // 9pt
  lineHeight: '13.33px', // Exact 10pt
  
  // Column layout
  columnWidth: '243px', // 3.375 inches
  columnGap: '18px', // 0.25 inch
  paragraphIndent: '14.4px', // 0.2 inch
};

interface PageContent {
  elements: JSX.Element[];
  overflowHeight: number;
}

const PaginatedIEEEPreview: React.FC<PaginatedIEEEPreviewProps> = ({ document }) => {
  const [pages, setPages] = useState<PageContent[]>([]);
  const measureRef = useRef<HTMLDivElement>(null);

  // Function to measure content height
  const measureElementHeight = (element: JSX.Element): number => {
    if (!measureRef.current) return 0;
    
    const tempDiv = window.document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.width = `${PAGE_CONFIG.contentWidthPx}px`;
    tempDiv.style.fontFamily = PAGE_CONFIG.fontFamily;
    tempDiv.style.fontSize = PAGE_CONFIG.bodyFontSize;
    tempDiv.style.lineHeight = PAGE_CONFIG.lineHeight;
    
    window.document.body.appendChild(tempDiv);
    
    // Render element to temp div and measure
    const React = require('react');
    const ReactDOM = require('react-dom');
    ReactDOM.render(element, tempDiv);
    
    const height = tempDiv.offsetHeight;
    window.document.body.removeChild(tempDiv);
    
    return height;
  };

  // Generate all document elements
  const generateDocumentElements = (): JSX.Element[] => {
    const elements: JSX.Element[] = [];

    // Title (single column, full width)
    if (document.title) {
      elements.push(
        <div
          key="title"
          className="page-element"
          style={{
            fontSize: PAGE_CONFIG.titleFontSize,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '16px',
            lineHeight: '1.2',
            columnSpan: 'all',
          }}
        >
          {document.title}
        </div>
      );
    }

    // Authors (single column, full width)
    if (document.authors && document.authors.length > 0) {
      elements.push(
        <div
          key="authors"
          className="page-element"
          style={{
            display: 'table',
            width: '100%',
            marginBottom: '16px',
            textAlign: 'center',
            columnSpan: 'all',
          }}
        >
          <div style={{ display: 'table-row' }}>
            {document.authors.map((author, idx) => (
              <div
                key={author.id}
                style={{
                  display: 'table-cell',
                  verticalAlign: 'top',
                  textAlign: 'center',
                  padding: '0 8px',
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                  {author.name}
                </div>
                {author.department && (
                  <div style={{ fontStyle: 'italic', marginBottom: '2px' }}>
                    {author.department}
                  </div>
                )}
                {author.organization && (
                  <div style={{ fontStyle: 'italic', marginBottom: '2px' }}>
                    {author.organization}
                  </div>
                )}
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
    }

    // Abstract (single column, full width)
    if (document.abstract) {
      elements.push(
        <div
          key="abstract"
          className="page-element"
          style={{
            marginBottom: '16px',
            textAlign: 'justify',
            columnSpan: 'all',
          }}
        >
          <span style={{ fontStyle: 'italic' }}>Abstract—</span>
          {document.abstract}
        </div>
      );
    }

    // Keywords (single column, full width)
    if (document.keywords) {
      elements.push(
        <div
          key="keywords"
          className="page-element"
          style={{
            marginBottom: '16px',
            textAlign: 'justify',
            columnSpan: 'all',
          }}
        >
          <span style={{ fontStyle: 'italic' }}>Index Terms—</span>
          {document.keywords}
        </div>
      );
    }

    // Column break marker for two-column content
    elements.push(
      <div key="column-break" className="column-break-marker" style={{ display: 'none' }}>
        COLUMN_BREAK
      </div>
    );

    // Sections (two-column content)
    document.sections?.forEach((section, sectionIdx) => {
      // Section heading
      if (section.title) {
        elements.push(
          <h1
            key={`section-${section.id}`}
            className="page-element"
            style={{
              fontSize: PAGE_CONFIG.bodyFontSize,
              fontWeight: 'bold',
              textAlign: 'left',
              margin: '0',
              marginTop: sectionIdx === 0 ? '0' : PAGE_CONFIG.lineHeight,
              marginBottom: '0',
              textTransform: 'uppercase',
              lineHeight: PAGE_CONFIG.lineHeight,
              breakInside: 'avoid',
            }}
          >
            {sectionIdx + 1}. {section.title}
          </h1>
        );
      }

      // Content blocks
      section.contentBlocks?.forEach((block, blockIdx) => {
        if (block.type === 'text' && block.content) {
          elements.push(
            <p
              key={`block-${block.id}`}
              className="page-element"
              style={{
                margin: '0',
                marginBottom: '16px',
                textIndent: PAGE_CONFIG.paragraphIndent,
                textAlign: 'justify',
                lineHeight: PAGE_CONFIG.lineHeight,
                breakInside: 'avoid',
              }}
            >
              {block.content}
            </p>
          );
        }
      });

      // Subsections
      section.subsections?.forEach((subsection, subIdx) => {
        if (subsection.title) {
          elements.push(
            <h2
              key={`subsection-${subsection.id}`}
              className="page-element"
              style={{
                fontSize: PAGE_CONFIG.bodyFontSize,
                fontWeight: 'bold',
                textAlign: 'left',
                margin: '0',
                marginTop: PAGE_CONFIG.lineHeight,
                marginBottom: '0',
                lineHeight: PAGE_CONFIG.lineHeight,
                breakInside: 'avoid',
              }}
            >
              {sectionIdx + 1}.{subIdx + 1} {subsection.title}
            </h2>
          );
        }

        if (subsection.content) {
          elements.push(
            <p
              key={`subsection-content-${subsection.id}`}
              className="page-element"
              style={{
                margin: '0',
                marginBottom: '16px',
                textIndent: PAGE_CONFIG.paragraphIndent,
                textAlign: 'justify',
                lineHeight: PAGE_CONFIG.lineHeight,
                breakInside: 'avoid',
              }}
            >
              {subsection.content}
            </p>
          );
        }
      });
    });

    // References
    if (document.references && document.references.length > 0) {
      elements.push(
        <h1
          key="references-heading"
          className="page-element"
          style={{
            fontSize: PAGE_CONFIG.bodyFontSize,
            fontWeight: 'bold',
            textAlign: 'left',
            margin: '0',
            marginTop: PAGE_CONFIG.lineHeight,
            marginBottom: '0',
            lineHeight: PAGE_CONFIG.lineHeight,
            textTransform: 'uppercase',
            breakInside: 'avoid',
          }}
        >
          REFERENCES
        </h1>
      );

      document.references.forEach((ref, idx) => {
        elements.push(
          <div
            key={`ref-${ref.id}`}
            className="page-element"
            style={{
              marginLeft: '18px',
              textIndent: '-18px',
              marginBottom: '8px',
              textAlign: 'justify',
              lineHeight: PAGE_CONFIG.lineHeight,
              breakInside: 'avoid',
            }}
          >
            [{idx + 1}] {ref.text}
          </div>
        );
      });
    }

    return elements;
  };

  // Paginate content based on height constraints
  useEffect(() => {
    const elements = generateDocumentElements();
    const newPages: PageContent[] = [];
    let currentPage: PageContent = { elements: [], overflowHeight: 0 };
    let currentHeight = 0;
    let inTwoColumnMode = false;

    elements.forEach((element, index) => {
      // Check for column break marker
      if (element.key === 'column-break') {
        inTwoColumnMode = true;
        return;
      }

      // Estimate element height (simplified for now)
      const elementHeight = estimateElementHeight(element);
      
      // Check if element fits on current page
      if (currentHeight + elementHeight > PAGE_CONFIG.contentHeightPx && currentPage.elements.length > 0) {
        // Start new page
        newPages.push(currentPage);
        currentPage = { elements: [], overflowHeight: 0 };
        currentHeight = 0;
      }

      currentPage.elements.push(element);
      currentHeight += elementHeight;
    });

    // Add last page if not empty
    if (currentPage.elements.length > 0) {
      newPages.push(currentPage);
    }

    setPages(newPages);
  }, [document]);

  // Simplified height estimation
  const estimateElementHeight = (element: JSX.Element): number => {
    const style = element.props.style || {};
    
    if (element.key?.toString().includes('title')) {
      return 48; // Approximate title height
    } else if (element.key?.toString().includes('section') || element.key?.toString().includes('subsection')) {
      return 16; // Heading height
    } else if (element.key?.toString().includes('abstract') || element.key?.toString().includes('keywords')) {
      return 32; // Single column content
    } else {
      return 28; // Regular paragraph
    }
  };

  return (
    <div className="paginated-preview">
      {/* Measurement container (hidden) */}
      <div
        ref={measureRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          width: `${PAGE_CONFIG.contentWidthPx}px`,
          fontFamily: PAGE_CONFIG.fontFamily,
          fontSize: PAGE_CONFIG.bodyFontSize,
          lineHeight: PAGE_CONFIG.lineHeight,
        }}
      />

      {/* Rendered pages */}
      <div className="pages-container">
        {pages.map((page, pageIndex) => (
          <div
            key={pageIndex}
            className="page"
            style={{
              width: `${PAGE_CONFIG.pageWidthPx}px`,
              height: `${PAGE_CONFIG.pageHeightPx}px`,
              padding: `${PAGE_CONFIG.marginPx}px`,
              backgroundColor: 'white',
              boxShadow: '0 0 10px rgba(0,0,0,0.1)',
              marginBottom: '20px',
              fontFamily: PAGE_CONFIG.fontFamily,
              fontSize: PAGE_CONFIG.bodyFontSize,
              lineHeight: PAGE_CONFIG.lineHeight,
              overflow: 'hidden',
              pageBreakAfter: 'always',
              position: 'relative',
            }}
          >
            {/* Single column content for first elements */}
            <div className="single-column-content">
              {page.elements
                .filter(el => el.props.style?.columnSpan === 'all')
                .map((element, idx) => (
                  <div key={idx}>{element}</div>
                ))}
            </div>

            {/* Two-column content */}
            <div
              className="two-column-content"
              style={{
                columnCount: 2,
                columnWidth: PAGE_CONFIG.columnWidth,
                columnGap: PAGE_CONFIG.columnGap,
                columnFill: 'auto',
                textAlign: 'justify',
              }}
            >
              {page.elements
                .filter(el => el.props.style?.columnSpan !== 'all')
                .map((element, idx) => (
                  <div key={idx}>{element}</div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Print styles */}
      <style jsx>{`
        @media print {
          .paginated-preview {
            margin: 0;
            padding: 0;
          }

          .page {
            page-break-after: always;
            box-shadow: none !important;
            margin: 0 !important;
            width: 8.5in !important;
            height: 11in !important;
          }

          .pages-container {
            margin: 0;
            padding: 0;
          }

          body {
            margin: 0;
            padding: 0;
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

export default PaginatedIEEEPreview;