import React from 'react';
import type { Document } from '@shared/schema';

interface SimplePaginatedPreviewProps {
  document: Document;
}

const SimplePaginatedPreview: React.FC<SimplePaginatedPreviewProps> = ({ document }) => {
  // CSS-based pagination using exact Word measurements
  const pageStyle: React.CSSProperties = {
    width: '8.5in',
    height: '11in',
    padding: '0.75in',
    backgroundColor: 'white',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    marginBottom: '20px',
    fontFamily: '"Times New Roman", Times, serif',
    fontSize: '12.67px', // 9.5pt
    lineHeight: '13.33px', // Exact 10pt
    overflow: 'hidden',
    pageBreakAfter: 'always',
    position: 'relative',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '32px', // 24pt
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '16px',
    lineHeight: '1.2',
  };

  const singleColumnStyle: React.CSSProperties = {
    textAlign: 'justify',
    marginBottom: '16px',
  };

  const twoColumnStyle: React.CSSProperties = {
    columnCount: 2,
    columnWidth: '3.375in',
    columnGap: '0.25in',
    columnFill: 'auto',
    textAlign: 'justify',
  };

  const sectionHeadingStyle: React.CSSProperties = {
    fontWeight: 'bold',
    textAlign: 'left',
    margin: '0',
    marginTop: '13.33px',
    marginBottom: '0',
    textTransform: 'uppercase',
    breakInside: 'avoid',
  };

  const paragraphStyle: React.CSSProperties = {
    margin: '0',
    marginBottom: '16px',
    textIndent: '0.2in',
    textAlign: 'justify',
    breakInside: 'avoid',
  };

  const referenceStyle: React.CSSProperties = {
    marginLeft: '0.25in',
    textIndent: '-0.25in',
    marginBottom: '8px',
    textAlign: 'justify',
    breakInside: 'avoid',
  };

  return (
    <div className="simple-paginated-preview">
      <div style={pageStyle}>
        {/* Single-column header content */}
        <div className="single-column-content">
          {/* Title */}
          {document.title && (
            <div style={titleStyle}>
              {document.title}
            </div>
          )}

          {/* Authors */}
          {document.authors && document.authors.length > 0 && (
            <div style={{ ...singleColumnStyle, display: 'table', width: '100%', textAlign: 'center' }}>
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
                    {author.customFields?.map((field, fieldIdx) => (
                      field.value && (
                        <div key={fieldIdx} style={{ fontStyle: 'italic', marginBottom: '2px' }}>
                          {field.value}
                        </div>
                      )
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Abstract */}
          {document.abstract && (
            <div style={singleColumnStyle}>
              <span style={{ fontStyle: 'italic' }}>Abstract—</span>
              {document.abstract}
            </div>
          )}

          {/* Keywords */}
          {document.keywords && (
            <div style={singleColumnStyle}>
              <span style={{ fontStyle: 'italic' }}>Index Terms—</span>
              {document.keywords}
            </div>
          )}
        </div>

        {/* Two-column content */}
        <div style={twoColumnStyle}>
          {/* Sections */}
          {document.sections?.map((section, sectionIdx) => (
            <div key={section.id} style={{ breakInside: 'avoid-column' }}>
              {/* Section heading */}
              {section.title && (
                <h1 style={sectionHeadingStyle}>
                  {sectionIdx + 1}. {section.title.toUpperCase()}
                </h1>
              )}

              {/* Content blocks */}
              {section.contentBlocks?.map((block) => {
                if (block.type === 'text' && block.content) {
                  return (
                    <p key={block.id} style={paragraphStyle}>
                      {block.content}
                    </p>
                  );
                }
                return null;
              })}

              {/* Subsections */}
              {section.subsections?.map((subsection, subIdx) => (
                <div key={subsection.id}>
                  {subsection.title && (
                    <h2
                      style={{
                        ...sectionHeadingStyle,
                        textTransform: 'none',
                      }}
                    >
                      {sectionIdx + 1}.{subIdx + 1} {subsection.title}
                    </h2>
                  )}
                  {subsection.content && (
                    <p style={paragraphStyle}>
                      {subsection.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* References */}
          {document.references && document.references.length > 0 && (
            <div style={{ breakInside: 'avoid-column' }}>
              <h1 style={sectionHeadingStyle}>
                REFERENCES
              </h1>
              {document.references.map((ref, idx) => (
                <div key={ref.id} style={referenceStyle}>
                  [{idx + 1}] {ref.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CSS for print media */}
      <style>{`
        @media print {
          .simple-paginated-preview {
            margin: 0 !important;
            padding: 0 !important;
          }

          .simple-paginated-preview > div {
            page-break-after: always !important;
            box-shadow: none !important;
            margin: 0 !important;
            width: 8.5in !important;
            height: 11in !important;
            overflow: visible !important;
          }

          body {
            margin: 0 !important;
            padding: 0 !important;
          }
        }

        @page {
          size: 8.5in 11in;
          margin: 0;
        }

        /* Force text justification without word stretching */
        .simple-paginated-preview p,
        .simple-paginated-preview div[style*="text-align: justify"] {
          text-align: justify;
          hyphens: auto;
          word-break: normal;
          letter-spacing: normal;
          word-spacing: normal;
        }

        /* Prevent column breaks in inappropriate places */
        .simple-paginated-preview h1,
        .simple-paginated-preview h2 {
          break-after: avoid-column;
          break-inside: avoid;
        }

        .simple-paginated-preview p {
          break-inside: avoid;
          orphans: 2;
          widows: 2;
        }
      `}</style>
    </div>
  );
};

export default SimplePaginatedPreview;