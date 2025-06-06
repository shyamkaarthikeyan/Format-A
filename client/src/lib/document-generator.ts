import type { Document } from "@shared/schema";
import { generateIEEEDocument } from "./ieee-formatter";

export interface GenerationResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
}

export async function generateDocxDocument(document: Document): Promise<GenerationResult> {
  try {
    const response = await fetch('/api/generate/docx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(document),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate document: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    return {
      success: true,
      downloadUrl: url
    };
  } catch (error) {
    console.error('Error generating DOCX:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate DOCX document'
    };
  }
}

export async function generateLatexDocument(document: Document): Promise<GenerationResult> {
  try {
    const response = await fetch('/api/generate/latex', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(document),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate LaTeX document: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    return {
      success: true,
      downloadUrl: url
    };
  } catch (error) {
    console.error('Error generating LaTeX:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate LaTeX document'
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
