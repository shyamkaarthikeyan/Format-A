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

    // Handle analytics endpoints with real database data (with graceful fallback)
    if (endpoint === 'analytics' && type) {
      
      // Define fallback mock data
      const mockData = {
        users: {
          totalUsers: 42,
          activeUsers: { last24h: 12, last7d: 28, last30d: 35 },
          userGrowth: { thisMonth: 8, lastMonth: 6, growthRate: 33.3 },
          newUsers: { today: 2, thisWeek: 8, thisMonth: 8 }
        },
        documents: {
          totalDocuments: 156,
          documentsThisMonth: 23,
          documentsThisWeek: 7,
          documentsToday: 3,
          growthRate: 15.2,
          averageLength: 2500,
          updateRate: 12.5
        },
        downloads: {
          totalDownloads: 89,
          downloadsToday: 5,
          downloadsThisWeek: 18,
          downloadsThisMonth: 45,
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
          platform: process.platform,
          databaseHealth: {
            isHealthy: false,
            lastChecked: new Date().toISOString(),
            responseTime: 0,
            errorCount: 0
          }
        }
      };

      // Try to get real database data first
      let useRealData = false;
      let realData = null;
      
      try {
        // Only attempt database connection if DATABASE_URL exists
        if (process.env.DATABASE_URL) {
          console.log('Attempting database connection for analytics...');
          
          const db = new NeonDatabase();
          
          // Test connection first
          const isHealthy = await db.testConnection();
          
          if (isHealthy) {
            console.log('Database connection successful, fetching real data...');
            
            // Initialize tables if needed
            await db.initializeTables();
            
            // Get real analytics data based on type
            switch (type) {
              case 'users': {
                const userAnalytics = await db.getUserAnalytics();
                realData = {
                  totalUsers: parseInt(userAnalytics.total_users) || 0,
                  activeUsers: { 
                    last24h: parseInt(userAnalytics.active_users_7d) || 0,
                    last7d: parseInt(userAnalytics.active_users_7d) || 0, 
                    last30d: parseInt(userAnalytics.active_users_30d) || 0 
                  },
                  userGrowth: { 
                    thisMonth: parseInt(userAnalytics.new_users_30d) || 0, 
                    lastMonth: 0,
                    growthRate: 0
                  },
                  newUsers: {
                    today: parseInt(userAnalytics.new_users_today) || 0,
                    thisWeek: parseInt(userAnalytics.new_users_7d) || 0,
                    thisMonth: parseInt(userAnalytics.new_users_30d) || 0
                  }
                };
                useRealData = true;
                break;
              }

              case 'documents': {
                const documentAnalytics = await db.getDocumentAnalytics();
                realData = {
                  totalDocuments: parseInt(documentAnalytics.total_documents) || 0,
                  documentsThisMonth: parseInt(documentAnalytics.documents_30d) || 0,
                  documentsThisWeek: parseInt(documentAnalytics.documents_7d) || 0,
                  documentsToday: parseInt(documentAnalytics.documents_today) || 0,
                  growthRate: 0,
                  averageLength: 0,
                  updateRate: 0
                };
                useRealData = true;
                break;
              }

              case 'downloads': {
                const downloadAnalytics = await db.getDownloadAnalytics();
                const totalDownloads = parseInt(downloadAnalytics.total_downloads) || 0;
                const pdfDownloads = parseInt(downloadAnalytics.pdf_downloads) || 0;
                const docxDownloads = parseInt(downloadAnalytics.docx_downloads) || 0;
                
                realData = {
                  totalDownloads,
                  downloadsToday: parseInt(downloadAnalytics.downloads_today) || 0,
                  downloadsThisWeek: parseInt(downloadAnalytics.downloads_7d) || 0,
                  downloadsThisMonth: parseInt(downloadAnalytics.downloads_30d) || 0,
                  downloadsByFormat: [
                    { 
                      format: 'pdf', 
                      count: pdfDownloads, 
                      percentage: totalDownloads > 0 ? Math.round((pdfDownloads / totalDownloads) * 100) : 0
                    },
                    { 
                      format: 'docx', 
                      count: docxDownloads, 
                      percentage: totalDownloads > 0 ? Math.round((docxDownloads / totalDownloads) * 100) : 0
                    }
                  ]
                };
                useRealData = true;
                break;
              }

              case 'system': {
                const connectionHealth = db.getConnectionHealth();
                realData = {
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
                useRealData = true;
                break;
              }
            }
          } else {
            console.warn('Database connection test failed, using mock data');
          }
        } else {
          console.warn('DATABASE_URL not found, using mock data');
        }
      } catch (dbError) {
        console.error('Database error, falling back to mock data:', dbError);
        useRealData = false;
      }

      // Return appropriate data
      const dataToReturn = useRealData ? realData : mockData[type as keyof typeof mockData];
      const message = useRealData 
        ? `Real ${type} analytics data from database`
        : `Mock ${type} analytics data (database unavailable)`;

      if (dataToReturn) {
        return res.json({
          success: true,
          data: dataToReturn,
          message,
          dataSource: useRealData ? 'database' : 'mock'
        });
      } else {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid analytics type', 
          validTypes: ['users', 'documents', 'downloads', 'system'] 
        });
      }
    }

    // Default response for non-analytics endpoints
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