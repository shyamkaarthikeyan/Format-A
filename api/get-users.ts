import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('Get Users API called:', { method: req.method, timestamp: new Date().toISOString() });

  try {
    // Only handle GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
        message: 'Only GET requests are supported'
      });
    }

    console.log('Attempting to fetch users from database...');
    
    // Check if DATABASE_URL exists
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL not found');
      return res.json({
        success: true,
        data: [],
        message: 'DATABASE_URL not configured',
        dataSource: 'no_database_url',
        timestamp: new Date().toISOString()
      });
    }

    console.log('DATABASE_URL found, importing database module...');

    // Dynamic import to avoid issues if module fails to load
    const { NeonDatabase } = await import('./_lib/neon-database');
    const db = new NeonDatabase();
    
    console.log('Testing database connection...');
    
    // Test connection first
    const isHealthy = await db.testConnection();
    
    if (!isHealthy) {
      console.error('Database connection test failed');
      return res.json({
        success: true,
        data: [],
        message: 'Database connection test failed',
        dataSource: 'connection_failed',
        timestamp: new Date().toISOString()
      });
    }

    console.log('Database connection successful, initializing tables...');
    
    // Initialize tables if needed
    await db.initializeTables();
    
    console.log('Fetching all users from database...');
    
    // Get all users from database
    const users = await db.getAllUsers();
    
    console.log(`Successfully fetched ${users.length} users from database`);
    
    // Return users with additional metadata
    return res.json({
      success: true,
      data: users,
      message: `Retrieved ${users.length} users from database`,
      dataSource: 'database',
      timestamp: new Date().toISOString(),
      summary: {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.is_active).length,
        recentLogins: users.filter(u => {
          if (!u.last_login_at) return false;
          const loginDate = new Date(u.last_login_at);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return loginDate > dayAgo;
        }).length
      }
    });
    
  } catch (error) {
    console.error('Get Users API error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}