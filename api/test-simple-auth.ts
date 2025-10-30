import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Simple test without external dependencies
    console.log('🔍 Testing simple auth endpoint...');
    
    // Check environment variables
    const hasGoogleClientId = !!process.env.VITE_GOOGLE_CLIENT_ID;
    const hasJwtSecret = !!process.env.JWT_SECRET;
    const hasDatabaseUrl = !!process.env.DATABASE_URL;
    
    return res.status(200).json({
      success: true,
      message: 'Simple auth test successful',
      environment: {
        hasGoogleClientId,
        hasJwtSecret,
        hasDatabaseUrl,
        nodeVersion: process.version,
        platform: process.platform
      }
    });
  } catch (error) {
    console.error('Simple auth test error:', error);
    return res.status(500).json({
      success: false,
      error: 'Simple auth test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}