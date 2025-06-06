import type { Document } from "@shared/schema";

export interface IEEEConfig {
  fontName: string;
  fontSizeTitle: string;
  fontSizeBody: string;
  fontSizeCaption: string;
  marginLeft: string;
  marginRight: string;
  marginTop: string;
  marginBottom: string;
  columnCount: number;
  columnSpacing: string;
  columnWidth: string;
  columnIndent: string;
  lineSpacing: string;
  figureSizes: {
    [key: string]: string;
  };
  maxFigureHeight: string;
}

export const IEEE_CONFIG: IEEEConfig = {
  fontName: 'Times New Roman',
  fontSizeTitle: '24pt',
  fontSizeBody: '9.5pt',
  fontSizeCaption: '9pt',
  marginLeft: '0.75in',
  marginRight: '0.75in',
  marginTop: '0.75in',
  marginBottom: '0.75in',
  columnCount: 2,
  columnSpacing: '0.25in',
  columnWidth: '3.375in',
  columnIndent: '0.2in',
  lineSpacing: '10pt',
  figureSizes: {
    'very-small': '1.2in',
    'small': '1.8in',
    'medium': '2.5in',
    'large': '3.2in'
  },
  maxFigureHeight: '4.0in'
};

export function formatTitle(title: string): string {
  return title.trim();
}

export function formatAuthors(authors: any[]): string {
  return authors.map(author => {
    const parts = [author.name];
    if (author.department) parts.push(author.department);
    if (author.organization) parts.push(author.organization);
    if (author.city && author.state) parts.push(`${author.city}, ${author.state}`);
    else if (author.city) parts.push(author.city);
    else if (author.state) parts.push(author.state);
    
    // Add custom fields
    author.customFields?.forEach((field: any) => {
      if (field.value) parts.push(field.value);
    });
    
    return parts.join('\n');
  }).join('\n\n');
}

export function formatAbstract(abstract: string): string {
  return `Abstract—${abstract}`;
}

export function formatKeywords(keywords: string): string {
  return `Keywords: ${keywords}`;
}

export function formatSection(section: any, index: number): string {
  let content = `${index + 1}. ${section.title.toUpperCase()}\n\n`;
  
  // Add content blocks
  section.contentBlocks?.forEach((block: any) => {
    if (block.type === 'text' && block.content) {
      content += `${block.content}\n\n`;
    }
  });
  
  // Add subsections
  section.subsections?.forEach((subsection: any, subIndex: number) => {
    if (subsection.title && subsection.content) {
      const letter = String.fromCharCode(65 + subIndex); // A, B, C, etc.
      content += `${letter}. ${subsection.title}\n\n${subsection.content}\n\n`;
    }
  });
  
  return content;
}

export function formatReferences(references: any[]): string {
  let content = 'REFERENCES\n\n';
  references.forEach((ref, index) => {
    content += `[${index + 1}] ${ref.text}\n\n`;
  });
  return content;
}

export function generateIEEEDocument(document: Document): string {
  let content = '';
  
  // Title
  if (document.title) {
    content += formatTitle(document.title) + '\n\n';
  }
  
  // Authors
  if (document.authors && document.authors.length > 0) {
    content += formatAuthors(document.authors) + '\n\n';
  }
  
  // Abstract
  if (document.abstract) {
    content += formatAbstract(document.abstract) + '\n\n';
  }
  
  // Keywords
  if (document.keywords) {
    content += formatKeywords(document.keywords) + '\n\n';
  }
  
  // Sections
  if (document.sections && document.sections.length > 0) {
    document.sections.forEach((section, index) => {
      content += formatSection(section, index);
    });
  }
  
  // References
  if (document.references && document.references.length > 0) {
    content += formatReferences(document.references);
  }
  
  return content;
}
