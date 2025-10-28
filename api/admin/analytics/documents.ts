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
    const documents = await storage.getAllDocuments();
    const users = await storage.getAllUsers();
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    const totalDocuments = documents.length;
    const documentsThisMonth = documents.filter((doc: any) => 
      doc.createdAt && new Date(doc.createdAt) >= thisMonthStart
    ).length;
    const documentsLastMonth = documents.filter((doc: any) => 
      doc.createdAt && new Date(doc.createdAt) >= lastMonthStart && new Date(doc.createdAt) < thisMonthStart
    ).length;
    const documentsThisWeek = documents.filter((doc: any) => 
      doc.createdAt && new Date(doc.createdAt) >= sevenDaysAgo
    ).length;

    // Calculate growth rate
    const growthRate = documentsLastMonth > 0 
      ? ((documentsThisMonth - documentsLastMonth) / documentsLastMonth) * 100 
      : documentsThisMonth > 0 ? 100 : 0;

    // Generate daily creation trends for the last 30 days
    const dailyCreation = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      const count = documents.filter((doc: any) => 
        doc.createdAt && doc.createdAt.startsWith(dateStr)
      ).length;
      dailyCreation.push({ date: dateStr, count });
    }

    // Recent documents with author info
    const recentDocuments = documents
      .slice(0, 10)
      .map((doc: any) => {
        const author = users.find((u: any) => u.id === doc.userId);
        return {
          id: doc.id,
          title: doc.title,
          author: author?.name || 'Unknown',
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          source: doc.source
        };
      });

    return res.json({
      success: true,
      data: {
        totalDocuments,
        documentsThisMonth,
        documentsThisWeek,
        growthRate,
        documentTrends: {
          daily: dailyCreation,
          weekly: [],
          monthly: []
        },
        recentDocuments
      }
    });
  } catch (error) {
    console.error('Document analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}