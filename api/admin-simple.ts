import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Simple test without any imports
    return res.status(200).json({
      success: true,
      message: 'Simple admin API working',
      timestamp: new Date().toISOString(),
      query: req.query,
      method: req.method
    });
  } catch (error) {
    console.error('Simple admin API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Simple admin API failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}