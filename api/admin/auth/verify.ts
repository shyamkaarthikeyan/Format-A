import { VercelRequest, VercelResponse } from '@vercel/node';
import { adminSessions, adminTokens } from './session';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminToken = req.headers['x-admin-token'] as string;
    
    if (!adminToken) {
      return res.status(401).json({ 
        valid: false,
        error: 'Admin token required' 
      });
    }

    // Get session ID from token
    const sessionId = adminTokens.get(adminToken);
    if (!sessionId) {
      return res.status(401).json({ 
        valid: false,
        error: 'Invalid admin token' 
      });
    }

    // Get admin session
    const adminSession = adminSessions.get(sessionId);
    if (!adminSession) {
      // Clean up orphaned token
      adminTokens.delete(adminToken);
      return res.status(401).json({ 
        valid: false,
        error: 'Admin session not found' 
      });
    }

    // Check if session is expired
    if (new Date(adminSession.expiresAt) < new Date()) {
      // Clean up expired session
      adminSessions.delete(sessionId);
      adminTokens.delete(adminToken);
      return res.status(401).json({ 
        valid: false,
        error: 'Admin session expired' 
      });
    }

    // Update last accessed time
    adminSession.lastAccessedAt = new Date().toISOString();
    adminSessions.set(sessionId, adminSession);

    return res.status(200).json({
      valid: true,
      session: adminSession,
      message: 'Admin session is valid'
    });

  } catch (error) {
    console.error('Admin session verification error:', error);
    return res.status(500).json({ 
      valid: false,
      error: 'Internal server error' 
    });
  }
}