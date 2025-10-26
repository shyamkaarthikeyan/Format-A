import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.status(200).json({ 
    message: 'StreamlitToReact IEEE Paper Generator API',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        google: '/api/auth/google',
        verify: '/api/auth/verify',
        signout: '/api/auth/signout'
      },
      downloads: {
        history: '/api/downloads/history',
        byId: '/api/downloads/[id]'
      },
      debug: {
        auth: '/api/debug/auth'
      },
      health: '/api/health',
      test: '/api/test'
    }
  });
}