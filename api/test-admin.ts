import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('Test Admin API Request:', {
    method: req.method,
    url: req.url,
    query: req.query,
    headers: {
      'x-admin-token': req.headers['x-admin-token'] ? 'present' : 'missing',
      origin: req.headers.origin,
      'user-agent': req.headers['user-agent']
    },
    timestamp: new Date().toISOString()
  });

  try {
    const { adminEmail } = req.query;
    const ADMIN_EMAIL = 'shyamkaarthikeyan@gmail.com';
    
    // Simple admin check without database
    const adminToken = req.headers['x-admin-token'] as string;
    const hasAdminAccess = 
      adminEmail === ADMIN_EMAIL || 
      (adminToken && adminToken.startsWith('admin_token_'));

    return res.json({
      success: true,
      message: 'Test admin API is working',
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        vercelRegion: process.env.VERCEL_REGION || 'unknown',
        nodeEnv: process.env.NODE_ENV || 'unknown'
      },
      request: {
        method: req.method,
        hasAdminEmail: adminEmail === ADMIN_EMAIL,
        hasAdminToken: !!adminToken,
        tokenValid: adminToken ? adminToken.startsWith('admin_token_') : false,
        hasAdminAccess
      },
      testData: {
        totalUsers: 5,
        totalDocuments: 3,
        totalDownloads: 8,
        systemStatus: 'healthy'
      }
    });
  } catch (error) {
    console.error('Test admin API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Test admin API error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}