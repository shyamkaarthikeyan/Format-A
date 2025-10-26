import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if this is a preview request (no download recording needed)
    const isPreview = req.query.preview === 'true' || req.headers['x-preview'] === 'true';
    
    let user = null;
    
    if (!isPreview) {
      // Get user from session for actual downloads
      let sessionId = req.cookies?.sessionId;
      if (!sessionId) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          sessionId = authHeader.replace('Bearer ', '');
        }
      }

      if (!sessionId) {
        return res.status(401).json({ 
          success: false,
          error: 'Authentication required',
          message: 'Please sign in to download documents'
        });
      }

      user = await storage.getUserBySessionId(sessionId);
      if (!user) {
        return res.status(401).json({ 
          success: false,
          error: 'Invalid session',
          message: 'Please sign in again'
        });
      }
    }

    const documentData = req.body;
    
    if (!documentData.title) {
      return res.status(400).json({ 
        error: 'Missing document title',
        message: 'Document title is required'
      });
    }

    console.log('Generating PDF for:', isPreview ? 'preview' : `user: ${user?.email}`);
    console.log('Document title:', documentData.title);

    // For now, return a simple mock PDF file
    // In production, this would call the Python script or use a PDF generation library
    const mockPdfContent = createMockPdfContent(documentData);
    
    // Only record download for actual downloads, not previews
    if (!isPreview && user) {
      const downloadRecord = await storage.recordDownload({
        userId: user.id,
        documentId: `doc_${Date.now()}`,
        documentTitle: documentData.title,
        fileFormat: 'pdf',
        fileSize: mockPdfContent.length,
        downloadedAt: new Date().toISOString(),
        ipAddress: (req.headers['x-forwarded-for'] as string) || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        status: 'completed',
        emailSent: false,
        documentMetadata: {
          pageCount: Math.ceil((documentData.sections?.length || 1) / 2), // Estimate pages
          wordCount: estimateWordCount(documentData),
          sectionCount: documentData.sections?.length || 1,
          figureCount: 0,
          referenceCount: documentData.references?.length || 0,
          generationTime: 3.2
        }
      });

      console.log('Download recorded:', downloadRecord.id);
    } else {
      console.log('Preview generated - no download record created');
    }

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.pdf"');
    
    return res.send(Buffer.from(mockPdfContent));

  } catch (error) {
    console.error('PDF generation error:', error);
    return res.status(500).json({
      error: 'Document generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function createMockPdfContent(documentData: any): string {
  // This is a very basic mock PDF content
  // In production, you'd use a proper PDF library like PDFKit or call Python script
  const pdfHeader = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
50 750 Td
(IEEE Paper: ${documentData.title || 'Untitled'}) Tj
0 -20 Td
(Authors: ${documentData.authors?.map((a: any) => a.name).join(', ') || 'Unknown'}) Tj
0 -40 Td
(Abstract: ${(documentData.abstract || 'No abstract').substring(0, 100)}...) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000136 00000 n 
0000000271 00000 n 
0000000524 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
593
%%EOF`;

  return pdfHeader;
}

function estimateWordCount(documentData: any): number {
  let wordCount = 0;
  
  if (documentData.abstract) {
    wordCount += documentData.abstract.split(' ').length;
  }
  
  if (documentData.sections) {
    documentData.sections.forEach((section: any) => {
      if (section.content) {
        wordCount += section.content.split(' ').length;
      }
    });
  }
  
  return wordCount;
}