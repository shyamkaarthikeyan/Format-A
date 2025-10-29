import { VercelRequest, VercelResponse } from '@vercel/node';
import { neonDb } from '../../_lib/neon-database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use GET.' 
    });
  }

  try {
    console.log('📊 Fetching system health from Neon database...');

    // Test database connectivity
    let databaseStatus = 'healthy';
    let databaseLatency = 0;
    
    try {
      const startTime = Date.now();
      await neonDb.getAllUsers();
      databaseLatency = Date.now() - startTime;
      
      if (databaseLatency > 5000) {
        databaseStatus = 'warning';
      }
    } catch (error) {
      databaseStatus = 'error';
      console.error('Database health check failed:', error);
    }

    // Get basic system metrics
    const systemMetrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    };

    // Get database statistics
    const [userAnalytics, documentAnalytics, downloadAnalytics] = await Promise.allSettled([
      neonDb.getUserAnalytics(),
      neonDb.getDocumentAnalytics(),
      neonDb.getDownloadAnalytics()
    ]);

    const response = {
      success: true,
      data: {
        systemStatus: databaseStatus,
        systemHealth: databaseStatus,
        database: {
          status: databaseStatus,
          latency: databaseLatency,
          connected: databaseStatus !== 'error'
        },
        metrics: {
          uptime: Math.floor(systemMetrics.uptime),
          memory: {
            used: Math.round(systemMetrics.memory.heapUsed / 1024 / 1024),
            total: Math.round(systemMetrics.memory.heapTotal / 1024 / 1024),
            external: Math.round(systemMetrics.memory.external / 1024 / 1024)
          },
          platform: systemMetrics.platform,
          nodeVersion: systemMetrics.nodeVersion,
          environment: systemMetrics.environment
        },
        statistics: {
          users: userAnalytics.status === 'fulfilled' ? {
            total: parseInt(userAnalytics.value.total_users) || 0,
            active: parseInt(userAnalytics.value.active_users) || 0
          } : { total: 0, active: 0 },
          documents: documentAnalytics.status === 'fulfilled' ? {
            total: parseInt(documentAnalytics.value.total_documents) || 0,
            today: parseInt(documentAnalytics.value.documents_today) || 0
          } : { total: 0, today: 0 },
          downloads: downloadAnalytics.status === 'fulfilled' ? {
            total: parseInt(downloadAnalytics.value.total_downloads) || 0,
            today: parseInt(downloadAnalytics.value.downloads_today) || 0
          } : { total: 0, today: 0 }
        }
      },
      timestamp: new Date().toISOString()
    };

    console.log('✅ System health fetched successfully:', {
      status: response.data.systemStatus,
      databaseLatency: response.data.database.latency,
      uptime: response.data.metrics.uptime
    });

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error fetching system health:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch system health',
      data: {
        systemStatus: 'error',
        systemHealth: 'error',
        database: {
          status: 'error',
          latency: 0,
          connected: false
        }
      },
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}