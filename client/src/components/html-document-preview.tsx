import React from "react";
import type { Document } from "@shared/schema";

interface HtmlDocumentPreviewProps {
  document: Document;
  zoom: number;
}

export default function HtmlDocumentPreview({ document, zoom }: HtmlDocumentPreviewProps) {
  const formatAuthors = (authors: any[]) => {
    if (!authors || authors.length === 0) return "";
    
    return authors
      .filter(author => author.name && author.name.trim())
      .map(author => {
        let formatted = author.name;
        if (author.affiliation) {
          formatted += `¹`;
        }
        return formatted;
      })
      .join(", ");
  };

  const formatAffiliations = (authors: any[]) => {
    if (!authors || authors.length === 0) return [];
    
    const affiliations = authors
      .filter(author => author.affiliation && author.affiliation.trim())
      .map(author => author.affiliation);
    
    return [...new Set(affiliations)]; // Remove duplicates
  };

  const formatReferences = (references: any[]) => {
    if (!references || references.length === 0) return [];
    
    return references.map((ref, index) => {
      let citation = `[${index + 1}] `;
      
      if (ref.authors) citation += `${ref.authors}, `;
      if (ref.title) citation += `"${ref.title}," `;
      if (ref.journal) citation += `${ref.journal}, `;
      if (ref.volume) citation += `vol. ${ref.volume}, `;
      if (ref.issue) citation += `no. ${ref.issue}, `;
      if (ref.pages) citation += `pp. ${ref.pages}, `;
      if (ref.year) citation += `${ref.year}`;
      if (ref.doi) citation += `, doi: ${ref.doi}`;
      
      return citation.replace(/,\s*$/, '.'); // Remove trailing comma and add period
    });
  };

  return (
    <div 
      className="bg-white shadow-lg mx-auto p-8 font-serif"
      style={{ 
        transform: `scale(${zoom / 100})`,
        transformOrigin: 'top center',
        width: '210mm',
        minHeight: '297mm',
        fontSize: '9.5pt',
        lineHeight: '1.2',
        fontFamily: 'Times, "Times New Roman", serif'
      }}
    >
      {/* IEEE Paper Title */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold mb-4 leading-tight">
          {document.title || "IEEE Paper Title"}
        </h1>
        
        {/* Authors */}
        <div className="text-sm mb-2">
          {formatAuthors(document.authors || [])}
        </div>
        
        {/* Affiliations */}
        {formatAffiliations(document.authors || []).map((affiliation, index) => (
          <div key={index} className="text-xs text-gray-600 mb-1">
            ¹{affiliation}
          </div>
        ))}
      </div>

      {/* Abstract */}
      {document.abstract && (
        <div className="mb-6">
          <div className="text-center">
            <div className="inline-block text-left max-w-4xl">
              <p className="font-bold text-sm mb-2">Abstract—</p>
              <p className="text-sm text-justify leading-relaxed">
                {document.abstract}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Keywords */}
      {document.keywords && (
        <div className="mb-6 text-center">
          <div className="inline-block text-left max-w-4xl">
            <p className="text-sm">
              <span className="font-bold italic">Keywords—</span>
              {document.keywords}
            </p>
          </div>
        </div>
      )}

      {/* Two-column layout for main content */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-4">
          {/* Introduction Section */}
          {(!document.sections || document.sections.length === 0) && (
            <div>
              <h2 className="font-bold text-center mb-2">I. INTRODUCTION</h2>
              <p className="text-justify leading-relaxed">
                This IEEE-formatted document demonstrates proper academic paper structure with standard formatting conventions used in IEEE publications. Add sections to your document to see them appear in this preview.
              </p>
            </div>
          )}

          {/* Document Sections - Left Column */}
          {document.sections?.slice(0, Math.ceil((document.sections?.length || 0) / 2)).map((section, index) => (
            <div key={index}>
              <h2 className="font-bold text-center mb-2">
                {String.fromCharCode(65 + index + 1)}. {section.title?.toUpperCase() || `SECTION ${index + 2}`}
              </h2>
              <div className="text-justify leading-relaxed space-y-2">
                {section.contentBlocks?.filter(block => block.type === 'text' && block.content).map((block, bIndex) => (
                  <div key={bIndex}>
                    {block.content?.split('\n').map((paragraph, pIndex) => (
                      paragraph.trim() && (
                        <p key={pIndex}>{paragraph.trim()}</p>
                      )
                    ))}
                  </div>
                ))}
                {section.subsections?.map((subsection, sIndex) => (
                  <div key={sIndex} className="mt-3">
                    <h3 className="font-semibold mb-1">{subsection.title}</h3>
                    {subsection.content?.split('\n').map((paragraph, pIndex) => (
                      paragraph.trim() && (
                        <p key={pIndex}>{paragraph.trim()}</p>
                      )
                    ))}
                  </div>
                ))}
                {(!section.contentBlocks || section.contentBlocks.length === 0) && 
                 (!section.subsections || section.subsections.length === 0) && (
                  <p className="text-gray-500 italic">Add content to this section to see it in the preview.</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {/* Document Sections - Right Column */}
          {document.sections?.slice(Math.ceil((document.sections?.length || 0) / 2)).map((section, index) => (
            <div key={index}>
              <h2 className="font-bold text-center mb-2">
                {String.fromCharCode(65 + Math.ceil((document.sections?.length || 0) / 2) + index + 1)}. {section.title?.toUpperCase() || `SECTION ${Math.ceil((document.sections?.length || 0) / 2) + index + 2}`}
              </h2>
              <div className="text-justify leading-relaxed space-y-2">
                {section.contentBlocks?.filter(block => block.type === 'text' && block.content).map((block, bIndex) => (
                  <div key={bIndex}>
                    {block.content?.split('\n').map((paragraph, pIndex) => (
                      paragraph.trim() && (
                        <p key={pIndex}>{paragraph.trim()}</p>
                      )
                    ))}
                  </div>
                ))}
                {section.subsections?.map((subsection, sIndex) => (
                  <div key={sIndex} className="mt-3">
                    <h3 className="font-semibold mb-1">{subsection.title}</h3>
                    {subsection.content?.split('\n').map((paragraph, pIndex) => (
                      paragraph.trim() && (
                        <p key={pIndex}>{paragraph.trim()}</p>
                      )
                    ))}
                  </div>
                ))}
                {(!section.contentBlocks || section.contentBlocks.length === 0) && 
                 (!section.subsections || section.subsections.length === 0) && (
                  <p className="text-gray-500 italic">Add content to this section to see it in the preview.</p>
                )}
              </div>
            </div>
          ))}

          {/* Conclusion */}
          {(!document.sections || document.sections.length === 0) && (
            <div>
              <h2 className="font-bold text-center mb-2">
                II. CONCLUSION
              </h2>
              <p className="text-justify leading-relaxed">
                This document demonstrates the IEEE formatting standards and provides a template for academic paper submission.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* References */}
      {document.references && document.references.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-300">
          <h2 className="font-bold text-center mb-4">REFERENCES</h2>
          <div className="text-xs space-y-1">
            {formatReferences(document.references).map((reference, index) => (
              <p key={index} className="text-justify leading-relaxed">
                {reference}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* IEEE Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>IEEE Format Preview</span>
          <span>Generated by Format-A</span>
        </div>
      </div>
    </div>
  );
}
