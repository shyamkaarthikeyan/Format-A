import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../server/storage.js';
import { RestrictionMiddleware, RESTRICTION_CONFIGS } from './_lib/restriction-middleware';

// Extract user from session token in Authorization header or cookie
async function extractUser(req: VercelRequest) {
  try {
    // Try to get session ID from Authorization header first
    let sessionId = req.headers.authorization?.toString().replace('Bearer ', '');
    
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
      }
      
      // Also try req.cookies as fallback
      if (!sessionId && req.cookies?.sessionId) {
        sessionId = req.cookies.sessionId;
      }
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

// Handle individual download by ID
async function handleDownloadById(req: VercelRequest, res: VercelResponse) {
  return RestrictionMiddleware.enforce(
    req,
    res,
    RESTRICTION_CONFIGS.download,
    async () => {
      try {
        await RestrictionMiddleware.logRestrictedAttempt(req, 'download', true);

        const user = (req as any).user; // User attached by middleware
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
        await RestrictionMiddleware.logRestrictedAttempt(req, 'download', false, 'Internal error');
        res.status(500).json({
          success: false,
          error: {
            code: 'DOWNLOAD_FETCH_ERROR',
            message: 'Failed to fetch download'
          }
        });
      }
    }
  );
}

// Handle download history
async function handleDownloadHistory(req: VercelRequest, res: VercelResponse) {
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

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const paginatedDownloads = await storage.getUserDownloads(user.id, {
      page,
      limit,
      sortBy: 'downloadedAt',
      sortOrder: 'desc'
    });

    res.json({
      success: true,
      data: paginatedDownloads
    });
  } catch (error) {
    console.error('Error fetching download history:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DOWNLOAD_HISTORY_ERROR',
        message: 'Failed to fetch download history'
      }
    });
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

  // Route based on query parameters
  const { id, action } = req.query;

  if (id) {
    // Handle individual download by ID: /api/downloads?id=123
    return handleDownloadById(req, res);
  } else if (action === 'history') {
    // Handle download history: /api/downloads?action=history
    return handleDownloadHistory(req, res);
  } else {
    // Default to history if no specific action
    return handleDownloadHistory(req, res);
  }
}