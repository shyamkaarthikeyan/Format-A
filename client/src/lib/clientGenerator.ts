import type { Document } from '../../../shared/schema-client.js';

export interface GenerationResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
}

// Client-side document generation using docx library
export async function generateClientDocx(document: Document): Promise<GenerationResult> {
  try {
    // Create the document structure for client-side generation
    const documentData = {
      title: document.title,
      abstract: document.abstract,
      keywords: document.keywords,
      authors: document.authors,
      sections: document.sections,
      references: document.references,
      figures: document.figures
    };

    // Generate Word document using docx library
    const { Document: DocxDocument, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
    
    const doc = new DocxDocument({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: document.title || "Untitled Document",
            heading: HeadingLevel.TITLE,
            alignment: 'center'
          }),
          
          // Authors
          ...document.authors.map(author => new Paragraph({
            children: [new TextRun({
              text: `${author.name}${author.department ? `, ${author.department}` : ''}${author.organization ? `, ${author.organization}` : ''}`,
              italics: true
            })],
            alignment: 'center'
          })),
          
          // Abstract
          ...(document.abstract ? [
            new Paragraph({
              children: [new TextRun({ text: "Abstract", bold: true })],
              spacing: { before: 400, after: 200 }
            }),
            new Paragraph({
              text: document.abstract,
              alignment: 'both'
            })
          ] : []),
          
          // Keywords
          ...(document.keywords ? [
            new Paragraph({
              children: [
                new TextRun({ text: "Keywords: ", bold: true }),
                new TextRun({ text: document.keywords, italics: true })
              ],
              spacing: { before: 200, after: 400 }
            })
          ] : []),
          
          // Sections
          ...document.sections.flatMap(section => [
            new Paragraph({
              text: section.title,
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 }
            }),
            ...section.contentBlocks.flatMap(block => {
              if (block.type === 'text' && block.content) {
                return [new Paragraph({
                  text: block.content,
                  alignment: 'both',
                  spacing: { after: 200 }
                })];
              }
              return [];
            }),
            ...section.subsections.flatMap(subsection => [
              new Paragraph({
                text: subsection.title,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 }
              }),
              new Paragraph({
                text: subsection.content,
                alignment: 'justify',
                spacing: { after: 200 }
              })
            ])
          ]),
          
          // References
          ...(document.references.length > 0 ? [
            new Paragraph({
              text: "References",
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 }
            }),
            ...document.references.map((ref, index) => new Paragraph({
              text: `[${index + 1}] ${ref.text}`,
              spacing: { after: 100 }
            }))
          ] : [])
        ]
      }]
    });

    // Generate and download
    const buffer = await Packer.toBlob(doc);
    const url = URL.createObjectURL(buffer);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${document.title || 'document'}.docx`;
    link.click();
    URL.revokeObjectURL(url);

    return { success: true, downloadUrl: url };
  } catch (error) {
    console.error('Error generating Word document:', error);
    return { success: false, error: String(error) };
  }
}

export async function generateClientPdf(document: Document): Promise<GenerationResult> {
  try {
    // Use jsPDF for client-side PDF generation
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    let yPos = 20;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.height;
    
    // Title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    const title = document.title || "Untitled Document";
    doc.text(title, doc.internal.pageSize.width / 2, yPos, { align: 'center' });
    yPos += lineHeight * 2;
    
    // Authors
    doc.setFontSize(12);
    doc.setFont(undefined, 'italic');
    document.authors.forEach(author => {
      const authorText = `${author.name}${author.department ? `, ${author.department}` : ''}${author.organization ? `, ${author.organization}` : ''}`;
      doc.text(authorText, doc.internal.pageSize.width / 2, yPos, { align: 'center' });
      yPos += lineHeight;
    });
    yPos += lineHeight;
    
    // Abstract
    if (document.abstract) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Abstract', 20, yPos);
      yPos += lineHeight;
      
      doc.setFont(undefined, 'normal');
      const abstractLines = doc.splitTextToSize(document.abstract, 170);
      abstractLines.forEach((line: string) => {
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, 20, yPos);
        yPos += lineHeight;
      });
      yPos += lineHeight;
    }
    
    // Keywords
    if (document.keywords) {
      doc.setFont(undefined, 'bold');
      doc.text('Keywords: ', 20, yPos);
      doc.setFont(undefined, 'italic');
      doc.text(document.keywords, 45, yPos);
      yPos += lineHeight * 2;
    }
    
    // Sections
    document.sections.forEach(section => {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(section.title, 20, yPos);
      yPos += lineHeight * 1.5;
      
      section.contentBlocks.forEach(block => {
        if (block.type === 'text' && block.content) {
          doc.setFontSize(11);
          doc.setFont(undefined, 'normal');
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
      
      section.subsections.forEach(subsection => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(subsection.title, 20, yPos);
        yPos += lineHeight;
        
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
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
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('References', 20, yPos);
      yPos += lineHeight * 1.5;
      
      document.references.forEach((ref, index) => {
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
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