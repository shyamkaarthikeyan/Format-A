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

  try {
    // Extract path from query parameters
    const { path } = req.query;
    const pathArray = Array.isArray(path) ? path : [path].filter(Boolean);
    const endpoint = pathArray.join('/');

    console.log('Testing API processing endpoint:', endpoint);

    // Route to appropriate handler
    switch (endpoint) {
      case 'auth-dependencies':
        return await handleAuthDependencies(req, res);
      case 'simple-auth':
        return await handleSimpleAuth(req, res);
      case 'users':
        return await handleTestUsers(req, res);
      case 'utils':
        return await handleUtils(req, res);
      case 'cleanup-fake-data':
        return await handleCleanupFakeData(req, res);
      default:
        return res.status(404).json({ 
          error: 'Testing endpoint not found', 
          endpoint,
          availableEndpoints: ['auth-dependencies', 'simple-auth', 'users', 'utils', 'cleanup-fake-data']
        });
    }
  } catch (error) {
    console.error('Testing API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Auth dependencies test handler - extracted from api/test-auth-dependencies.ts
async function handleAuthDependencies(req: VercelRequest, res: VercelResponse) {
  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      dependencies: {},
      environmentVariables: {}
    };

    // Test environment variables
    results.environmentVariables = {
      VITE_GOOGLE_CLIENT_ID: process.env.VITE_GOOGLE_CLIENT_ID ? 'SET' : 'MISSING',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING'
    };

    // Test Google Auth Library import
    try {
      const { OAuth2Client } = await import('google-auth-library');
      results.dependencies.googleAuthLibrary = {
        status: 'SUCCESS',
        canInstantiate: false
      };
      
      // Try to instantiate OAuth2Client
      try {
        const client = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);
        results.dependencies.googleAuthLibrary.canInstantiate = true;
      } catch (e) {
        results.dependencies.googleAuthLibrary.instantiationError = e.message;
      }
    } catch (e) {
      results.dependencies.googleAuthLibrary = {
        status: 'FAILED',
        error: e.message
      };
    }

    // Test JWT library import
    try {
      const jwt = await import('jsonwebtoken');
      results.dependencies.jsonwebtoken = {
        status: 'SUCCESS',
        canSign: false
      };
      
      // Try to sign a token
      try {
        const token = jwt.sign({ test: 'data' }, 'test-secret', { expiresIn: '1h' });
        results.dependencies.jsonwebtoken.canSign = true;
      } catch (e) {
        results.dependencies.jsonwebtoken.signError = e.message;
      }
    } catch (e) {
      results.dependencies.jsonwebtoken = {
        status: 'FAILED',
        error: e.message
      };
    }

    // Test Neon database import
    try {
      const { neonDb } = await import('./_lib/neon-database');
      results.dependencies.neonDatabase = {
        status: 'SUCCESS',
        canInitialize: false
      };
      
      // Try to initialize database
      try {
        await neonDb.initialize();
        results.dependencies.neonDatabase.canInitialize = true;
      } catch (e) {
        results.dependencies.neonDatabase.initError = e.message;
      }
    } catch (e) {
      results.dependencies.neonDatabase = {
        status: 'FAILED',
        error: e.message
      };
    }

    return res.status(200).json({
      success: true,
      message: 'Dependency test completed',
      results
    });

  } catch (error) {
    console.error('Dependency test error:', error);
    return res.status(500).json({
      success: false,
      error: 'Dependency test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Simple auth test handler - extracted from api/test-simple-auth.ts
async function handleSimpleAuth(req: VercelRequest, res: VercelResponse) {
  try {
    // Simple test without external dependencies
    console.log('🔍 Testing simple auth endpoint...');
    
    // Check environment variables
    const hasGoogleClientId = !!process.env.VITE_GOOGLE_CLIENT_ID;
    const hasJwtSecret = !!process.env.JWT_SECRET;
    const hasDatabaseUrl = !!process.env.DATABASE_URL;
    
    return res.status(200).json({
      success: true,
      message: 'Simple auth test successful',
      environment: {
        hasGoogleClientId,
        hasJwtSecret,
        hasDatabaseUrl,
        nodeVersion: process.version,
        platform: process.platform
      }
    });
  } catch (error) {
    console.error('Simple auth test error:', error);
    return res.status(500).json({
      success: false,
      error: 'Simple auth test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Test users handler - extracted from api/test-users.ts
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

// Utils handler - extracted from api/utils.ts
async function handleUtils(req: VercelRequest, res: VercelResponse) {
  const { action, type } = req.query;
  
  try {
    switch (action) {
      case 'diagnostics':
        return await handleDiagnostics(req, res, type as string);
      case 'test-users':
        return await handleUtilsTestUsers(req, res);
      case 'cleanup':
        return await handleUtilsCleanup(req, res);
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

// Diagnostics handler for utils
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

// Utils test users handler
async function handleUtilsTestUsers(req: VercelRequest, res: VercelResponse) {
  return await handleTestUsers(req, res); // Reuse the main test users handler
}

// Utils cleanup handler
async function handleUtilsCleanup(req: VercelRequest, res: VercelResponse) {
  return await handleCleanupFakeData(req, res); // Reuse the main cleanup handler
}

// Cleanup fake data handler - extracted from api/cleanup-fake-data.ts
async function handleCleanupFakeData(req: VercelRequest, res: VercelResponse) {
  // Only allow in development or with special token
  if (process.env.NODE_ENV === 'production' && req.query.token !== 'cleanup-fake-data-2024') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden - cleanup not allowed in production without token'
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