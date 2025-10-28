import { VercelRequest, VercelResponse } from '@vercel/node';
import PDFDocument from 'pdfkit';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Preview, X-Download');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const documentData = req.body;
    
    // Check for preview or download mode
    const isPreview = req.query.preview === 'true' || req.headers['x-preview'] === 'true';
    const isDownload = req.headers['x-download'] === 'true';

    console.log(`PDF generation request: preview=${isPreview}, download=${isDownload}`);

    // Validate required fields
    if (!documentData.title) {
      return res.status(400).json({
        error: 'Missing document title',
        message: 'Document title is required'
      });
    }

    if (!documentData.authors || !documentData.authors.some((author: any) => author.name)) {
      return res.status(400).json({
        error: 'Missing authors',
        message: 'At least one author is required'
      });
    }

    // Generate PDF using PDFKit
    const doc = new PDFDocument({
      size: 'letter',
      margins: {
        top: 72,    // 1 inch
        bottom: 72, // 1 inch
        left: 54,   // 0.75 inch
        right: 54   // 0.75 inch
      }
    });

    // Set up response headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    if (isDownload) {
      res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.pdf"');
    } else {
      res.setHeader('Content-Disposition', 'inline; filename="ieee_paper.pdf"');
    }

    // Pipe the PDF to the response
    doc.pipe(res);

    // IEEE formatting
    const pageWidth = doc.page.width;
    const margin = 54;
    const contentWidth = pageWidth - (margin * 2);

    // Title
    doc.fontSize(14)
       .font('Times-Bold')
       .text(documentData.title, margin, 100, {
         width: contentWidth,
         align: 'center'
       });

    let yPosition = 140;

    // Authors - IEEE format with proper layout
    if (documentData.authors && documentData.authors.length > 0) {
      const validAuthors = documentData.authors.filter((author: any) => author.name);
      
      if (validAuthors.length > 0) {
        // Calculate column width for authors
        const authorColumnWidth = contentWidth / validAuthors.length;
        let currentX = margin;
        
        validAuthors.forEach((author: any, index: number) => {
          // Author name (bold)
          doc.fontSize(10)
             .font('Times-Bold')
             .text(author.name, currentX, yPosition, {
               width: authorColumnWidth,
               align: 'center'
             });
          
          let authorYPosition = yPosition + 15;
          
          // Author details (regular font, smaller)
          const details = [];
          if (author.department) details.push(author.department);
          if (author.organization) details.push(author.organization);
          if (author.city) details.push(author.city);
          if (author.state) details.push(author.state);
          if (author.country) details.push(author.country);
          if (author.email) details.push(author.email);
          
          if (details.length > 0) {
            doc.fontSize(9)
               .font('Times-Roman')
               .text(details.join('\n'), currentX, authorYPosition, {
                 width: authorColumnWidth,
                 align: 'center',
                 lineGap: 2
               });
          }
          
          currentX += authorColumnWidth;
        });
        
        // Calculate the height needed for all author details
        const maxDetailsHeight = Math.max(...validAuthors.map(author => {
          const details = [];
          if (author.department) details.push(author.department);
          if (author.organization) details.push(author.organization);
          if (author.city) details.push(author.city);
          if (author.state) details.push(author.state);
          if (author.country) details.push(author.country);
          if (author.email) details.push(author.email);
          return details.length * 12; // Approximate line height
        }));
        
        yPosition += 15 + maxDetailsHeight + 20; // Name height + details height + spacing
      }
    }

    // Abstract
    if (documentData.abstract) {
      doc.fontSize(10)
         .font('Times-Bold')
         .text('Abstract—', margin, yPosition, { continued: true })
         .font('Times-Roman')
         .text(documentData.abstract, {
           width: contentWidth,
           align: 'justify'
         });
      yPosition = doc.y + 15;
    }

    // Keywords
    if (documentData.keywords) {
      doc.fontSize(10)
         .font('Times-Bold')
         .text('Keywords—', margin, yPosition, { continued: true })
         .font('Times-Italic')
         .text(documentData.keywords, {
           width: contentWidth,
           align: 'justify'
         });
      yPosition = doc.y + 20;
    }

    // Sections
    if (documentData.sections && documentData.sections.length > 0) {
      documentData.sections.forEach((section: any, index: number) => {
        if (section.title) {
          // Check if we need a new page
          if (yPosition > doc.page.height - 150) {
            doc.addPage();
            yPosition = 72;
          }

          // Section heading
          doc.fontSize(12)
             .font('Times-Bold')
             .text(`${index + 1}. ${section.title}`, margin, yPosition, {
               width: contentWidth
             });
          yPosition = doc.y + 10;
        }

        if (section.content) {
          // Check if we need a new page
          if (yPosition > doc.page.height - 100) {
            doc.addPage();
            yPosition = 72;
          }

          // Section content
          doc.fontSize(10)
             .font('Times-Roman')
             .text(section.content, margin, yPosition, {
               width: contentWidth,
               align: 'justify'
             });
          yPosition = doc.y + 15;
        }

        // Handle content blocks if present
        if (section.content_blocks && section.content_blocks.length > 0) {
          section.content_blocks.forEach((block: any) => {
            if (block.type === 'text' && block.content) {
              // Check if we need a new page
              if (yPosition > doc.page.height - 100) {
                doc.addPage();
                yPosition = 72;
              }

              doc.fontSize(10)
                 .font('Times-Roman')
                 .text(block.content, margin, yPosition, {
                   width: contentWidth,
                   align: 'justify'
                 });
              yPosition = doc.y + 10;
            }
          });
        }
      });
    }

    // References
    if (documentData.references && documentData.references.length > 0) {
      // Check if we need a new page
      if (yPosition > doc.page.height - 150) {
        doc.addPage();
        yPosition = 72;
      }

      // References heading
      doc.fontSize(12)
         .font('Times-Bold')
         .text('References', margin, yPosition, {
           width: contentWidth
         });
      yPosition = doc.y + 15;

      // Reference list
      documentData.references.forEach((reference: any, index: number) => {
        if (reference.text) {
          // Check if we need a new page
          if (yPosition > doc.page.height - 80) {
            doc.addPage();
            yPosition = 72;
          }

          doc.fontSize(9)
             .font('Times-Roman')
             .text(`[${index + 1}] ${reference.text}`, margin, yPosition, {
               width: contentWidth,
               align: 'left',
               indent: 20,
               hangingIndent: 20
             });
          yPosition = doc.y + 8;
        }
      });
    }

    // Finalize the PDF
    doc.end();

    console.log('PDF generated successfully');

  } catch (error) {
    console.error('PDF generation error:', error);
    return res.status(500).json({
      error: 'PDF generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Try downloading the Word document instead'
    });
  }
}

