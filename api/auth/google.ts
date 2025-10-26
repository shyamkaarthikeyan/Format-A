import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../server/storage.js';

// Helper function to get client IP address
function getClientIP(req: VercelRequest): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
         req.headers['x-real-ip'] as string ||
         '127.0.0.1';
}

// Helper function to get user agent
function getUserAgent(req: VercelRequest): string {
  return req.headers['user-agent'] || 'Unknown';
}

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
    const { googleId, email, name, picture, preferences } = req.body;

    if (!googleId || !email || !name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_USER_DATA',
          message: 'Missing required user data from Google OAuth'
        }
      });
    }

    // Check if user already exists
    let user = await storage.getUserByGoogleId(googleId);
    
    if (user) {
      // Update existing user's last login
      user = await storage.updateUser(user.id, {
        lastLoginAt: new Date().toISOString(),
        name, // Update name in case it changed
        picture // Update picture in case it changed
      });
    } else {
      // Create new user
      user = await storage.createUser({
        googleId,
        email,
        name,
        picture,
        lastLoginAt: new Date().toISOString(),
        isActive: true,
        preferences: preferences || {
          emailNotifications: true,
          defaultExportFormat: 'pdf',
          theme: 'light'
        }
      });
    }

    if (!user) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'USER_CREATION_FAILED',
          message: 'Failed to create or update user'
        }
      });
    }

    // Create session
    const session = await storage.createSession({
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      isActive: true,
      lastAccessedAt: new Date().toISOString(),
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req)
    });

    res.json({
      success: true,
      user,
      sessionId: session.sessionId
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Internal authentication error'
      }
    });
  }
}