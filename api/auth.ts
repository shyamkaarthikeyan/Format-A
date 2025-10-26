import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { path } = req.query;
  const pathArray = Array.isArray(path) ? path : [path].filter(Boolean);
  const endpoint = pathArray.join('/');

  try {
    switch (endpoint) {
      case 'google':
        return await handleGoogleAuth(req, res);
      
      case 'verify':
        return await handleVerifyAuth(req, res);
      
      case 'signout':
        return await handleSignOut(req, res);
      
      default:
        return res.status(404).json({ error: 'Auth endpoint not found' });
    }
  } catch (error) {
    console.error('Auth API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGoogleAuth(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    // Simplified Google auth for development
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({ error: 'Missing credential' });
    }

    // In production, verify the Google JWT token here
    // For now, return a mock successful response
    return res.json({
      success: true,
      user: {
        id: 'user_' + Date.now(),
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://via.placeholder.com/150'
      },
      sessionId: 'session_' + Date.now()
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleVerifyAuth(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    // Check for session cookie or authorization header
    const sessionId = req.cookies?.sessionId || req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // In production, verify the session with database
    // For now, return a mock user if session exists
    return res.json({
      success: true,
      user: {
        id: 'user_123',
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://via.placeholder.com/150'
      }
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleSignOut(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    // Clear session cookie
    res.setHeader('Set-Cookie', 'sessionId=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax');
    
    return res.json({
      success: true,
      message: 'Signed out successfully'
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}