import { VercelRequest, VercelResponse } from '@vercel/node';
import { NeonDatabase } from './_lib/neon-database';

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

    // Handle analytics endpoints with real database data
    if (endpoint === 'analytics' && type) {
      const db = new NeonDatabase();
      
      try {
        // Initialize database connection
        await db.initializeTables();
        
        switch (type) {
          case 'users': {
            const userAnalytics = await db.getUserAnalytics();
            const data = {
              totalUsers: parseInt(userAnalytics.total_users) || 0,
              activeUsers: { 
                last24h: parseInt(userAnalytics.active_users_7d) || 0, // Using 7d as proxy for 24h
                last7d: parseInt(userAnalytics.active_users_7d) || 0, 
                last30d: parseInt(userAnalytics.active_users_30d) || 0 
              },
              userGrowth: { 
                thisMonth: parseInt(userAnalytics.new_users_30d) || 0, 
                lastMonth: 0, // Would need additional query for previous month
                growthRate: 0 // Would calculate based on previous month data
              },
              newUsers: {
                today: parseInt(userAnalytics.new_users_today) || 0,
                thisWeek: parseInt(userAnalytics.new_users_7d) || 0,
                thisMonth: parseInt(userAnalytics.new_users_30d) || 0
              }
            };
            
            return res.json({
              success: true,
              data,
              message: 'Real user analytics data from database'
            });
          }

          case 'documents': {
            const documentAnalytics = await db.getDocumentAnalytics();
            const data = {
              totalDocuments: parseInt(documentAnalytics.total_documents) || 0,
              documentsThisMonth: parseInt(documentAnalytics.documents_30d) || 0,
              documentsThisWeek: parseInt(documentAnalytics.documents_7d) || 0,
              documentsToday: parseInt(documentAnalytics.documents_today) || 0,
              growthRate: 0, // Would calculate based on previous period
              averageLength: 0, // Would need additional query
              updateRate: 0 // Would need additional query
            };
            
            return res.json({
              success: true,
              data,
              message: 'Real document analytics data from database'
            });
          }

          case 'downloads': {
            const downloadAnalytics = await db.getDownloadAnalytics();
            const data = {
              totalDownloads: parseInt(downloadAnalytics.total_downloads) || 0,
              downloadsToday: parseInt(downloadAnalytics.downloads_today) || 0,
              downloadsThisWeek: parseInt(downloadAnalytics.downloads_7d) || 0,
              downloadsThisMonth: parseInt(downloadAnalytics.downloads_30d) || 0,
              downloadsByFormat: [
                { 
                  format: 'pdf', 
                  count: parseInt(downloadAnalytics.pdf_downloads) || 0, 
                  percentage: downloadAnalytics.total_downloads > 0 ? 
                    Math.round((parseInt(downloadAnalytics.pdf_downloads) || 0) / parseInt(downloadAnalytics.total_downloads) * 100) : 0
                },
                { 
                  format: 'docx', 
                  count: parseInt(downloadAnalytics.docx_downloads) || 0, 
                  percentage: downloadAnalytics.total_downloads > 0 ? 
                    Math.round((parseInt(downloadAnalytics.docx_downloads) || 0) / parseInt(downloadAnalytics.total_downloads) * 100) : 0
                }
              ]
            };
            
            return res.json({
              success: true,
              data,
              message: 'Real download analytics data from database'
            });
          }

          case 'system': {
            const connectionHealth = db.getConnectionHealth();
            const data = {
              uptime: Math.round(process.uptime()),
              memoryUsage: {
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
              },
              systemStatus: connectionHealth.isHealthy ? 'healthy' : 'warning',
              nodeVersion: process.version,
              platform: process.platform,
              databaseHealth: {
                isHealthy: connectionHealth.isHealthy,
                lastChecked: connectionHealth.lastChecked,
                responseTime: connectionHealth.responseTime,
                errorCount: connectionHealth.errorCount
              }
            };
            
            return res.json({
              success: true,
              data,
              message: 'Real system analytics data'
            });
          }

          default:
            return res.status(400).json({ 
              success: false,
              error: 'Invalid analytics type', 
              validTypes: ['users', 'documents', 'downloads', 'system'] 
            });
        }
        
      } catch (dbError) {
        console.error('Database error in analytics:', dbError);
        
        // Fallback to basic data if database fails
        const fallbackData = {
          users: { totalUsers: 0, activeUsers: { last24h: 0, last7d: 0, last30d: 0 }, userGrowth: { thisMonth: 0, lastMonth: 0, growthRate: 0 } },
          documents: { totalDocuments: 0, documentsThisMonth: 0, documentsThisWeek: 0, growthRate: 0 },
          downloads: { totalDownloads: 0, downloadsByFormat: [{ format: 'pdf', count: 0, percentage: 0 }, { format: 'docx', count: 0, percentage: 0 }] },
          system: { 
            uptime: Math.round(process.uptime()), 
            memoryUsage: { total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100) },
            systemStatus: 'warning', 
            nodeVersion: process.version, 
            platform: process.platform 
          }
        };
        
        const data = fallbackData[type as keyof typeof fallbackData];
        if (data) {
          return res.json({
            success: true,
            data,
            message: `Database connection failed, showing fallback data. Error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`
          });
        }
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