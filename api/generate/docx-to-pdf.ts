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
  try {
    // Test if PDFKit is available
    console.log('Attempting to load PDFKit...');
    const PDFDocument = require('pdfkit');
    console.log('PDFKit loaded successfully');
    
    return new Promise((resolve, reject) => {
      try {
        console.log('Creating PDF document...');
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
        doc.on('end', () => {
          console.log(`PDF generated successfully, size: ${Buffer.concat(chunks).length} bytes`);
          resolve(Buffer.concat(chunks));
        });
        doc.on('error', (error: any) => {
          console.error('PDF generation error:', error);
          reject(error);
        });

        // Simple content for testing
        doc.fontSize(16)
           .text('IEEE Paper Preview', { align: 'center' })
           .moveDown();

        if (documentData.title) {
          doc.fontSize(14)
             .text(documentData.title, { align: 'center' })
             .moveDown();
        }

        if (documentData.authors && documentData.authors.length > 0) {
          const authorsText = documentData.authors
            .map((author: any) => author.name || '')
            .join(', ');
          
          doc.fontSize(12)
             .text(authorsText, { align: 'center' })
             .moveDown();
        }

        if (documentData.abstract) {
          doc.fontSize(10)
             .text('Abstract', { align: 'left' })
             .moveDown(0.3)
             .text(documentData.abstract)
             .moveDown();
        }

        // Add a simple message
        doc.fontSize(10)
           .text('This is a simplified preview. Download the Word document for full IEEE formatting.')
           .moveDown();

        console.log('Finalizing PDF...');
        doc.end();

      } catch (docError) {
        console.error('Error creating PDF document:', docError);
        reject(docError);
      }
    });

  } catch (requireError) {
    console.error('PDFKit require failed:', requireError);
    throw new Error(`PDFKit not available: ${requireError.message}`);
  }
}