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
    const sql = neon(process.env.DATABASE_URL!, {
      fullResults: true,
      arrayMode: false
    });

    // Get all users from the database
    const result = await sql`SELECT id, email, name, google_id, created_at, last_login_at, is_active FROM users ORDER BY created_at DESC`;
    const users = result.rows || result;

    // Get user count
    const countResult = await sql`SELECT COUNT(*) as total FROM users`;
    const totalUsers = (countResult.rows || countResult)[0]?.total || 0;

    // Get recent users (last 24 hours)
    const recentResult = await sql`
      SELECT COUNT(*) as recent 
      FROM users 
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `;
    const recentUsers = (recentResult.rows || recentResult)[0]?.recent || 0;

    return res.status(200).json({
      success: true,
      data: {
        users,
        stats: {
          total: totalUsers,
          recent: recentUsers,
          timestamp: new Date().toISOString()
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
