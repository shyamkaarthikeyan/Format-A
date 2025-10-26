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
    
    // Create some sample download records for testing if none exist
    const existingDownloads = await storage.getUserDownloads(user.id);
    
    if (existingDownloads.downloads.length === 0) {
      console.log('Creating sample download records for user:', user.id);
      
      // Create sample downloads
      const sampleDownloads = [
        {
          userId: user.id,
          documentId: 'sample_doc_1',
          documentTitle: 'Machine Learning in Healthcare',
          fileFormat: 'pdf' as const,
          fileSize: 1024 * 1024, // 1MB
          downloadedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          ipAddress: '127.0.0.1',
          userAgent: 'Test Browser',
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
          documentTitle: 'Deep Learning Applications',
          fileFormat: 'docx' as const,
          fileSize: 2 * 1024 * 1024, // 2MB
          downloadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          ipAddress: '127.0.0.1',
          userAgent: 'Test Browser',
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
        }
      ];
      
      for (const download of sampleDownloads) {
        await storage.recordDownload(download);
      }
    }
    
    const downloads = await storage.getUserDownloads(user.id);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      downloads: downloads.downloads.length,
      sampleData: downloads.downloads
    });
  } catch (error) {
    console.error('Debug auth error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to debug auth', 
      details: (error as Error).message 
    });
  }
}