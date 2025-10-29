import { VercelRequest, VercelResponse } from '@vercel/node';
import { neonDb } from '../../_lib/neon-database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use GET.' 
    });
  }

  try {
    console.log('📊 Fetching user analytics from Neon database...');

    // Get user analytics from database
    const analytics = await neonDb.getUserAnalytics();
    
    // Get all users for additional processing
    const allUsers = await neonDb.getAllUsers();
    
    // Generate user growth data for charts (last 30 days)
    const userGrowthData = generateUserGrowthData(allUsers);
    
    // Generate user activity data (last 7 days)
    const userActivityData = generateUserActivityData(allUsers);

    const response = {
      success: true,
      data: {
        totalUsers: parseInt(analytics.total_users) || 0,
        activeUsers: parseInt(analytics.active_users) || 0,
        newUsersToday: parseInt(analytics.new_users_today) || 0,
        newUsers7d: parseInt(analytics.new_users_7d) || 0,
        newUsers30d: parseInt(analytics.new_users_30d) || 0,
        activeUsers7d: parseInt(analytics.active_users_7d) || 0,
        activeUsers30d: parseInt(analytics.active_users_30d) || 0,
        userGrowthData,
        userActivityData,
        recentUsers: allUsers.slice(0, 10).map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          created_at: user.created_at,
          last_login_at: user.last_login_at,
          is_active: user.is_active
        }))
      },
      timestamp: new Date().toISOString()
    };

    console.log('✅ User analytics fetched successfully:', {
      totalUsers: response.data.totalUsers,
      activeUsers: response.data.activeUsers,
      newUsersToday: response.data.newUsersToday
    });

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error fetching user analytics:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user analytics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Helper function to generate user growth data for charts
function generateUserGrowthData(users: any[]) {
  const last30Days = [];
  const now = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    
    const newUsers = users.filter(user => {
      const userDate = new Date(user.created_at).toISOString().split('T')[0];
      return userDate === dateStr;
    }).length;
    
    const totalUsers = users.filter(user => 
      new Date(user.created_at) <= date
    ).length;
    
    last30Days.push({
      date: dateStr,
      newUsers,
      totalUsers
    });
  }
  
  return last30Days;
}

// Helper function to generate user activity data
function generateUserActivityData(users: any[]) {
  const last7Days = [];
  const now = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    
    const activeUsers = users.filter(user => {
      if (!user.last_login_at) return false;
      const loginDate = new Date(user.last_login_at).toISOString().split('T')[0];
      return loginDate === dateStr;
    }).length;
    
    last7Days.push({
      date: dateStr,
      activeUsers
    });
  }
  
  return last7Days;
}