import { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Check environment variables first
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        success: false,
        error: 'MISSING_DATABASE_URL',
        message: 'DATABASE_URL environment variable is not set in Vercel',
        hint: 'Add DATABASE_URL to Vercel environment variables'
      });
    }

    // Simple database connection
    const sql = neon(process.env.DATABASE_URL, {
      fullResults: true,
      arrayMode: false
    });

    // Test connection first
    await sql`SELECT 1 as test`;

    // Return mock user data for now to test if the basic structure works
    const mockUsers = [
      {
        id: 'user_1',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: '2024-10-01T10:00:00Z',
        lastLoginAt: '2024-10-29T15:30:00Z',
        documentCount: 3,
        downloadCount: 5,
        isActive: true,
        status: 'active'
      },
      {
        id: 'user_2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        createdAt: '2024-09-15T14:20:00Z',
        lastLoginAt: '2024-10-28T09:15:00Z',
        documentCount: 7,
        downloadCount: 12,
        isActive: true,
        status: 'active'
      },
      {
        id: 'user_3',
        name: 'Bob Johnson',
        email: 'bob@example.com',
        createdAt: '2024-08-20T11:45:00Z',
        lastLoginAt: '2024-09-30T16:20:00Z',
        documentCount: 1,
        downloadCount: 2,
        isActive: false,
        status: 'inactive'
      },
      {
        id: 'user_4',
        name: 'Alice Brown',
        email: 'alice@example.com',
        createdAt: '2024-10-25T08:30:00Z',
        lastLoginAt: '2024-10-29T12:45:00Z',
        documentCount: 2,
        downloadCount: 3,
        isActive: true,
        status: 'active'
      },
      {
        id: 'user_5',
        name: 'Charlie Wilson',
        email: 'charlie@example.com',
        createdAt: '2024-07-10T13:15:00Z',
        lastLoginAt: null,
        documentCount: 0,
        downloadCount: 0,
        isActive: false,
        status: 'inactive'
      }
    ];

    const activeUsers = mockUsers.filter(u => u.isActive).length;
    const newUsersThisMonth = mockUsers.filter(u => 
      new Date(u.createdAt) > new Date('2024-10-01')
    ).length;

    return res.json({
      success: true,
      data: {
        users: mockUsers,
        pagination: {
          page: 1,
          limit: 20,
          total: mockUsers.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        },
        summary: {
          totalUsers: mockUsers.length,
          activeUsers,
          newUsersThisMonth,
          suspendedUsers: 0
        }
      }
    });

  } catch (error) {
    console.error('Simple users API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: {
        hasDbUrl: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      }
    });
  }
}