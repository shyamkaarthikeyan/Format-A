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
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    const users = await storage.getAllUsers();
    const documents = await storage.getAllDocuments();
    
    const totalMemoryMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const usedMemoryMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const memoryUsagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
    
    let systemStatus = 'healthy';
    if (memoryUsagePercent > 80) systemStatus = 'warning';
    if (memoryUsagePercent > 95) systemStatus = 'critical';

    return res.json({
      success: true,
      data: {
        uptime: Math.round(uptime),
        memoryUsage: {
          total: totalMemoryMB,
          used: usedMemoryMB,
          percentage: memoryUsagePercent
        },
        systemStatus,
        nodeVersion: process.version,
        platform: process.platform,
        totalDocuments: documents.length,
        totalUsers: users.length
      }
    });
  } catch (error) {
    console.error('System analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}