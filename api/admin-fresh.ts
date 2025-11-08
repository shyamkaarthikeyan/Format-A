import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { path, type } = req.query;
    const pathArray = Array.isArray(path) ? path : [path].filter(Boolean);
    const endpoint = pathArray.join('/');

    console.log('Fresh Admin API:', { endpoint, type, method: req.method });

    // Handle analytics endpoints
    if (endpoint === 'analytics' && type) {
      const mockData = {
        users: {
          totalUsers: 42,
          activeUsers: { last24h: 12, last7d: 28, last30d: 35 },
          userGrowth: { thisMonth: 8, lastMonth: 6, growthRate: 33.3 }
        },
        documents: {
          totalDocuments: 156,
          documentsThisMonth: 23,
          documentsThisWeek: 7,
          growthRate: 15.2
        },
        downloads: {
          totalDownloads: 89,
          downloadsByFormat: [
            { format: 'pdf', count: 67, percentage: 75.3 },
            { format: 'docx', count: 22, percentage: 24.7 }
          ]
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
          platform: process.platform
        }
      };

      const data = mockData[type as keyof typeof mockData];
      if (data) {
        return res.json({
          success: true,
          data,
          message: 'Fresh admin API working with mock data'
        });
      }
    }

    // Default response
    return res.json({
      success: true,
      message: 'Fresh admin API is working!',
      endpoint,
      timestamp: new Date().toISOString(),
      availableEndpoints: ['analytics?type=users', 'analytics?type=documents', 'analytics?type=downloads', 'analytics?type=system']
    });

  } catch (error) {
    console.error('Fresh Admin API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}