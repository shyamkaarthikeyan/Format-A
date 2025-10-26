import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../server/storage.js';

// Extract user from session token in Authorization header or cookie
async function extractUser(req: VercelRequest) {
  try {
    console.log('🔍 Debug - extractUser called');
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

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    let paginatedDownloads = await storage.getUserDownloads(user.id, {
      page,
      limit,
      sortBy: 'downloadedAt',
      sortOrder: 'desc'
    });

    // If user has no downloads, create some sample data for demonstration
    if (paginatedDownloads.downloads.length === 0) {
      console.log('🔍 Creating sample download data for user:', user.id);
      
      const sampleDownloads = [
        {
          userId: user.id,
          documentId: 'sample_doc_1',
          documentTitle: 'Machine Learning in Healthcare Applications',
          fileFormat: 'pdf' as const,
          fileSize: 1024 * 1024, // 1MB
          downloadedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          ipAddress: '127.0.0.1',
          userAgent: 'Sample Browser',
          status: 'completed' as const,
          emailSent: true,
          emailSentAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          documentMetadata: {
            pageCount: 12,
            wordCount: 3500,
            sectionCount: 6,
            figureCount: 3,
            referenceCount: 25,
            generationTime: 5000
          }
        },
        {
          userId: user.id,
          documentId: 'sample_doc_2',
          documentTitle: 'Deep Learning Applications in Computer Vision',
          fileFormat: 'docx' as const,
          fileSize: 2 * 1024 * 1024, // 2MB
          downloadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          ipAddress: '127.0.0.1',
          userAgent: 'Sample Browser',
          status: 'completed' as const,
          emailSent: false,
          documentMetadata: {
            pageCount: 18,
            wordCount: 5200,
            sectionCount: 8,
            figureCount: 5,
            referenceCount: 42,
            generationTime: 7500
          }
        },
        {
          userId: user.id,
          documentId: 'sample_doc_3',
          documentTitle: 'Neural Networks for Natural Language Processing',
          fileFormat: 'pdf' as const,
          fileSize: 1.5 * 1024 * 1024, // 1.5MB
          downloadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
          ipAddress: '127.0.0.1',
          userAgent: 'Sample Browser',
          status: 'completed' as const,
          emailSent: true,
          emailSentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          documentMetadata: {
            pageCount: 15,
            wordCount: 4200,
            sectionCount: 7,
            figureCount: 4,
            referenceCount: 38,
            generationTime: 6200
          }
        }
      ];
      
      // Create sample downloads
      for (const download of sampleDownloads) {
        try {
          await storage.recordDownload(download);
          console.log('✅ Created sample download:', download.documentTitle);
        } catch (error) {
          console.error('❌ Error creating sample download:', error);
        }
      }
      
      // Fetch downloads again after creating samples
      paginatedDownloads = await storage.getUserDownloads(user.id, {
        page,
        limit,
        sortBy: 'downloadedAt',
        sortOrder: 'desc'
      });
    }

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