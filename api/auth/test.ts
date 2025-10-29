import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Check environment variables
    const envCheck = {
      VITE_GOOGLE_CLIENT_ID: !!process.env.VITE_GOOGLE_CLIENT_ID,
      DATABASE_URL: !!process.env.DATABASE_URL,
      JWT_SECRET: !!process.env.JWT_SECRET,
      NODE_ENV: process.env.NODE_ENV
    };

    return res.status(200).json({
      success: true,
      message: 'Auth test endpoint working',
      environment: envCheck,
      method: req.method,
      body: req.body
    });

  } catch (error) {
    console.error('❌ Auth test error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Auth test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}