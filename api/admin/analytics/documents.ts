import { VercelRequest, VercelResponse } from '@vercel/node';
import AdminMiddleware, { AdminRequest } from '../../_lib/admin-middleware';
import { getStorage } from '../../_lib/storage';

interface DocumentAnalytics {
  totalDocuments: number;
  documentsCreated: {
    daily: { date: string; count: number }[];
    weekly: { week: string; count: number }[];
    monthly: { month: string; count: number }[];
  };
  documentTypes: {
    type: string;
    count: number;
    percentage: number;
  }[];
  documentPerformance: {
    averageCreationTime: number;
    averagePageCount: number;
    averageWordCount: number;
    completionRate: number;
  };
  topDocuments: {
    id: string;
    title: string;
    author: string;
    createdAt: string;
    downloadCount: number;
    pageCount: number;
  }[];
  documentTrends: {
    period: string;
    created: number;
    completed: number;
    downloaded: number;
  }[];
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
        const { timeRange = '30d', includeDeleted = 'false' } = req.query;
        
        await AdminMiddleware.logAdminAction(req, 'view_document_analytics', { 
          timeRange, 
          includeDeleted 
        });

        const storage = getStorage();
        const analytics = await calculateDocumentAnalytics(storage, {
          timeRange: timeRange as string,
          includeDeleted: includeDeleted === 'true'
        });

        res.status(200).json({
          success: true,
          data: analytics,
          generatedAt: new Date().toISOString(),
          timeRange
        });

      } catch (error) {
        console.error('Document analytics error:', error);
        res.status(500).json({
          error: 'Failed to generate document analytics',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );
}
async
 function calculateDocumentAnalytics(
  storage: any, 
  options: { timeRange: string; includeDeleted: boolean }
): Promise<DocumentAnalytics> {
  const now = new Date();
  const timeRangeMs = parseTimeRange(options.timeRange);
  const startDate = new Date(now.getTime() - timeRangeMs);

  try {
    // Get all documents (in a real implementation, this would be paginated)
    const allDocuments = await storage.getAllDocuments();
    
    // Filter documents based on options
    const documents = allDocuments.filter((doc: any) => {
      if (!options.includeDeleted && doc.isDeleted) return false;
      return true;
    });
    
    // Calculate total documents
    const totalDocuments = documents.length;

    // Calculate documents created by time period
    const documentsCreated = calculateDocumentsByPeriod(documents, startDate, now);
    
    // Calculate document types distribution
    const documentTypes = calculateDocumentTypes(documents);
    
    // Calculate document performance metrics
    const documentPerformance = calculateDocumentPerformance(documents);
    
    // Get top documents by downloads
    const topDocuments = getTopDocuments(documents);
    
    // Calculate document trends
    const documentTrends = calculateDocumentTrends(documents, startDate, now);

    return {
      totalDocuments,
      documentsCreated,
      documentTypes,
      documentPerformance,
      topDocuments,
      documentTrends
    };

  } catch (error) {
    console.error('Error calculating document analytics:', error);
    throw new Error('Failed to calculate document analytics');
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

function calculateDocumentsByPeriod(documents: any[], startDate: Date, endDate: Date) {
  const daily: { date: string; count: number }[] = [];
  const weekly: { week: string; count: number }[] = [];
  const monthly: { month: string; count: number }[] = [];

  // Group documents by creation date
  const documentsByDate = documents.reduce((acc, doc) => {
    if (doc.createdAt) {
      const date = new Date(doc.createdAt);
      if (date >= startDate && date <= endDate) {
        const dateKey = date.toISOString().split('T')[0];
        acc[dateKey] = (acc[dateKey] || 0) + 1;
      }
    }
    return acc;
  }, {});

  // Generate daily data
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    daily.push({
      date: dateKey,
      count: documentsByDate[dateKey] || 0
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
  const monthlyData = documents.reduce((acc, doc) => {
    if (doc.createdAt) {
      const date = new Date(doc.createdAt);
      if (date >= startDate && date <= endDate) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        acc[monthKey] = (acc[monthKey] || 0) + 1;
      }
    }
    return acc;
  }, {});

  Object.entries(monthlyData).forEach(([month, count]) => {
    monthly.push({ month, count: count as number });
  });

  return { daily, weekly, monthly };
}

function calculateDocumentTypes(documents: any[]) {
  const typeCount = documents.reduce((acc, doc) => {
    const type = doc.type || doc.category || 'IEEE Paper';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const total = documents.length;
  
  return Object.entries(typeCount).map(([type, count]) => ({
    type,
    count: count as number,
    percentage: total > 0 ? Math.round(((count as number) / total) * 100) : 0
  })).sort((a, b) => b.count - a.count);
}

function calculateDocumentPerformance(documents: any[]) {
  const validDocs = documents.filter(doc => doc.createdAt);
  
  // Calculate average creation time (time from start to completion)
  const creationTimes = validDocs
    .filter(doc => doc.completedAt && doc.createdAt)
    .map(doc => {
      const created = new Date(doc.createdAt).getTime();
      const completed = new Date(doc.completedAt).getTime();
      return completed - created;
    });
  
  const averageCreationTime = creationTimes.length > 0 
    ? creationTimes.reduce((sum, time) => sum + time, 0) / creationTimes.length 
    : 0;

  // Calculate average page count
  const pageCounts = validDocs
    .filter(doc => doc.pageCount && doc.pageCount > 0)
    .map(doc => doc.pageCount);
  
  const averagePageCount = pageCounts.length > 0
    ? pageCounts.reduce((sum, count) => sum + count, 0) / pageCounts.length
    : 0;

  // Calculate average word count
  const wordCounts = validDocs
    .filter(doc => doc.wordCount && doc.wordCount > 0)
    .map(doc => doc.wordCount);
  
  const averageWordCount = wordCounts.length > 0
    ? wordCounts.reduce((sum, count) => sum + count, 0) / wordCounts.length
    : 0;

  // Calculate completion rate (documents that were actually downloaded/completed)
  const completedDocs = validDocs.filter(doc => doc.downloadCount > 0 || doc.completedAt);
  const completionRate = validDocs.length > 0 
    ? (completedDocs.length / validDocs.length) * 100 
    : 0;

  return {
    averageCreationTime: Math.round(averageCreationTime / (1000 * 60)), // Convert to minutes
    averagePageCount: Math.round(averagePageCount * 10) / 10,
    averageWordCount: Math.round(averageWordCount),
    completionRate: Math.round(completionRate * 10) / 10
  };
}

function getTopDocuments(documents: any[]) {
  return documents
    .filter(doc => doc.downloadCount > 0)
    .sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0))
    .slice(0, 10)
    .map(doc => ({
      id: doc.id,
      title: doc.title || 'Untitled Document',
      author: doc.authorName || doc.userEmail || 'Anonymous',
      createdAt: doc.createdAt || new Date().toISOString(),
      downloadCount: doc.downloadCount || 0,
      pageCount: doc.pageCount || 0
    }));
}

function calculateDocumentTrends(documents: any[], startDate: Date, endDate: Date) {
  const trends: { period: string; created: number; completed: number; downloaded: number }[] = [];
  
  // Calculate trends by week for the given time range
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const weekStart = new Date(currentDate);
    const weekEnd = new Date(currentDate.getTime() + (7 * 24 * 60 * 60 * 1000));
    
    const weekDocs = documents.filter(doc => {
      if (!doc.createdAt) return false;
      const docDate = new Date(doc.createdAt);
      return docDate >= weekStart && docDate < weekEnd;
    });

    const created = weekDocs.length;
    const completed = weekDocs.filter(doc => doc.completedAt || doc.downloadCount > 0).length;
    const downloaded = weekDocs.reduce((sum, doc) => sum + (doc.downloadCount || 0), 0);

    trends.push({
      period: weekStart.toISOString().split('T')[0],
      created,
      completed,
      downloaded
    });

    currentDate.setDate(currentDate.getDate() + 7);
  }

  return trends;
}