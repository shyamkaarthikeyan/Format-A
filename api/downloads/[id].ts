import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../server/storage.js';

// Extract user from session token in Authorization header or cookie
async function extractUser(req: VercelRequest) {
  try {
    // Try to get session ID from Authorization header first
    let sessionId = req.headers.authorization?.toString().replace('Bearer ', '');
    
    // If not in header, try cookie
    if (!sessionId && req.cookies?.sessionId) {
      sessionId = req.cookies.sessionId;
    }

    if (!sessionId) {
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

    const downloadId = req.query.id as string;
    const download = await storage.getDownloadById(downloadId);

    if (!download) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOWNLOAD_NOT_FOUND',
          message: 'Download record not found'
        }
      });
    }

    // Check if user owns this download
    if (download.userId !== user.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have access to this download'
        }
      });
    }

    res.json({
      success: true,
      data: download
    });
  } catch (error) {
    console.error('Error fetching download:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DOWNLOAD_FETCH_ERROR',
        message: 'Failed to fetch download'
      }
    });
  }
}