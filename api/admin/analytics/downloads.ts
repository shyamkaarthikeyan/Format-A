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
    console.log('📊 Fetching download analytics from Neon database...');

    // Get download analytics from database
    const analytics = await neonDb.getDownloadAnalytics();
    
    // Get all downloads for additional processing
    const allDownloads = await neonDb.getAllDownloads();
    
    // Generate download trends data
    const downloadTrends = generateDownloadTrends(allDownloads);
    
    // Generate format distribution
    const formatDistribution = generateFormatDistribution(allDownloads);

    const response = {
      success: true,
      data: {
        totalDownloads: parseInt(analytics.total_downloads) || 0,
        downloadsToday: parseInt(analytics.downloads_today) || 0,
        downloads7d: parseInt(analytics.downloads_7d) || 0,
        downloads30d: parseInt(analytics.downloads_30d) || 0,
        pdfDownloads: parseInt(analytics.pdf_downloads) || 0,
        docxDownloads: parseInt(analytics.docx_downloads) || 0,
        avgFileSize: parseFloat(analytics.avg_file_size) || 0,
        downloadTrends: {
          daily: downloadTrends
        },
        formatDistribution,
        recentDownloads: allDownloads.slice(0, 10).map(download => ({
          id: download.id,
          document_title: download.document_title,
          file_format: download.file_format,
          file_size: download.file_size,
          user_name: download.user_name || 'Unknown',
          user_email: download.user_email || 'Unknown',
          downloaded_at: download.downloaded_at
        }))
      },
      timestamp: new Date().toISOString()
    };

    console.log('✅ Download analytics fetched successfully:', {
      totalDownloads: response.data.totalDownloads,
      downloadsToday: response.data.downloadsToday
    });

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error fetching download analytics:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch download analytics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Helper function to generate download trends data
function generateDownloadTrends(downloads: any[]) {
  const last30Days = [];
  const now = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    
    const downloadsCount = downloads.filter(download => {
      const downloadDate = new Date(download.downloaded_at).toISOString().split('T')[0];
      return downloadDate === dateStr;
    }).length;
    
    last30Days.push({
      date: dateStr,
      count: downloadsCount
    });
  }
  
  return last30Days;
}

// Helper function to generate format distribution
function generateFormatDistribution(downloads: any[]) {
  const formatCounts = downloads.reduce((acc, download) => {
    const format = download.file_format || 'unknown';
    acc[format] = (acc[format] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(formatCounts).map(([format, count]) => ({
    format,
    count: count as number,
    percentage: downloads.length > 0 ? Math.round(((count as number) / downloads.length) * 100) : 0
  }));
}