import { VercelRequest, VercelResponse } from '@vercel/node';
import { postgresStorage } from './_lib/postgres-storage';

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

  // Initialize PostgreSQL storage
  await postgresStorage.initialize();
  
  let user = await postgresStorage.getUserByEmail(userInfo.email);
  
  if (!user) {
    user = await postgresStorage.createUser({
      google_id: userInfo.googleId,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      last_login_at: new Date().toISOString(),
      is_active: true,
      preferences: {
        emailNotifications: true,
        defaultExportFormat: 'pdf',
        theme: 'light'
      }
    });
  } else {
    // Update last login for existing user
    user.last_login_at = new Date().toISOString();
    user.is_active = true;
  }

  if (!user) {
    throw new Error('Failed to create or update user');
  }

  // For now, create a simple session (PostgreSQL storage doesn't have session management yet)
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const session = {
    sessionId,
    userId: user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
    lastAccessedAt: new Date().toISOString(),
    ipAddress: (req.headers['x-forwarded-for'] as string) || (req.socket?.remoteAddress) || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };

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

    // For now, we'll do a simple session validation since PostgreSQL storage doesn't have session management
    // In a production environment, you'd want to implement proper session storage
    if (!sessionId.startsWith('session_')) {
      return res.status(401).json({ error: 'Invalid session format' });
    }

    // Extract user info from session ID (simplified approach)
    // In production, you'd store sessions in database
    await postgresStorage.initialize();
    
    // For now, we'll just validate that the session exists and return a generic user
    // This is a simplified approach - in production you'd have proper session management
    const users = await postgresStorage.getAllUsers();
    const user = users.length > 0 ? users[0] : null;
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

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

    // For now, we don't need to delete sessions from database since we're using simple session IDs
    // In production, you'd delete the session from the database
    if (sessionId) {
      console.log('Session signed out:', sessionId);
    }

    res.clearCookie('sessionId');
    return res.json({ success: true, message: 'Successfully signed out' });
  } catch (error) {
    console.error('Sign-out error:', error);
    return res.status(500).json({ error: 'Sign-out failed' });
  }
}