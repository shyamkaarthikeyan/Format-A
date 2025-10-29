import { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('Testing database connection...');
    
    // Check if DATABASE_URL exists
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        error: 'MISSING_DATABASE_URL',
        message: 'DATABASE_URL environment variable is not set',
        availableEnvVars: Object.keys(process.env).filter(key => 
          key.includes('DATABASE') || key.includes('POSTGRES') || key.includes('NEON')
        )
      });
    }

    // Test basic connection
    const sql = neon(process.env.DATABASE_URL, {
      fullResults: true,
      arrayMode: false
    });

    console.log('Attempting database query...');
    const startTime = Date.now();
    const result = await sql`SELECT 1 as test, NOW() as current_time`;
    const responseTime = Date.now() - startTime;

    console.log('Database query successful:', result);

    return res.status(200).json({
      success: true,
      message: 'Database connection successful',
      data: {
        responseTime: `${responseTime}ms`,
        result: result.rows[0],
        connectionInfo: {
          hasUrl: !!process.env.DATABASE_URL,
          urlPrefix: process.env.DATABASE_URL.substring(0, 20) + '...',
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'DATABASE_CONNECTION_FAILED',
      message: error instanceof Error ? error.message : 'Unknown database error',
      details: {
        name: error instanceof Error ? error.name : undefined,
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined,
        hasUrl: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV
      }
    });
  }
}