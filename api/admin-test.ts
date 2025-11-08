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

    console.log('Admin API Test Debug:', {
      rawPath: path,
      pathArray,
      endpoint,
      type,
      query: req.query,
      url: req.url
    });

    // Test different endpoints without database
    switch (endpoint) {
      case 'analytics/users':
      case 'analytics':
        if (type === 'users') {
          return res.json({
            success: true,
            data: {
              totalUsers: 0,
              activeUsers: { last24h: 0, last7d: 0, last30d: 0 },
              userGrowth: { thisMonth: 0, lastMonth: 0, growthRate: 0 },
              message: 'Test data - no database connection'
            }
          });
        }
        break;
      
      case 'analytics/documents':
        if (type === 'documents') {
          return res.json({
            success: true,
            data: {
              totalDocuments: 0,
              documentsThisMonth: 0,
              documentsThisWeek: 0,
              growthRate: 0,
              message: 'Test data - no database connection'
            }
          });
        }
        break;
      
      case 'analytics/downloads':
        if (type === 'downloads') {
          return res.json({
            success: true,
            data: {
              totalDownloads: 0,
              downloadsByFormat: [],
              message: 'Test data - no database connection'
            }
          });
        }
        break;
      
      case 'analytics/system':
        if (type === 'system') {
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
              message: 'Test data - no database connection'
            }
          });
        }
        break;
      
      case 'auth-test':
        return res.json({
          success: true,
          message: 'Auth test endpoint working (no database)',
          timestamp: new Date().toISOString()
        });
      
      case 'test-db':
        return res.json({
          success: false,
          message: 'Database test disabled in test version',
          timestamp: new Date().toISOString()
        });
      
      default:
        console.log('Unknown admin endpoint:', endpoint);
        return res.status(404).json({ 
          error: 'Admin endpoint not found', 
          endpoint,
          availableEndpoints: ['analytics', 'auth-test', 'test-db']
        });
    }

    // Handle analytics with type parameter
    if (endpoint === 'analytics' && type) {
      switch (type) {
        case 'users':
          return res.json({
            success: true,
            data: {
              totalUsers: 0,
              activeUsers: { last24h: 0, last7d: 0, last30d: 0 },
              userGrowth: { thisMonth: 0, lastMonth: 0, growthRate: 0 },
              message: 'Test data - no database connection'
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
              message: 'Test data - no database connection'
            }
          });
        case 'downloads':
          return res.json({
            success: true,
            data: {
              totalDownloads: 0,
              downloadsByFormat: [],
              message: 'Test data - no database connection'
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
              message: 'Test data - no database connection'
            }
          });
        default:
          return res.status(400).json({ 
            error: 'Invalid analytics type', 
            validTypes: ['users', 'documents', 'downloads', 'system'] 
          });
      }
    }

    return res.status(404).json({ 
      error: 'Endpoint not found',
      endpoint,
      type
    });

  } catch (error) {
    console.error('Admin API Test error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}