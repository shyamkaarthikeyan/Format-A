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
