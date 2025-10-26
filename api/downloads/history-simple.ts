import { VercelRequest, VercelResponse } from '@vercel/node';

// Simple in-memory storage for demonstration (in production, this would be a database)
const mockUsers = new Map();
const mockSessions = new Map();
const mockDownloads = new Map();

// Helper function to extract session ID
function extractSessionId(req: VercelRequest): string | null {
  // Try Authorization header first
  let sessionId = req.headers.authorization?.toString().replace('Bearer ', '');
  
  // If not in header, try cookie
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
  
  return sessionId;
}

// Create sample data for a user
function createSampleDownloads(userId: string) {
  const downloads = [
    {
      id: `download_${Date.now()}_1`,
      userId,
      documentId: 'sample_doc_1',
      documentTitle: 'Machine Learning in Healthcare Applications',
      fileFormat: 'pdf',
      fileSize: 1024 * 1024,
      downloadedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      ipAddress: '127.0.0.1',
      userAgent: 'Sample Browser',
      status: 'completed',
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
      id: `download_${Date.now()}_2`,
      userId,
      documentId: 'sample_doc_2',
      documentTitle: 'Deep Learning Applications in Computer Vision',
      fileFormat: 'docx',
      fileSize: 2 * 1024 * 1024,
      downloadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      ipAddress: '127.0.0.1',
      userAgent: 'Sample Browser',
      status: 'completed',
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
      id: `download_${Date.now()}_3`,
      userId,
      documentId: 'sample_doc_3',
      documentTitle: 'Neural Networks for Natural Language Processing',
      fileFormat: 'pdf',
      fileSize: 1.5 * 1024 * 1024,
      downloadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      ipAddress: '127.0.0.1',
      userAgent: 'Sample Browser',
      status: 'completed',
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

  // Store downloads
  downloads.forEach(download => {
    mockDownloads.set(download.id, download);
  });

  return downloads;
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

  console.log('🔍 Simple download history called');
  console.log('🔍 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('🔍 Cookie header:', req.headers.cookie);

  try {
    const sessionId = extractSessionId(req);
    console.log('🔍 Extracted session ID:', sessionId);

    // For demo purposes, create a mock user if session exists
    if (sessionId) {
      const mockUser = {
        id: 'demo-user-' + sessionId.slice(-8),
        name: 'Demo User',
        email: 'demo@example.com'
      };

      // Create sample downloads for this user
      const downloads = createSampleDownloads(mockUser.id);

      const paginatedDownloads = {
        downloads,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: downloads.length,
          hasNext: false,
          hasPrev: false
        }
      };

      console.log('✅ Returning sample downloads for user:', mockUser.id);

      return res.json({
        success: true,
        data: paginatedDownloads,
        debug: {
          sessionId,
          user: mockUser,
          message: 'This is demo data - in production this would come from a database'
        }
      });
    } else {
      console.log('❌ No session ID found');
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to access this resource'
        },
        debug: {
          sessionId: null,
          cookieHeader: req.headers.cookie,
          authHeader: req.headers.authorization
        }
      });
    }
  } catch (error) {
    console.error('Error in simple download history:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
}