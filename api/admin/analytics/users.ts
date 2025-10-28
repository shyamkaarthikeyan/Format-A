import { VercelRequest, VercelResponse } from '@vercel/node';
import { getStorage } from '../../_lib/storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Admin authentication
  const adminToken = req.headers['x-admin-token'] as string;
  if (!adminToken || !adminToken.startsWith('admin_token_')) {
    return res.status(401).json({ 
      success: false,
      error: 'ADMIN_AUTH_REQUIRED', 
      message: 'Valid admin token required'
    });
  }

  try {
    const storage = getStorage();
    const users = await storage.getAllUsers();
    const documents = await storage.getAllDocuments();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const totalUsers = users.length;
    const activeUsers24h = users.filter((user: any) => 
      user.lastLoginAt && new Date(user.lastLoginAt) > twentyFourHoursAgo
    ).length;
    const activeUsers7d = users.filter((user: any) => 
      user.lastLoginAt && new Date(user.lastLoginAt) > sevenDaysAgo
    ).length;
    const activeUsers30d = users.filter((user: any) => 
      user.lastLoginAt && new Date(user.lastLoginAt) > thirtyDaysAgo
    ).length;
    
    const newUsersThisMonth = users.filter((user: any) => 
      user.createdAt && new Date(user.createdAt) >= thisMonth
    ).length;
    const newUsersLastMonth = users.filter((user: any) => 
      user.createdAt && new Date(user.createdAt) >= lastMonth && new Date(user.createdAt) < thisMonth
    ).length;
    
    const growthRate = newUsersLastMonth > 0 
      ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100 
      : newUsersThisMonth > 0 ? 100 : 0;

    // Get user document counts
    const userDocCounts = new Map();
    documents.forEach((doc: any) => {
      const count = userDocCounts.get(doc.userId) || 0;
      userDocCounts.set(doc.userId, count + 1);
    });

    // Get user download counts
    const userDownloadCounts = new Map();
    for (const user of users) {
      const userDownloads = await storage.getUserDownloads(user.id);
      userDownloadCounts.set(user.id, userDownloads.downloads.length);
    }

    // Create top users list
    const topUsers = users
      .map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        documentsCreated: userDocCounts.get(user.id) || 0,
        downloadsCount: userDownloadCounts.get(user.id) || 0,
        lastActive: user.lastLoginAt || user.createdAt
      }))
      .sort((a: any, b: any) => (b.documentsCreated + b.downloadsCount) - (a.documentsCreated + a.downloadsCount))
      .slice(0, 10);

    // Generate daily registration data for the last 30 days
    const dailyRegistrations = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      const count = users.filter((user: any) => 
        user.createdAt && user.createdAt.startsWith(dateStr)
      ).length;
      dailyRegistrations.push({ date: dateStr, count });
    }

    return res.json({
      success: true,
      data: {
        totalUsers,
        newUsers: {
          daily: dailyRegistrations,
          weekly: [],
          monthly: []
        },
        activeUsers: {
          last24h: activeUsers24h,
          last7d: activeUsers7d,
          last30d: activeUsers30d
        },
        userGrowth: {
          thisMonth: newUsersThisMonth,
          lastMonth: newUsersLastMonth,
          growthRate
        },
        topUsers
      }
    });
  } catch (error) {
    console.error('User analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}