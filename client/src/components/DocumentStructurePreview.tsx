import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Users, Hash, BookOpen, Image, Table, Calculator } from "lucide-react";
import type { Document } from "@shared/schema";

interface DocumentStructurePreviewProps {
  document: Document;
  className?: string;
}

/**
 * DocumentStructurePreview Component - Vercel Fallback Preview
 * 
 * Provides a comprehensive HTML-based preview showing document outline, sections,
 * and content as a fallback when PDF generation is unavailable (e.g., on Vercel
 * deployments due to serverless limitations).
 * 
 * Key Features:
 * - Complete document structure visualization without requiring PDF generation
 * - IEEE-style formatting preview that matches the final document appearance
 * - Responsive design that works across all deployment environments
 * - Comprehensive content display including sections, references, and metadata
 * - Fallback information display to explain why this preview is being used
 * 
 * Vercel-Specific Benefits:
 * - No server-side dependencies required (pure React component)
 * - Works reliably in serverless environments
 * - Provides meaningful preview when PDF generation fails
 * - Maintains user experience consistency across deployment platforms
 * 
 * This component is automatically used by DocumentPreview when:
 * - Running on Vercel deployment (detected via environment detection)
 * - PDF generation fails due to serverless limitations
 * - User explicitly switches to structure preview mode
 * 
 * @param document - Document data to preview
 * @param className - Optional CSS classes for styling customization
 */
export default function DocumentStructurePreview({ document, className = "" }: DocumentStructurePreviewProps) {
  /**
   * Helper function to render section content with proper formatting
   * 
   * Processes text content to create properly formatted paragraphs that
   * maintain readability in the fallback preview. This ensures that the
   * structure preview provides a meaningful representation of the document
   * content when PDF generation is unavailable on Vercel.
   * 
   * @param content - Raw text content to format
   * @returns Array of formatted paragraph elements or null if no content
   */
  const renderSectionContent = (content: string) => {
    if (!content) return null;
    
    // Split content into paragraphs and render with proper spacing
    // This maintains document structure in the HTML fallback preview
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    
    return paragraphs.map((paragraph, index) => (
      <p key={index} className="mb-3 text-gray-700 leading-relaxed text-justify">
        {paragraph.trim()}
      </p>
    ));
  };

  /**
   * Helper function to render references in IEEE format
   * 
   * Displays document references in a numbered format that matches
   * IEEE standards. This provides users with a complete view of their
   * citations even when PDF preview is unavailable on Vercel deployments.
   * 
   * @returns Formatted references list or null if no references
   */
  const renderReferences = () => {
    if (!document.references || document.references.length === 0) return null;
    
    return (
      <div className="space-y-2">
        {document.references.map((ref, index) => (
          <div key={index} className="text-sm text-gray-700 leading-relaxed">
            <span className="font-medium">[{index + 1}]</span> {ref}
          </div>
        ))}
      </div>
    );
  };

  /**
   * Helper function to render authors with affiliations
   * 
   * Displays document authors in a format that matches IEEE paper standards.
   * This ensures that author information is clearly visible in the fallback
   * preview when PDF generation is not available on Vercel.
   * 
   * @returns Formatted authors list or null if no authors
   */
  const renderAuthors = () => {
    if (!document.authors || document.authors.length === 0) return null;
    
    return document.authors
      .filter(author => author.name) // Only show authors with names
      .map((author, index, filteredAuthors) => (
        <span key={index}>
          <span className="font-medium">{author.name}</span>
          {/* Note: affiliation property may not exist in current schema */}
          {(author as any).affiliation && (
            <span className="text-sm text-gray-600">
              {" "}({(author as any).affiliation})
            </span>
          )}
          {index < filteredAuthors.length - 1 && ", "}
        </span>
      ));
  };

  return (
    <div className={`bg-white shadow-sm border border-gray-200 ${className}`}>
      {/* Header with document info - Vercel fallback indicator */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">Document Structure Preview</span>
        </div>
        {/* Informational message explaining why this fallback is being used */}
        <p className="text-xs text-blue-600">
          This preview shows your document structure and content. PDF preview is not available on this deployment.
        </p>
      </div>

      {/* Document content */}
      <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
        {/* Title */}
        {document.title && (
          <div className="text-center border-b border-gray-200 pb-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">
              {document.title}
            </h1>
            
            {/* Authors */}
            {document.authors && document.authors.some(author => author.name) && (
              <div className="flex items-center justify-center gap-2 text-gray-700 mb-2">
                <Users className="w-4 h-4 text-gray-500" />
                <div className="text-center">
                  {renderAuthors()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Abstract */}
        {document.abstract && (
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Abstract</h2>
              </div>
              <div className="text-gray-700 leading-relaxed text-justify">
                {renderSectionContent(document.abstract)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Keywords */}
        {document.keywords && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Hash className="w-4 h-4 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Keywords</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {document.keywords.split(',').map((keyword, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md border border-blue-200"
                  >
                    {keyword.trim()}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Document Sections - Core content display for Vercel fallback */}
        {document.sections && document.sections.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Document Sections</h2>
            </div>
            
            {document.sections.map((section, index) => (
              <Card key={index} className="border-gray-200">
                <CardContent className="p-4">
                  {section.title && (
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                      {section.title}
                    </h3>
                  )}
                  
                  {/* Main section content - Note: content property may not exist in current schema */}
                  {(section as any).content && (
                    <div className="prose prose-sm max-w-none">
                      {renderSectionContent((section as any).content)}
                    </div>
                  )}

                  {/* Section subsections - Hierarchical content structure */}
                  {section.subsections && section.subsections.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {section.subsections.map((subsection, subIndex) => (
                        <div key={subIndex} className="ml-4 border-l-2 border-gray-200 pl-4">
                          {subsection.title && (
                            <h4 className="font-medium text-gray-800 mb-2">
                              {subsection.title}
                            </h4>
                          )}
                          {/* Subsection content - Note: content property may not exist in current schema */}
                          {(subsection as any).content && (
                            <div className="text-gray-700">
                              {renderSectionContent((subsection as any).content)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Section images - Visual content indicators for Vercel fallback */}
                  {/* Note: images property may not exist in current schema */}
                  {(section as any).images && (section as any).images.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Image className="w-4 h-4" />
                        <span>Images ({(section as any).images.length})</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(section as any).images.map((image: any, imgIndex: number) => (
                          <div key={imgIndex} className="bg-gray-100 border border-gray-200 rounded p-3">
                            <div className="text-sm text-gray-600 mb-1">
                              <strong>Caption:</strong> {image.caption || 'No caption'}
                            </div>
                            {image.alt && (
                              <div className="text-xs text-gray-500">
                                <strong>Alt text:</strong> {image.alt}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section tables - Data structure indicators for Vercel fallback */}
                  {/* Note: tables property may not exist in current schema */}
                  {(section as any).tables && (section as any).tables.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Table className="w-4 h-4" />
                        <span>Tables ({(section as any).tables.length})</span>
                      </div>
                      <div className="space-y-3">
                        {(section as any).tables.map((table: any, tableIndex: number) => (
                          <div key={tableIndex} className="bg-gray-50 border border-gray-200 rounded p-3">
                            <div className="text-sm text-gray-700 mb-2">
                              <strong>Table {tableIndex + 1}:</strong> {table.caption || 'No caption'}
                            </div>
                            {table.data && table.data.length > 0 && (
                              <div className="text-xs text-gray-600">
                                <strong>Dimensions:</strong> {table.data.length} rows × {table.data[0]?.length || 0} columns
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section equations - Mathematical content indicators for Vercel fallback */}
                  {/* Note: equations property may not exist in current schema */}
                  {(section as any).equations && (section as any).equations.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calculator className="w-4 h-4" />
                        <span>Equations ({(section as any).equations.length})</span>
                      </div>
                      <div className="space-y-2">
                        {(section as any).equations.map((equation: any, eqIndex: number) => (
                          <div key={eqIndex} className="bg-blue-50 border border-blue-200 rounded p-3">
                            <div className="font-mono text-sm text-gray-800 mb-1">
                              {equation.latex || equation.content}
                            </div>
                            {equation.label && (
                              <div className="text-xs text-gray-600">
                                <strong>Label:</strong> {equation.label}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* References - IEEE citation display for Vercel fallback */}
        {document.references && document.references.length > 0 && (
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">References</h2>
              </div>
              {/* Display references in IEEE format when PDF preview unavailable */}
              {renderReferences()}
            </CardContent>
          </Card>
        )}

        {/* Document summary - Overview statistics for Vercel fallback preview */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">Document Summary</h2>
            </div>
            {/* Provide document statistics to give users confidence in completeness */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-gray-900">
                  {document.sections?.length || 0}
                </div>
                <div className="text-gray-600">Sections</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">
                  {document.references?.length || 0}
                </div>
                <div className="text-gray-600">References</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">
                  {document.authors?.filter(a => a.name).length || 0}
                </div>
                <div className="text-gray-600">Authors</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">
                  {document.keywords ? document.keywords.split(',').length : 0}
                </div>
                <div className="text-gray-600">Keywords</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}