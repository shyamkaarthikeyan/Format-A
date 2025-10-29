import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    console.log('Database connected successfully');
    
    // Check environment variables
    const envVars = {
      POSTGRES_URL: !!process.env.POSTGRES_URL,
      POSTGRES_USER: !!process.env.POSTGRES_USER,
      POSTGRES_HOST: !!process.env.POSTGRES_HOST,
      POSTGRES_DATABASE: !!process.env.POSTGRES_DATABASE,
      POSTGRES_PASSWORD: !!process.env.POSTGRES_PASSWORD
    };
    
    // Test table creation
    await sql`
      CREATE TABLE IF NOT EXISTS test_table (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    // Insert test data
    await sql`INSERT INTO test_table DEFAULT VALUES`;
    
    // Query test data
    const testData = await sql`SELECT COUNT(*) as count FROM test_table`;
    
    // Clean up
    await sql`DROP TABLE test_table`;
    
    return res.json({
      success: true,
      message: 'Database connection successful',
      data: {
        currentTime: result.rows[0].current_time,
        postgresVersion: result.rows[0].pg_version,
        environmentVariables: envVars,
        testInsertCount: testData.rows[0].count
      }
    });
    
  } catch (error) {
    console.error('Database test failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: {
        hasPostgresUrl: !!process.env.POSTGRES_URL,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      }
    });
  }
}