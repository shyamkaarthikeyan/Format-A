import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { neon } from '@neondatabase/serverless';

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

// Extract user from JWT token in Authorization header
async function extractUserFromToken(req: VercelRequest) {
  try {
    let token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return null;
    }

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    if (!decoded.userId || !decoded.email) {
      return null;
    }

    // Get user from database
    const sql = getSql();
    const result = await sql`SELECT * FROM users WHERE id = ${decoded.userId} AND is_active = true LIMIT 1`;
    const users = result.rows || result;
    
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Error extracting user from token:', error);
    return null;
  }
}

// Handle individual download by ID
async function handleDownloadById(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await extractUserFromToken(req);
    
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
    
    // Get download from database
    const sql = getSql();
    const result = await sql`
      SELECT * FROM downloads 
      WHERE id = ${downloadId} AND user_id = ${user.id}
      LIMIT 1
    `;
    const downloads = result.rows || result;
    
    if (downloads.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOWNLOAD_NOT_FOUND',
          message: 'Download record not found'
        }
      });
    }

    const download = downloads[0];
    
    res.json({
      success: true,
      data: {
        id: download.id,
        userId: download.user_id,
        documentTitle: download.document_title,
        fileFormat: download.file_format,
        fileSize: download.file_size,
        downloadedAt: download.downloaded_at,
        ipAddress: download.ip_address,
        userAgent: download.user_agent,
        status: download.status,
        emailSent: download.email_sent,
        documentMetadata: download.document_metadata
      }
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

// Handle download history
async function handleDownloadHistory(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await extractUserFromToken(req);
    
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
    const offset = (page - 1) * limit;
    
    // Get downloads from database
    const sql = getSql();
    
    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total 
      FROM downloads 
      WHERE user_id = ${user.id}
    `;
    const totalItems = parseInt((countResult.rows || countResult)[0].total);
    
    // Get paginated downloads
    const downloadsResult = await sql`
      SELECT * FROM downloads 
      WHERE user_id = ${user.id}
      ORDER BY downloaded_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const downloads = downloadsResult.rows || downloadsResult;

    const totalPages = Math.ceil(totalItems / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const paginatedDownloads = {
      downloads: downloads.map(download => ({
        id: download.id,
        userId: download.user_id,
        documentTitle: download.document_title,
        fileFormat: download.file_format,
        fileSize: download.file_size,
        downloadedAt: download.downloaded_at,
        ipAddress: download.ip_address,
        userAgent: download.user_agent,
        status: download.status,
        emailSent: download.email_sent,
        documentMetadata: download.document_metadata
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        hasNext,
        hasPrev
      }
    };

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
    const user = await extractUserFromToken(req);
    
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
    const ipAddress = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Record download in database
    const sql = getSql();
    const downloadId = `download_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    const result = await sql`
      INSERT INTO downloads (
        id, user_id, document_title, file_format, file_size, 
        downloaded_at, ip_address, user_agent, status, email_sent, document_metadata
      )
      VALUES (
        ${downloadId}, ${user.id}, ${documentTitle}, ${fileFormat.toLowerCase()}, ${fileSize || 0},
        NOW(), ${Array.isArray(ipAddress) ? ipAddress[0] : ipAddress}, ${userAgent}, 
        'completed', false, ${JSON.stringify(documentMetadata || {})}
      )
      RETURNING *
    `;

    const downloadRecord = (result.rows || result)[0];

    res.json({
      success: true,
      data: {
        id: downloadRecord.id,
        userId: downloadRecord.user_id,
        documentTitle: downloadRecord.document_title,
        fileFormat: downloadRecord.file_format,
        fileSize: downloadRecord.file_size,
        downloadedAt: downloadRecord.downloaded_at,
        ipAddress: downloadRecord.ip_address,
        userAgent: downloadRecord.user_agent,
        status: downloadRecord.status,
        emailSent: downloadRecord.email_sent,
        documentMetadata: downloadRecord.document_metadata
      },
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