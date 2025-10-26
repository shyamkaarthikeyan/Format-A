import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({ error: 'Missing credential' });
    }

    console.log('Google auth attempt with credential:', credential.substring(0, 50) + '...');

    // In production, verify the Google JWT token here
    // For now, create a real user in our storage system
    
    // Decode the JWT to get user info (simplified for demo)
    // In production, use proper JWT verification
    let userInfo;
    try {
      const payload = JSON.parse(atob(credential.split('.')[1]));
      userInfo = {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      };
    } catch (e) {
      // Fallback for demo
      userInfo = {
        googleId: 'google_' + Date.now(),
        email: 'user@example.com',
        name: 'Demo User',
        picture: 'https://via.placeholder.com/150'
      };
    }

    // Check if user exists
    let user = await storage.getUserByGoogleId(userInfo.googleId);
    
    if (!user) {
      // Create new user
      user = await storage.createUser({
        googleId: userInfo.googleId,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        lastLoginAt: new Date().toISOString(),
        isActive: true,
        preferences: {
          emailNotifications: true,
          defaultExportFormat: 'pdf',
          theme: 'light'
        }
      });
    } else {
      // Update last login
      user = await storage.updateUser(user.id, {
        lastLoginAt: new Date().toISOString(),
        isActive: true
      });
    }

    // Create session
    const session = await storage.createSession({
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      isActive: true,
      lastAccessedAt: new Date().toISOString(),
      ipAddress: req.headers['x-forwarded-for'] as string || req.connection?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    // Set session cookie
    res.setHeader('Set-Cookie', `sessionId=${session.sessionId}; Path=/; Max-Age=${7 * 24 * 60 * 60}; HttpOnly; SameSite=Lax`);

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture
      },
      sessionId: session.sessionId
    });

  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}