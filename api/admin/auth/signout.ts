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
      return res.status(400).json({ 
        error: 'Admin token required' 
      });
    }

    // Get session ID from token
    const sessionId = adminTokens.get(adminToken);
    
    if (sessionId) {
      // Remove admin session
      adminSessions.delete(sessionId);
      console.log(`🔓 Admin session ${sessionId} signed out`);
    }

    // Remove token
    adminTokens.delete(adminToken);

    return res.status(200).json({
      success: true,
      message: 'Admin session signed out successfully'
    });

  } catch (error) {
    console.error('Admin sign out error:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}