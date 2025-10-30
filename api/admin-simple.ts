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
    // Check environment variables first
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        error: 'MISSING_DATABASE_URL',
        message: 'DATABASE_URL environment variable is not set in Vercel',
        hint: 'Add DATABASE_URL to Vercel environment variables'
      });
    }

    const { type } = req.query;
    
    // Simple database connection
    const sql = neon(process.env.DATABASE_URL, {
      fullResults: true,
      arrayMode: false
    });

    // Test connection first
    await sql`SELECT 1 as test`;

    // Return mock data for now to test if the basic structure works
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

    // Return data based on type
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
    console.error('Simple admin API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: {
        hasDbUrl: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      }
    });
  }
}