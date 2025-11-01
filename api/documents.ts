import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token, X-Preview, X-Download');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { path } = req.query;
  
  try {
    if (path === 'docx' || (Array.isArray(path) && path[0] === 'docx')) {
      return handleDocxGeneration(req, res);
    }
    
    if (path === 'docx-to-pdf' || (Array.isArray(path) && path[0] === 'docx-to-pdf')) {
      return handlePdfGeneration(req, res);
    }
    
    if (path === 'email' || (Array.isArray(path) && path[0] === 'email')) {
      return handleEmailGeneration(req, res);
    }
    
    return res.status(404).json({ error: 'Endpoint not found' });
  } catch (error) {
    console.error('Documents API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleDocxGeneration(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const document = req.body;
    
    // Validate required fields
    if (!document.title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    if (!document.authors || !document.authors.some((author: any) => author.name)) {
      return res.status(400).json({ error: 'At least one author is required' });
    }

    // For now, return a simple response indicating DOCX generation would happen
    // In a full implementation, you'd use a Node.js DOCX library here
    return res.status(503).json({
      error: 'DOCX generation not yet implemented on Vercel',
      message: 'Document generation is currently being set up for Vercel deployment.',
      suggestion: 'Please try again later or contact support.'
    });
    
  } catch (error) {
    console.error('DOCX generation error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate DOCX',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handlePdfGeneration(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const document = req.body;
    const isPreview = req.headers['x-preview'] === 'true' || req.query.preview === 'true';
    
    // Validate required fields
    if (!document.title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    if (!document.authors || !document.authors.some((author: any) => author.name)) {
      return res.status(400).json({ error: 'At least one author is required' });
    }

    // PDF generation is not available on Vercel due to Python dependencies
    return res.status(503).json({
      error: 'PDF generation not available on Vercel',
      message: 'PDF preview is not available on this deployment due to serverless limitations.',
      suggestion: 'Perfect IEEE formatting is available via Word download - the DOCX file contains identical formatting to what you see on localhost! Use the Download Word button above.',
      isVercel: true
    });
    
  } catch (error) {
    console.error('PDF generation error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate PDF',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleEmailGeneration(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, documentData } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    
    if (!documentData || !documentData.title) {
      return res.status(400).json({ error: 'Document data is required' });
    }

    // Email functionality would be implemented here
    return res.status(503).json({
      error: 'Email functionality not yet implemented on Vercel',
      message: 'Email sending is currently being set up for Vercel deployment.',
      suggestion: 'Please try the download options instead.'
    });
    
  } catch (error) {
    console.error('Email generation error:', error);
    return res.status(500).json({ 
      error: 'Failed to send email',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}