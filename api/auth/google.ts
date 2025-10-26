import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage.js';

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
    console.log('Google auth handler called:', {
      method: req.method,
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : []
    });

    const { credential } = req.body || {};
    
    if (!credential) {
      console.log('Missing credential in request body:', req.body);
      return res.status(400).json({ error: 'Missing credential' });
    }

    console.log('Google auth attempt with credential:', credential.substring(0, 50) + '...');
    
    // Test storage connection
    console.log('Testing storage connection...');
    const testUsers = await storage.getAllUsers();
    console.log('Storage test successful, user count:', testUsers.length);

    // In production, verify the Google JWT token here
    // For now, create a real user in our storage system
    
    // Decode the JWT to get user info (simplified for demo)
    // In production, use proper JWT verification
    let userInfo;
    try {
      // Use Buffer.from instead of atob for Node.js compatibility
      const payload = JSON.parse(Buffer.from(credential.split('.')[1], 'base64').toString());
      userInfo = {
        googleId: payload.sub || 'google_' + Date.now(),
        email: payload.email || 'user@example.com',
        name: payload.name || 'Demo User',
        picture: payload.picture || 'https://via.placeholder.com/150'
      };
    } catch (e) {
      console.log('JWT decode failed, using fallback:', e);
      // Fallback for demo
      userInfo = {
        googleId: 'google_' + Date.now(),
        email: 'user@example.com',
        name: 'Demo User',
        picture: 'https://via.placeholder.com/150'
      };
    }

    console.log('Attempting to find/create user with info:', userInfo);

    // Check if user exists
    let user = await storage.getUserByGoogleId(userInfo.googleId);
    console.log('Existing user found:', !!user);
    
    if (!user) {
      console.log('Creating new user...');
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
      console.log('New user created:', user.id);
    } else {
      console.log('Updating existing user login time...');
      // Update last login
      user = await storage.updateUser(user.id, {
        lastLoginAt: new Date().toISOString(),
        isActive: true
      });
      console.log('User updated:', user?.id);
    }

    if (!user) {
      throw new Error('Failed to create or update user');
    }

    console.log('Creating session for user:', user.id);
    // Create session
    const session = await storage.createSession({
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      isActive: true,
      lastAccessedAt: new Date().toISOString(),
      ipAddress: (req.headers['x-forwarded-for'] as string) || (req.socket?.remoteAddress) || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });
    console.log('Session created:', session.sessionId);

    // Set session cookie
    res.setHeader('Set-Cookie', `sessionId=${session.sessionId}; Path=/; Max-Age=${7 * 24 * 60 * 60}; HttpOnly; SameSite=Lax`);

    console.log('Returning successful auth response');
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