import { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, type } = req.query;
  
  try {
    switch (action) {
      case 'diagnostics':
        return await handleDiagnostics(req, res, type as string);
      case 'test-users':
        return await handleTestUsers(req, res);
      case 'cleanup':
        return await handleCleanup(req, res);
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action',
          validActions: ['diagnostics', 'test-users', 'cleanup']
        });
    }
  } catch (error) {
    console.error('Utilities API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleDiagnostics(req: VercelRequest, res: VercelResponse, type: string) {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      hasGoogleClientId: !!process.env.VITE_GOOGLE_CLIENT_ID,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      googleClientIdPrefix: process.env.VITE_GOOGLE_CLIENT_ID?.substring(0, 10),
      databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 20),
      processEnvKeys: Object.keys(process.env).filter(key => 
        ['VITE_', 'DATABASE_', 'JWT_', 'GOOGLE_'].some(prefix => key.startsWith(prefix))
      )
    };

    // Test database connection
    let dbStatus = 'unknown';
    try {
      const sql = neon(process.env.DATABASE_URL!, {
        fullResults: true,
        arrayMode: false
      });
      
      await sql`SELECT 1 as test`;
      dbStatus = 'connected';
    } catch (dbError) {
      dbStatus = `error: ${dbError.message}`;
    }

    diagnostics.databaseStatus = dbStatus;

    return res.status(200).json({
      success: true,
      diagnostics
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

async function handleTestUsers(req: VercelRequest, res: VercelResponse) {
  try {
    const sql = neon(process.env.DATABASE_URL!, {
      fullResults: true,
      arrayMode: false
    });

    // Get all users from the database
    const result = await sql`SELECT id, email, name, google_id, created_at, last_login_at, is_active FROM users ORDER BY created_at DESC`;
    const users = (result.rows || result) as any[];

    // Get user count
    const countResult = await sql`SELECT COUNT(*) as total FROM users`;
    const totalUsers = ((countResult.rows || countResult) as any[])[0]?.total || 0;

    // Get recent users (last 24 hours)
    const recentResult = await sql`
      SELECT COUNT(*) as recent 
      FROM users 
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `;
    const recentUsers = ((recentResult.rows || recentResult) as any[])[0]?.recent || 0;

    // Format users for the component
    const formattedUsers = users.map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
      documentCount: 0, // TODO: Get actual document count
      downloadCount: 0, // TODO: Get actual download count
      isActive: user.is_active,
      status: user.is_active ? 'active' : 'inactive'
    }));

    return res.status(200).json({
      success: true,
      data: {
        users: formattedUsers,
        pagination: {
          page: 1,
          limit: 20,
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / 20),
          hasNext: false,
          hasPrev: false
        },
        summary: {
          totalUsers: totalUsers,
          activeUsers: formattedUsers.filter(u => u.isActive).length,
          newUsersThisMonth: recentUsers,
          suspendedUsers: formattedUsers.filter(u => !u.isActive).length
        }
      }
    });

  } catch (error) {
    console.error('Test users API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

async function handleCleanup(req: VercelRequest, res: VercelResponse) {
  // Only allow cleanup with special token
  if (req.query.token !== 'cleanup-fake-data-2024') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden - cleanup requires valid token'
    });
  }

  try {
    const sql = neon(process.env.DATABASE_URL!, {
      fullResults: true,
      arrayMode: false
    });

    // Identify and list fake users
    const fakeEmails = [
      'john.doe@university.edu',
      'jane.smith@research.org', 
      'mike.wilson@tech.com'
    ];

    // Get fake users before deletion
    const fakeUsersResult = await sql`
      SELECT id, email, name, created_at 
      FROM users 
      WHERE email = ANY(${fakeEmails})
    `;
    const fakeUsers = (fakeUsersResult.rows || fakeUsersResult) as any[];

    // Delete fake users and their related data
    let deletedUsers = 0;
    let deletedDocuments = 0;
    let deletedDownloads = 0;

    if (fakeUsers.length > 0) {
      const fakeUserIds = fakeUsers.map(u => u.id);

      // Delete downloads first (foreign key constraint)
      try {
        const deletedDownloadsResult = await sql`
          DELETE FROM downloads 
          WHERE user_id = ANY(${fakeUserIds})
        `;
        deletedDownloads = (deletedDownloadsResult as any).count || 0;
      } catch (e) {
        console.log('No downloads table or no downloads to delete');
      }

      // Delete documents
      try {
        const deletedDocumentsResult = await sql`
          DELETE FROM documents 
          WHERE user_id = ANY(${fakeUserIds})
        `;
        deletedDocuments = (deletedDocumentsResult as any).count || 0;
      } catch (e) {
        console.log('No documents table or no documents to delete');
      }

      // Delete fake users
      const deletedUsersResult = await sql`
        DELETE FROM users 
        WHERE email = ANY(${fakeEmails})
      `;
      deletedUsers = (deletedUsersResult as any).count || 0;
    }

    // Get remaining users (should be real users only)
    const remainingUsersResult = await sql`
      SELECT id, email, name, created_at, last_login_at
      FROM users 
      ORDER BY created_at DESC
    `;
    const remainingUsers = (remainingUsersResult.rows || remainingUsersResult) as any[];

    return res.status(200).json({
      success: true,
      message: 'Fake data cleanup completed',
      data: {
        fakeUsersFound: fakeUsers,
        deletedCounts: {
          users: deletedUsers,
          documents: deletedDocuments,
          downloads: deletedDownloads
        },
        remainingUsers: remainingUsers,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
