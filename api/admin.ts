import { VercelRequest, VercelResponse } from '@vercel/node';
// import { neonDb } from './_lib/neon-database'; // Temporarily disabled to isolate issue

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
    // Debug environment variables in production
    console.log('Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
      POSTGRES_URL_EXISTS: !!process.env.POSTGRES_URL,
      DATABASE_URL_PREFIX: process.env.DATABASE_URL?.substring(0, 20) + '...'
    });
    const { path, type } = req.query;
    const pathArray = Array.isArray(path) ? path : [path].filter(Boolean);
    const endpoint = pathArray.join('/');

    console.log('Admin API Debug:', {
      rawPath: path,
      pathArray,
      endpoint,
      type,
      query: req.query,
      url: req.url
    });

    // Admin authentication middleware
    const adminToken = req.headers['x-admin-token'] as string;
    
    // Skip auth for session creation and verification endpoints, and analytics for testing
    const skipAuthEndpoints = ['auth/session', 'auth/verify', 'auth/signout', 'analytics', 'auth-test', 'test-db'];
    const needsAuth = !skipAuthEndpoints.includes(endpoint) && !endpoint.startsWith('analytics/');
    
    console.log('Admin API Request:', {
      endpoint,
      needsAuth,
      hasToken: !!adminToken,
      method: req.method
    });
    
    if (needsAuth) {
      if (!adminToken || !adminToken.startsWith('admin_token_')) {
        return res.status(401).json({ 
          success: false,
          error: 'ADMIN_AUTH_REQUIRED', 
          message: 'Valid admin token required. Please sign in as admin.',
          endpoint
        });
      }
    }

    console.log('Admin API processing endpoint:', endpoint);

    // Temporarily mock database for testing
    const mockDb = {
      initialize: async () => { console.log('Mock database initialized'); },
      getAllUsers: async () => [],
      getAllDocuments: async () => [],
      getAllDownloads: async () => []
    };
    
    console.log('Using mock database for testing');

    // Handle analytics endpoints with both old and new routing patterns
    if (endpoint === 'analytics' && type) {
      // Handle /api/admin?path=analytics&type=users pattern
      switch (type) {
        case 'users':
          return await handleUserAnalytics(req, res, mockDb);
        case 'documents':
          return await handleDocumentAnalytics(req, res, mockDb);
        case 'downloads':
          return await handleDownloadAnalytics(req, res, mockDb);
        case 'system':
          return await handleSystemAnalytics(req, res, mockDb);
        default:
          return res.status(400).json({ 
            error: 'Invalid analytics type', 
            validTypes: ['users', 'documents', 'downloads', 'system'] 
          });
      }
    }

    // Route to different admin functions based on path
    switch (endpoint) {
      case 'analytics/users':
        return await handleUserAnalytics(req, res, mockDb);
      
      case 'analytics/documents':
        return await handleDocumentAnalytics(req, res, mockDb);
      
      case 'analytics/downloads':
        return await handleDownloadAnalytics(req, res, mockDb);
      
      case 'analytics/system':
        return await handleSystemAnalytics(req, res, mockDb);
      
      case 'users':
        return await handleUsers(req, res, mockDb);
      
      case 'auth/session':
        return await handleAdminSession(req, res, mockDb);
      
      case 'auth/verify':
        return await handleAdminVerify(req, res, mockDb);
      
      case 'auth/signout':
        return await handleAdminSignout(req, res, mockDb);
      
      // Consolidated endpoints from separate files
      case 'auth-test':
        return await handleAuthTest(req, res);
      
      case 'test-db':
        return await handleDbTest(req, res);
      
      case 'debug':
        return await handleDebug(req, res);
      
      default:
        console.log('Unknown admin endpoint:', endpoint);
        return res.status(404).json({ error: 'Admin endpoint not found', endpoint });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// User Analytics
async function handleUserAnalytics(req: VercelRequest, res: VercelResponse, db: any) {
  try {
    console.log('Starting user analytics...');
    console.log('Database object:', typeof db, Object.keys(db || {}));
    
    if (!db) {
      throw new Error('Database connection not available');
    }
    
    // Add timeout protection for serverless
    const timeout = setTimeout(() => {
      throw new Error('Analytics query timeout - operation took too long');
    }, 8000); // 8 second timeout
    
    try {
      const users = await db.getAllUsers();
      const documents = await db.getAllDocuments();
      clearTimeout(timeout);
      console.log('Real data loaded:', { users: users.length, documents: documents.length });
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const totalUsers = users.length;
    const activeUsers24h = users.filter((user: any) => {
      const lastLogin = user.last_login_at || user.lastLoginAt;
      return lastLogin && new Date(lastLogin) > twentyFourHoursAgo;
    }).length;
    const activeUsers7d = users.filter((user: any) => {
      const lastLogin = user.last_login_at || user.lastLoginAt;
      return lastLogin && new Date(lastLogin) > sevenDaysAgo;
    }).length;
    const activeUsers30d = users.filter((user: any) => {
      const lastLogin = user.last_login_at || user.lastLoginAt;
      return lastLogin && new Date(lastLogin) > thirtyDaysAgo;
    }).length;
    
    const newUsersThisMonth = users.filter((user: any) => {
      const createdAt = user.created_at || user.createdAt;
      return createdAt && new Date(createdAt) >= thisMonth;
    }).length;
    const newUsersLastMonth = users.filter((user: any) => {
      const createdAt = user.created_at || user.createdAt;
      return createdAt && new Date(createdAt) >= lastMonth && new Date(createdAt) < thisMonth;
    }).length;
    
    const growthRate = newUsersLastMonth > 0 
      ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100 
      : newUsersThisMonth > 0 ? 100 : 0;

    // Get user document counts
    const userDocCounts = new Map();
    documents.forEach((doc: any) => {
      const userId = doc.user_id || doc.userId; // Handle both naming conventions
      const count = userDocCounts.get(userId) || 0;
      userDocCounts.set(userId, count + 1);
    });

    // Get user download counts
    const allDownloads = await db.getAllDownloads();
    const userDownloadCounts = new Map();
    allDownloads.forEach((download: any) => {
      const userId = download.user_id || download.userId; // Handle both naming conventions
      const count = userDownloadCounts.get(userId) || 0;
      userDownloadCounts.set(userId, count + 1);
    });

    // Create top users list
    const topUsers = users
      .map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        documentsCreated: userDocCounts.get(user.id) || 0,
        downloadsCount: userDownloadCounts.get(user.id) || 0,
        lastActive: user.last_login_at || user.lastLoginAt || user.created_at || user.createdAt
      }))
      .sort((a: any, b: any) => (b.documentsCreated + b.downloadsCount) - (a.documentsCreated + a.downloadsCount))
      .slice(0, 10);

    // Generate daily registration data for the last 30 days
    const dailyRegistrations = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      const count = users.filter((user: any) => {
        const createdAt = user.created_at || user.createdAt;
        return createdAt && createdAt.startsWith(dateStr);
      }).length;
      dailyRegistrations.push({ date: dateStr, count });
    }

    // User distribution by registration period
    const registrationDistribution = [
      { period: 'Last 7 days', count: users.filter((u: any) => {
        const createdAt = u.created_at || u.createdAt;
        return createdAt && new Date(createdAt) > sevenDaysAgo;
      }).length },
      { period: 'Last 30 days', count: users.filter((u: any) => {
        const createdAt = u.created_at || u.createdAt;
        return createdAt && new Date(createdAt) > thirtyDaysAgo;
      }).length },
      { period: 'Last 3 months', count: users.filter((u: any) => {
        const createdAt = u.created_at || u.createdAt;
        return createdAt && new Date(createdAt) > new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
      }).length },
      { period: 'Older', count: users.filter((u: any) => {
        const createdAt = u.created_at || u.createdAt;
        return createdAt && new Date(createdAt) <= new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
      }).length }
    ];

    // Activity distribution
    const activityDistribution = [
      { category: 'Very Active (10+ docs)', count: users.filter((u: any) => (userDocCounts.get(u.id) || 0) >= 10).length },
      { category: 'Active (3-9 docs)', count: users.filter((u: any) => {
        const docCount = userDocCounts.get(u.id) || 0;
        return docCount >= 3 && docCount < 10;
      }).length },
      { category: 'Moderate (1-2 docs)', count: users.filter((u: any) => {
        const docCount = userDocCounts.get(u.id) || 0;
        return docCount >= 1 && docCount < 3;
      }).length },
      { category: 'New Users (0 docs)', count: users.filter((u: any) => (userDocCounts.get(u.id) || 0) === 0).length }
    ];

    return res.json({
      success: true,
      data: {
        totalUsers,
        newUsers: {
          daily: dailyRegistrations,
          weekly: [], // Could implement if needed
          monthly: [] // Could implement if needed
        },
        activeUsers: {
          last24h: activeUsers24h,
          last7d: activeUsers7d,
          last30d: activeUsers30d
        },
        userGrowth: {
          thisMonth: newUsersThisMonth,
          lastMonth: newUsersLastMonth,
          growthRate
        },
        userDistribution: {
          byRegistrationDate: registrationDistribution,
          byActivity: activityDistribution
        },
        topUsers
      }
    });
  } catch (error) {
    console.error('User analytics error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Document Analytics
async function handleDocumentAnalytics(req: VercelRequest, res: VercelResponse, db: any) {
  try {
    console.log('Starting document analytics...');
    
    const documents = await db.getAllDocuments();
    const users = await db.getAllUsers();
    console.log('Real data loaded:', { documents: documents.length, users: users.length });
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    const totalDocuments = documents.length;
    const documentsThisMonth = documents.filter((doc: any) => {
      const createdAt = doc.created_at || doc.createdAt;
      return createdAt && new Date(createdAt) >= thisMonthStart;
    }).length;
    const documentsLastMonth = documents.filter((doc: any) => {
      const createdAt = doc.created_at || doc.createdAt;
      return createdAt && new Date(createdAt) >= lastMonthStart && new Date(createdAt) < thisMonthStart;
    }).length;
    const documentsThisWeek = documents.filter((doc: any) => {
      const createdAt = doc.created_at || doc.createdAt;
      return createdAt && new Date(createdAt) >= sevenDaysAgo;
    }).length;

    // Calculate growth rate
    const growthRate = documentsLastMonth > 0 
      ? ((documentsThisMonth - documentsLastMonth) / documentsLastMonth) * 100 
      : documentsThisMonth > 0 ? 100 : 0;

    // Calculate average document length (based on content)
    let totalWordCount = 0;
    let documentsWithContent = 0;
    
    documents.forEach((doc: any) => {
      try {
        const content = JSON.parse(doc.content);
        if (content.sections && Array.isArray(content.sections)) {
          const wordCount = content.sections.reduce((sum: number, section: any) => {
            return sum + (section.content ? section.content.split(' ').length : 0);
          }, 0);
          totalWordCount += wordCount;
          documentsWithContent++;
        }
      } catch (e) {
        // Skip documents with invalid JSON content
      }
    });

    const averageLength = documentsWithContent > 0 ? Math.round(totalWordCount / documentsWithContent) : 0;

    // Extract popular topics from document titles
    const topicKeywords = new Map();
    documents.forEach((doc: any) => {
      const title = doc.title.toLowerCase();
      const keywords = ['machine learning', 'healthcare', 'technology', 'quantum', 'blockchain', 'ai', 'data', 'research', 'analysis', 'computing'];
      
      keywords.forEach(keyword => {
        if (title.includes(keyword)) {
          topicKeywords.set(keyword, (topicKeywords.get(keyword) || 0) + 1);
        }
      });
    });

    const popularTopics = Array.from(topicKeywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({
        topic: topic.charAt(0).toUpperCase() + topic.slice(1),
        count
      }));

    // Generate daily creation trends for the last 30 days
    const dailyCreation = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      const count = documents.filter((doc: any) => {
        const createdAt = doc.created_at || doc.createdAt;
        return createdAt && createdAt.startsWith(dateStr);
      }).length;
      dailyCreation.push({ date: dateStr, count });
    }

    // Document distribution by user
    const userDocCounts = new Map();
    documents.forEach((doc: any) => {
      const userId = doc.user_id || doc.userId;
      const count = userDocCounts.get(userId) || 0;
      userDocCounts.set(userId, count + 1);
    });

    const documentsByUser = Array.from(userDocCounts.entries())
      .map(([userId, count]) => {
        const user = users.find((u: any) => u.id === userId);
        return {
          userId,
          userName: user?.name || 'Unknown User',
          documentCount: count
        };
      })
      .sort((a, b) => b.documentCount - a.documentCount)
      .slice(0, 10);

    // Document source distribution
    const sourceDistribution = documents.reduce((acc: any, doc: any) => {
      const source = doc.source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    const documentsBySource = Object.entries(sourceDistribution).map(([source, count]) => ({
      source: source.charAt(0).toUpperCase() + source.slice(1).replace('_', ' '),
      count
    }));

    // Recent documents with author info
    const recentDocuments = documents
      .slice(0, 10)
      .map((doc: any) => {
        const userId = doc.user_id || doc.userId;
        const author = users.find((u: any) => u.id === userId);
        return {
          id: doc.id,
          title: doc.title,
          author: author?.name || 'Unknown',
          createdAt: doc.created_at || doc.createdAt,
          updatedAt: doc.updated_at || doc.updatedAt,
          source: doc.source || 'web'
        };
      });

    // Document activity metrics
    const documentsWithUpdates = documents.filter((doc: any) => {
      const createdAt = doc.created_at || doc.createdAt;
      const updatedAt = doc.updated_at || doc.updatedAt;
      return updatedAt && createdAt && updatedAt !== createdAt;
    }).length;

    const updateRate = totalDocuments > 0 ? Math.round((documentsWithUpdates / totalDocuments) * 100) : 0;

    return res.json({
      success: true,
      data: {
        totalDocuments,
        documentsThisMonth,
        documentsThisWeek,
        growthRate,
        averageLength,
        updateRate,
        popularTopics,
        documentTrends: {
          daily: dailyCreation,
          weekly: [], // Could implement if needed
          monthly: [] // Could implement if needed
        },
        documentDistribution: {
          byUser: documentsByUser,
          bySource: documentsBySource,
          byCreationDate: [
            { period: 'Last 7 days', count: documentsThisWeek },
            { period: 'Last 30 days', count: documentsThisMonth },
            { period: 'Older', count: totalDocuments - documentsThisMonth }
          ]
        },
        recentDocuments,
        documentMetrics: {
          totalWordCount,
          averageWordsPerDocument: averageLength,
          documentsWithUpdates,
          updateRate
        }
      }
    });
  } catch (error) {
    console.error('Document analytics error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Download Analytics
async function handleDownloadAnalytics(req: VercelRequest, res: VercelResponse, db: any) {
  try {
    console.log('Starting download analytics...');
    
    const users = await db.getAllUsers();
    const documents = await db.getAllDocuments();
    const allDownloads = await db.getAllDownloads();
    console.log('Real data loaded:', { users: users.length, documents: documents.length, downloads: allDownloads.length });
    
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const totalDownloads = allDownloads.length;
    const downloadsThisMonth = allDownloads.filter((download: any) => {
      const downloadedAt = download.downloaded_at || download.downloadedAt;
      return downloadedAt && new Date(downloadedAt) >= thisMonthStart;
    }).length;
    
    const pdfDownloads = allDownloads.filter((download: any) => {
      const fileFormat = download.file_format || download.fileFormat;
      return fileFormat === 'pdf';
    }).length;
    const docxDownloads = allDownloads.filter((download: any) => {
      const fileFormat = download.file_format || download.fileFormat;
      return fileFormat === 'docx';
    }).length;

    // Calculate format distribution
    const downloadsByFormat = [
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
    ];

    // Generate daily download trends for the last 30 days
    const dailyTrends = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      const count = allDownloads.filter((download: any) => {
        const downloadedAt = download.downloaded_at || download.downloadedAt;
        return downloadedAt && downloadedAt.startsWith(dateStr);
      }).length;
      dailyTrends.push({ date: dateStr, count });
    }

    // Calculate peak hours (0-23)
    const hourCounts = new Array(24).fill(0);
    allDownloads.forEach((download: any) => {
      const downloadedAt = download.downloaded_at || download.downloadedAt;
      if (downloadedAt) {
        const hour = new Date(downloadedAt).getHours();
        hourCounts[hour]++;
      }
    });
    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Calculate peak days of week
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = new Array(7).fill(0);
    allDownloads.forEach((download: any) => {
      const downloadedAt = download.downloaded_at || download.downloadedAt;
      if (downloadedAt) {
        const day = new Date(downloadedAt).getDay();
        dayCounts[day]++;
      }
    });
    const peakDays = dayCounts
      .map((count, index) => ({ day: dayNames[index], count }))
      .sort((a, b) => b.count - a.count);

    // Calculate user behavior metrics
    const userDownloadCounts = new Map();
    allDownloads.forEach((download: any) => {
      const userId = download.user_id || download.userId;
      const count = userDownloadCounts.get(userId) || 0;
      userDownloadCounts.set(userId, count + 1);
    });

    const totalUniqueUsers = userDownloadCounts.size;
    const averageDownloadsPerUser = totalUniqueUsers > 0 ? totalDownloads / totalUniqueUsers : 0;
    
    // Calculate repeat download rate (users with more than 1 download)
    const repeatUsers = Array.from(userDownloadCounts.values()).filter(count => count > 1).length;
    const repeatDownloadRate = totalUniqueUsers > 0 ? Math.round((repeatUsers / totalUniqueUsers) * 100) : 0;

    // Calculate immediate download rate (downloads within 5 minutes of document creation)
    const immediateDownloads = allDownloads.filter((download: any) => {
      const doc = documents.find((d: any) => d.id === download.documentId);
      if (!doc) return false;
      const timeDiff = new Date(download.downloadedAt).getTime() - new Date(doc.createdAt).getTime();
      return timeDiff <= 5 * 60 * 1000; // 5 minutes
    }).length;
    const immediateDownloadRate = totalDownloads > 0 ? Math.round((immediateDownloads / totalDownloads) * 100) : 0;

    // Performance metrics
    const completedDownloads = allDownloads.filter((d: any) => d.status === 'completed').length;
    const failedDownloads = allDownloads.filter((d: any) => d.status === 'failed').length;
    const successRate = totalDownloads > 0 ? Math.round((completedDownloads / totalDownloads) * 100) : 100;
    const failureRate = totalDownloads > 0 ? Math.round((failedDownloads / totalDownloads) * 100) : 0;

    // Calculate average file size and download time
    const completedDownloadsWithMetadata = allDownloads.filter((d: any) => 
      d.status === 'completed' && d.fileSize && d.documentMetadata?.generationTime
    );
    const averageFileSize = completedDownloadsWithMetadata.length > 0 
      ? Math.round(completedDownloadsWithMetadata.reduce((sum: number, d: any) => sum + d.fileSize, 0) / completedDownloadsWithMetadata.length / 1024) // KB
      : 0;
    const averageDownloadTime = completedDownloadsWithMetadata.length > 0
      ? Math.round(completedDownloadsWithMetadata.reduce((sum: number, d: any) => sum + d.documentMetadata.generationTime, 0) / completedDownloadsWithMetadata.length)
      : 0;

    // Top downloaded documents
    const documentDownloadCounts = new Map();
    allDownloads.forEach((download: any) => {
      const current = documentDownloadCounts.get(download.documentId) || {
        id: download.documentId,
        title: download.documentTitle,
        author: 'Unknown',
        downloadCount: 0,
        formats: new Set(),
        lastDownloaded: download.downloadedAt
      };
      current.downloadCount++;
      current.formats.add(download.fileFormat);
      if (new Date(download.downloadedAt) > new Date(current.lastDownloaded)) {
        current.lastDownloaded = download.downloadedAt;
      }
      documentDownloadCounts.set(download.documentId, current);
    });

    const topDownloadedDocuments = Array.from(documentDownloadCounts.values())
      .map((doc: any) => ({
        ...doc,
        formats: Array.from(doc.formats)
      }))
      .sort((a: any, b: any) => b.downloadCount - a.downloadCount)
      .slice(0, 10);

    // Top users by downloads
    const topUsersByDownloads = Array.from(userDownloadCounts.entries())
      .map(([userId, downloadCount]) => {
        const user = users.find((u: any) => u.id === userId);
        return {
          userId,
          userName: user?.name || 'Unknown User',
          downloadCount
        };
      })
      .sort((a, b) => b.downloadCount - a.downloadCount)
      .slice(0, 10);

    return res.json({
      success: true,
      data: {
        totalDownloads,
        downloadsByFormat,
        downloadTrends: {
          daily: dailyTrends,
          weekly: [], // Could implement if needed
          monthly: [] // Could implement if needed
        },
        downloadPatterns: {
          peakHours,
          peakDays,
          userBehavior: {
            averageDownloadsPerUser: Math.round(averageDownloadsPerUser * 10) / 10,
            repeatDownloadRate,
            immediateDownloadRate
          }
        },
        downloadPerformance: {
          successRate,
          failureRate,
          averageFileSize,
          averageDownloadTime
        },
        topDownloadedDocuments,
        downloadDistribution: {
          byUser: topUsersByDownloads,
          byDocument: topDownloadedDocuments.slice(0, 5).map((doc: any) => ({
            documentId: doc.id,
            title: doc.title,
            downloadCount: doc.downloadCount
          })),
          byTimeOfDay: peakHours
        }
      }
    });
  } catch (error) {
    console.error('Download analytics error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// System Analytics
async function handleSystemAnalytics(req: VercelRequest, res: VercelResponse, db: any) {
  try {
    console.log('Starting system analytics...');
    
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    const users = await db.getAllUsers();
    const documents = await db.getAllDocuments();
    console.log('Real data loaded:', { users: users.length, documents: documents.length });
    
    const totalMemoryMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const usedMemoryMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const memoryUsagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
    
    let systemStatus = 'healthy';
    if (memoryUsagePercent > 80) systemStatus = 'warning';
    if (memoryUsagePercent > 95) systemStatus = 'critical';

    return res.json({
      success: true,
      data: {
        uptime: Math.round(uptime),
        memoryUsage: {
          total: totalMemoryMB,
          used: usedMemoryMB,
          percentage: memoryUsagePercent
        },
        systemStatus,
        nodeVersion: process.version,
        platform: process.platform,
        totalDocuments: documents.length,
        totalUsers: users.length
      }
    });
  } catch (error) {
    console.error('System analytics error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// User Management
async function handleUsers(req: VercelRequest, res: VercelResponse, db: any) {
  if (req.method === 'GET') {
    const users = await db.getAllUsers();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    const formattedUsers = users.map((user: any) => ({
      id: user.id,
      name: user.name || 'Anonymous',
      email: user.email,
      createdAt: user.createdAt || new Date().toISOString(),
      lastLoginAt: user.lastLoginAt || null,
      documentCount: 0,
      downloadCount: 0,
      isActive: user.lastLoginAt && new Date(user.lastLoginAt) > thirtyDaysAgo,
      status: user.lastLoginAt && new Date(user.lastLoginAt) > thirtyDaysAgo ? 'active' : 'inactive'
    }));

    return res.json({
      success: true,
      data: {
        users: formattedUsers,
        pagination: {
          page: 1,
          limit: 20,
          total: users.length,
          totalPages: Math.ceil(users.length / 20),
          hasNext: false,
          hasPrev: false
        },
        summary: {
          totalUsers: users.length,
          activeUsers: formattedUsers.filter((u: any) => u.isActive).length,
          newUsersThisMonth: formattedUsers.filter((u: any) => 
            new Date(u.createdAt) > thirtyDaysAgo
          ).length,
          suspendedUsers: 0
        }
      }
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

// Admin Session Management
async function handleAdminSession(req: VercelRequest, res: VercelResponse, db: any) {
  if (req.method === 'POST') {
    try {
      const { userId, email } = req.body;
      
      // Check if user is admin (simplified check)
      const ADMIN_EMAIL = 'shyamkaarthikeyan@gmail.com';
      if (!email || email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'Admin privileges required'
        });
      }

      // Create admin session
      const adminSession = {
        sessionId: 'admin_session_' + Date.now(),
        userId: userId || 'admin_user',
        adminPermissions: [
          'view_analytics',
          'manage_users', 
          'system_monitoring',
          'download_reports',
          'admin_panel_access'
        ],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        lastAccessedAt: new Date().toISOString()
      };

      const adminToken = 'admin_token_' + Date.now();

      return res.json({
        success: true,
        adminSession,
        adminToken
      });
    } catch (error) {
      console.error('Admin session creation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create admin session'
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

// Admin Session Verification
async function handleAdminVerify(req: VercelRequest, res: VercelResponse, db: any) {
  if (req.method === 'POST') {
    try {
      const adminToken = req.headers['x-admin-token'];
      
      if (!adminToken || !adminToken.toString().startsWith('admin_token_')) {
        return res.status(401).json({
          success: false,
          valid: false,
          error: 'Invalid admin token'
        });
      }

      // For demo purposes, consider all admin tokens valid if they have the right format
      // In production, you'd verify against a database
      const session = {
        sessionId: 'admin_session_' + Date.now(),
        userId: 'admin_user',
        adminPermissions: [
          'view_analytics',
          'manage_users', 
          'system_monitoring',
          'download_reports',
          'admin_panel_access'
        ],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        lastAccessedAt: new Date().toISOString()
      };

      return res.json({
        success: true,
        valid: true,
        session
      });
    } catch (error) {
      console.error('Admin verification error:', error);
      return res.status(500).json({
        success: false,
        valid: false,
        error: 'Verification failed'
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

// Admin Sign Out
async function handleAdminSignout(req: VercelRequest, res: VercelResponse, db: any) {
  if (req.method === 'POST') {
    try {
      // In production, you'd invalidate the admin token/session in database
      return res.json({
        success: true,
        message: 'Admin session ended'
      });
    } catch (error) {
      console.error('Admin signout error:', error);
      return res.status(500).json({
        success: false,
        error: 'Signout failed'
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

// Consolidated Auth Test Handler (from auth/test.ts)
async function handleAuthTest(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Check environment variables
    const envCheck = {
      VITE_GOOGLE_CLIENT_ID: !!process.env.VITE_GOOGLE_CLIENT_ID,
      DATABASE_URL: !!process.env.DATABASE_URL,
      JWT_SECRET: !!process.env.JWT_SECRET,
      NODE_ENV: process.env.NODE_ENV
    };

    return res.status(200).json({
      success: true,
      message: 'Auth test endpoint working',
      environment: envCheck,
      method: req.method,
      body: req.body
    });

  } catch (error) {
    console.error('❌ Auth test error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Auth test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Consolidated Database Test Handler (from test-db.ts)
async function handleDbTest(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('🔧 Testing database connection...');
    
    // Test basic connection
    const isConnected = await neonDb.testConnection();
    
    if (!isConnected) {
      return res.status(500).json({
        success: false,
        error: 'Database connection failed',
        details: 'Could not connect to Neon database'
      });
    }

    // Test database initialization
    await neonDb.initialize();
    
    // Test getting users (should work even if empty)
    const users = await neonDb.getAllUsers();
    
    return res.status(200).json({
      success: true,
      message: 'Database connection successful',
      data: {
        connected: true,
        userCount: users.length,
        connectionHealth: neonDb.getConnectionHealth()
      }
    });

  } catch (error) {
    console.error('❌ Database test failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}