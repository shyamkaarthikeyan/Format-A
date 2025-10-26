import { VercelRequest, VercelResponse } from '@vercel/node';
import { getStorage } from '../../_lib/storage';
import crypto from 'crypto';

const ADMIN_EMAIL = 'shyamkaarthikeyan@gmail.com';

interface AdminSession {
  sessionId: string;
  userId: string;
  adminPermissions: string[];
  createdAt: string;
  expiresAt: string;
  lastAccessedAt: string;
}

// In-memory storage for admin sessions (use Redis in production)
const adminSessions = new Map<string, AdminSession>();
const adminTokens = new Map<string, string>(); // token -> sessionId

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify user is authenticated
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const storage = getStorage();
    const user = await storage.getUserBySessionId(sessionId);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Verify user is admin
    if (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      console.log(`❌ Admin access denied for ${user.email}`);
      return res.status(403).json({ 
        error: 'Admin access denied',
        message: 'You do not have administrative privileges'
      });
    }

    // Create admin session
    const adminSessionId = `admin_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
    const adminToken = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const adminSession: AdminSession = {
      sessionId: adminSessionId,
      userId: user.id,
      adminPermissions: [
        'view_analytics',
        'manage_users',
        'system_monitoring',
        'download_reports',
        'admin_panel_access'
      ],
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastAccessedAt: now.toISOString()
    };

    // Store admin session and token
    adminSessions.set(adminSessionId, adminSession);
    adminTokens.set(adminToken, adminSessionId);

    console.log(`✅ Admin session created for ${user.email}`);

    return res.status(201).json({
      success: true,
      adminSession,
      adminToken,
      message: 'Admin session created successfully'
    });

  } catch (error) {
    console.error('Admin session creation error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to create admin session'
    });
  }
}

// Export for use in other admin endpoints
export { adminSessions, adminTokens };