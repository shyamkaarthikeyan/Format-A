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

    const { path, type } = req.query;
    
    // Fix path processing
    let pathArray: string[] = [];
    if (Array.isArray(path)) {
      pathArray = path.filter(Boolean);
    } else if (typeof path === 'string' && path) {
      pathArray = [path];
    }
    
    const endpoint = pathArray.join('/');

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
          downloadsCount: downloads?.downloads?.length || downloads?.length || 0,
          totalItems: downloads?.pagination?.totalItems || downloads?.length || 0,
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

      // Try to get real database data first
      let useRealData = false;
      let realData = null;
      
      try {
        // Only attempt database connection if DATABASE_URL exists
        if (process.env.DATABASE_URL) {
          console.log('Attempting database connection for analytics...');
          
          // Dynamic import to avoid issues if module fails to load
          const { NeonDatabase } = await import('./_lib/neon-database.js');
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
            console.warn('Database connection test failed, showing empty data');
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