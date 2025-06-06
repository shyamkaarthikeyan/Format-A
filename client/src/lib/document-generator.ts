import type { Document } from "@shared/schema";
import { generateIEEEDocument } from "./ieee-formatter";

export interface GenerationResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
}

export async function generateDocxDocument(document: Document): Promise<GenerationResult> {
  try {
    // In a real implementation, this would use a library like docx to generate the document
    // For now, we'll simulate the generation process
    
    const ieeeContent = generateIEEEDocument(document);
    
    // Create a blob with the content (simplified approach)
    const blob = new Blob([ieeeContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    return {
      success: true,
      downloadUrl: url
    };
  } catch (error) {
    console.error('Error generating DOCX:', error);
    return {
      success: false,
      error: 'Failed to generate DOCX document'
    };
  }
}

export async function generateLatexDocument(document: Document): Promise<GenerationResult> {
  try {
    // LaTeX template based on the Python code
    const latexTemplate = `
\\documentclass[conference]{IEEEtran}
\\IEEEoverridecommandlockouts
\\usepackage{cite}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{graphicx}
\\usepackage{textcomp}
\\usepackage{xcolor}

\\begin{document}

\\title{${document.title || ''}}
\\author{${formatAuthorsLatex(document.authors || [])}}

\\maketitle

\\begin{abstract}
${document.abstract || ''}
\\end{abstract}

\\begin{IEEEkeywords}
${document.keywords || ''}
\\end{IEEEkeywords}

${formatSectionsLatex(document.sections || [])}

\\section*{Acknowledgment}
${document.funding || ''}

\\begin{thebibliography}{${document.references?.length || 0}}
${formatReferencesLatex(document.references || [])}
\\end{thebibliography}

\\end{document}
    `.trim();
    
    const blob = new Blob([latexTemplate], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    return {
      success: true,
      downloadUrl: url
    };
  } catch (error) {
    console.error('Error generating LaTeX:', error);
    return {
      success: false,
      error: 'Failed to generate LaTeX document'
    };
  }
}

function formatAuthorsLatex(authors: any[]): string {
  return authors.map(author => {
    let authorStr = author.name || '';
    if (author.department || author.organization || author.city) {
      authorStr += '\\\\';
      if (author.department) authorStr += `\\textit{${author.department}}\\\\`;
      if (author.organization) authorStr += `\\textit{${author.organization}}\\\\`;
      if (author.city && author.state) {
        authorStr += `\\textit{${author.city}, ${author.state}}`;
      } else if (author.city) {
        authorStr += `\\textit{${author.city}}`;
      } else if (author.state) {
        authorStr += `\\textit{${author.state}}`;
      }
    }
    return authorStr;
  }).join(' \\and ');
}

function formatSectionsLatex(sections: any[]): string {
  return sections.map((section, index) => {
    let sectionStr = `\\section{${section.title || `Section ${index + 1}`}}\n`;
    
    // Add content blocks
    section.contentBlocks?.forEach((block: any) => {
      if (block.type === 'text' && block.content) {
        sectionStr += `${block.content}\n\n`;
      } else if (block.type === 'image' && block.imageId) {
        sectionStr += `\\begin{figure}[h]\n`;
        sectionStr += `\\centering\n`;
        sectionStr += `\\includegraphics[width=0.8\\columnwidth]{${block.imageId}}\n`;
        sectionStr += `\\caption{${block.caption || ''}}\n`;
        sectionStr += `\\label{fig:${section.id}_${block.id}}\n`;
        sectionStr += `\\end{figure}\n\n`;
      }
    });
    
    // Add subsections
    section.subsections?.forEach((subsection: any) => {
      if (subsection.title && subsection.content) {
        sectionStr += `\\subsection{${subsection.title}}\n`;
        sectionStr += `${subsection.content}\n\n`;
      }
    });
    
    return sectionStr;
  }).join('');
}

function formatReferencesLatex(references: any[]): string {
  return references.map((ref, index) => {
    return `\\bibitem{${index + 1}}\n${ref.text}`;
  }).join('\n');
}

export function downloadFile(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
