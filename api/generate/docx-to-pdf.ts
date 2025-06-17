import { NextApiRequest, NextApiResponse } from 'next';
import { jsPDF } from 'jspdf';

interface DocumentData {
  title: string;
  authors: Array<{ name: string; department?: string; organization?: string; city?: string; state?: string }>;
  abstract?: string;
  keywords?: string;
  sections?: Array<{
    title: string;
    contentBlocks?: Array<{ type: string; content?: string; caption?: string }>;
    content?: string;
    subsections?: Array<{ title: string; content: string }>;
  }>;
  references?: Array<{ text: string }>;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

function generateIEEEPDF(data: DocumentData): Buffer {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter'
  });

  // Set IEEE formatting
  const pageWidth = 8.5;
  const pageHeight = 11;
  const margin = 0.75;
  const contentWidth = pageWidth - (2 * margin);
  const columnWidth = (contentWidth - 0.25) / 2; // Two columns with 0.25" gap

  let yPosition = margin;
  const lineHeight = 0.14; // ~10pt line spacing

  // Helper function to add text
  function addText(text: string, x: number, y: number, fontSize: number = 9.5, fontStyle: string = 'normal'): number {
    pdf.setFont('times', fontStyle);
    pdf.setFontSize(fontSize);
    
    // Split text into lines that fit the column width
    const lines = pdf.splitTextToSize(text, columnWidth);
    
    lines.forEach((line: string, index: number) => {
      if (y + (index * lineHeight) > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, x, y + (index * lineHeight));
    });
    
    return y + (lines.length * lineHeight);
  }

  // Title (centered, full width)
  pdf.setFont('times', 'bold');
  pdf.setFontSize(24);
  const titleLines = pdf.splitTextToSize(data.title, contentWidth);
  titleLines.forEach((line: string, index: number) => {
    pdf.text(line, pageWidth / 2, yPosition + (index * 0.3), { align: 'center' });
  });
  yPosition += titleLines.length * 0.3 + 0.2;

  // Authors (centered, full width)
  if (data.authors && data.authors.length > 0) {
    const authorsPerRow = Math.min(data.authors.length, 3);
    const authorWidth = contentWidth / authorsPerRow;
    
    data.authors.forEach((author, index) => {
      const col = index % authorsPerRow;
      const authorX = margin + (col * authorWidth) + (authorWidth / 2);
      let authorY = yPosition;

      // Author name (bold)
      pdf.setFont('times', 'bold');
      pdf.setFontSize(9.5);
      pdf.text(author.name, authorX, authorY, { align: 'center' });
      authorY += lineHeight;

      // Author details (italic)
      pdf.setFont('times', 'italic');
      [author.department, author.organization, author.city, author.state].forEach(field => {
        if (field) {
          pdf.text(field, authorX, authorY, { align: 'center' });
          authorY += lineHeight;
        }
      });

      if (col === authorsPerRow - 1 || index === data.authors.length - 1) {
        yPosition = authorY + 0.1;
      }
    });
  }

  // Abstract
  if (data.abstract) {
    yPosition += 0.1;
    pdf.setFont('times', 'italic');
    pdf.setFontSize(9.5);
    pdf.text('Abstract—', margin, yPosition);
    
    pdf.setFont('times', 'normal');
    const abstractText = stripHtml(data.abstract);
    yPosition = addText('Abstract—' + abstractText, margin, yPosition);
    yPosition += 0.1;
  }

  // Keywords
  if (data.keywords) {
    pdf.setFont('times', 'italic');
    pdf.setFontSize(9.5);
    pdf.text('Index Terms—', margin, yPosition);
    
    pdf.setFont('times', 'normal');
    yPosition = addText('Index Terms—' + data.keywords, margin, yPosition);
    yPosition += 0.2;
  }

  // Two-column layout for sections
  let currentColumn = 0; // 0 = left, 1 = right
  let leftColumnY = yPosition;
  let rightColumnY = yPosition;

  function getColumnX(column: number): number {
    return column === 0 ? margin : margin + columnWidth + 0.25;
  }

  function getCurrentY(): number {
    return currentColumn === 0 ? leftColumnY : rightColumnY;
  }

  function setCurrentY(y: number): void {
    if (currentColumn === 0) {
      leftColumnY = y;
    } else {
      rightColumnY = y;
    }
  }

  function switchColumn(): void {
    currentColumn = currentColumn === 0 ? 1 : 0;
  }

  // Sections
  if (data.sections) {
    data.sections.forEach((section, index) => {
      const sectionNumber = index + 1;
      let y = getCurrentY();

      // Section title
      if (section.title) {
        y = addText(`${sectionNumber}. ${section.title.toUpperCase()}`, getColumnX(currentColumn), y, 9.5, 'bold');
        y += 0.05;
        setCurrentY(y);
      }

      // Content blocks
      if (section.contentBlocks) {
        section.contentBlocks.forEach((block) => {
          if (block.type === 'text' && block.content) {
            y = getCurrentY();
            y = addText(stripHtml(block.content), getColumnX(currentColumn), y);
            y += 0.1;
            setCurrentY(y);
          }
          
          if (block.type === 'image' && block.caption) {
            y = getCurrentY();
            y = addText(`[Figure: ${block.caption}]`, getColumnX(currentColumn), y, 9, 'italic');
            y += 0.1;
            setCurrentY(y);
          }
        });
      }

      // Legacy content
      if (!section.contentBlocks && section.content) {
        y = getCurrentY();
        y = addText(section.content, getColumnX(currentColumn), y);
        y += 0.1;
        setCurrentY(y);
      }

      // Subsections
      if (section.subsections) {
        section.subsections.forEach((subsection, subIndex) => {
          if (subsection.title) {
            y = getCurrentY();
            y = addText(`${sectionNumber}.${subIndex + 1} ${subsection.title}`, getColumnX(currentColumn), y, 9.5, 'bold');
            y += 0.05;
            setCurrentY(y);
          }

          if (subsection.content) {
            y = getCurrentY();
            y = addText(subsection.content, getColumnX(currentColumn), y);
            y += 0.1;
            setCurrentY(y);
          }
        });
      }

      // Check if we need to switch columns
      if (getCurrentY() > pageHeight - margin - 2) {
        switchColumn();
        if (currentColumn === 0) {
          pdf.addPage();
          leftColumnY = margin;
          rightColumnY = margin;
        }
      }
    });
  }

  // References
  if (data.references && data.references.length > 0) {
    let y = getCurrentY();
    y = addText('REFERENCES', getColumnX(currentColumn), y, 9.5, 'bold');
    y += 0.1;
    setCurrentY(y);

    data.references.forEach((ref, index) => {
      if (ref.text) {
        y = getCurrentY();
        y = addText(`[${index + 1}] ${ref.text}`, getColumnX(currentColumn), y);
        y += 0.05;
        setCurrentY(y);
      }
    });
  }

  return Buffer.from(pdf.output('arraybuffer'));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const documentData: DocumentData = req.body;
    
    if (!documentData.title) {
      return res.status(400).json({ error: 'Document title is required' });
    }

    if (!documentData.authors || !documentData.authors.some(author => author.name)) {
      return res.status(400).json({ error: 'At least one author name is required' });
    }

    // Generate the PDF
    const pdfBuffer = generateIEEEPDF(documentData);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    
    // Send the file
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: (error as Error).message
    });
  }
}