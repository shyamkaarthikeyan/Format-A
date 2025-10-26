import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../server/storage.js';

// Extract user from session token in Authorization header or cookie
async function extractUser(req: VercelRequest) {
  try {
    console.log('🔍 Auth Verify - extractUser called');
    console.log('🔍 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('🔍 Cookies object:', req.cookies);
    console.log('🔍 Cookie header:', req.headers.cookie);
    
    // Try to get session ID from Authorization header first
    let sessionId = req.headers.authorization?.toString().replace('Bearer ', '');
    console.log('🔍 Session ID from Authorization header:', sessionId);
    
    // If not in header, try cookie - manual parsing since req.cookies might not work
    if (!sessionId) {
      const cookieHeader = req.headers.cookie;
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc: any, cookie) => {
          const [name, value] = cookie.trim().split('=');
          acc[name] = value;
          return acc;
        }, {});
        sessionId = cookies.sessionId;
        console.log('🔍 Parsed cookies:', cookies);
        console.log('🔍 Session ID from parsed cookies:', sessionId);
      }
      
      // Also try req.cookies as fallback
      if (!sessionId && req.cookies?.sessionId) {
        sessionId = req.cookies.sessionId;
        console.log('🔍 Session ID from req.cookies:', sessionId);
      }
    }

    console.log('🔍 Final session ID:', sessionId);

    if (!sessionId) {
      console.log('❌ No session ID found');
      return null;
    }

    // Get session from storage
    const session = await storage.getSession(sessionId);
    if (!session || !session.isActive) {
      return null;
    }

    // Update last accessed time
    await storage.updateSessionAccess(sessionId);

    // Get user from storage
    const user = await storage.getUserById(session.userId);
    if (!user || !user.isActive) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error extracting user:', error);
    return null;
  }
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

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only GET method is allowed'
      }
    });
  }

  try {
    const user = await extractUser(req);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to access this resource'
        }
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Session verification error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'VERIFICATION_ERROR',
        message: 'Failed to verify session'
      }
    });
  }
}