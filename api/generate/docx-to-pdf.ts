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
      // PDF preview not available on Vercel - return helpful message
      return res.status(503).json({
        error: 'PDF preview not available on this deployment',
        message: 'PDF generation is not supported in this serverless environment. Perfect IEEE formatting is available via Word download.',
        suggestion: 'Use the Download Word button to get your perfectly formatted IEEE paper.',
        workaround: 'The DOCX file contains identical formatting to what you see on localhost.',
        available_formats: ['docx']
      });
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

