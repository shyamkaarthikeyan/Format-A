import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('Direct Users API called:', { method: req.method });

  try {
    // Only handle GET requests for now
    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
        message: 'Only GET requests are supported'
      });
    }

    // Try to get users from database
    try {
      console.log('Attempting to fetch users from database...');
      
      // Check if DATABASE_URL exists
      if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL not found');
        return res.json({
          success: true,
          data: [],
          message: 'No users available - DATABASE_URL not configured',
          dataSource: 'empty'
        });
      }

      // Dynamic import to avoid issues if module fails to load
      const { NeonDatabase } = await import('../_lib/neon-database');
      const db = new NeonDatabase();
      
      console.log('Testing database connection...');
      
      // Test connection first
      const isHealthy = await db.testConnection();
      
      if (!isHealthy) {
        console.error('Database connection test failed');
        return res.json({
          success: true,
          data: [],
          message: 'No users available - database connection failed',
          dataSource: 'empty'
        });
      }

      console.log('Database connection successful, initializing tables...');
      
      // Initialize tables if needed
      await db.initializeTables();
      
      console.log('Fetching all users...');
      
      // Get all users from database
      const users = await db.getAllUsers();
      
      console.log(`Successfully fetched ${users.length} users`);
      
      return res.json({
        success: true,
        data: users,
        message: `Retrieved ${users.length} users from database`,
        dataSource: 'database',
        timestamp: new Date().toISOString()
      });
      
    } catch (dbError) {
      console.error('Database error fetching users:', dbError);
      
      return res.json({
        success: true,
        data: [],
        message: `Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`,
        dataSource: 'error',
        error: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
    }

  } catch (error) {
    console.error('Users API error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}