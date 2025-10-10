import type { Document, Author, Section, ContentBlock, Subsection, Reference } from '@shared/schema';

export interface GenerationResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
}

// Simple client-side document generation
export async function generateSimpleDocx(document: Document): Promise<GenerationResult> {
  try {
    // Create a simple HTML-based document
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>${document.title || 'IEEE Document'}</title>
    <style>
        body { font-family: 'Times New Roman', serif; margin: 1in; line-height: 1.5; }
        .title { text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 20px; }
        .authors { text-align: center; font-style: italic; margin-bottom: 20px; }
        .abstract { margin: 20px 0.5in; text-align: justify; }
        .abstract-title { font-weight: bold; text-align: center; margin-bottom: 10px; }
        .keywords { margin: 20px 0.5in; }
        .section { margin: 20px 0; }
        .section-title { font-weight: bold; font-size: 12pt; margin: 20px 0 10px 0; }
        .content { text-align: justify; text-indent: 0.25in; margin-bottom: 10px; }
        .references { margin-top: 30px; }
        .reference { margin-bottom: 5px; }
    </style>
</head>
<body>
    <div class="title">${document.title || 'Untitled Document'}</div>
    
    ${document.authors.length > 0 ? `
    <div class="authors">
        ${document.authors.map((author: Author) => 
            `${author.name}${author.department ? `, ${author.department}` : ''}${author.organization ? `, ${author.organization}` : ''}`
        ).join('<br>')}
    </div>
    ` : ''}
    
    ${document.abstract ? `
    <div class="abstract">
        <div class="abstract-title">Abstract</div>
        <div>${document.abstract}</div>
    </div>
    ` : ''}
    
    ${document.keywords ? `
    <div class="keywords">
        <strong>Keywords:</strong> <em>${document.keywords}</em>
    </div>
    ` : ''}
    
    ${document.sections.map((section: Section, index: number) => `
    <div class="section">
        <div class="section-title">${index + 1}. ${section.title.toUpperCase()}</div>
        ${section.contentBlocks.map((block: ContentBlock) => 
            block.type === 'text' && block.content ? 
            `<div class="content">${block.content}</div>` : ''
        ).join('')}
        ${section.subsections.map((subsection: Subsection) => `
            <div class="section-title">${index + 1}.${subsection.order + 1} ${subsection.title}</div>
            <div class="content">${subsection.content}</div>
        `).join('')}
    </div>
    `).join('')}
    
    ${document.references.length > 0 ? `
    <div class="references">
        <div class="section-title">REFERENCES</div>
        ${document.references.map((ref: Reference, index: number) => `
        <div class="reference">[${index + 1}] ${ref.text}</div>
        `).join('')}
    </div>
    ` : ''}
</body>
</html>`;

    // Create and download the file
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${document.title || 'document'}.html`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, downloadUrl: url };
  } catch (error) {
    console.error('Error generating document:', error);
    return { success: false, error: String(error) };
  }
}

export async function generateSimplePdf(document: Document): Promise<GenerationResult> {
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    let yPos = 20;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.height;
    
    // Title
    doc.setFontSize(16);
    doc.setFont('times', 'bold');
    const title = document.title || "Untitled Document";
    doc.text(title, doc.internal.pageSize.width / 2, yPos, { align: 'center' });
    yPos += lineHeight * 2;
    
    // Authors
    if (document.authors.length > 0) {
      doc.setFontSize(12);
      doc.setFont('times', 'italic');
      document.authors.forEach((author: Author) => {
        const authorText = `${author.name}${author.department ? `, ${author.department}` : ''}${author.organization ? `, ${author.organization}` : ''}`;
        doc.text(authorText, doc.internal.pageSize.width / 2, yPos, { align: 'center' });
        yPos += lineHeight;
      });
      yPos += lineHeight;
    }
    
    // Abstract
    if (document.abstract) {
      doc.setFontSize(12);
      doc.setFont('times', 'bold');
      doc.text('Abstract', doc.internal.pageSize.width / 2, yPos, { align: 'center' });
      yPos += lineHeight;
      
      doc.setFont('times', 'normal');
      const abstractLines = doc.splitTextToSize(document.abstract, 150);
      abstractLines.forEach((line: string) => {
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, 30, yPos);
        yPos += lineHeight;
      });
      yPos += lineHeight;
    }
    
    // Keywords
    if (document.keywords) {
      doc.setFont('times', 'bold');
      doc.text('Keywords: ', 20, yPos);
      doc.setFont('times', 'italic');
      doc.text(document.keywords, 45, yPos);
      yPos += lineHeight * 2;
    }
    
    // Sections
    document.sections.forEach((section: Section, index: number) => {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('times', 'bold');
      doc.text(`${index + 1}. ${section.title.toUpperCase()}`, 20, yPos);
      yPos += lineHeight * 1.5;
      
      section.contentBlocks.forEach((block: ContentBlock) => {
        if (block.type === 'text' && block.content) {
          doc.setFontSize(11);
          doc.setFont('times', 'normal');
          const contentLines = doc.splitTextToSize(block.content, 170);
          contentLines.forEach((line: string) => {
            if (yPos > pageHeight - 20) {
              doc.addPage();
              yPos = 20;
            }
            doc.text(line, 20, yPos);
            yPos += lineHeight;
          });
          yPos += lineHeight * 0.5;
        }
      });
      
      section.subsections.forEach((subsection: Subsection, subIndex: number) => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(11);
        doc.setFont('times', 'bold');
        doc.text(`${index + 1}.${subIndex + 1} ${subsection.title}`, 20, yPos);
        yPos += lineHeight;
        
        doc.setFont('times', 'normal');
        const subsectionLines = doc.splitTextToSize(subsection.content, 170);
        subsectionLines.forEach((line: string) => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, 20, yPos);
          yPos += lineHeight;
        });
        yPos += lineHeight;
      });
    });
    
    // References
    if (document.references.length > 0) {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('times', 'bold');
      doc.text('REFERENCES', 20, yPos);
      yPos += lineHeight * 1.5;
      
      document.references.forEach((ref: Reference, index: number) => {
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(10);
        doc.setFont('times', 'normal');
        const refText = `[${index + 1}] ${ref.text}`;
        const refLines = doc.splitTextToSize(refText, 170);
        refLines.forEach((line: string) => {
          doc.text(line, 20, yPos);
          yPos += lineHeight;
        });
        yPos += lineHeight * 0.5;
      });
    }
    
    // Download PDF
    doc.save(`${document.title || 'document'}.pdf`);
    
    return { success: true };
  } catch (error) {
    console.error('Error generating PDF:', error);
    return { success: false, error: String(error) };
  }
}