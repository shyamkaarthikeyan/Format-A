import { VercelRequest, VercelResponse } from '@vercel/node';

// Simple in-memory storage for testing (this will reset on each function call in serverless)
const sessions = new Map<string, any>();
const users = new Map<string, any>();

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

  console.log('🔍 Test Auth endpoint called');
  console.log('🔍 Method:', req.method);
  console.log('🔍 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('🔍 Cookies:', req.cookies);
  console.log('🔍 Cookie header:', req.headers.cookie);

  // Extract session ID
  let sessionId = req.headers.authorization?.toString().replace('Bearer ', '');
  
  if (!sessionId) {
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc: any, cookie) => {
        const [name, value] = cookie.trim().split('=');
        acc[name] = value;
        return acc;
      }, {});
      sessionId = cookies.sessionId;
    }
  }

  console.log('🔍 Extracted session ID:', sessionId);

  if (req.method === 'POST') {
    // Create a test session
    const testSessionId = 'test-session-' + Date.now();
    const testUser = {
      id: 'test-user-1',
      name: 'Test User',
      email: 'test@example.com',
      googleId: 'test-google-id'
    };

    sessions.set(testSessionId, { userId: testUser.id, isActive: true });
    users.set(testUser.id, testUser);

    console.log('🔍 Created test session:', testSessionId);
    console.log('🔍 Created test user:', testUser);

    res.json({
      success: true,
      message: 'Test session created',
      sessionId: testSessionId,
      user: testUser
    });
  } else {
    // Verify session
    if (!sessionId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_SESSION_ID',
          message: 'No session ID found in request'
        }
      });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SESSION',
          message: 'Session not found or expired'
        }
      });
    }

    const user = users.get(session.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    res.json({
      success: true,
      message: 'Session verified',
      user,
      sessionId,
      sessionData: session
    });
  }
}