import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Check environment variables (without exposing sensitive data)
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
      DATABASE_URL_PREFIX: process.env.DATABASE_URL?.substring(0, 20) + '...',
      POSTGRES_URL_EXISTS: !!process.env.POSTGRES_URL,
      GOOGLE_CLIENT_ID_EXISTS: !!process.env.VITE_GOOGLE_CLIENT_ID,
      JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
      timestamp: new Date().toISOString(),
      platform: process.platform,
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };

    console.log('Environment diagnostic:', envCheck);

    return res.status(200).json({
      success: true,
      message: 'Environment diagnostic complete',
      data: envCheck
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Debug endpoint failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}