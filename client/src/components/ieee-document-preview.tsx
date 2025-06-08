import React from 'react';
import type { Document } from '@shared/schema';

interface IEEEDocumentPreviewProps {
  document: Document;
}

// IEEE formatting constants - matching python-docx backend exactly
const IEEE_STYLES = {
  // Page dimensions (8.5 x 11 inches)
  pageWidth: '8.5in',
  pageHeight: '11in',
  
  // Margins (0.75 inches = 72px at 96 DPI)
  marginTop: '72px',
  marginBottom: '72px', 
  marginLeft: '72px',
  marginRight: '72px',
  
  // Typography
  fontFamily: '"Times New Roman", Times, serif',
  titleFontSize: '32px', // 24pt = 32px
  bodyFontSize: '12.67px', // 9.5pt ≈ 12.67px
  captionFontSize: '12px', // 9pt = 12px
  lineHeight: '13.33px', // Exact 10pt = 13.33px
  
  // Layout
  columnWidth: '243px', // 3.375 inches ≈ 243px
  columnGap: '18px', // 0.25 inch = 18px
  paragraphIndent: '14.4px', // 0.2 inch ≈ 14.4px
  referencesIndent: '18px', // 0.25 inch = 18px
};

const IEEEDocumentPreview: React.FC<IEEEDocumentPreviewProps> = ({ document }) => {
  return (
    <div 
      className="ieee-document-preview"
      style={{
        width: IEEE_STYLES.pageWidth,
        minHeight: IEEE_STYLES.pageHeight,
        margin: '0 auto',
        padding: `${IEEE_STYLES.marginTop} ${IEEE_STYLES.marginRight} ${IEEE_STYLES.marginBottom} ${IEEE_STYLES.marginLeft}`,
        fontFamily: IEEE_STYLES.fontFamily,
        fontSize: IEEE_STYLES.bodyFontSize,
        lineHeight: IEEE_STYLES.lineHeight,
        backgroundColor: 'white',
        boxShadow: '0 0 10px rgba(0,0,0,0.1)',
        textAlign: 'justify' as const,
        hyphens: 'auto',
        wordBreak: 'normal',
        // Disable text expansion to match Word behavior
        letterSpacing: 'normal',
        wordSpacing: 'normal',
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: IEEE_STYLES.titleFontSize,
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: '16px', // 12pt ≈ 16px
          marginTop: '0',
          lineHeight: '1.2',
        }}
      >
        {document.title}
      </div>

      {/* Authors */}
      {document.authors && document.authors.length > 0 && (
        <div
          style={{
            display: 'table',
            width: '100%',
            marginBottom: '16px',
            textAlign: 'center',
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
                <div
                  style={{
                    fontWeight: 'bold',
                    marginBottom: '2px',
                  }}
                >
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

      {/* Abstract - Single Column */}
      {document.abstract && (
        <div
          style={{
            marginBottom: '16px',
            textAlign: 'justify',
            textIndent: '0',
          }}
        >
          <span style={{ fontStyle: 'italic' }}>Abstract—</span>
          {document.abstract}
        </div>
      )}

      {/* Keywords - Single Column */}
      {document.keywords && (
        <div
          style={{
            marginBottom: '16px',
            textAlign: 'justify',
            textIndent: '0',
          }}
        >
          <span style={{ fontStyle: 'italic' }}>Index Terms—</span>
          {document.keywords}
        </div>
      )}

      {/* Two-Column Content */}
      <div
        style={{
          columnCount: 2,
          columnWidth: IEEE_STYLES.columnWidth,
          columnGap: IEEE_STYLES.columnGap,
          columnFill: 'auto',
          textAlign: 'justify',
        }}
      >
        {/* Sections */}
        {document.sections?.map((section, sectionIdx) => (
          <div key={section.id} style={{ breakInside: 'avoid-column' }}>
            {/* Section Heading */}
            {section.title && (
              <h1
                style={{
                  fontSize: IEEE_STYLES.bodyFontSize,
                  fontWeight: 'bold',
                  textAlign: 'left',
                  margin: '0',
                  marginTop: sectionIdx === 0 ? '0' : IEEE_STYLES.lineHeight,
                  marginBottom: '0',
                  textTransform: 'uppercase',
                  lineHeight: IEEE_STYLES.lineHeight,
                }}
              >
                {sectionIdx + 1}. {section.title}
              </h1>
            )}

            {/* Content Blocks */}
            {section.contentBlocks?.map((block, blockIdx) => {
              if (block.type === 'text' && block.content) {
                return (
                  <p
                    key={block.id}
                    style={{
                      margin: '0',
                      marginBottom: '16px',
                      textIndent: IEEE_STYLES.paragraphIndent,
                      textAlign: 'justify',
                      lineHeight: IEEE_STYLES.lineHeight,
                    }}
                  >
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
                      fontSize: IEEE_STYLES.bodyFontSize,
                      fontWeight: 'bold',
                      textAlign: 'left',
                      margin: '0',
                      marginTop: IEEE_STYLES.lineHeight,
                      marginBottom: '0',
                      lineHeight: IEEE_STYLES.lineHeight,
                    }}
                  >
                    {sectionIdx + 1}.{subIdx + 1} {subsection.title}
                  </h2>
                )}
                {subsection.content && (
                  <p
                    style={{
                      margin: '0',
                      marginBottom: '16px',
                      textIndent: IEEE_STYLES.paragraphIndent,
                      textAlign: 'justify',
                      lineHeight: IEEE_STYLES.lineHeight,
                    }}
                  >
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
            <h1
              style={{
                fontSize: IEEE_STYLES.bodyFontSize,
                fontWeight: 'bold',
                textAlign: 'left',
                margin: '0',
                marginTop: IEEE_STYLES.lineHeight,
                marginBottom: '0',
                lineHeight: IEEE_STYLES.lineHeight,
                textTransform: 'uppercase',
              }}
            >
              REFERENCES
            </h1>
            {document.references.map((ref, idx) => (
              <div
                key={ref.id}
                style={{
                  marginLeft: IEEE_STYLES.referencesIndent,
                  textIndent: `-${IEEE_STYLES.referencesIndent}`,
                  marginBottom: '8px',
                  textAlign: 'justify',
                  lineHeight: IEEE_STYLES.lineHeight,
                }}
              >
                [{idx + 1}] {ref.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default IEEEDocumentPreview;