import { VercelRequest, VercelResponse } from '@vercel/node';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
// Import database functions directly
import { neon } from '@neondatabase/serverless';

const client = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);

// Initialize SQL connection
let sql: any = null;
function getSql() {
  if (!sql) {
    sql = neon(process.env.DATABASE_URL!, {
      fullResults: true,
      arrayMode: false
    });
  }
  return sql;
}

// Database initialization flag
let isInitialized = false;

// Initialize database tables
async function initializeDatabase() {
  if (isInitialized) return;
  
  try {
    const sql = getSql();
    
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        google_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        picture TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_login_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT true,
        preferences JSONB DEFAULT '{"emailNotifications": true, "defaultExportFormat": "pdf", "theme": "light"}'::jsonb
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    
    isInitialized = true;
    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database tables:', error);
    throw error;
  }
}

// Database helper functions
async function createOrUpdateUser(userData: {
  google_id: string;
  email: string;
  name: string;
  picture?: string;
}) {
  const sql = getSql();
  
  try {
    // Try to find existing user
    const existingUsersResult = await sql`
      SELECT * FROM users WHERE google_id = ${userData.google_id} OR email = ${userData.email}
    `;
    
    // Handle both Neon result formats (with and without .rows)
    const existingUsers = existingUsersResult.rows || existingUsersResult;
    console.log('Found existing users:', existingUsers.length);
    
    if (existingUsers && existingUsers.length > 0) {
      console.log('Updating existing user:', userData.email);
      // Update existing user
      const updateResult = await sql`
        UPDATE users 
        SET name = ${userData.name}, 
            picture = ${userData.picture || 'https://via.placeholder.com/150'},
            last_login_at = NOW(),
            updated_at = NOW()
        WHERE id = ${existingUsers[0].id}
        RETURNING *
      `;
      const updatedUser = (updateResult.rows || updateResult)[0];
      console.log('User updated successfully');
      return updatedUser;
    } else {
      console.log('Creating new user:', userData.email);
      // Create new user
      const createResult = await sql`
        INSERT INTO users (id, google_id, email, name, picture, created_at, updated_at, last_login_at)
        VALUES (gen_random_uuid()::text, ${userData.google_id}, ${userData.email}, ${userData.name}, 
                ${userData.picture || 'https://via.placeholder.com/150'}, NOW(), NOW(), NOW())
        RETURNING *
      `;
      const newUser = (createResult.rows || createResult)[0];
      console.log('New user created successfully');
      return newUser;
    }
  } catch (error) {
    console.error('Database operation error in createOrUpdateUser:', error);
    console.error('Error details:', error.message);
    throw error;
  }
}

async function getUserById(userId: string) {
  const sql = getSql();
  try {
    const result = await sql`SELECT * FROM users WHERE id = ${userId}`;
    const users = result.rows || result;
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Database error in getUserById:', error);
    return null;
  }
}

async function getAllUsers() {
  const sql = getSql();
  try {
    const result = await sql`SELECT * FROM users ORDER BY created_at DESC`;
    return result.rows || result;
  } catch (error) {
    console.error('Database error in getAllUsers:', error);
    return [];
  }
}

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
    // Ensure database is initialized for all endpoints
    await initializeDatabase();
    
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
      success: false,
      error: 'Authentication failed. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    // Database connection is initialized lazily
    console.log('🔧 Database connection ready...');

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
    console.log('User info received:', {
      googleId: userInfo.googleId,
      email: userInfo.email,
      name: userInfo.name,
      hasPicture: !!userInfo.picture
    });

    // Create or update user in Neon database
    let user;
    try {
      console.log('📝 Calling createOrUpdateUser...');
      user = await createOrUpdateUser({
        google_id: userInfo.googleId,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture
      });
      
      if (!user) {
        console.error('❌ createOrUpdateUser returned null/undefined');
        throw new Error('Failed to create or retrieve user from database');
      }
      
      console.log('✅ User successfully created/updated in database:', user.email);
      console.log('User object keys:', Object.keys(user));
    } catch (dbError) {
      console.error('❌ Database error during user creation:', dbError);
      console.error('Error stack:', dbError.stack);
      return res.status(500).json({
        success: false,
        error: 'Database error during authentication',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }

    // Create JWT token for our application
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
    const appToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        googleId: user.google_id,
        iat: Math.floor(Date.now() / 1000) // Issued at time
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    console.log('✅ User authenticated and saved to database:', user.email);
    console.log('🔧 Returning response with camelCase field names...');

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        google_id: user.google_id,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        preferences: {
          emailNotifications: true,
          defaultExportFormat: 'pdf',
          theme: 'light',
          ...(user.preferences || {})
        }
      },
      token: appToken,
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
      
      // Get user from database
      const user = await getUserById(decoded.userId);
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      return res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          createdAt: user.created_at,
          lastLoginAt: user.last_login_at,
          preferences: user.preferences || {
            emailNotifications: true,
            defaultExportFormat: 'pdf',
            theme: 'light'
          }
        }
      });
    } catch (jwtError) {
      // FIXED: No dangerous fallback - return error instead of wrong user
      console.log('JWT verification failed:', jwtError.message);
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        code: 'TOKEN_INVALID'
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

    // Clear cookie by setting it to expire
    res.setHeader('Set-Cookie', 'sessionId=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict');
    return res.json({ success: true, message: 'Successfully signed out' });
  } catch (error) {
    console.error('Sign-out error:', error);
    return res.status(500).json({ error: 'Sign-out failed' });
  }
}