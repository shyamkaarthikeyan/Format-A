import { jsPDF } from 'jspdf';
import type { Document } from '@shared/schema';

/**
 * IEEE PDF Generator using jsPDF
 * Generates client-side PDFs with proper IEEE formatting
 */

export interface PDFGenerationOptions {
  format?: 'a4' | 'letter';
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export class IEEEPDFGenerator {
  private doc: jsPDF;
  private currentY: number = 0;
  private pageHeight: number;
  private pageWidth: number;
  private margins: Required<PDFGenerationOptions>['margins'];
  private columnWidth: number;
  private leftColumnX: number;
  private rightColumnX: number;
  private currentColumn: 'left' | 'right' = 'left';

  constructor(options: PDFGenerationOptions = {}) {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: options.format || 'a4'
    });

    this.pageHeight = this.doc.internal.pageSize.height;
    this.pageWidth = this.doc.internal.pageSize.width;
    
    this.margins = {
      top: 20,
      bottom: 20,
      left: 15,
      right: 15,
      ...options.margins
    };

    // IEEE two-column layout
    const contentWidth = this.pageWidth - this.margins.left - this.margins.right;
    this.columnWidth = (contentWidth - 5) / 2; // 5mm gap between columns
    this.leftColumnX = this.margins.left;
    this.rightColumnX = this.margins.left + this.columnWidth + 5;
    
    this.currentY = this.margins.top;
  }

  /**
   * Generate complete IEEE formatted PDF from document data
   */
  public generatePDF(document: Document): Uint8Array {
    this.addTitle(document.title || 'Untitled Document');
    this.addAuthors(document.authors || []);
    this.addAbstract(document.abstract || '');
    this.addKeywords(document.keywords || '');
    this.addSections(document.sections || []);
    this.addReferences(document.references || []);

    return this.doc.output('arraybuffer') as Uint8Array;
  }

  /**
   * Generate PDF and return as Blob URL for preview
   */
  public generateBlobURL(document: Document): string {
    const pdfBytes = this.generatePDF(document);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  }

  private addTitle(title: string): void {
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(16);
    
    // Center title across full width
    const titleLines = this.doc.splitTextToSize(title, this.pageWidth - this.margins.left - this.margins.right);
    
    titleLines.forEach((line: string) => {
      const textWidth = this.doc.getTextWidth(line);
      const x = (this.pageWidth - textWidth) / 2;
      this.doc.text(line, x, this.currentY);
      this.currentY += 6;
    });
    
    this.currentY += 5; // Extra space after title
  }

  private addAuthors(authors: any[]): void {
    if (!authors.length) return;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(11);

    const authorText = authors
      .map(author => {
        let text = author.name || '';
        if (author.affiliation) {
          text += `\n${author.affiliation}`;
        }
        if (author.email) {
          text += `\n${author.email}`;
        }
        return text;
      })
      .join('\n\n');

    const authorLines = this.doc.splitTextToSize(authorText, this.pageWidth - this.margins.left - this.margins.right);
    
    authorLines.forEach((line: string) => {
      const textWidth = this.doc.getTextWidth(line);
      const x = (this.pageWidth - textWidth) / 2;
      this.doc.text(line, x, this.currentY);
      this.currentY += 4;
    });
    
    this.currentY += 8; // Space before abstract
  }

  private addAbstract(abstract: string): void {
    if (!abstract.trim()) return;

    // Abstract title
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.text('Abstract—', this.margins.left, this.currentY);
    
    // Abstract content
    this.doc.setFont('helvetica', 'normal');
    const abstractLines = this.doc.splitTextToSize(
      abstract, 
      this.pageWidth - this.margins.left - this.margins.right
    );
    
    let abstractX = this.margins.left + this.doc.getTextWidth('Abstract—') + 2;
    let firstLine = true;
    
    abstractLines.forEach((line: string) => {
      if (firstLine) {
        this.doc.text(line, abstractX, this.currentY);
        firstLine = false;
      } else {
        this.currentY += 4;
        this.doc.text(line, this.margins.left, this.currentY);
      }
    });
    
    this.currentY += 6;
  }

  private addKeywords(keywords: string): void {
    if (!keywords.trim()) return;

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.text('Index Terms—', this.margins.left, this.currentY);
    
    this.doc.setFont('helvetica', 'normal');
    const keywordLines = this.doc.splitTextToSize(
      keywords, 
      this.pageWidth - this.margins.left - this.margins.right - this.doc.getTextWidth('Index Terms—') - 2
    );
    
    let keywordX = this.margins.left + this.doc.getTextWidth('Index Terms—') + 2;
    let firstLine = true;
    
    keywordLines.forEach((line: string) => {
      if (firstLine) {
        this.doc.text(line, keywordX, this.currentY);
        firstLine = false;
      } else {
        this.currentY += 4;
        this.doc.text(line, this.margins.left, this.currentY);
      }
    });
    
    this.currentY += 10; // Space before main content
    
    // Switch to two-column layout for main content
    this.currentColumn = 'left';
  }

  private addSections(sections: any[]): void {
    sections.forEach((section, index) => {
      this.addSection(section, index + 1);
    });
  }

  private addSection(section: any, sectionNumber: number): void {
    const title = section.title || `Section ${sectionNumber}`;
    const content = section.content || '';

    // Section title
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    
    const sectionTitle = `${this.toRomanNumeral(sectionNumber)}. ${title.toUpperCase()}`;
    this.addTextToColumn(sectionTitle);
    this.moveToNextLine(2);

    // Section content
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    
    if (content.trim()) {
      const contentLines = this.doc.splitTextToSize(content, this.columnWidth);
      contentLines.forEach((line: string) => {
        this.addTextToColumn(line);
        this.moveToNextLine();
      });
    }
    
    this.moveToNextLine(2); // Extra space after section

    // Add subsections if they exist
    if (section.subsections && Array.isArray(section.subsections)) {
      section.subsections.forEach((subsection: any, subIndex: number) => {
        this.addSubsection(subsection, sectionNumber, subIndex + 1);
      });
    }
  }

  private addSubsection(subsection: any, sectionNumber: number, subsectionNumber: number): void {
    const title = subsection.title || `Subsection ${subsectionNumber}`;
    const content = subsection.content || '';

    // Subsection title
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    
    const subsectionTitle = `${String.fromCharCode(64 + subsectionNumber)}. ${title}`;
    this.addTextToColumn(subsectionTitle);
    this.moveToNextLine();

    // Subsection content
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    
    if (content.trim()) {
      const contentLines = this.doc.splitTextToSize(content, this.columnWidth);
      contentLines.forEach((line: string) => {
        this.addTextToColumn(line);
        this.moveToNextLine();
      });
    }
    
    this.moveToNextLine(); // Space after subsection
  }

  private addReferences(references: any[]): void {
    if (!references.length) return;

    // References title
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.addTextToColumn('REFERENCES');
    this.moveToNextLine(2);

    // Reference entries
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    
    references.forEach((ref, index) => {
      const refText = this.formatReference(ref, index + 1);
      const refLines = this.doc.splitTextToSize(refText, this.columnWidth - 10);
      
      // Add reference number
      this.addTextToColumn(`[${index + 1}]`);
      
      // Add reference text with hanging indent
      refLines.forEach((line: string, lineIndex: number) => {
        if (lineIndex === 0) {
          this.doc.text(line, this.getCurrentX() + 8, this.currentY);
        } else {
          this.moveToNextLine();
          this.doc.text(line, this.getCurrentX() + 8, this.currentY);
        }
      });
      
      this.moveToNextLine(1.5);
    });
  }

  private formatReference(ref: any, index: number): string {
    // Basic IEEE reference formatting
    let refText = '';
    
    if (ref.authors) {
      refText += ref.authors;
    }
    
    if (ref.title) {
      refText += refText ? `, "${ref.title}"` : `"${ref.title}"`;
    }
    
    if (ref.journal) {
      refText += refText ? `, ${ref.journal}` : ref.journal;
    }
    
    if (ref.year) {
      refText += refText ? `, ${ref.year}` : ref.year;
    }
    
    if (ref.pages) {
      refText += `, pp. ${ref.pages}`;
    }
    
    return refText + '.';
  }

  private addTextToColumn(text: string): void {
    const x = this.getCurrentX();
    this.doc.text(text, x, this.currentY);
  }

  private getCurrentX(): number {
    return this.currentColumn === 'left' ? this.leftColumnX : this.rightColumnX;
  }

  private moveToNextLine(spacing: number = 1): void {
    this.currentY += 4 * spacing;
    
    // Check if we need to move to next column or page
    if (this.currentY > this.pageHeight - this.margins.bottom) {
      if (this.currentColumn === 'left') {
        // Move to right column
        this.currentColumn = 'right';
        this.currentY = this.margins.top + 60; // Start after title/abstract area
      } else {
        // Move to next page
        this.doc.addPage();
        this.currentColumn = 'left';
        this.currentY = this.margins.top;
      }
    }
  }

  private toRomanNumeral(num: number): string {
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    return romanNumerals[num - 1] || num.toString();
  }
}

/**
 * Utility function to generate IEEE PDF from document data
 */
export function generateIEEEPDF(document: Document, options?: PDFGenerationOptions): string {
  const generator = new IEEEPDFGenerator(options);
  return generator.generateBlobURL(document);
}