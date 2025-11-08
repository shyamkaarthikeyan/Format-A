import { VercelRequest, VercelResponse } from '@vercel/node';

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
    const { path, type } = req.query;
    const pathArray = Array.isArray(path) ? path : [path].filter(Boolean);
    const endpoint = pathArray.join('/');

    console.log('Clean Admin API:', { endpoint, type, method: req.method });

    // Handle analytics endpoints with mock data for now
    if (endpoint === 'analytics' && type) {
      switch (type) {
        case 'users':
          return res.json({
            success: true,
            data: {
              totalUsers: 0,
              activeUsers: { last24h: 0, last7d: 0, last30d: 0 },
              userGrowth: { thisMonth: 0, lastMonth: 0, growthRate: 0 },
              userDistribution: { byRegistrationDate: [], byActivity: [] },
              topUsers: [],
              newUsers: { daily: [] }
            }
          });

        case 'documents':
          return res.json({
            success: true,
            data: {
              totalDocuments: 0,
              documentsThisMonth: 0,
              documentsThisWeek: 0,
              growthRate: 0,
              averageLength: 0,
              updateRate: 0,
              popularTopics: [],
              documentTrends: { daily: [] },
              documentDistribution: { byUser: [], bySource: [], byCreationDate: [] },
              recentDocuments: [],
              documentMetrics: { totalWordCount: 0, averageWordsPerDocument: 0, documentsWithUpdates: 0, updateRate: 0 }
            }
          });

        case 'downloads':
          return res.json({
            success: true,
            data: {
              totalDownloads: 0,
              downloadsByFormat: [
                { format: 'pdf', count: 0, percentage: 0 },
                { format: 'docx', count: 0, percentage: 0 }
              ],
              downloadTrends: { daily: [] },
              downloadPatterns: {
                peakHours: [],
                peakDays: [],
                userBehavior: { averageDownloadsPerUser: 0, repeatDownloadRate: 0, immediateDownloadRate: 0 }
              },
              downloadPerformance: { successRate: 100, failureRate: 0, averageFileSize: 0, averageDownloadTime: 0 },
              topDownloadedDocuments: [],
              downloadDistribution: { byUser: [], byDocument: [], byTimeOfDay: [] }
            }
          });

        case 'system':
          return res.json({
            success: true,
            data: {
              uptime: Math.round(process.uptime()),
              memoryUsage: {
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
              },
              systemStatus: 'healthy',
              nodeVersion: process.version,
              platform: process.platform,
              totalDocuments: 0,
              totalUsers: 0
            }
          });

        default:
          return res.status(400).json({ 
            success: false,
            error: 'Invalid analytics type', 
            validTypes: ['users', 'documents', 'downloads', 'system'] 
          });
      }
    }

    // Handle other endpoints
    switch (endpoint) {
      case 'analytics/users':
        return res.json({
          success: true,
          data: {
            totalUsers: 0,
            activeUsers: { last24h: 0, last7d: 0, last30d: 0 },
            userGrowth: { thisMonth: 0, lastMonth: 0, growthRate: 0 },
            message: 'Clean admin API working - database integration pending'
          }
        });

      case 'analytics/documents':
        return res.json({
          success: true,
          data: {
            totalDocuments: 0,
            documentsThisMonth: 0,
            documentsThisWeek: 0,
            growthRate: 0,
            message: 'Clean admin API working - database integration pending'
          }
        });

      case 'analytics/downloads':
        return res.json({
          success: true,
          data: {
            totalDownloads: 0,
            downloadsByFormat: [],
            message: 'Clean admin API working - database integration pending'
          }
        });

      case 'analytics/system':
        return res.json({
          success: true,
          data: {
            uptime: Math.round(process.uptime()),
            memoryUsage: {
              total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
              used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
              percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
            },
            systemStatus: 'healthy',
            nodeVersion: process.version,
            platform: process.platform,
            message: 'Clean admin API working - database integration pending'
          }
        });

      case 'auth-test':
        return res.json({
          success: true,
          message: 'Clean admin auth test working',
          timestamp: new Date().toISOString()
        });

      case 'test-db':
        return res.json({
          success: false,
          message: 'Database test disabled in clean version - will integrate after basic functionality confirmed',
          timestamp: new Date().toISOString()
        });

      case 'users':
        return res.json({
          success: true,
          data: [],
          message: 'Clean admin API working - database integration pending'
        });

      default:
        return res.status(404).json({ 
          success: false,
          error: 'Admin endpoint not found', 
          endpoint,
          availableEndpoints: ['analytics', 'auth-test', 'test-db', 'users']
        });
    }

  } catch (error) {
    console.error('Clean Admin API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}