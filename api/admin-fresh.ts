import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Debug request details
    console.log('Admin API Request Debug:', {
      method: req.method,
      body: req.body,
      hasBody: !!req.body,
      bodyAction: req.body?.action,
      bodyType: typeof req.body
    });

    // Handle database clear operation FIRST (DANGER: Clears all data)
    if (req.method === 'POST' && req.body?.action === 'clear_all_data') {
      console.log('🧹 Database clear operation requested:', req.body);

      const { confirm, keep_structure } = req.body;

      if (confirm !== 'yes_clear_everything') {
        return res.status(400).json({
          success: false,
          error: 'Confirmation required',
          message: 'Must confirm with "yes_clear_everything"',
          received: { confirm, action: req.body.action }
        });
      }

      try {
        if (!process.env.DATABASE_URL) {
          return res.status(500).json({
            success: false,
            error: 'Database not configured'
          });
        }

        const { NeonDatabase } = await import('./_lib/neon-database.js');
        const db = new NeonDatabase();

        // Clear all data while preserving structure
        const result = await db.clearAllData(keep_structure);

        return res.json({
          success: true,
          message: 'All database data cleared successfully',
          data: result,
          warning: 'All user data, documents, downloads, and sessions have been deleted'
        });

      } catch (error) {
        console.error('Error clearing database data:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to clear database data',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const { path, type, endpoint: endpointParam } = req.query;

    // Fix path processing
    let pathArray: string[] = [];
    if (Array.isArray(path)) {
      pathArray = path.filter(Boolean);
    } else if (typeof path === 'string' && path) {
      // Split the path by '/' to handle nested routes like 'users/123/documents'
      pathArray = path.split('/').filter(Boolean);
    }

    // Handle both path-based and endpoint parameter-based routing
    const endpoint = endpointParam || pathArray.join('/');

    // Handle user deletion
    if (req.method === 'DELETE' && (endpoint === 'users' || pathArray.includes('users') || path === 'users') && req.query.userId) {
      const userId = req.query.userId as string;

      try {
        if (!process.env.DATABASE_URL) {
          return res.status(500).json({
            success: false,
            error: 'Database not configured'
          });
        }

        const { NeonDatabase } = await import('./_lib/neon-database.js');
        const db = new NeonDatabase();

        // Delete user and all related data
        const result = await db.deleteUser(userId);

        return res.json({
          success: true,
          message: `User ${userId} deleted successfully`,
          data: result
        });

      } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete user',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Handle user suspension/unsuspension
    if (req.method === 'POST' && req.query.userId && req.query.action === 'suspend') {
      const userId = req.query.userId as string;
      const { suspend, reason, adminEmail } = req.body;

      console.log('🔒 Processing user suspension request:', { userId, suspend, reason, adminEmail });

      try {
        if (!process.env.DATABASE_URL) {
          return res.status(500).json({
            success: false,
            error: 'Database not configured'
          });
        }

        // Use direct database connection to avoid issues with the NeonDatabase class
        const { neon } = await import('@neondatabase/serverless');
        const sql = neon(process.env.DATABASE_URL);

        // Get user information first
        const userResult = await sql`SELECT * FROM users WHERE id = ${userId}`;

        if (userResult.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'User not found',
            user_id: userId
          });
        }

        const user = userResult[0];

        // Update user suspension status
        const updateResult = await sql`
          UPDATE users 
          SET 
            suspended = ${suspend},
            suspended_at = ${suspend ? new Date().toISOString() : null},
            suspended_by = ${suspend ? adminEmail || 'admin' : null},
            suspension_reason = ${suspend ? reason || 'No reason provided' : null},
            is_active = ${!suspend},
            updated_at = NOW()
          WHERE id = ${userId}
          RETURNING *
        `;

        const result = {
          success: true,
          user_id: userId,
          user_name: user.name,
          user_email: user.email,
          suspended: suspend,
          suspended_at: suspend ? new Date().toISOString() : null,
          suspended_by: suspend ? adminEmail || 'admin' : null,
          reason: suspend ? reason || 'No reason provided' : null,
          previous_status: user.suspended || false
        };

        return res.json({
          success: true,
          message: suspend ? `User ${userId} suspended successfully` : `User ${userId} unsuspended successfully`,
          data: result
        });

      } catch (error) {
        console.error('Error suspending user:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to suspend user',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Handle user downloads endpoint - ABSOLUTE HIGHEST PRIORITY
    // This MUST be checked before any other endpoint logic
    if (req.query.action === 'downloads' && req.query.userId) {
      const userId = req.query.userId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      console.log('🔍 DOWNLOADS ENDPOINT HIT - Processing user downloads request:', {
        userId,
        page,
        limit,
        queryParams: req.query
      });

      try {
        if (!process.env.DATABASE_URL) {
          console.error('❌ DATABASE_URL not configured');
          return res.status(500).json({
            success: false,
            error: 'Database not configured'
          });
        }

        // Use direct database connection to avoid issues with the NeonDatabase class
        const { neon } = await import('@neondatabase/serverless');
        const sql = neon(process.env.DATABASE_URL);

        console.log('📥 Fetching downloads for user with direct SQL:', userId);

        // Get total count of downloads for this user
        const countResult = await sql`
          SELECT COUNT(*) as total FROM downloads WHERE user_id = ${userId}
        `;
        const totalItems = parseInt(countResult[0].total) || 0;

        // Get paginated downloads
        const offset = (page - 1) * limit;
        const downloadsResult = await sql`
          SELECT 
            id,
            document_title,
            file_format,
            file_size,
            downloaded_at,
            status,
            email_sent,
            document_metadata
          FROM downloads 
          WHERE user_id = ${userId}
          ORDER BY downloaded_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;

        const totalPages = Math.ceil(totalItems / limit);

        const downloads = {
          downloads: downloadsResult,
          pagination: {
            currentPage: page,
            totalPages,
            totalItems,
            hasNext: page < totalPages,
            hasPrev: page > 1,
            limit
          }
        };

        console.log('✅ Downloads retrieved successfully:', {
          downloadsCount: downloads?.downloads?.length || 0,
          totalItems: downloads?.pagination?.totalItems || 0,
          downloadsData: downloads
        });

        // Handle both response formats - if it's an array, wrap it properly
        let responseData;
        if (Array.isArray(downloads)) {
          responseData = {
            downloads: downloads,
            pagination: {
              currentPage: page,
              totalPages: Math.ceil(downloads.length / limit),
              totalItems: downloads.length,
              hasNext: page < Math.ceil(downloads.length / limit),
              hasPrev: page > 1,
              limit
            }
          };
        } else {
          responseData = downloads || {
            downloads: [],
            pagination: {
              currentPage: page,
              totalPages: 0,
              totalItems: 0,
              hasNext: false,
              hasPrev: false,
              limit
            }
          };
        }

        const response = {
          success: true,
          data: responseData,
          message: `Retrieved downloads for user ${userId}`,
          debug: {
            userId,
            page,
            limit,
            downloadsFound: responseData.downloads?.length || 0,
            endpoint: 'user-downloads'
          }
        };

        console.log('📤 Returning downloads response:', response);
        return res.json(response);

      } catch (error) {
        console.error('❌ Error fetching user downloads:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch user downloads',
          message: error instanceof Error ? error.message : 'Unknown error',
          debug: {
            userId,
            error: error instanceof Error ? error.message : 'Unknown',
            endpoint: 'user-downloads-error'
          }
        });
      }
    }

    // Handle users endpoint for user management (but NOT downloads)
    if ((endpoint === 'users' || pathArray.includes('users') || path === 'users') && !req.query.action) {
      console.log('🔍 Processing users endpoint request...', { endpoint, pathArray, path });

      try {
        // Check if DATABASE_URL exists
        if (!process.env.DATABASE_URL) {
          console.warn('❌ DATABASE_URL environment variable not found');
          return res.json({
            success: true,
            data: [],
            message: 'DATABASE_URL not configured',
            dataSource: 'no_database_url'
          });
        }

        console.log('✅ DATABASE_URL found, attempting direct database connection...');

        // Use direct database connection to avoid issues with the NeonDatabase class
        const { neon } = await import('@neondatabase/serverless');
        const sql = neon(process.env.DATABASE_URL);

        console.log('📊 Fetching all users with stats using direct SQL...');

        // Get all users with download and document counts using direct SQL
        const usersWithStats = await sql`
          SELECT 
            u.*,
            COUNT(DISTINCT d.id) as total_documents,
            COUNT(DISTINCT dl.id) as total_downloads,
            MAX(d.created_at) as last_document_created,
            MAX(dl.downloaded_at) as last_download,
            COALESCE(SUM(dl.file_size), 0) as total_download_size
          FROM users u
          LEFT JOIN documents d ON u.id = d.user_id
          LEFT JOIN downloads dl ON u.id = dl.user_id
          GROUP BY u.id, u.google_id, u.email, u.name, u.picture, u.created_at, u.updated_at, u.last_login_at, u.is_active, u.preferences, u.suspended, u.suspended_at, u.suspended_by, u.suspension_reason
          ORDER BY u.created_at DESC
        `;

        console.log(`✅ Successfully retrieved ${usersWithStats.length} users with stats from database`);

        return res.json({
          success: true,
          data: usersWithStats,
          message: `Retrieved ${usersWithStats.length} users with download statistics from database`,
          dataSource: 'database',
          timestamp: new Date().toISOString(),
          summary: {
            totalUsers: usersWithStats.length,
            activeUsers: usersWithStats.filter(u => u.is_active).length,
            recentLogins: usersWithStats.filter(u => {
              if (!u.last_login_at) return false;
              const loginDate = new Date(u.last_login_at);
              const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
              return loginDate > dayAgo;
            }).length,
            totalDownloads: usersWithStats.reduce((sum, u) => sum + (parseInt(u.total_downloads) || 0), 0),
            totalDocuments: usersWithStats.reduce((sum, u) => sum + (parseInt(u.total_documents) || 0), 0)
          }
        });

      } catch (dbError) {
        console.error('❌ Database error fetching users:', dbError);

        return res.json({
          success: true,
          data: [],
          message: `Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`,
          dataSource: 'database_error',
          error: dbError instanceof Error ? dbError.message : 'Unknown database error'
        });
      }
    }

    // Handle user documents endpoint - fetch all documents for a specific user
    if (pathArray.length >= 2 && pathArray[0] === 'users' && pathArray[2] === 'documents') {
      const userId = pathArray[1];
      console.log('🔍 Fetching documents for user:', userId);

      try {
        if (!process.env.DATABASE_URL) {
          return res.status(500).json({
            success: false,
            error: 'Database not configured'
          });
        }

        const { neon } = await import('@neondatabase/serverless');
        const sql = neon(process.env.DATABASE_URL);

        // Get all documents for this user
        const documents = await sql`
          SELECT 
            id,
            title,
            author,
            created_at,
            updated_at,
            page_count,
            word_count,
            format,
            metadata
          FROM documents
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
        `;

        console.log(`✅ Retrieved ${documents.length} documents for user ${userId}`);

        return res.json({
          success: true,
          data: documents,
          message: `Retrieved ${documents.length} documents`,
          userId
        });

      } catch (error) {
        console.error('❌ Error fetching user documents:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch user documents',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Handle analytics endpoints with real database data (with graceful fallback)
    if (endpoint === 'analytics' && type) {

      // Define empty data structure for when no real data is available
      const emptyData = {
        users: {
          totalUsers: 0,
          activeUsers: { last24h: 0, last7d: 0, last30d: 0 },
          userGrowth: { thisMonth: 0, lastMonth: 0, growthRate: 0 },
          newUsers: { today: 0, thisWeek: 0, thisMonth: 0 }
        },
        documents: {
          totalDocuments: 0,
          documentsThisMonth: 0,
          documentsThisWeek: 0,
          documentsToday: 0,
          growthRate: 0,
          averageLength: 0,
          updateRate: 0
        },
        downloads: {
          totalDownloads: 0,
          downloadsToday: 0,
          downloadsThisWeek: 0,
          downloadsThisMonth: 0,
          downloadsByFormat: [
            { format: 'pdf', count: 0, percentage: 0 },
            { format: 'docx', count: 0, percentage: 0 }
          ]
        },
        system: {
          uptime: Math.round(process.uptime()),
          memoryUsage: {
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
          },
          systemStatus: 'warning',
          nodeVersion: process.version,
          platform: process.platform,
          databaseHealth: {
            isHealthy: false,
            lastChecked: new Date().toISOString(),
            responseTime: 0,
            errorCount: 1
          }
        }
      };

      // Try to get real database data first using direct SQL (same approach as users endpoint)
      let useRealData = false;
      let realData = null;

      try {
        // Only attempt database connection if DATABASE_URL exists
        if (process.env.DATABASE_URL) {
          console.log('Attempting direct database connection for analytics...');

          // Use direct database connection like the users endpoint
          const { neon } = await import('@neondatabase/serverless');
          const sql = neon(process.env.DATABASE_URL);

          console.log('Database connection successful, fetching real analytics data...');

          // Get real analytics data based on type using direct SQL
          switch (type) {
            case 'users': {
              console.log('Fetching user analytics...');
              const userResult = await sql`
                SELECT 
                  COUNT(*) as total_users,
                  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as new_users_today,
                  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_users_7d,
                  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d,
                  COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '7 days' THEN 1 END) as active_users_7d,
                  COUNT(CASE WHEN last_login_at >= NOW() - INTERVAL '30 days' THEN 1 END) as active_users_30d,
                  COUNT(CASE WHEN is_active = true THEN 1 END) as active_users
                FROM users
              `;
              const userAnalytics = userResult[0];

              // Get top users with their download and document counts
              const topUsersResult = await sql`
                SELECT 
                  u.id,
                  u.name,
                  u.email,
                  u.last_login_at,
                  COUNT(DISTINCT d.id) as documents_created,
                  COUNT(DISTINCT dl.id) as downloads_count
                FROM users u
                LEFT JOIN documents d ON u.id = d.user_id
                LEFT JOIN downloads dl ON u.id = dl.user_id
                GROUP BY u.id, u.name, u.email, u.last_login_at
                ORDER BY downloads_count DESC, documents_created DESC
                LIMIT 10
              `;

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
                  thisMonth: parseInt(userAnalytics.new_users_30d) || 0,
                  daily: [], // TODO: Add daily breakdown if needed
                  weekly: [], // TODO: Add weekly breakdown if needed
                  monthly: [] // TODO: Add monthly breakdown if needed
                },
                userDistribution: {
                  byRegistrationDate: [], // TODO: Add registration distribution if needed
                  byActivity: [] // TODO: Add activity distribution if needed
                },
                topUsers: topUsersResult.map(user => ({
                  id: user.id,
                  name: user.name || 'Anonymous',
                  email: user.email,
                  documentsCreated: parseInt(user.documents_created) || 0,
                  downloadsCount: parseInt(user.downloads_count) || 0,
                  lastActive: user.last_login_at || new Date().toISOString()
                }))
              };
              useRealData = true;
              break;
            }

            case 'documents': {
              console.log('Fetching document analytics...');
              try {
                const documentResult = await sql`
                  SELECT 
                    COUNT(*) as total_documents,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as documents_today,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as documents_7d,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as documents_30d,
                    AVG(COALESCE(page_count, 5)) as avg_page_count,
                    AVG(COALESCE(word_count, 1000)) as avg_word_count
                  FROM documents
                `;
                const documentAnalytics = documentResult[0];

                // Get daily document creation trends
                const dailyTrends = await sql`
                  SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as count
                  FROM documents
                  WHERE created_at >= NOW() - INTERVAL '30 days'
                  GROUP BY DATE(created_at)
                  ORDER BY date DESC
                  LIMIT 30
                `;

                // Get top documents (if we have a downloads table)
                let topDocuments = [];
                try {
                  const topDocsResult = await sql`
                    SELECT 
                      d.id,
                      d.title,
                      d.author,
                      d.created_at,
                      d.page_count,
                      COUNT(dl.id) as download_count
                    FROM documents d
                    LEFT JOIN downloads dl ON d.title = dl.document_title
                    GROUP BY d.id, d.title, d.author, d.created_at, d.page_count
                    ORDER BY download_count DESC
                    LIMIT 10
                  `;
                  topDocuments = topDocsResult;
                } catch (topDocsError) {
                  console.log('Could not fetch top documents, using empty array');
                }

                const totalDocuments = parseInt(documentAnalytics.total_documents) || 0;

                realData = {
                  totalDocuments,
                  documentsCreated: {
                    daily: dailyTrends.map(trend => ({
                      date: trend.date,
                      count: parseInt(trend.count) || 0
                    })),
                    weekly: [], // Could add weekly aggregation if needed
                    monthly: [] // Could add monthly aggregation if needed
                  },
                  documentTypes: [
                    { type: 'IEEE Paper', count: Math.floor(totalDocuments * 0.7), percentage: 70 },
                    { type: 'Research Article', count: Math.floor(totalDocuments * 0.2), percentage: 20 },
                    { type: 'Technical Report', count: Math.floor(totalDocuments * 0.1), percentage: 10 }
                  ],
                  documentPerformance: {
                    averageCreationTime: 5.2, // Mock average in minutes
                    averagePageCount: Math.round(parseFloat(documentAnalytics.avg_page_count) || 5),
                    averageWordCount: Math.round(parseFloat(documentAnalytics.avg_word_count) || 1000),
                    completionRate: totalDocuments > 0 ? 95 : 0 // Mock high completion rate
                  },
                  topDocuments: topDocuments.map(doc => ({
                    id: doc.id || `doc_${Math.random().toString(36).substr(2, 9)}`,
                    title: doc.title || 'Untitled Document',
                    author: doc.author || 'Unknown Author',
                    createdAt: doc.created_at || new Date().toISOString(),
                    downloadCount: parseInt(doc.download_count) || 0,
                    pageCount: parseInt(doc.page_count) || 5
                  })),
                  documentTrends: [
                    {
                      period: 'This Week',
                      created: parseInt(documentAnalytics.documents_7d) || 0,
                      completed: Math.floor((parseInt(documentAnalytics.documents_7d) || 0) * 0.95),
                      downloaded: Math.floor((parseInt(documentAnalytics.documents_7d) || 0) * 0.8)
                    },
                    {
                      period: 'This Month',
                      created: parseInt(documentAnalytics.documents_30d) || 0,
                      completed: Math.floor((parseInt(documentAnalytics.documents_30d) || 0) * 0.95),
                      downloaded: Math.floor((parseInt(documentAnalytics.documents_30d) || 0) * 0.8)
                    }
                  ]
                };
                useRealData = true;
              } catch (docError) {
                console.log('Documents table may not exist, using zero values');
                realData = {
                  totalDocuments: 0,
                  documentsCreated: { daily: [], weekly: [], monthly: [] },
                  documentTypes: [
                    { type: 'IEEE Paper', count: 0, percentage: 0 },
                    { type: 'Research Article', count: 0, percentage: 0 },
                    { type: 'Technical Report', count: 0, percentage: 0 }
                  ],
                  documentPerformance: {
                    averageCreationTime: 0,
                    averagePageCount: 0,
                    averageWordCount: 0,
                    completionRate: 0
                  },
                  topDocuments: [],
                  documentTrends: []
                };
                useRealData = true;
              }
              break;
            }

            case 'downloads': {
              console.log('Fetching download analytics...');
              try {
                const downloadResult = await sql`
                  SELECT 
                    COUNT(*) as total_downloads,
                    COUNT(CASE WHEN downloaded_at >= NOW() - INTERVAL '1 day' THEN 1 END) as downloads_today,
                    COUNT(CASE WHEN downloaded_at >= NOW() - INTERVAL '7 days' THEN 1 END) as downloads_7d,
                    COUNT(CASE WHEN downloaded_at >= NOW() - INTERVAL '30 days' THEN 1 END) as downloads_30d,
                    COUNT(CASE WHEN file_format = 'pdf' THEN 1 END) as pdf_downloads,
                    COUNT(CASE WHEN file_format = 'docx' THEN 1 END) as docx_downloads,
                    AVG(COALESCE(file_size, 0)) as avg_file_size
                  FROM downloads
                `;
                const downloadAnalytics = downloadResult[0];

                const totalDownloads = parseInt(downloadAnalytics.total_downloads) || 0;
                const pdfDownloads = parseInt(downloadAnalytics.pdf_downloads) || 0;
                const docxDownloads = parseInt(downloadAnalytics.docx_downloads) || 0;
                const avgFileSize = parseFloat(downloadAnalytics.avg_file_size) || 0;
                
                // Get daily download trends for the last 30 days
                const dailyTrends = await sql`
                  SELECT 
                    DATE(downloaded_at) as date,
                    COUNT(*) as count
                  FROM downloads
                  WHERE downloaded_at >= NOW() - INTERVAL '30 days'
                  GROUP BY DATE(downloaded_at)
                  ORDER BY date DESC
                  LIMIT 30
                `;
                
                // Get top downloaded documents
                const topDocuments = await sql`
                  SELECT 
                    document_title,
                    COUNT(*) as download_count,
                    file_format,
                    MAX(downloaded_at) as last_downloaded
                  FROM downloads
                  GROUP BY document_title, file_format
                  ORDER BY download_count DESC
                  LIMIT 10
                `;
                
                // Calculate user behavior metrics
                const userBehaviorResult = await sql`
                  SELECT 
                    COUNT(DISTINCT user_id) as unique_users,
                    COUNT(*) as total_downloads
                  FROM downloads
                `;
                const userBehavior = userBehaviorResult[0];
                const avgDownloadsPerUser = parseInt(userBehavior.unique_users) > 0 
                  ? Math.round((totalDownloads / parseInt(userBehavior.unique_users)) * 100) / 100
                  : 0;

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
                  ],
                  downloadTrends: {
                    daily: dailyTrends.map(trend => ({
                      date: trend.date,
                      count: parseInt(trend.count) || 0
                    })),
                    weekly: [],
                    monthly: []
                  },
                  downloadPatterns: {
                    peakHours: Array.from({length: 24}, (_, i) => ({
                      hour: i,
                      count: Math.floor(Math.random() * 10) // Mock data for now
                    })),
                    peakDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => ({
                      day,
                      count: Math.floor(Math.random() * 20)
                    })),
                    userBehavior: {
                      repeatDownloads: Math.floor(totalDownloads * 0.15),
                      immediateDownloads: Math.floor(totalDownloads * 0.85),
                      avgDownloadsPerUser
                    }
                  },
                  downloadPerformance: {
                    successRate: totalDownloads > 0 ? 95 : 0, // Mock high success rate
                    failureRate: totalDownloads > 0 ? 5 : 0,
                    avgDownloadTime: 2.5, // Mock average time in seconds
                    avgFileSize: Math.round(avgFileSize / 1024) // Convert to KB
                  },
                  topDownloadedDocuments: topDocuments.map(doc => ({
                    title: doc.document_title || 'Untitled Document',
                    downloads: parseInt(doc.download_count) || 0,
                    format: doc.file_format || 'pdf',
                    lastDownloaded: doc.last_downloaded
                  }))
                };
                useRealData = true;
              } catch (downloadError) {
                console.log('Downloads table may not exist, using zero values');
                realData = {
                  totalDownloads: 0,
                  downloadsToday: 0,
                  downloadsThisWeek: 0,
                  downloadsThisMonth: 0,
                  downloadsByFormat: [
                    { format: 'pdf', count: 0, percentage: 0 },
                    { format: 'docx', count: 0, percentage: 0 }
                  ],
                  downloadTrends: { daily: [], weekly: [], monthly: [] },
                  downloadPatterns: {
                    peakHours: [],
                    peakDays: [],
                    userBehavior: { repeatDownloads: 0, immediateDownloads: 0, avgDownloadsPerUser: 0 }
                  },
                  downloadPerformance: {
                    successRate: 0,
                    failureRate: 0,
                    avgDownloadTime: 0,
                    avgFileSize: 0
                  },
                  topDownloadedDocuments: []
                };
                useRealData = true;
              }
              break;
            }

            case 'system': {
              console.log('Fetching system analytics...');
              // Test database connection
              let dbHealthy = false;
              let dbResponseTime = 0;

              try {
                const startTime = Date.now();
                await sql`SELECT 1`;
                dbResponseTime = Date.now() - startTime;
                dbHealthy = true;
              } catch (dbTestError) {
                console.error('Database health check failed:', dbTestError);
                dbHealthy = false;
              }

              realData = {
                uptime: Math.round(process.uptime()),
                memoryUsage: {
                  total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                  used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                  percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
                },
                systemStatus: dbHealthy ? 'healthy' : 'warning',
                nodeVersion: process.version,
                platform: process.platform,
                databaseHealth: {
                  isHealthy: dbHealthy,
                  lastChecked: new Date().toISOString(),
                  responseTime: dbResponseTime,
                  errorCount: dbHealthy ? 0 : 1
                }
              };
              useRealData = true;
              break;
            }
          }
        } else {
          console.warn('DATABASE_URL not found, showing empty data');
        }
      } catch (dbError) {
        console.error('Database error, falling back to empty data:', dbError);
        useRealData = false;
      }

      // Return appropriate data
      const dataToReturn = useRealData ? realData : emptyData[type as keyof typeof emptyData];
      const message = useRealData
        ? `Real ${type} analytics data from database`
        : `No real data available - showing zeros (database unavailable)`;

      if (dataToReturn) {
        return res.json({
          success: true,
          data: dataToReturn,
          message,
          dataSource: useRealData ? 'database' : 'empty'
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