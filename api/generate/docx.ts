import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const documentData = req.body;
    
    if (!documentData.title) {
      return res.status(400).json({ error: 'Document title is required' });
    }

    // For now, return a simple response indicating the feature is being migrated
    res.status(503).json({ 
      error: 'Document generation is being migrated to Vercel serverless functions',
      message: 'This feature will be available shortly. Please use the original Render deployment for now.',
      suggestion: 'We are working on migrating the Python document generation to Vercel serverless functions.'
    });

  } catch (error) {
    console.error('Document generation error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: (error as Error).message
    });
  }
}