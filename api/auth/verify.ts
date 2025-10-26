import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check for session cookie or authorization header
    let sessionId = req.cookies?.sessionId;
    
    if (!sessionId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        sessionId = authHeader.replace('Bearer ', '');
      }
    }

    if (!sessionId) {
      return res.status(401).json({ 
        success: false,
        error: 'Not authenticated',
        message: 'No session found'
      });
    }

    // Get user by session
    const user = await storage.getUserBySessionId(sessionId);
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid session',
        message: 'Session not found or expired'
      });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        isActive: user.isActive,
        preferences: user.preferences
      }
    });

  } catch (error) {
    console.error('Auth verify error:', error);
    return res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}