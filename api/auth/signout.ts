import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../server/storage.js';

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

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only POST method is allowed'
      }
    });
  }

  try {
    // Get session ID from cookie or header
    let sessionId = req.headers.authorization?.toString().replace('Bearer ', '');
    if (!sessionId && req.cookies?.sessionId) {
      sessionId = req.cookies.sessionId;
    }

    if (sessionId) {
      // Delete the session from storage
      await storage.deleteSession(sessionId);
    }

    // Clear the session cookie
    res.setHeader('Set-Cookie', 'sessionId=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax');

    res.json({
      success: true,
      message: 'Successfully signed out'
    });
  } catch (error) {
    console.error('Sign-out error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SIGNOUT_ERROR',
        message: 'Failed to sign out'
      }
    });
  }
}