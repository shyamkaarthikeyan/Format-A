import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from './_lib/storage.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
        return await handleVerify(req, res);
      case 'signout':
        return await handleSignout(req, res);
      default:
        return res.status(404).json({ error: 'Auth endpoint not found' });
    }
  } catch (error) {
    console.error('Auth API error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGoogleAuth(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { credential, googleId, email, name, picture } = req.body || {};
  
  let userInfo;
  if (credential) {
    try {
      const payload = JSON.parse(Buffer.from(credential.split('.')[1], 'base64').toString());
      userInfo = {
        googleId: payload.sub || 'google_' + Date.now(),
        email: payload.email || 'user@example.com',
        name: payload.name || 'Demo User',
        picture: payload.picture || 'https://via.placeholder.com/150'
      };
    } catch (e) {
      return res.status(400).json({ error: 'Invalid credential format' });
    }
  } else if (googleId && email) {
    userInfo = { googleId, email, name: name || 'User', picture: picture || 'https://via.placeholder.com/150' };
  } else {
    return res.status(400).json({ 
      error: 'Missing authentication data',
      message: 'Either credential (JWT) or user data (googleId, email) is required'
    });
  }

  let user = await storage.getUserByGoogleId(userInfo.googleId);
  
  if (!user) {
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
    user = await storage.updateUser(user.id, {
      lastLoginAt: new Date().toISOString(),
      isActive: true
    });
  }

  if (!user) {
    throw new Error('Failed to create or update user');
  }

  const session = await storage.createSession({
    userId: user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
    lastAccessedAt: new Date().toISOString(),
    ipAddress: (req.headers['x-forwarded-for'] as string) || (req.socket?.remoteAddress) || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  });

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
}

async function handleVerify(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let sessionId = req.headers.authorization?.replace('Bearer ', '');
    if (!sessionId && req.cookies?.sessionId) {
      sessionId = req.cookies.sessionId;
    }

    if (!sessionId) {
      return res.status(401).json({ error: 'No session found' });
    }

    const session = await storage.getSession(sessionId);
    if (!session || !session.isActive || new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const user = await storage.getUserById(session.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    await storage.updateSession(sessionId, {
      lastAccessedAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture
      }
    });
  } catch (error) {
    console.error('Session verification error:', error);
    return res.status(500).json({ error: 'Verification failed' });
  }
}

async function handleSignout(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let sessionId = req.headers.authorization?.replace('Bearer ', '');
    if (!sessionId && req.cookies?.sessionId) {
      sessionId = req.cookies.sessionId;
    }

    if (sessionId) {
      await storage.deleteSession(sessionId);
    }

    res.clearCookie('sessionId');
    return res.json({ success: true, message: 'Successfully signed out' });
  } catch (error) {
    console.error('Sign-out error:', error);
    return res.status(500).json({ error: 'Sign-out failed' });
  }
}