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
    console.log('📊 Fetching document analytics from Neon database...');

    // Get document analytics from database
    const analytics = await neonDb.getDocumentAnalytics();
    
    // Get all documents for additional processing
    const allDocuments = await neonDb.getAllDocuments();
    
    // Generate document trends data
    const documentTrends = generateDocumentTrends(allDocuments);

    const response = {
      success: true,
      data: {
        totalDocuments: parseInt(analytics.total_documents) || 0,
        documentsToday: parseInt(analytics.documents_today) || 0,
        documents7d: parseInt(analytics.documents_7d) || 0,
        documents30d: parseInt(analytics.documents_30d) || 0,
        documentsThisMonth: parseInt(analytics.documents_30d) || 0,
        documentTrends,
        recentDocuments: allDocuments.slice(0, 10).map(doc => ({
          id: doc.id,
          title: doc.title,
          user_name: doc.user_name || 'Unknown',
          user_email: doc.user_email || 'Unknown',
          created_at: doc.created_at
        }))
      },
      timestamp: new Date().toISOString()
    };

    console.log('✅ Document analytics fetched successfully:', {
      totalDocuments: response.data.totalDocuments,
      documentsToday: response.data.documentsToday
    });

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error fetching document analytics:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch document analytics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Helper function to generate document trends data
function generateDocumentTrends(documents: any[]) {
  const last30Days = [];
  const now = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    
    const documentsCreated = documents.filter(doc => {
      const docDate = new Date(doc.created_at).toISOString().split('T')[0];
      return docDate === dateStr;
    }).length;
    
    last30Days.push({
      date: dateStr,
      documents: documentsCreated
    });
  }
  
  return last30Days;
}