import { VercelRequest, VercelResponse } from '@vercel/node';

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

    console.log(`Request mode: preview=${isPreview}, download=${isDownload}`);

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

    if (isPreview) {
      // Generate PDF for preview using Node.js
      const pdfBuffer = await generatePDFPreview(documentData);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="ieee_paper_preview.pdf"');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      return res.status(200).send(pdfBuffer);
    } else {
      // For downloads, redirect to the working DOCX endpoint
      return res.status(302).setHeader('Location', '/api/generate/docx').end();
    }

  } catch (error) {
    console.error('Document generation error:', error);
    return res.status(500).json({
      error: 'Document generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Try downloading the Word document instead'
    });
  }
}

async function generatePDFPreview(documentData: any): Promise<Buffer> {
  // Use PDFKit for Node.js-based PDF generation
  const PDFDocument = require('pdfkit');
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: {
          top: 72,
          bottom: 72,
          left: 54,
          right: 54
        }
      });

      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // IEEE formatting
      doc.font('Times-Roman');

      // Title
      if (documentData.title) {
        doc.fontSize(14)
           .font('Times-Bold')
           .text(documentData.title, { align: 'center' })
           .moveDown(0.5);
      }

      // Authors
      if (documentData.authors && documentData.authors.length > 0) {
        const authorsText = documentData.authors
          .map((author: any) => {
            let text = author.name || '';
            if (author.affiliation) text += `, ${author.affiliation}`;
            return text;
          })
          .join('; ');

        doc.fontSize(12)
           .font('Times-Roman')
           .text(authorsText, { align: 'center' })
           .moveDown(1);
      }

      // Abstract
      if (documentData.abstract) {
        doc.fontSize(10)
           .font('Times-Bold')
           .text('Abstract', { align: 'left' })
           .moveDown(0.3);

        doc.font('Times-Roman')
           .text(documentData.abstract, { align: 'justify' })
           .moveDown(0.5);
      }

      // Keywords
      if (documentData.keywords) {
        doc.fontSize(10)
           .font('Times-Italic')
           .text(`Keywords: ${documentData.keywords}`, { align: 'justify' })
           .moveDown(1);
      }

      // Sections
      if (documentData.sections && documentData.sections.length > 0) {
        documentData.sections.forEach((section: any, index: number) => {
          if (section.title) {
            doc.fontSize(12)
               .font('Times-Bold')
               .text(`${index + 1}. ${section.title}`)
               .moveDown(0.3);
          }

          if (section.content) {
            doc.fontSize(10)
               .font('Times-Roman')
               .text(section.content, { align: 'justify' })
               .moveDown(0.5);
          }

          // Handle content blocks if present
          if (section.content_blocks) {
            section.content_blocks.forEach((block: any) => {
              if (block.type === 'text' && block.content) {
                doc.fontSize(10)
                   .font('Times-Roman')
                   .text(block.content, { align: 'justify' })
                   .moveDown(0.3);
              }
            });
          }
        });
      }

      // References
      if (documentData.references && documentData.references.length > 0) {
        doc.fontSize(12)
           .font('Times-Bold')
           .text('References')
           .moveDown(0.5);

        documentData.references.forEach((ref: any, index: number) => {
          if (ref.text) {
            doc.fontSize(9)
               .font('Times-Roman')
               .text(`[${index + 1}] ${ref.text}`)
               .moveDown(0.2);
          }
        });
      }

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}