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
    // Get user from session
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

    const user = await storage.getUserBySessionId(sessionId);
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid session',
        message: 'Please sign in again'
      });
    }

    const documentData = req.body;
    
    if (!documentData.title) {
      return res.status(400).json({ 
        error: 'Missing document title',
        message: 'Document title is required'
      });
    }

    console.log('Generating DOCX for user:', user.email);
    console.log('Document title:', documentData.title);

    // For now, return a simple mock DOCX file
    // In production, this would call the Python script or use a document generation library
    const mockDocxContent = createMockDocxContent(documentData);
    
    // Record download in storage
    const downloadRecord = await storage.recordDownload({
      userId: user.id,
      documentId: `doc_${Date.now()}`,
      documentTitle: documentData.title,
      fileFormat: 'docx',
      fileSize: mockDocxContent.length,
      downloadedAt: new Date().toISOString(),
      ipAddress: (req.headers['x-forwarded-for'] as string) || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      status: 'completed',
      emailSent: false,
      documentMetadata: {
        pageCount: Math.ceil(documentData.sections?.length || 1),
        wordCount: estimateWordCount(documentData),
        sectionCount: documentData.sections?.length || 1,
        figureCount: 0,
        referenceCount: documentData.references?.length || 0,
        generationTime: 2.5
      }
    });

    console.log('Download recorded:', downloadRecord.id);

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="ieee_paper.docx"');
    
    return res.send(Buffer.from(mockDocxContent));

  } catch (error) {
    console.error('DOCX generation error:', error);
    return res.status(500).json({
      error: 'Document generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function createMockDocxContent(documentData: any): string {
  // This is a simplified mock. In production, you'd use a proper DOCX library
  // or call the Python script to generate the actual document
  const content = `
IEEE Paper: ${documentData.title}

Authors: ${documentData.authors?.map((a: any) => a.name).join(', ') || 'Unknown'}

Abstract:
${documentData.abstract || 'No abstract provided.'}

${documentData.sections?.map((section: any, index: number) => `
${index + 1}. ${section.title || `Section ${index + 1}`}
${section.content || 'No content provided.'}
`).join('\n') || ''}

References:
${documentData.references?.map((ref: any, index: number) => `
[${index + 1}] ${ref.text || ref.title || 'Reference'}
`).join('\n') || 'No references provided.'}
`;

  return content;
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