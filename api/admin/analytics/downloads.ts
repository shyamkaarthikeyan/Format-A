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
    let allDownloads: any[] = [];
    
    for (const user of users) {
      const userDownloads = await storage.getUserDownloads(user.id);
      allDownloads = allDownloads.concat(userDownloads.downloads);
    }
    
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const totalDownloads = allDownloads.length;
    const downloadsThisMonth = allDownloads.filter((download: any) => 
      new Date(download.downloadedAt) >= thisMonthStart
    ).length;
    
    const pdfDownloads = allDownloads.filter((download: any) => 
      download.fileFormat === 'pdf'
    ).length;
    const docxDownloads = allDownloads.filter((download: any) => 
      download.fileFormat === 'docx'
    ).length;

    // Calculate format distribution
    const downloadsByFormat = [
      {
        format: 'pdf',
        count: pdfDownloads,
        percentage: totalDownloads > 0 ? Math.round((pdfDownloads / totalDownloads) * 100) : 0
      },
      {
        format: 'docx',
        count: docxDownloads,
        percentage: totalDownloads > 0 ? Math.round((docxDownloads / totalDownloads) * 100) : 0
      }
    ];

    // Generate daily download trends for the last 30 days
    const dailyTrends = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      const count = allDownloads.filter((download: any) => 
        download.downloadedAt && download.downloadedAt.startsWith(dateStr)
      ).length;
      dailyTrends.push({ date: dateStr, count });
    }

    return res.json({
      success: true,
      data: {
        totalDownloads,
        downloadsByFormat,
        downloadTrends: {
          daily: dailyTrends,
          weekly: [],
          monthly: []
        }
      }
    });
  } catch (error) {
    console.error('Download analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}