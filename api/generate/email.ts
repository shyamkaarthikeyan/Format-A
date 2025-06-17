import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, documentData } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    
    if (!documentData) {
      return res.status(400).json({ error: 'Document data is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // For now, return a simple response indicating the feature is being migrated
    res.status(503).json({ 
      error: 'Email functionality is being migrated to Vercel serverless functions',
      message: 'This feature will be available shortly. Please use the original Render deployment for now.',
      suggestion: 'We are working on migrating the email functionality to work with Vercel serverless functions.'
    });

  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ 
      error: 'Failed to send email', 
      details: (error as Error).message 
    });
  }
}