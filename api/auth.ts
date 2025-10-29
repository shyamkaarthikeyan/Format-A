import { VercelRequest, VercelResponse } from '@vercel/node';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { neonDb } from './_lib/neon-database';

const client = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);

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
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    // Check environment variables first
    if (!process.env.VITE_GOOGLE_CLIENT_ID) {
      console.error('❌ Missing VITE_GOOGLE_CLIENT_ID environment variable');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: Missing Google Client ID'
      });
    }

    if (!process.env.DATABASE_URL) {
      console.error('❌ Missing DATABASE_URL environment variable');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: Missing database URL'
      });
    }

    // Initialize database on first request
    console.log('🔧 Initializing database...');
    await neonDb.initialize();
    console.log('✅ Database initialized successfully');

    const { credential, googleId, email, name, picture } = req.body || {};

    let userInfo: {
      googleId: string;
      email: string;
      name: string;
      picture?: string;
    };

    if (credential) {
      // Handle JWT credential format
      console.log('Processing JWT credential...');
      try {
        // Verify the Google ID token
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: process.env.VITE_GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if (!payload || !payload.email_verified) {
          return res.status(400).json({
            success: false,
            error: 'Invalid or unverified Google token'
          });
        }

        userInfo = {
          googleId: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture
        };
      } catch (e) {
        console.log('JWT verification failed:', e);
        return res.status(400).json({ 
          success: false,
          error: 'Invalid Google credential' 
        });
      }
    } else if (googleId && email && name) {
      // Handle decoded user data format (from client)
      console.log('Processing decoded user data...');
      userInfo = {
        googleId,
        email,
        name,
        picture: picture || 'https://via.placeholder.com/150'
      };
    } else {
      console.log('Missing required authentication data:', req.body);
      return res.status(400).json({ 
        success: false,
        error: 'Missing authentication data',
        message: 'Either credential (JWT) or user data (googleId, email, name) is required'
      });
    }

    console.log('🔐 Processing Google OAuth for user:', userInfo.email);

    // Create or update user in Neon database
    const user = await neonDb.createOrUpdateUser({
      google_id: userInfo.googleId,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture
    });

    // Create JWT token for our application
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
    const appToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        googleId: user.google_id
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    console.log('✅ User authenticated and saved to database:', user.email);

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        google_id: user.google_id,
        created_at: user.created_at,
        last_login_at: user.last_login_at
      },
      token: appToken,
      sessionId: `session_${user.id}_${Date.now()}`, // For compatibility
      message: user.created_at === user.updated_at ? 'Welcome! Account created.' : 'Welcome back!'
    });

  } catch (error) {
    console.error('❌ Google OAuth error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Authentication failed. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function handleVerify(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let token = req.headers.authorization?.replace('Bearer ', '');
    if (!token && req.cookies?.sessionId) {
      token = req.cookies.sessionId;
    }

    if (!token) {
      return res.status(401).json({ error: 'No token found' });
    }

    // Try to verify JWT token first
    try {
      const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      // Initialize database and get user
      await neonDb.initialize();
      const user = await neonDb.getUserById(decoded.userId);
      
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
    } catch (jwtError) {
      // If JWT verification fails, try session ID format
      if (!token.startsWith('session_')) {
        return res.status(401).json({ error: 'Invalid token format' });
      }

      // Initialize database and get first user (simplified approach)
      await neonDb.initialize();
      const users = await neonDb.getAllUsers();
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
    }
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