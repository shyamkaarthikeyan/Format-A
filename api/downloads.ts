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
  await RestrictionMiddleware.enforce(
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
          res.status(404).json({
            success: false,
            error: {
              code: 'DOWNLOAD_NOT_FOUND',
              message: 'Download record not found'
            }
          });
          return;
        }

        // Check if user owns this download
        if (download.userId !== user.id) {
          res.status(403).json({
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: 'You do not have access to this download'
            }
          });
          return;
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

// Handle recording a new download
async function handleRecordDownload(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await extractUser(req);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to record download'
        }
      });
    }

    const { documentTitle, fileFormat, fileSize, documentMetadata } = req.body;

    if (!documentTitle || !fileFormat) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Document title and file format are required'
        }
      });
    }

    // Get client IP and user agent
    const ipAddress = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const downloadRecord = await storage.recordDownload({
      userId: user.id,
      documentTitle,
      fileFormat: fileFormat.toLowerCase(),
      fileSize: fileSize || 0,
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      userAgent,
      status: 'completed',
      emailSent: false,
      downloadedAt: new Date().toISOString(),
      documentMetadata: documentMetadata || {}
    });

    res.json({
      success: true,
      data: downloadRecord,
      message: 'Download recorded successfully'
    });
  } catch (error) {
    console.error('Error recording download:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DOWNLOAD_RECORD_ERROR',
        message: 'Failed to record download'
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

  // Route based on URL path and method
  const { id, action } = req.query;
  const pathSegments = req.url?.split('/').filter(Boolean) || [];
  const isRecordEndpoint = pathSegments.includes('record');

  if (req.method === 'POST' && isRecordEndpoint) {
    // Handle recording downloads: POST /api/downloads/record
    return handleRecordDownload(req, res);
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only GET method is allowed for this endpoint'
      }
    });
  }

  // Route GET requests based on query parameters
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