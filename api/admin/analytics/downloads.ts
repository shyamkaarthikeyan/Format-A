import { VercelRequest, VercelResponse } from '@vercel/node';
import AdminMiddleware, { AdminRequest } from '../../_lib/admin-middleware';
import { getStorage } from '../../_lib/storage';

interface DownloadAnalytics {
  totalDownloads: number;
  downloadsByFormat: {
    format: 'pdf' | 'docx';
    count: number;
    percentage: number;
  }[];
  downloadTrends: {
    daily: { date: string; count: number }[];
    weekly: { week: string; count: number }[];
    monthly: { month: string; count: number }[];
  };
  downloadPatterns: {
    peakHours: { hour: number; count: number }[];
    peakDays: { day: string; count: number }[];
    userBehavior: {
      averageDownloadsPerUser: number;
      repeatDownloadRate: number;
      immediateDownloadRate: number;
    };
  };
  downloadPerformance: {
    successRate: number;
    failureRate: number;
    averageFileSize: number;
    averageDownloadTime: number;
  };
  topDownloadedDocuments: {
    id: string;
    title: string;
    author: string;
    downloadCount: number;
    formats: string[];
    lastDownloaded: string;
  }[];
  downloadDistribution: {
    byUser: { userId: string; userName: string; downloadCount: number }[];
    byDocument: { documentId: string; title: string; downloadCount: number }[];
    byTimeOfDay: { hour: number; count: number }[];
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Protect with admin middleware
  return AdminMiddleware.protect(
    req as AdminRequest,
    res,
    ['view_analytics'],
    async (req: AdminRequest, res: VercelResponse) => {
      try {
        const { timeRange = '30d', format = 'all' } = req.query;
        
        await AdminMiddleware.logAdminAction(req, 'view_download_analytics', { 
          timeRange, 
          format 
        });

        const storage = getStorage();
        const analytics = await calculateDownloadAnalytics(storage, {
          timeRange: timeRange as string,
          format: format as string
        });

        res.status(200).json({
          success: true,
          data: analytics,
          generatedAt: new Date().toISOString(),
          timeRange,
          format
        });

      } catch (error) {
        console.error('Download analytics error:', error);
        res.status(500).json({
          error: 'Failed to generate download analytics',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );
}as
ync function calculateDownloadAnalytics(
  storage: any, 
  options: { timeRange: string; format: string }
): Promise<DownloadAnalytics> {
  const now = new Date();
  const timeRangeMs = parseTimeRange(options.timeRange);
  const startDate = new Date(now.getTime() - timeRangeMs);

  try {
    // Get all download records
    const allDownloads = await storage.getAllDownloads();
    
    // Filter downloads based on time range and format
    const downloads = allDownloads.filter((download: any) => {
      const downloadDate = new Date(download.downloadedAt || download.createdAt);
      const inTimeRange = downloadDate >= startDate && downloadDate <= now;
      const matchesFormat = options.format === 'all' || download.format === options.format;
      return inTimeRange && matchesFormat;
    });
    
    // Get related documents and users for enriched analytics
    const documents = await storage.getAllDocuments();
    const users = await storage.getAllUsers();
    
    // Calculate total downloads
    const totalDownloads = downloads.length;

    // Calculate downloads by format
    const downloadsByFormat = calculateDownloadsByFormat(downloads);
    
    // Calculate download trends
    const downloadTrends = calculateDownloadTrends(downloads, startDate, now);
    
    // Calculate download patterns
    const downloadPatterns = calculateDownloadPatterns(downloads, users);
    
    // Calculate download performance
    const downloadPerformance = calculateDownloadPerformance(downloads);
    
    // Get top downloaded documents
    const topDownloadedDocuments = getTopDownloadedDocuments(downloads, documents);
    
    // Calculate download distribution
    const downloadDistribution = calculateDownloadDistribution(downloads, users, documents);

    return {
      totalDownloads,
      downloadsByFormat,
      downloadTrends,
      downloadPatterns,
      downloadPerformance,
      topDownloadedDocuments,
      downloadDistribution
    };

  } catch (error) {
    console.error('Error calculating download analytics:', error);
    throw new Error('Failed to calculate download analytics');
  }
}

function parseTimeRange(timeRange: string): number {
  const timeRangeMap: { [key: string]: number } = {
    '1d': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000
  };
  
  return timeRangeMap[timeRange] || timeRangeMap['30d'];
}

function calculateDownloadsByFormat(downloads: any[]) {
  const formatCount = downloads.reduce((acc, download) => {
    const format = download.format || 'pdf';
    acc[format] = (acc[format] || 0) + 1;
    return acc;
  }, {});

  const total = downloads.length;
  
  return Object.entries(formatCount).map(([format, count]) => ({
    format: format as 'pdf' | 'docx',
    count: count as number,
    percentage: total > 0 ? Math.round(((count as number) / total) * 100) : 0
  })).sort((a, b) => b.count - a.count);
}

function calculateDownloadTrends(downloads: any[], startDate: Date, endDate: Date) {
  const daily: { date: string; count: number }[] = [];
  const weekly: { week: string; count: number }[] = [];
  const monthly: { month: string; count: number }[] = [];

  // Group downloads by date
  const downloadsByDate = downloads.reduce((acc, download) => {
    const date = new Date(download.downloadedAt || download.createdAt);
    const dateKey = date.toISOString().split('T')[0];
    acc[dateKey] = (acc[dateKey] || 0) + 1;
    return acc;
  }, {});

  // Generate daily data
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    daily.push({
      date: dateKey,
      count: downloadsByDate[dateKey] || 0
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Generate weekly data
  for (let i = 0; i < daily.length; i += 7) {
    const weekData = daily.slice(i, i + 7);
    const weekCount = weekData.reduce((sum, day) => sum + day.count, 0);
    const weekStart = weekData[0]?.date || '';
    weekly.push({
      week: weekStart,
      count: weekCount
    });
  }

  // Generate monthly data
  const monthlyData = downloads.reduce((acc, download) => {
    const date = new Date(download.downloadedAt || download.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    acc[monthKey] = (acc[monthKey] || 0) + 1;
    return acc;
  }, {});

  Object.entries(monthlyData).forEach(([month, count]) => {
    monthly.push({ month, count: count as number });
  });

  return { daily, weekly, monthly };
}

function calculateDownloadPatterns(downloads: any[], users: any[]) {
  // Peak hours analysis
  const hourCounts = downloads.reduce((acc, download) => {
    const date = new Date(download.downloadedAt || download.createdAt);
    const hour = date.getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {});

  const peakHours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: hourCounts[hour] || 0
  })).sort((a, b) => b.count - a.count);

  // Peak days analysis
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayCounts = downloads.reduce((acc, download) => {
    const date = new Date(download.downloadedAt || download.createdAt);
    const day = dayNames[date.getDay()];
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  const peakDays = dayNames.map(day => ({
    day,
    count: dayCounts[day] || 0
  })).sort((a, b) => b.count - a.count);

  // User behavior analysis
  const userDownloads = downloads.reduce((acc, download) => {
    const userId = download.userId;
    if (userId) {
      acc[userId] = (acc[userId] || 0) + 1;
    }
    return acc;
  }, {});

  const totalUsers = Object.keys(userDownloads).length;
  const totalDownloads = downloads.length;
  const averageDownloadsPerUser = totalUsers > 0 ? totalDownloads / totalUsers : 0;

  // Repeat download rate (users with more than 1 download)
  const repeatUsers = Object.values(userDownloads).filter(count => (count as number) > 1).length;
  const repeatDownloadRate = totalUsers > 0 ? (repeatUsers / totalUsers) * 100 : 0;

  // Immediate download rate (downloads within 5 minutes of document creation)
  const immediateDownloads = downloads.filter(download => {
    if (!download.documentCreatedAt || !download.downloadedAt) return false;
    const created = new Date(download.documentCreatedAt).getTime();
    const downloaded = new Date(download.downloadedAt).getTime();
    return (downloaded - created) <= (5 * 60 * 1000); // 5 minutes
  }).length;
  const immediateDownloadRate = totalDownloads > 0 ? (immediateDownloads / totalDownloads) * 100 : 0;

  return {
    peakHours: peakHours.slice(0, 10),
    peakDays,
    userBehavior: {
      averageDownloadsPerUser: Math.round(averageDownloadsPerUser * 10) / 10,
      repeatDownloadRate: Math.round(repeatDownloadRate * 10) / 10,
      immediateDownloadRate: Math.round(immediateDownloadRate * 10) / 10
    }
  };
}

function calculateDownloadPerformance(downloads: any[]) {
  const successfulDownloads = downloads.filter(d => d.status === 'success' || !d.status);
  const failedDownloads = downloads.filter(d => d.status === 'failed' || d.status === 'error');
  
  const total = downloads.length;
  const successRate = total > 0 ? (successfulDownloads.length / total) * 100 : 100;
  const failureRate = total > 0 ? (failedDownloads.length / total) * 100 : 0;

  // Calculate average file size
  const fileSizes = downloads.filter(d => d.fileSize && d.fileSize > 0).map(d => d.fileSize);
  const averageFileSize = fileSizes.length > 0 
    ? fileSizes.reduce((sum, size) => sum + size, 0) / fileSizes.length 
    : 0;

  // Calculate average download time
  const downloadTimes = downloads
    .filter(d => d.downloadStartTime && d.downloadEndTime)
    .map(d => {
      const start = new Date(d.downloadStartTime).getTime();
      const end = new Date(d.downloadEndTime).getTime();
      return end - start;
    });
  
  const averageDownloadTime = downloadTimes.length > 0
    ? downloadTimes.reduce((sum, time) => sum + time, 0) / downloadTimes.length
    : 0;

  return {
    successRate: Math.round(successRate * 10) / 10,
    failureRate: Math.round(failureRate * 10) / 10,
    averageFileSize: Math.round(averageFileSize / 1024), // Convert to KB
    averageDownloadTime: Math.round(averageDownloadTime / 1000) // Convert to seconds
  };
}

function getTopDownloadedDocuments(downloads: any[], documents: any[]) {
  // Group downloads by document
  const downloadsByDoc = downloads.reduce((acc, download) => {
    const docId = download.documentId;
    if (!acc[docId]) {
      acc[docId] = {
        count: 0,
        formats: new Set(),
        lastDownloaded: download.downloadedAt || download.createdAt
      };
    }
    acc[docId].count++;
    acc[docId].formats.add(download.format || 'pdf');
    
    const downloadDate = new Date(download.downloadedAt || download.createdAt);
    const lastDate = new Date(acc[docId].lastDownloaded);
    if (downloadDate > lastDate) {
      acc[docId].lastDownloaded = download.downloadedAt || download.createdAt;
    }
    
    return acc;
  }, {});

  // Get document details and sort by download count
  return Object.entries(downloadsByDoc)
    .map(([docId, data]: [string, any]) => {
      const document = documents.find(doc => doc.id === docId);
      return {
        id: docId,
        title: document?.title || 'Untitled Document',
        author: document?.authorName || document?.userEmail || 'Anonymous',
        downloadCount: data.count,
        formats: Array.from(data.formats),
        lastDownloaded: data.lastDownloaded
      };
    })
    .sort((a, b) => b.downloadCount - a.downloadCount)
    .slice(0, 10);
}

function calculateDownloadDistribution(downloads: any[], users: any[], documents: any[]) {
  // Distribution by user
  const userDownloads = downloads.reduce((acc, download) => {
    const userId = download.userId;
    if (userId) {
      acc[userId] = (acc[userId] || 0) + 1;
    }
    return acc;
  }, {});

  const byUser = Object.entries(userDownloads)
    .map(([userId, count]) => {
      const user = users.find(u => u.id === userId);
      return {
        userId,
        userName: user?.name || user?.email || 'Anonymous',
        downloadCount: count as number
      };
    })
    .sort((a, b) => b.downloadCount - a.downloadCount)
    .slice(0, 20);

  // Distribution by document
  const docDownloads = downloads.reduce((acc, download) => {
    const docId = download.documentId;
    if (docId) {
      acc[docId] = (acc[docId] || 0) + 1;
    }
    return acc;
  }, {});

  const byDocument = Object.entries(docDownloads)
    .map(([documentId, count]) => {
      const document = documents.find(d => d.id === documentId);
      return {
        documentId,
        title: document?.title || 'Untitled Document',
        downloadCount: count as number
      };
    })
    .sort((a, b) => b.downloadCount - a.downloadCount)
    .slice(0, 20);

  // Distribution by time of day
  const hourCounts = downloads.reduce((acc, download) => {
    const date = new Date(download.downloadedAt || download.createdAt);
    const hour = date.getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {});

  const byTimeOfDay = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: hourCounts[hour] || 0
  }));

  return {
    byUser,
    byDocument,
    byTimeOfDay
  };
}