import { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { type, endpoint } = req.query;
    
    // Route based on endpoint parameter
    switch (endpoint) {
      case 'debug-env':
        return handleDebugEnv(req, res);
      case 'test-db':
        return handleTestDb(req, res);
      case 'analytics':
        return handleAnalytics(req, res, type as string);
      case 'users':
        return handleUsers(req, res);
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid endpoint',
          validEndpoints: ['debug-env', 'test-db', 'analytics', 'users']
        });
    }
  } catch (error) {
    console.error('Diagnostics API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Debug Environment Handler
function handleDebugEnv(req: VercelRequest, res: VercelResponse) {
  try {
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
      DATABASE_URL_PREFIX: process.env.DATABASE_URL?.substring(0, 20) + '...',
      POSTGRES_URL_EXISTS: !!process.env.POSTGRES_URL,
      GOOGLE_CLIENT_ID_EXISTS: !!process.env.VITE_GOOGLE_CLIENT_ID,
      JWT_SECRET_EXISTS: !!process.env.JWT_SECRET,
      timestamp: new Date().toISOString(),
      platform: process.platform,
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };

    return res.status(200).json({
      success: true,
      message: 'Environment diagnostic complete',
      data: envCheck
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Debug endpoint failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Test Database Handler
async function handleTestDb(req: VercelRequest, res: VercelResponse) {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        error: 'MISSING_DATABASE_URL',
        message: 'DATABASE_URL environment variable is not set'
      });
    }

    const sql = neon(process.env.DATABASE_URL, {
      fullResults: true,
      arrayMode: false
    });

    const startTime = Date.now();
    const result = await sql`SELECT 1 as test, NOW() as current_time`;
    const responseTime = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      message: 'Database connection successful',
      data: {
        responseTime: `${responseTime}ms`,
        result: result.rows[0],
        connectionInfo: {
          hasUrl: !!process.env.DATABASE_URL,
          urlPrefix: process.env.DATABASE_URL.substring(0, 20) + '...',
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    return res.status(500).json({
      success: false,
      error: 'DATABASE_CONNECTION_FAILED',
      message: error instanceof Error ? error.message : 'Unknown database error'
    });
  }
}

// Analytics Handler
async function handleAnalytics(req: VercelRequest, res: VercelResponse, type: string) {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        error: 'MISSING_DATABASE_URL',
        message: 'DATABASE_URL environment variable is not set in Vercel'
      });
    }

    const sql = neon(process.env.DATABASE_URL, {
      fullResults: true,
      arrayMode: false
    });

    await sql`SELECT 1 as test`;

    const mockData = {
      users: {
        totalUsers: 5,
        newUsers: { daily: [], weekly: [], monthly: [] },
        activeUsers: { last24h: 2, last7d: 3, last30d: 5 },
        userGrowth: { thisMonth: 2, lastMonth: 1, growthRate: 100 },
        userDistribution: {
          byRegistrationDate: [
            { period: 'Last 7 days', count: 2 },
            { period: 'Last 30 days', count: 5 }
          ],
          byActivity: [
            { category: 'Active', count: 3 },
            { category: 'New', count: 2 }
          ]
        },
        topUsers: []
      },
      documents: {
        totalDocuments: 10,
        documentsThisMonth: 5,
        documentsThisWeek: 2,
        growthRate: 25,
        averageLength: 1500,
        updateRate: 80,
        popularTopics: [],
        documentTrends: { daily: [], weekly: [], monthly: [] },
        documentDistribution: { byUser: [], bySource: [], byCreationDate: [] },
        recentDocuments: [],
        documentMetrics: { totalWordCount: 15000, averageWordsPerDocument: 1500, documentsWithUpdates: 8, updateRate: 80 }
      },
      downloads: {
        totalDownloads: 20,
        downloadsByFormat: [
          { format: 'pdf', count: 12, percentage: 60 },
          { format: 'docx', count: 8, percentage: 40 }
        ],
        downloadTrends: { daily: [], weekly: [], monthly: [] },
        downloadPatterns: {
          peakHours: [],
          peakDays: [],
          userBehavior: { averageDownloadsPerUser: 4, repeatDownloadRate: 60, immediateDownloadRate: 30 }
        },
        downloadPerformance: { successRate: 95, failureRate: 5, averageFileSize: 1024, averageDownloadTime: 5 },
        topDownloadedDocuments: [],
        downloadDistribution: { byUser: [], byDocument: [], byTimeOfDay: [] }
      },
      system: {
        uptime: Math.round(process.uptime()),
        memoryUsage: {
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
        },
        systemStatus: 'healthy',
        nodeVersion: process.version,
        platform: process.platform,
        totalDocuments: 10,
        totalUsers: 5
      }
    };

    switch (type) {
      case 'users':
        return res.json({ success: true, data: mockData.users });
      case 'documents':
        return res.json({ success: true, data: mockData.documents });
      case 'downloads':
        return res.json({ success: true, data: mockData.downloads });
      case 'system':
        return res.json({ success: true, data: mockData.system });
      default:
        return res.status(400).json({ 
          success: false,
          error: 'Invalid analytics type', 
          validTypes: ['users', 'documents', 'downloads', 'system'] 
        });
    }
  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({
      success: false,
      error: 'Database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Users Handler
async function handleUsers(req: VercelRequest, res: VercelResponse) {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        error: 'MISSING_DATABASE_URL',
        message: 'DATABASE_URL environment variable is not set in Vercel'
      });
    }

    const sql = neon(process.env.DATABASE_URL, {
      fullResults: true,
      arrayMode: false
    });

    await sql`SELECT 1 as test`;

    const mockUsers = [
      {
        id: 'user_1',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: '2024-10-01T10:00:00Z',
        lastLoginAt: '2024-10-29T15:30:00Z',
        documentCount: 3,
        downloadCount: 5,
        isActive: true,
        status: 'active'
      },
      {
        id: 'user_2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        createdAt: '2024-09-15T14:20:00Z',
        lastLoginAt: '2024-10-28T09:15:00Z',
        documentCount: 7,
        downloadCount: 12,
        isActive: true,
        status: 'active'
      },
      {
        id: 'user_3',
        name: 'Bob Johnson',
        email: 'bob@example.com',
        createdAt: '2024-08-20T11:45:00Z',
        lastLoginAt: '2024-09-30T16:20:00Z',
        documentCount: 1,
        downloadCount: 2,
        isActive: false,
        status: 'inactive'
      },
      {
        id: 'user_4',
        name: 'Alice Brown',
        email: 'alice@example.com',
        createdAt: '2024-10-25T08:30:00Z',
        lastLoginAt: '2024-10-29T12:45:00Z',
        documentCount: 2,
        downloadCount: 3,
        isActive: true,
        status: 'active'
      },
      {
        id: 'user_5',
        name: 'Charlie Wilson',
        email: 'charlie@example.com',
        createdAt: '2024-07-10T13:15:00Z',
        lastLoginAt: null,
        documentCount: 0,
        downloadCount: 0,
        isActive: false,
        status: 'inactive'
      }
    ];

    const activeUsers = mockUsers.filter(u => u.isActive).length;
    const newUsersThisMonth = mockUsers.filter(u => 
      new Date(u.createdAt) > new Date('2024-10-01')
    ).length;

    return res.json({
      success: true,
      data: {
        users: mockUsers,
        pagination: {
          page: 1,
          limit: 20,
          total: mockUsers.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        },
        summary: {
          totalUsers: mockUsers.length,
          activeUsers,
          newUsersThisMonth,
          suspendedUsers: 0
        }
      }
    });
  } catch (error) {
    console.error('Users error:', error);
    return res.status(500).json({
      success: false,
      error: 'Database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}