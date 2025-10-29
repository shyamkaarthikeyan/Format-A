import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

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
    const { path } = req.query;
    const pathArray = Array.isArray(path) ? path : [path].filter(Boolean);
    const endpoint = pathArray.join('/');

    // Simple admin token check
    const adminToken = req.headers['x-admin-token'] as string;
    const skipAuthEndpoints = ['auth/session', 'auth/verify', 'auth/signout'];
    const needsAuth = !skipAuthEndpoints.includes(endpoint);
    
    if (needsAuth && (!adminToken || !adminToken.startsWith('admin_token_'))) {
      return res.status(401).json({ 
        success: false,
        error: 'ADMIN_AUTH_REQUIRED', 
        message: 'Valid admin token required'
      });
    }

    // Initialize database tables if they don't exist
    await initializeDatabase();

    // Route to different admin functions
    switch (endpoint) {
      case 'analytics/users':
        return await handleUserAnalytics(req, res);
      case 'analytics/documents':
        return await handleDocumentAnalytics(req, res);
      case 'analytics/downloads':
        return await handleDownloadAnalytics(req, res);
      case 'analytics/system':
        return await handleSystemAnalytics(req, res);
      case 'auth/session':
        return await handleAdminSession(req, res);
      case 'auth/verify':
        return await handleAdminVerify(req, res);
      case 'auth/signout':
        return await handleAdminSignout(req, res);
      default:
        return res.status(404).json({ error: 'Admin endpoint not found', endpoint });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}

async function initializeDatabase() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        picture TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_login_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        preferences JSONB DEFAULT '{}'::jsonb
      )
    `;

    // Create documents table
    await sql`
      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        abstract TEXT,
        keywords TEXT,
        author_count INTEGER DEFAULT 0,
        section_count INTEGER DEFAULT 0,
        reference_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create downloads table
    await sql`
      CREATE TABLE IF NOT EXISTS downloads (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        document_id VARCHAR(255) REFERENCES documents(id) ON DELETE CASCADE,
        document_title VARCHAR(500) NOT NULL,
        file_format VARCHAR(10) NOT NULL,
        file_size INTEGER,
        downloaded_at TIMESTAMP DEFAULT NOW(),
        ip_address VARCHAR(45),
        user_agent TEXT,
        status VARCHAR(20) DEFAULT 'completed',
        email_sent BOOLEAN DEFAULT false,
        metadata JSONB DEFAULT '{}'::jsonb
      )
    `;

    // Check if we need sample data
    const userCount = await sql`SELECT COUNT(*) as count FROM users`;
    if (userCount.rows[0].count === '0') {
      await seedSampleData();
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

async function seedSampleData() {
  try {
    // Insert sample users
    await sql`
      INSERT INTO users (id, google_id, email, name, picture, created_at, last_login_at)
      VALUES 
        ('user_1', 'google_123', 'john.doe@university.edu', 'Dr. John Doe', 'https://via.placeholder.com/150', NOW() - INTERVAL '30 days', NOW() - INTERVAL '2 days'),
        ('user_2', 'google_456', 'jane.smith@research.org', 'Prof. Jane Smith', 'https://via.placeholder.com/150', NOW() - INTERVAL '20 days', NOW() - INTERVAL '1 day'),
        ('user_3', 'google_789', 'mike.wilson@tech.com', 'Mike Wilson', 'https://via.placeholder.com/150', NOW() - INTERVAL '45 days', NOW() - INTERVAL '7 days')
      ON CONFLICT (id) DO NOTHING
    `;

    // Insert sample documents
    await sql`
      INSERT INTO documents (id, user_id, title, abstract, keywords, author_count, section_count, reference_count, created_at)
      VALUES 
        ('doc_1', 'user_1', 'Machine Learning Applications in Healthcare', 'This paper explores ML in healthcare', 'machine learning, healthcare, AI', 1, 5, 15, NOW() - INTERVAL '15 days'),
        ('doc_2', 'user_2', 'Quantum Computing: A Comprehensive Review', 'An extensive review of quantum computing', 'quantum computing, algorithms', 1, 4, 12, NOW() - INTERVAL '8 days')
      ON CONFLICT (id) DO NOTHING
    `;

    // Insert sample downloads
    await sql`
      INSERT INTO downloads (id, user_id, document_id, document_title, file_format, file_size, downloaded_at, status, metadata)
      VALUES 
        ('download_1', 'user_1', 'doc_1', 'Machine Learning Applications in Healthcare', 'pdf', 245760, NOW() - INTERVAL '1 day', 'completed', '{"pageCount": 8, "wordCount": 3200}'::jsonb),
        ('download_2', 'user_2', 'doc_2', 'Quantum Computing: A Comprehensive Review', 'docx', 189440, NOW() - INTERVAL '2 days', 'completed', '{"pageCount": 6, "wordCount": 2800}'::jsonb),
        ('download_3', 'user_1', 'doc_2', 'Quantum Computing: A Comprehensive Review', 'pdf', 298240, NOW() - INTERVAL '3 days', 'completed', '{"pageCount": 6, "wordCount": 2800}'::jsonb)
      ON CONFLICT (id) DO NOTHING
    `;
  } catch (error) {
    console.error('Sample data seeding error:', error);
    // Don't throw - sample data is optional
  }
}

async function handleUserAnalytics(req: VercelRequest, res: VercelResponse) {
  try {
    const users = await sql`SELECT * FROM users ORDER BY created_at DESC`;
    const totalUsers = users.rows.length;
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    
    const activeUsers24h = users.rows.filter((user: any) => 
      user.last_login_at && new Date(user.last_login_at) > twentyFourHoursAgo
    ).length;
    
    const activeUsers7d = users.rows.filter((user: any) => 
      user.last_login_at && new Date(user.last_login_at) > sevenDaysAgo
    ).length;
    
    const activeUsers30d = users.rows.filter((user: any) => 
      user.last_login_at && new Date(user.last_login_at) > thirtyDaysAgo
    ).length;

    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newUsersThisMonth = users.rows.filter((user: any) => 
      user.created_at && new Date(user.created_at) >= thisMonth
    ).length;

    return res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers: {
          last24h: activeUsers24h,
          last7d: activeUsers7d,
          last30d: activeUsers30d
        },
        userGrowth: {
          thisMonth: newUsersThisMonth,
          lastMonth: 0,
          growthRate: 0
        },
        newUsers: {
          daily: [],
          weekly: [],
          monthly: []
        },
        userDistribution: {
          byRegistrationDate: [],
          byActivity: []
        },
        topUsers: users.rows.slice(0, 10).map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          documentsCreated: 0,
          downloadsCount: 0,
          lastActive: user.last_login_at || user.created_at
        }))
      }
    });
  } catch (error) {
    console.error('User analytics error:', error);
    throw error;
  }
}

async function handleDocumentAnalytics(req: VercelRequest, res: VercelResponse) {
  try {
    const documents = await sql`SELECT * FROM documents ORDER BY created_at DESC`;
    const totalDocuments = documents.rows.length;
    
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    const documentsThisMonth = documents.rows.filter((doc: any) => 
      doc.created_at && new Date(doc.created_at) >= thisMonth
    ).length;
    
    const documentsThisWeek = documents.rows.filter((doc: any) => 
      doc.created_at && new Date(doc.created_at) >= sevenDaysAgo
    ).length;

    return res.json({
      success: true,
      data: {
        totalDocuments,
        documentsThisMonth,
        documentsThisWeek,
        growthRate: 0,
        averageLength: 2500,
        updateRate: 75,
        popularTopics: [
          { topic: 'Machine Learning', count: 1 },
          { topic: 'Quantum Computing', count: 1 }
        ],
        documentTrends: {
          daily: [],
          weekly: [],
          monthly: []
        },
        documentDistribution: {
          byUser: [],
          bySource: [],
          byCreationDate: []
        },
        recentDocuments: documents.rows.slice(0, 10).map((doc: any) => ({
          id: doc.id,
          title: doc.title,
          author: 'Unknown',
          createdAt: doc.created_at,
          updatedAt: doc.updated_at
        })),
        documentMetrics: {
          totalWordCount: totalDocuments * 2500,
          averageWordsPerDocument: 2500,
          documentsWithUpdates: 0,
          updateRate: 0
        }
      }
    });
  } catch (error) {
    console.error('Document analytics error:', error);
    throw error;
  }
}

async function handleDownloadAnalytics(req: VercelRequest, res: VercelResponse) {
  try {
    const downloads = await sql`SELECT * FROM downloads ORDER BY downloaded_at DESC`;
    const totalDownloads = downloads.rows.length;
    
    const pdfDownloads = downloads.rows.filter((d: any) => d.file_format === 'pdf').length;
    const docxDownloads = downloads.rows.filter((d: any) => d.file_format === 'docx').length;

    return res.json({
      success: true,
      data: {
        totalDownloads,
        downloadsByFormat: [
          { format: 'pdf', count: pdfDownloads, percentage: totalDownloads > 0 ? Math.round((pdfDownloads / totalDownloads) * 100) : 0 },
          { format: 'docx', count: docxDownloads, percentage: totalDownloads > 0 ? Math.round((docxDownloads / totalDownloads) * 100) : 0 }
        ],
        downloadTrends: {
          daily: [],
          weekly: [],
          monthly: []
        },
        downloadPatterns: {
          peakHours: [],
          peakDays: [],
          userBehavior: {
            averageDownloadsPerUser: totalDownloads > 0 ? totalDownloads / 3 : 0,
            repeatDownloadRate: 50,
            immediateDownloadRate: 80
          }
        },
        downloadPerformance: {
          successRate: 95,
          failureRate: 5,
          averageFileSize: 250,
          averageDownloadTime: 2000
        },
        topDownloadedDocuments: downloads.rows.slice(0, 10).map((d: any) => ({
          id: d.document_id,
          title: d.document_title,
          downloadCount: 1,
          formats: [d.file_format],
          lastDownloaded: d.downloaded_at
        })),
        downloadDistribution: {
          byUser: [],
          byDocument: [],
          byTimeOfDay: []
        }
      }
    });
  } catch (error) {
    console.error('Download analytics error:', error);
    throw error;
  }
}

async function handleSystemAnalytics(req: VercelRequest, res: VercelResponse) {
  try {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
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
        totalDocuments: 2,
        totalUsers: 3
      }
    });
  } catch (error) {
    console.error('System analytics error:', error);
    throw error;
  }
}

async function handleAdminSession(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, email } = req.body;
    
    const ADMIN_EMAIL = 'shyamkaarthikeyan@gmail.com';
    if (!email || email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Admin privileges required'
      });
    }

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

async function handleAdminVerify(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminToken = req.headers['x-admin-token'];
    
    if (!adminToken || !adminToken.toString().startsWith('admin_token_')) {
      return res.status(401).json({
        success: false,
        valid: false,
        error: 'Invalid admin token'
      });
    }

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

async function handleAdminSignout(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.json({
    success: true,
    message: 'Successfully signed out'
  });
}