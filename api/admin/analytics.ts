import { VercelRequest, VercelResponse } from '@vercel/node';
import { neonDb } from '../_lib/neon-database.js';

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

  const { type } = req.query;

  try {
    console.log(`📊 Fetching ${type} analytics from Neon database...`);

    switch (type) {
      case 'users':
        return await handleUserAnalytics(res);
      case 'documents':
        return await handleDocumentAnalytics(res);
      case 'downloads':
        return await handleDownloadAnalytics(res);
      case 'system':
        return await handleSystemAnalytics(res);
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid analytics type. Use: users, documents, downloads, or system'
        });
    }
  } catch (error) {
    console.error(`❌ Error fetching ${type} analytics:`, error);
    
    return res.status(500).json({
      success: false,
      error: `Failed to fetch ${type} analytics`,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// User Analytics Handler
async function handleUserAnalytics(res: VercelResponse) {
  const analytics = await neonDb.getUserAnalytics();
  const allUsers = await neonDb.getAllUsers();
  
  const userGrowthData = generateUserGrowthData(allUsers);
  const userActivityData = generateUserActivityData(allUsers);

  const response = {
    success: true,
    data: {
      totalUsers: parseInt(analytics.total_users) || 0,
      activeUsers: parseInt(analytics.active_users) || 0,
      newUsersToday: parseInt(analytics.new_users_today) || 0,
      newUsers7d: parseInt(analytics.new_users_7d) || 0,
      newUsers30d: parseInt(analytics.new_users_30d) || 0,
      activeUsers7d: parseInt(analytics.active_users_7d) || 0,
      activeUsers30d: parseInt(analytics.active_users_30d) || 0,
      userGrowthData,
      userActivityData,
      recentUsers: allUsers.slice(0, 10).map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
        last_login_at: user.last_login_at,
        is_active: user.is_active
      }))
    },
    timestamp: new Date().toISOString()
  };

  console.log('✅ User analytics fetched successfully');
  return res.status(200).json(response);
}

// Document Analytics Handler
async function handleDocumentAnalytics(res: VercelResponse) {
  const analytics = await neonDb.getDocumentAnalytics();
  const allDocuments = await neonDb.getAllDocuments();
  
  const documentTrends = generateDocumentTrends(allDocuments);

  const response = {
    success: true,
    data: {
      totalDocuments: parseInt(analytics.total_documents) || 0,
      documentsToday: parseInt(analytics.documents_today) || 0,
      documents7d: parseInt(analytics.documents_7d) || 0,
      documents30d: parseInt(analytics.documents_30d) || 0,
      documentsThisMonth: parseInt(analytics.documents_30d) || 0,
      documentTrends,
      recentDocuments: allDocuments.slice(0, 10).map(doc => ({
        id: doc.id,
        title: doc.title,
        user_name: (doc as any).user_name || 'Unknown',
        user_email: (doc as any).user_email || 'Unknown',
        created_at: doc.created_at
      }))
    },
    timestamp: new Date().toISOString()
  };

  console.log('✅ Document analytics fetched successfully');
  return res.status(200).json(response);
}

// Download Analytics Handler
async function handleDownloadAnalytics(res: VercelResponse) {
  const analytics = await neonDb.getDownloadAnalytics();
  const allDownloads = await neonDb.getAllDownloads();
  
  const downloadTrends = generateDownloadTrends(allDownloads);
  const formatDistribution = generateFormatDistribution(allDownloads);

  const response = {
    success: true,
    data: {
      totalDownloads: parseInt(analytics.total_downloads) || 0,
      downloadsToday: parseInt(analytics.downloads_today) || 0,
      downloads7d: parseInt(analytics.downloads_7d) || 0,
      downloads30d: parseInt(analytics.downloads_30d) || 0,
      pdfDownloads: parseInt(analytics.pdf_downloads) || 0,
      docxDownloads: parseInt(analytics.docx_downloads) || 0,
      avgFileSize: parseFloat(analytics.avg_file_size) || 0,
      downloadTrends: {
        daily: downloadTrends
      },
      formatDistribution,
      recentDownloads: allDownloads.slice(0, 10).map(download => ({
        id: download.id,
        document_title: download.document_title,
        file_format: download.file_format,
        file_size: download.file_size,
        user_name: (download as any).user_name || 'Unknown',
        user_email: (download as any).user_email || 'Unknown',
        downloaded_at: download.downloaded_at
      }))
    },
    timestamp: new Date().toISOString()
  };

  console.log('✅ Download analytics fetched successfully');
  return res.status(200).json(response);
}

// System Analytics Handler
async function handleSystemAnalytics(res: VercelResponse) {
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

  const systemMetrics = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    platform: process.platform,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  };

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

  console.log('✅ System health fetched successfully');
  return res.status(200).json(response);
}

// Helper Functions
function generateUserGrowthData(users: any[]) {
  const last30Days = [];
  const now = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    
    const newUsers = users.filter(user => {
      const userDate = new Date(user.created_at).toISOString().split('T')[0];
      return userDate === dateStr;
    }).length;
    
    const totalUsers = users.filter(user => 
      new Date(user.created_at) <= date
    ).length;
    
    last30Days.push({
      date: dateStr,
      newUsers,
      totalUsers
    });
  }
  
  return last30Days;
}

function generateUserActivityData(users: any[]) {
  const last7Days = [];
  const now = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    
    const activeUsers = users.filter(user => {
      if (!user.last_login_at) return false;
      const loginDate = new Date(user.last_login_at).toISOString().split('T')[0];
      return loginDate === dateStr;
    }).length;
    
    last7Days.push({
      date: dateStr,
      activeUsers
    });
  }
  
  return last7Days;
}

function generateDocumentTrends(documents: any[]) {
  const last30Days = [];
  const now = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    
    const documentsCreated = documents.filter(doc => {
      const docDate = new Date(doc.created_at).toISOString().split('T')[0];
      return docDate === dateStr;
    }).length;
    
    last30Days.push({
      date: dateStr,
      documents: documentsCreated
    });
  }
  
  return last30Days;
}

function generateDownloadTrends(downloads: any[]) {
  const last30Days = [];
  const now = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    
    const downloadsCount = downloads.filter(download => {
      const downloadDate = new Date(download.downloaded_at).toISOString().split('T')[0];
      return downloadDate === dateStr;
    }).length;
    
    last30Days.push({
      date: dateStr,
      count: downloadsCount
    });
  }
  
  return last30Days;
}

function generateFormatDistribution(downloads: any[]) {
  const formatCounts = downloads.reduce((acc, download) => {
    const format = download.file_format || 'unknown';
    acc[format] = (acc[format] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(formatCounts).map(([format, count]) => ({
    format,
    count: count as number,
    percentage: downloads.length > 0 ? Math.round(((count as number) / downloads.length) * 100) : 0
  }));
}